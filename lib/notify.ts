import axios from 'axios'
import { NtfyConfig } from '../types/index'

interface NotificationEvents {
  taskCompleted: boolean
  taskDueSoon: boolean
  ideaCaptured: boolean
  ideaSorted: boolean
  entityCreated: boolean
}

class NtfyService {
  private config: NtfyConfig | null = null
  private events: NotificationEvents | null = null

  private async loadConfig() {
    try {
      const { db } = await import('./db')
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ntfy_config') as any
      const eventsSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('notification_events') as any

      if (setting) {
        this.config = JSON.parse(setting.value)
      }
      if (eventsSetting) {
        this.events = JSON.parse(eventsSetting.value)
      }
    } catch (error) {
      console.error('Failed to load ntfy config:', error)
    }
  }

  private async isEventEnabled(eventName: keyof NotificationEvents): Promise<boolean> {
    await this.loadConfig()
    if (!this.config?.enabled) return false
    if (!this.events) return false
    return this.events[eventName] === true
  }

  async updateConfig(config: NtfyConfig) {
    try {
      const { db } = await import('./db')
      
      // Save to database
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('ntfy_config', JSON.stringify(config), Date.now())

      this.config = config
      return true
    } catch (error) {
      console.error('Failed to update ntfy config:', error)
      return false
    }
  }

  private getConfig(): NtfyConfig {
    if (!this.config) {
      throw new Error('Ntfy not configured')
    }
    return this.config
  }

  async sendNotification(
    title: string, 
    message: string, 
    actions?: Array<{
      action: string
      label: string
      url?: string
      clear?: boolean
    }>,
    priority: NtfyConfig['priority'] = 'default'
  ) {
    try {
      await this.loadConfig()
      const config = this.getConfig()

      if (!config.enabled) {
        return { success: false, error: 'Ntfy notifications disabled' }
      }

      // Prepare headers (ntfy.sh uses headers for metadata, body for message text)
      const headers: any = {
        'Title': title,
        'Priority': config.priority || priority,
        'Tags': 'brain,lightbulb'
      }

      // Add actions as JSON header if provided
      if (actions && actions.length > 0) {
        headers['Actions'] = JSON.stringify(actions)
      }

      // Add basic auth if username and password are provided
      if (config.username && config.password) {
        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64')
        headers['Authorization'] = `Basic ${auth}`
      }

      // Send message as plain text in body, metadata in headers
      const response = await axios.post(
        `${config.server}/${config.topic}`,
        message,  // Plain text message in body
        { headers }
      )

      return { success: true, id: response.data.id }
    } catch (error) {
      console.error('Failed to send ntfy notification:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async notifyAISuggestion(
    itemId: string, 
    suggestion: string, 
    suggestionType: string
  ) {
    const actions = [
      {
        action: 'view',
        label: 'View Item',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/items/${itemId}`
      },
      {
        action: 'accept',
        label: 'Accept Suggestion',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/suggestions/accept`,
        clear: true
      },
      {
        action: 'dismiss',
        label: 'Dismiss',
        clear: true
      }
    ]

    return this.sendNotification(
      `💡 AI Suggestion: ${suggestionType}`,
      suggestion,
      actions,
      'high'
    )
  }

  async notifyPlanReady(planDate: string, taskCount: number) {
    return this.sendNotification(
      '📅 Daily Plan Ready',
      `Your plan for ${planDate} has ${taskCount} tasks ready to go.`,
      [
        {
          action: 'view',
          label: 'View Plan',
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/plans/${planDate}`
        }
      ],
      'default'
    )
  }

  async notifyTaskDue(taskText: string, dueTime: string) {
    return this.sendNotification(
      '⏰ Task Due Soon',
      `"${taskText}" is due at ${dueTime}`,
      [
        {
          action: 'complete',
          label: 'Mark Complete',
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/todos/complete`,
          clear: true
        },
        {
          action: 'snooze',
          label: 'Snooze',
          clear: true
        }
      ],
      'urgent'
    )
  }

  async notifyCaptureSuccess(text: string) {
    return this.sendNotification(
      '✅ Idea Captured',
      `"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
      [
        {
          action: 'view',
          label: 'View in Inbox',
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox`
        }
      ],
      'low'
    )
  }

  // Event-aware notification methods
  async notifyIdeaCaptured(text: string) {
    if (!(await this.isEventEnabled('ideaCaptured'))) {
      return { success: false, skipped: true }
    }
    return this.notifyCaptureSuccess(text)
  }

  async notifyIdeaSorted(text: string, entityType: string) {
    if (!(await this.isEventEnabled('ideaSorted'))) {
      return { success: false, skipped: true }
    }

    const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)
    return this.sendNotification(
      '📋 Idea Sorted',
      `"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" → ${entityLabel}`,
      [],
      'low'
    )
  }

  async notifyEntityCreated(title: string, entityType: string) {
    if (!(await this.isEventEnabled('entityCreated'))) {
      return { success: false, skipped: true }
    }

    const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)
    return this.sendNotification(
      '✨ Entity Created',
      `${entityLabel}: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`,
      [],
      'default'
    )
  }

  async notifyTaskCompleted(taskText: string) {
    if (!(await this.isEventEnabled('taskCompleted'))) {
      return { success: false, skipped: true }
    }

    return this.sendNotification(
      '✅ Task Completed',
      `"${taskText.substring(0, 50)}${taskText.length > 50 ? '...' : ''}"`,
      [],
      'default'
    )
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.enabled
  }

  getConfigSummary(): Partial<NtfyConfig> | null {
    if (!this.config) return null
    
    return {
      enabled: this.config.enabled,
      server: this.config.server,
      topic: this.config.topic,
      priority: this.config.priority,
      username: this.config.username ? '***' : undefined
    }
  }
}

export const ntfyService = new NtfyService()
export default ntfyService

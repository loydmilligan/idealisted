import cron from 'node-cron'
import { ntfyService } from './notify'
import { createObsidianSyncService } from './obsidian-sync'
import { format } from 'date-fns'

// Use global variable to persist cron task across hot-reloads
declare global {
  var __reminder_check_cron_task: any | undefined
  var __reminder_check_is_running: boolean | undefined
  var __daily_summary_cron_task: any | undefined
  var __daily_summary_is_running: boolean | undefined
  var __daily_reminder_cron_task: any | undefined
  var __daily_reminder_is_running: boolean | undefined
  var __obsidian_sync_cron_task: any | undefined
  var __obsidian_sync_is_running: boolean | undefined
}

class SchedulerService {
  /**
   * Start the notification schedulers
   * Runs task reminders, daily summaries, and daily reminders
   */
  start() {
    // Task Reminder Check (Phase 5 - Task 5.3)
    if (global.__reminder_check_cron_task) {
      global.__reminder_check_cron_task.stop()
      global.__reminder_check_cron_task = undefined
    }

    global.__reminder_check_cron_task = cron.schedule('* * * * *', async () => {
      await this.checkAndNotifyReminders()
    })

    console.log('[Scheduler] Task reminder check cron started (every minute)')

    // Daily Summary Check (Phase 6 - Task 6.2)
    if (global.__daily_summary_cron_task) {
      global.__daily_summary_cron_task.stop()
      global.__daily_summary_cron_task = undefined
    }

    global.__daily_summary_cron_task = cron.schedule('* * * * *', async () => {
      await this.checkAndSendDailySummary()
    })

    console.log('[Scheduler] Daily summary check cron started (every minute)')

    // Daily Reminder Check (Phase 6 - Task P6-T5)
    if (global.__daily_reminder_cron_task) {
      global.__daily_reminder_cron_task.stop()
      global.__daily_reminder_cron_task = undefined
    }

    global.__daily_reminder_cron_task = cron.schedule('* * * * *', async () => {
      await this.checkAndSendDailyReminder()
    })

    console.log('[Scheduler] Daily reminder check cron started (every minute)')

    // Obsidian Sync Check (Obsidian Integration)
    if (global.__obsidian_sync_cron_task) {
      global.__obsidian_sync_cron_task.stop()
      global.__obsidian_sync_cron_task = undefined
    }

    // Run hourly at minute 0
    global.__obsidian_sync_cron_task = cron.schedule('0 * * * *', async () => {
      await this.checkAndSyncObsidian()
    })

    console.log('[Scheduler] Obsidian sync cron started (hourly)')
  }

  /**
   * Stop the scheduler
   */
  stop() {
    // Stop all CRON tasks
    if (global.__reminder_check_cron_task) {
      global.__reminder_check_cron_task.stop()
      global.__reminder_check_cron_task = undefined
    }
    if (global.__daily_summary_cron_task) {
      global.__daily_summary_cron_task.stop()
      global.__daily_summary_cron_task = undefined
    }
    if (global.__daily_reminder_cron_task) {
      global.__daily_reminder_cron_task.stop()
      global.__daily_reminder_cron_task = undefined
    }
    if (global.__obsidian_sync_cron_task) {
      global.__obsidian_sync_cron_task.stop()
      global.__obsidian_sync_cron_task = undefined
    }
    console.log('[Scheduler] All CRON tasks stopped')
  }

  /**
   * Check for tasks with due reminders and send notifications
   * Runs every minute via cron job
   */
  private async checkAndNotifyReminders() {
    // Mutex lock to prevent concurrent executions
    if (global.__reminder_check_is_running) {
      return
    }

    try {
      global.__reminder_check_is_running = true
      const now = Date.now()
      const oneHourAgo = now - (60 * 60 * 1000)

      // Query tasks with due reminders
      const { db } = await import('./db')
      const dueTasks = db.prepare(`
        SELECT task.id, task.reminder_datetime, task.last_notified_at,
               i.text, task.due_date
        FROM tasks task
        JOIN items i ON i.id = task.item_id
        WHERE task.reminder_datetime IS NOT NULL
          AND task.reminder_datetime <= ?
          AND task.status != 'completed'
          AND (task.last_notified_at IS NULL OR task.last_notified_at < ?)
        ORDER BY task.reminder_datetime ASC
      `).all(now, oneHourAgo) as Array<{
        id: string
        reminder_datetime: number
        last_notified_at: number | null
        text: string
        due_date: number | null
      }>

      if (dueTasks.length === 0) {
        // No tasks need notification - silent return (don't spam logs)
        return
      }

      console.log(`[Reminder Check] Found ${dueTasks.length} task(s) needing notification`)

      // Process each task
      let successCount = 0
      let failureCount = 0

      for (const task of dueTasks) {
        try {
          // Format due time as human-readable
          const dueTime = task.due_date
            ? new Date(task.due_date).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            : 'soon'

          // Send notification using existing helper
          const result = await ntfyService.notifyTaskDue(task.text, dueTime)

          if (result.success) {
            // Update last_notified_at timestamp
            db.prepare(`
              UPDATE tasks SET last_notified_at = ? WHERE id = ?
            `).run(now, task.id)

            console.log(`[Reminder] ✓ Sent notification for task: "${task.text}"`)
            successCount++
          } else if (result.error === 'Ntfy notifications disabled') {
            console.log(`[Reminder] Skipped "${task.text}" - NTFY disabled`)
          } else {
            console.error(`[Reminder] ✗ Failed to notify task "${task.text}":`, result.error)
            failureCount++
          }
        } catch (error) {
          console.error(`[Reminder] ✗ Error processing task ${task.id}:`, error)
          failureCount++
          // Continue with next task even if this one fails
        }
      }

      const elapsed = Date.now() - now
      console.log(`[Reminder Check] Completed in ${elapsed}ms (${successCount} sent, ${failureCount} failed)`)
    } catch (error) {
      console.error('[Reminder Check] Fatal error:', error)
    } finally {
      global.__reminder_check_is_running = false
    }
  }

  /**
   * Check if it's time to send daily summary and send it
   * Phase 6 - Task 6.2: CRON scheduled summary jobs
   */
  private async checkAndSendDailySummary() {
    // Prevent concurrent executions
    if (global.__daily_summary_is_running) return

    try {
      global.__daily_summary_is_running = true

      // Load daily summary feature settings
      const { db } = await import('./db')
      const featureSetting = db.prepare('SELECT enabled FROM ai_feature_settings WHERE feature_name = ?').get('daily_summary') as any

      if (!featureSetting || !featureSetting.enabled) {
        // Daily summary feature is disabled
        return
      }

      // Check if ntfy is configured and enabled
      const ntfySetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ntfy_config') as any

      if (!ntfySetting) {
        return
      }

      const ntfyConfig = JSON.parse(ntfySetting.value)

      if (!ntfyConfig.enabled) {
        return
      }

      // Get current time in HH:mm format
      const now = new Date()
      const currentTime = format(now, 'HH:mm')

      // Load daily summary configuration from settings (Task 6.4)
      // This allows users to customize which times they receive summaries
      const dailySummarySettings = db.prepare('SELECT value FROM settings WHERE key = ?')
        .get('daily_summary_config') as any

      // Use configured times from settings, or fallback to defaults if config not found
      const summaryTimes = dailySummarySettings
        ? JSON.parse(dailySummarySettings.value).times
        : ['09:00', '12:00', '18:00']  // Default times match original behavior

      // Early return if times array is empty (user disabled all times)
      if (!summaryTimes || summaryTimes.length === 0) {
        return
      }

      // Check if current time matches any configured summary time
      if (!summaryTimes.includes(currentTime)) {
        return
      }

      // Check if summary was already sent at this hour today
      const currentHour = now.getHours()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const lastSummary = db.prepare(`
        SELECT created_at FROM daily_summaries
        WHERE created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(todayStart.getTime()) as { created_at: number } | undefined

      if (lastSummary) {
        const lastSummaryDate = new Date(lastSummary.created_at)
        if (lastSummaryDate.getHours() === currentHour) {
          console.log('[Scheduler] Daily summary already sent at this hour')
          return
        }
      }

      // All conditions met - generate and send the summary!
      console.log('[Scheduler] Generating daily summary...')

      const { generateDailySummary, formatSummaryMessage } = await import('./summary')
      const summary = generateDailySummary()

      // Don't send if no activity
      if (!summary.hasActivity) {
        console.log('[Scheduler] No activity today - skipping summary')
        return
      }

      // Format the summary message (with AI enhancement)
      const message = await formatSummaryMessage(summary)

      // Determine time of day label for notification title
      const hourOfDay = now.getHours()
      let timeLabel = 'Morning'
      if (hourOfDay >= 12 && hourOfDay < 18) timeLabel = 'Midday'
      if (hourOfDay >= 18) timeLabel = 'Evening'

      // Determine priority based on urgency
      // Use 'high' priority if tasks are due today to draw attention
      // Otherwise use 'default' for normal notification sound
      let priority: 'urgent' | 'high' | 'default' | 'low' = 'default'
      if (summary.tasksDueToday > 0) {
        priority = 'high'
      }

      // Build action buttons based on summary content
      // Max 2 buttons to avoid cluttered mobile UI
      const actions: Array<{
        action: string
        label: string
        url?: string
        clear?: boolean
      }> = []

      const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      // Add "View Tasks" button if there are tasks due (today or soon)
      if (summary.tasksDueToday > 0 || summary.tasksDueSoon > 0) {
        actions.push({
          action: 'view',
          label: 'View Tasks',
          url: `${baseURL}/?tab=files&type=task`
        })
      }

      // Add "View Inbox" button if there are ideas to review
      // Show if ideas were captured or if there are unconverted ideas
      if (summary.ideasCaptured > 0 || summary.ideasConverted < summary.ideasCaptured) {
        actions.push({
          action: 'view',
          label: 'View Inbox',
          url: `${baseURL}/?tab=ready`
        })
      }

      // Send enhanced notification with contextual metadata
      const notificationResult = await ntfyService.sendNotification(
        `📊 ${timeLabel} Summary`,
        message,
        actions,
        priority
      )

      if (notificationResult.success) {
        // Record that we sent the summary
        db.prepare(`
          INSERT INTO daily_summaries (date, data, created_at)
          VALUES (?, ?, ?)
        `).run(summary.date, JSON.stringify(summary), Date.now())

        console.log('[Scheduler] Daily summary sent successfully')
      } else {
        console.error('[Scheduler] Failed to send summary notification:', notificationResult.error)
      }
    } catch (error) {
      console.error('[Scheduler] Error in daily summary check:', error)
    } finally {
      global.__daily_summary_is_running = false
    }
  }

  /**
   * Check if it's time to send the daily reminder notification
   * Phase 6 - Task P6-T5: Daily reminder notification system
   */
  private async checkAndSendDailyReminder() {
    // Prevent concurrent executions
    if (global.__daily_reminder_is_running) return

    try {
      global.__daily_reminder_is_running = true

      // Load reminder configuration from settings
      const { db } = await import('./db')
      const reminderSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('reminder_config') as any

      if (!reminderSetting) {
        // No reminder settings configured yet
        return
      }

      const reminderConfig = JSON.parse(reminderSetting.value)

      // Check if daily reminder is enabled
      if (!reminderConfig.enabled) {
        return
      }

      // Check if ntfy is configured and enabled
      const ntfySetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ntfy_config') as any

      if (!ntfySetting) {
        return
      }

      const ntfyConfig = JSON.parse(ntfySetting.value)

      if (!ntfyConfig.enabled) {
        return
      }

      // Get current time in HH:MM format
      const now = new Date()
      const currentTime = format(now, 'HH:mm')
      const configuredTime = reminderConfig.time || '19:00'

      // Check if it's the right time
      if (currentTime !== configuredTime) {
        return
      }

      // Deduplication: Check if reminder was already sent today
      const today = format(now, 'yyyy-MM-dd')
      const lastReminderSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('last_reminder_date') as any

      if (lastReminderSetting) {
        const lastReminderDate = lastReminderSetting.value.replace(/"/g, '') // Remove JSON quotes if any
        if (lastReminderDate === today) {
          // Already sent today, skip
          return
        }
      }

      // All conditions met - send the reminder!
      console.log('[Scheduler] Sending daily reminder notification...')

      const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      // Send notification
      const notificationResult = await ntfyService.sendNotification(
        'Daily Review Reminder',
        'Time to review your tasks and plan your day!',
        [
          {
            action: 'view',
            label: 'Open IdeaListed',
            url: baseURL
          }
        ],
        'default'
      )

      if (notificationResult.success) {
        // Update last_reminder_date to prevent duplicate notifications today
        db.prepare(`
          INSERT OR REPLACE INTO settings (key, value, updated_at)
          VALUES (?, ?, ?)
        `).run('last_reminder_date', JSON.stringify(today), Date.now())

        console.log('[Scheduler] Daily reminder sent successfully')
      } else {
        console.error('[Scheduler] Failed to send daily reminder:', notificationResult.error)
      }
    } catch (error) {
      console.error('[Scheduler] Error in daily reminder check:', error)
    } finally {
      global.__daily_reminder_is_running = false
    }
  }

  /**
   * Check and sync to Obsidian vault
   * Runs hourly via cron job (at minute 0)
   * Exports new/updated notes and projects as markdown files
   */
  async checkAndSyncObsidian() {
    // Prevent concurrent execution
    if (global.__obsidian_sync_is_running) {
      console.log('[Obsidian] Sync already running, skipping...')
      return
    }

    global.__obsidian_sync_is_running = true
    const startTime = Date.now()

    try {
      console.log('[Obsidian] Starting sync check...')

      const syncService = await createObsidianSyncService()

      if (!syncService) {
        console.log('[Obsidian] Sync service not configured, skipping...')
        return
      }

      const result = await syncService.sync()

      const duration = Date.now() - startTime

      if (result.success) {
        console.log(
          `[Obsidian] ✓ Sync completed in ${duration}ms (${result.itemsSynced} items synced)`
        )
        if (result.errors.length > 0) {
          console.warn(`[Obsidian] Completed with ${result.errors.length} errors:`, result.errors)
        }
      } else {
        console.error(`[Obsidian] ✗ Sync failed:`, result.errors)
      }
    } catch (error) {
      console.error('[Obsidian] Error in sync check:', error)
    } finally {
      global.__obsidian_sync_is_running = false
    }
  }
}

// Singleton instance
export const schedulerService = new SchedulerService()
export default schedulerService

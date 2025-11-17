import cron from 'node-cron'
import { reviewService } from './review'
import { ntfyService } from './notify'
import { format } from 'date-fns'

// Use global variable to persist cron task across hot-reloads
declare global {
  var __daily_review_cron_task: any | undefined
  var __daily_review_is_running: boolean | undefined
  var __reminder_check_cron_task: any | undefined
  var __reminder_check_is_running: boolean | undefined
  var __daily_summary_cron_task: any | undefined
  var __daily_summary_is_running: boolean | undefined
}

class SchedulerService {
  /**
   * Start the daily review scheduler
   * Checks every minute if it's time to send the review
   */
  start() {
    // Stop any existing task from previous module loads
    if (global.__daily_review_cron_task) {
      console.log('[Scheduler] Stopping existing task before creating new one')
      global.__daily_review_cron_task.stop()
      global.__daily_review_cron_task = undefined
    }

    // Run every minute
    global.__daily_review_cron_task = cron.schedule('* * * * *', async () => {
      await this.checkAndSendDailyReview()
    })

    console.log('[Scheduler] Daily review scheduler started')

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
  }

  /**
   * Stop the scheduler
   */
  stop() {
    // Stop all CRON tasks
    if (global.__daily_review_cron_task) {
      global.__daily_review_cron_task.stop()
      global.__daily_review_cron_task = undefined
    }
    if (global.__reminder_check_cron_task) {
      global.__reminder_check_cron_task.stop()
      global.__reminder_check_cron_task = undefined
    }
    if (global.__daily_summary_cron_task) {
      global.__daily_summary_cron_task.stop()
      global.__daily_summary_cron_task = undefined
    }
    console.log('[Scheduler] All CRON tasks stopped')
  }

  /**
   * Check if it's time to send daily review and send it
   */
  private async checkAndSendDailyReview() {
    // Prevent concurrent executions
    if (global.__daily_review_is_running) return

    try {
      global.__daily_review_is_running = true

      // Load daily review settings
      const { db } = await import('./db')
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_review') as any

      if (!setting) {
        // No settings configured yet
        return
      }

      const config = JSON.parse(setting.value)

      // Check if daily review is enabled
      if (!config.enabled) {
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
      const configuredTime = config.time || config.reviewTime || '19:00'  // Support both field names

      // Check if it's the right time
      if (currentTime !== configuredTime) {
        return
      }

      // Check if review was already sent today
      const alreadySent = await reviewService.hasReviewBeenSentToday()

      if (alreadySent) {
        console.log('[Scheduler] Daily review already sent today')
        return
      }

      // All conditions met - send the review!
      console.log('[Scheduler] Sending daily review...')

      const includeAI = config.includeAiSummary || config.includeAI || false
      const reviewData = await reviewService.generateReview(new Date(), includeAI, true)  // persist: true for scheduled reviews

      // Get notification message
      const { title, message } = reviewService.getNotificationMessage(reviewData)

      // Send notification
      const notificationResult = await ntfyService.sendNotification(
        title,
        message,
        [
          {
            action: 'view',
            label: 'View Review',
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review/${reviewData.date}`
          }
        ],
        'default'
      )

      if (notificationResult.success) {
        // Mark review as sent
        await reviewService.markReviewAsSent()
        console.log('[Scheduler] Daily review sent successfully')
      } else {
        console.error('[Scheduler] Failed to send notification:', notificationResult.error)
      }
    } catch (error) {
      console.error('[Scheduler] Error in daily review check:', error)
    } finally {
      global.__daily_review_is_running = false
    }
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

      // Format the summary message
      const message = formatSummaryMessage(summary)

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
}

// Singleton instance
export const schedulerService = new SchedulerService()
export default schedulerService

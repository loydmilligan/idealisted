import cron from 'node-cron'
import { reviewService } from './review'
import { ntfyService } from './notify'
import { format } from 'date-fns'

class SchedulerService {
  private task: any = null
  private isRunning: boolean = false

  /**
   * Start the daily review scheduler
   * Checks every minute if it's time to send the review
   */
  start() {
    if (this.task) {
      console.log('[Scheduler] Already running')
      return
    }

    // Run every minute
    this.task = cron.schedule('* * * * *', async () => {
      await this.checkAndSendDailyReview()
    })

    console.log('[Scheduler] Daily review scheduler started')
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.task) {
      this.task.stop()
      this.task = null
      console.log('[Scheduler] Stopped')
    }
  }

  /**
   * Check if it's time to send daily review and send it
   */
  private async checkAndSendDailyReview() {
    // Prevent concurrent executions
    if (this.isRunning) return

    try {
      this.isRunning = true

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
      this.isRunning = false
    }
  }
}

// Singleton instance
export const schedulerService = new SchedulerService()
export default schedulerService

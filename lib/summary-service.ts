import { db } from './db'
import { format } from 'date-fns'

/**
 * Daily summary metrics for notification aggregation
 */
export interface DailySummary {
  /** Number of ideas captured today */
  ideasCaptured: number
  /** Number of ideas converted to entities today */
  ideasConverted: number
  /** Number of tasks completed today */
  tasksCompleted: number
  /** Number of tasks due today */
  tasksDueToday: number
  /** ISO date string (YYYY-MM-DD) */
  date: string
}

class SummaryService {
  /**
   * Get daily activity summary metrics
   *
   * Collects metrics for:
   * - Ideas captured today (items with type='idea' created today)
   * - Ideas converted today (items that changed from idea to another type today)
   * - Tasks completed today (tasks with status='completed', updated today)
   * - Tasks due today (tasks with due_date matching today)
   *
   * @param date - Date to generate summary for (defaults to today)
   * @returns Daily summary metrics
   *
   * @example
   * ```typescript
   * const summary = await getSummary()
   * console.log(`You captured ${summary.ideasCaptured} ideas today`)
   * ```
   */
  async getSummary(date: Date = new Date()): Promise<DailySummary> {
    try {
      const dateStr = format(date, 'yyyy-MM-dd')

      // Calculate start and end of day in milliseconds (UTC midnight boundaries)
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const startMs = startOfDay.getTime()
      const endMs = endOfDay.getTime()

      // Query 1: Ideas captured today
      const ideasCapturedQuery = db.prepare(`
        SELECT COUNT(*) as count
        FROM items
        WHERE type = 'idea'
        AND created_at >= ? AND created_at <= ?
      `)
      const ideasCapturedResult = ideasCapturedQuery.get(startMs, endMs) as { count: number }
      const ideasCaptured = ideasCapturedResult.count

      // Query 2: Ideas converted today
      // An idea is considered converted when its type changes from 'idea' to something else
      // We track this by checking items that were updated today and have entity_type set
      const ideasConvertedQuery = db.prepare(`
        SELECT COUNT(*) as count
        FROM items
        WHERE entity_type IS NOT NULL
        AND entity_type != 'idea'
        AND type != 'idea'
        AND updated_at >= ? AND updated_at <= ?
      `)
      const ideasConvertedResult = ideasConvertedQuery.get(startMs, endMs) as { count: number }
      const ideasConverted = ideasConvertedResult.count

      // Query 3: Tasks completed today
      // Join tasks table with items to check update timestamp
      const tasksCompletedQuery = db.prepare(`
        SELECT COUNT(*) as count
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.status = 'completed'
        AND i.updated_at >= ? AND i.updated_at <= ?
      `)
      const tasksCompletedResult = tasksCompletedQuery.get(startMs, endMs) as { count: number }
      const tasksCompleted = tasksCompletedResult.count

      // Query 4: Tasks due today
      // Compare due_date (timestamp) to today's date boundaries
      const tasksDueTodayQuery = db.prepare(`
        SELECT COUNT(*) as count
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.due_date IS NOT NULL
        AND t.due_date >= ? AND t.due_date <= ?
        AND t.status != 'completed'
        AND i.archived = 0
      `)
      const tasksDueTodayResult = tasksDueTodayQuery.get(startMs, endMs) as { count: number }
      const tasksDueToday = tasksDueTodayResult.count

      return {
        ideasCaptured,
        ideasConverted,
        tasksCompleted,
        tasksDueToday,
        date: dateStr,
      }
    } catch (error) {
      console.error('[SummaryService] Error generating daily summary:', error)

      // Return zero metrics on error with fallback date formatting
      let dateStr: string
      try {
        dateStr = format(date, 'yyyy-MM-dd')
      } catch {
        // If date formatting fails, use current date
        dateStr = format(new Date(), 'yyyy-MM-dd')
      }

      return {
        ideasCaptured: 0,
        ideasConverted: 0,
        tasksCompleted: 0,
        tasksDueToday: 0,
        date: dateStr,
      }
    }
  }

  /**
   * Format summary as a human-readable notification message
   *
   * @param summary - Daily summary metrics
   * @returns Formatted notification text
   */
  formatNotificationMessage(summary: DailySummary): string {
    const parts: string[] = []

    if (summary.ideasCaptured > 0) {
      parts.push(`${summary.ideasCaptured} idea${summary.ideasCaptured !== 1 ? 's' : ''} captured`)
    }

    if (summary.ideasConverted > 0) {
      parts.push(`${summary.ideasConverted} idea${summary.ideasConverted !== 1 ? 's' : ''} converted`)
    }

    if (summary.tasksCompleted > 0) {
      parts.push(`${summary.tasksCompleted} task${summary.tasksCompleted !== 1 ? 's' : ''} completed`)
    }

    if (summary.tasksDueToday > 0) {
      parts.push(`${summary.tasksDueToday} task${summary.tasksDueToday !== 1 ? 's' : ''} due today`)
    }

    if (parts.length === 0) {
      return 'No activity today yet'
    }

    // Join with commas and 'and' before last item
    if (parts.length === 1) {
      return parts[0]
    } else if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]}`
    } else {
      const lastPart = parts.pop()
      return `${parts.join(', ')}, and ${lastPart}`
    }
  }
}

// Singleton instance
export const summaryService = new SummaryService()

/**
 * Get daily activity summary metrics
 *
 * @param date - Date to generate summary for (defaults to today)
 * @returns Daily summary metrics
 */
export async function getSummary(date?: Date): Promise<DailySummary> {
  return summaryService.getSummary(date)
}

export default summaryService

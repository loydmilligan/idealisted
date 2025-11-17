import { db } from './db'

export interface DailySummaryData {
  date: string // YYYY-MM-DD
  ideasCaptured: number
  ideasConverted: number
  tasksCompleted: number
  tasksDueToday: number
  tasksDueSoon: number // Next 3 days
  hasActivity: boolean
}

/**
 * Generate daily summary for a specific date
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 * @returns Summary data for the day
 */
export function generateDailySummary(date?: string): DailySummaryData {
  // Use provided date or default to today
  const targetDate = date || new Date().toISOString().split('T')[0]

  // Calculate timestamps for the target date
  const startOfDay = new Date(targetDate + 'T00:00:00Z').getTime()
  const endOfDay = new Date(targetDate + 'T23:59:59Z').getTime()

  // Calculate timestamps for "due soon" (next 3 days)
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const threeDaysFromNowEnd = new Date(threeDaysFromNow.toISOString().split('T')[0] + 'T23:59:59Z').getTime()

  // Count ideas captured today (items created with type='idea')
  const ideasCaptured = db.prepare(`
    SELECT COUNT(*) as count
    FROM items
    WHERE type = 'idea'
      AND created_at >= ?
      AND created_at <= ?
      AND (archived IS NULL OR archived = 0)
  `).get(startOfDay, endOfDay) as { count: number }

  // Count ideas converted today (items that were ideas but are now something else, updated today)
  const ideasConverted = db.prepare(`
    SELECT COUNT(*) as count
    FROM items
    WHERE type != 'idea'
      AND updated_at >= ?
      AND updated_at <= ?
      AND (archived IS NULL OR archived = 0)
  `).get(startOfDay, endOfDay) as { count: number }

  // Count tasks completed today (tasks with status='completed' and updated today)
  const tasksCompleted = db.prepare(`
    SELECT COUNT(*) as count
    FROM tasks t
    JOIN items i ON t.item_id = i.id
    WHERE t.status = 'completed'
      AND i.updated_at >= ?
      AND i.updated_at <= ?
      AND (i.archived IS NULL OR i.archived = 0)
  `).get(startOfDay, endOfDay) as { count: number }

  // Count tasks due today (due_date falls within today)
  const tasksDueToday = db.prepare(`
    SELECT COUNT(*) as count
    FROM tasks t
    JOIN items i ON t.item_id = i.id
    WHERE t.due_date >= ?
      AND t.due_date <= ?
      AND t.status != 'completed'
      AND (i.archived IS NULL OR i.archived = 0)
  `).get(startOfDay, endOfDay) as { count: number }

  // Count tasks due soon (due within next 3 days, not including today)
  const tasksDueSoon = db.prepare(`
    SELECT COUNT(*) as count
    FROM tasks t
    JOIN items i ON t.item_id = i.id
    WHERE t.due_date > ?
      AND t.due_date <= ?
      AND t.status != 'completed'
      AND (i.archived IS NULL OR i.archived = 0)
  `).get(endOfDay, threeDaysFromNowEnd) as { count: number }

  // Determine if there's any activity
  const hasActivity =
    ideasCaptured.count > 0 ||
    ideasConverted.count > 0 ||
    tasksCompleted.count > 0 ||
    tasksDueToday.count > 0

  return {
    date: targetDate,
    ideasCaptured: ideasCaptured.count,
    ideasConverted: ideasConverted.count,
    tasksCompleted: tasksCompleted.count,
    tasksDueToday: tasksDueToday.count,
    tasksDueSoon: tasksDueSoon.count,
    hasActivity
  }
}

/**
 * Format summary data into a human-readable message
 * @param summary - Summary data to format
 * @returns Formatted message for notification
 */
export function formatSummaryMessage(summary: DailySummaryData): string {
  if (!summary.hasActivity) {
    return 'No activity today. Time to capture some ideas!'
  }

  const lines: string[] = []

  // Header
  lines.push(`📊 Daily Summary for ${formatDate(summary.date)}`)
  lines.push('')

  // Activity section
  if (summary.ideasCaptured > 0 || summary.ideasConverted > 0 || summary.tasksCompleted > 0) {
    lines.push('✨ Today\'s Activity:')

    if (summary.ideasCaptured > 0) {
      lines.push(`  💡 ${summary.ideasCaptured} idea${summary.ideasCaptured > 1 ? 's' : ''} captured`)
    }

    if (summary.ideasConverted > 0) {
      lines.push(`  ✅ ${summary.ideasConverted} idea${summary.ideasConverted > 1 ? 's' : ''} converted`)
    }

    if (summary.tasksCompleted > 0) {
      lines.push(`  🎯 ${summary.tasksCompleted} task${summary.tasksCompleted > 1 ? 's' : ''} completed`)
    }

    lines.push('')
  }

  // Due section
  if (summary.tasksDueToday > 0 || summary.tasksDueSoon > 0) {
    lines.push('⏰ Upcoming:')

    if (summary.tasksDueToday > 0) {
      lines.push(`  📅 ${summary.tasksDueToday} task${summary.tasksDueToday > 1 ? 's' : ''} due today`)
    }

    if (summary.tasksDueSoon > 0) {
      lines.push(`  🔜 ${summary.tasksDueSoon} task${summary.tasksDueSoon > 1 ? 's' : ''} due in next 3 days`)
    }
  }

  return lines.join('\n')
}

/**
 * Format date string to human-readable format
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date (e.g., "Monday, Jan 15")
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00Z') // Use noon UTC to avoid timezone issues

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const dayName = days[date.getUTCDay()]
  const monthName = months[date.getUTCMonth()]
  const day = date.getUTCDate()

  return `${dayName}, ${monthName} ${day}`
}

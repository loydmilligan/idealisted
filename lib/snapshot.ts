import fs from 'fs'
import path from 'path'
import { format, startOfWeek, startOfMonth, subDays, getWeek, getYear, getMonth } from 'date-fns'

const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'snapshots')
const DAILY_DIR = path.join(SNAPSHOTS_DIR, 'daily')
const WEEKLY_DIR = path.join(SNAPSHOTS_DIR, 'weekly')
const MONTHLY_DIR = path.join(SNAPSHOTS_DIR, 'monthly')

// Ensure directories exist
function ensureDirectories() {
  [SNAPSHOTS_DIR, DAILY_DIR, WEEKLY_DIR, MONTHLY_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

export interface DailyStats {
  ideasCreated: number
  ideasSorted: number
  ideasConverted: number
  entityBreakdown: Record<string, number>
  tasksCompleted: number
  tasksDeferred: number
}

export interface ProjectSnapshot {
  id: string
  title: string
  status: string
  metadata: any
  tasksCompleted: number
  tasksAdded: number
  notesAdded: number
  statusChanged: boolean
}

export interface DailySnapshot {
  date: string
  timestamp: number
  stats: DailyStats
  projects: ProjectSnapshot[]
}

export interface WeeklySummary {
  weekNumber: number
  year: number
  startDate: string
  endDate: string
  dailySnapshots: string[]
  aggregatedStats: DailyStats
}

export interface MonthlySummary {
  month: number
  year: number
  startDate: string
  endDate: string
  weeklySnapshots: string[]
  aggregatedStats: DailyStats
}

class SnapshotService {
  constructor() {
    ensureDirectories()
  }

  /**
   * Generate a daily snapshot for the given date
   * @param date - Date to generate snapshot for
   * @param persist - Whether to save snapshot to disk (false for tests)
   */
  async generateDailySnapshot(date: Date = new Date(), persist: boolean = true): Promise<DailySnapshot> {
    const { db } = await import('./db')
    const dateStr = format(date, 'yyyy-MM-dd')
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Calculate daily stats
    const stats: DailyStats = {
      ideasCreated: 0,
      ideasSorted: 0,
      ideasConverted: 0,
      entityBreakdown: {},
      tasksCompleted: 0,
      tasksDeferred: 0,
    }

    // Ideas created today
    const ideasCreated = db.prepare(`
      SELECT COUNT(*) as count
      FROM items
      WHERE type = 'idea'
      AND created_at >= ? AND created_at <= ?
    `).get(startOfDay.getTime(), endOfDay.getTime()) as any
    stats.ideasCreated = ideasCreated.count

    // Ideas sorted today (ideas that were parsed today)
    const ideasSorted = db.prepare(`
      SELECT COUNT(*) as count
      FROM items
      WHERE type = 'idea'
      AND parsed = 1
      AND updated_at >= ? AND updated_at <= ?
    `).get(startOfDay.getTime(), endOfDay.getTime()) as any
    stats.ideasSorted = ideasSorted.count

    // Ideas converted today (items with entity_type that were updated today)
    const ideasConverted = db.prepare(`
      SELECT entity_type, COUNT(*) as count
      FROM items
      WHERE entity_type IS NOT NULL
      AND entity_type != 'idea'
      AND updated_at >= ? AND updated_at <= ?
      GROUP BY entity_type
    `).all(startOfDay.getTime(), endOfDay.getTime()) as any[]

    stats.ideasConverted = ideasConverted.reduce((sum, row) => sum + row.count, 0)
    ideasConverted.forEach(row => {
      stats.entityBreakdown[row.entity_type] = row.count
    })

    // Also track actual entities created today (not just converted ideas)
    const entitiesCreated = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM items
      WHERE type IN ('task', 'note', 'project', 'list', 'todo')
      AND created_at >= ? AND created_at <= ?
      GROUP BY type
    `).all(startOfDay.getTime(), endOfDay.getTime()) as any[]

    entitiesCreated.forEach(row => {
      // Add to entity breakdown (combine with converted ideas)
      stats.entityBreakdown[row.type] = (stats.entityBreakdown[row.type] || 0) + row.count
    })

    // Tasks completed today
    const tasksCompleted = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks t
      JOIN items i ON i.id = t.item_id
      WHERE t.status = 'completed'
      AND i.updated_at >= ? AND i.updated_at <= ?
    `).get(startOfDay.getTime(), endOfDay.getTime()) as any
    stats.tasksCompleted = tasksCompleted.count

    // Tasks deferred today (due date was today, got changed, still incomplete)
    // This is a simplification - we'd need a history table to track this properly
    // For now, we'll skip this and add it later if needed
    stats.tasksDeferred = 0

    // Project snapshots
    const projects = db.prepare(`
      SELECT i.id, i.text as title, i.metadata, p.*
      FROM items i
      JOIN projects p ON p.item_id = i.id
      WHERE i.entity_type = 'project'
      AND NOT i.archived
    `).all() as any[]

    const projectSnapshots: ProjectSnapshot[] = projects.map(proj => {
      // Count tasks completed today for this project
      const tasksCompleted = db.prepare(`
        SELECT COUNT(*) as count
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.status = 'completed'
        AND t.project_id = ?
        AND i.updated_at >= ? AND i.updated_at <= ?
      `).get(proj.id, startOfDay.getTime(), endOfDay.getTime()) as any

      // Count tasks added today for this project
      const tasksAdded = db.prepare(`
        SELECT COUNT(*) as count
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.project_id = ?
        AND i.created_at >= ? AND i.created_at <= ?
      `).get(proj.id, startOfDay.getTime(), endOfDay.getTime()) as any

      // Count notes added today for this project
      const notesAdded = db.prepare(`
        SELECT COUNT(*) as count
        FROM notes n
        JOIN items i ON i.id = n.item_id
        WHERE n.project_id = ?
        AND i.created_at >= ? AND i.created_at <= ?
      `).get(proj.id, startOfDay.getTime(), endOfDay.getTime()) as any

      const metadata = proj.metadata ? JSON.parse(proj.metadata) : {}

      return {
        id: proj.id,
        title: proj.title,
        status: proj.status || 'active',
        metadata,
        tasksCompleted: tasksCompleted.count,
        tasksAdded: tasksAdded.count,
        notesAdded: notesAdded.count,
        statusChanged: false, // We'd need history to determine this
      }
    })

    const snapshot: DailySnapshot = {
      date: dateStr,
      timestamp: date.getTime(),
      stats,
      projects: projectSnapshots,
    }

    // Only save snapshot and update aggregations if persist is true
    if (persist) {
      // Save snapshot
      await this.saveDailySnapshot(snapshot)

      // Cleanup old snapshots (keep 31 days)
      await this.cleanupOldSnapshots()

      // Update weekly and monthly summaries
      await this.updateWeeklySummary(date)
      await this.updateMonthlySummary(date)
    }

    return snapshot
  }

  /**
   * Save a daily snapshot to disk
   */
  private async saveDailySnapshot(snapshot: DailySnapshot): Promise<void> {
    const filePath = path.join(DAILY_DIR, `${snapshot.date}.json`)
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2))
  }

  /**
   * Get a daily snapshot by date
   */
  async getDailySnapshot(date: Date): Promise<DailySnapshot | null> {
    const dateStr = format(date, 'yyyy-MM-dd')
    const filePath = path.join(DAILY_DIR, `${dateStr}.json`)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }

  /**
   * Update weekly summary
   */
  private async updateWeeklySummary(date: Date): Promise<void> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday
    const weekNumber = getWeek(date, { weekStartsOn: 1 })
    const year = getYear(date)
    const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`

    // Collect all daily snapshots for this week
    const dailySnapshots: string[] = []
    const aggregatedStats: DailyStats = {
      ideasCreated: 0,
      ideasSorted: 0,
      ideasConverted: 0,
      entityBreakdown: {},
      tasksCompleted: 0,
      tasksDeferred: 0,
    }

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      const snapshot = await this.getDailySnapshot(day)

      if (snapshot) {
        dailySnapshots.push(snapshot.date)
        aggregatedStats.ideasCreated += snapshot.stats.ideasCreated
        aggregatedStats.ideasSorted += snapshot.stats.ideasSorted
        aggregatedStats.ideasConverted += snapshot.stats.ideasConverted
        aggregatedStats.tasksCompleted += snapshot.stats.tasksCompleted
        aggregatedStats.tasksDeferred += snapshot.stats.tasksDeferred

        Object.entries(snapshot.stats.entityBreakdown).forEach(([type, count]) => {
          aggregatedStats.entityBreakdown[type] = (aggregatedStats.entityBreakdown[type] || 0) + count
        })
      }
    }

    const weekEndDate = new Date(weekStart)
    weekEndDate.setDate(weekStart.getDate() + 6)

    const weeklySummary: WeeklySummary = {
      weekNumber,
      year,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEndDate, 'yyyy-MM-dd'),
      dailySnapshots,
      aggregatedStats,
    }

    const filePath = path.join(WEEKLY_DIR, `${weekId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(weeklySummary, null, 2))
  }

  /**
   * Update monthly summary
   */
  private async updateMonthlySummary(date: Date): Promise<void> {
    const monthStart = startOfMonth(date)
    const month = getMonth(date) + 1
    const year = getYear(date)
    const monthId = `${year}-${month.toString().padStart(2, '0')}`

    // Collect all weekly summaries for this month
    const weeklySnapshots: string[] = []
    const aggregatedStats: DailyStats = {
      ideasCreated: 0,
      ideasSorted: 0,
      ideasConverted: 0,
      entityBreakdown: {},
      tasksCompleted: 0,
      tasksDeferred: 0,
    }

    // Find all weeks in this month
    const weeksInMonth = new Set<string>()
    const currentDate = new Date(monthStart)
    const monthEnd = new Date(year, month, 0) // Last day of month

    while (currentDate <= monthEnd) {
      const weekNumber = getWeek(currentDate, { weekStartsOn: 1 })
      const weekYear = getYear(currentDate)
      const weekId = `${weekYear}-W${weekNumber.toString().padStart(2, '0')}`
      weeksInMonth.add(weekId)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Load each week's summary
    for (const weekId of Array.from(weeksInMonth)) {
      const filePath = path.join(WEEKLY_DIR, `${weekId}.json`)
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8')
        const weeklySummary: WeeklySummary = JSON.parse(data)

        weeklySnapshots.push(weekId)
        aggregatedStats.ideasCreated += weeklySummary.aggregatedStats.ideasCreated
        aggregatedStats.ideasSorted += weeklySummary.aggregatedStats.ideasSorted
        aggregatedStats.ideasConverted += weeklySummary.aggregatedStats.ideasConverted
        aggregatedStats.tasksCompleted += weeklySummary.aggregatedStats.tasksCompleted
        aggregatedStats.tasksDeferred += weeklySummary.aggregatedStats.tasksDeferred

        Object.entries(weeklySummary.aggregatedStats.entityBreakdown).forEach(([type, count]) => {
          aggregatedStats.entityBreakdown[type] = (aggregatedStats.entityBreakdown[type] || 0) + count
        })
      }
    }

    const monthlySummary: MonthlySummary = {
      month,
      year,
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
      weeklySnapshots: Array.from(weeklySnapshots),
      aggregatedStats,
    }

    const filePath = path.join(MONTHLY_DIR, `${monthId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(monthlySummary, null, 2))
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(date: Date): Promise<WeeklySummary | null> {
    const weekNumber = getWeek(date, { weekStartsOn: 1 })
    const year = getYear(date)
    const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`
    const filePath = path.join(WEEKLY_DIR, `${weekId}.json`)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }

  /**
   * Get monthly summary
   */
  async getMonthlySummary(date: Date): Promise<MonthlySummary | null> {
    const month = getMonth(date) + 1
    const year = getYear(date)
    const monthId = `${year}-${month.toString().padStart(2, '0')}`
    const filePath = path.join(MONTHLY_DIR, `${monthId}.json`)

    if (!fs.existsSync(filePath)) {
      return null
    }

    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  }

  /**
   * Cleanup old snapshots (keep 31 days, 8 weeks, 12 months)
   */
  private async cleanupOldSnapshots(): Promise<void> {
    const now = new Date()

    // Cleanup daily snapshots older than 31 days
    const dailyFiles = fs.readdirSync(DAILY_DIR)
    dailyFiles.forEach(file => {
      const filePath = path.join(DAILY_DIR, file)
      const stats = fs.statSync(filePath)
      const daysDiff = Math.floor((now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff > 31) {
        fs.unlinkSync(filePath)
      }
    })

    // Cleanup weekly snapshots older than 8 weeks
    const weeklyFiles = fs.readdirSync(WEEKLY_DIR)
    weeklyFiles.forEach(file => {
      const filePath = path.join(WEEKLY_DIR, file)
      const stats = fs.statSync(filePath)
      const weeksDiff = Math.floor((now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24 * 7))

      if (weeksDiff > 8) {
        fs.unlinkSync(filePath)
      }
    })

    // Cleanup monthly snapshots older than 12 months
    const monthlyFiles = fs.readdirSync(MONTHLY_DIR)
    monthlyFiles.forEach(file => {
      const filePath = path.join(MONTHLY_DIR, file)
      const stats = fs.statSync(filePath)
      const monthsDiff = Math.floor((now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24 * 30))

      if (monthsDiff > 12) {
        fs.unlinkSync(filePath)
      }
    })
  }
}

export const snapshotService = new SnapshotService()
export default snapshotService

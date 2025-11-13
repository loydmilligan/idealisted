import { snapshotService, DailySnapshot } from './snapshot'
import { aiService } from './ai'
import { format } from 'date-fns'

export interface ReviewData {
  date: string
  snapshot: DailySnapshot
  projectHighlights: string[]
  aiSummary?: string
  highlights: {
    topProjects: Array<{
      id: string
      title: string
      activity: string
    }>
  }
}

class ReviewService {
  /**
   * Generate a complete review for a given date
   * @param date - Date to generate review for
   * @param includeAI - Whether to include AI-generated project summary
   * @param persist - Whether to save snapshot to disk (false for tests)
   */
  async generateReview(date: Date = new Date(), includeAI: boolean = true, persist: boolean = true): Promise<ReviewData> {
    // Get or create daily snapshot
    let snapshot = await snapshotService.getDailySnapshot(date)

    if (!snapshot) {
      snapshot = await snapshotService.generateDailySnapshot(date, persist)
    }

    // Identify projects with significant activity
    const activeProjects = snapshot.projects.filter(proj =>
      proj.tasksCompleted > 0 || proj.tasksAdded > 0 || proj.notesAdded > 0 || proj.statusChanged
    )

    // Generate project highlights
    const projectHighlights = activeProjects.map(proj => {
      const activities: string[] = []

      if (proj.tasksCompleted > 0) {
        activities.push(`${proj.tasksCompleted} task${proj.tasksCompleted > 1 ? 's' : ''} completed`)
      }
      if (proj.tasksAdded > 0) {
        activities.push(`${proj.tasksAdded} task${proj.tasksAdded > 1 ? 's' : ''} added`)
      }
      if (proj.notesAdded > 0) {
        activities.push(`${proj.notesAdded} note${proj.notesAdded > 1 ? 's' : ''} added`)
      }
      if (proj.statusChanged) {
        activities.push(`status changed to ${proj.status}`)
      }

      return `${proj.title}: ${activities.join(', ')}`
    })

    // Generate AI summary if requested
    let aiSummary: string | undefined

    if (includeAI && activeProjects.length > 0) {
      try {
        aiSummary = await this.generateAIProjectSummary(activeProjects, snapshot)
      } catch (error) {
        console.error('Failed to generate AI summary:', error)
        aiSummary = undefined
      }
    }

    // Compile top projects for highlights
    const topProjects = activeProjects
      .sort((a, b) => {
        const scoreA = a.tasksCompleted * 3 + a.tasksAdded + a.notesAdded
        const scoreB = b.tasksCompleted * 3 + b.tasksAdded + b.notesAdded
        return scoreB - scoreA
      })
      .slice(0, 3)
      .map(proj => ({
        id: proj.id,
        title: proj.title,
        activity: `${proj.tasksCompleted} completed, ${proj.tasksAdded} added`
      }))

    return {
      date: snapshot.date,
      snapshot,
      projectHighlights,
      aiSummary,
      highlights: {
        topProjects
      }
    }
  }

  /**
   * Generate AI summary of project work for the day
   */
  private async generateAIProjectSummary(
    activeProjects: any[],
    snapshot: DailySnapshot
  ): Promise<string> {
    const { db } = await import('./db')

    // Load full project details for context
    const projectDetails = activeProjects.map(proj => {
      // Get completed tasks for this project today
      const startOfDay = new Date(snapshot.date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(snapshot.date)
      endOfDay.setHours(23, 59, 59, 999)

      const completedTasks = db.prepare(`
        SELECT i.text as title
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.status = 'completed'
        AND t.project_id = ?
        AND i.updated_at >= ? AND i.updated_at <= ?
      `).all(proj.id, startOfDay.getTime(), endOfDay.getTime()) as any[]

      const addedTasks = db.prepare(`
        SELECT i.text as title
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.project_id = ?
        AND i.created_at >= ? AND i.created_at <= ?
      `).all(proj.id, startOfDay.getTime(), endOfDay.getTime()) as any[]

      const addedNotes = db.prepare(`
        SELECT i.text as content
        FROM notes n
        JOIN items i ON i.id = n.item_id
        WHERE n.project_id = ?
        AND i.created_at >= ? AND i.created_at <= ?
      `).all(proj.id, startOfDay.getTime(), endOfDay.getTime()) as any[]

      return {
        title: proj.title,
        status: proj.status,
        completedTasks: completedTasks.map(t => t.title),
        addedTasks: addedTasks.map(t => t.title),
        addedNotes: addedNotes.map(n => n.content),
      }
    })

    // Create prompt for AI
    const prompt = `You are summarizing a day's work on various projects. Provide a concise, encouraging summary highlighting key accomplishments and progress.

Date: ${snapshot.date}

Projects with activity:
${projectDetails.map(p => `
Project: ${p.title} (${p.status})
- Completed tasks: ${p.completedTasks.length > 0 ? p.completedTasks.join('; ') : 'none'}
- Added tasks: ${p.addedTasks.length > 0 ? p.addedTasks.join('; ') : 'none'}
- Added notes: ${p.addedNotes.length > 0 ? p.addedNotes.join('; ') : 'none'}
`).join('\n')}

Provide a brief, encouraging summary (2-3 sentences) of today's project work. Focus on concrete accomplishments and momentum.`

    try {
      const response = await aiService.chat(prompt, 'You are a helpful productivity assistant.')
      return response.suggestion || 'Made progress on multiple projects today.'
    } catch (error) {
      console.error('AI summary generation failed:', error)
      return 'Made progress on multiple projects today.'
    }
  }

  /**
   * Get notification message for daily review
   */
  getNotificationMessage(reviewData: ReviewData): { title: string, message: string } {
    const { snapshot, projectHighlights } = reviewData

    // Create summary of top accomplishments
    const highlights: string[] = []

    if (snapshot.stats.tasksCompleted > 0) {
      highlights.push(`${snapshot.stats.tasksCompleted} task${snapshot.stats.tasksCompleted > 1 ? 's' : ''} completed`)
    }

    if (snapshot.stats.ideasConverted > 0) {
      highlights.push(`${snapshot.stats.ideasConverted} idea${snapshot.stats.ideasConverted > 1 ? 's' : ''} converted`)
    }

    if (projectHighlights.length > 0) {
      const topProject = projectHighlights[0].split(':')[0]
      highlights.push(`progress on ${topProject}`)
    }

    const message = highlights.length > 0
      ? `Good work! You ${highlights.slice(0, 2).join(', ')}${highlights.length > 2 ? ', and more' : ''}.`
      : 'Your daily IdeaListed review is ready.'

    return {
      title: '📊 Daily Review Ready',
      message
    }
  }

  /**
   * Check if a review has been sent today
   */
  async hasReviewBeenSentToday(): Promise<boolean> {
    try {
      const { db } = await import('./db')
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_review') as any

      if (!setting) return false

      const config = JSON.parse(setting.value)
      const today = format(new Date(), 'yyyy-MM-dd')

      return config.lastSent === today
    } catch (error) {
      console.error('Failed to check review status:', error)
      return false
    }
  }

  /**
   * Mark review as sent for today
   */
  async markReviewAsSent(): Promise<void> {
    try {
      const { db } = await import('./db')
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_review') as any

      if (!setting) {
        throw new Error('Daily review settings not found')
      }

      const config = JSON.parse(setting.value)
      config.lastSent = format(new Date(), 'yyyy-MM-dd')

      db.prepare(`
        UPDATE settings
        SET value = ?, updated_at = ?
        WHERE key = ?
      `).run(JSON.stringify(config), Date.now(), 'daily_review')
    } catch (error) {
      console.error('Failed to mark review as sent:', error)
      throw error
    }
  }
}

export const reviewService = new ReviewService()
export default reviewService

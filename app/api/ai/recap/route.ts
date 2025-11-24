import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiService } from '@/lib/ai'
import { isRecapEnabled, getActivityThreshold, getEffectiveRecapMode } from '@/lib/recap-config'
import { getQuoteForDay } from '@/lib/quotes'

interface RecapStats {
  tasks: number
  notes: number
  ideas: number
}

interface RecapResponse {
  success: boolean
  summary?: string[]
  quote?: { text: string; author: string }
  fallback: boolean
  stats: RecapStats
  cached: boolean
  error?: boolean
}

interface CachedRecap {
  summary?: string[]
  quote?: { text: string; author: string }
  fallback: boolean
  stats: RecapStats
  generatedAt: number
}

/**
 * Calculate the start and end timestamps for a given date
 */
function getDateRange(dateStr: string): { start: number; end: number } {
  const date = new Date(dateStr)
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start: start.getTime(), end: end.getTime() }
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

/**
 * Format date string for display
 */
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Check cache for existing recap
 */
function getCachedRecap(dateStr: string): CachedRecap | null {
  try {
    const cacheKey = `recap_cache_${dateStr}`
    const cached = db.prepare('SELECT value FROM settings WHERE key = ?').get(cacheKey) as { value: string } | undefined

    if (cached) {
      return JSON.parse(cached.value) as CachedRecap
    }
    return null
  } catch (error) {
    console.error('Error reading recap cache:', error)
    return null
  }
}

/**
 * Save recap to cache
 */
function saveRecapToCache(dateStr: string, recap: CachedRecap): void {
  try {
    const cacheKey = `recap_cache_${dateStr}`
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run(cacheKey, JSON.stringify(recap), Date.now())
  } catch (error) {
    console.error('Error saving recap to cache:', error)
  }
}

/**
 * Count activity for a given date range
 */
function countActivity(start: number, end: number): RecapStats {
  // Tasks completed (status changed to 'completed' during the date range)
  const tasksResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM tasks t
    JOIN items i ON t.item_id = i.id
    WHERE t.status = 'completed'
    AND i.updated_at BETWEEN ? AND ?
  `).get(start, end) as { count: number }

  // Notes created
  const notesResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM items
    WHERE type = 'note'
    AND created_at BETWEEN ? AND ?
  `).get(start, end) as { count: number }

  // Ideas captured
  const ideasResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM items
    WHERE type = 'idea'
    AND created_at BETWEEN ? AND ?
  `).get(start, end) as { count: number }

  return {
    tasks: tasksResult.count,
    notes: notesResult.count,
    ideas: ideasResult.count
  }
}

/**
 * Fetch task and note titles for AI context
 */
function fetchActivityDetails(start: number, end: number): { taskTitles: string[]; noteTitles: string[] } {
  // Get completed task titles
  const tasks = db.prepare(`
    SELECT i.text
    FROM tasks t
    JOIN items i ON t.item_id = i.id
    WHERE t.status = 'completed'
    AND i.updated_at BETWEEN ? AND ?
    LIMIT 10
  `).all(start, end) as { text: string }[]

  // Get note titles
  const notes = db.prepare(`
    SELECT text
    FROM items
    WHERE type = 'note'
    AND created_at BETWEEN ? AND ?
    LIMIT 10
  `).all(start, end) as { text: string }[]

  return {
    taskTitles: tasks.map(t => t.text),
    noteTitles: notes.map(n => n.text)
  }
}

/**
 * Generate AI recap summary
 */
async function generateAIRecap(
  stats: RecapStats,
  taskTitles: string[],
  noteTitles: string[],
  dateStr: string
): Promise<string[]> {
  const formattedDate = formatDateForDisplay(dateStr)

  const prompt = `Generate a brief daily recap for ${formattedDate}.

Activity Summary:
- ${stats.tasks} task${stats.tasks !== 1 ? 's' : ''} completed
- ${stats.notes} note${stats.notes !== 1 ? 's' : ''} created
- ${stats.ideas} idea${stats.ideas !== 1 ? 's' : ''} captured

${taskTitles.length > 0 ? `Completed tasks:\n${taskTitles.map(t => `- ${t}`).join('\n')}` : ''}

${noteTitles.length > 0 ? `Notes created:\n${noteTitles.map(n => `- ${n}`).join('\n')}` : ''}

Generate 3-5 bullet points summarizing the day's accomplishments. Be encouraging and highlight productivity wins. Keep each bullet concise (under 100 characters).

Return ONLY a JSON array of strings, like:
["First bullet point", "Second bullet point", "Third bullet point"]`

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.DEFAULT_PAID_MODEL || 'x-ai/grok-code-fast-1'

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error('AI API request failed')
  }

  const data = await response.json()
  const aiResponse = data.choices[0]?.message?.content

  if (!aiResponse) {
    throw new Error('No response from AI')
  }

  // Parse the AI response - expecting a JSON array
  try {
    // Try to extract JSON array from response (AI sometimes wraps it in text)
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const bullets = JSON.parse(jsonMatch[0]) as string[]
      // Validate and limit to 5 bullets
      if (Array.isArray(bullets)) {
        return bullets.slice(0, 5).map((b: unknown) => String(b).trim())
      }
    }
    throw new Error('Could not parse AI response as array')
  } catch (parseError) {
    // Fallback: split by newlines and clean up
    const lines = aiResponse.split('\n')
      .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line: string) => line.length > 0 && line.length < 150)
      .slice(0, 5)

    if (lines.length > 0) {
      return lines
    }

    throw new Error('Failed to parse AI recap response')
  }
}

/**
 * POST /api/ai/recap
 * Generate AI-powered daily recap with threshold checking and quote fallback
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let dateStr: string
    try {
      const body = await request.json().catch(() => ({}))
      dateStr = body.date || getYesterdayDate()
    } catch {
      dateStr = getYesterdayDate()
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Check if AI is enabled (master toggle)
    if (!aiService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'AI features are disabled. Enable AI in Settings.' },
        { status: 403 }
      )
    }

    // Check if recap feature is enabled
    if (!isRecapEnabled()) {
      return NextResponse.json(
        { success: false, error: 'Daily recap feature is disabled.' },
        { status: 403 }
      )
    }

    // Check for cached result
    const cached = getCachedRecap(dateStr)
    if (cached) {
      return NextResponse.json({
        success: true,
        summary: cached.summary,
        quote: cached.quote,
        fallback: cached.fallback,
        stats: cached.stats,
        cached: true
      } as RecapResponse)
    }

    // Calculate date range and count activity
    const { start, end } = getDateRange(dateStr)
    const stats = countActivity(start, end)
    const totalActivity = stats.tasks + stats.notes + stats.ideas

    // Check threshold and determine mode
    const threshold = getActivityThreshold()
    const effectiveMode = getEffectiveRecapMode(totalActivity)

    // If below threshold or mode is quote, return quote fallback
    if (effectiveMode === 'quote' || totalActivity < threshold) {
      const quote = getQuoteForDay(dateStr)
      const result: CachedRecap = {
        quote: { text: quote.text, author: quote.author || 'Unknown' },
        fallback: true,
        stats,
        generatedAt: Date.now()
      }

      saveRecapToCache(dateStr, result)

      return NextResponse.json({
        success: true,
        quote: result.quote,
        fallback: true,
        stats,
        cached: false
      } as RecapResponse)
    }

    // Generate AI recap
    try {
      const { taskTitles, noteTitles } = fetchActivityDetails(start, end)
      const summary = await generateAIRecap(stats, taskTitles, noteTitles, dateStr)

      const result: CachedRecap = {
        summary,
        fallback: false,
        stats,
        generatedAt: Date.now()
      }

      saveRecapToCache(dateStr, result)

      return NextResponse.json({
        success: true,
        summary,
        fallback: false,
        stats,
        cached: false
      } as RecapResponse)
    } catch (aiError) {
      // AI generation failed - fall back to quote
      console.error('AI recap generation failed:', aiError)

      const quote = getQuoteForDay(dateStr)
      const result: CachedRecap = {
        quote: { text: quote.text, author: quote.author || 'Unknown' },
        fallback: true,
        stats,
        generatedAt: Date.now()
      }

      // Don't cache error fallbacks - allow retry

      return NextResponse.json({
        success: true,
        quote: result.quote,
        fallback: true,
        stats,
        cached: false,
        error: true
      } as RecapResponse)
    }

  } catch (error) {
    console.error('Recap API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate recap' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiService } from '@/lib/ai'
import { Project, Task, Note } from '@/types'

interface TaskSuggestion {
  text: string
  confidence: number
  priority?: number
  status?: 'pending' | 'in-progress'
}

interface NoteSuggestion {
  text: string
  confidence: number
  subtype?: 'general' | 'research' | 'meeting' | 'reference'
}

type ProjectSuggestion = TaskSuggestion | NoteSuggestion

interface ProjectWithContext {
  id: string
  item_id: string
  name: string
  description?: string
  status: Project['status']
}

interface ExistingTask {
  id: string
  text: string
  status: Task['status']
  priority: number
}

interface ExistingNote {
  id: string
  text: string
  subtype: Note['subtype']
}

/**
 * POST /api/ai/project-suggest
 *
 * Suggests new tasks or notes for an existing project using AI analysis.
 * Analyzes project name, description, status, and existing items to generate contextually appropriate suggestions.
 *
 * Request body:
 * - project_id: string (required) - ID of the project to suggest items for
 * - type: 'task' | 'note' (required) - Type of suggestions to generate
 * - hint?: string (optional) - User guidance for what kind of items to suggest
 * - count?: number (optional) - Number of suggestions (default: 5, max: 10)
 *
 * Response:
 * - success: boolean
 * - suggestions: Array<TaskSuggestion | NoteSuggestion>
 *
 * Errors:
 * - 400: Missing or invalid project_id, invalid type parameter
 * - 403: AI disabled or project_ai_add feature disabled
 * - 404: Project not found
 * - 500: Internal server error
 * - 503: AI API unavailable
 */
export async function POST(request: NextRequest) {
  try {
    // Check if project_ai_add feature is enabled (includes master toggle check)
    const featureEnabled = await aiService.isFeatureEnabled('project_ai_add')

    if (!featureEnabled) {
      return NextResponse.json(
        { success: false, error: 'AI project suggestions feature is disabled. Enable it in Settings > AI > Features.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { project_id, type, hint, count: requestedCount } = body

    // Validate project_id parameter
    if (!project_id || typeof project_id !== 'string' || project_id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'project_id is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate type parameter
    if (!type || (type !== 'task' && type !== 'note')) {
      return NextResponse.json(
        { success: false, error: 'type is required and must be either "task" or "note"' },
        { status: 400 }
      )
    }

    // Validate and normalize count (default: 5, max: 10)
    const count = Math.min(Math.max(1, requestedCount || 5), 10)

    // Fetch project from database with item name
    const project = db.prepare(`
      SELECT p.id, p.item_id, i.text as name, p.description, p.status
      FROM projects p
      JOIN items i ON p.item_id = i.id
      WHERE p.id = ?
    `).get(project_id) as ProjectWithContext | undefined

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Build context based on suggestion type
    let existingItemsContext: string
    let prompt: string

    if (type === 'task') {
      // Fetch existing tasks for this project (limit to 20 for context)
      const existingTasks = db.prepare(`
        SELECT t.id, i.text, t.status, t.priority
        FROM tasks t
        JOIN items i ON t.item_id = i.id
        WHERE t.project_id = ?
        ORDER BY t.priority DESC, i.created_at DESC
        LIMIT 20
      `).all(project_id) as ExistingTask[]

      existingItemsContext = existingTasks.length > 0
        ? existingTasks.map(task => `- [${task.status}] ${task.text} (priority: ${task.priority})`).join('\n')
        : '(No tasks yet)'

      prompt = `Project: "${project.name}"
${project.description ? `Description: "${project.description}"` : ''}
Status: ${project.status}

Existing Tasks:
${existingItemsContext}

${hint ? `User hint: "${hint}"` : ''}

Suggest ${count} actionable tasks that would help advance this project.

Rules:
1. Tasks should be specific and actionable (start with action verbs)
2. Don't duplicate existing tasks
3. Consider the project status (${project.status}) when suggesting
4. Match the scope and complexity of existing tasks
5. For "planning" status projects, focus on planning and setup tasks
6. For "active" projects, focus on execution tasks
7. For "completed" projects, focus on maintenance or follow-up tasks
8. Consider the user's hint if provided

Return ONLY a JSON array with exactly ${count} suggestions:
[
  { "text": "Task description", "confidence": 0.85, "priority": 2, "status": "pending" },
  ...
]

Where:
- text: Clear, actionable task description
- confidence: 0.0-1.0 based on how well the task fits the project
- priority: 1 (low), 2 (medium), or 3 (high)
- status: "pending" or "in-progress"`

    } else {
      // type === 'note'
      // Fetch existing notes for this project (limit to 20 for context)
      const existingNotes = db.prepare(`
        SELECT n.id, i.text, n.subtype
        FROM notes n
        JOIN items i ON n.item_id = i.id
        WHERE n.project_id = ?
        ORDER BY i.created_at DESC
        LIMIT 20
      `).all(project_id) as ExistingNote[]

      existingItemsContext = existingNotes.length > 0
        ? existingNotes.map(note => `- [${note.subtype}] ${note.text}`).join('\n')
        : '(No notes yet)'

      prompt = `Project: "${project.name}"
${project.description ? `Description: "${project.description}"` : ''}
Status: ${project.status}

Existing Notes:
${existingItemsContext}

${hint ? `User hint: "${hint}"` : ''}

Suggest ${count} notes or documentation topics that would be useful for this project.

Rules:
1. Notes should be relevant to the project's goals
2. Don't duplicate existing notes
3. Consider what documentation would help track progress or decisions
4. Include a mix of note types (research, meeting notes, references, etc.)
5. Consider the project status (${project.status}) when suggesting
6. Consider the user's hint if provided

Return ONLY a JSON array with exactly ${count} suggestions:
[
  { "text": "Note title or topic", "confidence": 0.85, "subtype": "research" },
  ...
]

Where:
- text: Clear note title or topic
- confidence: 0.0-1.0 based on how useful the note would be
- subtype: "general", "research", "meeting", or "reference"`
    }

    // Get AI config from database
    const settingsResponse = await fetch(`${request.nextUrl.origin}/api/settings`)
    const settingsData = await settingsResponse.json()
    const config = settingsData.settings?.ai_config

    if (!config || !config.enabled || !config.apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI not configured. Please set up your OpenRouter API key in Settings.' },
        { status: 500 }
      )
    }

    const model = config.usePaidModel ? config.paidModel : config.freeModel

    // Call OpenRouter AI API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5, // Slightly higher temperature for creative suggestions
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in AI response')
    }

    // Parse AI response
    let suggestions: ProjectSuggestion[]
    try {
      suggestions = JSON.parse(content)
    } catch (e) {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }

    // Validate and filter suggestions based on type
    let validSuggestions: ProjectSuggestion[]

    if (type === 'task') {
      validSuggestions = (suggestions as TaskSuggestion[])
        .filter(s =>
          s &&
          typeof s.text === 'string' &&
          s.text.trim().length > 0 &&
          typeof s.confidence === 'number' &&
          s.confidence >= 0 &&
          s.confidence <= 1
        )
        .map(s => ({
          text: s.text.trim(),
          confidence: Math.round(s.confidence * 100) / 100,
          priority: typeof s.priority === 'number' && s.priority >= 1 && s.priority <= 3 ? s.priority : 2,
          status: s.status === 'in-progress' ? 'in-progress' : 'pending'
        } as TaskSuggestion))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10)
    } else {
      const validSubtypes = ['general', 'research', 'meeting', 'reference']
      validSuggestions = (suggestions as NoteSuggestion[])
        .filter(s =>
          s &&
          typeof s.text === 'string' &&
          s.text.trim().length > 0 &&
          typeof s.confidence === 'number' &&
          s.confidence >= 0 &&
          s.confidence <= 1
        )
        .map(s => ({
          text: s.text.trim(),
          confidence: Math.round(s.confidence * 100) / 100,
          subtype: validSubtypes.includes(s.subtype || '') ? s.subtype : 'general'
        } as NoteSuggestion))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10)
    }

    return NextResponse.json({
      success: true,
      suggestions: validSuggestions,
      project_context: {
        name: project.name,
        status: project.status,
        suggestion_type: type
      }
    })

  } catch (error) {
    console.error('Error suggesting project items:', error)

    const message = error instanceof Error ? error.message : 'Unknown error'

    // Determine appropriate status code based on error type
    let status = 500
    if (message.includes('AI API error:')) {
      status = 503 // Service Unavailable
    } else if (message.includes('Failed to parse AI response')) {
      status = 500 // Internal Server Error
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to suggest project items',
        details: message
      },
      { status }
    )
  }
}

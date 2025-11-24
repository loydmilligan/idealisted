import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiService } from '@/lib/ai'
import { List, ListItem, ListType } from '@/types'

interface ListAppendSuggestion {
  text: string
  confidence: number
}

interface ListWithItems {
  id: string
  item_id: string
  name: string
  list_type: ListType
  description?: string
  items: ListItem[]
}

/**
 * POST /api/ai/append-list
 *
 * Suggests new items for an existing list using AI analysis.
 * Analyzes list name, type, and current items to generate contextually appropriate suggestions.
 *
 * Request body:
 * - list_id: string (required) - ID of the list to append items to
 * - hint?: string (optional) - User guidance for what kind of items to suggest
 * - count?: number (optional) - Number of suggestions (default: 5, max: 10)
 *
 * Response:
 * - success: boolean
 * - suggestions: Array<{ text: string, confidence: number }>
 *
 * Errors:
 * - 400: Missing or invalid list_id
 * - 403: AI disabled or list_append_ai feature disabled
 * - 404: List not found
 * - 500: Internal server error
 * - 503: AI API unavailable
 */
export async function POST(request: NextRequest) {
  try {
    // Check if list_append_ai feature is enabled (includes master toggle check)
    const featureEnabled = await aiService.isFeatureEnabled('list_append_ai')

    if (!featureEnabled) {
      return NextResponse.json(
        { success: false, error: 'AI list append feature is disabled. Enable it in Settings > AI > Features.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { list_id, hint, count: requestedCount } = body

    // Validate list_id parameter
    if (!list_id || typeof list_id !== 'string' || list_id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'list_id is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate and normalize count (default: 5, max: 10)
    const count = Math.min(Math.max(1, requestedCount || 5), 10)

    // Fetch list from database
    const list = db.prepare(`
      SELECT id, item_id, name, list_type, description
      FROM lists
      WHERE id = ?
    `).get(list_id) as List | undefined

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'List not found' },
        { status: 404 }
      )
    }

    // Fetch list items (limit to 20 for context to avoid token bloat)
    const items = db.prepare(`
      SELECT id, list_id, text, done, position, created_at
      FROM list_items
      WHERE list_id = ?
      ORDER BY position ASC
      LIMIT 20
    `).all(list_id) as ListItem[]

    // Build the list with items for context
    const listWithItems: ListWithItems = {
      ...list,
      list_type: list.list_type || 'bulleted',
      items
    }

    // Generate list type description for better AI context
    const listTypeDescriptions: Record<ListType, string> = {
      'shopping': 'a shopping list for purchasing items',
      'tasklist': 'a task list with actionable items to complete',
      'bulleted': 'a general bulleted list of items',
      'numbered': 'an ordered/numbered list with sequential items'
    }
    const listTypeDescription = listTypeDescriptions[listWithItems.list_type] || 'a list of items'

    // Build AI prompt
    const existingItemsText = listWithItems.items.length > 0
      ? listWithItems.items.map(item => `- ${item.text}${item.done ? ' (completed)' : ''}`).join('\n')
      : '(No items yet)'

    const prompt = `Given this list, suggest ${count} new items that fit the theme:

List Name: "${listWithItems.name}"
List Type: ${listWithItems.list_type} (${listTypeDescription})
${listWithItems.description ? `Description: ${listWithItems.description}` : ''}

Current Items:
${existingItemsText}

${hint ? `User hint: "${hint}"` : ''}

Rules:
1. Suggest items that complement existing ones
2. Don't duplicate existing items
3. Match the style/format of existing items (length, specificity, phrasing)
4. For shopping lists, suggest related products or items commonly bought together
5. For task lists, suggest related actionable items that logically follow
6. For numbered lists, maintain logical sequence/ordering
7. For bulleted lists, keep items thematically consistent
8. Consider the user's hint if provided

Return ONLY a JSON array with exactly ${count} suggestions (no more, no less):
[
  { "text": "suggested item text", "confidence": 0.85 },
  ...
]

Confidence should be 0.0-1.0 based on how well the item fits the list context.`

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
    let suggestions: ListAppendSuggestion[]
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

    // Validate and filter suggestions
    const validSuggestions = suggestions
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
        confidence: Math.round(s.confidence * 100) / 100 // Round to 2 decimal places
      }))
      // Filter out duplicates of existing items (case-insensitive)
      .filter(s => {
        const normalizedText = s.text.toLowerCase().trim()
        return !listWithItems.items.some(
          existingItem => existingItem.text.toLowerCase().trim() === normalizedText
        )
      })
      // Sort by confidence descending
      .sort((a, b) => b.confidence - a.confidence)
      // Enforce max 10 limit
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      suggestions: validSuggestions,
      list_context: {
        name: listWithItems.name,
        type: listWithItems.list_type,
        existing_item_count: listWithItems.items.length
      }
    })

  } catch (error) {
    console.error('Error suggesting list items:', error)

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
        error: 'Failed to suggest list items',
        details: message
      },
      { status }
    )
  }
}

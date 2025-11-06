import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { itemId, entityType, ai_suggestion } = await request.json()

    if (!itemId || !entityType) {
      return NextResponse.json(
        { error: 'Item ID and entity type are required' },
        { status: 400 }
      )
    }

    if (!['task', 'note', 'list', 'project'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      )
    }

    // Update item to mark as parsed with suggested type
    const aiSuggestionJson = ai_suggestion ? JSON.stringify(ai_suggestion) : null
    db.prepare(`
      UPDATE items
      SET parsed = 1,
          entity_type = ?,
          ai_suggestion = ?,
          updated_at = ?
      WHERE id = ?
    `).run(entityType, aiSuggestionJson, Date.now(), itemId)

    // Fetch the updated item
    const item = db.prepare(`
      SELECT * FROM items WHERE id = ?
    `).get(itemId) as any

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Parse JSON fields
    if (item.tags) item.tags = JSON.parse(item.tags)
    if (item.metadata) item.metadata = JSON.parse(item.metadata)
    if (item.ai_suggestion) item.ai_suggestion = JSON.parse(item.ai_suggestion)
    item.parsed = Boolean(item.parsed)

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse item' },
      { status: 500 }
    )
  }
}

// Parse all unparsed ideas using AI
export async function PUT(request: NextRequest) {
  try {
    // Get all unparsed ideas
    const unparsedItems = db.prepare(`
      SELECT * FROM items
      WHERE type = 'idea' AND (parsed = 0 OR parsed IS NULL)
    `).all() as any[]

    if (unparsedItems.length === 0) {
      return NextResponse.json({ success: true, parsed: 0 })
    }

    // For each unparsed item, call AI to suggest type
    const results = []
    for (const item of unparsedItems) {
      try {
        // Call AI suggest endpoint
        const aiResponse = await fetch(`${request.nextUrl.origin}/api/ai/suggest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: item.text })
        })

        if (aiResponse.ok) {
          const suggestion = await aiResponse.json()

          // Update item with AI suggestion and mark as parsed
          db.prepare(`
            UPDATE items
            SET parsed = 1,
                entity_type = ?,
                ai_suggestion = ?,
                updated_at = ?
            WHERE id = ?
          `).run(
            suggestion.suggested_type,
            JSON.stringify(suggestion),
            Date.now(),
            item.id
          )

          results.push({ id: item.id, success: true, type: suggestion.suggested_type })
        } else {
          results.push({ id: item.id, success: false, error: 'AI request failed' })
        }
      } catch (err) {
        console.error(`Failed to parse item ${item.id}:`, err)
        results.push({ id: item.id, success: false, error: String(err) })
      }
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      parsed: successCount,
      total: unparsedItems.length,
      results
    })
  } catch (error) {
    console.error('Batch parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse items' },
      { status: 500 }
    )
  }
}

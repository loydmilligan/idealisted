import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/list-items/bulk
 * Add multiple items to an existing list
 * Sprint 2 - Phase 5: AI Append to Lists
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listId, items } = body

    // Validation
    if (!listId || typeof listId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'listId is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Verify list exists
    const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(listId)
    if (!list) {
      return NextResponse.json(
        { success: false, error: 'List not found' },
        { status: 404 }
      )
    }

    // Get current max position for ordering
    const maxPositionRow = db.prepare(
      'SELECT MAX(position) as max_position FROM list_items WHERE list_id = ?'
    ).get(listId) as { max_position: number | null }

    let nextPosition = (maxPositionRow?.max_position ?? -1) + 1

    // Insert items in a transaction
    const insertStmt = db.prepare(`
      INSERT INTO list_items (id, list_id, text, done, position, created_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `)

    const transaction = db.transaction((itemTexts: string[]) => {
      const now = Date.now()
      const insertedIds: string[] = []

      for (const itemText of itemTexts) {
        const itemId = uuidv4()
        insertStmt.run(itemId, listId, itemText, nextPosition, now)
        insertedIds.push(itemId)
        nextPosition++
      }

      return insertedIds
    })

    const insertedIds = transaction(items)

    // Update the parent item's updated_at timestamp
    db.prepare(`
      UPDATE items
      SET updated_at = ?
      WHERE id = (SELECT item_id FROM lists WHERE id = ?)
    `).run(Date.now(), listId)

    return NextResponse.json({
      success: true,
      data: {
        listId,
        itemsAdded: insertedIds.length,
        insertedIds
      }
    })

  } catch (error) {
    console.error('[API] Bulk list items error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

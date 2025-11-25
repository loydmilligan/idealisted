import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface BatchPositionUpdate {
  id: string
  position: number
}

/**
 * PUT /api/plan-assignments/batch - Batch update positions for multiple assignments
 * Body: { updates: [{ id: string, position: number }] }
 *
 * Used for efficient reordering operations within the same day.
 * Updates are executed in a transaction for atomicity.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { updates } = body as { updates: BatchPositionUpdate[] }

    // Validate input
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'updates array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate each update
    for (const update of updates) {
      if (!update.id || typeof update.position !== 'number' || update.position < 0) {
        return NextResponse.json(
          { success: false, error: 'Each update must have id (string) and position (non-negative number)' },
          { status: 400 }
        )
      }
    }

    const now = Date.now()

    // Execute all updates in a transaction
    const updateStmt = db.prepare(`
      UPDATE plan_assignments
      SET position = ?, updated_at = ?
      WHERE id = ?
    `)

    const transaction = db.transaction((updates: BatchPositionUpdate[]) => {
      for (const update of updates) {
        updateStmt.run(update.position, now, update.id)
      }
    })

    transaction(updates)

    return NextResponse.json({
      success: true,
      data: { updated: updates.length }
    })
  } catch (error) {
    console.error('Error batch updating plan assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to batch update plan assignments' },
      { status: 500 }
    )
  }
}

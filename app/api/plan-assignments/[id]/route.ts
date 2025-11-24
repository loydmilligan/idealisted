import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PlanAssignment } from '@/types'

// GET /api/plan-assignments/[id] - Get a specific assignment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignment = db.prepare('SELECT * FROM plan_assignments WHERE id = ?').get(params.id) as PlanAssignment | undefined

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: assignment })
  } catch (error) {
    console.error('Error fetching plan assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan assignment' },
      { status: 500 }
    )
  }
}

// PUT /api/plan-assignments/[id] - Update position or assigned_date
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { position, assigned_date } = body

    // Check if assignment exists
    const existing = db.prepare('SELECT * FROM plan_assignments WHERE id = ?').get(params.id) as PlanAssignment | undefined

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Validate assigned_date format if provided
    if (assigned_date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(assigned_date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }

      // Check for duplicate if changing date (same item_id + new assigned_date)
      if (assigned_date !== existing.assigned_date) {
        const duplicate = db.prepare(
          'SELECT id FROM plan_assignments WHERE item_id = ? AND assigned_date = ? AND id != ?'
        ).get(existing.item_id, assigned_date, params.id)

        if (duplicate) {
          return NextResponse.json(
            { success: false, error: 'Assignment already exists for this item and date' },
            { status: 409 }
          )
        }
      }
    }

    // Validate position if provided
    if (position !== undefined && (typeof position !== 'number' || position < 0)) {
      return NextResponse.json(
        { success: false, error: 'Position must be a non-negative number' },
        { status: 400 }
      )
    }

    const now = Date.now()
    const newPosition = position !== undefined ? position : existing.position
    const newDate = assigned_date !== undefined ? assigned_date : existing.assigned_date

    const updateStmt = db.prepare(`
      UPDATE plan_assignments
      SET position = ?, assigned_date = ?, updated_at = ?
      WHERE id = ?
    `)

    const result = updateStmt.run(newPosition, newDate, now, params.id)

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Fetch updated assignment
    const updated = db.prepare('SELECT * FROM plan_assignments WHERE id = ?').get(params.id) as PlanAssignment

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating plan assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update plan assignment' },
      { status: 500 }
    )
  }
}

// DELETE /api/plan-assignments/[id] - Remove assignment (NOT the underlying item)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if assignment exists first
    const existing = db.prepare('SELECT id FROM plan_assignments WHERE id = ?').get(params.id)

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    const result = db.prepare('DELETE FROM plan_assignments WHERE id = ?').run(params.id)

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    console.error('Error deleting plan assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete plan assignment' },
      { status: 500 }
    )
  }
}

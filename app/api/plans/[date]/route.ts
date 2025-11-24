import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Plan } from '@/types'

// Helper to determine if the parameter is a UUID or date
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// GET /api/plans/[date] - Get a specific plan by date or ID
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const identifier = params.date
    const query = isUUID(identifier)
      ? 'SELECT * FROM plans WHERE id = ?'
      : 'SELECT * FROM plans WHERE date = ?'

    const plan = db.prepare(query).get(identifier) as (Omit<Plan, 'todoIds'> & { todoIds?: string }) | undefined

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Parse todoIds from JSON string (stored as JSON string in database)
    const planWithParsedTodos = {
      ...plan,
      todoIds: plan.todoIds ? JSON.parse(plan.todoIds) : []
    }

    return NextResponse.json({ plan: planWithParsedTodos })
  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}

// PUT /api/plans/[date] - Update a specific plan by date or ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const body = await request.json()
    const now = Date.now()
    const identifier = params.date
    const whereClause = isUUID(identifier) ? 'id = ?' : 'date = ?'

    // Build dynamic UPDATE query based on provided fields
    const updateFields: string[] = []
    const updateValues: any[] = []

    if (body.todoIds !== undefined) {
      updateFields.push('todoIds = ?')
      updateValues.push(JSON.stringify(body.todoIds))
    }

    if (body.journal_entry !== undefined) {
      updateFields.push('journal_entry = ?')
      updateValues.push(body.journal_entry)
    }

    if (body.status !== undefined) {
      updateFields.push('status = ?')
      updateValues.push(body.status)
    }

    if (body.finalized_at !== undefined) {
      updateFields.push('finalized_at = ?')
      updateValues.push(body.finalized_at)
    }

    if (body.completed_at !== undefined) {
      updateFields.push('completed_at = ?')
      updateValues.push(body.completed_at)
    }

    if (body.tasks_completed_count !== undefined) {
      updateFields.push('tasks_completed_count = ?')
      updateValues.push(body.tasks_completed_count)
    }

    if (body.tasks_total_count !== undefined) {
      updateFields.push('tasks_total_count = ?')
      updateValues.push(body.tasks_total_count)
    }

    if (body.completion_percentage !== undefined) {
      updateFields.push('completion_percentage = ?')
      updateValues.push(body.completion_percentage)
    }

    // Always update updated_at
    updateFields.push('updated_at = ?')
    updateValues.push(now)

    if (updateFields.length === 1) {
      // Only updated_at, nothing else to update
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Add identifier to end of values array for WHERE clause
    updateValues.push(identifier)

    const updateQuery = `
      UPDATE plans
      SET ${updateFields.join(', ')}
      WHERE ${whereClause}
    `

    const result = db.prepare(updateQuery).run(...updateValues)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Fetch updated plan
    const fetchQuery = isUUID(identifier)
      ? 'SELECT * FROM plans WHERE id = ?'
      : 'SELECT * FROM plans WHERE date = ?'

    const updatedPlan = db.prepare(fetchQuery).get(identifier) as (Omit<Plan, 'todoIds'> & { todoIds?: string })

    return NextResponse.json({
      plan: {
        ...updatedPlan,
        todoIds: updatedPlan.todoIds ? JSON.parse(updatedPlan.todoIds) : []
      }
    })
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

// DELETE /api/plans/[date] - Delete a specific plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const result = db.prepare('DELETE FROM plans WHERE date = ?').run(params.date)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}

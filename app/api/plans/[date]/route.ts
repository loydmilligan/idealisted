import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Plan } from '@/types'

// GET /api/plans/[date] - Get a specific plan
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const plan = db.prepare('SELECT * FROM plans WHERE date = ?').get(params.date) as (Omit<Plan, 'todoIds'> & { todoIds?: string }) | undefined

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

// PUT /api/plans/[date] - Update a specific plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const body = await request.json()
    const now = Date.now()

    const updatePlan = db.prepare(`
      UPDATE plans 
      SET todoIds = ?, updated_at = ?
      WHERE date = ?
    `)

    const result = updatePlan.run(
      JSON.stringify(body.todoIds || []),
      now,
      params.date
    )

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Fetch updated plan
    const updatedPlan = db.prepare('SELECT * FROM plans WHERE date = ?').get(params.date) as (Omit<Plan, 'todoIds'> & { todoIds?: string })

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

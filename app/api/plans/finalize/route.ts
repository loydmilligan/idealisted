import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/plans/finalize - Finalize a plan (change status from draft to finalized)
export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json()

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      )
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as any

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    if (plan.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft plans can be finalized' },
        { status: 400 }
      )
    }

    const now = Date.now()

    // Update plan status to finalized
    db.prepare(`
      UPDATE plans
      SET status = 'finalized', finalized_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, planId)

    // Fetch updated plan with tasks
    const updatedPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as any

    const tasks = db.prepare(`
      SELECT
        t.*,
        i.id as item_id,
        i.text as item_text,
        i.created_at as item_created_at,
        i.updated_at as item_updated_at
      FROM plan_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      JOIN items i ON t.item_id = i.id
      WHERE pt.plan_id = ?
      ORDER BY pt.added_at ASC
    `).all(planId) as any[]

    return NextResponse.json({
      success: true,
      plan: {
        ...updatedPlan,
        tasks: tasks.map(t => ({
          ...t,
          tags: t.tags ? JSON.parse(t.tags) : []
        }))
      }
    })
  } catch (error) {
    console.error('Finalize plan error:', error)
    return NextResponse.json(
      { error: 'Failed to finalize plan: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

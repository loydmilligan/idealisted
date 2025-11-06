import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// POST /api/plans/complete - Complete a plan and create next day's draft
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

    if (plan.status === 'completed') {
      return NextResponse.json(
        { error: 'Plan is already completed' },
        { status: 400 }
      )
    }

    const now = Date.now()

    // Mark plan as completed
    db.prepare(`
      UPDATE plans
      SET status = 'completed', completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, planId)

    // Calculate next day's date
    const currentDate = new Date(plan.date)
    const nextDate = new Date(currentDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = nextDate.toISOString().split('T')[0] // YYYY-MM-DD

    // Check if next day's plan already exists
    let nextPlan = db.prepare('SELECT * FROM plans WHERE date = ?').get(nextDateStr) as any

    if (!nextPlan) {
      // Create next day's draft plan
      const nextPlanId = uuidv4()

      db.prepare(`
        INSERT INTO plans (id, date, status, created_at, updated_at)
        VALUES (?, ?, 'draft', ?, ?)
      `).run(nextPlanId, nextDateStr, now, now)

      nextPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(nextPlanId) as any
    }

    // Fetch completed plan with tasks
    const completedPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as any

    const completedTasks = db.prepare(`
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

    // Fetch next day's plan (will be empty for now)
    const nextTasks = db.prepare(`
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
    `).all(nextPlan.id) as any[]

    return NextResponse.json({
      success: true,
      completedPlan: {
        ...completedPlan,
        tasks: completedTasks.map(t => ({
          ...t,
          tags: t.tags ? JSON.parse(t.tags) : []
        }))
      },
      nextPlan: {
        ...nextPlan,
        tasks: nextTasks.map(t => ({
          ...t,
          tags: t.tags ? JSON.parse(t.tags) : []
        }))
      }
    })
  } catch (error) {
    console.error('Complete plan error:', error)
    return NextResponse.json(
      { error: 'Failed to complete plan: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

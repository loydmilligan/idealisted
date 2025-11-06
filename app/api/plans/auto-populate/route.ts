import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// POST /api/plans/auto-populate - Auto-populate a plan with tasks
export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json()

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      )
    }

    // Get or create plan
    let plan = db.prepare('SELECT * FROM plans WHERE date = ?').get(date) as any

    if (!plan) {
      const now = Date.now()
      const planId = uuidv4()

      db.prepare(`
        INSERT INTO plans (id, date, status, created_at, updated_at)
        VALUES (?, ?, 'draft', ?, ?)
      `).run(planId, date, now, now)

      plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as any
    }

    const now = Date.now()
    const dateTimestamp = new Date(date).getTime()

    // Find tasks with due_date matching the specified date
    const tasksWithDueDate = db.prepare(`
      SELECT t.*
      FROM tasks t
      WHERE t.due_date = ?
      AND NOT EXISTS (
        SELECT 1 FROM plan_tasks pt WHERE pt.task_id = t.id AND pt.plan_id = ?
      )
    `).all(dateTimestamp, plan.id) as any[]

    // Find tasks from active projects with no due date (suggestions)
    const suggestedTasks = db.prepare(`
      SELECT t.*
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.status = 'pending'
      AND t.due_date IS NULL
      AND p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM plan_tasks pt WHERE pt.task_id = t.id AND pt.plan_id = ?
      )
      LIMIT 5
    `).all(plan.id) as any[]

    // Add tasks to plan
    const insertTask = db.prepare(`
      INSERT INTO plan_tasks (id, plan_id, task_id, added_at)
      VALUES (?, ?, ?, ?)
    `)

    let addedCount = 0

    for (const task of tasksWithDueDate) {
      try {
        insertTask.run(uuidv4(), plan.id, task.id, now)
        addedCount++
      } catch (e) {
        // Skip if already exists
      }
    }

    // Update task counts
    const totalTasks = db.prepare(`
      SELECT COUNT(*) as count FROM plan_tasks WHERE plan_id = ?
    `).get(plan.id) as any

    db.prepare(`
      UPDATE plans
      SET tasks_total_count = ?, updated_at = ?
      WHERE id = ?
    `).run(totalTasks.count, now, plan.id)

    // Fetch updated plan with tasks
    const updatedPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan.id) as any

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
    `).all(plan.id) as any[]

    return NextResponse.json({
      success: true,
      plan: {
        ...updatedPlan,
        tasks: tasks.map(t => ({
          ...t,
          tags: t.tags ? JSON.parse(t.tags) : []
        }))
      },
      addedCount,
      suggestedTasks: suggestedTasks.map(t => ({
        ...t,
        tags: t.tags ? JSON.parse(t.tags) : []
      }))
    })
  } catch (error) {
    console.error('Auto-populate error:', error)
    return NextResponse.json(
      { error: 'Failed to auto-populate plan: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

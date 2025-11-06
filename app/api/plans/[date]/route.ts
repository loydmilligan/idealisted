import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Plan } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// GET /api/plans/[date] - Get a specific plan with related tasks
export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    let plan = db.prepare('SELECT * FROM plans WHERE date = ?').get(params.date) as Plan | undefined

    // Auto-create draft plan if doesn't exist
    if (!plan) {
      const now = Date.now()
      const planId = uuidv4()

      db.prepare(`
        INSERT INTO plans (id, date, status, created_at, updated_at)
        VALUES (?, ?, 'draft', ?, ?)
      `).run(planId, params.date, now, now)

      plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as Plan
    }

    // Fetch related tasks via junction table
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
        ...plan,
        tasks: tasks.map(t => ({
          ...t,
          tags: t.tags ? JSON.parse(t.tags) : []
        }))
      }
    })
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

    const plan = db.prepare('SELECT * FROM plans WHERE date = ?').get(params.date) as Plan | undefined

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Update plan fields
    const updateFields: string[] = []
    const updateValues: any[] = []

    if (body.status !== undefined) {
      updateFields.push('status = ?')
      updateValues.push(body.status)

      if (body.status === 'finalized') {
        updateFields.push('finalized_at = ?')
        updateValues.push(now)
      } else if (body.status === 'completed') {
        updateFields.push('completed_at = ?')
        updateValues.push(now)
      }
    }

    if (body.journal_entry !== undefined) {
      updateFields.push('journal_entry = ?')
      updateValues.push(body.journal_entry)
    }

    if (body.tasks_completed_count !== undefined) {
      updateFields.push('tasks_completed_count = ?')
      updateValues.push(body.tasks_completed_count)
    }

    if (body.tasks_total_count !== undefined) {
      updateFields.push('tasks_total_count = ?')
      updateValues.push(body.tasks_total_count)
    }

    updateFields.push('updated_at = ?')
    updateValues.push(now)

    // Update plan
    if (updateFields.length > 0) {
      db.prepare(`
        UPDATE plans
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `).run(...updateValues, plan.id)
    }

    // Update task associations if provided
    if (body.taskIds !== undefined) {
      // Remove existing associations
      db.prepare('DELETE FROM plan_tasks WHERE plan_id = ?').run(plan.id)

      // Add new associations
      const insertTask = db.prepare(`
        INSERT INTO plan_tasks (id, plan_id, task_id, added_at)
        VALUES (?, ?, ?, ?)
      `)

      for (const taskId of body.taskIds) {
        insertTask.run(uuidv4(), plan.id, taskId, now)
      }
    }

    // Recalculate completion percentage
    const totalTasks = body.tasks_total_count || plan.tasks_total_count
    const completedTasks = body.tasks_completed_count || plan.tasks_completed_count
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    db.prepare(`
      UPDATE plans
      SET completion_percentage = ?
      WHERE id = ?
    `).run(completionPercentage, plan.id)

    // Fetch updated plan with tasks
    const updatedPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(plan.id) as Plan

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

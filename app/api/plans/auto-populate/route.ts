import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// POST /api/plans/auto-populate - Auto-populate plan for a given date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const now = Date.now()

    // Check if plan exists for date, create if not
    let plan = db.prepare('SELECT * FROM plans WHERE date = ?').get(date) as any

    if (!plan) {
      plan = {
        id: uuidv4(),
        date,
        status: 'draft',
        created_at: now,
        updated_at: now
      }
      db.prepare(`
        INSERT INTO plans (id, date, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(plan.id, date, plan.status, plan.created_at, plan.updated_at)
    }

    // Find tasks due on this date
    const targetTimestamp = new Date(date).getTime()
    const nextDayTimestamp = targetTimestamp + 86400000 // +24 hours

    const dueTasks = db.prepare(`
      SELECT i.id FROM items i
      JOIN tasks t ON t.item_id = i.id
      WHERE t.due_date >= ? AND t.due_date < ?
      AND i.archived = 0
    `).all(targetTimestamp, nextDayTimestamp) as any[]

    // Find high-priority backlog tasks (no due_date, priority >= 4)
    const backlogTasks = db.prepare(`
      SELECT i.id FROM items i
      JOIN tasks t ON t.item_id = i.id
      WHERE t.due_date IS NULL AND t.priority >= 4
      AND i.archived = 0
      LIMIT 3
    `).all() as any[]

    // Add to plan_tasks junction table
    const insertPlanTask = db.prepare(`
      INSERT OR IGNORE INTO plan_tasks (id, plan_id, task_id, added_at)
      VALUES (?, ?, ?, ?)
    `)

    const allTasks = [...dueTasks, ...backlogTasks]
    for (const task of allTasks) {
      insertPlanTask.run(uuidv4(), plan.id, task.id, now)
    }

    return NextResponse.json({
      success: true,
      plan,
      taskCount: allTasks.length
    })
  } catch (error) {
    console.error('Error auto-populating plan:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to auto-populate plan'
    }, { status: 500 })
  }
}

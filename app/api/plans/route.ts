import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Plan } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// GET /api/plans - Get all plans
export async function GET() {
  try {
    const plans = db.prepare('SELECT * FROM plans ORDER BY date DESC').all() as Plan[]
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// POST /api/plans - Create a new plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, taskIds = [], listIds = [], noteIds = [], projectIds = [] } = body
    const now = Date.now()

    const newPlan: Plan = {
      id: uuidv4(),
      date,
      status: 'draft',
      journal_entry: body.journal_entry || null,
      tasks_completed_count: 0,
      tasks_total_count: 0,
      completion_percentage: 0.0,
      created_at: now,
      updated_at: now,
      finalized_at: undefined,
      completed_at: undefined
    }

    const transaction = db.transaction(() => {
      // Insert plan
      const insertPlan = db.prepare(`
        INSERT INTO plans (
          id, date, status, journal_entry,
          tasks_completed_count, tasks_total_count, completion_percentage,
          created_at, updated_at, finalized_at, completed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insertPlan.run(
        newPlan.id,
        newPlan.date,
        newPlan.status,
        newPlan.journal_entry,
        newPlan.tasks_completed_count,
        newPlan.tasks_total_count,
        newPlan.completion_percentage,
        newPlan.created_at,
        newPlan.updated_at,
        newPlan.finalized_at || null,
        newPlan.completed_at || null
      )

      // Insert plan-task relationships
      if (taskIds.length > 0) {
        const insertPlanTask = db.prepare(`
          INSERT INTO plan_tasks (id, plan_id, task_id, added_at)
          VALUES (?, ?, ?, ?)
        `)

        for (const taskId of taskIds) {
          insertPlanTask.run(uuidv4(), newPlan.id, taskId, now)
        }
      }

      // Update task counts
      const taskCount = taskIds.length
      const completedTasksQuery = db.prepare(`
        SELECT COUNT(*) as count
        FROM tasks t
        JOIN plan_tasks pt ON t.id = pt.task_id
        WHERE pt.plan_id = ? AND t.status = 'completed'
      `)
      const completedCount = (completedTasksQuery.get(newPlan.id) as { count: number }).count

      const updateStats = db.prepare(`
        UPDATE plans
        SET tasks_total_count = ?,
            tasks_completed_count = ?,
            completion_percentage = ?
        WHERE id = ?
      `)

      const completionPercentage = taskCount > 0 ? (completedCount / taskCount) * 100 : 0

      updateStats.run(taskCount, completedCount, completionPercentage, newPlan.id)

      newPlan.tasks_total_count = taskCount
      newPlan.tasks_completed_count = completedCount
      newPlan.completion_percentage = completionPercentage
    })

    transaction()

    return NextResponse.json({ plan: newPlan }, { status: 201 })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

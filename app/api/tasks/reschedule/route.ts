import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/tasks/reschedule - Reschedule a task
export async function POST(request: NextRequest) {
  try {
    const { taskId, action, targetDate } = await request.json()

    if (!taskId || !action) {
      return NextResponse.json(
        { error: 'taskId and action are required' },
        { status: 400 }
      )
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const now = Date.now()

    switch (action) {
      case 'tomorrow':
        // Set due_date to tomorrow
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        db.prepare(`
          UPDATE tasks
          SET due_date = ?, updated_at = ?
          WHERE id = ?
        `).run(tomorrow.getTime(), now, taskId)

        // Update item updated_at
        db.prepare(`
          UPDATE items
          SET updated_at = ?
          WHERE id = ?
        `).run(now, task.item_id)
        break

      case 'date':
        // Set due_date to specific date
        if (!targetDate) {
          return NextResponse.json(
            { error: 'targetDate is required for action "date"' },
            { status: 400 }
          )
        }

        const targetTimestamp = new Date(targetDate).getTime()

        db.prepare(`
          UPDATE tasks
          SET due_date = ?, updated_at = ?
          WHERE id = ?
        `).run(targetTimestamp, now, taskId)

        db.prepare(`
          UPDATE items
          SET updated_at = ?
          WHERE id = ?
        `).run(now, task.item_id)
        break

      case 'backlog':
        // Remove due_date (back to backlog)
        db.prepare(`
          UPDATE tasks
          SET due_date = NULL, updated_at = ?
          WHERE id = ?
        `).run(now, taskId)

        db.prepare(`
          UPDATE items
          SET updated_at = ?
          WHERE id = ?
        `).run(now, task.item_id)
        break

      case 'delete':
        // Delete task and item
        db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId)
        db.prepare('DELETE FROM items WHERE id = ?').run(task.item_id)

        return NextResponse.json({
          success: true,
          deleted: true
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: tomorrow, date, backlog, or delete' },
          { status: 400 }
        )
    }

    // Fetch updated task
    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(task.item_id) as any

    return NextResponse.json({
      success: true,
      task: {
        ...updatedTask,
        item,
        tags: updatedTask.tags ? JSON.parse(updatedTask.tags) : []
      }
    })
  } catch (error) {
    console.error('Reschedule error:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule task: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

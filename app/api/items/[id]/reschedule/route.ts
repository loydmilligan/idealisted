import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/items/[id]/reschedule - Reschedule a task
// Placeholder for P3-T4 implementation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { option, targetDate } = body

    // TODO: Implement reschedule logic in P3-T4
    // Options:
    // - 'tomorrow': Move task to tomorrow
    // - 'pick': Move task to targetDate
    // - 'backlog': Remove from plan, keep in backlog
    // - 'delete': Archive/delete the task

    // For now, just update due_date for 'tomorrow' and 'pick' options
    if (option === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowTimestamp = tomorrow.getTime()

      db.prepare(`
        UPDATE tasks
        SET due_date = ?
        WHERE id = ?
      `).run(tomorrowTimestamp, params.id)

      return NextResponse.json({ success: true })
    }

    if (option === 'pick' && targetDate) {
      const timestamp = new Date(targetDate).getTime()

      db.prepare(`
        UPDATE tasks
        SET due_date = ?
        WHERE id = ?
      `).run(timestamp, params.id)

      return NextResponse.json({ success: true })
    }

    if (option === 'backlog') {
      // Remove from plan_tasks (not implemented yet)
      return NextResponse.json({ success: true })
    }

    if (option === 'delete') {
      db.prepare('UPDATE items SET archived = 1 WHERE id = ?').run(params.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid reschedule option' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error rescheduling task:', error)
    return NextResponse.json({ error: 'Failed to reschedule task' }, { status: 500 })
  }
}

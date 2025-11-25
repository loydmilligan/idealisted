import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/items/[id]/reschedule - Reschedule a task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { option, targetDate } = body
    const taskId = params.id

    if (option === 'delete') {
      // Delete the item entirely
      db.prepare('DELETE FROM items WHERE id = ?').run(taskId)
      return NextResponse.json({ success: true, item: null })
    }

    let newDueDate: number | null = null

    if (option === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(23, 59, 59, 999)
      newDueDate = tomorrow.getTime()
    } else if (option === 'pick' && targetDate) {
      const targetDateObj = new Date(targetDate)
      targetDateObj.setHours(23, 59, 59, 999)
      newDueDate = targetDateObj.getTime()
    } else if (option === 'backlog') {
      newDueDate = null
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid reschedule option or missing targetDate' },
        { status: 400 }
      )
    }

    // Update task due_date
    db.prepare('UPDATE tasks SET due_date = ? WHERE item_id = ?')
      .run(newDueDate, taskId)

    // Fetch updated item
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(taskId)

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Error rescheduling task:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reschedule task'
    }, { status: 500 })
  }
}

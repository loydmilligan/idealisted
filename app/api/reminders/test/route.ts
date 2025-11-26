import { NextResponse } from 'next/server'
import { ntfyService } from '@/lib/notify'
import { format } from 'date-fns'

/**
 * POST /api/reminders/test
 * Send a test task reminder notification
 * Sprint 2 - Task 4.4
 */
export async function POST() {
  try {
    // Send test reminder using the real reminder format
    const now = new Date()
    const timeStr = format(now, 'h:mm a')

    const result = await ntfyService.notifyTaskDue(
      'Test task reminder - this is a sample task',
      `in 1 hour (${timeStr})`
    )

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send' },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

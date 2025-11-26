import { NextResponse } from 'next/server'
import { generateDailySummary, formatSummaryMessage } from '@/lib/summary'
import { ntfyService } from '@/lib/notify'

/**
 * POST /api/summary/test
 * Send a test daily summary notification
 * Sprint 2 - Task 4.3
 */
export async function POST() {
  try {
    // Generate summary for today
    const summary = generateDailySummary()

    // Format the summary message (with AI if enabled)
    const message = await formatSummaryMessage(summary)

    // Send via ntfy
    const result = await ntfyService.sendNotification(
      'AI Daily Summary (Test)',
      message,
      [],
      'default'
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

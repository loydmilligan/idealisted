import { NextRequest, NextResponse } from 'next/server'
import { ntfyService } from '@/lib/notify'

export async function POST(request: NextRequest) {
  try {
    const { date, completedCount, totalCount } = await request.json()

    if (!date || completedCount === undefined || totalCount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await ntfyService.notifyEveningReviewComplete(date, completedCount, totalCount)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Failed to send evening review notification:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

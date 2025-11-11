import { NextRequest, NextResponse } from 'next/server'
import { reviewService } from '@/lib/review'
import { ntfyService } from '@/lib/notify'

/**
 * GET /api/review?date=YYYY-MM-DD&includeAI=true
 * Get review data for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const includeAI = searchParams.get('includeAI') !== 'false'

    const date = dateParam ? new Date(dateParam) : new Date()

    const reviewData = await reviewService.generateReview(date, includeAI)

    return NextResponse.json({
      success: true,
      review: reviewData
    })
  } catch (error) {
    console.error('Failed to generate review:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/review/trigger
 * Manually trigger a daily review notification
 * Set test: true to prevent saving snapshot to disk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dateParam = body.date
    const includeAI = body.includeAI !== false
    const isTest = body.test === true  // Test mode doesn't persist snapshots

    const date = dateParam ? new Date(dateParam) : new Date()

    // Generate review data (don't persist if test mode)
    const reviewData = await reviewService.generateReview(date, includeAI, !isTest)

    // Get notification message
    const { title, message } = reviewService.getNotificationMessage(reviewData)

    // Send notification
    const notificationResult = await ntfyService.sendNotification(
      title,
      message,
      [
        {
          action: 'view',
          label: 'View Review',
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review/${reviewData.date}`
        }
      ],
      'default'
    )

    // Mark review as sent if notification succeeded
    if (notificationResult.success) {
      await reviewService.markReviewAsSent()

      return NextResponse.json({
        success: true,
        review: reviewData,
        notification: notificationResult,
        message: 'Review notification sent successfully'
      })
    } else {
      // Notification failed - return error
      return NextResponse.json({
        success: false,
        review: reviewData,
        notification: notificationResult,
        error: notificationResult.error || 'Failed to send notification'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to trigger review:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

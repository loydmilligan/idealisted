import { NextRequest, NextResponse } from 'next/server'
import { snapshotService } from '@/lib/snapshot'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const date = body.date ? new Date(body.date) : new Date()

    const snapshot = await snapshotService.generateDailySnapshot(date)

    return NextResponse.json({
      success: true,
      snapshot,
      message: 'Snapshot generated successfully'
    })
  } catch (error) {
    console.error('Failed to generate snapshot:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'daily' // daily, weekly, monthly
    const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()

    let data

    if (type === 'daily') {
      data = await snapshotService.getDailySnapshot(date)
    } else if (type === 'weekly') {
      data = await snapshotService.getWeeklySummary(date)
    } else if (type === 'monthly') {
      data = await snapshotService.getMonthlySummary(date)
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be daily, weekly, or monthly' },
        { status: 400 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: `No ${type} snapshot found for ${date.toISOString()}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      type,
      data
    })
  } catch (error) {
    console.error('Failed to get snapshot:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

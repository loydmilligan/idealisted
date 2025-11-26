import { NextResponse } from 'next/server'
import { createObsidianSyncService } from '@/lib/obsidian-sync'

/**
 * POST /api/obsidian/sync
 * Manually trigger Obsidian vault sync
 */
export async function POST() {
  try {
    const syncService = await createObsidianSyncService()

    if (!syncService) {
      return NextResponse.json(
        { success: false, error: 'Obsidian sync not configured' },
        { status: 400 }
      )
    }

    const result = await syncService.sync()

    if (result.success) {
      return NextResponse.json({
        success: true,
        itemsSynced: result.itemsSynced,
        errors: result.errors,
        timestamp: result.timestamp
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync failed',
          errors: result.errors
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in Obsidian sync:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { ObsidianSyncService } from '@/lib/obsidian-sync'
import { db } from '@/lib/db'

/**
 * GET /api/obsidian/status
 * Get Obsidian sync statistics
 */
export async function GET() {
  try {
    // Get sync stats
    const stats = ObsidianSyncService.getSyncStats()

    // Get config
    const config = db.prepare('SELECT value FROM settings WHERE key = ?').get('obsidian_config') as any
    const obsidianConfig = config ? JSON.parse(config.value) : null

    return NextResponse.json({
      success: true,
      enabled: obsidianConfig?.enabled || false,
      vaultPath: obsidianConfig?.vaultPath || '',
      syncFrequency: obsidianConfig?.syncFrequency || 'manual',
      totalSynced: stats.totalSynced,
      lastSync: stats.lastSync,
      lastSyncDate: stats.lastSync ? new Date(stats.lastSync).toISOString() : null
    })
  } catch (error) {
    console.error('Error fetching Obsidian sync status:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

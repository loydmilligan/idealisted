import { NextRequest, NextResponse } from 'next/server'
import { ObsidianSyncService } from '@/lib/obsidian-sync'

/**
 * POST /api/obsidian/test
 * Test if vault path is accessible and writable
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vaultPath } = body

    if (!vaultPath) {
      return NextResponse.json(
        { success: false, error: 'vaultPath is required' },
        { status: 400 }
      )
    }

    const result = ObsidianSyncService.testVaultPath(vaultPath)

    if (result.valid) {
      return NextResponse.json({
        success: true,
        valid: true,
        message: 'Vault path is accessible and writable'
      })
    } else {
      return NextResponse.json({
        success: false,
        valid: false,
        error: result.error || 'Invalid vault path'
      })
    }
  } catch (error) {
    console.error('Error testing vault path:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

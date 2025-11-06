import { NextRequest, NextResponse } from 'next/server'
import { ntfyService } from '@/lib/notify'
import { NtfyConfig } from '@/types'

// POST /api/notify - Send notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, message, actions, priority } = body

    if (!title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields: title and message' 
      }, { status: 400 })
    }

    const result = await ntfyService.sendNotification(title, message, actions, priority)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Notification failed' 
    }, { status: 500 })
  }
}

// GET /api/notify - Get ntfy configuration status
export async function GET() {
  try {
    const config = ntfyService.getConfigSummary()
    const isConfigured = ntfyService.isConfigured()

    return NextResponse.json({
      configured: isConfigured,
      config
    })
  } catch (error) {
    console.error('Error getting ntfy config:', error)
    return NextResponse.json({ error: 'Failed to get ntfy config' }, { status: 500 })
  }
}

// PUT /api/notify/config - Update ntfy configuration
export async function PUT(request: NextRequest) {
  try {
    const config: NtfyConfig = await request.json()
    
    const success = await ntfyService.updateConfig(config)
    
    if (success) {
      return NextResponse.json({ success: true, config })
    } else {
      return NextResponse.json({ error: 'Failed to update ntfy config' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error updating ntfy config:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Update failed' 
    }, { status: 500 })
  }
}

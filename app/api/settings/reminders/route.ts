import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ReminderConfig } from '@/types'

const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  defaultTiming: '1_day_before',
  priorityFilter: [3, 4, 5], // Medium, High, Urgent by default
}

// GET /api/settings/reminders - Get reminder configuration
export async function GET() {
  try {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('reminder_config') as any

    if (!result) {
      return NextResponse.json({
        success: true,
        config: DEFAULT_REMINDER_CONFIG
      })
    }

    const config = JSON.parse(result.value) as ReminderConfig

    return NextResponse.json({
      success: true,
      config
    })
  } catch (error) {
    console.error('Error fetching reminder config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reminder configuration' },
      { status: 500 }
    )
  }
}

// PUT /api/settings/reminders - Update reminder configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const config = body.config as ReminderConfig

    // Validate config
    if (typeof config.enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid enabled flag' },
        { status: 400 }
      )
    }

    if (config.quietHours.enabled) {
      // Validate time format (HH:mm)
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(config.quietHours.start) || !timeRegex.test(config.quietHours.end)) {
        return NextResponse.json(
          { success: false, error: 'Invalid quiet hours time format. Use HH:mm (e.g., 22:00)' },
          { status: 400 }
        )
      }
    }

    // Validate default timing
    const validTimings = ['morning_of', '1_hour_before', '1_day_before', 'custom']
    if (!validTimings.includes(config.defaultTiming)) {
      return NextResponse.json(
        { success: false, error: 'Invalid default timing value' },
        { status: 400 }
      )
    }

    // Validate priority filter
    if (!Array.isArray(config.priorityFilter) ||
        !config.priorityFilter.every(p => p >= 1 && p <= 5)) {
      return NextResponse.json(
        { success: false, error: 'Priority filter must be an array of values 1-5' },
        { status: 400 }
      )
    }

    // Save to database
    const now = Date.now()
    db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run('reminder_config', JSON.stringify(config), now)

    return NextResponse.json({
      success: true,
      config
    })
  } catch (error) {
    console.error('Error updating reminder config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update reminder configuration' },
      { status: 500 }
    )
  }
}

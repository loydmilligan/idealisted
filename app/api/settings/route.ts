import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AIConfig, NtfyConfig } from '@/types'

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all() as any[]

    const result: Record<string, any> = {}

    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value)
      } catch {
        result[setting.key] = setting.value
      }
    })

    // Initialize AI config with default values if not present
    if (!result.ai_config) {
      const defaultAIConfig: AIConfig = {
        enabled: false, // DEFAULT TO OFF - user's top priority
        openrouterApiKey: '',
        freeModel: 'meta-llama/llama-3.1-8b-instruct:free',
        paidModel: 'anthropic/claude-3.5-sonnet',
        usePaidModel: false,
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 2000
      }

      // Save default config to database
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('ai_config', JSON.stringify(defaultAIConfig), Date.now())

      result.ai_config = defaultAIConfig
    } else {
      // Migration: Add 'enabled: false' to existing configs if missing
      const aiConfig = result.ai_config as AIConfig
      if (aiConfig.enabled === undefined) {
        aiConfig.enabled = false // Default to OFF for backward compatibility

        // Save updated config back to database
        db.prepare(`
          INSERT OR REPLACE INTO settings (key, value, updated_at)
          VALUES (?, ?, ?)
        `).run('ai_config', JSON.stringify(aiConfig), Date.now())
      }
    }

    return NextResponse.json({ settings: result })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const now = Date.now()

    const updateSetting = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `)

    // Update each setting
    for (const [key, value] of Object.entries(body)) {
      updateSetting.run(key, JSON.stringify(value), now)
    }

    return NextResponse.json({ success: true, settings: body })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

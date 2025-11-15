import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AIFeatureSetting } from '@/types'

// GET /api/ai-features - Fetch all AI feature settings
export async function GET() {
  try {
    const features = db.prepare(`
      SELECT feature_name, enabled, description
      FROM ai_feature_settings
      ORDER BY feature_name ASC
    `).all() as AIFeatureSetting[]

    return NextResponse.json({
      success: true,
      features
    })
  } catch (error) {
    console.error('Error fetching AI feature settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI feature settings' },
      { status: 500 }
    )
  }
}

// PUT /api/ai-features - Update AI feature enabled status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both single feature and bulk update
    const updates = Array.isArray(body.features)
      ? body.features
      : [{ feature_name: body.feature_name, enabled: body.enabled }]

    // Validation
    for (const update of updates) {
      if (!update.feature_name) {
        return NextResponse.json(
          { success: false, error: 'feature_name is required' },
          { status: 400 }
        )
      }

      if (update.enabled !== 0 && update.enabled !== 1) {
        return NextResponse.json(
          { success: false, error: 'enabled must be 0 or 1' },
          { status: 400 }
        )
      }
    }

    // Update features
    const updateStmt = db.prepare(`
      UPDATE ai_feature_settings
      SET enabled = ?
      WHERE feature_name = ?
    `)

    const updated: AIFeatureSetting[] = []

    for (const update of updates) {
      const result = updateStmt.run(update.enabled, update.feature_name)

      if (result.changes === 0) {
        return NextResponse.json(
          { success: false, error: `Feature not found: ${update.feature_name}` },
          { status: 404 }
        )
      }

      // Fetch updated feature
      const feature = db.prepare(`
        SELECT feature_name, enabled, description
        FROM ai_feature_settings
        WHERE feature_name = ?
      `).get(update.feature_name) as AIFeatureSetting

      updated.push(feature)
    }

    return NextResponse.json({
      success: true,
      updated
    })
  } catch (error) {
    console.error('Error updating AI feature settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update AI feature settings' },
      { status: 500 }
    )
  }
}

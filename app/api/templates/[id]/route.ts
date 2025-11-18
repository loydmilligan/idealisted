import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/templates/:id
 * Fetch a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id

    const row = db
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(templateId)

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: row
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch template'
      },
      { status: 500 }
    )
  }
}

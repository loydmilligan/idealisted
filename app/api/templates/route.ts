import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const templates = db.prepare('SELECT id, name, entity_type, subtype, markdown_template, field_config FROM templates ORDER BY name').all()

    return NextResponse.json({
      success: true,
      data: templates
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

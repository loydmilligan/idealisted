import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Plan } from '@/types'

// Helper to determine if the parameter is a UUID or date
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// PUT /api/plans/[date]/finalize - Finalize a plan (mark as ready for execution)
export async function PUT(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const now = Date.now()
    const identifier = params.date
    const whereClause = isUUID(identifier) ? 'id = ?' : 'date = ?'

    const updateQuery = db.prepare(`
      UPDATE plans
      SET status = 'finalized',
          finalized_at = ?,
          updated_at = ?
      WHERE ${whereClause}
    `)

    const result = updateQuery.run(now, now, identifier)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Fetch updated plan
    const fetchQuery = isUUID(identifier)
      ? 'SELECT * FROM plans WHERE id = ?'
      : 'SELECT * FROM plans WHERE date = ?'

    const updatedPlan = db.prepare(fetchQuery).get(identifier) as Plan

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error('Error finalizing plan:', error)
    return NextResponse.json({ error: 'Failed to finalize plan' }, { status: 500 })
  }
}

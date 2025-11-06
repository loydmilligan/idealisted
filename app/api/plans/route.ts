import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Plan } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// GET /api/plans - Get all plans
export async function GET() {
  try {
    const plans = db.prepare('SELECT * FROM plans ORDER BY date DESC').all() as Plan[]
    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// POST /api/plans - Create a new plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const now = Date.now()

    const newPlan: Plan = {
      id: uuidv4(),
      date: body.date,
      todoIds: body.todoIds || [],
      created_at: now,
      updated_at: now
    }

    const insertPlan = db.prepare(`
      INSERT INTO plans (id, date, todoIds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)

    insertPlan.run(
      newPlan.id,
      newPlan.date,
      JSON.stringify(newPlan.todoIds),
      newPlan.created_at,
      newPlan.updated_at
    )

    return NextResponse.json({ plan: newPlan }, { status: 201 })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

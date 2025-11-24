import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PlanAssignment } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface PlanAssignmentWithItem extends PlanAssignment {
  item?: {
    id: string
    type: string
    text: string
    created_at: number
    updated_at: number
    archived: boolean
    tags?: string[]
  }
  task?: {
    id: string
    status: string
    priority: number
    due_date?: number
    estimated_time?: number
    project_id?: string
  }
  note?: {
    id: string
    subtype: string
    content?: string
    project_id?: string
  }
  project?: {
    id: string
    status: string
    priority?: number
    deadline?: number
    progress: number
  }
}

// GET /api/plan-assignments - Get assignments by date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Query assignments with joined item data, ordered by position
    const query = `
      SELECT
        pa.id,
        pa.item_id,
        pa.assigned_date,
        pa.position,
        pa.created_at,
        pa.updated_at,
        i.id as item_id_check,
        i.type as item_type,
        i.text as item_text,
        i.created_at as item_created_at,
        i.updated_at as item_updated_at,
        i.archived as item_archived,
        i.tags as item_tags,
        t.id as task_id,
        t.status as task_status,
        t.priority as task_priority,
        t.due_date as task_due_date,
        t.estimated_time as task_estimated_time,
        t.project_id as task_project_id,
        n.id as note_id,
        n.subtype as note_subtype,
        n.content as note_content,
        n.project_id as note_project_id,
        p.id as project_id,
        p.status as project_status,
        p.priority as project_priority,
        p.deadline as project_deadline,
        p.progress as project_progress
      FROM plan_assignments pa
      INNER JOIN items i ON pa.item_id = i.id
      LEFT JOIN tasks t ON i.id = t.item_id
      LEFT JOIN notes n ON i.id = n.item_id
      LEFT JOIN projects p ON i.id = p.item_id
      WHERE pa.assigned_date = ?
      ORDER BY pa.position ASC
    `

    const rows = db.prepare(query).all(date) as any[]

    // Transform rows into PlanAssignmentWithItem objects
    const assignments: PlanAssignmentWithItem[] = rows.map(row => {
      const assignment: PlanAssignmentWithItem = {
        id: row.id,
        item_id: row.item_id,
        assigned_date: row.assigned_date,
        position: row.position,
        created_at: row.created_at,
        updated_at: row.updated_at,
        item: {
          id: row.item_id,
          type: row.item_type,
          text: row.item_text,
          created_at: row.item_created_at,
          updated_at: row.item_updated_at,
          archived: row.item_archived === 1,
          tags: row.item_tags ? JSON.parse(row.item_tags) : []
        }
      }

      // Add task data if present
      if (row.task_id) {
        assignment.task = {
          id: row.task_id,
          status: row.task_status,
          priority: row.task_priority,
          due_date: row.task_due_date,
          estimated_time: row.task_estimated_time,
          project_id: row.task_project_id
        }
      }

      // Add note data if present
      if (row.note_id) {
        assignment.note = {
          id: row.note_id,
          subtype: row.note_subtype,
          content: row.note_content,
          project_id: row.note_project_id
        }
      }

      // Add project data if present
      if (row.project_id) {
        assignment.project = {
          id: row.project_id,
          status: row.project_status,
          priority: row.project_priority,
          deadline: row.project_deadline,
          progress: row.project_progress
        }
      }

      return assignment
    })

    return NextResponse.json({ success: true, data: assignments })
  } catch (error) {
    console.error('Error fetching plan assignments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan assignments' },
      { status: 500 }
    )
  }
}

// POST /api/plan-assignments - Create a new assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { item_id, assigned_date, position } = body

    // Validate required fields
    if (!item_id) {
      return NextResponse.json(
        { success: false, error: 'item_id is required' },
        { status: 400 }
      )
    }

    if (!assigned_date) {
      return NextResponse.json(
        { success: false, error: 'assigned_date is required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(assigned_date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Check if item exists
    const item = db.prepare('SELECT id FROM items WHERE id = ?').get(item_id)
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 400 }
      )
    }

    // Check for duplicate assignment (same item_id + assigned_date)
    const existing = db.prepare(
      'SELECT id FROM plan_assignments WHERE item_id = ? AND assigned_date = ?'
    ).get(item_id, assigned_date)

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Assignment already exists for this item and date' },
        { status: 409 }
      )
    }

    // Auto-calculate position if not provided
    let assignedPosition = position
    if (assignedPosition === undefined || assignedPosition === null) {
      const maxPositionRow = db.prepare(
        'SELECT MAX(position) as max_position FROM plan_assignments WHERE assigned_date = ?'
      ).get(assigned_date) as { max_position: number | null }

      assignedPosition = (maxPositionRow?.max_position ?? -1) + 1
    }

    const id = uuidv4()
    const now = Date.now()

    const insertStmt = db.prepare(`
      INSERT INTO plan_assignments (id, item_id, assigned_date, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    insertStmt.run(id, item_id, assigned_date, assignedPosition, now, now)

    // Fetch the created assignment
    const created = db.prepare('SELECT * FROM plan_assignments WHERE id = ?').get(id) as PlanAssignment

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating plan assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create plan assignment' },
      { status: 500 }
    )
  }
}

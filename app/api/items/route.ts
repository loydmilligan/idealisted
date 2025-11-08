import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Item, CreateItemRequest, ItemWithRelations } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// GET /api/items - Get all items with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const archived = searchParams.get('archived')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = `
      SELECT i.*, 
             t.id as todo_id, t.done as todo_done, t.due_date, t.priority, t.recurring_rule, t.completed_at,
             task.id as task_id, task.status as task_status, task.priority as task_priority, 
             task.tags as task_tags, task.estimated_time, task.project_id, task.due_date as task_due_date,
             n.id as note_id, n.subtype, n.content, n.url, n.media_type,
             l.id as list_id, l.name as list_name, l.tags as list_tags, l.description as list_description,
             p.id as project_id, p.status as project_status, p.tags as project_tags, 
             p.deadline, p.description as project_description, p.progress, p.start_date, p.end_date
      FROM items i
      LEFT JOIN todos t ON i.id = t.item_id
      LEFT JOIN tasks task ON i.id = task.item_id
      LEFT JOIN notes n ON i.id = n.item_id  
      LEFT JOIN lists l ON i.id = l.item_id
      LEFT JOIN projects p ON i.id = p.item_id
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (type) {
      query += ' AND i.type = ?'
      params.push(type)
    }
    
    if (archived !== null) {
      query += ' AND i.archived = ?'
      params.push(archived === 'true' ? 1 : 0)
    }
    
    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const items = db.prepare(query).all(...params) as any[]
    
    // Transform the flat results into nested objects
    const transformedItems: ItemWithRelations[] = items.map(row => {
      const item: ItemWithRelations = {
        id: row.id,
        type: row.type,
        text: row.text,
        created_at: row.created_at,
        updated_at: row.updated_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        tags: row.tags ? JSON.parse(row.tags) : [],
        archived: row.archived === 1,
        parsed: row.parsed === 1,
        entity_type: row.entity_type,
        ai_suggestion: row.ai_suggestion ? JSON.parse(row.ai_suggestion) : undefined
      }

      if (row.todo_id) {
        item.todo = {
          id: row.todo_id,
          item_id: row.id,
          done: row.todo_done === 1,
          due_date: row.due_date,
          priority: row.priority,
          recurring_rule: row.recurring_rule ? JSON.parse(row.recurring_rule) : undefined,
          completed_at: row.completed_at
        }
      }

      if (row.task_id) {
        item.task = {
          id: row.task_id,
          item_id: row.id,
          status: row.task_status || 'pending',
          priority: row.task_priority || 1,
          tags: row.task_tags ? JSON.parse(row.task_tags) : [],
          estimated_time: row.estimated_time,
          project_id: row.project_id,
          due_date: row.task_due_date
        }
      }

      if (row.note_id) {
        item.note = {
          id: row.note_id,
          item_id: row.id,
          subtype: row.subtype,
          content: row.content,
          url: row.url,
          media_type: row.media_type
        }
      }

      if (row.list_id) {
        // Get list items
        const listItems = db.prepare(`
          SELECT * FROM list_items WHERE list_id = ? ORDER BY position
        `).all(row.list_id) as {
          id: string;
          list_id: string;
          text: string;
          done: number;
          position: number;
          created_at: number;
        }[]

        item.list = {
          id: row.list_id,
          item_id: row.id,
          name: row.list_name,
          tags: row.list_tags ? JSON.parse(row.list_tags) : [],
          description: row.list_description,
          items: listItems.map(li => ({
            id: li.id,
            list_id: li.list_id,
            text: li.text,
            done: li.done === 1,
            position: li.position,
            created_at: li.created_at
          }))
        }
      }

      if (row.project_id) {
        item.project = {
          id: row.project_id,
          item_id: row.id,
          status: row.project_status || 'planning',
          tags: row.project_tags ? JSON.parse(row.project_tags) : [],
          deadline: row.deadline,
          description: row.project_description,
          progress: row.progress,
          start_date: row.start_date,
          end_date: row.end_date
        }
      }

      return item
    })

    return NextResponse.json({ items: transformedItems })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST /api/items - Create a new item
export async function POST(request: NextRequest) {
  try {
    const body: CreateItemRequest = await request.json()
    const id = uuidv4()
    const now = Date.now()

    // Start transaction
    const insertItem = db.prepare(`
      INSERT INTO items (id, type, text, created_at, updated_at, metadata, tags, archived, parsed, entity_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `)

    const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null

    insertItem.run(
      id,
      body.type,
      body.text,
      now,
      now,
      metadataJson,
      tagsJson,
      (body as any).parsed ? 1 : 0,
      (body as any).entity_type || null
    )

    // Insert type-specific data
    if (body.type === 'todo' && body.todo) {
      // Handle legacy todo type - convert to task
      const insertTask = db.prepare(`
        INSERT INTO tasks (id, item_id, status, priority, tags, estimated_time, project_id, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      insertTask.run(
        uuidv4(),
        id,
        'pending', // Convert todo to task with pending status
        body.todo.priority || 1,
        null, // todos don't have tags
        null, // todos don't have estimated_time
        null, // todos don't have project_id
        body.todo.due_date || null
      )
    }

    if (body.type === 'task' && body.task) {
      const insertTask = db.prepare(`
        INSERT INTO tasks (id, item_id, status, priority, tags, estimated_time, project_id, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      insertTask.run(
        uuidv4(),
        id,
        body.task.status || 'pending',
        body.task.priority || 1,
        body.task.tags ? JSON.stringify(body.task.tags) : null,
        body.task.estimated_time || null,
        body.task.project_id || null,
        body.task.due_date || null
      )
    }

    if (body.type === 'note' && body.note) {
      const insertNote = db.prepare(`
        INSERT INTO notes (id, item_id, subtype, content, url, media_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      insertNote.run(
        uuidv4(),
        id,
        body.note.subtype || 'general',
        body.note.content || null,
        body.note.url || null,
        body.note.media_type || null
      )
    }

    if (body.type === 'list' && body.list) {
      const listId = uuidv4()
      const insertList = db.prepare(`
        INSERT INTO lists (id, item_id, name, tags, description)
        VALUES (?, ?, ?, ?, ?)
      `)
      insertList.run(
        listId, 
        id, 
        body.list.name,
        body.list.tags ? JSON.stringify(body.list.tags) : null,
        body.list.description || null
      )

      // Insert list items if provided
      if (body.list.items) {
        const insertListItem = db.prepare(`
          INSERT INTO list_items (id, list_id, text, done, position, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        
        body.list.items.forEach((item, index) => {
          insertListItem.run(
            uuidv4(),
            listId,
            item.text,
            item.done ? 1 : 0,
            index,
            now
          )
        })
      }
    }

    if (body.type === 'project' && body.project) {
      const insertProject = db.prepare(`
        INSERT INTO projects (id, item_id, status, tags, deadline, description, progress, start_date, end_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      insertProject.run(
        uuidv4(),
        id,
        body.project.status || 'planning',
        body.project.tags ? JSON.stringify(body.project.tags) : null,
        body.project.deadline || null,
        body.project.description || null,
        body.project.progress || 0,
        body.project.start_date || null,
        body.project.end_date || null
      )
    }

    // Fetch the created item
    const createdItem = db.prepare(`
      SELECT * FROM items WHERE id = ?
    `).get(id) as Item

    return NextResponse.json({ item: createdItem }, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}

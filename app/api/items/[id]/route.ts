import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Item, UpdateItemRequest, ItemWithRelations } from '@/types'

// GET /api/items/[id] - Get a specific item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const query = `
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
      WHERE i.id = ?
    `

    const row = db.prepare(query).get(params.id) as any
    
    if (!row) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Transform the flat result into nested object
    const item: ItemWithRelations = {
      id: row.id,
      type: row.type,
      text: row.text,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      archived: row.archived === 1
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

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
  }
}

// PUT /api/items/[id] - Update a specific item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateItemRequest = await request.json()
    const now = Date.now()

    // Start transaction
    const updateItem = db.prepare(`
      UPDATE items 
      SET text = ?, type = ?, updated_at = ?, metadata = ?, tags = ?, archived = ?
      WHERE id = ?
    `)

    const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null

    const result = updateItem.run(
      body.text,
      body.type,
      now,
      metadataJson,
      tagsJson,
      body.archived !== undefined ? (body.archived ? 1 : 0) : undefined,
      params.id
    )

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Update type-specific data if provided
    if (body.todo) {
      const existingTodo = db.prepare('SELECT id FROM todos WHERE item_id = ?').get(params.id)
      
      if (existingTodo) {
        const updateTodo = db.prepare(`
          UPDATE todos 
          SET done = ?, due_date = ?, priority = ?, recurring_rule = ?, completed_at = ?
          WHERE item_id = ?
        `)
        updateTodo.run(
          body.todo.done ? 1 : 0,
          body.todo.due_date || null,
          body.todo.priority || 0,
          body.todo.recurring_rule ? JSON.stringify(body.todo.recurring_rule) : null,
          body.todo.completed_at || null,
          params.id
        )
      } else {
        const insertTodo = db.prepare(`
          INSERT INTO todos (id, item_id, done, due_date, priority, recurring_rule, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        insertTodo.run(
          `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.todo.done ? 1 : 0,
          body.todo.due_date || null,
          body.todo.priority || 0,
          body.todo.recurring_rule ? JSON.stringify(body.todo.recurring_rule) : null,
          body.todo.completed_at || null
        )
      }
    }

    if (body.task) {
      const existingTask = db.prepare('SELECT id FROM tasks WHERE item_id = ?').get(params.id)
      
      if (existingTask) {
        const updateTask = db.prepare(`
          UPDATE tasks 
          SET status = ?, priority = ?, tags = ?, estimated_time = ?, project_id = ?, due_date = ?
          WHERE item_id = ?
        `)
        updateTask.run(
          body.task.status || 'pending',
          body.task.priority || 1,
          body.task.tags ? JSON.stringify(body.task.tags) : null,
          body.task.estimated_time || null,
          body.task.project_id || null,
          body.task.due_date || null,
          params.id
        )
      } else {
        const insertTask = db.prepare(`
          INSERT INTO tasks (id, item_id, status, priority, tags, estimated_time, project_id, due_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertTask.run(
          `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.task.status || 'pending',
          body.task.priority || 1,
          body.task.tags ? JSON.stringify(body.task.tags) : null,
          body.task.estimated_time || null,
          body.task.project_id || null,
          body.task.due_date || null
        )
      }
    }

    if (body.list) {
      const existingList = db.prepare('SELECT id FROM lists WHERE item_id = ?').get(params.id)
      
      if (existingList) {
        const updateList = db.prepare(`
          UPDATE lists 
          SET name = ?, tags = ?, description = ?
          WHERE item_id = ?
        `)
        updateList.run(
          body.list.name || '',
          body.list.tags ? JSON.stringify(body.list.tags) : null,
          body.list.description || null,
          params.id
        )
      } else {
        const insertList = db.prepare(`
          INSERT INTO lists (id, item_id, name, tags, description)
          VALUES (?, ?, ?, ?, ?)
        `)
        insertList.run(
          `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.list.name || '',
          body.list.tags ? JSON.stringify(body.list.tags) : null,
          body.list.description || null
        )
      }
    }

    if (body.project) {
      const existingProject = db.prepare('SELECT id FROM projects WHERE item_id = ?').get(params.id)
      
      if (existingProject) {
        const updateProject = db.prepare(`
          UPDATE projects 
          SET status = ?, tags = ?, deadline = ?, description = ?, progress = ?, start_date = ?, end_date = ?
          WHERE item_id = ?
        `)
        updateProject.run(
          body.project.status || 'planning',
          body.project.tags ? JSON.stringify(body.project.tags) : null,
          body.project.deadline || null,
          body.project.description || null,
          body.project.progress || 0,
          body.project.start_date || null,
          body.project.end_date || null,
          params.id
        )
      } else {
        const insertProject = db.prepare(`
          INSERT INTO projects (id, item_id, status, tags, deadline, description, progress, start_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertProject.run(
          `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.project.status || 'planning',
          body.project.tags ? JSON.stringify(body.project.tags) : null,
          body.project.deadline || null,
          body.project.description || null,
          body.project.progress || 0,
          body.project.start_date || null,
          body.project.end_date || null
        )
      }
    }

    if (body.note) {
      const existingNote = db.prepare('SELECT id FROM notes WHERE item_id = ?').get(params.id)
      
      if (existingNote) {
        const updateNote = db.prepare(`
          UPDATE notes 
          SET subtype = ?, content = ?, url = ?, media_type = ?
          WHERE item_id = ?
        `)
        updateNote.run(
          body.note.subtype || 'general',
          body.note.content || null,
          body.note.url || null,
          body.note.media_type || null,
          params.id
        )
      } else {
        const insertNote = db.prepare(`
          INSERT INTO notes (id, item_id, subtype, content, url, media_type)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        insertNote.run(
          `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.note.subtype || 'general',
          body.note.content || null,
          body.note.url || null,
          body.note.media_type || null
        )
      }
    }

    // Fetch updated item
    const updatedItem = db.prepare(`
      SELECT * FROM items WHERE id = ?
    `).get(params.id) as Item

    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE /api/items/[id] - Delete a specific item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = db.prepare('DELETE FROM items WHERE id = ?').run(params.id)

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}

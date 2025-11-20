import { NextRequest, NextResponse } from 'next/server'
import { db, updateTagUsage } from '@/lib/db'
import { Item, UpdateItemRequest, ItemWithRelations } from '@/types'

const mapPriorityNumberToLabel = (priority?: number | null): 'low' | 'medium' | 'high' | undefined => {
  if (priority === 1) return 'low'
  if (priority === 3) return 'high'
  if (priority === 2) return 'medium'
  return undefined
}

const mapPriorityLabelToNumber = (priority?: string | number | null): number => {
  if (priority === 'high' || priority === 3) return 3
  if (priority === 'low' || priority === 1) return 1
  return 2
}

const normalizeProjectType = (projectType?: string | null): string | null => {
  if (!projectType) return null
  const normalized = projectType.toLowerCase()
  if (normalized === 'smart home') return 'smart-home'
  return normalized
}

const normalizeListType = (listType?: string | null): string => {
  const normalized = (listType || '').toLowerCase()
  if (['bulleted', 'numbered', 'tasklist', 'shopping'].includes(normalized)) {
    return normalized
  }
  return 'bulleted'
}

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
             task.reminder_datetime, task.last_notified_at,
             n.id as note_id, n.subtype, n.content, n.url, n.media_type, n.project_id as note_project_id,
             l.id as list_id, l.name as list_name, l.list_type as list_type, l.tags as list_tags, l.description as list_description,
             p.id as project_id, p.status as project_status, p.project_type as project_type, p.priority as project_priority, p.tags as project_tags,
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
      archived: row.archived === 1,
      markdown_content: row.markdown_content || undefined,
      template_id: row.template_id || undefined
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
        due_date: row.task_due_date,
        reminder_datetime: row.reminder_datetime,
        last_notified_at: row.last_notified_at
      }
    }

      if (row.note_id) {
        item.note = {
          id: row.note_id,
          item_id: row.id,
          subtype: row.subtype,
          content: row.content,
          url: row.url,
          media_type: row.media_type,
          project_id: row.note_project_id
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
        list_type: row.list_type || 'bulleted',
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
        project_type: row.project_type || 'personal',
        priority: mapPriorityNumberToLabel(row.project_priority),
        tags: row.project_tags ? JSON.parse(row.project_tags) : [],
        deadline: row.deadline,
        description: row.project_description,
        progress: row.progress,
        start_date: row.start_date,
        end_date: row.end_date
      }

      // Project task summary and associations
      const projectTasks = db.prepare(`
        SELECT i.id, i.text, i.created_at, i.updated_at, t.status
        FROM tasks t
        JOIN items i ON i.id = t.item_id
        WHERE t.project_id = ?
        ORDER BY i.created_at DESC
      `).all(row.project_id) as { id: string; text: string; created_at: number; updated_at: number; status: string }[]

      const projectNotes = db.prepare(`
        SELECT i.id, i.text, i.created_at, i.updated_at
        FROM notes n
        JOIN items i ON i.id = n.item_id
        WHERE n.project_id = ?
        ORDER BY i.created_at DESC
      `).all(row.project_id) as { id: string; text: string; created_at: number; updated_at: number }[]

      if (projectTasks) {
        const totalTasks = projectTasks.length
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length
        const completionRate = totalTasks === 0 ? 0 : completedTasks / totalTasks
        const taskActivity = projectTasks.reduce<number | null>((acc, t) => {
          const ts = t.updated_at || t.created_at
          if (ts === undefined || ts === null) return acc
          if (acc === null) return ts
          return Math.max(acc, ts)
        }, null)

        const noteActivity = projectNotes.reduce<number | null>((acc, n) => {
          const ts = n.updated_at || n.created_at
          if (ts === undefined || ts === null) return acc
          if (acc === null) return ts
          return Math.max(acc, ts)
        }, null)

        const lastActivity = [taskActivity, noteActivity].reduce<number | null>((acc, ts) => {
          if (ts === null || ts === undefined) return acc
          if (acc === null) return ts
          return Math.max(acc, ts)
        }, null)

        const now = Date.now()
        const createdAt = row.created_at || now
        const stalenessDays = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)))
        const daysSinceActivity = lastActivity ? Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)) : stalenessDays
        const dangerZoneActive = completionRate >= 0.7 && daysSinceActivity >= 7

        item.project_tasks = projectTasks.map(t => ({
          id: t.id,
          title: t.text,
          status: (t.status || 'pending') as any,
          created_at: t.created_at,
          updated_at: t.updated_at
        }))

        item.project_notes = projectNotes.map(n => ({
          id: n.id,
          title: n.text,
          created_at: n.created_at,
          updated_at: n.updated_at
        }))

        item.project_summary = {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
          last_activity: lastActivity,
          staleness_days: stalenessDays,
          danger_zone: {
            active: dangerZoneActive,
            reason: dangerZoneActive ? '70%+ complete with 7+ days inactivity' : undefined
          }
        }
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

    // Validation for entity-specific fields
    if (body.task) {
      if (body.task.priority && (body.task.priority < 1 || body.task.priority > 5)) {
        return NextResponse.json({ error: 'Priority must be 1-5' }, { status: 400 })
      }
      if (body.task.status && !['pending', 'in-progress', 'completed'].includes(body.task.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
    }

    if (body.note?.subtype) {
      const validSubtypes = ['general', 'research', 'video', 'link', 'file', 'contact', 'meeting']
      if (!validSubtypes.includes(body.note.subtype)) {
        return NextResponse.json({ error: 'Invalid note subtype' }, { status: 400 })
      }
    }

    if (body.project) {
      if (body.project.progress !== undefined && (body.project.progress < 0 || body.project.progress > 100)) {
        return NextResponse.json({ error: 'Progress must be 0-100' }, { status: 400 })
      }
      if (body.project.status && !['planning', 'active', 'completed'].includes(body.project.status)) {
        return NextResponse.json({ error: 'Invalid project status' }, { status: 400 })
      }
    }

    // Fetch existing item first to merge with updates
    const existingItem = db.prepare('SELECT * FROM items WHERE id = ?').get(params.id) as any
    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Start transaction
    const updateItem = db.prepare(`
      UPDATE items
      SET text = ?, type = ?, updated_at = ?, metadata = ?, tags = ?, archived = ?, parsed = ?, entity_type = ?, markdown_content = ?, template_id = ?
      WHERE id = ?
    `)

    const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null
    const tagsJson = body.tags ? JSON.stringify(body.tags) : null

    const result = updateItem.run(
      body.text ?? existingItem.text,
      body.type ?? existingItem.type,
      now,
      metadataJson ?? existingItem.metadata,
      tagsJson ?? existingItem.tags,
      body.archived !== undefined ? (body.archived ? 1 : 0) : existingItem.archived,
      body.parsed !== undefined ? (body.parsed ? 1 : 0) : existingItem.parsed,
      body.entity_type ?? existingItem.entity_type,
      body.markdown_content ?? existingItem.markdown_content,
      body.template_id ?? existingItem.template_id,
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
          SET status = ?, priority = ?, tags = ?, estimated_time = ?, project_id = ?, due_date = ?, reminder_datetime = ?
          WHERE item_id = ?
        `)
        updateTask.run(
          body.task.status || 'pending',
          body.task.priority || 1,
          body.task.tags ? JSON.stringify(body.task.tags) : null,
          body.task.estimated_time || null,
          body.task.project_id || null,
          body.task.due_date || null,
          body.task.reminder_datetime || null,
          params.id
        )
      } else {
        const insertTask = db.prepare(`
          INSERT INTO tasks (id, item_id, status, priority, tags, estimated_time, project_id, due_date, reminder_datetime)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertTask.run(
          `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.task.status || 'pending',
          body.task.priority || 1,
          body.task.tags ? JSON.stringify(body.task.tags) : null,
          body.task.estimated_time || null,
          body.task.project_id || null,
          body.task.due_date || null,
          body.task.reminder_datetime || null
        )
      }
    }

    if (body.list) {
      const existingList = db.prepare('SELECT id FROM lists WHERE item_id = ?').get(params.id)
      const listType = normalizeListType(body.list.list_type)
      
      if (existingList) {
        const updateList = db.prepare(`
          UPDATE lists 
          SET name = ?, list_type = ?, tags = ?, description = ?
          WHERE item_id = ?
        `)
        updateList.run(
          body.list.name || '',
          listType,
          body.list.tags ? JSON.stringify(body.list.tags) : null,
          body.list.description || null,
          params.id
        )
      } else {
        const insertList = db.prepare(`
          INSERT INTO lists (id, item_id, name, list_type, tags, description)
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        insertList.run(
          `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.list.name || '',
          listType,
          body.list.tags ? JSON.stringify(body.list.tags) : null,
          body.list.description || null
        )
      }
    }

    if (body.project) {
      const existingProject = db.prepare('SELECT id FROM projects WHERE item_id = ?').get(params.id)
      const projectType = normalizeProjectType(body.project.project_type) || 'personal'
      const projectPriority = mapPriorityLabelToNumber(body.project.priority)
      
      if (existingProject) {
        const updateProject = db.prepare(`
          UPDATE projects 
          SET status = ?, project_type = ?, priority = ?, tags = ?, deadline = ?, description = ?, progress = ?, start_date = ?, end_date = ?
          WHERE item_id = ?
        `)
        updateProject.run(
          body.project.status || 'planning',
          projectType,
          projectPriority,
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
          INSERT INTO projects (id, item_id, status, project_type, priority, tags, deadline, description, progress, start_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertProject.run(
          `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.project.status || 'planning',
          projectType,
          projectPriority,
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
      const projectId = body.note.project_id || null
      
      if (existingNote) {
        const updateNote = db.prepare(`
          UPDATE notes 
          SET subtype = ?, content = ?, url = ?, media_type = ?, project_id = ?
          WHERE item_id = ?
        `)
        updateNote.run(
          body.note.subtype || 'general',
          body.note.content || null,
          body.note.url || null,
          body.note.media_type || null,
          projectId,
          params.id
        )
      } else {
        const insertNote = db.prepare(`
          INSERT INTO notes (id, item_id, subtype, content, url, media_type, project_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        insertNote.run(
          `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          params.id,
          body.note.subtype || 'general',
          body.note.content || null,
          body.note.url || null,
          body.note.media_type || null,
          projectId
        )
      }
    }

    // Phase 4: Update tag usage counts
    const oldTags = existingItem.tags ? JSON.parse(existingItem.tags) : []
    const newTags = body.tags || oldTags
    const addedTags = newTags.filter((tag: string) => !oldTags.includes(tag))
    const removedTags = oldTags.filter((tag: string) => !newTags.includes(tag))

    if (addedTags.length > 0 || removedTags.length > 0) {
      updateTagUsage(addedTags, removedTags)
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

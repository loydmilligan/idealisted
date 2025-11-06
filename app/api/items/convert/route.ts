import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNoteContent } from '@/lib/note-templates'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    // Fetch the parsed item
    const item = db.prepare(`
      SELECT * FROM items WHERE id = ?
    `).get(itemId) as any

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    if (!item.parsed) {
      return NextResponse.json(
        { error: 'Item must be parsed before converting' },
        { status: 400 }
      )
    }

    const entityType = item.entity_type
    if (!entityType) {
      return NextResponse.json(
        { error: 'No entity type set' },
        { status: 400 }
      )
    }

    // Parse AI suggestion if exists
    let aiSuggestion: any = null
    if (item.ai_suggestion) {
      try {
        aiSuggestion = JSON.parse(item.ai_suggestion)
      } catch (e) {
        console.error('Failed to parse AI suggestion:', e)
      }
    }

    const now = Date.now()

    // Update the main item type
    db.prepare(`
      UPDATE items
      SET type = ?,
          updated_at = ?
      WHERE id = ?
    `).run(entityType, now, itemId)

    // Create type-specific entity based on entity_type
    switch (entityType) {
      case 'task':
        const priority = aiSuggestion?.additional_fields?.priority || 1
        const dueDate = aiSuggestion?.additional_fields?.due_date
          ? new Date(aiSuggestion.additional_fields.due_date).getTime()
          : null

        db.prepare(`
          INSERT INTO tasks (id, item_id, status, priority, due_date, tags)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          itemId,
          'pending',
          priority,
          dueDate,
          aiSuggestion?.tags ? JSON.stringify(aiSuggestion.tags) : null
        )
        break

      case 'note':
        const noteSubtype = aiSuggestion?.additional_fields?.category || 'general'

        // Generate template content based on note subtype
        const { frontmatter, content } = generateNoteContent(
          noteSubtype as any,
          item.text,
          aiSuggestion?.additional_fields
        )

        db.prepare(`
          INSERT INTO notes (id, item_id, subtype, content, frontmatter)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          itemId,
          noteSubtype,
          content,
          frontmatter
        )
        break

      case 'list':
        const listName = aiSuggestion?.additional_fields?.list_name || item.text
        const listItems = aiSuggestion?.additional_fields?.list_items || []

        const listId = uuidv4()
        db.prepare(`
          INSERT INTO lists (id, item_id, name, tags)
          VALUES (?, ?, ?, ?)
        `).run(
          listId,
          itemId,
          listName,
          aiSuggestion?.tags ? JSON.stringify(aiSuggestion.tags) : null
        )

        // Add list items if any
        if (listItems && listItems.length > 0) {
          for (let i = 0; i < listItems.length; i++) {
            db.prepare(`
              INSERT INTO list_items (id, list_id, text, done, position, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(),
              listId,
              listItems[i],
              0,
              i,
              now
            )
          }
        }
        break

      case 'project':
        const deadline = aiSuggestion?.additional_fields?.deadline
          ? new Date(aiSuggestion.additional_fields.deadline).getTime()
          : null

        db.prepare(`
          INSERT INTO projects (id, item_id, status, tags, deadline, description, progress)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          itemId,
          'planning',
          aiSuggestion?.tags ? JSON.stringify(aiSuggestion.tags) : null,
          deadline,
          item.text,
          0
        )
        break

      default:
        return NextResponse.json(
          { error: 'Unknown entity type' },
          { status: 400 }
        )
    }

    // Fetch the converted item with relations
    const convertedItem = db.prepare(`
      SELECT * FROM items WHERE id = ?
    `).get(itemId) as any

    // Parse JSON fields
    if (convertedItem.tags) convertedItem.tags = JSON.parse(convertedItem.tags)
    if (convertedItem.metadata) convertedItem.metadata = JSON.parse(convertedItem.metadata)
    convertedItem.parsed = Boolean(convertedItem.parsed)

    return NextResponse.json({
      success: true,
      item: convertedItem,
      type: entityType
    })
  } catch (error) {
    console.error('Convert error:', error)
    return NextResponse.json(
      { error: 'Failed to convert item: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

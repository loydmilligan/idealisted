import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

interface TagInfo {
  name: string
  count: number
  color: string
  category: string
}

interface TagMetadata {
  id: string
  name: string
  color: string
  category: string
  created_at: number
}

// GET /api/tags - Get all tags with usage counts and metadata
export async function GET() {
  try {
    // Get all items with tags
    const items = db.prepare(`
      SELECT tags FROM items
      WHERE tags IS NOT NULL
      AND tags != '[]'
      AND archived = 0
    `).all() as { tags: string }[]

    // Count tag occurrences
    const tagCounts = new Map<string, number>()

    items.forEach((item) => {
      try {
        const tags = JSON.parse(item.tags) as string[]
        tags.forEach((tag) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        })
      } catch (e) {
        // Skip invalid JSON
      }
    })

    // Get tag metadata from database
    const tagMetadata = db.prepare(`
      SELECT id, name, color, category, created_at FROM tags
    `).all() as TagMetadata[]

    const metadataMap = new Map<string, TagMetadata>()
    tagMetadata.forEach((meta) => {
      metadataMap.set(meta.name, meta)
    })

    // Combine usage counts with metadata
    const tags: TagInfo[] = Array.from(tagCounts.entries())
      .map(([name, count]) => {
        const meta = metadataMap.get(name)
        return {
          name,
          count,
          color: meta?.color || '#868e96', // Default to grey
          category: meta?.category || 'Other',
        }
      })
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      tags
    })
  } catch (error) {
    console.error('Failed to get tags:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve tags' },
      { status: 500 }
    )
  }
}

// POST /api/tags - Create a new tag with metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, category } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      )
    }

    if (!color) {
      return NextResponse.json(
        { success: false, error: 'Tag color is required' },
        { status: 400 }
      )
    }

    const validCategories = ['Work', 'Personal', 'Health', 'Finance', 'Other']
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Check if tag already exists
    const existing = db.prepare(`
      SELECT id FROM tags WHERE name = ?
    `).get(name.trim()) as TagMetadata | undefined

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Tag already exists' },
        { status: 400 }
      )
    }

    // Create tag metadata
    const id = nanoid()
    const now = Date.now()

    db.prepare(`
      INSERT INTO tags (id, name, color, category, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), color, category || 'Other', now)

    return NextResponse.json({
      success: true,
      tag: {
        id,
        name: name.trim(),
        color,
        category: category || 'Other',
        created_at: now
      }
    })
  } catch (error) {
    console.error('Failed to create tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}

// PUT /api/tags - Rename a tag globally and update metadata
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldName, newName, color, category } = body

    if (!oldName || !newName) {
      return NextResponse.json(
        { success: false, error: 'oldName and newName are required' },
        { status: 400 }
      )
    }

    // Use transaction for atomic updates
    const updateTag = db.transaction(() => {
      // Update tag metadata if it exists
      const tagMeta = db.prepare(`
        SELECT id FROM tags WHERE name = ?
      `).get(oldName) as TagMetadata | undefined

      if (tagMeta) {
        // Update existing metadata
        const updates: string[] = []
        const params: any[] = []

        if (newName !== oldName) {
          updates.push('name = ?')
          params.push(newName)
        }
        if (color) {
          updates.push('color = ?')
          params.push(color)
        }
        if (category) {
          updates.push('category = ?')
          params.push(category)
        }

        if (updates.length > 0) {
          params.push(tagMeta.id)
          db.prepare(`
            UPDATE tags
            SET ${updates.join(', ')}
            WHERE id = ?
          `).run(...params)
        }
      } else if (color || category) {
        // Create metadata if it doesn't exist and we have color/category
        const id = nanoid()
        db.prepare(`
          INSERT INTO tags (id, name, color, category, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, newName, color || '#868e96', category || 'Other', Date.now())
      }

      // Get all items with the old tag
      const items = db.prepare(`
        SELECT id, tags FROM items
        WHERE tags IS NOT NULL
        AND tags != '[]'
        AND archived = 0
      `).all() as { id: string; tags: string }[]

      let updatedCount = 0

      // Update each item that has the old tag
      items.forEach((item) => {
        try {
          const tags = JSON.parse(item.tags) as string[]
          if (tags.includes(oldName)) {
            // Replace old tag with new tag
            const updatedTags = tags.map((tag) => tag === oldName ? newName : tag)

            db.prepare(`
              UPDATE items
              SET tags = ?, updated_at = ?
              WHERE id = ?
            `).run(JSON.stringify(updatedTags), Date.now(), item.id)

            updatedCount++
          }
        } catch (e) {
          // Skip invalid JSON
        }
      })

      return updatedCount
    })

    const updatedCount = updateTag()

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} items`,
      updatedCount
    })
  } catch (error) {
    console.error('Failed to rename tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to rename tag' },
      { status: 500 }
    )
  }
}

// DELETE /api/tags - Delete a tag globally
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tagName = searchParams.get('name')

    if (!tagName) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Use transaction for atomic updates
    const deleteTag = db.transaction(() => {
      // Delete tag metadata if it exists
      db.prepare(`
        DELETE FROM tags WHERE name = ?
      `).run(tagName)

      // Get all items with the tag
      const items = db.prepare(`
        SELECT id, tags FROM items
        WHERE tags IS NOT NULL
        AND tags != '[]'
        AND archived = 0
      `).all() as { id: string; tags: string }[]

      let updatedCount = 0

      // Remove the tag from each item
      items.forEach((item) => {
        try {
          const tags = JSON.parse(item.tags) as string[]
          if (tags.includes(tagName)) {
            // Remove the tag
            const updatedTags = tags.filter((tag) => tag !== tagName)

            db.prepare(`
              UPDATE items
              SET tags = ?, updated_at = ?
              WHERE id = ?
            `).run(JSON.stringify(updatedTags), Date.now(), item.id)

            updatedCount++
          }
        } catch (e) {
          // Skip invalid JSON
        }
      })

      return updatedCount
    })

    const updatedCount = deleteTag()

    return NextResponse.json({
      success: true,
      message: `Removed tag from ${updatedCount} items`,
      updatedCount
    })
  } catch (error) {
    console.error('Failed to delete tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}

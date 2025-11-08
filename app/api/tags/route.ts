import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface TagInfo {
  name: string
  count: number
  color?: string
}

// GET /api/tags - Get all tags with usage counts
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

    // Convert to array and sort by usage count
    const tags: TagInfo[] = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
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

// PUT /api/tags - Rename a tag globally
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldName, newName } = body

    if (!oldName || !newName) {
      return NextResponse.json(
        { success: false, error: 'oldName and newName are required' },
        { status: 400 }
      )
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

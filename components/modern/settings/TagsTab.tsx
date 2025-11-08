'use client'

import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, Check, X } from 'lucide-react'
import { getEntityColor } from '@/lib/entity-colors'

interface TagInfo {
  name: string
  count: number
  color?: string
}

interface EditingTag {
  originalName: string
  newName: string
  color: string
}

const DEFAULT_TAG_COLORS = [
  '#4A90E2', // Blue (task)
  '#F5A623', // Yellow/Orange (note)
  '#7ED321', // Green (project)
  '#BD10E0', // Purple (list)
  '#868e96', // Grey (idea)
  '#E74C3C', // Red
  '#3498DB', // Light Blue
  '#2ECC71', // Emerald
  '#F39C12', // Orange
  '#9B59B6', // Violet
]

export const TagsTab: React.FC = () => {
  const [tags, setTags] = useState<TagInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags')
      const data = await response.json()

      if (data.success) {
        setTags(data.tags || [])
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
      showMessage('✗ Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleStartEdit = (tag: TagInfo) => {
    setEditingTag({
      originalName: tag.name,
      newName: tag.name,
      color: tag.color || DEFAULT_TAG_COLORS[0],
    })
  }

  const handleCancelEdit = () => {
    setEditingTag(null)
  }

  const handleSaveEdit = async () => {
    if (!editingTag) return

    // Validate new name
    if (!editingTag.newName.trim()) {
      showMessage('✗ Tag name cannot be empty')
      return
    }

    // Check if name changed
    if (editingTag.newName !== editingTag.originalName) {
      // Check if new name already exists
      if (tags.some((t) => t.name === editingTag.newName)) {
        showMessage('✗ Tag name already exists')
        return
      }

      try {
        const response = await fetch('/api/tags', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldName: editingTag.originalName,
            newName: editingTag.newName,
          }),
        })

        const data = await response.json()

        if (data.success) {
          showMessage(`✓ Renamed tag in ${data.updatedCount} items`)
          await loadTags()
          setEditingTag(null)
        } else {
          showMessage('✗ Failed to rename tag')
        }
      } catch (error) {
        console.error('Failed to rename tag:', error)
        showMessage('✗ Error renaming tag')
      }
    } else {
      // Just close the edit form if no changes
      setEditingTag(null)
    }
  }

  const handleDeleteTag = async (tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all items.`)) {
      return
    }

    try {
      const response = await fetch(`/api/tags?name=${encodeURIComponent(tagName)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        showMessage(`✓ Removed tag from ${data.updatedCount} items`)
        await loadTags()
      } else {
        showMessage('✗ Failed to delete tag')
      }
    } catch (error) {
      console.error('Failed to delete tag:', error)
      showMessage('✗ Error deleting tag')
    }
  }

  const handleAddTag = () => {
    setShowAddForm(true)
    setNewTagName('')
  }

  const handleSaveNewTag = async () => {
    const trimmedName = newTagName.trim()

    if (!trimmedName) {
      showMessage('✗ Tag name cannot be empty')
      return
    }

    if (tags.some((t) => t.name === trimmedName)) {
      showMessage('✗ Tag already exists')
      return
    }

    // Note: We don't actually create a tag in the database
    // Tags are created when they're added to items
    // This just shows a message that the tag can be used
    showMessage(`✓ Tag "${trimmedName}" can now be used on items`)
    setShowAddForm(false)
    setNewTagName('')

    // Optionally refresh the list
    await loadTags()
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setNewTagName('')
  }

  const getTagColor = (tag: TagInfo) => {
    return tag.color || DEFAULT_TAG_COLORS[tags.indexOf(tag) % DEFAULT_TAG_COLORS.length]
  }

  if (loading) {
    return <div className="retro-text-secondary">Loading tags...</div>
  }

  return (
    <div>
      <div className="retro-tags-header">
        <h3 className="retro-section-title">TAG MANAGEMENT</h3>
        <button className="retro-btn retro-btn-small" onClick={handleAddTag}>
          <Plus size={14} />
          ADD TAG
        </button>
      </div>

      {message && <div className="retro-message">{message}</div>}

      {showAddForm && (
        <div className="retro-tag-form">
          <input
            type="text"
            className="retro-input"
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNewTag()
              if (e.key === 'Escape') handleCancelAdd()
            }}
            autoFocus
          />
          <div className="retro-tag-form-actions">
            <button
              className="retro-btn retro-btn-small retro-btn-primary"
              onClick={handleSaveNewTag}
            >
              <Check size={14} />
            </button>
            <button
              className="retro-btn retro-btn-small retro-btn-secondary"
              onClick={handleCancelAdd}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {tags.length === 0 ? (
        <p className="retro-text-secondary">
          No tags found. Tags are created when you add them to items.
        </p>
      ) : (
        <div className="retro-tags-list">
          {tags.map((tag) => (
            <div key={tag.name} className="retro-tag-item">
              {editingTag?.originalName === tag.name ? (
                // Edit mode
                <div className="retro-tag-edit-form">
                  <div className="retro-tag-edit-row">
                    <input
                      type="text"
                      className="retro-input retro-tag-input"
                      value={editingTag.newName}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, newName: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      autoFocus
                    />
                    <div className="retro-tag-color-picker">
                      {DEFAULT_TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`retro-color-swatch ${
                            editingTag.color === color ? 'active' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditingTag({ ...editingTag, color })}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="retro-tag-edit-actions">
                    <button
                      className="retro-btn retro-btn-small retro-btn-primary"
                      onClick={handleSaveEdit}
                    >
                      <Check size={14} />
                      SAVE
                    </button>
                    <button
                      className="retro-btn retro-btn-small retro-btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      <X size={14} />
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="retro-tag-info">
                    <div
                      className="retro-tag-color-indicator"
                      style={{ backgroundColor: getTagColor(tag) }}
                    />
                    <span className="retro-tag-name">{tag.name}</span>
                    <span className="retro-tag-count">({tag.count})</span>
                  </div>
                  <div className="retro-tag-actions">
                    <button
                      className="retro-tag-action-btn"
                      onClick={() => handleStartEdit(tag)}
                      title="Edit tag"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="retro-tag-action-btn retro-tag-delete-btn"
                      onClick={() => handleDeleteTag(tag.name)}
                      title="Delete tag"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="retro-tags-info">
        <p className="retro-text-secondary">
          • Tags show usage count (number of items)
          <br />
          • Renaming updates all items with that tag
          <br />
          • Deleting removes tag from all items
          <br />• New tags are created when added to items
        </p>
      </div>
    </div>
  )
}

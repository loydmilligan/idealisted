'use client'

import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, Check, X } from 'lucide-react'
import { DEFAULT_TAG_COLORS } from '@/lib/entity-colors'

interface TagInfo {
  name: string
  count: number
  color: string
  category: string
}

interface EditingTag {
  originalName: string
  newName: string
  color: string
  category: string
}

const TAG_CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Other']

export const TagsTab: React.FC = () => {
  const [tags, setTags] = useState<TagInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLORS[0])
  const [newTagCategory, setNewTagCategory] = useState('Other')
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
      category: tag.category || 'Other',
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

    // Check if name changed and new name already exists
    if (editingTag.newName !== editingTag.originalName) {
      if (tags.some((t) => t.name === editingTag.newName)) {
        showMessage('✗ Tag name already exists')
        return
      }
    }

    try {
      const response = await fetch('/api/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName: editingTag.originalName,
          newName: editingTag.newName,
          color: editingTag.color,
          category: editingTag.category,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showMessage(`✓ Updated tag in ${data.updatedCount} items`)
        await loadTags()
        setEditingTag(null)
      } else {
        showMessage('✗ Failed to update tag')
      }
    } catch (error) {
      console.error('Failed to update tag:', error)
      showMessage('✗ Error updating tag')
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
    setNewTagColor(DEFAULT_TAG_COLORS[0])
    setNewTagCategory('Other')
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

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          color: newTagColor,
          category: newTagCategory,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showMessage(`✓ Created tag "${trimmedName}"`)
        setShowAddForm(false)
        setNewTagName('')
        await loadTags()
      } else {
        showMessage(`✗ ${data.error || 'Failed to create tag'}`)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
      showMessage('✗ Error creating tag')
    }
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setNewTagName('')
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
          <select
            className="retro-select"
            value={newTagCategory}
            onChange={(e) => setNewTagCategory(e.target.value)}
          >
            {TAG_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="retro-tag-color-picker">
            {DEFAULT_TAG_COLORS.map((color) => (
              <button
                key={color}
                className={`retro-color-swatch ${
                  newTagColor === color ? 'active' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewTagColor(color)}
                title={color}
              />
            ))}
          </div>
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
          No tags found. Create tags to organize your items.
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
                    <select
                      className="retro-select"
                      value={editingTag.category}
                      onChange={(e) =>
                        setEditingTag({ ...editingTag, category: e.target.value })
                      }
                    >
                      {TAG_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
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
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="retro-tag-name">{tag.name}</span>
                    <span className="retro-tag-category">[{tag.category}]</span>
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
          • Tags show category and usage count
          <br />
          • Categories: Work, Personal, Health, Finance, Other
          <br />
          • Updating updates all items with that tag
          <br />• Deleting removes tag from all items
        </p>
      </div>
    </div>
  )
}

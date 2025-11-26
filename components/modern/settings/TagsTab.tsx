'use client'

import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, Check, X } from 'lucide-react'
import { TagIcon } from '@/components/ui/TagIcon'
import { parseTagIconFromDB } from '@/lib/tag-icons'
import type { TagIcon as TagIconType } from '@/lib/tag-icons'

interface TagInfo {
  name: string
  count: number
  category: string
  icon_foreground_color?: string | null
  icon_background_color?: string | null
  icon_shape?: string | null
  icon_texture?: string | null
  icon_background_shape?: string | null
}

interface EditingTag {
  originalName: string
  newName: string
  category: string
}

const TAG_CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Other']

export const TagsTab: React.FC = () => {
  const [tags, setTags] = useState<TagInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null)
  const [newTagName, setNewTagName] = useState('')
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
        <div className="retro-tag-form" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              className="retro-input"
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
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
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '14px'
              }}
              value={newTagCategory}
              onChange={(e) => setNewTagCategory(e.target.value)}
            >
              {TAG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="retro-btn retro-btn-small retro-btn-primary"
              onClick={handleSaveNewTag}
            >
              <Check size={14} />
              SAVE
            </button>
            <button
              className="retro-btn retro-btn-small retro-btn-secondary"
              onClick={handleCancelAdd}
            >
              <X size={14} />
              CANCEL
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
                <div className="retro-tag-edit-form" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="retro-input"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
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
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        fontSize: '14px'
                      }}
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
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                    {(() => {
                      const icon = parseTagIconFromDB(tag)
                      return icon ? (
                        <TagIcon icon={icon} size={20} className="retro-tag-icon" />
                      ) : (
                        <div className="retro-tag-icon-placeholder" />
                      )
                    })()}
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

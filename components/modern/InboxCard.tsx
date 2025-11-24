/**
 * Inbox Card Component (Unsorted Items)
 *
 * Card design for unsorted/uncategorized ideas:
 * - Retro Palm Pilot card styling
 * - No colored stripe (not yet categorized)
 * - Action buttons: Task, Note▾, Project, List, AI▾
 * - Timestamp below text
 * - Retro flat rectangular design
 */

'use client'

import React, { useState, useEffect } from 'react'
import { EntityType } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'

interface InboxCardProps {
  id: string
  text: string
  createdAt: Date | string
  onSort: (entityType: Exclude<EntityType, 'idea'>, subtype?: string) => void
  onConvert: (entityType: Exclude<EntityType, 'idea'>) => void
  onAIAction: (action: 'sort' | 'convert' | 'full') => void
  className?: string
}

export const InboxCard: React.FC<InboxCardProps> = ({
  id,
  text,
  createdAt,
  onSort,
  onConvert,
  onAIAction,
  className = '',
}) => {
  const [showNoteMenu, setShowNoteMenu] = useState(false)
  const [showAIMenu, setShowAIMenu] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)

  // Fetch AI config on mount to check if AI is enabled
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
      .catch(() => setAiEnabled(false))
  }, [])

  const timestamp = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })

  const entityButtons: Array<{ type: Exclude<EntityType, 'idea'>; label: string }> = [
    { type: 'task', label: 'Task' },
    { type: 'note', label: 'Note ▾' },
    { type: 'project', label: 'Project' },
    { type: 'list', label: 'List' },
  ]

  const handleEntityClick = (type: Exclude<EntityType, 'idea'>, subtype?: string) => {
    if (type === 'note' && !subtype) {
      setShowNoteMenu(!showNoteMenu)
    } else {
      onSort(type, subtype)
    }
  }

  return (
    <div className={`retro-card relative mb-3 ${className}`}>
      {/* Idea Text */}
      <p className="retro-item-title mb-2">{text}</p>

      {/* Timestamp */}
      <p className="retro-timestamp mb-3">{timeAgo}</p>

      {/* Action Buttons Row */}
      <div className="retro-action-row flex-wrap">
        {entityButtons.map((btn) => {
          // Add entity color accent class for conversion buttons
          const accentClass = btn.type ? `retro-btn-accent-${btn.type}` : ''
          return (
            <button
              key={btn.type}
              onClick={() => handleEntityClick(btn.type)}
              className={`retro-btn retro-btn-secondary retro-btn-sm ${accentClass}`}
              style={{ touchAction: 'manipulation' }}
            >
              {btn.label}
            </button>
          )
        })}

        {/* AI Dropdown Button - only show if AI is enabled */}
        {aiEnabled && (
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            className="retro-btn retro-btn-secondary retro-btn-sm"
            style={{ touchAction: 'manipulation' }}
          >
            AI ▾
          </button>
        )}
      </div>

      {/* Note Template Menu (if shown) */}
      {showNoteMenu && (
        <div className="retro-card absolute z-10 mt-2 w-40 mobile-spacing-sm">
          {[
            { label: 'Note', subtype: 'general' },
            { label: 'Research', subtype: 'research' },
            { label: 'Video', subtype: 'video' },
            { label: 'Link', subtype: 'link' },
            { label: 'File', subtype: 'file' },
            { label: 'Meeting', subtype: 'meeting' },
          ].map((template) => (
            <button
              key={template.label}
              onClick={() => {
                onSort('note', template.subtype)
                setShowNoteMenu(false)
              }}
              className="retro-btn retro-btn-secondary tap-target w-full text-left"
              style={{ touchAction: 'manipulation' }}
            >
              {template.label}
            </button>
          ))}
        </div>
      )}

      {/* AI Action Menu (if shown) */}
      {showAIMenu && (
        <div className="retro-card absolute z-10 mt-2 w-44 mobile-spacing-sm">
          <button
            onClick={() => {
              onAIAction('sort')
              setShowAIMenu(false)
            }}
            className="retro-btn retro-btn-secondary tap-target w-full text-left"
            style={{ touchAction: 'manipulation' }}
          >
            Sort
          </button>
          <button
            onClick={() => {
              onAIAction('convert')
              setShowAIMenu(false)
            }}
            className="retro-btn retro-btn-secondary tap-target w-full text-left"
            style={{ touchAction: 'manipulation' }}
          >
            Convert
          </button>
          <button
            onClick={() => {
              onAIAction('full')
              setShowAIMenu(false)
            }}
            className="retro-btn retro-btn-secondary tap-target w-full text-left"
            style={{ touchAction: 'manipulation' }}
          >
            Full
          </button>
        </div>
      )}
    </div>
  )
}

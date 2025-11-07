/**
 * Inbox Card Component (Unsorted Items)
 *
 * Card design for unsorted/uncategorized ideas:
 * - White background with border
 * - No colored stripe (not yet categorized)
 * - Action buttons: Task, Note▾, Project, List, AI▾
 * - Timestamp below text
 * - 12pt margin bottom
 * - 16pt padding
 */

'use client'

import React, { useState } from 'react'
import { EntityType } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'

interface InboxCardProps {
  id: string
  text: string
  createdAt: Date | string
  onSort: (entityType: Exclude<EntityType, 'idea'>) => void
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

  const timestamp = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })

  const entityButtons: Array<{ type: Exclude<EntityType, 'idea'>; label: string; color: string }> = [
    { type: 'task', label: 'Task', color: '#4A90E2' },
    { type: 'note', label: 'Note ▾', color: '#F5A623' },
    { type: 'project', label: 'Project', color: '#7ED321' },
    { type: 'list', label: 'List', color: '#BD10E0' },
  ]

  const handleEntityClick = (type: Exclude<EntityType, 'idea'>) => {
    if (type === 'note') {
      setShowNoteMenu(!showNoteMenu)
    } else {
      onSort(type)
    }
  }

  return (
    <div
      className={`modern-card relative bg-white dark:bg-[#2a2a2a] border border-[var(--border-color)] rounded-xl p-4 mb-3 ${className}`}
    >
      {/* Idea Text */}
      <p className="text-body mb-2 leading-normal">{text}</p>

      {/* Timestamp */}
      <p className="text-secondary text-sm mb-3">{timeAgo}</p>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-2">
        {entityButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => handleEntityClick(btn.type)}
            className="modern-button h-11 px-3 text-sm font-semibold rounded-lg transition-all"
            style={{
              borderColor: btn.color,
              color: btn.color,
              backgroundColor: 'transparent',
            }}
          >
            {btn.label}
          </button>
        ))}

        {/* AI Dropdown Button */}
        <button
          onClick={() => setShowAIMenu(!showAIMenu)}
          className="modern-button h-11 px-3 text-sm font-semibold rounded-lg"
          style={{
            borderColor: '#6EC5FF',
            color: '#6EC5FF',
            backgroundColor: 'transparent',
          }}
        >
          AI ▾
        </button>
      </div>

      {/* Note Template Menu (if shown) */}
      {showNoteMenu && (
        <div className="absolute z-10 mt-2 w-36 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-[var(--border-color)]">
          {['Note', 'Research', 'Video', 'Link', 'File', 'Meeting'].map((template) => (
            <button
              key={template}
              onClick={() => {
                onSort('note')
                setShowNoteMenu(false)
              }}
              className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] first:rounded-t-lg last:rounded-b-lg"
            >
              {template}
            </button>
          ))}
        </div>
      )}

      {/* AI Action Menu (if shown) */}
      {showAIMenu && (
        <div className="absolute z-10 mt-2 w-40 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-[var(--border-color)]">
          <button
            onClick={() => {
              onAIAction('sort')
              setShowAIMenu(false)
            }}
            className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] rounded-t-lg"
          >
            Sort
          </button>
          <button
            onClick={() => {
              onAIAction('convert')
              setShowAIMenu(false)
            }}
            className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)]"
          >
            Convert
          </button>
          <button
            onClick={() => {
              onAIAction('full')
              setShowAIMenu(false)
            }}
            className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] rounded-b-lg"
          >
            Full
          </button>
        </div>
      )}
    </div>
  )
}

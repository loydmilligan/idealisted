/**
 * Capture Screen Component - Retro Palm Pilot Style
 *
 * Main idea capture interface:
 * - Retro header with "IDEALIST V1.0" and subtitle
 * - Retro-styled textarea (monospace placeholder, inset border)
 * - Action buttons row: ✓ Unsorted (beveled primary), others (flat secondary)
 * - Recently Captured section with retro cards and entity color borders
 * - Auto-focus on mount
 * - Clear and refocus after successful capture
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { EntityType } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface RecentItem {
  id: string
  text: string
  entityType?: Exclude<EntityType, 'idea'> | null
  createdAt: Date | string
}

interface CaptureScreenProps {
  onCapture: (text: string, entityType?: Exclude<EntityType, 'idea'> | null) => void
  onAICapture?: (text: string, action: 'sort' | 'convert' | 'full') => void
  recentItems?: RecentItem[]
  className?: string
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  onCapture,
  onAICapture,
  recentItems = [],
  className = '',
}) => {
  const [inputText, setInputText] = useState('')
  const [showNoteMenu, setShowNoteMenu] = useState(false)
  const [showAIMenu, setShowAIMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleCapture = (entityType?: Exclude<EntityType, 'idea'> | null) => {
    if (!inputText.trim()) return

    onCapture(inputText, entityType)
    setInputText('')
    textareaRef.current?.focus()
  }

  const handleAIAction = (action: 'sort' | 'convert' | 'full') => {
    if (!inputText.trim()) return

    if (onAICapture) {
      onAICapture(inputText, action)
      setInputText('')
      textareaRef.current?.focus()
    }
  }

  const entityButtons: Array<{
    type: Exclude<EntityType, 'idea'> | null
    label: string
    hasDropdown?: boolean
  }> = [
    { type: null, label: '✓ Unsorted' },
    { type: 'task', label: 'Task' },
    { type: 'note', label: 'Note ▾', hasDropdown: true },
    { type: 'project', label: 'Project' },
    { type: 'list', label: 'List' },
  ]

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Screen Header */}
      <div className="retro-screen-header text-center">
        <h1 className="retro-header retro-header-lg">
          IDEALIST V1.0
        </h1>
        <p className="retro-header-sm" style={{ marginTop: '4px', opacity: 0.7 }}>
          IDEAS • INSTANT SORT • ORGANIZE
        </p>
      </div>

      {/* Input Container */}
      <div className="px-4 mb-4" style={{ paddingTop: '16px' }}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your idea..."
          className="retro-textarea"
          style={{
            minHeight: '96px',
            maxHeight: '40vh',
          }}
        />
      </div>

      {/* Action Buttons Row */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {entityButtons.map((btn, index) => (
            <button
              key={btn.label}
              onClick={() => {
                if (btn.hasDropdown) {
                  setShowNoteMenu(!showNoteMenu)
                } else {
                  handleCapture(btn.type)
                }
              }}
              disabled={!inputText.trim()}
              className={`retro-btn ${index === 0 ? 'retro-btn-primary' : 'retro-btn-secondary'} whitespace-nowrap flex-shrink-0`}
            >
              {btn.label}
            </button>
          ))}

          {/* AI Button */}
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            disabled={!inputText.trim()}
            className="retro-btn retro-btn-secondary whitespace-nowrap flex-shrink-0"
          >
            AI ▾
          </button>
        </div>

        {/* Note Template Dropdown */}
        {showNoteMenu && (
          <div className="relative mt-2">
            <div className="absolute z-10 w-40" style={{
              background: 'var(--palm-screen-light)',
              border: '1px solid var(--palm-border)',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.2)'
            }}>
              {['Note', 'Research', 'Video', 'Link', 'File', 'Meeting'].map((template, idx) => (
                <button
                  key={template}
                  onClick={() => {
                    handleCapture('note')
                    setShowNoteMenu(false)
                  }}
                  className="w-full px-4 text-left"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    height: '40px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: idx > 0 ? '1px solid var(--palm-border)' : 'none',
                    color: 'var(--palm-text-dark)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--palm-screen-base)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Action Dropdown */}
        {showAIMenu && (
          <div className="relative mt-2">
            <div className="absolute z-10 w-40" style={{
              background: 'var(--palm-screen-light)',
              border: '1px solid var(--palm-border)',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.2)'
            }}>
              {['Sort', 'Convert', 'Full'].map((action, idx) => (
                <button
                  key={action}
                  onClick={() => {
                    handleAIAction(action.toLowerCase() as 'sort' | 'convert' | 'full')
                    setShowAIMenu(false)
                  }}
                  className="w-full px-4 text-left"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    height: '40px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: idx > 0 ? '1px solid var(--palm-border)' : 'none',
                    color: 'var(--palm-text-dark)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--palm-screen-base)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="retro-separator" style={{ marginLeft: '16px', marginRight: '16px' }} />

      {/* Recently Captured Section */}
      <div className="px-4 flex-1 overflow-y-auto">
        <h2 className="retro-header retro-header-sm" style={{ marginBottom: '12px' }}>
          Recently Captured
        </h2>

        {recentItems.length === 0 ? (
          <div className="retro-empty">
            <div className="retro-empty-icon">📥</div>
            <p className="retro-empty-title">Nothing here yet</p>
            <p className="retro-empty-message">Start capturing ideas!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentItems.slice(0, 5).map((item, index) => {
              const timestamp = typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt
              const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })
              const entityClass = item.entityType ? `retro-card-${item.entityType}` : ''

              return (
                <div
                  key={item.id}
                  className={`retro-card ${entityClass}`}
                  style={{ cursor: 'pointer' }}
                >
                  <p className="retro-item-title" style={{
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.text}
                  </p>
                  <p className="retro-timestamp">{timeAgo}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

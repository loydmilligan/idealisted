/**
 * Capture Screen Component
 *
 * Main idea capture interface:
 * - Centered "Idealist" title
 * - Multiline auto-expanding textarea (96pt min, 40vh max)
 * - Action buttons row: ✓ Unsorted, Task, Note▾, Project, List, AI▾
 * - Recently Captured section (last 5 items with timestamps)
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
    color: string
    hasDropdown?: boolean
  }> = [
    { type: null, label: '✓ Unsorted', color: '#868e96' },
    { type: 'task', label: 'Task', color: '#4A90E2' },
    { type: 'note', label: 'Note ▾', color: '#F5A623', hasDropdown: true },
    { type: 'project', label: 'Project', color: '#7ED321' },
    { type: 'list', label: 'List', color: '#BD10E0' },
  ]

  const getEntityColor = (item: RecentItem): string => {
    if (!item.entityType) return '#868e96'
    const colors: Record<string, string> = {
      task: '#4A90E2',
      note: '#F5A623',
      project: '#7ED321',
      list: '#BD10E0',
    }
    return colors[item.entityType] || '#868e96'
  }

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Screen Title */}
      <div className="text-center py-6">
        <h1 className="text-screen-title font-bold text-[var(--text-primary)]">
          Idealist
        </h1>
      </div>

      {/* Input Container */}
      <div className="px-4 mb-4">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your idea..."
          className="w-full min-h-[96px] max-h-[40vh] px-3 py-3 border border-[var(--border-color)] rounded-lg bg-white dark:bg-[#2a2a2a] text-[var(--text-primary)] text-body resize-none focus:outline-none focus:border-[#4A90E2] transition-colors"
          style={{
            fontFamily: 'var(--font-system)',
          }}
        />
      </div>

      {/* Action Buttons Row */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {entityButtons.map((btn) => (
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
              className="modern-button h-11 px-4 text-sm font-semibold rounded-lg whitespace-nowrap flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                borderColor: btn.color,
                color: btn.color,
                backgroundColor: 'transparent',
              }}
            >
              {btn.label}
            </button>
          ))}

          {/* AI Button */}
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            disabled={!inputText.trim()}
            className="modern-button h-11 px-4 text-sm font-semibold rounded-lg whitespace-nowrap flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: '#6EC5FF',
              color: '#6EC5FF',
              backgroundColor: 'transparent',
            }}
          >
            AI ▾
          </button>
        </div>

        {/* Note Template Dropdown */}
        {showNoteMenu && (
          <div className="relative mt-2">
            <div className="absolute z-10 w-40 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-[var(--border-color)]">
              {['Note', 'Research', 'Video', 'Link', 'File', 'Meeting'].map((template) => (
                <button
                  key={template}
                  onClick={() => {
                    handleCapture('note')
                    setShowNoteMenu(false)
                  }}
                  className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] first:rounded-t-lg last:rounded-b-lg"
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
            <div className="absolute z-10 w-40 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-[var(--border-color)]">
              <button
                onClick={() => {
                  handleAIAction('sort')
                  setShowAIMenu(false)
                }}
                className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] rounded-t-lg"
              >
                Sort
              </button>
              <button
                onClick={() => {
                  handleAIAction('convert')
                  setShowAIMenu(false)
                }}
                className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)]"
              >
                Convert
              </button>
              <button
                onClick={() => {
                  handleAIAction('full')
                  setShowAIMenu(false)
                }}
                className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] rounded-b-lg"
              >
                Full
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-color)] mx-4 mb-4" />

      {/* Recently Captured Section */}
      <div className="px-4 flex-1 overflow-y-auto">
        <h2 className="text-secondary text-sm font-medium mb-3">
          Recently Captured
        </h2>

        {recentItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2 opacity-30">📥</div>
            <p className="text-secondary text-sm">Nothing here yet</p>
            <p className="text-secondary text-xs opacity-60">Start capturing ideas!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.slice(0, 5).map((item, index) => {
              const timestamp = typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt
              const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })
              const color = getEntityColor(item)

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="relative bg-[var(--bg-surface)] rounded-lg p-3 cursor-pointer hover:shadow-sm transition-shadow"
                >
                  {/* Colored stripe */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                    style={{ backgroundColor: color }}
                  />

                  <div className="pl-2">
                    <p className="text-sm truncate mb-1">{item.text}</p>
                    <p className="text-xs text-secondary">{timeAgo}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

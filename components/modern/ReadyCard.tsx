/**
 * Ready Card Component (Sorted/Ready to Convert Items)
 *
 * Card design for sorted ideas ready to convert:
 * - Entity color at 10% opacity background
 * - 4pt colored stripe on left (entity color at 40% opacity)
 * - Entity type label below text
 * - Convert and AI▾ buttons (right-aligned)
 * - Timestamp
 * - 12pt margin bottom
 * - 16pt padding
 */

'use client'

import React, { useState } from 'react'
import { EntityType, getEntityColor, getEntityColorWithOpacity } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'

interface ReadyCardProps {
  id: string
  text: string
  entityType: Exclude<EntityType, 'idea'>
  createdAt: Date | string
  onConvert: () => void
  onAIAction: (action: 'convert' | 'full') => void
  className?: string
}

export const ReadyCard: React.FC<ReadyCardProps> = ({
  id,
  text,
  entityType,
  createdAt,
  onConvert,
  onAIAction,
  className = '',
}) => {
  const [showAIMenu, setShowAIMenu] = useState(false)

  const timestamp = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })

  // Get entity colors
  const entityColor = getEntityColor(entityType, 'bright')
  const mutedColor = getEntityColorWithOpacity(entityType, 0.4)
  const backgroundColor = getEntityColorWithOpacity(entityType, 0.1)

  // Capitalize entity type for display
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <div
      className={`modern-card relative rounded-xl p-4 mb-3 ${className}`}
      style={{
        backgroundColor: backgroundColor,
        border: `1px solid ${mutedColor}`,
      }}
    >
      {/* 4pt Colored Stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{
          backgroundColor: mutedColor,
        }}
      />

      {/* Content with left padding for stripe */}
      <div className="pl-2">
        {/* Idea Text */}
        <p className="text-body mb-1 leading-normal">{text}</p>

        {/* Entity Type Label */}
        <p
          className="text-sm font-semibold mb-1"
          style={{
            color: getEntityColorWithOpacity(entityType, 0.7),
          }}
        >
          {entityLabel}
        </p>

        {/* Timestamp */}
        <p className="text-secondary text-sm mb-3">{timeAgo}</p>

        {/* Action Buttons (Right-aligned) */}
        <div className="flex justify-end gap-2">
          {/* Convert Button */}
          <button
            onClick={onConvert}
            className="modern-button h-11 px-6 text-sm font-semibold rounded-lg"
            style={{
              borderColor: entityColor,
              color: entityColor,
              backgroundColor: 'white',
            }}
          >
            Convert
          </button>

          {/* AI Dropdown Button */}
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            className="modern-button h-11 px-3 text-sm font-semibold rounded-lg"
            style={{
              borderColor: '#6EC5FF',
              color: '#6EC5FF',
              backgroundColor: 'white',
            }}
          >
            AI ▾
          </button>
        </div>

        {/* AI Action Menu (if shown) */}
        {showAIMenu && (
          <div className="absolute right-4 bottom-16 z-10 w-40 bg-white dark:bg-[#2a2a2a] rounded-lg shadow-lg border border-[var(--border-color)]">
            <button
              onClick={() => {
                onAIAction('convert')
                setShowAIMenu(false)
              }}
              className="w-full h-11 px-4 text-left text-sm hover:bg-[var(--bg-surface)] rounded-t-lg"
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
    </div>
  )
}

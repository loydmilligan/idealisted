/**
 * Ready Card Component (Sorted/Ready to Convert Items)
 *
 * Card design for sorted ideas ready to convert:
 * - Retro Palm Pilot card styling
 * - Entity type badge with retro entity accent colors
 * - Convert button (primary beveled)
 * - AI▾ button (secondary flat)
 * - Timestamp
 * - Retro flat rectangular design
 */

'use client'

import React, { useState, useEffect } from 'react'
import { EntityType } from '@/lib/entity-colors'
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

  // Capitalize entity type for display
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  // Get entity-specific badge class
  const badgeClass = `retro-entity-badge retro-entity-badge-${entityType}`

  return (
    <div className={`retro-card relative mb-3 ${className}`}>
      {/* Idea Text */}
      <p className="retro-item-title mb-2">{text}</p>

      {/* Entity Type Badge */}
      <div className={`${badgeClass} mb-2`}>
        {entityLabel}
      </div>

      {/* Timestamp */}
      <p className="retro-timestamp mb-3">{timeAgo}</p>

      {/* Action Buttons (Right-aligned) */}
      <div className="flex justify-end gap-3">
        {/* Convert Button - Primary (beveled) with entity color accent */}
        <button
          onClick={onConvert}
          className={`retro-btn retro-btn-primary tap-target retro-btn-accent-${entityType}`}
          style={{ touchAction: 'manipulation' }}
        >
          Convert
        </button>

        {/* AI Dropdown Button - Secondary (flat) - only show if AI is enabled */}
        {aiEnabled && (
          <button
            onClick={() => setShowAIMenu(!showAIMenu)}
            className="retro-btn retro-btn-secondary tap-target"
            style={{ touchAction: 'manipulation' }}
          >
            AI ▾
          </button>
        )}
      </div>

      {/* AI Action Menu (if shown) */}
      {showAIMenu && (
        <div className="retro-card absolute z-10 mt-2 right-0 w-44 mobile-spacing-sm">
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

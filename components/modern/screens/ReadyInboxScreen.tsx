/**
 * Ready Inbox Screen Component
 *
 * Shows sorted/categorized ideas ready to convert into full entities:
 * - Screen title with count: "Ready (5)"
 * - List of ReadyCard components with swipe gestures
 * - Swipe left: Delete
 * - Swipe right: Convert to entity (configurable per type)
 * - Cards have entity color tint and stripe
 * - Empty state when no items
 */

'use client'

import React from 'react'
import { SwipeableCard } from '../SwipeableCard'
import { ReadyCard } from '../ReadyCard'
import { EntityType, getEntityColor } from '@/lib/entity-colors'

interface ReadyItem {
  id: string
  text: string
  entityType: Exclude<EntityType, 'idea'>
  createdAt: Date | string
}

interface ReadyInboxScreenProps {
  items: ReadyItem[]
  onConvert: (itemId: string) => void
  onDelete: (itemId: string) => void
  onAIAction: (itemId: string, action: 'convert' | 'full') => void
  className?: string
}

export const ReadyInboxScreen: React.FC<ReadyInboxScreenProps> = ({
  items,
  onConvert,
  onDelete,
  onAIAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Content Area */}
      <div className="retro-screen-content">
        {items.length === 0 ? (
          // Empty State
          <div className="retro-empty">
            <div className="retro-empty-icon">✓</div>
            <h2 className="retro-empty-title">
              No sorted items
            </h2>
            <p className="retro-empty-message">
              Categorize some ideas first!
            </p>
          </div>
        ) : (
          // Items List
          <div className="space-y-3">
            {items.map((item) => {
              return (
                <SwipeableCard
                  key={item.id}
                  onSwipeLeft={() => onDelete(item.id)}
                  onSwipeRight={() => onConvert(item.id)}
                  rightActionEntityType={item.entityType}
                  rightActionIcon="→"
                  leftActionIcon="🗑️"
                >
                  <ReadyCard
                    id={item.id}
                    text={item.text}
                    entityType={item.entityType}
                    createdAt={item.createdAt}
                    onConvert={() => onConvert(item.id)}
                    onAIAction={(action) => onAIAction(item.id, action)}
                  />
                </SwipeableCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

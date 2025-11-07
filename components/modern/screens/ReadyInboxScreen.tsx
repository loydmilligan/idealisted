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
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Screen Title with Count */}
      <div className="px-4 py-6">
        <h1 className="text-screen-title font-bold text-[var(--text-primary)]">
          Ready ({items.length})
        </h1>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="text-6xl mb-4 opacity-30">✓</div>
            <h2 className="text-card-header font-semibold text-secondary mb-2">
              No sorted items
            </h2>
            <p className="text-secondary text-sm">
              Categorize some ideas first!
            </p>
          </div>
        ) : (
          // Items List
          <div className="space-y-3 pb-4">
            {items.map((item) => {
              const entityColor = getEntityColor(item.entityType, 'bright')

              return (
                <SwipeableCard
                  key={item.id}
                  onSwipeLeft={() => onDelete(item.id)}
                  onSwipeRight={() => onConvert(item.id)}
                  rightActionColor={entityColor}
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

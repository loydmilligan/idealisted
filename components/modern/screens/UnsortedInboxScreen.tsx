/**
 * Unsorted Inbox Screen Component
 *
 * Shows uncategorized ideas awaiting sorting:
 * - Screen title with count: "Unsorted (10)"
 * - List of InboxCard components with swipe gestures
 * - Swipe left: Delete
 * - Swipe right: Quick sort to default entity type (configurable)
 * - Empty state when no items
 */

'use client'

import React from 'react'
import { SwipeableCard, SwipePresets } from '../SwipeableCard'
import { InboxCard } from '../InboxCard'
import { EntityType } from '@/lib/entity-colors'

interface UnsortedItem {
  id: string
  text: string
  createdAt: Date | string
}

interface UnsortedInboxScreenProps {
  items: UnsortedItem[]
  onSort: (itemId: string, entityType: Exclude<EntityType, 'idea'>) => void
  onConvert: (itemId: string, entityType: Exclude<EntityType, 'idea'>) => void
  onDelete: (itemId: string) => void
  onAIAction: (itemId: string, action: 'sort' | 'convert' | 'full') => void
  defaultSwipeAction?: Exclude<EntityType, 'idea'>
  className?: string
}

export const UnsortedInboxScreen: React.FC<UnsortedInboxScreenProps> = ({
  items,
  onSort,
  onConvert,
  onDelete,
  onAIAction,
  defaultSwipeAction = 'task',
  className = '',
}) => {

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header Section */}
      <div className="retro-screen-header">
        <h1 className="retro-header">
          UNSORTED ({items.length})
        </h1>
      </div>

      {/* Content Area */}
      <div className="retro-screen-content">
        {items.length === 0 ? (
          // Empty State
          <div className="retro-empty">
            <div className="retro-empty-icon">✓</div>
            <h2 className="retro-empty-title">
              All caught up!
            </h2>
            <p className="retro-empty-message">
              No items to process
            </p>
          </div>
        ) : (
          // Items List
          <div className="space-y-3">
            {items.map((item) => (
              <SwipeableCard
                key={item.id}
                onSwipeLeft={() => onDelete(item.id)}
                onSwipeRight={() => onSort(item.id, defaultSwipeAction)}
                rightActionEntityType={defaultSwipeAction}
                rightActionIcon="✓"
                leftActionIcon="🗑️"
              >
                <InboxCard
                  id={item.id}
                  text={item.text}
                  createdAt={item.createdAt}
                  onSort={(entityType) => onSort(item.id, entityType)}
                  onConvert={(entityType) => onConvert(item.id, entityType)}
                  onAIAction={(action) => onAIAction(item.id, action)}
                />
              </SwipeableCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

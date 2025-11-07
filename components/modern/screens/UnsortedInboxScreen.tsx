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
  const getSwipeActionColor = (): string => {
    const colors: Record<string, string> = {
      task: '#4A90E2',
      note: '#F5A623',
      project: '#7ED321',
      list: '#BD10E0',
    }
    return colors[defaultSwipeAction] || '#4A90E2'
  }

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Screen Title with Count */}
      <div className="px-4 py-6">
        <h1 className="text-screen-title font-bold text-[var(--text-primary)]">
          Unsorted ({items.length})
        </h1>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="text-6xl mb-4 opacity-30">✓</div>
            <h2 className="text-card-header font-semibold text-secondary mb-2">
              All caught up!
            </h2>
            <p className="text-secondary text-sm">
              No items to process
            </p>
          </div>
        ) : (
          // Items List
          <div className="space-y-3 pb-4">
            {items.map((item) => (
              <SwipeableCard
                key={item.id}
                onSwipeLeft={() => onDelete(item.id)}
                onSwipeRight={() => onSort(item.id, defaultSwipeAction)}
                rightActionColor={getSwipeActionColor()}
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

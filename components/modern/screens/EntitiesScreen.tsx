/**
 * Entities Screen Component
 *
 * Shows all converted entities with filtering:
 * - Screen title: "Entities"
 * - Filter chips: [All] [Tasks] [Notes] [Projects] [Lists]
 * - Horizontal scroll chips with active state
 * - List of EntityCard components with swipe gestures
 * - Swipe left: Delete
 * - Swipe right: Configurable per entity type (complete, archive, etc.)
 * - Empty state per filter
 * - Tap card to open edit modal
 */

'use client'

import React, { useState } from 'react'
import { SwipeableCard } from '../SwipeableCard'
import { EntityCard } from '../EntityCard'
import { EntityType, getEntityColor } from '@/lib/entity-colors'
import { motion } from 'framer-motion'

export type EntityFilter = 'all' | 'task' | 'note' | 'project' | 'list'

interface Entity {
  id: string
  title: string
  entityType: Exclude<EntityType, 'idea'>
  metadata?: {
    dueDate?: string
    status?: string
    priority?: number
    itemCount?: number
    progress?: number
  }
  tags?: string[]
  createdAt: Date | string
}

interface EntitiesScreenProps {
  entities: Entity[]
  onEntityTap: (entityId: string) => void
  onDelete: (entityId: string) => void
  onSwipeRightAction: (entityId: string, entityType: Exclude<EntityType, 'idea'>) => void
  className?: string
}

export const EntitiesScreen: React.FC<EntitiesScreenProps> = ({
  entities,
  onEntityTap,
  onDelete,
  onSwipeRightAction,
  className = '',
}) => {
  const [activeFilter, setActiveFilter] = useState<EntityFilter>('all')

  // Filter chips configuration
  const filters: Array<{
    id: EntityFilter
    label: string
    color: string
  }> = [
    { id: 'all', label: 'All', color: '#6C757D' },
    { id: 'task', label: 'Tasks', color: '#4A90E2' },
    { id: 'note', label: 'Notes', color: '#F5A623' },
    { id: 'project', label: 'Projects', color: '#7ED321' },
    { id: 'list', label: 'Lists', color: '#BD10E0' },
  ]

  // Filter entities based on active filter
  const filteredEntities = activeFilter === 'all'
    ? entities
    : entities.filter((e) => e.entityType === activeFilter)

  // Count entities by type for badge display
  const getCounts = () => {
    const counts = {
      all: entities.length,
      task: entities.filter((e) => e.entityType === 'task').length,
      note: entities.filter((e) => e.entityType === 'note').length,
      project: entities.filter((e) => e.entityType === 'project').length,
      list: entities.filter((e) => e.entityType === 'list').length,
    }
    return counts
  }

  const counts = getCounts()

  // Get swipe action icon and color per entity type
  const getSwipeConfig = (entityType: Exclude<EntityType, 'idea'>) => {
    const configs: Record<string, { icon: string; color: string }> = {
      task: { icon: '✓', color: '#4CAF50' }, // Complete
      note: { icon: '📦', color: '#6C757D' }, // Archive
      project: { icon: '▶', color: '#4A90E2' }, // Mark active
      list: { icon: '⎘', color: '#BD10E0' }, // Duplicate
    }
    return configs[entityType] || { icon: '✓', color: '#6C757D' }
  }

  // Get empty state message
  const getEmptyMessage = () => {
    const messages: Record<EntityFilter, { icon: string; title: string; subtitle: string }> = {
      all: {
        icon: '📦',
        title: 'No entities yet',
        subtitle: 'Start capturing ideas!',
      },
      task: {
        icon: '✓',
        title: 'No Tasks yet',
        subtitle: 'Capture your first one',
      },
      note: {
        icon: '📝',
        title: 'No Notes yet',
        subtitle: 'Capture your first one',
      },
      project: {
        icon: '🚀',
        title: 'No Projects yet',
        subtitle: 'Capture your first one',
      },
      list: {
        icon: '📋',
        title: 'No Lists yet',
        subtitle: 'Capture your first one',
      },
    }
    return messages[activeFilter]
  }

  const emptyMessage = getEmptyMessage()

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
      {/* Screen Title */}
      <div className="px-4 py-6">
        <h1 className="text-screen-title font-bold text-[var(--text-primary)]">
          Entities
        </h1>
      </div>

      {/* Filter Chips */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id
            const count = counts[filter.id as keyof typeof counts]

            return (
              <motion.button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className="h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all"
                style={
                  isActive
                    ? {
                        backgroundColor: filter.color,
                        color: 'white',
                        border: 'none',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }
                }
                whileTap={{ scale: 0.95 }}
              >
                {filter.label} {count > 0 && `(${count})`}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto px-4">
        {filteredEntities.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="text-6xl mb-4 opacity-30">{emptyMessage.icon}</div>
            <h2 className="text-card-header font-semibold text-secondary mb-2">
              {emptyMessage.title}
            </h2>
            <p className="text-secondary text-sm">{emptyMessage.subtitle}</p>
          </div>
        ) : (
          // Entities List
          <div className="space-y-3 pb-4">
            {filteredEntities.map((entity) => {
              const swipeConfig = getSwipeConfig(entity.entityType)

              return (
                <SwipeableCard
                  key={entity.id}
                  onSwipeLeft={() => onDelete(entity.id)}
                  onSwipeRight={() => onSwipeRightAction(entity.id, entity.entityType)}
                  rightActionColor={swipeConfig.color}
                  rightActionIcon={swipeConfig.icon}
                  leftActionIcon="🗑️"
                >
                  <EntityCard
                    id={entity.id}
                    title={entity.title}
                    entityType={entity.entityType}
                    metadata={entity.metadata}
                    tags={entity.tags}
                    createdAt={entity.createdAt}
                    onTap={() => onEntityTap(entity.id)}
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

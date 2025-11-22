/**
 * Entities Screen Component
 *
 * Shows all converted entities with filtering:
 * - Screen title: "Entities"
 * - Filter chips: [All] [Tasks] [Notes] [Projects] [Lists]
 * - Horizontal scroll chips with active state
 * - Tag filter chips with colors from tags table
 * - List of EntityCard components with swipe gestures
 * - Swipe left: Delete
 * - Swipe right: Configurable per entity type (complete, archive, etc.)
 * - Empty state per filter
 * - Tap card to open edit modal
 */

'use client'

import React, { useState, useEffect } from 'react'
import { SwipeableCard } from '../SwipeableCard'
import { EntityCard } from '../EntityCard'
import { EntityType, getEntityColor } from '@/lib/entity-colors'
import { motion } from 'framer-motion'

interface TagInfo {
  name: string
  count: number
  color: string
  category: string
}

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
  tagsEnabled?: boolean
}

export const EntitiesScreen: React.FC<EntitiesScreenProps> = ({
  entities,
  onEntityTap,
  onDelete,
  onSwipeRightAction,
  className = '',
  tagsEnabled = true,
}) => {
  const [activeFilter, setActiveFilter] = useState<EntityFilter>('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([])
  const [loadingTags, setLoadingTags] = useState(true)

  // Fetch available tags from API
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags')
        const data = await response.json()
        if (data.success) {
          setAvailableTags(data.tags || [])
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error)
      } finally {
        setLoadingTags(false)
      }
    }
    fetchTags()
  }, [])

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

  // Filter entities based on active filter and selected tags
  const filteredEntities = entities.filter((entity) => {
    // First filter by entity type
    const matchesEntityFilter = activeFilter === 'all' || entity.entityType === activeFilter

    // Then filter by tags (AND logic - entity must have ALL selected tags)
    const matchesTags = selectedTags.length === 0 ||
      (entity.tags && selectedTags.every(tag => entity.tags!.includes(tag)))

    return matchesEntityFilter && matchesTags
  })

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

  // Get swipe action icon per entity type (color handled by retro classes)
  const getSwipeConfig = (entityType: Exclude<EntityType, 'idea'>) => {
    const configs: Record<string, { icon: string }> = {
      task: { icon: '✓' }, // Complete
      note: { icon: '📦' }, // Archive
      project: { icon: '▶' }, // Mark active
      list: { icon: '⎘' }, // Duplicate
    }
    return configs[entityType] || { icon: '✓' }
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

  // Tag filter handlers
  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    )
  }

  const clearTagFilters = () => {
    setSelectedTags([])
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Entity Type Filter Chips */}
      <div className="retro-filter-chips">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id
          const count = counts[filter.id as keyof typeof counts]

          return (
            <motion.button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`retro-chip ${isActive ? 'active' : ''}`}
              whileTap={{ scale: 0.95 }}
            >
              {filter.label} {count > 0 && `(${count})`}
            </motion.button>
          )
        })}
      </div>

      {/* Tag Filter Chips */}
      {tagsEnabled && availableTags.length > 0 && (
        <div className="retro-tag-filter-section">
          <div className="retro-tag-filter-header">
            <span className="retro-tag-filter-label">FILTER BY TAGS:</span>
            {selectedTags.length > 0 && (
              <button
                className="retro-tag-clear-btn"
                onClick={clearTagFilters}
              >
                CLEAR ALL
              </button>
            )}
          </div>
          <div className="retro-tag-filter-chips">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name)
              return (
                <motion.button
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  className={`retro-tag-chip ${isSelected ? 'active' : ''}`}
                  style={{
                    borderColor: isSelected ? tag.color : undefined,
                    backgroundColor: isSelected ? `${tag.color}20` : undefined,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tag.name} ({tag.count})
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtered Results Count */}
      {selectedTags.length > 0 && (
        <div className="retro-filter-results">
          Showing {filteredEntities.length} result{filteredEntities.length !== 1 ? 's' : ''} with {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Content Area */}
      <div className="retro-screen-content">
        {filteredEntities.length === 0 ? (
          // Empty State
          <div className="retro-empty">
            <div className="retro-empty-icon">{emptyMessage.icon}</div>
            <h2 className="retro-empty-title">
              {emptyMessage.title}
            </h2>
            <p className="retro-empty-message">{emptyMessage.subtitle}</p>
          </div>
        ) : (
          // Entities List
          <div className="space-y-3">
            {filteredEntities.map((entity) => {
              const swipeConfig = getSwipeConfig(entity.entityType)

              return (
                <SwipeableCard
                  key={entity.id}
                  onSwipeLeft={() => onDelete(entity.id)}
                  onSwipeRight={() => onSwipeRightAction(entity.id, entity.entityType)}
                  rightActionEntityType={entity.entityType}
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

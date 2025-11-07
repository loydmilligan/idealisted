/**
 * Entity Card Component (Converted Entities)
 *
 * Card design for fully converted entities in Entities tab:
 * - White background
 * - Full-opacity colored stripe (4pt on left)
 * - Entity title and metadata
 * - Tags display
 * - Tap to open edit modal
 * - Swipe gestures configurable per entity type
 */

'use client'

import React from 'react'
import { EntityType, getEntityColor } from '@/lib/entity-colors'
import { formatDistanceToNow } from 'date-fns'

interface EntityMetadata {
  dueDate?: string
  status?: string
  priority?: number
  itemCount?: number
  progress?: number
}

interface EntityCardProps {
  id: string
  title: string
  entityType: Exclude<EntityType, 'idea'>
  metadata?: EntityMetadata
  tags?: string[]
  createdAt: Date | string
  onTap: () => void
  className?: string
}

export const EntityCard: React.FC<EntityCardProps> = ({
  id,
  title,
  entityType,
  metadata = {},
  tags = [],
  createdAt,
  onTap,
  className = '',
}) => {
  const timestamp = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })

  // Get entity color (full brightness)
  const entityColor = getEntityColor(entityType, 'bright')

  // Format metadata display based on entity type
  const getMetadataDisplay = (): string => {
    const parts: string[] = []

    if (entityType === 'task') {
      if (metadata.status) parts.push(metadata.status)
      if (metadata.dueDate) {
        const dueDate = new Date(metadata.dueDate)
        parts.push(`Due: ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      }
    } else if (entityType === 'project') {
      if (metadata.status) parts.push(metadata.status)
      if (metadata.progress !== undefined) parts.push(`${metadata.progress}% complete`)
    } else if (entityType === 'list') {
      if (metadata.itemCount) parts.push(`${metadata.itemCount} items`)
    }

    return parts.join(' • ')
  }

  const metadataDisplay = getMetadataDisplay()

  // Capitalize entity type for display
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  return (
    <div
      onClick={onTap}
      className={`modern-card relative bg-white dark:bg-[#2a2a2a] border border-[var(--border-color)] rounded-xl p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow ${className}`}
    >
      {/* Full-opacity colored stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{
          backgroundColor: entityColor,
        }}
      />

      {/* Content with left padding for stripe */}
      <div className="pl-2">
        {/* Entity Title */}
        <h3 className="text-body font-medium mb-1 leading-normal">{title}</h3>

        {/* Metadata Row */}
        {metadataDisplay && (
          <p className="text-secondary text-sm mb-1">{metadataDisplay}</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  color: entityColor,
                  backgroundColor: `${entityColor}20`,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Entity Type & Timestamp */}
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span
            className="font-medium"
            style={{ color: entityColor }}
          >
            {entityLabel}
          </span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Entity Card Component (Converted Entities)
 *
 * Card design for fully converted entities in Entities tab:
 * - Retro Palm Pilot styling with entity-colored left border (2px)
 * - Entity title and metadata
 * - Tags display
 * - Tap to open edit modal
 * - Swipe gestures configurable per entity type
 */

'use client'

import React from 'react'
import { EntityType } from '@/lib/entity-colors'
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
      className={`retro-card retro-card-${entityType} ${className}`}
    >
      {/* Entity Title */}
      <h3 className="retro-item-title mb-1">{title}</h3>

      {/* Metadata Row */}
      {metadataDisplay && (
        <p className="retro-timestamp mb-1">{metadataDisplay}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 rounded bg-[var(--retro-bg-secondary)] text-[var(--retro-text-primary)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Entity Type & Timestamp */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`retro-entity-badge retro-entity-badge-${entityType}`}>
          {entityLabel}
        </span>
        <span className="retro-timestamp">•</span>
        <span className="retro-timestamp">{timeAgo}</span>
      </div>
    </div>
  )
}

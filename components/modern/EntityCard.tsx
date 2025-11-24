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
  onTaskToggle?: (nextStatus: 'pending' | 'completed') => void
  accentColor?: string
  backgroundColor?: string
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
  onTaskToggle,
  accentColor,
  backgroundColor,
  className = '',
}) => {
  const timestamp = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })

  // Get status badge configuration
  const getStatusBadge = () => {
    if (entityType !== 'task' || !metadata.status) return null

    const statusConfig = {
      pending: { icon: '○', label: 'Pending', class: 'status-pending' },
      in_progress: { icon: '◐', label: 'In Progress', class: 'status-in-progress' },
      completed: { icon: '●', label: 'Completed', class: 'status-completed' },
    }

    return statusConfig[metadata.status as keyof typeof statusConfig]
  }

  // Format metadata display based on entity type
  const getMetadataDisplay = (): string => {
    const parts: string[] = []

    if (entityType === 'task') {
      // Status shown separately as badge, not in text
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

  const statusBadge = getStatusBadge()
  const metadataDisplay = getMetadataDisplay()

  // Capitalize entity type for display
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  const isCompletedTask = entityType === 'task' && metadata.status === 'completed'

  return (
    <div
      onClick={onTap}
      className={`retro-card retro-card-${entityType} ${className}`}
      style={{
        borderLeft: `4px solid ${accentColor || ''}`,
        background: backgroundColor,
        opacity: isCompletedTask ? 0.6 : 1,
        textDecoration: isCompletedTask ? 'line-through' : 'none',
      }}
    >
      {/* Entity Title with Status Badge for Tasks */}
      <div className="flex items-center gap-2 mb-1">
        <h3 className="retro-item-title flex-1">{title}</h3>
        {statusBadge && (
          <span className={`retro-status-badge ${statusBadge.class}`}>
            <span className="retro-status-icon">{statusBadge.icon}</span>
            <span className="retro-status-label">{statusBadge.label}</span>
          </span>
        )}
        {entityType === 'task' && onTaskToggle && (
          <input
            type="checkbox"
            className="retro-checkbox"
            checked={metadata.status === 'completed'}
            onClick={(e) => {
              e.stopPropagation()
            }}
            onChange={() => onTaskToggle(metadata.status === 'completed' ? 'pending' : 'completed')}
          />
        )}
      </div>

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

/**
 * Swipeable Card Component
 *
 * Provides swipe gestures for card interactions:
 * - Swipe Left: Delete (retro red-tinted green background)
 * - Swipe Right: Configurable action (entity-specific retro colors)
 *
 * Features:
 * - Smooth gesture tracking with spring physics
 * - Reveal backgrounds with icons
 * - Completion threshold: 50% of card width
 * - Rubber-banding at limits
 * - 200ms animation on action completion
 * - Retro Palm Pilot color scheme
 */

'use client'

import React, { useRef } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'

export type SwipeAction = 'delete' | 'sort' | 'convert' | 'complete' | 'archive'
export type EntityType = 'task' | 'note' | 'project' | 'list'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  rightActionEntityType?: EntityType // Entity type for retro color theming
  rightActionIcon?: React.ReactNode
  leftActionIcon?: React.ReactNode
  disabled?: boolean
  className?: string
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  rightActionEntityType = 'task', // Default to task
  rightActionIcon = '✓',
  leftActionIcon = '🗑️',
  disabled = false,
  className = '',
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)

  // Transform for revealing backgrounds
  const leftRevealOpacity = useTransform(x, [-100, 0], [1, 0])
  const rightRevealOpacity = useTransform(x, [0, 100], [0, 1])

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = cardRef.current ? cardRef.current.offsetWidth * 0.5 : 150

    if (Math.abs(info.offset.x) > threshold) {
      // Action triggered!
      if (info.offset.x < 0 && onSwipeLeft) {
        // Swipe left - delete
        onSwipeLeft()
      } else if (info.offset.x > 0 && onSwipeRight) {
        // Swipe right - configurable action
        onSwipeRight()
      }
    }
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  // Get retro swipe action class for entity type
  const getRightActionClass = () => {
    return `retro-swipe-action-bg-${rightActionEntityType}`
  }

  return (
    <div ref={cardRef} className={`relative overflow-hidden ${className}`}>
      {/* Left Reveal Background (Delete - Retro Red-tinted Green) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6 retro-swipe-delete-bg"
        style={{
          opacity: leftRevealOpacity,
        }}
      >
        <span className="text-2xl" role="img" aria-label="Delete">
          {leftActionIcon}
        </span>
      </motion.div>

      {/* Right Reveal Background (Action - Entity-specific Retro Color) */}
      <motion.div
        className={`absolute inset-0 flex items-center justify-start pl-6 ${getRightActionClass()}`}
        style={{
          opacity: rightRevealOpacity,
        }}
      >
        <span className="text-2xl" role="img" aria-label="Action">
          {rightActionIcon}
        </span>
      </motion.div>

      {/* Draggable Card Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-white dark:bg-[#2a2a2a] cursor-grab active:cursor-grabbing"
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// Preset configurations for different swipe actions
export const SwipePresets = {
  deleteOnly: {
    onSwipeLeft: (deleteFn: () => void) => deleteFn(),
    onSwipeRight: undefined,
  },
  deleteAndSort: (deleteFn: () => void, sortFn: () => void, entityType: EntityType = 'task') => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: sortFn,
    rightActionEntityType: entityType,
    rightActionIcon: '✓',
  }),
  deleteAndConvert: (deleteFn: () => void, convertFn: () => void, entityType: EntityType = 'project') => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: convertFn,
    rightActionEntityType: entityType,
    rightActionIcon: '→',
  }),
  deleteAndComplete: (deleteFn: () => void, completeFn: () => void, entityType: EntityType = 'task') => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: completeFn,
    rightActionEntityType: entityType,
    rightActionIcon: '✓',
  }),
  deleteAndArchive: (deleteFn: () => void, archiveFn: () => void, entityType: EntityType = 'note') => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: archiveFn,
    rightActionEntityType: entityType,
    rightActionIcon: '📦',
  }),
}

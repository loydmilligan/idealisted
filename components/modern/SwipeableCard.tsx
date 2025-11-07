/**
 * Swipeable Card Component
 *
 * Provides swipe gestures for card interactions:
 * - Swipe Left: Delete (red background with trash icon)
 * - Swipe Right: Configurable action (entity color or AI blue)
 *
 * Features:
 * - Smooth gesture tracking with spring physics
 * - Reveal backgrounds with icons
 * - Completion threshold: 50% of card width
 * - Rubber-banding at limits
 * - 200ms animation on action completion
 */

'use client'

import React, { useRef } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'

export type SwipeAction = 'delete' | 'sort' | 'convert' | 'complete' | 'archive'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  rightActionColor?: string
  rightActionIcon?: React.ReactNode
  leftActionIcon?: React.ReactNode
  disabled?: boolean
  className?: string
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  rightActionColor = '#4A90E2', // Default to task blue
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

  return (
    <div ref={cardRef} className={`relative overflow-hidden ${className}`}>
      {/* Left Reveal Background (Delete - Red) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-6"
        style={{
          backgroundColor: '#E74C3C',
          opacity: leftRevealOpacity,
        }}
      >
        <span className="text-white text-2xl" role="img" aria-label="Delete">
          {leftActionIcon}
        </span>
      </motion.div>

      {/* Right Reveal Background (Action - Entity Color or AI Blue) */}
      <motion.div
        className="absolute inset-0 flex items-center justify-start pl-6"
        style={{
          backgroundColor: rightActionColor,
          opacity: rightRevealOpacity,
        }}
      >
        <span className="text-white text-2xl" role="img" aria-label="Action">
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
  deleteAndSort: (deleteFn: () => void, sortFn: () => void) => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: sortFn,
    rightActionColor: '#4A90E2', // Task blue
    rightActionIcon: '✓',
  }),
  deleteAndConvert: (deleteFn: () => void, convertFn: () => void) => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: convertFn,
    rightActionColor: '#7ED321', // Project green
    rightActionIcon: '→',
  }),
  deleteAndComplete: (deleteFn: () => void, completeFn: () => void) => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: completeFn,
    rightActionColor: '#4CAF50', // Success green
    rightActionIcon: '✓',
  }),
  deleteAndArchive: (deleteFn: () => void, archiveFn: () => void) => ({
    onSwipeLeft: deleteFn,
    onSwipeRight: archiveFn,
    rightActionColor: '#6C757D', // Gray
    rightActionIcon: '📦',
  }),
}

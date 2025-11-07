/**
 * Badge Component for Tab Counts
 *
 * Displays count on tabs with animation on increment
 * 18pt diameter red circle with white text
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface TabBadgeProps {
  count: number
  className?: string
}

export const TabBadge: React.FC<TabBadgeProps> = ({ count, className = '' }) => {
  const [prevCount, setPrevCount] = useState(count)

  useEffect(() => {
    setPrevCount(count)
  }, [count])

  // Don't render if count is 0
  if (!count || count === 0) return null

  // Animate on increment only
  const shouldAnimate = count > prevCount

  // Format count (max 99+)
  const displayCount = count > 99 ? '99+' : count.toString()

  return (
    <motion.div
      key={count}
      initial={false}
      animate={shouldAnimate ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`absolute -top-1 -right-1 bg-[#DC3545] text-white text-[12pt] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${className}`}
      style={{
        lineHeight: 1,
        fontSize: '12pt',
      }}
    >
      {displayCount}
    </motion.div>
  )
}

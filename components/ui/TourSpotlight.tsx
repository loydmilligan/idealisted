/**
 * Tour Spotlight Component
 *
 * Full-screen SVG overlay with mask cutout for highlighted element.
 * Features:
 * - Semi-transparent dark overlay (dims non-highlighted areas)
 * - SVG mask creates cutout around target element
 * - Animated pulsing border around spotlight
 * - Click blocking on dimmed areas
 * - Fade-in animation (300ms)
 */

'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface TourSpotlightProps {
  targetElement: HTMLElement | null
  isActive: boolean
  padding?: number  // Extra space around target (default: 12px)
  onClose?: () => void
}

export const TourSpotlight: React.FC<TourSpotlightProps> = ({
  targetElement,
  isActive,
  padding = 12,
  onClose,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  // Update target rect when element or window size changes
  useEffect(() => {
    if (!targetElement || !isActive) {
      setTargetRect(null)
      return
    }

    const updateRect = () => {
      const rect = targetElement.getBoundingClientRect()
      setTargetRect(rect)
    }

    // Initial calculation
    updateRect()

    // Recalculate on resize (debounced via requestAnimationFrame)
    let rafId: number
    const handleResize = () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(updateRect)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true) // Capture phase for all scrolls

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [targetElement, isActive])

  // Close on Escape key
  useEffect(() => {
    if (!isActive || !onClose) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isActive, onClose])

  if (!isActive || !targetRect) {
    return null
  }

  const spotlightX = targetRect.x - padding
  const spotlightY = targetRect.y - padding
  const spotlightWidth = targetRect.width + padding * 2
  const spotlightHeight = targetRect.height + padding * 2

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            pointerEvents: 'none', // Allow clicks to pass through to tooltip
          }}
          aria-hidden="true"
        >
          <svg
            width="100%"
            height="100%"
            style={{
              position: 'absolute',
              inset: 0,
            }}
          >
            <defs>
              {/* Mask: white = visible, black = hidden (cutout) */}
              <mask id="spotlight-mask">
                {/* Full screen white rectangle (everything dimmed) */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black cutout rectangle (highlighted area) */}
                <rect
                  x={spotlightX}
                  y={spotlightY}
                  width={spotlightWidth}
                  height={spotlightHeight}
                  rx={8}
                  fill="black"
                />
              </mask>
            </defs>

            {/* Dimmed overlay with mask applied */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="var(--palm-overlay)"
              mask="url(#spotlight-mask)"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                e.stopPropagation()
                // Click on dimmed area does nothing (blocked)
              }}
            />

            {/* Pulsing border around highlighted area */}
            <rect
              x={spotlightX}
              y={spotlightY}
              width={spotlightWidth}
              height={spotlightHeight}
              rx={8}
              fill="none"
              stroke="var(--palm-border-light)"
              strokeWidth={3}
              className="tour-spotlight-border"
              style={{
                animation: 'tour-spotlight-pulse 2s ease-in-out infinite',
              }}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

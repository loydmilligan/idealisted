/**
 * Tour Tooltip Component
 *
 * Retro-styled content card displaying tour step information.
 * Features:
 * - Smart positioning algorithm (top/bottom/left/right with fallbacks)
 * - Step counter and navigation buttons
 * - Retro design system integration
 * - Stagger animation (200ms after spotlight)
 * - Responsive positioning with viewport edge detection
 */

'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TourStep, calculateTooltipPosition, Position } from '@/lib/tour-utils'

interface TourTooltipProps {
  step: TourStep
  stepNumber: number
  totalSteps: number
  targetRect: DOMRect | null
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  step,
  stepNumber,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, placement: 'center' })
  const [isVisible, setIsVisible] = useState(false)

  // Calculate tooltip position when target or step changes
  useEffect(() => {
    if (!tooltipRef.current) return

    const updatePosition = () => {
      const tooltipRect = tooltipRef.current!.getBoundingClientRect()

      if (targetRect) {
        const newPosition = calculateTooltipPosition(
          targetRect,
          tooltipRect.width,
          tooltipRect.height,
          step.placement
        )
        setPosition(newPosition)
      } else {
        // Fallback: center of viewport if no target
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        setPosition({
          top: (viewportHeight / 2) - (tooltipRect.height / 2),
          left: (viewportWidth / 2) - (tooltipRect.width / 2),
          placement: 'center'
        })
      }
      setIsVisible(true)
    }

    // Small delay to ensure tooltip is rendered and has dimensions
    const timeoutId = setTimeout(updatePosition, 50)

    // Recalculate on resize (debounced)
    let rafId: number
    const handleResize = () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(updatePosition)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [targetRect, step])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          if (!isLastStep) {
            e.preventDefault()
            onNext()
          }
          break
        case 'ArrowLeft':
          if (!isFirstStep) {
            e.preventDefault()
            onPrev()
          }
          break
        case 'Escape':
          e.preventDefault()
          onSkip()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [isFirstStep, isLastStep, onNext, onPrev, onSkip])

  // Memoize step counter text
  const stepCounter = useMemo(
    () => `Step ${stepNumber} of ${totalSteps}`,
    [stepNumber, totalSteps]
  )

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={tooltipRef}
        key={step.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.95 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          delay: 0.2, // Stagger 200ms after spotlight
          type: 'spring',
          damping: 25,
          stiffness: 200,
        }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 2001,
          pointerEvents: 'auto',
          maxWidth: 'calc(100vw - 32px)',
          width: '360px',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-tooltip-title"
        aria-describedby="tour-tooltip-description"
      >
        {/* Retro card container */}
        <div
          className="retro-card"
          style={{
            background: 'var(--palm-bg-primary)',
            border: '2px solid var(--palm-border-dark)',
            boxShadow: '4px 4px 0 var(--palm-border-dark)',
            padding: 0,
          }}
        >
          {/* Header */}
          <div
            className="retro-sheet-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--palm-screen-dark)',
              color: 'var(--palm-text-light)',
              padding: '12px 16px',
              borderBottom: '2px solid var(--palm-border-dark)',
            }}
          >
            <h3
              id="tour-tooltip-title"
              className="retro-header"
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              {step.title}
            </h3>
            <button
              onClick={onSkip}
              className="retro-close-btn"
              aria-label="Skip tour"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--palm-text-light)',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div
            className="retro-sheet-content"
            style={{
              padding: '16px',
            }}
          >
            <p
              id="tour-tooltip-description"
              className="retro-description"
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'var(--palm-text-primary)',
                margin: 0,
              }}
            >
              {step.description}
            </p>
          </div>

          {/* Footer - Step counter and navigation */}
          <div
            className="retro-sheet-actions"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '12px 16px',
              borderTop: '1px solid var(--palm-border-light)',
              background: 'var(--palm-screen-base)',
            }}
          >
            {/* Step counter */}
            <div
              className="retro-meta"
              style={{
                fontSize: '11px',
                textAlign: 'center',
                color: 'var(--palm-text-secondary)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.5px',
              }}
            >
              {stepCounter}
            </div>

            {/* Navigation buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between',
              }}
            >
              {/* Back button */}
              <button
                onClick={onPrev}
                disabled={isFirstStep}
                className="retro-btn retro-btn-secondary"
                style={{
                  flex: 1,
                  opacity: isFirstStep ? 0.4 : 1,
                  cursor: isFirstStep ? 'not-allowed' : 'pointer',
                }}
                aria-label="Previous step"
              >
                BACK
              </button>

              {/* Next/Finish button */}
              <button
                onClick={isLastStep ? onSkip : onNext}
                className="retro-btn retro-btn-primary"
                style={{ flex: 1 }}
                aria-label={isLastStep ? 'Finish tour' : 'Next step'}
              >
                {isLastStep ? 'FINISH' : 'NEXT'}
              </button>

              {/* Skip button (only show if not last step) */}
              {!isLastStep && (
                <button
                  onClick={onSkip}
                  className="retro-btn retro-btn-secondary"
                  style={{
                    flex: 0.8,
                    fontSize: '11px',
                  }}
                  aria-label="Skip tour"
                >
                  SKIP
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Placement indicator arrow (optional visual enhancement) */}
        {position.placement !== 'center' && (
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              borderStyle: 'solid',
              ...(position.placement === 'bottom' && {
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '0 8px 8px 8px',
                borderColor: 'transparent transparent var(--palm-border-dark) transparent',
              }),
              ...(position.placement === 'top' && {
                bottom: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderWidth: '8px 8px 0 8px',
                borderColor: 'var(--palm-border-dark) transparent transparent transparent',
              }),
              ...(position.placement === 'right' && {
                left: '-8px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '8px 8px 8px 0',
                borderColor: 'transparent var(--palm-border-dark) transparent transparent',
              }),
              ...(position.placement === 'left' && {
                right: '-8px',
                top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: '8px 0 8px 8px',
                borderColor: 'transparent transparent transparent var(--palm-border-dark)',
              }),
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

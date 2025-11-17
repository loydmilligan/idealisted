/**
 * Tour Example Component
 *
 * Demonstrates how to use the TourSpotlight and TourTooltip components
 * for creating an interactive onboarding tour.
 *
 * USAGE EXAMPLE:
 *
 * import { TourExample } from '@/components/ui/TourExample'
 *
 * function MyApp() {
 *   const [showTour, setShowTour] = useState(false)
 *
 *   return (
 *     <>
 *       <button onClick={() => setShowTour(true)}>Start Tour</button>
 *       <TourExample isOpen={showTour} onClose={() => setShowTour(false)} />
 *     </>
 *   )
 * }
 */

'use client'

import React, { useState, useEffect } from 'react'
import { TourSpotlight } from './TourSpotlight'
import { TourTooltip } from './TourTooltip'
import { TourStep, getTargetElement, scrollToTarget, isElementVisible } from '@/lib/tour-utils'

interface TourExampleProps {
  isOpen: boolean
  onClose: () => void
  steps?: TourStep[]
}

// Default tour steps for demonstration
const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'capture-input',
    title: 'Capture Ideas',
    description: 'Start by typing or speaking your ideas into this input field. Ideas are the raw material for your productivity.',
    targetSelector: '[data-tour-id="capture-textarea"]', // Add this to your capture input
    placement: 'bottom'
  },
  {
    id: 'unsorted-tab',
    title: 'Unsorted Queue',
    description: 'New ideas land here. Review and sort them into tasks, notes, projects, or lists.',
    targetSelector: '[data-tour-id="unsorted-tab"]',
    placement: 'top'
  },
  {
    id: 'ready-tab',
    title: 'Ready to Process',
    description: 'Items you\'ve marked for processing appear here. This is your action queue.',
    targetSelector: '[data-tour-id="ready-tab"]',
    placement: 'top'
  },
  {
    id: 'files-tab',
    title: 'All Files',
    description: 'Browse all your organized items by type. Filter and search to find what you need.',
    targetSelector: '[data-tour-id="files-tab"]',
    placement: 'top'
  },
  {
    id: 'settings-button',
    title: 'Settings',
    description: 'Configure AI features, notifications, and other preferences here.',
    targetSelector: '.retro-settings-btn',
    placement: 'left'
  }
]

export const TourExample: React.FC<TourExampleProps> = ({
  isOpen,
  onClose,
  steps = DEFAULT_TOUR_STEPS
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  // Find and scroll to target element when step changes
  useEffect(() => {
    if (!isOpen || !currentStep) return

    const element = getTargetElement(currentStep.targetSelector)

    if (element) {
      setTargetElement(element)

      // Scroll to element if not visible
      if (!isElementVisible(element)) {
        scrollToTarget(element)
      }

      // Update rect
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
    } else {
      console.warn(`Tour: Target element not found for selector: ${currentStep.targetSelector}`)
      setTargetElement(null)
      setTargetRect(null)
    }
  }, [isOpen, currentStep])

  // Prevent body scroll when tour is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    setCurrentStepIndex(0)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Spotlight overlay with cutout */}
      <TourSpotlight
        targetElement={targetElement}
        isActive={isOpen}
        padding={12}
        onClose={handleSkip}
      />

      {/* Tooltip with step content */}
      <TourTooltip
        step={currentStep}
        stepNumber={currentStepIndex + 1}
        totalSteps={steps.length}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
      />
    </>
  )
}

/**
 * HOW TO ADD TOUR TARGETING TO YOUR COMPONENTS:
 *
 * Method 1: Using data-tour-id attribute (recommended)
 * <textarea data-tour-id="capture-textarea" ... />
 *
 * Method 2: Using existing CSS classes
 * targetSelector: '.retro-settings-btn'
 *
 * Method 3: Using ID
 * targetSelector: '#my-element'
 *
 * CUSTOM TOUR STEPS EXAMPLE:
 *
 * const mySteps: TourStep[] = [
 *   {
 *     id: 'step1',
 *     title: 'Welcome',
 *     description: 'This is the first step of your tour.',
 *     targetSelector: '[data-tour-id="welcome"]',
 *     placement: 'bottom'
 *   },
 *   {
 *     id: 'step2',
 *     title: 'Features',
 *     description: 'Check out these amazing features!',
 *     targetSelector: '.feature-section',
 *     placement: 'right'
 *   }
 * ]
 *
 * <TourExample isOpen={true} onClose={handleClose} steps={mySteps} />
 */

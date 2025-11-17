/**
 * Tour Utilities
 *
 * Helper functions and type definitions for the interactive tour system
 */

export interface TourStep {
  id: string
  title: string
  description: string
  targetSelector: string  // CSS selector for element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export interface Position {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

/**
 * Calculate optimal tooltip position relative to target element
 *
 * @param targetRect - DOMRect of the highlighted element
 * @param tooltipWidth - Width of the tooltip element
 * @param tooltipHeight - Height of the tooltip element
 * @param preferredPlacement - Preferred position (optional)
 * @returns Position object with top, left, and actual placement
 */
export function calculateTooltipPosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
): Position {
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const gap = 16 // Space between tooltip and target (--space-lg)
  const edgeMargin = 16 // Margin from viewport edges

  // Calculate available space in each direction
  const spaceAbove = targetRect.top
  const spaceBelow = viewportHeight - targetRect.bottom
  const spaceLeft = targetRect.left
  const spaceRight = viewportWidth - targetRect.right

  let placement: 'top' | 'bottom' | 'left' | 'right' | 'center' = preferredPlacement || 'bottom'
  let top = 0
  let left = 0

  // Determine optimal placement based on available space
  if (preferredPlacement) {
    placement = preferredPlacement
  } else if (spaceBelow >= tooltipHeight + gap) {
    placement = 'bottom'
  } else if (spaceAbove >= tooltipHeight + gap) {
    placement = 'top'
  } else if (spaceRight >= tooltipWidth + gap) {
    placement = 'right'
  } else if (spaceLeft >= tooltipWidth + gap) {
    placement = 'left'
  } else {
    placement = 'center'
  }

  // Calculate position based on placement
  switch (placement) {
    case 'bottom':
      top = targetRect.bottom + gap
      left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)
      break

    case 'top':
      top = targetRect.top - tooltipHeight - gap
      left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)
      break

    case 'right':
      top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2)
      left = targetRect.right + gap
      break

    case 'left':
      top = targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2)
      left = targetRect.left - tooltipWidth - gap
      break

    case 'center':
      top = (viewportHeight / 2) - (tooltipHeight / 2)
      left = (viewportWidth / 2) - (tooltipWidth / 2)
      break
  }

  // Clamp to viewport bounds
  top = Math.max(edgeMargin, Math.min(top, viewportHeight - tooltipHeight - edgeMargin))
  left = Math.max(edgeMargin, Math.min(left, viewportWidth - tooltipWidth - edgeMargin))

  return { top, left, placement }
}

/**
 * Get target element from DOM using CSS selector
 *
 * @param selector - CSS selector or data-tour-id attribute
 * @returns HTMLElement or null if not found
 */
export function getTargetElement(selector: string): HTMLElement | null {
  // Try direct selector first
  let element = document.querySelector<HTMLElement>(selector)

  // If not found, try data-tour-id attribute
  if (!element && !selector.startsWith('[')) {
    element = document.querySelector<HTMLElement>(`[data-tour-id="${selector}"]`)
  }

  return element
}

/**
 * Scroll target element into view with smooth animation
 *
 * @param element - Element to scroll to
 * @param offset - Pixels to offset from top of viewport (default: 100)
 */
export function scrollToTarget(element: HTMLElement, offset = 100): void {
  const rect = element.getBoundingClientRect()
  const absoluteTop = window.scrollY + rect.top

  window.scrollTo({
    top: absoluteTop - offset,
    behavior: 'smooth'
  })
}

/**
 * Check if element is visible in viewport
 *
 * @param element - Element to check
 * @returns true if element is at least partially visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  return (
    rect.top < viewportHeight &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.right > 0
  )
}

/**
 * Debounce function for resize handlers
 *
 * @param func - Function to debounce
 * @param wait - Milliseconds to wait (default: 150)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait = 150
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

import { schedulerService } from './scheduler'

// Flag to ensure we only initialize once
let initialized = false

export function initializeServices() {
  if (initialized) {
    return
  }

  // Only run on server side
  if (typeof window !== 'undefined') {
    return
  }

  try {
    // Start the daily review scheduler
    schedulerService.start()

    console.log('[Init] Services initialized successfully')
    initialized = true
  } catch (error) {
    console.error('[Init] Failed to initialize services:', error)
  }
}

// Auto-initialize on import (server-side only)
initializeServices()

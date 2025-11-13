import { schedulerService } from './scheduler'

// Use global flag to survive hot-reloads in development
declare global {
  var __scheduler_initialized: boolean | undefined
}

export function initializeServices() {
  // Check global flag to prevent multiple initializations across hot-reloads
  if (global.__scheduler_initialized) {
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
    global.__scheduler_initialized = true
  } catch (error) {
    console.error('[Init] Failed to initialize services:', error)
  }
}

// Auto-initialize on import (server-side only)
initializeServices()

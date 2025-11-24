/**
 * lib/recap-config.ts
 *
 * Helper functions for reading Daily Recap configuration.
 * Used by scheduler/CRON jobs to determine recap behavior.
 */

import { db } from './db'
import { RecapConfig } from '@/types'

// Default configuration values
const DEFAULT_RECAP_CONFIG: RecapConfig = {
  enabled: true,
  mode: 'summary',
  threshold: 3
}

/**
 * Retrieves the full recap configuration from the database.
 * Returns defaults if not configured.
 */
export function getRecapConfig(): RecapConfig {
  try {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('recap_config') as { value: string } | undefined

    if (!result) {
      return DEFAULT_RECAP_CONFIG
    }

    const parsed = JSON.parse(result.value) as Partial<RecapConfig>

    // Merge with defaults to ensure all fields are present
    return {
      enabled: parsed.enabled ?? DEFAULT_RECAP_CONFIG.enabled,
      mode: parsed.mode ?? DEFAULT_RECAP_CONFIG.mode,
      threshold: parsed.threshold ?? DEFAULT_RECAP_CONFIG.threshold
    }
  } catch (error) {
    console.error('Failed to load recap config:', error)
    return DEFAULT_RECAP_CONFIG
  }
}

/**
 * Gets the current recap mode setting.
 * @returns 'summary' for bullet points summary, 'quote' for inspirational quote/reflection
 */
export function getRecapMode(): 'summary' | 'quote' {
  return getRecapConfig().mode
}

/**
 * Gets the minimum activity threshold for summary mode.
 * If activity is below this threshold, recap falls back to quote mode.
 * @returns Minimum number of items required for summary (default: 3)
 */
export function getActivityThreshold(): number {
  return getRecapConfig().threshold
}

/**
 * Checks if the recap feature is enabled.
 * @returns true if recap notifications should be sent
 */
export function isRecapEnabled(): boolean {
  return getRecapConfig().enabled
}

/**
 * Determines the effective recap mode based on activity level.
 * If summary mode is selected but activity is below threshold, falls back to quote.
 *
 * @param activityCount - Number of items/activities from yesterday
 * @returns The mode to use for generating recap content
 */
export function getEffectiveRecapMode(activityCount: number): 'summary' | 'quote' {
  const config = getRecapConfig()

  if (config.mode === 'quote') {
    return 'quote'
  }

  // Summary mode: check if activity meets threshold
  if (activityCount < config.threshold) {
    return 'quote' // Fall back to quote mode
  }

  return 'summary'
}

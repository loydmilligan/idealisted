/**
 * Planner Schedule Configuration
 *
 * Provides time window configuration for morning finalize and evening review auto-triggers.
 * Used for the future planner modal auto-popup feature.
 */

export interface PlannerScheduleConfig {
  morning_start: string  // HH:MM format
  morning_end: string    // HH:MM format
  evening_start: string  // HH:MM format
  evening_end: string    // HH:MM format
  auto_popup_enabled: boolean
}

export const DEFAULT_SCHEDULE: PlannerScheduleConfig = {
  morning_start: '07:00',
  morning_end: '09:00',
  evening_start: '19:00',
  evening_end: '21:00',
  auto_popup_enabled: true
}

/**
 * Parse a time string (HH:MM) to minutes since midnight
 * @param time - Time string in HH:MM format
 * @returns Minutes since midnight (0-1439)
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM`)
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${time}. Hours must be 0-23, minutes 0-59`)
  }
  return hours * 60 + minutes
}

/**
 * Check if current time is within a time window
 * @param start - Start time in HH:MM format
 * @param end - End time in HH:MM format
 * @returns true if current time is within the window
 */
export function isInTimeWindow(start: string, end: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const startMinutes = parseTimeToMinutes(start)
  const endMinutes = parseTimeToMinutes(end)

  // Handle case where window crosses midnight (e.g., 23:00 - 01:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Check if current time is within the morning window
 * @param config - Optional schedule config, uses defaults if not provided
 * @returns true if current time is in morning window
 */
export function isInMorningWindow(config?: PlannerScheduleConfig): boolean {
  const schedule = config || DEFAULT_SCHEDULE
  if (!schedule.auto_popup_enabled) {
    return false
  }
  return isInTimeWindow(schedule.morning_start, schedule.morning_end)
}

/**
 * Check if current time is within the evening window
 * @param config - Optional schedule config, uses defaults if not provided
 * @returns true if current time is in evening window
 */
export function isInEveningWindow(config?: PlannerScheduleConfig): boolean {
  const schedule = config || DEFAULT_SCHEDULE
  if (!schedule.auto_popup_enabled) {
    return false
  }
  return isInTimeWindow(schedule.evening_start, schedule.evening_end)
}

/**
 * Validate a schedule configuration
 * @param config - The schedule configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateScheduleConfig(config: PlannerScheduleConfig): string[] {
  const errors: string[] = []

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

  if (!timeRegex.test(config.morning_start)) {
    errors.push('Morning start time must be in HH:MM format')
  }
  if (!timeRegex.test(config.morning_end)) {
    errors.push('Morning end time must be in HH:MM format')
  }
  if (!timeRegex.test(config.evening_start)) {
    errors.push('Evening start time must be in HH:MM format')
  }
  if (!timeRegex.test(config.evening_end)) {
    errors.push('Evening end time must be in HH:MM format')
  }

  // If any format errors, return early
  if (errors.length > 0) {
    return errors
  }

  // Validate that start is before end for each window
  const morningStart = parseTimeToMinutes(config.morning_start)
  const morningEnd = parseTimeToMinutes(config.morning_end)
  const eveningStart = parseTimeToMinutes(config.evening_start)
  const eveningEnd = parseTimeToMinutes(config.evening_end)

  if (morningStart >= morningEnd) {
    errors.push('Morning start must be before morning end')
  }

  if (eveningStart >= eveningEnd) {
    errors.push('Evening start must be before evening end')
  }

  // Validate that windows do not overlap
  // Morning window should end before evening window starts
  if (morningEnd > eveningStart) {
    errors.push('Morning and evening windows cannot overlap')
  }

  return errors
}

/**
 * Format minutes since midnight back to HH:MM string
 * @param minutes - Minutes since midnight
 * @returns Time string in HH:MM format
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

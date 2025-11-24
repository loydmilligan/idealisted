/**
 * LocalStorage sync layer for plan assignments.
 * Provides immediate UI updates while syncing to the database in the background.
 *
 * Storage Keys:
 * - planner_assignments_YYYY-MM-DD: Array of PlanAssignment for that date
 * - planner_sync_meta: Sync metadata tracking last_synced_at per date
 * - planner_sync_queue: Queue of pending sync operations for offline support
 */

import { PlanAssignment } from '@/types'

// Storage key constants
const STORAGE_KEY_PREFIX = 'planner_assignments_'
const SYNC_META_KEY = 'planner_sync_meta'
const SYNC_QUEUE_KEY = 'planner_sync_queue'

// Debounce configuration
const SYNC_DEBOUNCE_MS = 1000

/**
 * Metadata for tracking sync state per date
 */
export interface SyncMeta {
  [date: string]: {
    /** Timestamp of last successful server sync */
    last_synced_at: number
    /** Timestamp of last local change */
    last_local_change_at: number
  }
}

/**
 * Represents a queued sync operation for offline support
 */
export interface SyncQueueItem {
  id: string
  date: string
  operation: 'create' | 'update' | 'delete'
  data: Partial<PlanAssignment>
  queued_at: number
}

/**
 * Extended PlanAssignment with item data from API response
 */
export interface PlanAssignmentWithItem extends PlanAssignment {
  item?: {
    id: string
    type: string
    text: string
    created_at: number
    updated_at: number
    archived: boolean
    tags?: string[]
  }
  task?: {
    id: string
    status: string
    priority: number
    due_date?: number
    estimated_time?: number
    project_id?: string
  }
  note?: {
    id: string
    subtype: string
    content?: string
    project_id?: string
  }
  project?: {
    id: string
    status: string
    priority?: number
    deadline?: number
    progress: number
  }
}

// Debounce timer map for sync operations
const syncDebounceTimers: Map<string, NodeJS.Timeout> = new Map()

/**
 * Check if code is running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * Check if the browser is currently online
 * @returns true if online, false if offline
 */
export function isOnline(): boolean {
  if (!isBrowser()) return true
  return navigator.onLine
}

/**
 * Generate storage key for a specific date
 */
function getStorageKey(date: string): string {
  return `${STORAGE_KEY_PREFIX}${date}`
}

/**
 * Get plan assignments from localStorage for a specific date
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of PlanAssignment objects (empty array if none found)
 */
export function getLocalAssignments(date: string): PlanAssignmentWithItem[] {
  if (!isBrowser()) return []

  try {
    const key = getStorageKey(date)
    const stored = localStorage.getItem(key)
    if (!stored) return []

    const assignments = JSON.parse(stored) as PlanAssignmentWithItem[]
    return Array.isArray(assignments) ? assignments : []
  } catch (error) {
    console.error('[plan-storage] Error reading local assignments:', error)
    return []
  }
}

/**
 * Save plan assignments to localStorage for a specific date
 * Updates sync metadata to track local changes
 * @param date - Date in YYYY-MM-DD format
 * @param assignments - Array of PlanAssignment objects to store
 */
export function setLocalAssignments(date: string, assignments: PlanAssignmentWithItem[]): void {
  if (!isBrowser()) return

  try {
    const key = getStorageKey(date)
    localStorage.setItem(key, JSON.stringify(assignments))

    // Update sync metadata to track this local change
    updateSyncMeta(date, { last_local_change_at: Date.now() })
  } catch (error) {
    console.error('[plan-storage] Error writing local assignments:', error)
  }
}

/**
 * Clear plan assignments from localStorage
 * @param date - Optional date in YYYY-MM-DD format. If omitted, clears all dates.
 */
export function clearLocalAssignments(date?: string): void {
  if (!isBrowser()) return

  try {
    if (date) {
      // Clear specific date
      localStorage.removeItem(getStorageKey(date))

      // Also clean up sync meta for this date
      const meta = getSyncMeta()
      if (meta[date]) {
        delete meta[date]
        localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
      }
    } else {
      // Clear all planner assignments
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Clear all sync meta
      localStorage.removeItem(SYNC_META_KEY)
    }
  } catch (error) {
    console.error('[plan-storage] Error clearing local assignments:', error)
  }
}

/**
 * Get sync metadata from localStorage
 */
export function getSyncMeta(): SyncMeta {
  if (!isBrowser()) return {}

  try {
    const stored = localStorage.getItem(SYNC_META_KEY)
    if (!stored) return {}
    return JSON.parse(stored) as SyncMeta
  } catch (error) {
    console.error('[plan-storage] Error reading sync meta:', error)
    return {}
  }
}

/**
 * Update sync metadata for a specific date
 */
function updateSyncMeta(date: string, updates: Partial<SyncMeta[string]>): void {
  if (!isBrowser()) return

  try {
    const meta = getSyncMeta()
    meta[date] = {
      last_synced_at: meta[date]?.last_synced_at ?? 0,
      last_local_change_at: meta[date]?.last_local_change_at ?? 0,
      ...updates
    }
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
  } catch (error) {
    console.error('[plan-storage] Error updating sync meta:', error)
  }
}

/**
 * Get the sync queue for offline operations
 */
export function getSyncQueue(): SyncQueueItem[] {
  if (!isBrowser()) return []

  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as SyncQueueItem[]
  } catch (error) {
    console.error('[plan-storage] Error reading sync queue:', error)
    return []
  }
}

/**
 * Add an operation to the sync queue for offline processing
 */
function addToSyncQueue(item: Omit<SyncQueueItem, 'queued_at'>): void {
  if (!isBrowser()) return

  try {
    const queue = getSyncQueue()

    // Check if there's an existing operation for the same id
    const existingIndex = queue.findIndex(q => q.id === item.id)

    if (existingIndex !== -1) {
      // If delete, remove any pending creates/updates
      if (item.operation === 'delete') {
        // If it was a create that never synced, just remove it
        if (queue[existingIndex].operation === 'create') {
          queue.splice(existingIndex, 1)
        } else {
          // Otherwise update to delete
          queue[existingIndex] = { ...item, queued_at: Date.now() }
        }
      } else {
        // Merge update operations
        queue[existingIndex] = {
          ...queue[existingIndex],
          ...item,
          data: { ...queue[existingIndex].data, ...item.data },
          queued_at: Date.now()
        }
      }
    } else {
      queue.push({ ...item, queued_at: Date.now() })
    }

    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch (error) {
    console.error('[plan-storage] Error adding to sync queue:', error)
  }
}

/**
 * Remove an item from the sync queue
 */
function removeFromSyncQueue(id: string): void {
  if (!isBrowser()) return

  try {
    const queue = getSyncQueue()
    const filtered = queue.filter(q => q.id !== id)
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('[plan-storage] Error removing from sync queue:', error)
  }
}

/**
 * Clear the entire sync queue
 */
export function clearSyncQueue(): void {
  if (!isBrowser()) return
  localStorage.removeItem(SYNC_QUEUE_KEY)
}

/**
 * Load assignments from server and update localStorage
 * Server wins strategy - this should be called on page load
 * @param date - Date in YYYY-MM-DD format
 * @returns Array of PlanAssignment objects from server
 */
export async function loadFromServer(date: string): Promise<PlanAssignmentWithItem[]> {
  try {
    const response = await fetch(`/api/plan-assignments?date=${encodeURIComponent(date)}`)

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Unknown server error')
    }

    const assignments = result.data as PlanAssignmentWithItem[]

    // Server wins on load - update localStorage
    setLocalAssignments(date, assignments)

    // Update sync metadata
    updateSyncMeta(date, {
      last_synced_at: Date.now(),
      last_local_change_at: Date.now()
    })

    return assignments
  } catch (error) {
    console.error('[plan-storage] Error loading from server:', error)

    // Fall back to local storage if server fails
    return getLocalAssignments(date)
  }
}

/**
 * Sync local changes to server (debounced)
 * This function is debounced at 1000ms per date
 * @param date - Date in YYYY-MM-DD format
 */
export async function syncToServer(date: string): Promise<void> {
  // Clear existing debounce timer for this date
  const existingTimer = syncDebounceTimers.get(date)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  // Set new debounced timer
  const timer = setTimeout(async () => {
    await performSync(date)
    syncDebounceTimers.delete(date)
  }, SYNC_DEBOUNCE_MS)

  syncDebounceTimers.set(date, timer)
}

/**
 * Force immediate sync without debouncing
 * @param date - Date in YYYY-MM-DD format
 */
export async function syncToServerImmediate(date: string): Promise<void> {
  // Clear any pending debounced sync
  const existingTimer = syncDebounceTimers.get(date)
  if (existingTimer) {
    clearTimeout(existingTimer)
    syncDebounceTimers.delete(date)
  }

  await performSync(date)
}

/**
 * Perform the actual sync operation
 */
async function performSync(date: string): Promise<void> {
  // Check online status
  if (!isOnline()) {
    console.log('[plan-storage] Offline - changes queued for later sync')
    return
  }

  const queue = getSyncQueue().filter(q => q.date === date)

  if (queue.length === 0) {
    // No queued operations - just update sync timestamp
    updateSyncMeta(date, { last_synced_at: Date.now() })
    return
  }

  // Process queue items
  for (const item of queue) {
    try {
      let success = false

      switch (item.operation) {
        case 'create':
          success = await syncCreate(item)
          break
        case 'update':
          success = await syncUpdate(item)
          break
        case 'delete':
          success = await syncDelete(item)
          break
      }

      if (success) {
        removeFromSyncQueue(item.id)
      }
    } catch (error) {
      console.error(`[plan-storage] Error syncing ${item.operation}:`, error)
      // Keep in queue for retry
    }
  }

  // Update sync timestamp
  updateSyncMeta(date, { last_synced_at: Date.now() })
}

/**
 * Sync a create operation to server
 */
async function syncCreate(item: SyncQueueItem): Promise<boolean> {
  const response = await fetch('/api/plan-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item.data)
  })

  // 409 Conflict means it already exists - consider it success
  if (response.status === 409) {
    return true
  }

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Create failed')
  }

  return true
}

/**
 * Sync an update operation to server
 */
async function syncUpdate(item: SyncQueueItem): Promise<boolean> {
  const response = await fetch(`/api/plan-assignments/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item.data)
  })

  // 404 means item was deleted - consider sync complete
  if (response.status === 404) {
    return true
  }

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Update failed')
  }

  return true
}

/**
 * Sync a delete operation to server
 */
async function syncDelete(item: SyncQueueItem): Promise<boolean> {
  const response = await fetch(`/api/plan-assignments/${item.id}`, {
    method: 'DELETE'
  })

  // 404 means already deleted - consider it success
  if (response.status === 404) {
    return true
  }

  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Delete failed')
  }

  return true
}

/**
 * Add a new assignment locally and queue for sync
 * @param date - Date in YYYY-MM-DD format
 * @param assignment - The assignment to add
 */
export function addAssignmentLocal(date: string, assignment: PlanAssignmentWithItem): void {
  const assignments = getLocalAssignments(date)
  assignments.push(assignment)
  setLocalAssignments(date, assignments)

  // Queue for server sync
  addToSyncQueue({
    id: assignment.id,
    date,
    operation: 'create',
    data: {
      id: assignment.id,
      item_id: assignment.item_id,
      assigned_date: assignment.assigned_date,
      position: assignment.position
    }
  })

  // Trigger debounced sync
  syncToServer(date)
}

/**
 * Update an assignment locally and queue for sync
 * @param date - Date in YYYY-MM-DD format
 * @param id - Assignment ID
 * @param updates - Fields to update
 */
export function updateAssignmentLocal(
  date: string,
  id: string,
  updates: Partial<Pick<PlanAssignment, 'position' | 'assigned_date'>>
): void {
  const assignments = getLocalAssignments(date)
  const index = assignments.findIndex(a => a.id === id)

  if (index !== -1) {
    assignments[index] = { ...assignments[index], ...updates, updated_at: Date.now() }

    // If date changed, need to handle both old and new date
    if (updates.assigned_date && updates.assigned_date !== date) {
      // Remove from old date
      const filtered = assignments.filter(a => a.id !== id)
      setLocalAssignments(date, filtered)

      // Add to new date
      const newDateAssignments = getLocalAssignments(updates.assigned_date)
      newDateAssignments.push(assignments[index])
      setLocalAssignments(updates.assigned_date, newDateAssignments)

      // Queue sync for both dates
      syncToServer(date)
      syncToServer(updates.assigned_date)
    } else {
      setLocalAssignments(date, assignments)
    }

    // Queue for server sync
    addToSyncQueue({
      id,
      date: updates.assigned_date || date,
      operation: 'update',
      data: updates
    })

    // Trigger debounced sync
    syncToServer(updates.assigned_date || date)
  }
}

/**
 * Remove an assignment locally and queue for sync
 * @param date - Date in YYYY-MM-DD format
 * @param id - Assignment ID
 */
export function removeAssignmentLocal(date: string, id: string): void {
  const assignments = getLocalAssignments(date)
  const filtered = assignments.filter(a => a.id !== id)
  setLocalAssignments(date, filtered)

  // Queue for server sync
  addToSyncQueue({
    id,
    date,
    operation: 'delete',
    data: { id }
  })

  // Trigger debounced sync
  syncToServer(date)
}

/**
 * Reorder assignments locally and queue for sync
 * @param date - Date in YYYY-MM-DD format
 * @param assignmentIds - Array of assignment IDs in new order
 */
export function reorderAssignmentsLocal(date: string, assignmentIds: string[]): void {
  const assignments = getLocalAssignments(date)

  // Create a map for quick lookup
  const assignmentMap = new Map(assignments.map(a => [a.id, a]))

  // Rebuild array in new order with updated positions
  const reordered = assignmentIds
    .map((id, index) => {
      const assignment = assignmentMap.get(id)
      if (assignment) {
        const updated = { ...assignment, position: index, updated_at: Date.now() }

        // Queue position update
        addToSyncQueue({
          id,
          date,
          operation: 'update',
          data: { position: index }
        })

        return updated
      }
      return null
    })
    .filter((a): a is PlanAssignmentWithItem => a !== null)

  setLocalAssignments(date, reordered)

  // Trigger debounced sync
  syncToServer(date)
}

/**
 * Flush the sync queue (process all pending operations)
 * Called when coming back online
 */
export async function flushSyncQueue(): Promise<void> {
  if (!isOnline()) {
    console.log('[plan-storage] Still offline - cannot flush queue')
    return
  }

  const queue = getSyncQueue()

  if (queue.length === 0) {
    return
  }

  console.log(`[plan-storage] Flushing ${queue.length} queued operations`)

  // Group by date and process
  const dates = Array.from(new Set(queue.map(q => q.date)))

  for (const date of dates) {
    await performSync(date)
  }
}

/**
 * Initialize online/offline event listeners
 * Call this once on app initialization
 */
export function initOfflineSupport(): () => void {
  if (!isBrowser()) return () => {}

  const handleOnline = () => {
    console.log('[plan-storage] Back online - flushing sync queue')
    flushSyncQueue()
  }

  const handleOffline = () => {
    console.log('[plan-storage] Went offline - changes will be queued')
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Check if there are unsync changes for a date
 * @param date - Date in YYYY-MM-DD format
 * @returns true if local changes are newer than last sync
 */
export function hasUnsyncedChanges(date: string): boolean {
  const meta = getSyncMeta()
  const dateMeta = meta[date]

  if (!dateMeta) return false

  return dateMeta.last_local_change_at > dateMeta.last_synced_at
}

/**
 * Get the timestamp of the last sync for a date
 * @param date - Date in YYYY-MM-DD format
 * @returns Timestamp or null if never synced
 */
export function getLastSyncTime(date: string): number | null {
  const meta = getSyncMeta()
  return meta[date]?.last_synced_at ?? null
}

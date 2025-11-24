/**
 * Planner Screen Component
 *
 * Displays daily task assignments with date navigation.
 * Features:
 * - Date navigation (prev/next day, today button)
 * - Day/Week view toggle
 * - Assignment list for selected date
 * - Empty state when no assignments
 * - LocalStorage sync with server fallback
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format, addDays, subDays, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Loader2, LayoutGrid, LayoutList } from 'lucide-react'
import {
  PlanAssignmentWithItem,
  loadFromServer,
  getLocalAssignments,
  initOfflineSupport,
  removeAssignmentLocal,
  addAssignmentLocal
} from '@/lib/plan-storage'
import { getEntityColor, getEntityBackgroundColor, EntityType } from '@/lib/entity-colors'
import { WeekGrid } from './WeekGrid'
import { MorningFinalizeModal } from '@/components/MorningFinalizeModal'
import { Plan, Item } from '@/types'
import { apiClient } from '@/lib/api-client'

interface PlannerScreenProps {
  className?: string
  onItemTap?: (itemId: string) => void
  onTaskToggle?: (itemId: string, newStatus: string) => void
  onRemoveAssignment?: (assignmentId: string, date: string) => void
}

/**
 * Format date for display with relative labels
 */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMM d')
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Check if current time is within morning finalize window
 * Default window: 7:00 AM - 9:00 AM
 * TODO: P3-T5 will read from settings
 */
function isInMorningWindow(): boolean {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentMinutes = hours * 60 + minutes

  // Default: 7:00 AM - 9:00 AM (420-540 minutes)
  // TODO: P3-T5 will read from settings
  const startMinutes = 7 * 60  // 7:00 AM
  const endMinutes = 9 * 60    // 9:00 AM

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * PlannerItem sub-component for displaying individual assignments
 */
interface PlannerItemProps {
  assignment: PlanAssignmentWithItem
  onTap?: () => void
  onTaskToggle?: (newStatus: string) => void
  onRemove?: () => void
}

const PlannerItem: React.FC<PlannerItemProps> = ({
  assignment,
  onTap,
  onTaskToggle,
  onRemove
}) => {
  const item = assignment.item
  const task = assignment.task
  const note = assignment.note
  const project = assignment.project

  if (!item) return null

  const entityType = item.type as EntityType
  const isCompleted = task?.status === 'completed'

  const cardStyle = {
    borderLeft: `4px solid \${getEntityColor(entityType)}`,
    background: getEntityBackgroundColor(entityType, 'muted', 0.08),
    opacity: isCompleted ? 0.6 : 1,
  }

  const textStyle = {
    textDecoration: isCompleted ? 'line-through' : 'none',
  }

  // Get entity-specific details
  const getDetails = () => {
    if (task) {
      const priority = task.priority ? `P\${task.priority}` : null
      const dueDate = task.due_date
        ? format(new Date(task.due_date), 'MMM d')
        : null
      return [priority, dueDate].filter(Boolean).join(' | ')
    }
    if (note) {
      return note.subtype || 'Note'
    }
    if (project) {
      const progress = project.progress || 0
      return `\${progress}% complete`
    }
    return null
  }

  const details = getDetails()

  return (
    <div
      className="retro-card p-3 flex items-start justify-between gap-2 cursor-pointer hover:opacity-90 transition-opacity"
      style={cardStyle}
      onClick={onTap}
    >
      <div className="flex-1 min-w-0">
        {/* Task checkbox */}
        {entityType === 'task' && (
          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              className="retro-checkbox"
              checked={isCompleted}
              onChange={(e) => {
                e.stopPropagation()
                onTaskToggle?.(isCompleted ? 'pending' : 'completed')
              }}
            />
          </div>
        )}

        {/* Item text */}
        <div className="text-sm font-semibold truncate" style={textStyle}>
          {item.text}
        </div>

        {/* Type badge and details */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded"
            style={{
              background: getEntityColor(entityType),
              color: 'white'
            }}
          >
            {entityType}
          </span>
          {details && (
            <span className="text-[10px] opacity-60">{details}</span>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {item.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[9px] px-1 py-0.5 rounded opacity-70"
                style={{ background: 'var(--palm-border-light)' }}
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[9px] opacity-50">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        className="retro-btn retro-btn-secondary retro-btn-sm flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          onRemove?.()
        }}
        title="Remove from plan"
      >
        x
      </button>
    </div>
  )
}

/**
 * Main PlannerScreen component
 */
export const PlannerScreen: React.FC<PlannerScreenProps> = ({
  className = '',
  onItemTap,
  onTaskToggle,
  onRemoveAssignment,
}) => {
  // State management
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey())
  const [assignments, setAssignments] = useState<PlanAssignmentWithItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [weekAssignments, setWeekAssignments] = useState<PlanAssignmentWithItem[]>([])

  // Morning finalize modal state
  const [showMorningModal, setShowMorningModal] = useState(false)
  const [todayPlan, setTodayPlan] = useState<Plan | null>(null)
  const [planTasks, setPlanTasks] = useState<Item[]>([])

  // Date navigation handlers
  const goToPrevDay = useCallback(() => {
    const current = new Date(selectedDate + 'T00:00:00')
    const prev = subDays(current, 1)
    setSelectedDate(format(prev, 'yyyy-MM-dd'))
  }, [selectedDate])

  const goToNextDay = useCallback(() => {
    const current = new Date(selectedDate + 'T00:00:00')
    const next = addDays(current, 1)
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }, [selectedDate])

  const goToToday = useCallback(() => {
    setSelectedDate(getTodayKey())
  }, [])

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'day' ? 'week' : 'day')
  }, [])

  // Load assignments when date changes (day view)
  useEffect(() => {
    if (viewMode !== 'day') return

    let mounted = true

    const loadAssignments = async () => {
      setIsLoading(true)

      // First, show local data immediately for fast UI
      const localData = getLocalAssignments(selectedDate)
      if (mounted && localData.length > 0) {
        setAssignments(localData)
      }

      // Then, fetch from server and update
      try {
        const serverData = await loadFromServer(selectedDate)
        if (mounted) {
          setAssignments(serverData)
        }
      } catch (error) {
        console.error('[PlannerScreen] Failed to load from server:', error)
        // Keep local data if server fails
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadAssignments()

    return () => {
      mounted = false
    }
  }, [selectedDate, viewMode])

  // Load week assignments when in week view
  useEffect(() => {
    if (viewMode !== 'week') return

    let mounted = true

    const loadWeekAssignments = async () => {
      setIsLoading(true)

      try {
        const selected = new Date(selectedDate + 'T00:00:00')
        const weekStart = startOfWeek(selected, { weekStartsOn: 1 }) // Monday
        const weekEnd = endOfWeek(selected, { weekStartsOn: 1 })
        const weekDates = eachDayOfInterval({ start: weekStart, end: weekEnd })

        // Load assignments for all days in the week
        const allAssignments: PlanAssignmentWithItem[] = []

        for (const date of weekDates) {
          const dateKey = format(date, 'yyyy-MM-dd')
          try {
            const dayAssignments = await loadFromServer(dateKey)
            allAssignments.push(...dayAssignments)
          } catch (error) {
            console.error(`[PlannerScreen] Failed to load \${dateKey}:`, error)
            // Fall back to local storage for this day
            const localData = getLocalAssignments(dateKey)
            allAssignments.push(...localData)
          }
        }

        if (mounted) {
          setWeekAssignments(allAssignments)
        }
      } catch (error) {
        console.error('[PlannerScreen] Failed to load week assignments:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadWeekAssignments()

    return () => {
      mounted = false
    }
  }, [selectedDate, viewMode])

  // Initialize offline support
  useEffect(() => {
    const cleanup = initOfflineSupport()
    return cleanup
  }, [])

  // Check for morning finalize flow on mount
  useEffect(() => {
    async function checkMorningFlow() {
      if (!isInMorningWindow()) return

      const today = getTodayKey()
      try {
        const { plan } = await apiClient.getPlan(today)
        if (plan && plan.status === 'draft') {
          setTodayPlan(plan)

          // Fetch tasks for today's plan from assignments
          const todayAssignments = getLocalAssignments(today)
          const taskItems = todayAssignments
            .filter(a => a.item?.type === 'task')
            .map(a => a.item!)
            .filter(item => item !== undefined) as Item[]

          setPlanTasks(taskItems)
          setShowMorningModal(true)
        }
      } catch (error) {
        // No plan for today or error fetching - ignore
        console.log('[PlannerScreen] No draft plan found for morning finalize')
      }
    }

    checkMorningFlow()
  }, [])

  // Handle removing an assignment
  const handleRemove = useCallback((assignmentId: string, date: string) => {
    // Optimistic update for day view
    if (viewMode === 'day') {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    } else {
      // Update week view
      setWeekAssignments(prev => prev.filter(a => a.id !== assignmentId))
    }

    // Update local storage and sync
    removeAssignmentLocal(date, assignmentId)

    // Notify parent if callback provided
    onRemoveAssignment?.(assignmentId, date)
  }, [viewMode, onRemoveAssignment])

  // Handle task status toggle
  const handleTaskToggle = useCallback((itemId: string, newStatus: string) => {
    // Update local state in day view
    if (viewMode === 'day') {
      setAssignments(prev => prev.map(a => {
        if (a.item_id === itemId && a.task) {
          return {
            ...a,
            task: { ...a.task, status: newStatus }
          }
        }
        return a
      }))
    } else {
      // Update week view
      setWeekAssignments(prev => prev.map(a => {
        if (a.item_id === itemId && a.task) {
          return {
            ...a,
            task: { ...a.task, status: newStatus }
          }
        }
        return a
      }))
    }

    // Notify parent
    onTaskToggle?.(itemId, newStatus)
  }, [viewMode, onTaskToggle])

  // Handle date selection in week view
  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date)
    setViewMode('day')
  }, [])

  /**
   * Assign an item to a specific date
   * Creates new assignment with optimistic update and background sync
   */
  const assignToDay = useCallback(async (itemId: string, date: string) => {
    try {
      // Calculate next position (max + 1)
      const existingAssignments = getLocalAssignments(date)
      const maxPosition = existingAssignments.reduce(
        (max, a) => Math.max(max, a.position),
        0
      )
      const newPosition = maxPosition + 1

      // Generate new assignment ID
      const newAssignment: PlanAssignmentWithItem = {
        id: crypto.randomUUID(),
        item_id: itemId,
        assigned_date: date,
        position: newPosition,
        created_at: Date.now(),
        updated_at: Date.now()
      }

      // Optimistic update: add to React state if viewing this date
      if (viewMode === 'day' && date === selectedDate) {
        setAssignments(prev => [...prev, newAssignment])
      } else if (viewMode === 'week') {
        setWeekAssignments(prev => [...prev, newAssignment])
      }

      // Update localStorage and queue for sync (internally triggers syncToServer)
      addAssignmentLocal(date, newAssignment)

    } catch (error) {
      console.error('[PlannerScreen] Failed to assign item to day:', error)
      // Note: Local state is already updated, sync will retry later
      // Future: show toast notification here
    }
  }, [selectedDate, viewMode])

  /**
   * Remove an assignment from a specific date
   * Alias for handleRemove to match the naming convention in the prompt
   */
  const removeFromDay = useCallback((assignmentId: string) => {
    handleRemove(assignmentId, selectedDate)
  }, [handleRemove, selectedDate])

  // Formatted date for display
  const formattedDate = useMemo(() => formatDateDisplay(selectedDate), [selectedDate])
  const isSelectedToday = useMemo(() => selectedDate === getTodayKey(), [selectedDate])

  return (
    <div className={`flex flex-col h-full pb-20 \${className}`}>
      {/* Date Navigation Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="retro-card p-3">
          <div className="flex items-center justify-between gap-2">
            {/* Previous Day Button */}
            <button
              className="retro-btn retro-btn-secondary retro-btn-sm"
              onClick={goToPrevDay}
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Date Display */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={16} className="opacity-70" />
                <span className="font-bold text-sm">{formattedDate}</span>
              </div>
              <div className="text-[10px] opacity-60 font-mono">
                {selectedDate}
              </div>
            </div>

            {/* View Mode Toggle */}
            <button
              className="retro-btn retro-btn-secondary retro-btn-sm"
              onClick={toggleViewMode}
              aria-label={viewMode === 'day' ? 'Switch to week view' : 'Switch to day view'}
              title={viewMode === 'day' ? 'Week view' : 'Day view'}
            >
              {viewMode === 'day' ? <LayoutGrid size={18} /> : <LayoutList size={18} />}
            </button>

            {/* Next Day Button */}
            <button
              className="retro-btn retro-btn-secondary retro-btn-sm"
              onClick={goToNextDay}
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Today Quick Button */}
          {!isSelectedToday && (
            <div className="mt-2 text-center">
              <button
                className="retro-btn retro-btn-primary retro-btn-sm"
                onClick={goToToday}
              >
                Go to Today
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'week' ? (
        // Week View
        <div className="px-4 flex-1 overflow-hidden">
          {isLoading && weekAssignments.length === 0 ? (
            <div className="retro-card p-6 text-center">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 opacity-60" />
              <p className="text-sm opacity-60">Loading week...</p>
            </div>
          ) : (
            <WeekGrid
              assignments={weekAssignments}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onItemTap={onItemTap}
              onTaskToggle={handleTaskToggle}
              onRemoveAssignment={handleRemove}
            />
          )}
        </div>
      ) : (
        // Day View (Assignments List)
        <div className="px-4 flex-1 overflow-y-auto">
          {isLoading && assignments.length === 0 ? (
            // Loading State
            <div className="retro-card p-6 text-center">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 opacity-60" />
              <p className="text-sm opacity-60">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            // Empty State
            <div className="retro-empty">
              <div className="retro-empty-icon">
                <Calendar size={32} />
              </div>
              <h2 className="retro-empty-title">
                No tasks planned for this day
              </h2>
              <p className="retro-empty-message">
                Use the Add button to assign items to this date.
              </p>
            </div>
          ) : (
            // Assignments List
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="retro-section-title text-xs font-mono opacity-70 uppercase">
                  Planned Items ({assignments.length})
                </h3>
                {isLoading && (
                  <Loader2 size={14} className="animate-spin opacity-40" />
                )}
              </div>

              {assignments.map(assignment => (
                <PlannerItem
                  key={assignment.id}
                  assignment={assignment}
                  onTap={() => onItemTap?.(assignment.item_id)}
                  onTaskToggle={(status) => handleTaskToggle(assignment.item_id, status)}
                  onRemove={() => handleRemove(assignment.id, selectedDate)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Morning Finalize Modal */}
      {showMorningModal && todayPlan && (
        <MorningFinalizeModal
          plan={todayPlan}
          tasks={planTasks}
          onClose={() => setShowMorningModal(false)}
          onFinalize={() => {
            setShowMorningModal(false)
            // Reload assignments to reflect any changes
            loadFromServer(selectedDate).then(setAssignments)
          }}
        />
      )}
    </div>
  )
}

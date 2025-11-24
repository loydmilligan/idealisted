/**
 * Planner Screen Component
 *
 * Displays daily task assignments with date navigation.
 * Features:
 * - Date navigation (prev/next day, today button)
 * - Assignment list for selected date
 * - Empty state when no assignments
 * - LocalStorage sync with server fallback
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import {
  PlanAssignmentWithItem,
  loadFromServer,
  getLocalAssignments,
  initOfflineSupport,
  removeAssignmentLocal
} from '@/lib/plan-storage'
import { getEntityColor, getEntityBackgroundColor, EntityType } from '@/lib/entity-colors'

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
    borderLeft: `4px solid ${getEntityColor(entityType)}`,
    background: getEntityBackgroundColor(entityType, 'muted', 0.08),
    opacity: isCompleted ? 0.6 : 1,
  }

  const textStyle = {
    textDecoration: isCompleted ? 'line-through' : 'none',
  }

  // Get entity-specific details
  const getDetails = () => {
    if (task) {
      const priority = task.priority ? `P${task.priority}` : null
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
      return `${progress}% complete`
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

  // Load assignments when date changes
  useEffect(() => {
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
  }, [selectedDate])

  // Initialize offline support
  useEffect(() => {
    const cleanup = initOfflineSupport()
    return cleanup
  }, [])

  // Handle removing an assignment
  const handleRemove = useCallback((assignmentId: string) => {
    // Optimistic update
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))

    // Update local storage and sync
    removeAssignmentLocal(selectedDate, assignmentId)

    // Notify parent if callback provided
    onRemoveAssignment?.(assignmentId, selectedDate)
  }, [selectedDate, onRemoveAssignment])

  // Handle task status toggle
  const handleTaskToggle = useCallback((itemId: string, newStatus: string) => {
    // Update local state
    setAssignments(prev => prev.map(a => {
      if (a.item_id === itemId && a.task) {
        return {
          ...a,
          task: { ...a.task, status: newStatus }
        }
      }
      return a
    }))

    // Notify parent
    onTaskToggle?.(itemId, newStatus)
  }, [onTaskToggle])

  // Formatted date for display
  const formattedDate = useMemo(() => formatDateDisplay(selectedDate), [selectedDate])
  const isSelectedToday = useMemo(() => selectedDate === getTodayKey(), [selectedDate])

  return (
    <div className={`flex flex-col h-full pb-20 ${className}`}>
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

      {/* Assignments List */}
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
                onRemove={() => handleRemove(assignment.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

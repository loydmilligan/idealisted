/**
 * WeekGrid Component
 *
 * Displays a 7-day week view with assignment columns for each day.
 * Features:
 * - 7 equal-width columns (Mon-Sun based on locale)
 * - Today column highlighted with visual indicator
 * - Vertical scrolling within each day column
 * - Assignments displayed as cards within columns
 */

'use client'

import React, { useMemo, useState } from 'react'
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { PlanAssignmentWithItem, updateAssignmentLocal } from '@/lib/plan-storage'
import { getEntityColor, getEntityBackgroundColor, EntityType } from '@/lib/entity-colors'

interface WeekGridProps {
  /** All assignments for the current week */
  assignments: PlanAssignmentWithItem[]
  /** Currently selected date (YYYY-MM-DD format) */
  selectedDate: string
  /** Callback when a day column is clicked */
  onDateSelect?: (date: string) => void
  /** Callback when an item is tapped */
  onItemTap?: (itemId: string) => void
  /** Callback when a task status is toggled */
  onTaskToggle?: (itemId: string, newStatus: string) => void
  /** Callback when an assignment is removed */
  onRemoveAssignment?: (assignmentId: string, date: string) => void
  /** Callback when an assignment is moved to a different day */
  onMoveAssignment?: (assignmentId: string, oldDate: string, newDate: string) => void
}

/**
 * WeekDayColumn sub-component for displaying a single day's assignments
 */
interface WeekDayColumnProps {
  date: Date
  dateKey: string
  assignments: PlanAssignmentWithItem[]
  isToday: boolean
  isSelected: boolean
  onDateSelect?: () => void
  onItemTap?: (itemId: string) => void
  onTaskToggle?: (itemId: string, newStatus: string) => void
  onRemoveAssignment?: (assignmentId: string) => void
}

const WeekDayColumn: React.FC<WeekDayColumnProps> = ({
  date,
  dateKey,
  assignments,
  isToday,
  isSelected,
  onDateSelect,
  onItemTap,
  onTaskToggle,
  onRemoveAssignment,
}) => {
  const dayName = format(date, 'EEE')
  const dayNumber = format(date, 'd')

  // Make this column a drop zone
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
  })

  // Column styling with today highlight and drop zone feedback
  const columnStyle: React.CSSProperties = {
    borderLeft: isToday ? '3px solid var(--palm-primary, #4A90E2)' : undefined,
    backgroundColor: isOver
      ? 'rgba(74, 144, 226, 0.15)'
      : isToday
      ? 'rgba(74, 144, 226, 0.05)'
      : undefined,
    transition: 'background-color 0.2s ease',
  }

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-0 border-r border-gray-200 last:border-r-0 flex flex-col"
      style={columnStyle}
    >
      {/* Day Header */}
      <button
        className="p-2 text-center border-b border-gray-200 hover:bg-gray-50 transition-colors"
        onClick={onDateSelect}
        style={{
          background: isSelected ? 'rgba(74, 144, 226, 0.1)' : undefined,
        }}
      >
        <div className="text-[10px] font-mono uppercase opacity-60">
          {dayName}
        </div>
        <div
          className={`text-sm font-bold ${isToday ? 'text-blue-600' : ''}`}
        >
          {dayNumber}
        </div>
      </button>

      {/* Assignments List with Vertical Scroll */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {assignments.length === 0 ? (
          <div className="text-[10px] text-center opacity-40 py-4">
            No items
          </div>
        ) : (
          assignments.map(assignment => (
            <WeekGridItem
              key={assignment.id}
              assignment={assignment}
              onTap={() => onItemTap?.(assignment.item_id)}
              onTaskToggle={(status) => onTaskToggle?.(assignment.item_id, status)}
              onRemove={() => onRemoveAssignment?.(assignment.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * WeekGridItem sub-component for displaying individual assignments in week view
 */
interface WeekGridItemProps {
  assignment: PlanAssignmentWithItem
  onTap?: () => void
  onTaskToggle?: (newStatus: string) => void
  onRemove?: () => void
}

const WeekGridItem: React.FC<WeekGridItemProps> = ({
  assignment,
  onTap,
  onTaskToggle,
  onRemove,
}) => {
  const item = assignment.item
  const task = assignment.task

  // Make this item draggable (must call hooks before any early returns)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignment.id,
    data: {
      assignment,
      currentDate: assignment.assigned_date,
    },
  })

  if (!item) return null

  const entityType = item.type as EntityType
  const isCompleted = task?.status === 'completed'

  const cardStyle = {
    borderLeft: `3px solid ${getEntityColor(entityType)}`,
    background: getEntityBackgroundColor(entityType, 'muted', 0.08),
    opacity: isDragging ? 0.5 : isCompleted ? 0.6 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const textStyle = {
    textDecoration: isCompleted ? 'line-through' : 'none',
  }

  return (
    <div
      ref={setNodeRef}
      className="retro-card p-2 hover:opacity-90 transition-opacity"
      style={cardStyle}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0" onClick={onTap}>
          {/* Task checkbox */}
          {entityType === 'task' && (
            <div className="flex items-center gap-1 mb-1">
              <input
                type="checkbox"
                className="retro-checkbox"
                checked={isCompleted}
                onChange={(e) => {
                  e.stopPropagation()
                  onTaskToggle?.(isCompleted ? 'pending' : 'completed')
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Item text */}
          <div className="text-[11px] font-semibold truncate" style={textStyle}>
            {item.text}
          </div>

          {/* Type badge */}
          <div className="mt-1">
            <span
              className="text-[8px] uppercase font-mono px-1 py-0.5 rounded"
              style={{
                background: getEntityColor(entityType),
                color: 'white',
              }}
            >
              {entityType}
            </span>
          </div>
        </div>

        {/* Remove button */}
        <button
          className="text-[10px] px-1 opacity-60 hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Remove"
        >
          ×
        </button>
      </div>
    </div>
  )
}

/**
 * DragOverlayItem - Ghost element that follows cursor during drag
 */
interface DragOverlayItemProps {
  assignment: PlanAssignmentWithItem
}

const DragOverlayItem: React.FC<DragOverlayItemProps> = ({ assignment }) => {
  const item = assignment.item
  const task = assignment.task

  if (!item) return null

  const entityType = item.type as EntityType
  const isCompleted = task?.status === 'completed'

  const cardStyle = {
    borderLeft: `3px solid ${getEntityColor(entityType)}`,
    background: getEntityBackgroundColor(entityType, 'muted', 0.08),
    opacity: 0.9,
    cursor: 'grabbing',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
  }

  const textStyle = {
    textDecoration: isCompleted ? 'line-through' : 'none',
  }

  return (
    <div
      className="retro-card p-2 w-[150px]"
      style={cardStyle}
    >
      <div className="flex-1 min-w-0">
        {/* Item text */}
        <div className="text-[11px] font-semibold truncate" style={textStyle}>
          {item.text}
        </div>

        {/* Type badge */}
        <div className="mt-1">
          <span
            className="text-[8px] uppercase font-mono px-1 py-0.5 rounded"
            style={{
              background: getEntityColor(entityType),
              color: 'white',
            }}
          >
            {entityType}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Main WeekGrid component
 */
export const WeekGrid: React.FC<WeekGridProps> = ({
  assignments,
  selectedDate,
  onDateSelect,
  onItemTap,
  onTaskToggle,
  onRemoveAssignment,
  onMoveAssignment,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Calculate week dates based on selectedDate
  const weekDates = useMemo(() => {
    const selected = new Date(selectedDate + 'T00:00:00')
    // Get start of week (Monday by default, adjust based on locale)
    const weekStart = startOfWeek(selected, { weekStartsOn: 1 }) // 1 = Monday

    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i)
      return {
        date,
        dateKey: format(date, 'yyyy-MM-dd'),
        isToday: isToday(date),
        isSelected: isSameDay(date, selected),
      }
    })
  }, [selectedDate])

  // Group assignments by date
  const assignmentsByDate = useMemo(() => {
    const grouped = new Map<string, PlanAssignmentWithItem[]>()

    assignments.forEach(assignment => {
      const date = assignment.assigned_date
      if (!grouped.has(date)) {
        grouped.set(date, [])
      }
      grouped.get(date)!.push(assignment)
    })

    // Sort assignments by position within each day
    grouped.forEach(list => {
      list.sort((a, b) => a.position - b.position)
    })

    return grouped
  }, [assignments])

  // Get the active assignment being dragged
  const activeAssignment = useMemo(() => {
    if (!activeId) return null
    return assignments.find(a => a.id === activeId)
  }, [activeId, assignments])

  /**
   * Handle drag start - track which item is being dragged
   */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  /**
   * Handle drag end - move item to new day if dropped on a different day
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)

    // No valid drop target
    if (!over) {
      return
    }

    const assignmentId = active.id as string
    const newDate = over.id as string
    const currentDate = active.data.current?.currentDate as string

    // Same day - no cross-day move (P2-T3 will handle reordering)
    if (newDate === currentDate) {
      return
    }

    // Move to different day
    moveToDay(assignmentId, currentDate, newDate)
  }

  /**
   * Move an assignment to a different day
   * Updates localStorage and triggers background DB sync
   */
  const moveToDay = (assignmentId: string, oldDate: string, newDate: string) => {
    // Update assignment's date and trigger sync
    updateAssignmentLocal(oldDate, assignmentId, { assigned_date: newDate })

    console.log(`[WeekGrid] Moved assignment ${assignmentId} from ${oldDate} to ${newDate}`)

    // Notify parent to refresh data
    onMoveAssignment?.(assignmentId, oldDate, newDate)
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Week Grid */}
        <div className="flex-1 flex overflow-hidden border border-gray-200 rounded-lg">
          {weekDates.map(({ date, dateKey, isToday, isSelected }) => (
            <WeekDayColumn
              key={dateKey}
              date={date}
              dateKey={dateKey}
              assignments={assignmentsByDate.get(dateKey) || []}
              isToday={isToday}
              isSelected={isSelected}
              onDateSelect={() => onDateSelect?.(dateKey)}
              onItemTap={onItemTap}
              onTaskToggle={onTaskToggle}
              onRemoveAssignment={(id) => onRemoveAssignment?.(id, dateKey)}
            />
          ))}
        </div>
      </div>

      {/* Drag Overlay - ghost element that follows cursor */}
      <DragOverlay>
        {activeAssignment ? (
          <DragOverlayItem assignment={activeAssignment} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

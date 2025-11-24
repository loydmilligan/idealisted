/**
 * MiniCalendar Component
 *
 * Compact calendar widget for date navigation in the planner.
 * Features:
 * - Month grid view (7 columns, 4-6 rows)
 * - Task count indicators per day
 * - Visual distinction for today and selected date
 * - Month navigation (prev/next arrows)
 * - Click to select date
 */

'use client'

import React, { useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday as dateFnsIsToday,
  addMonths,
  subMonths
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface MiniCalendarProps {
  /** Currently selected date in YYYY-MM-DD format */
  selectedDate: string
  /** Callback when a date is clicked */
  onDateSelect: (date: string) => void
  /** Task counts per date (YYYY-MM-DD -> count) */
  taskCounts: Record<string, number>
  /** Optional CSS class */
  className?: string
}

/**
 * Generate calendar grid for a given month
 * Returns array of Date objects for all calendar cells (including prev/next month days)
 */
function generateCalendarGrid(displayMonth: Date): Date[] {
  const monthStart = startOfMonth(displayMonth)
  const monthEnd = endOfMonth(displayMonth)

  // Get week boundaries (start on Monday)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Generate all days in the calendar view
  return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
}

/**
 * Day cell component
 */
interface DayCellProps {
  date: Date
  isCurrentMonth: boolean
  isSelected: boolean
  isToday: boolean
  taskCount: number
  onClick: () => void
}

const DayCell: React.FC<DayCellProps> = ({
  date,
  isCurrentMonth,
  isSelected,
  isToday,
  taskCount,
  onClick
}) => {
  const dayNumber = format(date, 'd')

  // Build cell classes
  const cellClasses = [
    'mini-cal-day',
    !isCurrentMonth && 'opacity-40',
    isToday && 'mini-cal-day-today',
    isSelected && 'mini-cal-day-selected',
    'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={cellClasses}
      onClick={onClick}
      aria-label={format(date, 'MMMM d, yyyy')}
      aria-current={isToday ? 'date' : undefined}
    >
      {/* Day number */}
      <span className="text-xs font-semibold">
        {dayNumber}
      </span>

      {/* Task count indicator */}
      {taskCount > 0 && (
        <div className="mini-cal-indicator">
          {taskCount <= 5 ? (
            // Show dot for 1-5 tasks
            <div className="mini-cal-dot" />
          ) : (
            // Show number for 6+ tasks
            <span className="mini-cal-count">{taskCount}</span>
          )}
        </div>
      )}
    </button>
  )
}

/**
 * Main MiniCalendar component
 */
export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onDateSelect,
  taskCounts,
  className = ''
}) => {
  // Parse selected date
  const selected = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate])

  // Track which month is being displayed (can differ from selectedDate)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(selected)

  // Generate calendar grid
  const calendarDays = useMemo(() => generateCalendarGrid(displayedMonth), [displayedMonth])

  // Navigation handlers
  const goToPrevMonth = () => {
    setDisplayedMonth(prev => subMonths(prev, 1))
  }

  const goToNextMonth = () => {
    setDisplayedMonth(prev => addMonths(prev, 1))
  }

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    onDateSelect(dateKey)

    // Also update displayed month if clicking a day from prev/next month
    if (!isSameMonth(date, displayedMonth)) {
      setDisplayedMonth(date)
    }
  }

  // Month/year display
  const monthYearDisplay = format(displayedMonth, 'MMMM yyyy')

  // Week day headers (Mon-Sun)
  const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className={`mini-calendar ${className}`}>
      {/* Header: Month navigation */}
      <div className="mini-cal-header">
        <button
          type="button"
          className="retro-btn retro-btn-secondary retro-btn-sm"
          onClick={goToPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex-1 text-center">
          <h3 className="text-sm font-bold">{monthYearDisplay}</h3>
        </div>

        <button
          type="button"
          className="retro-btn retro-btn-secondary retro-btn-sm"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week day headers */}
      <div className="mini-cal-weekdays">
        {weekDayLabels.map((label, i) => (
          <div key={i} className="mini-cal-weekday">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="mini-cal-grid">
        {calendarDays.map((date, i) => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const isCurrentMonth = isSameMonth(date, displayedMonth)
          const isSelected = isSameDay(date, selected)
          const isToday = dateFnsIsToday(date)
          const taskCount = taskCounts[dateKey] || 0

          return (
            <DayCell
              key={i}
              date={date}
              isCurrentMonth={isCurrentMonth}
              isSelected={isSelected}
              isToday={isToday}
              taskCount={taskCount}
              onClick={() => handleDayClick(date)}
            />
          )
        })}
      </div>
    </div>
  )
}

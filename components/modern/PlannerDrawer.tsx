'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Item, PlanAssignment } from '@/types'
import { getEntityColor, getEntityBackgroundColor } from '@/lib/entity-colors'
import { useEffect, useState } from 'react'

export interface PlannerDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: Item[]
  assignments: PlanAssignment[]
  onAdd: (itemId: string) => void
  selectedDate: Date
}

type FilterType = 'all' | 'task' | 'note' | 'list'
type SortOption = 'due_date' | 'priority' | 'created' | 'alphabetical'

export function PlannerDrawer({
  isOpen,
  onClose,
  items,
  assignments,
  onAdd,
  selectedDate,
}: PlannerDrawerProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('due_date')

  // Load sort preference from localStorage on mount
  useEffect(() => {
    const savedSort = localStorage.getItem('planner_drawer_sort')
    if (savedSort && ['due_date', 'priority', 'created', 'alphabetical'].includes(savedSort)) {
      setSortOption(savedSort as SortOption)
    }
  }, [])

  // Save sort preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('planner_drawer_sort', sortOption)
  }, [sortOption])

  // Debounce search input (300ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Filter items based on type filter and search query
  const filteredItems = items.filter((item) => {
    // Apply type filter
    if (filter !== 'all' && item.type !== filter) return false

    // Apply search filter (case-insensitive)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase()
      const textMatch = item.text.toLowerCase().includes(searchLower)
      const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      return textMatch || tagsMatch
    }

    return true
  })

  // Sort filtered items
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortOption) {
      case 'due_date': {
        const aDue = a.task?.due_date
        const bDue = b.task?.due_date
        const now = Date.now()

        // Past due items first
        const aIsPastDue = aDue && aDue < now
        const bIsPastDue = bDue && bDue < now
        if (aIsPastDue && !bIsPastDue) return -1
        if (!aIsPastDue && bIsPastDue) return 1

        // Then items with due dates (earliest first)
        if (aDue && !bDue) return -1
        if (!aDue && bDue) return 1
        if (aDue && bDue) return aDue - bDue

        return 0
      }

      case 'priority': {
        const aPriority = a.task?.priority || 0
        const bPriority = b.task?.priority || 0
        return bPriority - aPriority // Higher priority first
      }

      case 'created': {
        return b.created_at - a.created_at // Newest first
      }

      case 'alphabetical': {
        return a.text.toLowerCase().localeCompare(b.text.toLowerCase())
      }

      default:
        return 0
    }
  })

  // Helper function to check if item is past due
  const isPastDue = (item: Item) => {
    return item.task?.due_date && item.task.due_date < Date.now()
  }

  // Helper: Check if item is planned for a specific date
  const isPlannedFor = (itemId: string, date: string): boolean => {
    return assignments.some((a) => a.item_id === itemId && a.assigned_date === date)
  }

  // Helper: Get all dates an item is assigned to
  const getAssignedDates = (itemId: string): string[] => {
    return assignments
      .filter((a) => a.item_id === itemId)
      .map((a) => a.assigned_date)
  }

  // Format selected date for display
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Format selected date as YYYY-MM-DD for comparison
  const selectedDateStr = selectedDate.toISOString().split('T')[0]

  // Format date string for badge display (e.g., "Mon 15")
  const formatDateBadge = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[1002]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[400px] z-[1003]"
          >
            <div
              className="h-full retro-card p-4 overflow-y-auto"
              style={{ background: 'var(--palm-bg-primary)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="retro-header retro-header-sm">Add to Plan</h3>
                  <p className="text-[10px] opacity-60 mt-1">{formattedDate}</p>
                </div>
                <button
                  className="retro-btn retro-btn-secondary retro-btn-sm"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>

              {/* Search and Sort Controls */}
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  className="retro-input w-full"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="retro-input w-full"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                >
                  <option value="due_date">Sort by: Due date</option>
                  <option value="priority">Sort by: Priority</option>
                  <option value="created">Sort by: Created</option>
                  <option value="alphabetical">Sort by: Alphabetical</option>
                </select>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 mb-3">
                <button
                  className={`retro-btn retro-btn-sm ${
                    filter === 'all'
                      ? 'retro-btn-primary'
                      : 'retro-btn-secondary'
                  }`}
                  onClick={() => setFilter('all')}
                >
                  ALL
                </button>
                <button
                  className={`retro-btn retro-btn-sm ${
                    filter === 'task'
                      ? 'retro-btn-primary'
                      : 'retro-btn-secondary'
                  }`}
                  onClick={() => setFilter('task')}
                >
                  TASKS
                </button>
                <button
                  className={`retro-btn retro-btn-sm ${
                    filter === 'note'
                      ? 'retro-btn-primary'
                      : 'retro-btn-secondary'
                  }`}
                  onClick={() => setFilter('note')}
                >
                  NOTES
                </button>
                <button
                  className={`retro-btn retro-btn-sm ${
                    filter === 'list'
                      ? 'retro-btn-primary'
                      : 'retro-btn-secondary'
                  }`}
                  onClick={() => setFilter('list')}
                >
                  LISTS
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {sortedItems.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-xs opacity-60">
                      {debouncedSearch || filter !== 'all'
                        ? 'No matching items'
                        : 'No items available.'}
                    </p>
                    {(debouncedSearch || filter !== 'all') && (
                      <button
                        className="retro-btn retro-btn-secondary retro-btn-sm mt-2"
                        onClick={() => {
                          setSearchQuery('')
                          setFilter('all')
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
                {sortedItems.map((item) => {
                  const plannedForToday = isPlannedFor(item.id, selectedDateStr)
                  const assignedDates = getAssignedDates(item.id)
                  const otherDates = assignedDates.filter(d => d !== selectedDateStr)
                  const pastDue = isPastDue(item)

                  return (
                    <div
                      key={item.id}
                      className="retro-card p-2 flex items-start justify-between gap-2"
                      style={{
                        borderLeft: `4px solid ${
                          pastDue ? '#ef4444' : getEntityColor(item.type)
                        }`,
                        background: pastDue
                          ? 'rgba(239, 68, 68, 0.1)'
                          : getEntityBackgroundColor(item.type, 'muted', 0.08),
                        opacity:
                          plannedForToday ||
                          (item.type === 'task' && item.task?.status === 'completed')
                            ? 0.6
                            : 1,
                        textDecoration:
                          item.type === 'task' &&
                          item.task?.status === 'completed'
                            ? 'line-through'
                            : 'none',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold">{item.text}</div>
                          {pastDue && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-red-500 text-white rounded uppercase font-bold">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-60 uppercase mt-0.5">
                          {item.type}
                        </div>
                        {item.type === 'task' && (
                          <div className="text-[10px] mt-1 space-y-0.5">
                            <div>Status: {item.task?.status || 'pending'}</div>
                            {item.task?.priority && (
                              <div>Priority: {item.task.priority}</div>
                            )}
                            {item.task?.due_date && (
                              <div>
                                Due:{' '}
                                {new Date(item.task.due_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Assignment Status Badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plannedForToday && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: 'var(--retro-primary)',
                                color: 'var(--retro-bg)',
                                opacity: 0.8,
                              }}
                            >
                              ✓ Already planned
                            </span>
                          )}
                          {otherDates.map((date) => (
                            <span
                              key={date}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: 'var(--retro-secondary)',
                                color: 'var(--retro-text-primary)',
                                opacity: 0.7,
                              }}
                              title={`Planned for ${date}`}
                            >
                              📅 {formatDateBadge(date)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        className="retro-btn retro-btn-secondary retro-btn-sm shrink-0"
                        onClick={() => onAdd(item.id)}
                        disabled={plannedForToday}
                        style={{
                          opacity: plannedForToday ? 0.5 : 1,
                          cursor: plannedForToday ? 'not-allowed' : 'pointer',
                        }}
                        title={plannedForToday ? 'Already on this day' : 'Add to plan'}
                      >
                        Add
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

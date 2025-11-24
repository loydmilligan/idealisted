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

export function PlannerDrawer({
  isOpen,
  onClose,
  items,
  assignments,
  onAdd,
  selectedDate,
}: PlannerDrawerProps) {
  const [filter, setFilter] = useState<FilterType>('all')

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

  // Filter items based on selected filter
  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    return item.type === filter
  })

  // Format selected date for display
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

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
                {filteredItems.length === 0 && (
                  <p className="text-xs opacity-60">No items available.</p>
                )}
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="retro-card p-2 flex items-center justify-between"
                    style={{
                      borderLeft: `4px solid ${getEntityColor(item.type)}`,
                      background: getEntityBackgroundColor(
                        item.type,
                        'muted',
                        0.08
                      ),
                      opacity:
                        item.type === 'task' &&
                        item.task?.status === 'completed'
                          ? 0.6
                          : 1,
                      textDecoration:
                        item.type === 'task' &&
                        item.task?.status === 'completed'
                          ? 'line-through'
                          : 'none',
                    }}
                  >
                    <div>
                      <div className="text-sm font-semibold">{item.text}</div>
                      <div className="text-[10px] opacity-60 uppercase">
                        {item.type}
                      </div>
                      {item.type === 'task' && (
                        <div className="text-[10px] mt-1">
                          Status: {item.task?.status || 'pending'}
                        </div>
                      )}
                    </div>
                    <button
                      className="retro-btn retro-btn-secondary retro-btn-sm"
                      onClick={() => onAdd(item.id)}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

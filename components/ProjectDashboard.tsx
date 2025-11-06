'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Clock, Calendar, ChevronRight } from 'lucide-react'
import { RetroButton } from '@/components/ui/RetroButton'
import { RetroCard } from '@/components/ui/RetroCard'
import { apiClient } from '@/lib/api-client'
import { Item } from '@/types'

interface ProjectDashboardProps {
  project: Item
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
}

export function ProjectDashboard({ project, isOpen, onClose, onRefresh }: ProjectDashboardProps) {
  const [tasks, setTasks] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  useEffect(() => {
    if (isOpen && project) {
      loadProjectTasks()
    }
  }, [isOpen, project])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const loadProjectTasks = async () => {
    setIsLoading(true)
    try {
      // Fetch all tasks and filter by project_id
      const response = await apiClient.getItems({ type: 'task', limit: 100 })
      const projectTasks = response.items.filter(
        item => item.task?.project_id === project.id
      )
      setTasks(projectTasks)
    } catch (error) {
      console.error('Failed to load project tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      if (!task || !task.task) return

      const newStatus = task.task.status === 'completed' ? 'pending' : 'completed'
      await apiClient.updateItem(taskId, {
        task: {
          ...task.task,
          status: newStatus
        }
      })

      // Update local state
      setTasks(tasks.map(t =>
        t.id === taskId
          ? { ...t, task: { ...t.task!, status: newStatus } }
          : t
      ))

      // Refresh parent if callback provided
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  // Touch handlers for swipe-down gesture
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchEnd - touchStart
    const isDownSwipe = distance > minSwipeDistance

    if (isDownSwipe) {
      onClose()
    }
  }

  // Calculate progress
  const completedTasks = tasks.filter(t => t.task?.status === 'completed').length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get current task (highest priority incomplete task)
  const currentTask = tasks
    .filter(t => t.task?.status !== 'completed')
    .sort((a, b) => (b.task?.priority || 0) - (a.task?.priority || 0))[0]

  // Get remaining tasks (excluding current)
  const remainingTasks = tasks
    .filter(t => t.task?.status !== 'completed' && t.id !== currentTask?.id)
    .sort((a, b) => (b.task?.priority || 0) - (a.task?.priority || 0))

  // Check if tasks are overdue
  const isOverdue = (task: Item) => {
    if (!task.task?.due_date) return false
    return task.task.due_date < Date.now()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Slide-up Panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          height: '75vh',
          maxHeight: '600px'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="h-full flex flex-col bg-[var(--retro-background)] border-t-4 border-[var(--retro-border)] rounded-t-xl shadow-2xl overflow-hidden">
          {/* Handle bar for visual swipe indicator */}
          <div className="flex justify-center pt-2 pb-1 bg-[var(--retro-surface)]">
            <div className="w-12 h-1 bg-[var(--retro-border)] rounded-full opacity-50" />
          </div>

          {/* Header */}
          <div className="palm-status-bar flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide truncate flex-1 mr-2">
              {project.text}
            </h2>
            <RetroButton onClick={onClose} size="sm" variant="secondary">
              <X className="w-4 h-4" />
            </RetroButton>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto palm-scrollbar p-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-sm opacity-70">
                Loading project data...
              </div>
            ) : (
              <>
                {/* Circular Progress Indicator */}
                <RetroCard>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      {/* Circular progress ring */}
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="var(--retro-border)"
                          strokeWidth="6"
                          fill="none"
                          opacity="0.3"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="var(--retro-primary)"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - progressPercentage / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{progressPercentage}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">
                        Progress
                      </p>
                      <p className="text-lg font-bold">
                        {completedTasks} / {totalTasks} Tasks
                      </p>
                      <p className="text-xs opacity-70 mt-1">
                        Status: {project.project?.status || 'planning'}
                      </p>
                    </div>
                  </div>
                </RetroCard>

                {/* Current Task Card */}
                {currentTask && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2 opacity-70">
                      Current Task
                    </h3>
                    <RetroCard className="border-2 border-[var(--retro-primary)]">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🔥</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold mb-1">{currentTask.text}</p>
                          <div className="flex flex-wrap gap-2 text-xs opacity-70">
                            {currentTask.task?.priority && (
                              <span className="flex items-center gap-1">
                                <ChevronRight className="w-3 h-3" />
                                Priority: {currentTask.task.priority}
                              </span>
                            )}
                            {currentTask.task?.due_date && (
                              <span className={`flex items-center gap-1 ${isOverdue(currentTask) ? 'text-red-600 font-bold' : ''}`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(currentTask.task.due_date).toLocaleDateString()}
                                {isOverdue(currentTask) && ' (OVERDUE)'}
                              </span>
                            )}
                            {currentTask.task?.estimated_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {currentTask.task.estimated_time}h
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleTask(currentTask.id)}
                          className="palm-checkbox mt-1"
                        />
                      </div>
                    </RetroCard>
                  </div>
                )}

                {/* Remaining Tasks List */}
                {remainingTasks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2 opacity-70">
                      Remaining Tasks ({remainingTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {remainingTasks.map(task => (
                        <RetroCard key={task.id} className="palm-list-item">
                          <div className="flex items-start gap-2 w-full">
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => toggleTask(task.id)}
                              className="palm-checkbox mt-0.5"
                            />
                            <div className="flex-1">
                              <p className="text-sm">{task.text}</p>
                              {(task.task?.priority || task.task?.due_date || task.task?.estimated_time) && (
                                <p className="text-xs opacity-70 mt-1">
                                  {task.task?.priority && `Priority: ${task.task.priority}`}
                                  {task.task?.due_date && (
                                    <span className={isOverdue(task) ? 'text-red-600 font-bold ml-2' : 'ml-2'}>
                                      Due: {new Date(task.task.due_date).toLocaleDateString()}
                                      {isOverdue(task) && ' (OVERDUE)'}
                                    </span>
                                  )}
                                  {task.task?.estimated_time && ` • ${task.task.estimated_time}h`}
                                </p>
                              )}
                            </div>
                          </div>
                        </RetroCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2 opacity-70">
                      Completed ({completedTasks})
                    </h3>
                    <div className="space-y-2">
                      {tasks
                        .filter(t => t.task?.status === 'completed')
                        .map(task => (
                          <RetroCard key={task.id} className="palm-list-item opacity-60">
                            <div className="flex items-start gap-2 w-full">
                              <input
                                type="checkbox"
                                checked={true}
                                onChange={() => toggleTask(task.id)}
                                className="palm-checkbox mt-0.5"
                              />
                              <div className="flex-1">
                                <p className="text-sm line-through">{task.text}</p>
                              </div>
                            </div>
                          </RetroCard>
                        ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {tasks.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm opacity-70 mb-4">No tasks in this project yet</p>
                    <RetroButton variant="primary" size="sm">
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Task
                    </RetroButton>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t-2 border-[var(--retro-border)]">
                  <RetroButton variant="secondary" size="sm" className="text-xs">
                    <Plus className="w-3 h-3 inline mr-1" />
                    Task
                  </RetroButton>
                  <RetroButton variant="secondary" size="sm" className="text-xs">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Timeline
                  </RetroButton>
                  <RetroButton variant="secondary" size="sm" className="text-xs">
                    📝 Notes
                  </RetroButton>
                </div>

                {/* Phase Progress Placeholder */}
                <RetroCard className="opacity-50">
                  <p className="text-xs font-bold uppercase tracking-wide mb-2 opacity-70">
                    Project Phases (Coming Soon)
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span>✅ Planning</span>
                    <span>→</span>
                    <span>⚙️ Development</span>
                    <span>→</span>
                    <span>⬜ Testing</span>
                    <span>→</span>
                    <span>⬜ Launch</span>
                  </div>
                </RetroCard>

                {/* Full View Button */}
                <RetroButton
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    // Future: Navigate to full project editor
                    console.log('Full view for project:', project.id)
                  }}
                >
                  Full View
                  <ChevronRight className="w-4 h-4 inline ml-2" />
                </RetroButton>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

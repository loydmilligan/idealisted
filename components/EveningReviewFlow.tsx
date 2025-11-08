'use client'

import { useState } from 'react'
import { Plan, Item, PlanWithEntities } from '@/types'
import { RetroButton } from '@/components/ui/RetroButton'
import { RetroCard } from '@/components/ui/RetroCard'
import { RetroTextarea } from '@/components/ui/RetroInput'
import { X, CheckCircle, Circle, Calendar } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface EveningReviewFlowProps {
  plan: PlanWithEntities
  allProjects: Item[]
  unparsedCount: number
  onClose: () => void
  onComplete: () => void
}

type ReviewStep = 'tasks' | 'projects' | 'journal' | 'inbox' | 'reschedule' | 'tomorrow'

export function EveningReviewFlow({
  plan,
  allProjects,
  unparsedCount,
  onClose,
  onComplete
}: EveningReviewFlowProps) {
  const [currentStep, setCurrentStep] = useState<ReviewStep>('tasks')
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(
    new Set(plan.tasks.filter(t => t.status === 'completed').map(t => t.id))
  )
  const [projectUpdates, setProjectUpdates] = useState<Record<string, { progress?: number; notes?: string }>>({})
  const [journalEntry, setJournalEntry] = useState('')
  const [rescheduledTasks, setRescheduledTasks] = useState<Record<string, string | null>>({})
  const [isLoading, setIsLoading] = useState(false)

  const incompleteTasks = plan.tasks.filter(t => !completedTasks.has(t.id))

  const handleToggleTask = async (taskId: string) => {
    const newCompleted = new Set(completedTasks)
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId)
    } else {
      newCompleted.add(taskId)
    }
    setCompletedTasks(newCompleted)

    // Update task status
    try {
      const task = plan.tasks.find(t => t.id === taskId)
      if (task) {
        await apiClient.updateItem(task.id, {
          task: {
            status: newCompleted.has(taskId) ? 'completed' : 'pending',
            priority: task.priority,
          }
        })
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleReschedule = (taskId: string, option: 'tomorrow' | 'pick' | 'backlog' | 'delete') => {
    if (option === 'delete') {
      setRescheduledTasks(prev => ({ ...prev, [taskId]: 'DELETE' }))
    } else if (option === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setRescheduledTasks(prev => ({ ...prev, [taskId]: tomorrow.toISOString().split('T')[0] }))
    } else if (option === 'backlog') {
      setRescheduledTasks(prev => ({ ...prev, [taskId]: null }))
    } else if (option === 'pick') {
      // This would open a date picker - for now just set to next week
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      setRescheduledTasks(prev => ({ ...prev, [taskId]: nextWeek.toISOString().split('T')[0] }))
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Step 1: Mark completed tasks (already done in real-time)

      // Step 2: Update projects (if any updates)
      for (const [projectId, updates] of Object.entries(projectUpdates)) {
        if (updates.progress !== undefined || updates.notes) {
          await apiClient.updateItem(projectId, {
            project: {
              progress: updates.progress,
              status: 'active',
            }
          })
        }
      }

      // Step 3: Save journal entry
      if (journalEntry.trim()) {
        await apiClient.updatePlan(plan.id, {
          journal_entry: journalEntry
        })
      }

      // Step 4: Process inbox reminder (skip for now - user navigates manually)

      // Step 5: Reschedule tasks
      for (const [taskId, dueDate] of Object.entries(rescheduledTasks)) {
        if (dueDate === 'DELETE') {
          await apiClient.deleteItem(taskId)
        } else {
          await apiClient.rescheduleTask(taskId, (dueDate || 'date') as any, dueDate || undefined)
        }
      }

      // Step 6: Auto-populate tomorrow's plan
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      await apiClient.autoPopulatePlan(tomorrowStr)

      // Mark today's plan as complete
      await apiClient.completePlan(plan.id)

      onComplete()
    } catch (error) {
      console.error('Failed to complete evening review:', error)
      alert('Failed to complete review. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'tasks':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide">Mark Completed Tasks</h3>
            <p className="text-xs opacity-70">
              Check off the tasks you completed today
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto palm-scrollbar">
              {plan.tasks.map(task => (
                <RetroCard key={task.id} className="palm-list-item">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="checkbox"
                      checked={completedTasks.has(task.id)}
                      onChange={() => handleToggleTask(task.id)}
                      className="palm-checkbox"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${completedTasks.has(task.id) ? 'line-through opacity-50' : ''}`}>
                        {task.item.text}
                      </p>
                    </div>
                  </div>
                </RetroCard>
              ))}
            </div>

            <div className="text-xs opacity-70 bg-[var(--retro-primary)] bg-opacity-10 p-3 rounded">
              Completed: {completedTasks.size} / {plan.tasks.length} tasks
            </div>
          </div>
        )

      case 'projects':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide">Update Projects</h3>
            <p className="text-xs opacity-70">
              Quick progress updates on active projects (optional)
            </p>

            {allProjects.length === 0 ? (
              <div className="text-center py-8 text-sm opacity-70">
                No active projects
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto palm-scrollbar">
                {allProjects.slice(0, 5).map(project => (
                  <RetroCard key={project.id} className="palm-list-item" inset>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{project.text}</p>
                      <div className="flex items-center gap-2">
                        <label className="text-xs opacity-70">Progress:</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={projectUpdates[project.id]?.progress || (project.project as any)?.progress || 0}
                          onChange={(e) => setProjectUpdates({
                            ...projectUpdates,
                            [project.id]: {
                              ...projectUpdates[project.id],
                              progress: parseInt(e.target.value)
                            }
                          })}
                          className="flex-1"
                        />
                        <span className="text-xs w-10 text-right">
                          {projectUpdates[project.id]?.progress ?? (project.project as any)?.progress ?? 0}%
                        </span>
                      </div>
                    </div>
                  </RetroCard>
                ))}
              </div>
            )}
          </div>
        )

      case 'journal':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide">Daily Journal (Optional)</h3>
            <p className="text-xs opacity-70">
              Reflect on your day, wins, challenges, or learnings
            </p>

            <RetroTextarea
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              placeholder="What went well today? What could be improved tomorrow?"
              rows={8}
              className="w-full"
            />
          </div>
        )

      case 'inbox':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide">Process Inbox</h3>
            <p className="text-xs opacity-70">
              You have {unparsedCount} unparsed items in your inbox
            </p>

            <div className="bg-[var(--retro-primary)] bg-opacity-10 p-4 rounded space-y-3">
              <p className="text-sm">
                Clear your inbox to maintain mental clarity and ensure nothing falls through the cracks.
              </p>

              <div className="flex gap-2">
                <RetroButton
                  onClick={() => setCurrentStep('reschedule')}
                  variant="secondary"
                  size="sm"
                >
                  Skip for Now
                </RetroButton>
                <RetroButton
                  onClick={() => {
                    window.location.href = '/?view=inbox'
                  }}
                  variant="primary"
                  size="sm"
                >
                  Process Now
                </RetroButton>
              </div>
            </div>
          </div>
        )

      case 'reschedule':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide">Reschedule Unfinished Tasks</h3>
            <p className="text-xs opacity-70">
              {incompleteTasks.length} incomplete tasks - choose what to do with each
            </p>

            {incompleteTasks.length === 0 ? (
              <div className="text-center py-8 text-sm opacity-70">
                All tasks completed! Great job!
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto palm-scrollbar">
                {incompleteTasks.map(task => (
                  <RetroCard key={task.id} className="palm-list-item">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{task.item.text}</p>

                      {rescheduledTasks[task.id] && (
                        <div className="text-xs opacity-70 bg-green-500 bg-opacity-10 p-2 rounded">
                          {rescheduledTasks[task.id] === 'DELETE'
                            ? 'Will be deleted'
                            : rescheduledTasks[task.id] === null
                            ? 'Moved to backlog'
                            : `Rescheduled to ${rescheduledTasks[task.id]}`
                          }
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1">
                        <RetroButton
                          onClick={() => handleReschedule(task.id, 'tomorrow')}
                          variant={rescheduledTasks[task.id] ? 'secondary' : 'primary'}
                          size="sm"
                          className="text-xs"
                        >
                          Tomorrow
                        </RetroButton>
                        <RetroButton
                          onClick={() => handleReschedule(task.id, 'pick')}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Pick Date
                        </RetroButton>
                        <RetroButton
                          onClick={() => handleReschedule(task.id, 'backlog')}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Backlog
                        </RetroButton>
                        <RetroButton
                          onClick={() => handleReschedule(task.id, 'delete')}
                          variant="danger"
                          size="sm"
                          className="text-xs"
                        >
                          Delete
                        </RetroButton>
                      </div>
                    </div>
                  </RetroCard>
                ))}
              </div>
            )}
          </div>
        )

      case 'tomorrow':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide">Draft Tomorrow's Plan</h3>
            <p className="text-xs opacity-70">
              Auto-populating tomorrow's plan with rescheduled and due tasks
            </p>

            <div className="bg-[var(--retro-primary)] bg-opacity-10 p-4 rounded space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm font-medium">Ready to Complete Review</p>
              </div>

              <ul className="text-xs space-y-1 opacity-70">
                <li>✓ {completedTasks.size} tasks completed</li>
                <li>✓ {Object.keys(projectUpdates).length} projects updated</li>
                {journalEntry && <li>✓ Journal entry saved</li>}
                <li>✓ {Object.keys(rescheduledTasks).length} tasks rescheduled</li>
              </ul>

              <p className="text-sm mt-4">
                Tomorrow's plan will include:
              </p>
              <ul className="text-xs space-y-1 opacity-70">
                <li>• Rescheduled tasks from today</li>
                <li>• Tasks with due date tomorrow</li>
                <li>• High-priority tasks from backlog</li>
              </ul>
            </div>
          </div>
        )
    }
  }

  const getNextStep = (): ReviewStep | null => {
    const steps: ReviewStep[] = ['tasks', 'projects', 'journal', 'inbox', 'reschedule', 'tomorrow']
    const currentIndex = steps.indexOf(currentStep)
    return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
  }

  const getPrevStep = (): ReviewStep | null => {
    const steps: ReviewStep[] = ['tasks', 'projects', 'journal', 'inbox', 'reschedule', 'tomorrow']
    const currentIndex = steps.indexOf(currentStep)
    return currentIndex > 0 ? steps[currentIndex - 1] : null
  }

  const stepLabels: Record<ReviewStep, string> = {
    tasks: 'Complete Tasks',
    projects: 'Update Projects',
    journal: 'Journal',
    inbox: 'Process Inbox',
    reschedule: 'Reschedule',
    tomorrow: 'Tomorrow'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <RetroCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-[var(--retro-primary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wide">
              Evening Review
            </h2>
            <RetroButton
              onClick={onClose}
              variant="secondary"
              size="sm"
            >
              <X className="w-4 h-4" />
            </RetroButton>
          </div>

          {/* Progress indicator */}
          <div className="flex gap-1">
            {(['tasks', 'projects', 'journal', 'inbox', 'reschedule', 'tomorrow'] as ReviewStep[]).map(step => (
              <div
                key={step}
                className={`flex-1 h-1 rounded ${
                  step === currentStep
                    ? 'bg-[var(--retro-primary)]'
                    : 'bg-[var(--retro-primary)] opacity-20'
                }`}
              />
            ))}
          </div>
          <p className="text-xs opacity-70 mt-2">
            Step {(['tasks', 'projects', 'journal', 'inbox', 'reschedule', 'tomorrow'] as ReviewStep[]).indexOf(currentStep) + 1} of 6: {stepLabels[currentStep]}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-[var(--retro-primary)] flex gap-2 justify-between">
          <RetroButton
            onClick={() => {
              const prev = getPrevStep()
              if (prev) setCurrentStep(prev)
            }}
            variant="secondary"
            disabled={!getPrevStep()}
          >
            Previous
          </RetroButton>

          <div className="flex gap-2">
            <RetroButton
              onClick={onClose}
              variant="secondary"
            >
              Save & Exit
            </RetroButton>

            {getNextStep() ? (
              <RetroButton
                onClick={() => {
                  const next = getNextStep()
                  if (next) setCurrentStep(next)
                }}
                variant="primary"
              >
                Next
              </RetroButton>
            ) : (
              <RetroButton
                onClick={handleComplete}
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Completing...' : 'Complete Review'}
              </RetroButton>
            )}
          </div>
        </div>
      </RetroCard>
    </div>
  )
}

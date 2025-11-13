'use client'

import { useState } from 'react'
import { Plan, Item } from '@/types'
import { RetroButton } from '@/components/ui/RetroButton'
import { RetroCard } from '@/components/ui/RetroCard'
import { X, GripVertical, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface MorningFinalizeModalProps {
  plan: Plan
  tasks: Item[]
  onClose: () => void
  onFinalize: () => void
}

export function MorningFinalizeModal({ plan, tasks, onClose, onFinalize }: MorningFinalizeModalProps) {
  const [planTasks, setPlanTasks] = useState<Item[]>(tasks)
  const [isLoading, setIsLoading] = useState(false)

  const handleRemoveTask = (taskId: string) => {
    setPlanTasks(planTasks.filter(t => t.id !== taskId))
  }

  const handleReorder = (taskId: string, direction: 'up' | 'down') => {
    const index = planTasks.findIndex(t => t.id === taskId)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= planTasks.length) return

    const newTasks = [...planTasks]
    const [removed] = newTasks.splice(index, 1)
    newTasks.splice(newIndex, 0, removed)
    setPlanTasks(newTasks)
  }

  const handleFinalize = async () => {
    setIsLoading(true)
    try {
      // Finalize the plan
      await apiClient.finalizePlan(plan.id)

      onFinalize()
    } catch (error) {
      console.error('Failed to finalize plan:', error)
      alert('Failed to finalize plan. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <RetroCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[var(--retro-primary)]">
          <h2 className="text-lg font-bold uppercase tracking-wide">
            Finalize Today's Plan
          </h2>
          <RetroButton
            onClick={onClose}
            variant="secondary"
            size="sm"
          >
            <X className="w-4 h-4" />
          </RetroButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm opacity-70">
            Review and adjust your plan for today. Remove tasks you won't tackle or reorder them by priority.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide">
                Tasks ({planTasks.length})
              </h3>
            </div>

            {planTasks.length === 0 ? (
              <div className="text-center py-8 text-sm opacity-70">
                No tasks in plan. Add some tasks to get started!
              </div>
            ) : (
              <div className="space-y-2">
                {planTasks.map((task, index) => (
                  <RetroCard key={task.id} className="palm-list-item">
                    <div className="flex items-center gap-2 w-full">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <RetroButton
                          onClick={() => handleReorder(task.id, 'up')}
                          variant="secondary"
                          size="sm"
                          disabled={index === 0}
                          className="px-1 py-0.5 text-[10px]"
                        >
                          ▲
                        </RetroButton>
                        <RetroButton
                          onClick={() => handleReorder(task.id, 'down')}
                          variant="secondary"
                          size="sm"
                          disabled={index === planTasks.length - 1}
                          className="px-1 py-0.5 text-[10px]"
                        >
                          ▼
                        </RetroButton>
                      </div>

                      {/* Task info */}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.text}</p>
                        <p className="text-[10px] opacity-70">
                          Priority: {task.task?.priority || 1}
                          {task.task?.estimated_time && ` • Est: ${task.task.estimated_time}h`}
                        </p>
                      </div>

                      {/* Remove button */}
                      <RetroButton
                        onClick={() => handleRemoveTask(task.id)}
                        variant="danger"
                        size="sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </RetroButton>
                    </div>
                  </RetroCard>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-[var(--retro-primary)] flex gap-2 justify-end">
          <RetroButton
            onClick={onClose}
            variant="secondary"
          >
            Cancel
          </RetroButton>
          <RetroButton
            onClick={handleFinalize}
            variant="primary"
            disabled={isLoading || planTasks.length === 0}
          >
            {isLoading ? 'Finalizing...' : 'Finalize Plan'}
          </RetroButton>
        </div>
      </RetroCard>
    </div>
  )
}

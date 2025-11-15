"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EntityDetailModal } from "@/components/entity-detail-modal"

interface Task {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  dueDate: string
  project: string
  completed: boolean
}

export function TasksScreen() {
  const [filter, setFilter] = useState<"today" | "backlog" | "all">("today")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [tasks] = useState<Task[]>([
    {
      id: "1",
      title: "Write comprehensive tests",
      priority: "high",
      dueDate: "Nov 8",
      project: "ChatterAI",
      completed: false,
    },
    {
      id: "2",
      title: "Implement SSE transport",
      priority: "medium",
      dueDate: "Nov 8",
      project: "ChatterAI",
      completed: false,
    },
    {
      id: "3",
      title: "Deploy to staging",
      priority: "low",
      dueDate: "Nov 6",
      project: "ChatterAI",
      completed: true,
    },
  ])

  const highPriority = tasks.filter((t) => t.priority === "high" && !t.completed)
  const mediumPriority = tasks.filter((t) => t.priority === "medium" && !t.completed)
  const lowPriority = tasks.filter((t) => t.priority === "low")

  return (
    <>
      <div className="flex flex-col h-full pb-20" style={{ backgroundColor: "#E5DCC8" }}>
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#2C5F8F", color: "#FFD700" }}
        >
          <h1 className="text-lg font-bold tracking-wide">TASKS</h1>
          <button className="text-2xl">+</button>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-3 flex gap-2">
          {(["today", "backlog", "all"] as const).map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              className="h-9 px-4 text-xs font-semibold rounded-full capitalize"
              style={{
                backgroundColor: filter === f ? "#5B9BD5" : "#8B8B8B",
                color: "#fff",
              }}
            >
              {f === "today" ? "Today's Plan" : f}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* High Priority */}
          {highPriority.length > 0 && (
            <div>
              <h2 className="text-xs font-bold mb-2 tracking-wide flex items-center gap-2" style={{ color: "#4A4A4A" }}>
                <span>⚠️</span>
                <span>HIGH PRIORITY</span>
              </h2>
              <div className="space-y-2">
                {highPriority.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full rounded-lg p-3 border-2 text-left"
                    style={{
                      backgroundColor: "#fff",
                      borderColor: "#D64545",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-5 h-5 rounded border-2"
                        style={{ borderColor: "#8B8B8B" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1" style={{ color: "#1A1A1A" }}>
                          {task.title}
                        </p>
                        <p className="text-xs" style={{ color: "#4A4A4A" }}>
                          Due: {task.dueDate} • {task.project}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority */}
          {mediumPriority.length > 0 && (
            <div>
              <h2 className="text-xs font-bold mb-2 tracking-wide flex items-center gap-2" style={{ color: "#4A4A4A" }}>
                <span>⚡</span>
                <span>MEDIUM PRIORITY</span>
              </h2>
              <div className="space-y-2">
                {mediumPriority.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full rounded-lg p-3 border-2 text-left"
                    style={{
                      backgroundColor: "#fff",
                      borderColor: "#5B9BD5",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-0.5 w-5 h-5 rounded border-2"
                        style={{ borderColor: "#8B8B8B" }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1" style={{ color: "#1A1A1A" }}>
                          {task.title}
                        </p>
                        <p className="text-xs" style={{ color: "#4A4A4A" }}>
                          Due: {task.dueDate} • {task.project}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Low Priority */}
          {lowPriority.length > 0 && (
            <div>
              <h2 className="text-xs font-bold mb-2 tracking-wide flex items-center gap-2" style={{ color: "#4A4A4A" }}>
                <span>✓</span>
                <span>LOW PRIORITY</span>
              </h2>
              <div className="space-y-2">
                {lowPriority.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full rounded-lg p-3 border-2 text-left"
                    style={{
                      backgroundColor: task.completed ? "#f5f5f5" : "#fff",
                      borderColor: "#6B8E23",
                      opacity: task.completed ? 0.7 : 1,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        className="mt-0.5 w-5 h-5 rounded border-2"
                        style={{ borderColor: "#8B8B8B" }}
                        readOnly
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <p
                          className="text-sm font-medium mb-1"
                          style={{
                            color: "#1A1A1A",
                            textDecoration: task.completed ? "line-through" : "none",
                          }}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs" style={{ color: "#4A4A4A" }}>
                          {task.completed ? "Completed" : "Due"}: {task.dueDate} • {task.project}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full h-12 font-semibold rounded-lg text-base"
            style={{ backgroundColor: "#5B9BD5", color: "#fff" }}
          >
            Add to Today's Plan
          </Button>
        </div>
      </div>

      {selectedTask && <EntityDetailModal entity={selectedTask} type="task" onClose={() => setSelectedTask(null)} />}
    </>
  )
}

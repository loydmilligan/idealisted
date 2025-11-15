"use client"

import { Button } from "@/components/ui/button"

interface Project {
  id: string
  name: string
  progress: number
  completedTasks: number
  totalTasks: number
  status: "hot" | "cooling" | "stalled"
}

interface ProjectDashboardProps {
  project: Project
  onClose: () => void
}

export function ProjectDashboard({ project, onClose }: ProjectDashboardProps) {
  const finishingPower = Math.min(5, Math.floor((project.progress / 100) * 5))
  const remainingTasks = [
    { id: "1", title: "Write tests (ugh)", hasUgh: true },
    { id: "2", title: "Deploy to staging", hasUgh: false },
    { id: "3", title: "Final review", hasUgh: false },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative w-full rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{
          backgroundColor: "#E5DCC8",
          maxHeight: "60vh",
          overflow: "auto",
          marginBottom: "80px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-2 sticky top-0 z-10"
          style={{ backgroundColor: "#2C5F8F", color: "#FFD700" }}
        >
          <button onClick={onClose} className="text-xl">
            ←
          </button>
          <h1 className="text-base font-bold tracking-wide flex-1">PROJECT: {project.name}</h1>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Circular Progress */}
          <div className="flex justify-center">
            <div
              className="relative w-32 h-32 rounded-full flex items-center justify-center border-8"
              style={{
                borderColor: "#5B9BD5",
                backgroundColor: "#fff",
              }}
            >
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: "#1A1A1A" }}>
                  {project.progress}%
                </div>
                <div className="text-xs font-medium mt-1" style={{ color: "#4A4A4A" }}>
                  {project.completedTasks} / {project.totalTasks}
                </div>
              </div>
            </div>
          </div>

          {/* Current Task */}
          <div
            className="rounded-lg p-4 border-4"
            style={{
              backgroundColor: "#fff",
              borderColor: "#5B9BD5",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔥</span>
              <h3 className="text-xs font-bold tracking-wide" style={{ color: "#4A4A4A" }}>
                CURRENT TASK
              </h3>
            </div>
            <p className="text-sm font-bold mb-2" style={{ color: "#1A1A1A" }}>
              Implement SSE transport
            </p>
            <div className="flex items-center gap-3 text-xs" style={{ color: "#4A4A4A" }}>
              <span className="flex items-center gap-1">
                <span>⚡</span>
                <span>Medium</span>
              </span>
              <span>│</span>
              <span className="flex items-center gap-1">
                <span>📅</span>
                <span>Nov 8</span>
              </span>
            </div>
          </div>

          {/* Finishing Power */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚧</span>
              <h3 className="text-xs font-bold tracking-wide" style={{ color: "#4A4A4A" }}>
                FINISHING POWER: ({finishingPower}/5)
              </h3>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-6 rounded"
                  style={{
                    backgroundColor: i < finishingPower ? "#5B9BD5" : "#D4C4A8",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Procrastination Alert */}
          {project.status === "stalled" && (
            <div
              className="rounded-lg p-4 border-2"
              style={{
                backgroundColor: "#fff",
                borderColor: "#E67E22",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚠️</span>
                <h3 className="text-xs font-bold tracking-wide" style={{ color: "#E67E22" }}>
                  PROCRASTINATION ALERT
                </h3>
              </div>
              <p className="text-xs mb-3" style={{ color: "#4A4A4A" }}>
                Project is {project.progress}% done but stalled
                <br />
                {project.totalTasks - project.completedTasks} tasks left, 2 marked "dreaded"
                <br />
                Last task: 4 days ago
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-9 text-xs font-semibold rounded"
                  style={{ backgroundColor: "#5B9BD5", color: "#fff" }}
                >
                  Power Through
                </Button>
                <Button
                  className="flex-1 h-9 text-xs font-semibold rounded"
                  style={{ backgroundColor: "#8B8B8B", color: "#fff" }}
                >
                  Break It Down
                </Button>
              </div>
            </div>
          )}

          {/* Remaining Tasks */}
          <div>
            <h3 className="text-xs font-bold mb-2 tracking-wide" style={{ color: "#4A4A4A" }}>
              REMAINING TASKS
            </h3>
            <div className="space-y-2">
              {remainingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 py-2">
                  <input type="checkbox" className="w-5 h-5 rounded border-2" style={{ borderColor: "#8B8B8B" }} />
                  <span className="text-sm" style={{ color: "#1A1A1A" }}>
                    {task.hasUgh && <span style={{ color: "#E67E22" }}>⚠️ </span>}
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pb-4">
            <Button
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: "#5B9BD5", color: "#fff" }}
            >
              +Task
            </Button>
            <Button
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: "#8B8B8B", color: "#fff" }}
            >
              Timeline
            </Button>
            <Button
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: "#8B8B8B", color: "#fff" }}
            >
              Notes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

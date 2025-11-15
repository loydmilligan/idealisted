"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProjectDashboard } from "@/components/project-dashboard"

interface Project {
  id: string
  name: string
  progress: number
  completedTasks: number
  totalTasks: number
  updatedDays: number
  status: "hot" | "cooling" | "stalled"
}

export function ProjectsScreen() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projects] = useState<Project[]>([
    {
      id: "1",
      name: "ChatterAI v2.0",
      progress: 73,
      completedTasks: 11,
      totalTasks: 15,
      updatedDays: 2,
      status: "hot",
    },
    {
      id: "2",
      name: "Home Office Setup",
      progress: 25,
      completedTasks: 3,
      totalTasks: 12,
      updatedDays: 5,
      status: "cooling",
    },
    {
      id: "3",
      name: "Learn Rust",
      progress: 10,
      completedTasks: 1,
      totalTasks: 10,
      updatedDays: 12,
      status: "stalled",
    },
  ])

  return (
    <>
      <div className="flex flex-col h-full pb-20" style={{ backgroundColor: "#E5DCC8" }}>
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#2C5F8F", color: "#FFD700" }}
        >
          <h1 className="text-lg font-bold tracking-wide">PROJECTS</h1>
          <button className="text-2xl">+</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xs font-bold tracking-wide" style={{ color: "#4A4A4A" }}>
                ALL PROJECTS
              </h2>
              <p className="text-xs mt-1" style={{ color: "#999999" }}>
                Overview of all your projects
              </p>
            </div>
            <Button
              className="h-8 px-3 text-xs font-semibold rounded"
              style={{ backgroundColor: "#E74C3C", color: "#fff" }}
            >
              CLEAR ALL
            </Button>
          </div>

          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="w-full rounded-lg p-4 border-2 text-left transition-all active:scale-98"
              style={{
                backgroundColor: "#fff",
                borderColor: "#8B8B8B",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1" style={{ color: "#1A1A1A" }}>
                    Project: {project.name}
                  </h3>
                </div>
                <button className="text-lg" style={{ color: "#4A4A4A" }}>
                  ⋮
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="h-6 rounded overflow-hidden" style={{ backgroundColor: "#D4C4A8" }}>
                  <div
                    className="h-full flex items-center justify-end px-2 text-xs font-bold transition-all"
                    style={{
                      width: `${project.progress}%`,
                      backgroundColor: "#5B9BD5",
                      color: "#fff",
                    }}
                  >
                    {project.progress}%
                  </div>
                </div>
              </div>

              {/* Status Line */}
              <div className="flex items-center gap-2 text-xs" style={{ color: "#4A4A4A" }}>
                <span className="text-base">
                  {project.status === "hot" && "🟢"}
                  {project.status === "cooling" && "🟡"}
                  {project.status === "stalled" && "🔴"}
                </span>
                <span>
                  {project.completedTasks} of {project.totalTasks} tasks
                </span>
                <span>•</span>
                <span>Updated {project.updatedDays}d ago</span>
              </div>
            </button>
          ))}

          <Button
            className="w-full h-12 font-semibold rounded-lg text-base"
            style={{ backgroundColor: "#5B9BD5", color: "#fff" }}
          >
            + New Project
          </Button>
        </div>
      </div>

      {selectedProject && <ProjectDashboard project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </>
  )
}

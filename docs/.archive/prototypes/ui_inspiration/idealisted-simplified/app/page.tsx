"use client"

import { useState } from "react"
import { DeviceFrame } from "@/components/device-frame"
import { CaptureScreen } from "@/components/screens/capture-screen"
import { ProjectsScreen } from "@/components/screens/projects-screen"
import { TasksScreen } from "@/components/screens/tasks-screen"
import { NotesScreen } from "@/components/screens/notes-screen"
import { TabBar } from "@/components/tab-bar"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"capture" | "inbox" | "tasks" | "notes" | "lists">("capture")

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(to bottom, #1a2a1a, #2d4a2c)" }}
    >
      <DeviceFrame>
        {activeTab === "capture" && <CaptureScreen />}
        {activeTab === "inbox" && <CaptureScreen />}
        {activeTab === "tasks" && <TasksScreen />}
        {activeTab === "notes" && <NotesScreen />}
        {activeTab === "lists" && <ProjectsScreen />}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </DeviceFrame>
    </div>
  )
}

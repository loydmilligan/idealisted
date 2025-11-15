"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ConvertModalProps {
  idea: {
    id: string
    text: string
    category: "task" | "note" | "list" | "project"
  }
  onClose: () => void
  onConvert: (data: any) => void
}

export function ConvertModal({ idea, onClose, onConvert }: ConvertModalProps) {
  const [title, setTitle] = useState(idea.text)
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium")
  const [dueDate, setDueDate] = useState("")

  const handleSubmit = () => {
    onConvert({
      id: idea.id,
      title,
      description,
      priority,
      dueDate,
      category: idea.category,
    })
    onClose()
  }

  const getCategoryColor = () => {
    switch (idea.category) {
      case "task":
        return "#845ef7"
      case "project":
        return "#4dabf7"
      case "list":
        return "#51cf66"
      case "note":
        return "#ffd43b"
      default:
        return "#868e96"
    }
  }

  const getCategoryLabel = () => {
    return idea.category.toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: "#E5DCC8",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#2C5F8F", color: "#FFD700" }}>
          <button onClick={onClose} className="text-xl">
            ×
          </button>
          <h1 className="text-base font-bold tracking-wide flex-1">CONVERT TO {getCategoryLabel()}</h1>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-4">
          {/* Category indicator */}
          <div
            className="rounded-lg p-3 border-l-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.5)",
              borderLeftColor: getCategoryColor(),
            }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: "#4A4A4A" }}>
              ORIGINAL IDEA
            </p>
            <p className="text-sm" style={{ color: "#1A1A1A" }}>
              {idea.text}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: "#4A4A4A" }}>
              TITLE
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 text-base border-2"
              style={{
                backgroundColor: "#fff",
                borderColor: "#8B8B8B",
                color: "#1A1A1A",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: "#4A4A4A" }}>
              DESCRIPTION
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 text-base border-2"
              style={{
                backgroundColor: "#fff",
                borderColor: "#8B8B8B",
                color: "#1A1A1A",
              }}
              placeholder="Add details..."
            />
          </div>

          {/* Priority (for tasks) */}
          {idea.category === "task" && (
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: "#4A4A4A" }}>
                PRIORITY
              </label>
              <div className="flex gap-2">
                {(["high", "medium", "low"] as const).map((p) => (
                  <Button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="flex-1 h-10 text-xs font-semibold rounded capitalize"
                    style={{
                      backgroundColor: priority === p ? "#5B9BD5" : "#8B8B8B",
                      color: "#fff",
                    }}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Due Date (for tasks) */}
          {idea.category === "task" && (
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: "#4A4A4A" }}>
                DUE DATE
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 text-base border-2"
                style={{
                  backgroundColor: "#fff",
                  borderColor: "#8B8B8B",
                  color: "#1A1A1A",
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onClose}
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: "#8B8B8B", color: "#fff" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: getCategoryColor(), color: "#fff" }}
            >
              Create {getCategoryLabel()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

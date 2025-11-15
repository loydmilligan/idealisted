"use client"

import { Button } from "@/components/ui/button"

interface EntityDetailModalProps {
  entity: any
  type: "task" | "note" | "list" | "project"
  onClose: () => void
}

export function EntityDetailModal({ entity, type, onClose }: EntityDetailModalProps) {
  const getTypeColor = () => {
    switch (type) {
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

  const getTypeLabel = () => {
    return type.toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel - constrained to not cover bottom tabs */}
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
          <h1 className="text-base font-bold tracking-wide flex-1">
            {getTypeLabel()}: {entity.title || entity.name}
          </h1>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-4">
          {/* Type indicator */}
          <div
            className="rounded-lg p-3 border-l-4"
            style={{
              backgroundColor: "#fff",
              borderLeftColor: getTypeColor(),
            }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: "#4A4A4A" }}>
              {getTypeLabel()} DETAILS
            </p>
            <p className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
              {entity.title || entity.name}
            </p>
          </div>

          {/* Task-specific details */}
          {type === "task" && (
            <>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: "#fff", border: "2px solid #8B8B8B" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#4A4A4A" }}>
                    PRIORITY
                  </p>
                  <p className="text-sm capitalize" style={{ color: "#1A1A1A" }}>
                    {entity.priority}
                  </p>
                </div>
                <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: "#fff", border: "2px solid #8B8B8B" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#4A4A4A" }}>
                    DUE DATE
                  </p>
                  <p className="text-sm" style={{ color: "#1A1A1A" }}>
                    {entity.dueDate}
                  </p>
                </div>
              </div>
              {entity.project && (
                <div className="rounded-lg p-3" style={{ backgroundColor: "#fff", border: "2px solid #8B8B8B" }}>
                  <p className="text-xs font-bold mb-1" style={{ color: "#4A4A4A" }}>
                    PROJECT
                  </p>
                  <p className="text-sm" style={{ color: "#1A1A1A" }}>
                    {entity.project}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Note-specific details */}
          {type === "note" && (
            <div className="rounded-lg p-3" style={{ backgroundColor: "#fff", border: "2px solid #8B8B8B" }}>
              <p className="text-xs font-bold mb-1" style={{ color: "#4A4A4A" }}>
                TYPE
              </p>
              <p className="text-sm capitalize" style={{ color: "#1A1A1A" }}>
                {entity.type}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pb-4">
            <Button
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: getTypeColor(), color: "#fff" }}
            >
              Edit
            </Button>
            <Button
              className="flex-1 h-11 font-semibold rounded-lg"
              style={{ backgroundColor: "#8B8B8B", color: "#fff" }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

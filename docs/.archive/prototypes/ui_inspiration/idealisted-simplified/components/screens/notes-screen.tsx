"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EntityDetailModal } from "@/components/entity-detail-modal"

interface Note {
  id: string
  title: string
  type: "research" | "video" | "meeting" | "link"
  updatedDays: number
  status?: string
}

export function NotesScreen() {
  const [filter, setFilter] = useState<"all" | "research" | "video" | "meeting">("all")
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [notes] = useState<Note[]>([
    {
      id: "1",
      title: "Python async patterns",
      type: "research",
      updatedDays: 3,
    },
    {
      id: "2",
      title: "Q4 Planning Session",
      type: "meeting",
      updatedDays: 5,
      status: "3 action items",
    },
    {
      id: "3",
      title: "FastAPI Tutorial Series",
      type: "video",
      updatedDays: 7,
      status: "Unread",
    },
  ])

  const filteredNotes = filter === "all" ? notes : notes.filter((n) => n.type === filter)

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case "research":
        return "🔬"
      case "video":
        return "🎥"
      case "meeting":
        return "🤝"
      case "link":
        return "🔗"
      default:
        return "📝"
    }
  }

  const getTypeLabel = (type: string) => {
    return type.toUpperCase()
  }

  return (
    <>
      <div className="flex flex-col h-full pb-20" style={{ backgroundColor: "#E5DCC8" }}>
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: "#2C5F8F", color: "#FFD700" }}
        >
          <h1 className="text-lg font-bold tracking-wide">NOTES</h1>
          <button className="text-2xl">+</button>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex gap-2">
            {(["all", "research", "video", "meeting"] as const).map((f) => (
              <Button
                key={f}
                onClick={() => setFilter(f)}
                className="h-9 px-4 text-xs font-semibold rounded-full capitalize whitespace-nowrap"
                style={{
                  backgroundColor: filter === f ? "#5B9BD5" : "#8B8B8B",
                  color: "#fff",
                }}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {Object.entries(
            filteredNotes.reduce(
              (acc, note) => {
                const type = note.type
                if (!acc[type]) acc[type] = []
                acc[type].push(note)
                return acc
              },
              {} as Record<string, Note[]>,
            ),
          ).map(([type, typeNotes]) => (
            <div key={type}>
              <h2 className="text-xs font-bold mb-2 tracking-wide flex items-center gap-2" style={{ color: "#4A4A4A" }}>
                <span>{getTypeEmoji(type)}</span>
                <span>{getTypeLabel(type)}</span>
              </h2>
              <div className="space-y-2">
                {typeNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className="w-full rounded-lg p-4 border-2 text-left transition-all active:scale-98"
                    style={{
                      backgroundColor: "#fff",
                      borderColor: "#8B8B8B",
                    }}
                  >
                    <h3 className="font-bold text-sm mb-1" style={{ color: "#1A1A1A" }}>
                      {note.title}
                    </h3>
                    <p className="text-xs" style={{ color: "#4A4A4A" }}>
                      {note.status && `${note.status} • `}
                      {note.updatedDays === 1
                        ? "Updated 1 day ago"
                        : note.updatedDays < 7
                          ? `Updated ${note.updatedDays} days ago`
                          : `Saved ${Math.floor(note.updatedDays / 7)} week${Math.floor(note.updatedDays / 7) > 1 ? "s" : ""} ago`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedNote && <EntityDetailModal entity={selectedNote} type="note" onClose={() => setSelectedNote(null)} />}
    </>
  )
}

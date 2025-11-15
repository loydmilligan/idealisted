"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConvertModal } from "@/components/convert-modal"

interface Idea {
  id: string
  text: string
  parsed: boolean
  category?: "task" | "note" | "list" | "project"
  emoji?: string
}

export function CaptureScreen() {
  const [inputValue, setInputValue] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([
    { id: "1", text: "New app concept", parsed: false },
    { id: "2", text: "Book ideas for sci-fi novel", parsed: false },
    { id: "3", text: "Meeting minutes", parsed: true, category: "note", emoji: "🔬" },
    { id: "4", text: "Finish presentation", parsed: true, category: "task", emoji: "📋" },
    { id: "5", text: "Reading list", parsed: true, category: "list", emoji: "📁" },
  ])
  const [convertingIdea, setConvertingIdea] = useState<Idea | null>(null)
  const [flowAnimation, setFlowAnimation] = useState<string | null>(null)

  const handleCapture = () => {
    if (inputValue.trim()) {
      setIdeas([{ id: Date.now().toString(), text: inputValue, parsed: false }, ...ideas])
      setInputValue("")
      setFlowAnimation("capture")
      setTimeout(() => setFlowAnimation(null), 800)
    }
  }

  const handleQuickAdd = (category: "task" | "note" | "list" | "project") => {
    const emoji = category === "task" ? "📋" : category === "note" ? "🔬" : category === "list" ? "📁" : "🎯"
    const newIdea: Idea = {
      id: Date.now().toString(),
      text: `New ${category}`,
      parsed: true,
      category,
      emoji,
    }
    setIdeas([newIdea, ...ideas])
    setFlowAnimation(`quickadd-${category}`)
    setTimeout(() => setFlowAnimation(null), 800)
    setConvertingIdea(newIdea)
  }

  const handleCategorize = (id: string, category: "task" | "note" | "list" | "project") => {
    const idea = ideas.find((i) => i.id === id)
    if (idea) {
      const updatedIdea = {
        ...idea,
        parsed: true,
        category,
        emoji: category === "task" ? "📋" : category === "note" ? "🔬" : category === "list" ? "📁" : "🎯",
      }
      setIdeas(ideas.map((i) => (i.id === id ? updatedIdea : i)))
      setFlowAnimation("sort")
      setTimeout(() => setFlowAnimation(null), 800)
    }
  }

  const handleConvertClick = (idea: Idea) => {
    if (idea.category) {
      setConvertingIdea(idea)
    }
  }

  const handleConvert = (data: any) => {
    setIdeas(ideas.filter((i) => i.id !== data.id))
    setFlowAnimation("convert")
    setTimeout(() => setFlowAnimation(null), 800)
  }

  const unparsedIdeas = ideas.filter((i) => !i.parsed)
  const parsedIdeas = ideas.filter((i) => i.parsed)

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "task":
        return { bright: "#845ef7", pastel: "#d0bfff", bg: "rgba(132, 94, 247, 0.12)" }
      case "project":
        return { bright: "#4dabf7", pastel: "#a5d8ff", bg: "rgba(77, 171, 247, 0.12)" }
      case "list":
        return { bright: "#51cf66", pastel: "#b2f2bb", bg: "rgba(81, 207, 102, 0.12)" }
      case "note":
        return { bright: "#ffd43b", pastel: "#ffec99", bg: "rgba(255, 212, 59, 0.12)" }
      default:
        return { bright: "#868e96", pastel: "#e9ecef", bg: "rgba(134, 142, 150, 0.08)" }
    }
  }

  return (
    <>
      <div className="flex h-full pb-20 relative" style={{ backgroundColor: "#C8D4B8" }}>
        {/* Left Flow Lane */}
        <div className="w-8 flex-shrink-0 relative">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Main flow path: capture → unsorted → sorted */}
            <path
              d="M 16 80 L 16 200 L 16 450"
              stroke="#4A4A4A"
              strokeWidth="2"
              fill="none"
              strokeDasharray={flowAnimation === "capture" || flowAnimation === "sort" ? "0" : "4,4"}
            />
            {/* Flow nodes */}
            <circle cx="16" cy="80" r="4" fill="#4A4A4A" opacity="0.5" />
            <circle cx="16" cy="200" r="4" fill="#4A4A4A" opacity="0.5" />
            <circle cx="16" cy="450" r="4" fill="#4A4A4A" opacity="0.5" />
            {/* Animated pulse for main flow */}
            {(flowAnimation === "capture" || flowAnimation === "sort") && (
              <circle cx="16" cy={flowAnimation === "capture" ? "140" : "325"} r="5" fill="#5B9BD5">
                <animate attributeName="cy" from="80" to="450" dur="0.8s" repeatCount="1" />
              </circle>
            )}
          </svg>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Quick Capture */}
          <div>
            <div className="flex gap-2 items-center mb-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCapture()}
                placeholder="CAPTURE IDEA..."
                className="flex-1 h-11 text-sm font-mono font-bold border-2 rounded-md"
                style={{
                  backgroundColor: "#fff",
                  borderColor: "#4A4A4A",
                  color: "#1A1A1A",
                }}
              />
              <Button
                onClick={handleCapture}
                className="h-11 w-11 text-lg font-bold rounded-md"
                style={{ backgroundColor: "#6B8E23", color: "#fff" }}
              >
                ✓
              </Button>
              <Button className="h-11 w-11 text-lg rounded-md" style={{ backgroundColor: "#5B9BD5", color: "#fff" }}>
                🤖
              </Button>
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleQuickAdd("note")}
              className="h-12 px-3 font-bold text-xs rounded-md border-2"
              style={{
                backgroundColor: getCategoryColor("note").bg,
                borderColor: getCategoryColor("note").bright,
                color: "#1A1A1A",
              }}
            >
              NOTES
            </Button>
            <Button
              onClick={() => handleQuickAdd("task")}
              className="h-12 px-3 font-bold text-xs rounded-md border-2"
              style={{
                backgroundColor: getCategoryColor("task").bg,
                borderColor: getCategoryColor("task").bright,
                color: "#1A1A1A",
              }}
            >
              TASKS
            </Button>
            <Button
              onClick={() => handleQuickAdd("list")}
              className="h-12 px-3 font-bold text-xs rounded-md border-2"
              style={{
                backgroundColor: getCategoryColor("list").bg,
                borderColor: getCategoryColor("list").bright,
                color: "#1A1A1A",
              }}
            >
              LISTS
            </Button>
          </div>

          {/* Unsorted Inbox */}
          <div
            className="rounded-md border-2 p-3"
            style={{
              borderColor: "#4A4A4A",
              backgroundColor: "rgba(255,255,255,0.3)",
            }}
          >
            <h2 className="text-xs font-bold font-mono mb-3" style={{ color: "#1A1A1A" }}>
              UNSORTED INBOX
            </h2>
            <div className="space-y-2">
              {unparsedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded p-2.5"
                  style={{
                    backgroundColor: "rgba(134, 142, 150, 0.15)",
                  }}
                >
                  <p className="text-sm mb-2" style={{ color: "#1A1A1A" }}>
                    {idea.text}
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button
                      onClick={() => handleCategorize(idea.id, "note")}
                      className="h-7 px-2.5 text-[10px] font-bold rounded"
                      style={{ backgroundColor: getCategoryColor("note").bright, color: "#1A1A1A" }}
                    >
                      Note
                    </Button>
                    <Button
                      onClick={() => handleCategorize(idea.id, "task")}
                      className="h-7 px-2.5 text-[10px] font-bold rounded"
                      style={{ backgroundColor: getCategoryColor("task").bright, color: "#fff" }}
                    >
                      Task
                    </Button>
                    <Button
                      onClick={() => handleCategorize(idea.id, "list")}
                      className="h-7 px-2.5 text-[10px] font-bold rounded"
                      style={{ backgroundColor: getCategoryColor("list").bright, color: "#fff" }}
                    >
                      List
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sorted Inbox */}
          <div
            className="rounded-md border-2 p-3"
            style={{
              borderColor: "#4A4A4A",
              backgroundColor: "rgba(255,255,255,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold font-mono" style={{ color: "#1A1A1A" }}>
                SORTED INBOX
              </h2>
              <div className="flex gap-2">
                <div
                  className="h-5 px-2 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getCategoryColor("note").bright, color: "#1A1A1A" }}
                >
                  NOTES
                </div>
                <div
                  className="h-5 px-2 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getCategoryColor("task").bright, color: "#fff" }}
                >
                  TASKS
                </div>
                <div
                  className="h-5 px-2 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{ backgroundColor: getCategoryColor("list").bright, color: "#fff" }}
                >
                  LISTS
                </div>
              </div>
            </div>

            {/* Grid of sorted items by category */}
            <div className="grid grid-cols-3 gap-2">
              {/* Notes column */}
              <div className="space-y-2">
                {parsedIdeas
                  .filter((i) => i.category === "note")
                  .map((idea) => {
                    const colors = getCategoryColor(idea.category)
                    return (
                      <button
                        key={idea.id}
                        onClick={() => handleConvertClick(idea)}
                        className="w-full rounded p-2.5 text-left transition-transform hover:scale-105"
                        style={{
                          backgroundColor: colors.bright,
                          color: "#1A1A1A",
                        }}
                      >
                        <p className="text-xs font-medium line-clamp-2">{idea.text}</p>
                      </button>
                    )
                  })}
              </div>

              {/* Tasks column */}
              <div className="space-y-2">
                {parsedIdeas
                  .filter((i) => i.category === "task")
                  .map((idea) => {
                    const colors = getCategoryColor(idea.category)
                    return (
                      <button
                        key={idea.id}
                        onClick={() => handleConvertClick(idea)}
                        className="w-full rounded p-2.5 text-left transition-transform hover:scale-105"
                        style={{
                          backgroundColor: colors.bright,
                          color: "#fff",
                        }}
                      >
                        <p className="text-xs font-medium line-clamp-2">{idea.text}</p>
                      </button>
                    )
                  })}
              </div>

              {/* Lists column */}
              <div className="space-y-2">
                {parsedIdeas
                  .filter((i) => i.category === "list")
                  .map((idea) => {
                    const colors = getCategoryColor(idea.category)
                    return (
                      <button
                        key={idea.id}
                        onClick={() => handleConvertClick(idea)}
                        className="w-full rounded p-2.5 text-left transition-transform hover:scale-105"
                        style={{
                          backgroundColor: colors.bright,
                          color: "#fff",
                        }}
                      >
                        <p className="text-xs font-medium line-clamp-2">{idea.text}</p>
                      </button>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Flow Lane */}
        <div className="w-8 flex-shrink-0 relative">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Bypass flow path: quick add → sorted */}
            <path d="M 12 120 L 12 450" stroke="#4A4A4A" strokeWidth="2" fill="none" strokeDasharray="4,4" />
            {/* Flow nodes */}
            <circle cx="12" cy="120" r="4" fill="#4A4A4A" opacity="0.5" />
            <circle cx="12" cy="450" r="4" fill="#4A4A4A" opacity="0.5" />
            {/* Animated pulse for bypass flow */}
            {flowAnimation?.startsWith("quickadd") && (
              <circle cx="12" cy="285" r="5" fill="#5B9BD5">
                <animate attributeName="cy" from="120" to="450" dur="0.8s" repeatCount="1" />
              </circle>
            )}
          </svg>
        </div>
      </div>

      {convertingIdea && convertingIdea.category && (
        <ConvertModal idea={convertingIdea as any} onClose={() => setConvertingIdea(null)} onConvert={handleConvert} />
      )}
    </>
  )
}

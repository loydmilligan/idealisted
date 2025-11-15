"use client"

interface TabBarProps {
  activeTab: "capture" | "inbox" | "tasks" | "notes" | "lists"
  onTabChange: (tab: "capture" | "inbox" | "tasks" | "notes" | "lists") => void
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: "capture" as const, icon: "✏️", label: "Capture" },
    { id: "inbox" as const, icon: "📬", label: "Inbox", badge: 12 },
    { id: "tasks" as const, icon: "✓", label: "Tasks" },
    { id: "notes" as const, icon: "📝", label: "Notes" },
    { id: "lists" as const, icon: "📁", label: "Projects" },
  ]

  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t-2"
      style={{
        backgroundColor: "#A8A8A8",
        borderColor: "#858585",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1 min-w-[60px] py-1 px-2 rounded transition-all active:scale-95 relative"
            style={{
              color: activeTab === tab.id ? "#5B9BD5" : "#4A4A4A",
              backgroundColor: activeTab === tab.id ? "rgba(91, 155, 213, 0.1)" : "transparent",
            }}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.badge && (
              <span
                className="absolute -top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{ backgroundColor: "#FDB813", color: "#1A1A1A" }}
              >
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ backgroundColor: "#5B9BD5" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

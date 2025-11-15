import type { ReactNode } from "react"

interface DeviceFrameProps {
  children: ReactNode
}

export function DeviceFrame({ children }: DeviceFrameProps) {
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div
        className="rounded-md p-4 shadow-2xl"
        style={{
          background: "linear-gradient(145deg, #b8b8b8 0%, #d0d0d0 20%, #c0c0c0 50%, #a0a0a0 80%, #909090 100%)",
          boxShadow: `
            0 20px 60px rgba(0,0,0,0.5),
            inset 0 2px 3px rgba(255,255,255,0.3),
            inset 0 -2px 3px rgba(0,0,0,0.3),
            0 0 0 1px rgba(0,0,0,0.6)
          `,
          border: "2px solid #808080",
        }}
      >
        {/* Inner bezel depth */}
        <div
          className="rounded-sm p-1.5"
          style={{
            background: "linear-gradient(135deg, #909090 0%, #808080 100%)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.15)",
          }}
        >
          {/* Screen Container */}
          <div
            className="rounded-sm overflow-hidden shadow-inner"
            style={{
              backgroundColor: "#C8D4B8",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(0,0,0,0.15)",
            }}
          >
            {/* Status Bar */}
            <div
              className="px-3 py-1.5 flex items-center justify-between text-[10px] font-mono"
              style={{ backgroundColor: "#909090", color: "#1A1A1A" }}
            >
              <div className="flex items-center gap-2">
                <span>🍃</span>
                <span className="font-bold">IDEALIST</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                <span>📶</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="relative" style={{ minHeight: "600px" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

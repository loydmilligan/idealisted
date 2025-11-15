export function ListsScreen() {
  return (
    <div className="flex flex-col h-full pb-20" style={{ backgroundColor: "#E5DCC8" }}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#2C5F8F", color: "#FFD700" }}
      >
        <h1 className="text-lg font-bold tracking-wide">LISTS</h1>
        <button className="text-2xl">+</button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-sm font-medium mb-2" style={{ color: "#4A4A4A" }}>
            No lists yet
          </p>
          <p className="text-xs" style={{ color: "#999999" }}>
            Create your first list to get started
          </p>
        </div>
      </div>
    </div>
  )
}

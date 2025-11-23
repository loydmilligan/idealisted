/**
 * Tab Icons for Bottom Navigation
 * 24x24pt SVG icons for Capture, Unsorted, Ready, Entities tabs
 */

import React from 'react'

interface IconProps {
  active?: boolean
  className?: string
}

// 📥 Capture Icon (Inbox/Input Tray)
export const CaptureIcon: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5" />
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
  </svg>
)

// ⚡ Unsorted Icon (Lightning Bolt)
// ✓ Ready Icon (Checkmark)
export const ReadyIcon: React.FC<IconProps> = ({ className = '' }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

// ⊞ Entities Icon (2x2 Colored Grid)
export const EntitiesIcon: React.FC<IconProps> = ({ active = false, className = '' }) => {
  // Entity colors from design system
  const taskColor = '#4A90E2' // Blue
  const noteColor = '#F5A623' // Orange
  const projectColor = '#7ED321' // Green
  const listColor = '#BD10E0' // Purple

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* 2x2 grid of colored squares, 8x8pt each with 4pt gap */}
      {/* When active: filled squares */}
      {/* When inactive: colored outline squares */}

      {/* Top-left: Task (Blue) */}
      <rect
        x="4"
        y="4"
        width="8"
        height="8"
        rx="1"
        fill={active ? taskColor : 'transparent'}
        stroke={taskColor}
        strokeWidth={active ? '0' : '1.5'}
      />

      {/* Top-right: Note (Orange) */}
      <rect
        x="14"
        y="4"
        width="8"
        height="8"
        rx="1"
        fill={active ? noteColor : 'transparent'}
        stroke={noteColor}
        strokeWidth={active ? '0' : '1.5'}
      />

      {/* Bottom-left: Project (Green) */}
      <rect
        x="4"
        y="14"
        width="8"
        height="8"
        rx="1"
        fill={active ? projectColor : 'transparent'}
        stroke={projectColor}
        strokeWidth={active ? '0' : '1.5'}
      />

      {/* Bottom-right: List (Purple) */}
      <rect
        x="14"
        y="14"
        width="8"
        height="8"
        rx="1"
        fill={active ? listColor : 'transparent'}
        stroke={listColor}
        strokeWidth={active ? '0' : '1.5'}
      />
    </svg>
  )
}

// Export all icons
export const TabIcons = {
  Capture: CaptureIcon,
  Unsorted: UnsortedIcon,
  Ready: ReadyIcon,
  Entities: EntitiesIcon,
}

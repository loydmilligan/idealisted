/**
 * TagIcon Component
 * Sprint 1, Phase 3, Task 3.4
 *
 * Renders SVG tag icons with shapes, textures, and background shapes.
 * Creates visually distinct icons for each tag.
 */

'use client'

import React from 'react'
import type { TagIcon as TagIconType, TagShape, TagTexture, BackgroundShape } from '@/lib/tag-icons'

interface TagIconProps {
  icon: TagIconType
  size?: number
  className?: string
}

export const TagIcon: React.FC<TagIconProps> = ({ icon, size = 20, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: 'inline-block' }}
    >
      <defs>
        {renderTexturePattern(icon.texture, icon.foregroundColor)}
      </defs>

      {/* Background shape */}
      <g fill={icon.backgroundColor}>
        {renderBackgroundShape(icon.backgroundShape)}
      </g>

      {/* Foreground shape with texture */}
      <g
        fill={
          icon.texture === 'solid'
            ? icon.foregroundColor
            : `url(#${getPatternId(icon.texture, icon.foregroundColor)})`
        }
      >
        {renderShape(icon.shape)}
      </g>
    </svg>
  )
}

// Render the main icon shape
function renderShape(shape: TagShape): React.ReactNode {
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="35" />

    case 'square':
      return <rect x="15" y="15" width="70" height="70" rx="4" />

    case 'hexagon':
      return <polygon points="50,10 85,30 85,70 50,90 15,70 15,30" />

    case 'star':
      return (
        <polygon points="50,10 61,35 90,35 68,52 78,80 50,63 22,80 32,52 10,35 39,35" />
      )

    case 'heart':
      return (
        <path d="M50,85 C25,70 10,50 10,35 C10,20 20,10 32,10 C40,10 46,14 50,22 C54,14 60,10 68,10 C80,10 90,20 90,35 C90,50 75,70 50,85 Z" />
      )

    case 'diamond':
      return <polygon points="50,10 85,50 50,90 15,50" />

    case 'spade':
      return (
        <path d="M50,10 C35,25 20,35 20,50 C20,62 28,70 40,70 L35,85 L65,85 L60,70 C72,70 80,62 80,50 C80,35 65,25 50,10 Z" />
      )

    case 'club':
      return (
        <>
          <circle cx="50" cy="30" r="15" />
          <circle cx="30" cy="50" r="15" />
          <circle cx="70" cy="50" r="15" />
          <path d="M45,60 L45,85 L55,85 L55,60 Z" />
        </>
      )

    case 'ring':
      return (
        <>
          <circle cx="50" cy="50" r="35" fill={`url(#ring-pattern)`} />
          <circle cx="50" cy="50" r="25" fill="white" />
        </>
      )

    case 'trapezoid':
      return <polygon points="30,20 70,20 85,80 15,80" />

    default:
      return <circle cx="50" cy="50" r="35" />
  }
}

// Render background container shape
function renderBackgroundShape(shape: BackgroundShape): React.ReactNode {
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="48" />

    case 'hexagon':
      return <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" />

    case 'square':
    default:
      return <rect x="2" y="2" width="96" height="96" rx="6" />
  }
}

// Render SVG texture patterns
function renderTexturePattern(texture: TagTexture, color: string): React.ReactNode {
  const patternId = getPatternId(texture, color)
  const patternColor = 'rgba(0,0,0,0.3)'

  switch (texture) {
    case 'solid':
      return null

    case 'spotted':
      return (
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill={patternColor} />
          <circle cx="7" cy="7" r="1.5" fill={patternColor} />
          <circle cx="7" cy="2" r="1" fill={patternColor} />
          <circle cx="2" cy="7" r="1" fill={patternColor} />
        </pattern>
      )

    case 'lined':
      return (
        <pattern id={patternId} width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="4" y2="0" stroke={patternColor} strokeWidth="1" />
        </pattern>
      )

    case 'dotted':
      return (
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill={patternColor} />
          <circle cx="6" cy="6" r="1" fill={patternColor} />
        </pattern>
      )

    case 'striped':
      return (
        <pattern
          id={patternId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke={patternColor} strokeWidth="2" />
        </pattern>
      )

    case 'checkered':
      return (
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill={patternColor} />
          <rect x="4" y="4" width="4" height="4" fill={patternColor} />
        </pattern>
      )

    case 'crosshatch':
      return (
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="8" y2="8" stroke={patternColor} strokeWidth="1" />
          <line x1="8" y1="0" x2="0" y2="8" stroke={patternColor} strokeWidth="1" />
        </pattern>
      )

    case 'wavy':
      return (
        <pattern id={patternId} width="20" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0,4 Q5,0 10,4 T20,4"
            stroke={patternColor}
            strokeWidth="1"
            fill="none"
          />
        </pattern>
      )

    case 'grid':
      return (
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="8" y2="0" stroke={patternColor} strokeWidth="0.5" />
          <line x1="0" y1="0" x2="0" y2="8" stroke={patternColor} strokeWidth="0.5" />
        </pattern>
      )

    case 'zigzag':
      return (
        <pattern id={patternId} width="12" height="8" patternUnits="userSpaceOnUse">
          <path
            d="M0,4 L3,0 L6,4 L9,0 L12,4"
            stroke={patternColor}
            strokeWidth="1"
            fill="none"
          />
        </pattern>
      )

    default:
      return null
  }
}

// Generate unique pattern ID
function getPatternId(texture: TagTexture, color: string): string {
  // Remove # from color for valid ID
  const colorId = color.replace('#', '')
  return `${texture}-${colorId}`
}

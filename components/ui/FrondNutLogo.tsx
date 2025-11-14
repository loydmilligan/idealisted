/**
 * FrondNut Logo - Palm Pilot / Blackberry Inspired
 * Retro aesthetic with monochrome green palette
 */

import React from 'react'

interface FrondNutLogoProps {
  className?: string
  size?: number
}

/**
 * FrondNut Logo Component
 *
 * Design: Stylized palm frond with coconut, optimized for retro green display
 * - Pixel-art aesthetic matching Palm Pilot design language
 * - Works in monochrome (#00FF00 / #33FF33) or inherits currentColor
 * - Compact 32x32 default size, scalable via SVG
 *
 * Usage:
 * <FrondNutLogo />
 * <FrondNutLogo size={48} className="text-green-500" />
 */
export const FrondNutLogo: React.FC<FrondNutLogoProps> = ({
  className = '',
  size = 32
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FrondNut Logo"
    >
      {/* Palm frond leaves - retro pixel style */}
      {/* Left frond */}
      <path
        d="M 8 16 L 6 10 L 7 9 L 10 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />
      {/* Center frond */}
      <path
        d="M 10 14 L 11 6 L 12 6 L 12 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />
      {/* Right frond */}
      <path
        d="M 12 14 L 17 9 L 18 10 L 14 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />

      {/* Stem */}
      <line
        x1="11"
        y1="14"
        x2="11"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />

      {/* Coconut/Nut - geometric retro shape */}
      <circle
        cx="11"
        cy="23"
        r="5"
        fill="currentColor"
        opacity="0.3"
      />
      <circle
        cx="11"
        cy="23"
        r="5"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />

      {/* Coconut detail lines - retro texture */}
      <line
        x1="8"
        y1="21"
        x2="14"
        y2="21"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="8"
        y1="23"
        x2="14"
        y2="23"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="8"
        y1="25"
        x2="14"
        y2="25"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  )
}

/**
 * FrondNut Logo with Text - Branding variant
 *
 * Usage:
 * <FrondNutLogoWithText />
 */
export const FrondNutLogoWithText: React.FC<{ className?: string }> = ({
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <FrondNutLogo size={24} />
      <span className="font-mono text-sm font-bold tracking-wider uppercase">
        FrondNut
      </span>
    </div>
  )
}

export default FrondNutLogo

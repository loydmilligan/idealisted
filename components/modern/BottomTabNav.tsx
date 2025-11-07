/**
 * Bottom Tab Navigation Component - Retro Palm Pilot Style
 *
 * 4-tab mobile-first navigation:
 * - 📥 Capture
 * - ⚡ Unsorted (with badge)
 * - ✓ Ready (with badge)
 * - 📁 Files (opens drawer)
 *
 * Features:
 * - Fixed position at bottom
 * - 56pt height + safe area
 * - Monospace uppercase labels
 * - Flat rectangular tabs with borders
 * - Active state with filled background
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TabIcons } from './TabIcons'
import { TabBadge } from './TabBadge'

export type TabId = 'capture' | 'unsorted' | 'ready' | 'files'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ active?: boolean; className?: string }>
  hasBadge?: boolean
}

interface BottomTabNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  unsortedCount?: number
  readyCount?: number
  className?: string
}

const tabs: Tab[] = [
  {
    id: 'capture',
    label: 'Capture',
    icon: TabIcons.Capture,
    hasBadge: false,
  },
  {
    id: 'unsorted',
    label: 'Unsorted',
    icon: TabIcons.Unsorted,
    hasBadge: true,
  },
  {
    id: 'ready',
    label: 'Ready',
    icon: TabIcons.Ready,
    hasBadge: true,
  },
  {
    id: 'files',
    label: 'Files',
    icon: TabIcons.Entities, // Reuse icon, will update later
    hasBadge: false,
  },
]

export const BottomTabNav: React.FC<BottomTabNavProps> = ({
  activeTab,
  onTabChange,
  unsortedCount = 0,
  readyCount = 0,
  className = '',
}) => {
  const [flashingTab, setFlashingTab] = useState<TabId | null>(null)

  const handleTabClick = (tabId: TabId) => {
    // Change tab
    onTabChange(tabId)
  }

  const getBadgeCount = (tabId: TabId) => {
    if (tabId === 'unsorted') return unsortedCount
    if (tabId === 'ready') return readyCount
    return 0
  }

  return (
    <nav className={`retro-tab-bar ${className}`}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const badgeCount = tab.hasBadge ? getBadgeCount(tab.id) : 0

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`retro-tab ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon */}
            <div className="retro-tab-icon">
              <Icon active={isActive} className="w-5 h-5" />
            </div>

            {/* Badge (if applicable) */}
            {tab.hasBadge && badgeCount > 0 && (
              <span className="retro-tab-badge">{badgeCount}</span>
            )}

            {/* Label */}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// Export flash trigger for external use (e.g., when item is captured)
export const useTabFlash = () => {
  const [flashingTab, setFlashingTab] = useState<TabId | null>(null)

  const triggerFlash = (tabId: TabId, withAI: boolean = false) => {
    setFlashingTab(tabId)
    setTimeout(() => setFlashingTab(null), 300)

    // If withAI is true, trigger AI tinge animation
    if (withAI) {
      // This will be implemented when we add AI actions
      console.log('AI flash triggered for', tabId)
    }
  }

  return { flashingTab, triggerFlash }
}

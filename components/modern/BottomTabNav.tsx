/**
 * Bottom Tab Navigation Component
 *
 * 4-tab mobile-first navigation:
 * - 📥 Capture
 * - ⚡ Unsorted (with badge)
 * - ✓ Ready (with badge)
 * - ⊞ Entities (4-color grid)
 *
 * Features:
 * - Fixed position at bottom
 * - 56pt height + safe area
 * - Tab flash animation on selection
 * - Badge counts with increment animation
 * - Active state with colored icon and underlined label
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { TabIcons } from './TabIcons'
import { TabBadge } from './TabBadge'

export type TabId = 'capture' | 'unsorted' | 'ready' | 'entities'

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
    id: 'entities',
    label: 'Entities',
    icon: TabIcons.Entities,
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
    // Trigger flash animation
    setFlashingTab(tabId)
    setTimeout(() => setFlashingTab(null), 300)

    // Change tab
    onTabChange(tabId)
  }

  const getTabColor = (tabId: TabId, isActive: boolean) => {
    if (!isActive) return 'var(--text-secondary)'

    // Active tabs get entity colors (except Entities which uses all colors)
    switch (tabId) {
      case 'capture':
        return 'var(--text-primary)'
      case 'unsorted':
        return '#FFB300' // Warm yellow for urgency
      case 'ready':
        return '#4CAF50' // Green for readiness
      case 'entities':
        return 'var(--text-primary)' // Entities icon handles its own colors
      default:
        return 'var(--text-secondary)'
    }
  }

  const getBadgeCount = (tabId: TabId) => {
    if (tabId === 'unsorted') return unsortedCount
    if (tabId === 'ready') return readyCount
    return 0
  }

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-[#2a2a2a] border-t border-[var(--border-color)] flex items-center justify-around z-50 ${className}`}
      style={{
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const isFlashing = flashingTab === tab.id
        const tabColor = getTabColor(tab.id, isActive)
        const badgeCount = tab.hasBadge ? getBadgeCount(tab.id) : 0

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] relative transition-colors duration-150 ${
              isFlashing ? 'animate-flash-invert' : ''
            }`}
            style={{
              color: tabColor,
            }}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon Container */}
            <div className="relative mb-1">
              <Icon
                active={isActive || tab.id === 'entities'}
                className="w-6 h-6"
              />

              {/* Badge (if applicable) */}
              {tab.hasBadge && <TabBadge count={badgeCount} />}
            </div>

            {/* Label */}
            <span
              className={`text-[10pt] font-medium ${
                isActive ? 'underline decoration-2 underline-offset-2' : ''
              }`}
            >
              {tab.label}
            </span>
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

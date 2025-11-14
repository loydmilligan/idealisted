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
 * - Badge flash animations on item processing
 */

'use client'

import React, { useState, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import { TabIcons } from './TabIcons'
import { TabBadge } from './TabBadge'
import { EntityType } from '@/lib/entity-colors'

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

export interface TabNavHandle {
  triggerFlash: (tabId: TabId, entityType: Exclude<EntityType, 'idea'> | null) => void
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

export const BottomTabNav = forwardRef<TabNavHandle, BottomTabNavProps>(
  ({ activeTab, onTabChange, unsortedCount = 0, readyCount = 0, className = '' }, ref) => {
    const [flashingTab, setFlashingTab] = useState<TabId | null>(null)
    const [flashColor, setFlashColor] = useState<Exclude<EntityType, 'idea'> | null>(null)

    // Expose flash trigger via ref
    useImperativeHandle(ref, () => ({
      triggerFlash: (tabId: TabId, entityType: Exclude<EntityType, 'idea'> | null) => {
        setFlashingTab(tabId)
        setFlashColor(entityType)
        setTimeout(() => {
          setFlashingTab(null)
          setFlashColor(null)
        }, 600) // 600ms flash duration
      },
    }))

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
          const isFlashing = flashingTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                retro-tab
                ${isActive ? 'active' : ''}
                ${isFlashing && flashColor ? `flash-${flashColor}` : ''}
              `.trim()}
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
)

BottomTabNav.displayName = 'BottomTabNav'

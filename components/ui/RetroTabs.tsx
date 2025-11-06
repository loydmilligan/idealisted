import React from 'react'
import { cn } from '@/lib/utils'

interface RetroTabProps {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}

export const RetroTab: React.FC<RetroTabProps> = ({ label, active, onClick, count }) => {
  return (
    <button
      className={cn(
        'palm-tab',
        active && 'active'
      )}
      onClick={onClick}
    >
      {label}
      {count !== undefined && ` (${count})`}
    </button>
  )
}

interface RetroTabsProps {
  tabs: Array<{
    id: string
    label: string
    count?: number
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
}

export const RetroTabs: React.FC<RetroTabsProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="palm-tabs">
      {tabs.map((tab) => (
        <RetroTab
          key={tab.id}
          label={tab.label}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          count={tab.count}
        />
      ))}
    </div>
  )
}

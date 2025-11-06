import React from 'react'
import { cn } from '@/lib/utils'

interface RetroDeviceProps {
  children: React.ReactNode
  className?: string
  rightAction?: React.ReactNode
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export const RetroDevice: React.FC<RetroDeviceProps> = ({
  children,
  className,
  rightAction,
  activeTab = 'inbox',
  onTabChange
}) => {
  const deviceTabs = [
    { id: 'inbox', label: 'INBOX', icon: '📥' },
    { id: 'tasks', label: 'TASKS', icon: '⚡' },
    { id: 'notes', label: 'NOTES', icon: '📄' },
    { id: 'lists', label: 'LISTS', icon: '📋' },
    { id: 'projects', label: 'PROJECTS', icon: '🚀' },
    { id: 'plans', label: 'PLANS', icon: '📅' }
  ]

  return (
    <div className={cn('retro-device', className)}>
      {/* Top Status Bar - OS Level */}
      <div className="palm-status-bar">
        <div className="flex items-center gap-2">
          <div className="palm-logo">🌴</div>
          <span className="palm-device-title">FRONDNUT™</span>
        </div>
        <span>{new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })}</span>
      </div>

      {/* App Content */}
      <div className="retro-screen">
        {/* App Window Container */}
        <div className="palm-app-window">
          {/* App Header - Application Level */}
          <div className="palm-app-header">
            <span className="palm-app-title">
              {deviceTabs.find(tab => tab.id === activeTab)?.label || 'IDEALISTED'}
            </span>
            {rightAction}
          </div>
          
          {/* App Content Area */}
          <div className="palm-app-content">
            {children}
          </div>
        </div>
      </div>

      {/* Device Navigation Tabs - Binder/Filing Cabinet Style */}
      <div className="palm-device-tabs">
        {deviceTabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              'palm-device-tab',
              activeTab === tab.id && 'palm-device-tab-active'
            )}
            onClick={() => onTabChange?.(tab.id)}
            title={tab.label}
          >
            <span className="palm-device-tab-icon">{tab.icon}</span>
            <span className="palm-device-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

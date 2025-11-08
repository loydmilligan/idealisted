'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { AISettingsTab } from './settings/AISettingsTab'
import { NotificationsTab } from './settings/NotificationsTab'
import { TagsTab } from './settings/TagsTab'
import { AppearanceTab } from './settings/AppearanceTab'

type SettingsTab = 'ai' | 'notifications' | 'tags' | 'appearance'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  if (!isOpen) return null

  return (
    <div className="retro-overlay" onClick={onClose}>
      <div className="retro-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="retro-settings-header">
          <h2>SETTINGS</h2>
          <button className="retro-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="retro-settings-tabs">
          <button
            className={`retro-tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI
          </button>
          <button
            className={`retro-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            NOTIFICATIONS
          </button>
          <button
            className={`retro-tab ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            TAGS
          </button>
          <button
            className={`retro-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            APPEARANCE
          </button>
        </div>

        {/* Tab Content */}
        <div className="retro-settings-content">
          {activeTab === 'ai' && <AISettingsTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'tags' && <TagsTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </div>
  )
}

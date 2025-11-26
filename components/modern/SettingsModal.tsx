'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { AISettingsTab } from './settings/AISettingsTab'
import { NotificationsTab } from './settings/NotificationsTab'
import { TagsTab } from './settings/TagsTab'
import { AppearanceTab } from './settings/AppearanceTab'
import { ObsidianTab } from './settings/ObsidianTab'

type SettingsTab = 'ai' | 'notifications' | 'tags' | 'appearance' | 'obsidian'

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
          <button
            className="retro-close-btn tap-target"
            onClick={onClose}
            style={{ touchAction: 'manipulation' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="retro-settings-tabs">
          <button
            className={`retro-tab tap-target ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            style={{ touchAction: 'manipulation' }}
          >
            AI
          </button>
          <button
            className={`retro-tab tap-target ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
            style={{ touchAction: 'manipulation' }}
          >
            NOTIFICATIONS
          </button>
          <button
            className={`retro-tab tap-target ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
            style={{ touchAction: 'manipulation' }}
          >
            TAGS
          </button>
          <button
            className={`retro-tab tap-target ${activeTab === 'obsidian' ? 'active' : ''}`}
            onClick={() => setActiveTab('obsidian')}
            style={{ touchAction: 'manipulation' }}
          >
            OBSIDIAN
          </button>
          <button
            className={`retro-tab tap-target ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
            style={{ touchAction: 'manipulation' }}
          >
            LOOK
          </button>
        </div>

        {/* Tab Content */}
        <div className="retro-settings-content">
          {activeTab === 'ai' && <AISettingsTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'tags' && <TagsTab />}
          {activeTab === 'obsidian' && <ObsidianTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { AppearanceConfig } from '@/types'

export const AppearanceTab: React.FC = () => {
  const [config, setConfig] = useState<AppearanceConfig>({
    theme: 'classic-green',
    showTimestamps: true,
    showEntityBadges: true,
    animationsEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.settings?.appearance_config) {
        setConfig(data.settings.appearance_config)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appearance_config: config }),
      })

      if (response.ok) {
        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', config.theme)
        setMessage('✓ Settings saved successfully')
      } else {
        setMessage('✗ Failed to save settings')
      }
    } catch (error) {
      setMessage('✗ Error saving settings')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) {
    return <div className="retro-text-secondary">Loading...</div>
  }

  return (
    <div>
      <h3 className="retro-section-title">APPEARANCE</h3>

      <div className="retro-form-group">
        <label className="retro-form-label">Theme</label>
        <div className="retro-radio-group-vertical">
          <label className="retro-radio-label">
            <input
              type="radio"
              name="theme"
              value="classic-green"
              checked={config.theme === 'classic-green'}
              onChange={(e) => setConfig({ ...config, theme: e.target.value as AppearanceConfig['theme'] })}
            />
            Classic Green (Palm Pilot)
          </label>
          <label className="retro-radio-label">
            <input
              type="radio"
              name="theme"
              value="dark-mode"
              checked={config.theme === 'dark-mode'}
              onChange={(e) => setConfig({ ...config, theme: e.target.value as AppearanceConfig['theme'] })}
            />
            Dark Mode
          </label>
          <label className="retro-radio-label">
            <input
              type="radio"
              name="theme"
              value="high-contrast"
              checked={config.theme === 'high-contrast'}
              onChange={(e) => setConfig({ ...config, theme: e.target.value as AppearanceConfig['theme'] })}
            />
            High Contrast
          </label>
        </div>
      </div>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">DISPLAY OPTIONS</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={config.showTimestamps}
          onChange={(e) => setConfig({ ...config, showTimestamps: e.target.checked })}
        />
        Show timestamps
      </label>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={config.showEntityBadges}
          onChange={(e) => setConfig({ ...config, showEntityBadges: e.target.checked })}
        />
        Show entity badges
      </label>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={config.animationsEnabled}
          onChange={(e) => setConfig({ ...config, animationsEnabled: e.target.checked })}
        />
        Animations enabled
      </label>

      {message && (
        <div className="retro-message">
          {message}
        </div>
      )}

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'SAVING...' : 'SAVE'}
        </button>
      </div>
    </div>
  )
}

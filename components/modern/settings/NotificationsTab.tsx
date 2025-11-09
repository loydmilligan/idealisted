'use client'

import React, { useState, useEffect } from 'react'
import { NtfyConfig } from '@/types'

interface NotificationEvents {
  taskCompleted: boolean
  taskDueSoon: boolean
  ideaCaptured: boolean
  ideaSorted: boolean
  entityCreated: boolean
}

export const NotificationsTab: React.FC = () => {
  const [config, setConfig] = useState<NtfyConfig>({
    enabled: false,
    server: 'https://ntfy.sh',
    topic: '',
    username: '',
    password: '',
    priority: 'default',
  })
  const [events, setEvents] = useState<NotificationEvents>({
    taskCompleted: true,
    taskDueSoon: true,
    ideaCaptured: true,
    ideaSorted: true,
    entityCreated: true,
  })
  const [dailyReview, setDailyReview] = useState({
    enabled: true,
    time: '18:00',
    includeAiSummary: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingReview, setTestingReview] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (data.settings?.ntfy_config) {
        setConfig(data.settings.ntfy_config)
      }
      if (data.settings?.notification_events) {
        setEvents(data.settings.notification_events)
      }
      if (data.settings?.daily_review) {
        setDailyReview(data.settings.daily_review)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const validateTopic = (topic: string): boolean => {
    // Topic should only contain alphanumeric characters, hyphens, and underscores
    return /^[a-zA-Z0-9_-]+$/.test(topic)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    // Validate if enabled
    if (config.enabled) {
      if (!config.topic) {
        setMessage('✗ Topic is required when notifications are enabled')
        setSaving(false)
        setTimeout(() => setMessage(''), 3000)
        return
      }

      if (!validateTopic(config.topic)) {
        setMessage('✗ Topic can only contain letters, numbers, hyphens, and underscores')
        setSaving(false)
        setTimeout(() => setMessage(''), 3000)
        return
      }

      if (!validateUrl(config.server)) {
        setMessage('✗ Server URL is invalid')
        setSaving(false)
        setTimeout(() => setMessage(''), 3000)
        return
      }
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ntfy_config: config,
          notification_events: events,
          daily_review: dailyReview,
        }),
      })

      if (response.ok) {
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

  const handleTest = async () => {
    setTesting(true)
    setMessage('')

    // Save config first to ensure we test the current form state
    try {
      const saveResponse = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ntfy_config: config,
          notification_events: events,
          daily_review: dailyReview,
        }),
      })

      if (!saveResponse.ok) {
        setMessage('✗ Failed to save settings before testing')
        setTesting(false)
        setTimeout(() => setMessage(''), 3000)
        return
      }

      // Now test with saved config
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test from IdeaListed settings!',
          priority: config.priority,
        }),
      })

      if (response.ok) {
        setMessage('✓ Test notification sent successfully')
      } else {
        const data = await response.json()
        setMessage(`✗ Test notification failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setMessage('✗ Test error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTesting(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleTestReview = async () => {
    setTestingReview(true)
    setMessage('')

    try {
      const response = await fetch('/api/review/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeAI: dailyReview.includeAiSummary,
          test: true  // Don't persist snapshot to disk
        }),
      })

      if (response.ok) {
        setMessage('✓ Daily review notification sent successfully')
      } else {
        const data = await response.json()
        setMessage(`✗ Daily review test failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setMessage('✗ Test error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTestingReview(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) {
    return <div className="retro-text-secondary">Loading...</div>
  }

  return (
    <div>
      <h3 className="retro-section-title">NOTIFICATION SETTINGS</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
        />
        Enable notifications
      </label>

      <div className="retro-form-group">
        <label className="retro-form-label">Server URL</label>
        <input
          type="text"
          className="retro-input"
          value={config.server}
          onChange={(e) => setConfig({ ...config, server: e.target.value })}
          disabled={!config.enabled}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Topic</label>
        <input
          type="text"
          className="retro-input"
          value={config.topic}
          onChange={(e) => setConfig({ ...config, topic: e.target.value })}
          placeholder="idealisted-abc123"
          disabled={!config.enabled}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Username (optional)</label>
        <input
          type="text"
          className="retro-input"
          value={config.username}
          onChange={(e) => setConfig({ ...config, username: e.target.value })}
          disabled={!config.enabled}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Password (optional)</label>
        <input
          type="password"
          className="retro-input"
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
          disabled={!config.enabled}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Priority</label>
        <div className="retro-radio-group">
          {(['low', 'default', 'high'] as const).map((p) => (
            <label key={p} className="retro-radio-label">
              <input
                type="radio"
                name="priority"
                value={p}
                checked={config.priority === p}
                onChange={(e) => setConfig({ ...config, priority: e.target.value as any })}
                disabled={!config.enabled}
              />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTest}
          disabled={testing || !config.enabled || !config.topic}
        >
          {testing ? 'TESTING...' : 'TEST NOTIFICATION'}
        </button>
      </div>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">EVENT NOTIFICATIONS</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={events.taskCompleted}
          onChange={(e) => setEvents({ ...events, taskCompleted: e.target.checked })}
        />
        Task completed
      </label>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={events.taskDueSoon}
          onChange={(e) => setEvents({ ...events, taskDueSoon: e.target.checked })}
        />
        Task due soon (1 hour)
      </label>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={events.ideaCaptured}
          onChange={(e) => setEvents({ ...events, ideaCaptured: e.target.checked })}
        />
        New idea captured
      </label>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={events.ideaSorted}
          onChange={(e) => setEvents({ ...events, ideaSorted: e.target.checked })}
        />
        Idea sorted to Ready
      </label>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={events.entityCreated}
          onChange={(e) => setEvents({ ...events, entityCreated: e.target.checked })}
        />
        Entity created
      </label>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">DAILY REVIEW REMINDER</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={dailyReview.enabled}
          onChange={(e) => setDailyReview({ ...dailyReview, enabled: e.target.checked })}
        />
        Enable daily review
      </label>

      <div className="retro-form-group">
        <label className="retro-form-label">Time</label>
        <input
          type="time"
          className="retro-input"
          value={dailyReview.time}
          onChange={(e) => setDailyReview({ ...dailyReview, time: e.target.value })}
        />
      </div>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={dailyReview.includeAiSummary}
          onChange={(e) => setDailyReview({ ...dailyReview, includeAiSummary: e.target.checked })}
        />
        Include AI summary
      </label>

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTestReview}
          disabled={testingReview || !config.enabled || !config.topic}
        >
          {testingReview ? 'TESTING...' : 'TEST DAILY REVIEW'}
        </button>
      </div>

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

'use client'

import React, { useState, useEffect } from 'react'
import { NtfyConfig, ReminderConfig } from '@/types'

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
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>({
    enabled: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    defaultTiming: '1_day_before',
    customMinutesBefore: 60,
    priorityFilter: [3, 4, 5],
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
      const [settingsResponse, reminderResponse] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/reminders')
      ])

      const settingsData = await settingsResponse.json()
      const reminderData = await reminderResponse.json()

      if (settingsData.settings?.ntfy_config) {
        setConfig(settingsData.settings.ntfy_config)
      }
      if (settingsData.settings?.notification_events) {
        setEvents(settingsData.settings.notification_events)
      }
      if (settingsData.settings?.daily_review) {
        setDailyReview(settingsData.settings.daily_review)
      }
      if (reminderData.success && reminderData.config) {
        setReminderConfig(reminderData.config)
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
      const [settingsResponse, reminderResponse] = await Promise.all([
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ntfy_config: config,
            notification_events: events,
            daily_review: dailyReview,
          }),
        }),
        fetch('/api/settings/reminders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: reminderConfig,
          }),
        })
      ])

      if (settingsResponse.ok && reminderResponse.ok) {
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
      const response = await fetch('/api/review', {
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

      <hr className="retro-divider" />

      <h3 className="retro-section-title">TASK REMINDER PREFERENCES</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={reminderConfig.enabled}
          onChange={(e) => setReminderConfig({ ...reminderConfig, enabled: e.target.checked })}
        />
        Enable task reminders
      </label>
      <p style={{
        fontSize: '11px',
        color: 'var(--retro-text-secondary)',
        marginTop: '4px',
        marginLeft: '24px',
        marginBottom: '16px'
      }}>
        Automatically send notifications for tasks with due dates
      </p>

      <div className="retro-form-group">
        <label className="retro-form-label">Default reminder timing</label>
        <select
          className="retro-select"
          value={reminderConfig.defaultTiming}
          onChange={(e) => setReminderConfig({
            ...reminderConfig,
            defaultTiming: e.target.value as ReminderConfig['defaultTiming']
          })}
          disabled={!reminderConfig.enabled}
          style={!reminderConfig.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <option value="morning_of">Morning of (8:00 AM)</option>
          <option value="1_hour_before">1 hour before</option>
          <option value="1_day_before">1 day before</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {reminderConfig.defaultTiming === 'custom' && (
        <div className="retro-form-group">
          <label className="retro-form-label">Minutes before due date</label>
          <input
            type="number"
            className="retro-input"
            value={reminderConfig.customMinutesBefore || 60}
            onChange={(e) => setReminderConfig({
              ...reminderConfig,
              customMinutesBefore: parseInt(e.target.value) || 60
            })}
            disabled={!reminderConfig.enabled}
            style={!reminderConfig.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            min="1"
            placeholder="60"
          />
        </div>
      )}

      <div className="retro-form-group">
        <label className="retro-form-label">Quiet hours</label>
        <label className="retro-checkbox-label">
          <input
            type="checkbox"
            className="retro-checkbox"
            checked={reminderConfig.quietHours.enabled}
            onChange={(e) => setReminderConfig({
              ...reminderConfig,
              quietHours: { ...reminderConfig.quietHours, enabled: e.target.checked }
            })}
            disabled={!reminderConfig.enabled}
          />
          Enable quiet hours
        </label>
        <p style={{
          fontSize: '11px',
          color: 'var(--retro-text-secondary)',
          marginTop: '4px',
          marginLeft: '24px',
          marginBottom: '12px'
        }}>
          Suppress notifications during specified time range
        </p>
      </div>

      {reminderConfig.quietHours.enabled && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label className="retro-form-label">Start time</label>
            <input
              type="time"
              className="retro-input"
              value={reminderConfig.quietHours.start}
              onChange={(e) => setReminderConfig({
                ...reminderConfig,
                quietHours: { ...reminderConfig.quietHours, start: e.target.value }
              })}
              disabled={!reminderConfig.enabled}
              style={!reminderConfig.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="retro-form-label">End time</label>
            <input
              type="time"
              className="retro-input"
              value={reminderConfig.quietHours.end}
              onChange={(e) => setReminderConfig({
                ...reminderConfig,
                quietHours: { ...reminderConfig.quietHours, end: e.target.value }
              })}
              disabled={!reminderConfig.enabled}
              style={!reminderConfig.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </div>
        </div>
      )}

      <div className="retro-form-group">
        <label className="retro-form-label">Priority filter</label>
        <p style={{
          fontSize: '11px',
          color: 'var(--retro-text-secondary)',
          marginBottom: '8px'
        }}>
          Only send reminders for tasks with these priority levels
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { value: 1, label: 'Low (1)' },
            { value: 2, label: 'Medium-Low (2)' },
            { value: 3, label: 'Medium (3)' },
            { value: 4, label: 'High (4)' },
            { value: 5, label: 'Urgent (5)' },
          ].map((priority) => (
            <label
              key={priority.value}
              className="retro-checkbox-label"
              style={!reminderConfig.enabled ? { opacity: 0.5 } : {}}
            >
              <input
                type="checkbox"
                className="retro-checkbox"
                checked={reminderConfig.priorityFilter.includes(priority.value)}
                onChange={(e) => {
                  const newFilter = e.target.checked
                    ? [...reminderConfig.priorityFilter, priority.value]
                    : reminderConfig.priorityFilter.filter(p => p !== priority.value)
                  setReminderConfig({ ...reminderConfig, priorityFilter: newFilter })
                }}
                disabled={!reminderConfig.enabled}
              />
              {priority.label}
            </label>
          ))}
        </div>
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

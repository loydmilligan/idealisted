'use client'

import React, { useState, useEffect } from 'react'
import { NtfyConfig, ReminderConfig, DailySummaryConfig } from '@/types'

interface NotificationEvents {
  taskCompleted: boolean
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
  const [dailySummaryConfig, setDailySummaryConfig] = useState<DailySummaryConfig>({
    enabled: false,
    times: ['09:00', '12:00', '18:00'],
    includeMetrics: {
      ideasCaptured: true,
      ideasConverted: true,
      tasksCompleted: true,
      tasksDueToday: true,
      tasksDueSoon: true,
    },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testingSummary, setTestingSummary] = useState(false)
  const [testingReminder, setTestingReminder] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [settingsResponse, reminderResponse, aiFeaturesResponse] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/reminders'),
        fetch('/api/ai-features')
      ])

      const settingsData = await settingsResponse.json()
      const reminderData = await reminderResponse.json()
      const aiFeaturesData = await aiFeaturesResponse.json()

      if (settingsData.settings?.ntfy_config) {
        setConfig(settingsData.settings.ntfy_config)
      }
      if (settingsData.settings?.notification_events) {
        setEvents(settingsData.settings.notification_events)
      }
      if (reminderData.success && reminderData.config) {
        setReminderConfig(reminderData.config)
      }

      // Load daily summary config
      if (settingsData.settings?.daily_summary_config) {
        setDailySummaryConfig(settingsData.settings.daily_summary_config)
      } else {
        // Sync initial enabled state from ai_feature_settings if no config exists yet
        const dailySummaryFeature = aiFeaturesData.features?.find(
          (f: any) => f.feature_name === 'daily_summary'
        )
        if (dailySummaryFeature) {
          setDailySummaryConfig(prev => ({
            ...prev,
            enabled: dailySummaryFeature.enabled === 1
          }))
        }
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

    // Validate daily summary config - warn if enabled but no times selected
    if (dailySummaryConfig.enabled && dailySummaryConfig.times.length === 0) {
      setMessage('✗ At least one summary time must be selected')
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
      return
    }

    try {
      const [settingsResponse, reminderResponse, aiFeatureResponse] = await Promise.all([
        fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ntfy_config: config,
            notification_events: events,
            daily_summary_config: dailySummaryConfig,
          }),
        }),
        fetch('/api/settings/reminders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: reminderConfig,
          }),
        }),
        // Sync the enabled flag with ai_feature_settings table
        fetch('/api/ai-features', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            features: [{
              feature_name: 'daily_summary',
              enabled: dailySummaryConfig.enabled ? 1 : 0
            }]
          }),
        })
      ])

      if (settingsResponse.ok && reminderResponse.ok && aiFeatureResponse.ok) {
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

  // Sprint 2 - Task 4.3: Test Summary Button
  const handleTestSummary = async () => {
    setTestingSummary(true)
    setMessage('')

    try {
      const response = await fetch('/api/summary/test', {
        method: 'POST'
      })

      if (response.ok) {
        setMessage('✓ Test summary sent')
      } else {
        const data = await response.json()
        setMessage(`✗ Test failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setMessage('✗ Connection failed')
    } finally {
      setTestingSummary(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  // Sprint 2 - Task 4.4: Test Reminder Button
  const handleTestReminder = async () => {
    setTestingReminder(true)
    setMessage('')

    try {
      const response = await fetch('/api/reminders/test', {
        method: 'POST'
      })

      if (response.ok) {
        setMessage('✓ Test reminder sent')
      } else {
        const data = await response.json()
        setMessage(`✗ Test failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setMessage('✗ Connection failed')
    } finally {
      setTestingReminder(false)
      setTimeout(() => setMessage(''), 5000)
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

      <h3 className="retro-section-title">OTHER EVENTS</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={events.taskCompleted}
          onChange={(e) => setEvents({ ...events, taskCompleted: e.target.checked })}
        />
        Notify when task is completed
      </label>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">TASK REMINDERS</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={reminderConfig.enabled}
          onChange={(e) => setReminderConfig({ ...reminderConfig, enabled: e.target.checked })}
        />
        Send reminders when tasks are due
      </label>

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
          Suppress notifications during these hours
        </label>
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
        <label className="retro-form-label">Priority filter (send reminders for these levels only)</label>
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

      {/* Sprint 2 - Task 4.4: Test Reminder Button */}
      <div className="retro-button-row" style={{ marginTop: '12px' }}>
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTestReminder}
          disabled={testingReminder || !reminderConfig.enabled || !config.enabled}
        >
          {testingReminder ? 'TESTING...' : 'TEST REMINDER'}
        </button>
      </div>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">AI DAILY SUMMARY</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={dailySummaryConfig.enabled}
          onChange={(e) => setDailySummaryConfig({ ...dailySummaryConfig, enabled: e.target.checked })}
          disabled={!config.enabled}
        />
        Send AI-generated activity summaries
      </label>
      <p style={{
        fontSize: '11px',
        color: 'var(--retro-text-secondary)',
        marginTop: '4px',
        marginLeft: '24px',
        marginBottom: '16px'
      }}>
        Requires AI features + Notifications enabled
      </p>

      <div className="retro-form-group">
        <label className="retro-form-label">Summary times (when to receive summaries)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { value: '09:00', label: 'Morning (9:00 AM)' },
            { value: '12:00', label: 'Midday (12:00 PM)' },
            { value: '18:00', label: 'Evening (6:00 PM)' },
          ].map((time) => (
            <label
              key={time.value}
              className="retro-checkbox-label"
              style={!dailySummaryConfig.enabled || !config.enabled ? { opacity: 0.5 } : {}}
            >
              <input
                type="checkbox"
                className="retro-checkbox"
                checked={dailySummaryConfig.times.includes(time.value)}
                onChange={(e) => {
                  const newTimes = e.target.checked
                    ? [...dailySummaryConfig.times, time.value]
                    : dailySummaryConfig.times.filter(t => t !== time.value)
                  setDailySummaryConfig({ ...dailySummaryConfig, times: newTimes })
                }}
                disabled={!dailySummaryConfig.enabled || !config.enabled}
              />
              {time.label}
            </label>
          ))}

          {/* Custom time option (Sprint 2 - Task 4.2) */}
          <label
            className="retro-checkbox-label"
            style={!dailySummaryConfig.enabled || !config.enabled ? { opacity: 0.5 } : {}}
          >
            <input
              type="checkbox"
              className="retro-checkbox"
              checked={!!dailySummaryConfig.customTime}
              onChange={(e) => {
                if (e.target.checked) {
                  // Enable custom time with default of 2 PM
                  const defaultTime = '14:00'
                  setDailySummaryConfig({
                    ...dailySummaryConfig,
                    customTime: defaultTime,
                    times: [...dailySummaryConfig.times, defaultTime]
                  })
                } else {
                  // Disable custom time and remove it from times array
                  setDailySummaryConfig({
                    ...dailySummaryConfig,
                    customTime: undefined,
                    times: dailySummaryConfig.times.filter(t => t !== dailySummaryConfig.customTime)
                  })
                }
              }}
              disabled={!dailySummaryConfig.enabled || !config.enabled}
            />
            Custom time
          </label>

          {/* Time picker (shown when custom enabled) */}
          {dailySummaryConfig.customTime && (
            <input
              type="time"
              className="retro-input"
              style={{
                marginLeft: '24px',
                width: '150px',
                opacity: !dailySummaryConfig.enabled || !config.enabled ? 0.5 : 1
              }}
              value={dailySummaryConfig.customTime}
              onChange={(e) => {
                const oldTime = dailySummaryConfig.customTime
                const newTime = e.target.value

                // Update custom time and replace it in times array
                setDailySummaryConfig({
                  ...dailySummaryConfig,
                  customTime: newTime,
                  times: dailySummaryConfig.times.map(t => t === oldTime ? newTime : t)
                })
              }}
              disabled={!dailySummaryConfig.enabled || !config.enabled}
            />
          )}
        </div>
      </div>

      {/* Sprint 2 - Task 4.3: Test Summary Button */}
      <div className="retro-button-row" style={{ marginTop: '12px' }}>
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTestSummary}
          disabled={testingSummary || !dailySummaryConfig.enabled || !config.enabled}
        >
          {testingSummary ? 'TESTING...' : 'TEST SUMMARY'}
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

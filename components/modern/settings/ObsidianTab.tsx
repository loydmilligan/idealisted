'use client'

import React, { useState, useEffect } from 'react'
import { ObsidianConfig } from '@/types'

interface SyncStatus {
  enabled: boolean
  vaultPath: string
  syncFrequency: string
  totalSynced: number
  lastSync: number | null
  lastSyncDate: string | null
}

export const ObsidianTab: React.FC = () => {
  const [config, setConfig] = useState<ObsidianConfig>({
    enabled: false,
    vaultPath: '/mnt/obsidian/IdeaListed',
    syncFrequency: 'hourly',
    lastSyncTimestamp: undefined,
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [settingsResponse, statusResponse] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/obsidian/status')
      ])

      const settingsData = await settingsResponse.json()
      const statusData = await statusResponse.json()

      if (settingsData.settings?.obsidian_config) {
        setConfig(settingsData.settings.obsidian_config)
      }

      if (statusData.success) {
        setSyncStatus({
          enabled: statusData.enabled,
          vaultPath: statusData.vaultPath,
          syncFrequency: statusData.syncFrequency,
          totalSynced: statusData.totalSynced,
          lastSync: statusData.lastSync,
          lastSyncDate: statusData.lastSyncDate,
        })
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

    // Validate if enabled
    if (config.enabled) {
      if (!config.vaultPath) {
        setMessage('✗ Vault path is required when Obsidian sync is enabled')
        setSaving(false)
        setTimeout(() => setMessage(''), 3000)
        return
      }

      if (!config.vaultPath.startsWith('/')) {
        setMessage('✗ Vault path must be an absolute path (start with /)')
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
          obsidian_config: config,
        }),
      })

      if (response.ok) {
        setMessage('✓ Settings saved successfully')
        // Reload status to get updated info
        loadSettings()
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

  const handleTestPath = async () => {
    setTesting(true)
    setMessage('')

    try {
      const response = await fetch('/api/obsidian/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultPath: config.vaultPath,
        }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setMessage('✓ Vault path is accessible and writable')
      } else {
        setMessage(`✗ Vault path test failed: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      setMessage('✗ Test error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setTesting(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    setMessage('')

    try {
      const response = await fetch('/api/obsidian/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        const errorMsg = data.errors && data.errors.length > 0
          ? ` (${data.errors.length} errors)`
          : ''
        setMessage(`✓ Sync completed: ${data.itemsSynced} items synced${errorMsg}`)

        // Reload status to get updated sync info
        loadSettings()
      } else {
        const errorDetails = data.errors && data.errors.length > 0
          ? `: ${data.errors[0]}`
          : ''
        setMessage(`✗ Sync failed${errorDetails}`)
      }
    } catch (error) {
      setMessage('✗ Sync error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSyncing(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const formatLastSync = (dateString: string | null): string => {
    if (!dateString) return 'Never'

    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return 'Invalid date'
    }
  }

  if (loading) {
    return <div className="retro-text-secondary">Loading...</div>
  }

  return (
    <div>
      <h3 className="retro-section-title">OBSIDIAN SYNC</h3>

      <label className="retro-checkbox-label">
        <input
          type="checkbox"
          className="retro-checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
        />
        Enable Obsidian sync
      </label>
      <p style={{
        fontSize: '11px',
        color: 'var(--retro-text-secondary)',
        marginTop: '4px',
        marginLeft: '24px',
        marginBottom: '16px'
      }}>
        One-way export of notes and projects to Obsidian vault as markdown files
      </p>

      <div className="retro-form-group">
        <label className="retro-form-label">Vault Path</label>
        <input
          type="text"
          className="retro-input"
          value={config.vaultPath}
          onChange={(e) => setConfig({ ...config, vaultPath: e.target.value })}
          placeholder="/mnt/obsidian/IdeaListed"
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        />
        <p style={{
          fontSize: '10px',
          color: 'var(--retro-text-secondary)',
          marginTop: '4px'
        }}>
          Absolute path to Obsidian vault directory (can be network mount)
        </p>
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Sync Frequency</label>
        <select
          className="retro-select"
          value={config.syncFrequency}
          onChange={(e) => setConfig({
            ...config,
            syncFrequency: e.target.value as ObsidianConfig['syncFrequency']
          })}
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <option value="manual">Manual only</option>
          <option value="hourly">Hourly (recommended)</option>
          <option value="daily">Daily</option>
        </select>
      </div>

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTestPath}
          disabled={testing || !config.enabled || !config.vaultPath}
        >
          {testing ? 'TESTING...' : 'TEST PATH'}
        </button>
      </div>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">SYNC STATUS</h3>

      {syncStatus && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--retro-text-primary)'
          }}>
            <div style={{ color: 'var(--retro-text-secondary)' }}>Total Synced:</div>
            <div>{syncStatus.totalSynced} items</div>

            <div style={{ color: 'var(--retro-text-secondary)' }}>Last Sync:</div>
            <div>{formatLastSync(syncStatus.lastSyncDate)}</div>

            <div style={{ color: 'var(--retro-text-secondary)' }}>Status:</div>
            <div style={{ color: config.enabled ? 'var(--retro-success)' : 'var(--retro-text-secondary)' }}>
              {config.enabled ? '● Active' : '○ Disabled'}
            </div>
          </div>
        </div>
      )}

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleSyncNow}
          disabled={syncing || !config.enabled}
        >
          {syncing ? 'SYNCING...' : 'SYNC NOW'}
        </button>
      </div>

      <hr className="retro-divider" />

      <h3 className="retro-section-title">FILE ORGANIZATION</h3>

      <div style={{
        fontSize: '11px',
        color: 'var(--retro-text-secondary)',
        lineHeight: '1.6',
        marginBottom: '16px'
      }}>
        <p style={{ marginBottom: '8px' }}>Notes are organized by subtype:</p>
        <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
          <li>youtube/ - Video notes</li>
          <li>research/ - Research notes</li>
          <li>meeting/ - Meeting notes</li>
          <li>generic/ - General notes</li>
          <li>media/ - Media notes</li>
        </ul>
        <p style={{ marginBottom: '8px' }}>Projects get their own folders:</p>
        <ul style={{ marginLeft: '20px' }}>
          <li>projects/Project-Name/_hub.md - Project overview</li>
          <li>projects/Project-Name/note.md - Project notes</li>
        </ul>
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

'use client'

import React, { useState, useEffect } from 'react'
import { AIConfig, AIFeatureSetting } from '@/types'

// Popular OpenRouter models
const FREE_MODELS = [
  { value: 'z-ai/glm-4.5-air:free', label: 'GLM-4.5 Air (Free) - Verified' },
  { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (Free)' },
  { value: 'google/gemini-flash-1.5:free', label: 'Gemini Flash 1.5 (Free)' },
  { value: 'qwen/qwen-2-7b-instruct:free', label: 'Qwen 2 7B (Free)' },
  { value: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)' },
]

const PAID_MODELS = [
  { value: 'x-ai/grok-code-fast-1', label: 'Grok Code Fast 1 - Verified' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
  { value: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' },
]

export const AISettingsTab: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    enabled: true,
    openrouterApiKey: '',
    freeModel: 'z-ai/glm-4.5-air:free',
    paidModel: 'x-ai/grok-code-fast-1',
    usePaidModel: false,
    systemPrompt: 'You are an intelligent assistant for IdeaListed, a task management app. Help users capture, organize, and process their ideas efficiently.',
    temperature: 0.7,
    maxTokens: 2000,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [featureSettings, setFeatureSettings] = useState<AIFeatureSetting[]>([])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      // Load AI config
      const settingsResponse = await fetch('/api/settings')
      const settingsData = await settingsResponse.json()
      if (settingsData.settings?.ai_config) {
        setConfig({
          ...config, // Start with defaults
          ...settingsData.settings.ai_config, // Override with saved values
        })
      }

      // Load feature settings
      const featuresResponse = await fetch('/api/ai-features')
      const featuresData = await featuresResponse.json()
      if (featuresData.success && featuresData.features) {
        setFeatureSettings(featuresData.features)
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
      // Save AI config
      const configResponse = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_config: config }),
      })

      // Save feature settings
      const featuresResponse = await fetch('/api/ai-features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: featureSettings }),
      })

      if (configResponse.ok && featuresResponse.ok) {
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
    try {
      // Parallel requests: test AI + fetch feature settings
      const [aiResponse, featuresResponse] = await Promise.all([
        fetch('/api/ai/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Hello, this is a test to verify AI is working correctly',
            targetType: 'task',
          }),
        }),
        fetch('/api/ai-features')
      ])

      // Parse feature settings (even if AI test fails)
      let features: AIFeatureSetting[] = []
      if (featuresResponse.ok) {
        const featuresData = await featuresResponse.json()
        features = featuresData.features || []
      }

      // Build feature status display
      const enabledCount = features.filter(f => f.enabled === 1).length
      const totalCount = features.length
      const featureLines = features.map(f => {
        const status = f.enabled === 1 ? '✓' : '✗'
        const label = getFeatureLabel(f.feature_name)
        const statusText = f.enabled === 1 ? '' : ' (disabled)'
        return `  - ${label}: ${status}${statusText}`
      }).join('\n')

      // Check AI response
      const aiData = await aiResponse.json()

      if (aiResponse.ok && aiData.processed_text) {
        // Success: show comprehensive status
        const activeModel = config.usePaidModel ? config.paidModel : config.freeModel
        const successMsg = [
          '✓ API Key Valid',
          `✓ Model: ${activeModel}`,
          `✓ Features Enabled: ${enabledCount}/${totalCount}`,
          featureLines
        ].join('\n')

        setMessage(successMsg)
      } else if (!aiResponse.ok) {
        // Error: show error but still include feature status
        const errorMsg = aiData.error || aiData.message || `HTTP ${aiResponse.status}`

        let errorPrefix = ''
        if (aiResponse.status === 401 || aiResponse.status === 403) {
          errorPrefix = '✗ API Key Invalid'
        } else if (aiResponse.status === 429) {
          errorPrefix = '✗ Rate Limited'
        } else if (aiResponse.status === 500) {
          errorPrefix = '✗ Server Error'
        } else {
          errorPrefix = '✗ AI Error'
        }

        const errorMessage = [
          `${errorPrefix}: ${errorMsg}`,
          '',
          'Feature Status:',
          featureLines
        ].join('\n')

        setMessage(errorMessage)
      } else {
        // Response OK but no valid suggestion
        setMessage('✗ AI returned invalid response. Check model configuration.')
      }
    } catch (error) {
      // Network or parse error
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessage(`✗ Connection failed: ${errorMsg}`)
    } finally {
      setTesting(false)
      // Keep error messages visible longer
      setTimeout(() => setMessage(''), 8000)
    }
  }

  const handleFeatureToggle = (featureName: string, enabled: boolean) => {
    setFeatureSettings(prev =>
      prev.map(feature =>
        feature.feature_name === featureName
          ? { ...feature, enabled: enabled ? 1 : 0 }
          : feature
      )
    )
  }

  const getFeatureLabel = (featureName: string): string => {
    switch (featureName) {
      case 'suggestion_panel':
        return 'AI Suggestion Panel'
      case 'tag_suggestions':
        return 'AI Tag Suggestions'
      case 'daily_summary':
        return 'AI Daily Summary'
      case 'list_append_ai':
        return 'AI List Item Suggestions'
      case 'project_ai_add':
        return 'AI Project Suggestions'
      default:
        return featureName
    }
  }

  const getFeatureDescription = (featureName: string): string => {
    switch (featureName) {
      case 'suggestion_panel':
        return 'Preview AI analysis before creating items. Shows confidence score and metadata.'
      case 'tag_suggestions':
        return 'AI-powered tag recommendations when creating or editing entities. Prioritizes existing tags.'
      case 'daily_summary':
        return 'AI-generated summary in daily review notification. Requires notifications enabled.'
      case 'list_append_ai':
        return 'AI suggestions for adding items to existing lists. E.g., "add milk to grocery list".'
      case 'project_ai_add':
        return 'AI suggestions for adding tasks and notes to existing projects.'
      default:
        return ''
    }
  }

  if (loading) {
    return <div className="retro-text-secondary">Loading...</div>
  }

  return (
    <div>
      <h3 className="retro-section-title">AI CONFIGURATION</h3>

      {/* Master Toggle */}
      <div className="retro-form-group">
        <label className="retro-checkbox-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>
          <input
            type="checkbox"
            className="retro-checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
          />
          Enable AI Features
        </label>
        <p style={{
          fontSize: '11px',
          color: 'var(--retro-text-secondary)',
          marginTop: '4px',
          marginLeft: '24px'
        }}>
          Toggle to enable/disable all AI functionality app-wide
        </p>
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">OpenRouter API Key</label>
        <input
          type="password"
          className="retro-input"
          value={config.openrouterApiKey}
          onChange={(e) => setConfig({ ...config, openrouterApiKey: e.target.value })}
          placeholder="sk-or-v1-..."
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Free Model</label>
        <select
          className="retro-select"
          value={config.freeModel}
          onChange={(e) => setConfig({ ...config, freeModel: e.target.value })}
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          {FREE_MODELS.map(model => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Paid Model</label>
        <select
          className="retro-select"
          value={config.paidModel}
          onChange={(e) => setConfig({ ...config, paidModel: e.target.value })}
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          {PAID_MODELS.map(model => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="retro-form-group">
        <label className="retro-checkbox-label" style={!config.enabled ? { opacity: 0.5 } : {}}>
          <input
            type="checkbox"
            className="retro-checkbox"
            checked={config.usePaidModel}
            onChange={(e) => setConfig({ ...config, usePaidModel: e.target.checked })}
            disabled={!config.enabled}
          />
          Use Paid Model (Default)
        </label>
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Temperature: {config.temperature}</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={config.temperature}
          onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
          style={{ width: '100%', opacity: !config.enabled ? 0.5 : 1 }}
          disabled={!config.enabled}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Max Tokens</label>
        <input
          type="number"
          className="retro-input"
          value={config.maxTokens}
          onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">System Prompt</label>
        <textarea
          className="retro-textarea"
          rows={4}
          value={config.systemPrompt}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
          disabled={!config.enabled}
          style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        />
      </div>

      {/* Features Section */}
      <hr className="retro-divider" />

      <h3 className="retro-section-title">FEATURES</h3>

      {featureSettings.map((feature) => (
        <div key={feature.feature_name} className="retro-form-group">
          <label
            className="retro-checkbox-label"
            style={!config.enabled ? { opacity: 0.5 } : {}}
          >
            <input
              type="checkbox"
              className="retro-checkbox"
              checked={feature.enabled === 1}
              onChange={(e) => handleFeatureToggle(feature.feature_name, e.target.checked)}
              disabled={!config.enabled}
            />
            {getFeatureLabel(feature.feature_name)}
          </label>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--retro-text-secondary)',
              marginTop: '4px',
              marginLeft: '24px',
              lineHeight: '1.4',
            }}
          >
            {getFeatureDescription(feature.feature_name)}
          </p>
        </div>
      ))}

      {message && (
        <div className="retro-message">
          {message}
        </div>
      )}

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTest}
          disabled={testing || !config.enabled || !config.openrouterApiKey}
        >
          {testing ? 'TESTING...' : 'TEST AI'}
        </button>
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

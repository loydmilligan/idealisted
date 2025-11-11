'use client'

import React, { useState, useEffect } from 'react'
import { AIConfig } from '@/types'

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

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      if (data.settings?.ai_config) {
        setConfig(data.settings.ai_config)
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
        body: JSON.stringify({ ai_config: config }),
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
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello, this is a test to verify AI is working correctly',
          targetType: 'task',
        }),
      })

      const data = await response.json()

      if (response.ok && data.processed_text) {
        // Show success with a snippet of the AI response (AISuggestion object)
        const snippet = data.processed_text.substring(0, 60) || 'Response received'
        setMessage(`✓ AI is working! Type: ${data.suggested_type}, Text: "${snippet}${data.processed_text.length > 60 ? '...' : ''}"`)
      } else if (!response.ok) {
        // HTTP error - show status and message
        const errorMsg = data.error || data.message || `HTTP ${response.status}`
        if (response.status === 401 || response.status === 403) {
          setMessage(`✗ API Key Invalid: ${errorMsg}`)
        } else if (response.status === 429) {
          setMessage(`✗ Rate Limited: ${errorMsg}`)
        } else if (response.status === 500) {
          setMessage(`✗ Server Error: ${errorMsg}`)
        } else {
          setMessage(`✗ AI Error: ${errorMsg}`)
        }
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

  if (loading) {
    return <div className="retro-text-secondary">Loading...</div>
  }

  return (
    <div>
      <h3 className="retro-section-title">AI CONFIGURATION</h3>

      <div className="retro-form-group">
        <label className="retro-form-label">OpenRouter API Key</label>
        <input
          type="password"
          className="retro-input"
          value={config.openrouterApiKey}
          onChange={(e) => setConfig({ ...config, openrouterApiKey: e.target.value })}
          placeholder="sk-or-v1-..."
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Free Model</label>
        <select
          className="retro-select"
          value={config.freeModel}
          onChange={(e) => setConfig({ ...config, freeModel: e.target.value })}
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
        >
          {PAID_MODELS.map(model => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div className="retro-form-group">
        <label className="retro-checkbox-label">
          <input
            type="checkbox"
            className="retro-checkbox"
            checked={config.usePaidModel}
            onChange={(e) => setConfig({ ...config, usePaidModel: e.target.checked })}
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
          style={{ width: '100%' }}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Max Tokens</label>
        <input
          type="number"
          className="retro-input"
          value={config.maxTokens}
          onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">System Prompt</label>
        <textarea
          className="retro-textarea"
          rows={4}
          value={config.systemPrompt}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
        />
      </div>

      {message && (
        <div className="retro-message">
          {message}
        </div>
      )}

      <div className="retro-button-row">
        <button
          className="retro-btn retro-btn-secondary"
          onClick={handleTest}
          disabled={testing || !config.openrouterApiKey}
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

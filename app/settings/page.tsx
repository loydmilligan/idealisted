'use client'

import { useState, useEffect } from 'react'
import { RetroDevice } from '@/components/ui/RetroDevice'
import { RetroButton } from '@/components/ui/RetroButton'
import { RetroInput, RetroTextarea } from '@/components/ui/RetroInput'
import { RetroCard } from '@/components/ui/RetroCard'
import { RetroTabs } from '@/components/ui/RetroTabs'
import { ThemeSelector } from '@/components/ui/ThemeSelector'
import { RetroIcon } from '@/components/ui/RetroIcon'
import { apiClient } from '@/lib/api-client'
import { AIConfig, NtfyConfig } from '@/types'
import Link from 'next/link'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'ntfy' | 'general'>('ai')
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    openrouterApiKey: '',
    freeModel: 'z-ai/glm-4.5-air:free',
    paidModel: 'x-ai/grok-code-fast-1',
    usePaidModel: false,
    systemPrompt: 'You are an intelligent assistant for a task management app.',
    temperature: 0.7,
    maxTokens: 1000
  })
  
  const [ntfyConfig, setNtfyConfig] = useState<NtfyConfig>({
    enabled: false,
    server: 'https://ntfy.sh',
    topic: 'idealisted',
    username: '',
    password: '',
    priority: 'default'
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await apiClient.getSettings()
      const settings = response.settings
      
      if (settings.ai_config) {
        setAiConfig(settings.ai_config)
      }
      if (settings.ntfy_config) {
        setNtfyConfig(settings.ntfy_config)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const saveAISettings = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      await apiClient.updateSettings({ ai_config: aiConfig })
      setMessage('✓ AI settings saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('✗ Failed to save AI settings')
      console.error('Failed to save AI settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveNtfySettings = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      await apiClient.updateSettings({ ntfy_config: ntfyConfig })
      setMessage('✓ Notification settings saved!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('✗ Failed to save notification settings')
      console.error('Failed to save ntfy settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const testNtfy = async () => {
    try {
      await apiClient.sendNotification(
        '🧪 Test Notification',
        'If you see this, ntfy is working!',
        [
          {
            action: 'view',
            label: 'Open App',
            url: window.location.href
          }
        ]
      )
      setMessage('✓ Test notification sent!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('✗ Failed to send test notification')
      console.error('Failed to send test notification:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <RetroDevice 
        className="w-full max-w-lg"
        rightAction={
          <Link href="/" className="flex items-center gap-1">
            <RetroButton size="sm" variant="default" title="Back to Idealisted">
              <RetroIcon type="back" size="sm" />
            </RetroButton>
          </Link>
        }
      >
        <RetroTabs
          tabs={[
            { id: 'ai', label: 'AI' },
            { id: 'ntfy', label: 'NTFY' },
            { id: 'general', label: 'GENERAL' }
          ]}
          activeTab={activeTab}
          onTabChange={(tabId: string) => setActiveTab(tabId as any)}
        />

        <div className="p-4">
          {message && (
            <div className={`mb-4 p-2 text-center text-xs font-bold ${
              message.includes('✓') ? 'text-green-700' : 'text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <RetroCard inset>
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    OpenRouter API Key
                  </label>
                  <RetroInput
                    type="password"
                    value={aiConfig.openrouterApiKey}
                    onChange={(e) => setAiConfig({...aiConfig, openrouterApiKey: e.target.value})}
                    placeholder="sk-or-v1-..."
                  />
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Free Model
                  </label>
                  <select
                    className="palm-input"
                    value={aiConfig.freeModel}
                    onChange={(e) => setAiConfig({...aiConfig, freeModel: e.target.value})}
                  >
                    <option value="z-ai/glm-4.5-air:free">GLM-4.5 Air (Free)</option>
                    <option value="openai/gpt-oss-20b:free">GPT-OSS-20B (Free)</option>
                    <option value="deepseek/deepseek-chat-v3.1:free">DeepSeek Chat v3.1 (Free)</option>
                    <option value="minimax/minimax-m2:free">MiniMax M2 (Free)</option>
                    <option value="qwen/qwen3-coder:free">Qwen3 Coder (Free)</option>
                    <option value="moonshotai/kimi-k2:free">Kimi K2 (Free)</option>
                    <option value="meta-llama/llama-3.3-8b-instruct:free">Llama 3.3 8B (Free)</option>
                  </select>
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Paid Model
                  </label>
                  <select
                    className="palm-input"
                    value={aiConfig.paidModel}
                    onChange={(e) => setAiConfig({...aiConfig, paidModel: e.target.value})}
                  >
                    <option value="x-ai/grok-code-fast-1">Grok Code Fast 1</option>
                    <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                    <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  </select>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="palm-checkbox"
                      checked={aiConfig.usePaidModel}
                      onChange={(e) => setAiConfig({...aiConfig, usePaidModel: e.target.checked})}
                    />
                    <label className="text-xs">Use Paid Model</label>
                  </div>
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    System Prompt
                  </label>
                  <RetroTextarea
                    value={aiConfig.systemPrompt}
                    onChange={(e) => setAiConfig({...aiConfig, systemPrompt: e.target.value})}
                    rows={3}
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide">
                        Temperature
                      </label>
                      <RetroInput
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={aiConfig.temperature}
                        onChange={(e) => setAiConfig({...aiConfig, temperature: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide">
                        Max Tokens
                      </label>
                      <RetroInput
                        type="number"
                        min="100"
                        max="4000"
                        step="100"
                        value={aiConfig.maxTokens}
                        onChange={(e) => setAiConfig({...aiConfig, maxTokens: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <RetroButton
                    onClick={saveAISettings}
                    variant="primary"
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? '...' : '✓ SAVE AI SETTINGS'}
                  </RetroButton>
                </div>
              </RetroCard>
            </div>
          )}

          {/* Ntfy Settings */}
          {activeTab === 'ntfy' && (
            <div className="space-y-4">
              <RetroCard inset>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="palm-checkbox"
                      checked={ntfyConfig.enabled}
                      onChange={(e) => setNtfyConfig({...ntfyConfig, enabled: e.target.checked})}
                    />
                    <label className="text-xs font-bold uppercase tracking-wide">
                      Enable Notifications
                    </label>
                  </div>
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Ntfy Server URL
                  </label>
                  <RetroInput
                    type="text"
                    value={ntfyConfig.server}
                    onChange={(e) => setNtfyConfig({...ntfyConfig, server: e.target.value})}
                    placeholder="https://ntfy.sh"
                  />
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Ntfy Topic
                  </label>
                  <RetroInput
                    type="text"
                    value={ntfyConfig.topic}
                    onChange={(e) => setNtfyConfig({...ntfyConfig, topic: e.target.value})}
                    placeholder="idealisted"
                  />
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Username (Optional)
                  </label>
                  <RetroInput
                    type="text"
                    value={ntfyConfig.username || ''}
                    onChange={(e) => setNtfyConfig({...ntfyConfig, username: e.target.value})}
                    placeholder="Leave empty for public topics"
                  />
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Password (Optional)
                  </label>
                  <RetroInput
                    type="password"
                    value={ntfyConfig.password || ''}
                    onChange={(e) => setNtfyConfig({...ntfyConfig, password: e.target.value})}
                    placeholder="Leave empty for public topics"
                  />
                  
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Priority
                  </label>
                  <select
                    className="palm-input"
                    value={ntfyConfig.priority}
                    onChange={(e) => setNtfyConfig({...ntfyConfig, priority: e.target.value as any})}
                  >
                    <option value="default">Default</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  
                  <div className="flex gap-2">
                    <RetroButton
                      onClick={saveNtfySettings}
                      variant="primary"
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? '...' : '✓ SAVE'}
                    </RetroButton>
                    <RetroButton
                      onClick={testNtfy}
                      variant="secondary"
                      disabled={!ntfyConfig.enabled}
                      className="flex-1"
                    >
                      🧪 TEST
                    </RetroButton>
                  </div>
                </div>
              </RetroCard>
              
              <div className="text-xs opacity-70 space-y-1">
                <p className="font-bold uppercase tracking-wide">How to use ntfy:</p>
                <p>1. Install ntfy app on your phone</p>
                <p>2. Subscribe to your topic (public or private)</p>
                <p>3. For private topics: set username/password</p>
                <p>4. Enable notifications above</p>
                <p>5. Test to verify it works!</p>
                <p className="font-bold uppercase tracking-wide mt-2">Server options:</p>
                <p>• Public: https://ntfy.sh</p>
                <p>• Private: your own ntfy server</p>
              </div>
            </div>
          )}

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <ThemeSelector />
              
              <RetroCard inset>
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide">
                    General Settings
                  </h3>
                  <p className="text-xs opacity-70">
                    More settings coming soon...
                  </p>
                  <div className="space-y-2 text-xs opacity-70">
                    <p>• Dark mode toggle</p>
                    <p>• Data export/import</p>
                    <p>• Theme customization</p>
                    <p>• Backup settings</p>
                  </div>
                </div>
              </RetroCard>
            </div>
          )}
        </div>
      </RetroDevice>
    </div>
  )
}

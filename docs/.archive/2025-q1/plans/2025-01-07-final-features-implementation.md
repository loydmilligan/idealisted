# Final Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the retro Palm Pilot UI with tags, settings, AI integration, notifications, and visual feedback to win the competition.

**Architecture:** Add global header with dynamic subheader, settings modal with tabs, tag management throughout app, entity color accents, animated feedback (Ready badge + grid logo), AI model toggle, task status system, and daily review notifications.

**Tech Stack:** Next.js 14, TypeScript, React, Framer Motion, better-sqlite3, OpenRouter AI, ntfy.sh

---

## Phase 1: Global Header & Infrastructure

### Task 1: Create GlobalHeader Component

**Files:**
- Create: `components/modern/GlobalHeader.tsx`

**Step 1: Create basic header component**

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'

interface GlobalHeaderProps {
  activeTab: 'capture' | 'unsorted' | 'ready' | 'files'
  unsortedCount?: number
  readyCount?: number
  onSettingsClick: () => void
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  activeTab,
  unsortedCount = 0,
  readyCount = 0,
  onSettingsClick,
}) => {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm.toLowerCase()}`
  }

  const formatDate = (date: Date) => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    return `${months[date.getMonth()]} ${date.getDate()}`
  }

  const getSubheaderText = () => {
    switch (activeTab) {
      case 'capture':
        return 'CAPTURE'
      case 'unsorted':
        return `UNSORTED (${unsortedCount})`
      case 'ready':
        return `READY (${readyCount})`
      case 'files':
        return 'FILES'
      default:
        return ''
    }
  }

  return (
    <div className="retro-global-header">
      {/* Main header row */}
      <div className="retro-header-main">
        <div className="retro-header-left">
          <h1 className="retro-app-title">IDEALISTED V1.0</h1>
        </div>
        <div className="retro-header-right">
          <span className="retro-clock">{formatTime(time)}</span>
          <span className="retro-date">{formatDate(time)}</span>
          <button className="retro-settings-btn" onClick={onSettingsClick}>
            <Settings size={18} />
          </button>
          <div className="retro-grid-logo">
            <div className="grid-square" />
            <div className="grid-square" />
            <div className="grid-square" />
            <div className="grid-square" />
          </div>
        </div>
      </div>

      {/* Tagline row */}
      <div className="retro-header-tagline">
        CAPTURE • SORT • TRACK • LEARN
      </div>

      {/* Dynamic subheader */}
      <div className="retro-header-subheader">
        {getSubheaderText()}
      </div>
    </div>
  )
}
```

**Step 2: Add retro header styles**

Modify: `styles/retro.css` (add at end of file)

```css
/* ===== GLOBAL HEADER ===== */

.retro-global-header {
  background: var(--palm-screen-base);
  border-bottom: 2px solid var(--palm-border-dark);
  padding: 8px 12px 0 12px;
  font-family: var(--font-mono);
}

.retro-header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.retro-app-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--palm-text-primary);
  margin: 0;
}

.retro-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--palm-text-secondary);
}

.retro-clock,
.retro-date {
  font-weight: 600;
}

.retro-settings-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--palm-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.retro-settings-btn:hover {
  opacity: 0.7;
}

.retro-grid-logo {
  display: grid;
  grid-template-columns: 6px 6px;
  grid-template-rows: 6px 6px;
  gap: 2px;
}

.grid-square {
  width: 6px;
  height: 6px;
  background: var(--palm-text-secondary);
  border: 1px solid var(--palm-border-light);
}

.retro-header-tagline {
  font-size: 9px;
  text-align: left;
  color: var(--palm-text-tertiary);
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.retro-header-subheader {
  background: var(--palm-screen-dark);
  color: var(--palm-bg-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 6px 8px;
  margin: 0 -12px;
  border-top: 1px solid var(--palm-border-dark);
  border-bottom: 1px solid var(--palm-border-light);
}
```

**Step 3: Integrate header into main app**

Modify: `app/page.tsx:1-20`

Add import:
```typescript
import { GlobalHeader } from '@/components/modern/GlobalHeader'
```

Add state for settings modal:
```typescript
const [settingsOpen, setSettingsOpen] = useState(false)
```

**Step 4: Add header to JSX**

Modify: `app/page.tsx:330-333`

Replace:
```typescript
return (
  <div className="h-screen overflow-hidden bg-[var(--bg-primary)]">
    {/* Active Screen */}
```

With:
```typescript
return (
  <div className="h-screen overflow-hidden bg-[var(--bg-primary)]">
    {/* Global Header */}
    <GlobalHeader
      activeTab={activeTab}
      unsortedCount={unsortedCount}
      readyCount={readyCount}
      onSettingsClick={() => setSettingsOpen(true)}
    />

    {/* Active Screen */}
```

**Step 5: Adjust screen container for header**

Modify: `app/page.tsx:333`

Replace:
```typescript
<div className="h-full overflow-y-auto">
```

With:
```typescript
<div className="flex-1 overflow-y-auto">
```

**Step 6: Test header**

Run: `npm run dev` (already running on port 3000)
Open: `http://localhost:3000`
Expected: Global header appears with "IDEALISTED V1.0", clock, date, settings icon, grid logo

**Step 7: Commit**

```bash
git add components/modern/GlobalHeader.tsx styles/retro.css app/page.tsx
git commit -m "feat: add global header with clock and dynamic subheader"
```

---

### Task 2: Create GridLogo Component with Animations

**Files:**
- Create: `components/modern/GridLogo.tsx`
- Modify: `components/modern/GlobalHeader.tsx:50-55`
- Modify: `styles/retro.css` (add animations)

**Step 1: Create GridLogo component**

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { EntityType } from '@/lib/entity-colors'

interface GridLogoProps {
  className?: string
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export const GridLogo: React.FC<GridLogoProps> = ({ className = '' }) => {
  const [flashingCorner, setFlashingCorner] = useState<Corner | null>(null)
  const [flashColor, setFlashColor] = useState<string>('')
  const [isAiFlash, setIsAiFlash] = useState(false)

  // Expose flash methods via event
  useEffect(() => {
    const handleFlash = (event: CustomEvent<{ entityType: EntityType; isAi?: boolean }>) => {
      const { entityType, isAi = false } = event.detail

      // Map entity type to corner
      const cornerMap: Record<EntityType, Corner> = {
        idea: 'top-left',      // Capture/Unsorted
        task: 'bottom-left',   // Ready
        note: 'bottom-right',  // Files
        project: 'bottom-right',
        list: 'bottom-right',
      }

      const entityColors = {
        task: '#6B8B9E',
        note: '#9E8B6B',
        project: '#7B9E6B',
        list: '#8B6B9E',
        idea: '#8B9E8B',
      }

      setFlashingCorner(cornerMap[entityType])
      setFlashColor(entityColors[entityType] || '#8B9E8B')
      setIsAiFlash(isAi)

      setTimeout(() => {
        setFlashingCorner(null)
        setIsAiFlash(false)
      }, isAi ? 1200 : 600)
    }

    window.addEventListener('grid-logo-flash' as any, handleFlash as EventListener)
    return () => window.removeEventListener('grid-logo-flash' as any, handleFlash as EventListener)
  }, [])

  const getSquareClass = (corner: Corner) => {
    const baseClass = 'grid-square'
    if (isAiFlash) {
      return `${baseClass} grid-square-ai-flash`
    }
    if (flashingCorner === corner) {
      return `${baseClass} grid-square-flash`
    }
    return baseClass
  }

  const getSquareStyle = (corner: Corner) => {
    if (flashingCorner === corner) {
      return { backgroundColor: flashColor }
    }
    return {}
  }

  return (
    <div className={`retro-grid-logo ${className}`}>
      <div className={getSquareClass('top-left')} style={getSquareStyle('top-left')} />
      <div className={getSquareClass('top-right')} style={getSquareStyle('top-right')} />
      <div className={getSquareClass('bottom-left')} style={getSquareStyle('bottom-left')} />
      <div className={getSquareClass('bottom-right')} style={getSquareStyle('bottom-right')} />
    </div>
  )
}

// Helper function to trigger flash
export const triggerGridFlash = (entityType: EntityType, isAi: boolean = false) => {
  window.dispatchEvent(new CustomEvent('grid-logo-flash', {
    detail: { entityType, isAi }
  }))
}
```

**Step 2: Add grid logo animations to CSS**

Modify: `styles/retro.css` (add after grid logo styles)

```css
/* Grid Logo Animations */

@keyframes flash-entity {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.2);
  }
}

@keyframes ai-flash {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  25% {
    opacity: 0.3;
    transform: scale(1.3);
    box-shadow: 0 0 8px currentColor;
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
  75% {
    opacity: 0.3;
    transform: scale(1.3);
    box-shadow: 0 0 8px currentColor;
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.grid-square-flash {
  animation: flash-entity 600ms ease-in-out;
}

.grid-square-ai-flash {
  animation: ai-flash 1200ms ease-in-out;
}
```

**Step 3: Update GlobalHeader to use GridLogo**

Modify: `components/modern/GlobalHeader.tsx:3`

Add import:
```typescript
import { GridLogo } from './GridLogo'
```

Modify: `components/modern/GlobalHeader.tsx:50-55`

Replace:
```typescript
<div className="retro-grid-logo">
  <div className="grid-square" />
  <div className="grid-square" />
  <div className="grid-square" />
  <div className="grid-square" />
</div>
```

With:
```typescript
<GridLogo />
```

**Step 4: Test grid animations**

Open browser console and run:
```javascript
window.dispatchEvent(new CustomEvent('grid-logo-flash', {
  detail: { entityType: 'task', isAi: false }
}))
```

Expected: Bottom-left square flashes teal color

**Step 5: Commit**

```bash
git add components/modern/GridLogo.tsx components/modern/GlobalHeader.tsx styles/retro.css
git commit -m "feat: add grid logo with entity flash animations"
```

---

## Phase 2: Settings Page

### Task 3: Create Settings Modal Structure

**Files:**
- Create: `components/modern/SettingsModal.tsx`
- Create: `components/modern/settings/AISettingsTab.tsx`
- Create: `components/modern/settings/NotificationsTab.tsx`
- Create: `components/modern/settings/TagsTab.tsx`
- Create: `components/modern/settings/AppearanceTab.tsx`

**Step 1: Create settings modal shell**

```typescript
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
```

**Step 2: Add settings modal styles**

Modify: `styles/retro.css` (add at end)

```css
/* ===== SETTINGS MODAL ===== */

.retro-settings-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: var(--palm-bg-primary);
  border: 3px solid var(--palm-border-dark);
  box-shadow: 4px 4px 0 var(--palm-border-dark);
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.retro-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--palm-screen-dark);
  color: var(--palm-bg-primary);
  border-bottom: 2px solid var(--palm-border-dark);
}

.retro-settings-header h2 {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin: 0;
}

.retro-close-btn {
  background: none;
  border: none;
  color: var(--palm-bg-primary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.retro-close-btn:hover {
  opacity: 0.7;
}

.retro-settings-tabs {
  display: flex;
  gap: 2px;
  background: var(--palm-screen-dark);
  padding: 0 8px;
  border-bottom: 2px solid var(--palm-border-dark);
}

.retro-settings-tabs .retro-tab {
  flex: 1;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: var(--palm-screen-base);
  color: var(--palm-text-secondary);
  border: none;
  border-top: 2px solid var(--palm-border-light);
  border-left: 2px solid var(--palm-border-light);
  border-right: 2px solid var(--palm-border-dark);
  cursor: pointer;
  transition: all 0.15s;
}

.retro-settings-tabs .retro-tab:hover {
  background: var(--palm-screen-light);
}

.retro-settings-tabs .retro-tab.active {
  background: var(--palm-bg-primary);
  color: var(--palm-text-primary);
  border-bottom: 2px solid var(--palm-bg-primary);
  margin-bottom: -2px;
}

.retro-settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
```

**Step 3: Create placeholder tab components**

Create: `components/modern/settings/AISettingsTab.tsx`

```typescript
'use client'

import React from 'react'

export const AISettingsTab: React.FC = () => {
  return (
    <div>
      <h3 className="retro-section-title">AI CONFIGURATION</h3>
      <p className="retro-text-secondary">AI settings coming next...</p>
    </div>
  )
}
```

Create: `components/modern/settings/NotificationsTab.tsx`

```typescript
'use client'

import React from 'react'

export const NotificationsTab: React.FC = () => {
  return (
    <div>
      <h3 className="retro-section-title">NOTIFICATION SETTINGS</h3>
      <p className="retro-text-secondary">Notification settings coming next...</p>
    </div>
  )
}
```

Create: `components/modern/settings/TagsTab.tsx`

```typescript
'use client'

import React from 'react'

export const TagsTab: React.FC = () => {
  return (
    <div>
      <h3 className="retro-section-title">TAG MANAGEMENT</h3>
      <p className="retro-text-secondary">Tag management coming next...</p>
    </div>
  )
}
```

Create: `components/modern/settings/AppearanceTab.tsx`

```typescript
'use client'

import React from 'react'

export const AppearanceTab: React.FC = () => {
  return (
    <div>
      <h3 className="retro-section-title">APPEARANCE</h3>
      <p className="retro-text-secondary">Appearance settings coming next...</p>
    </div>
  )
}
```

**Step 4: Integrate settings modal into app**

Modify: `app/page.tsx:20`

Add import:
```typescript
import { SettingsModal } from '@/components/modern/SettingsModal'
```

Modify: `app/page.tsx:450-455` (before closing div)

Add before the final closing `</div>`:
```typescript
{/* Settings Modal */}
<SettingsModal
  isOpen={settingsOpen}
  onClose={() => setSettingsOpen(false)}
/>
```

**Step 5: Add common settings styles**

Modify: `styles/retro.css` (add at end)

```css
/* ===== SETTINGS COMMON STYLES ===== */

.retro-section-title {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--palm-text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--palm-border-light);
}

.retro-text-secondary {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--palm-text-secondary);
  margin: 8px 0;
}

.retro-form-group {
  margin-bottom: 16px;
}

.retro-form-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--palm-text-primary);
  display: block;
  margin-bottom: 6px;
}

.retro-input,
.retro-textarea,
.retro-select {
  width: 100%;
  padding: 8px 10px;
  font-family: var(--font-sans);
  font-size: 13px;
  background: var(--palm-bg-secondary);
  color: var(--palm-text-primary);
  border: 2px inset var(--palm-border-light);
  outline: none;
}

.retro-input:focus,
.retro-textarea:focus,
.retro-select:focus {
  border-color: var(--entity-task);
}

.retro-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

.retro-checkbox-label {
  display: flex;
  align-items: center;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--palm-text-primary);
  margin-bottom: 8px;
  cursor: pointer;
}
```

**Step 6: Test settings modal**

Run: Open app, click settings cog in header
Expected: Settings modal opens with 4 tabs, can switch between tabs

**Step 7: Commit**

```bash
git add components/modern/SettingsModal.tsx components/modern/settings/*.tsx styles/retro.css app/page.tsx
git commit -m "feat: add settings modal structure with tabs"
```

---

### Task 4: Implement AI Settings Tab

**Files:**
- Modify: `components/modern/settings/AISettingsTab.tsx`

**Step 1: Implement AI settings form**

Replace entire file content:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { AIConfig } from '@/types'

export const AISettingsTab: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    openrouterApiKey: '',
    freeModel: 'meta-llama/llama-3.1-8b-instruct:free',
    paidModel: 'anthropic/claude-3.5-sonnet',
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
          text: 'Test AI connection',
          targetType: 'task',
        }),
      })

      if (response.ok) {
        setMessage('✓ AI connection working')
      } else {
        setMessage('✗ AI connection failed')
      }
    } catch (error) {
      setMessage('✗ AI test error')
    } finally {
      setTesting(false)
      setTimeout(() => setMessage(''), 3000)
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
        <input
          type="text"
          className="retro-input"
          value={config.freeModel}
          onChange={(e) => setConfig({ ...config, freeModel: e.target.value })}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Paid Model</label>
        <input
          type="text"
          className="retro-input"
          value={config.paidModel}
          onChange={(e) => setConfig({ ...config, paidModel: e.target.value })}
        />
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
```

**Step 2: Add message and button row styles**

Modify: `styles/retro.css` (add at end)

```css
.retro-message {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 8px 12px;
  margin: 12px 0;
  background: var(--palm-screen-light);
  border: 1px solid var(--palm-border-light);
  border-radius: 2px;
}

.retro-button-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.retro-button-row .retro-btn {
  flex: 1;
}
```

**Step 3: Test AI settings**

Run: Open settings, go to AI tab
Expected: Can enter API key, configure models, save settings

**Step 4: Commit**

```bash
git add components/modern/settings/AISettingsTab.tsx styles/retro.css
git commit -m "feat: implement AI settings tab with save/test"
```

---

### Task 5: Implement Notifications Settings Tab

**Files:**
- Modify: `components/modern/settings/NotificationsTab.tsx`
- Create: `lib/notify.ts` (if doesn't exist)

**Step 1: Check if notify service exists**

Run: `ls lib/notify.ts`

If doesn't exist, create: `lib/notify.ts`

```typescript
import { NtfyConfig } from '@/types'

class NtfyService {
  private config: NtfyConfig | null = null

  constructor() {
    this.initializeFromSettings()
  }

  private async initializeFromSettings() {
    try {
      const { db } = await import('@/lib/db')
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ntfy_config') as any

      if (setting) {
        this.config = JSON.parse(setting.value)
      }
    } catch (error) {
      console.error('Failed to initialize ntfy from settings:', error)
    }
  }

  async updateConfig(config: NtfyConfig) {
    try {
      const { db } = await import('@/lib/db')

      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('ntfy_config', JSON.stringify(config), Date.now())

      this.config = config
      return true
    } catch (error) {
      console.error('Failed to update ntfy config:', error)
      return false
    }
  }

  async sendNotification(title: string, message: string, actions?: any[], priority?: string) {
    if (!this.config || !this.config.enabled) {
      throw new Error('Ntfy not configured')
    }

    const url = `${this.config.server}/${this.config.topic}`

    const headers: Record<string, string> = {
      'Title': title,
      'Priority': priority || this.config.priority || 'default',
    }

    if (this.config.username && this.config.password) {
      headers['Authorization'] = 'Basic ' + btoa(`${this.config.username}:${this.config.password}`)
    }

    if (actions) {
      headers['Actions'] = JSON.stringify(actions)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: message,
    })

    if (!response.ok) {
      throw new Error(`Ntfy request failed: ${response.statusText}`)
    }

    return { success: true }
  }

  isConfigured(): boolean {
    return this.config !== null && this.config.enabled
  }

  getConfigSummary() {
    if (!this.config) return null
    return {
      enabled: this.config.enabled,
      server: this.config.server,
      topic: this.config.topic,
      priority: this.config.priority,
    }
  }
}

export const ntfyService = new NtfyService()
export default ntfyService
```

**Step 2: Implement notifications tab**

Replace: `components/modern/settings/NotificationsTab.tsx` entire content:

```typescript
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

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
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
    try {
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
        setMessage('✓ Test notification sent')
      } else {
        setMessage('✗ Test notification failed')
      }
    } catch (error) {
      setMessage('✗ Test error')
    } finally {
      setTesting(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (loading) {
    return <div className="retro-text-secondary">Loading...</div>
  }

  return (
    <div>
      <h3 className="retro-section-title">NOTIFICATION SETTINGS</h3>

      <div className="retro-form-group">
        <label className="retro-form-label">Server URL</label>
        <input
          type="text"
          className="retro-input"
          value={config.server}
          onChange={(e) => setConfig({ ...config, server: e.target.value })}
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
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Username (optional)</label>
        <input
          type="text"
          className="retro-input"
          value={config.username}
          onChange={(e) => setConfig({ ...config, username: e.target.value })}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Password (optional)</label>
        <input
          type="password"
          className="retro-input"
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
        />
      </div>

      <div className="retro-form-group">
        <label className="retro-form-label">Priority</label>
        <div className="retro-radio-group">
          {(['low', 'default', 'high', 'urgent'] as const).map((p) => (
            <label key={p} className="retro-radio-label">
              <input
                type="radio"
                name="priority"
                value={p}
                checked={config.priority === p}
                onChange={(e) => setConfig({ ...config, priority: e.target.value as any })}
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
          disabled={testing || !config.topic}
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
```

**Step 3: Add styles for radio group and divider**

Modify: `styles/retro.css` (add at end)

```css
.retro-radio-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.retro-radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--palm-text-primary);
  cursor: pointer;
}

.retro-divider {
  border: none;
  border-top: 1px solid var(--palm-border-light);
  margin: 24px 0;
}
```

**Step 4: Test notifications tab**

Run: Open settings, go to Notifications tab
Expected: Can configure ntfy, enable/disable events, set daily review time

**Step 5: Commit**

```bash
git add components/modern/settings/NotificationsTab.tsx lib/notify.ts styles/retro.css
git commit -m "feat: implement notifications settings tab"
```

---

Due to length constraints, I'll create the rest of the plan in the next section. This covers:
- Phase 1: Global Header (Tasks 1-2) ✓
- Phase 2: Settings Page (Tasks 3-5) ✓

Remaining:
- Task 6: Tags Tab
- Task 7: Appearance Tab
- Phase 3: Tags System
- Phase 4: Color Accents & Animations
- Phase 5: Task Status
- Phase 6: AI Integration
- Phase 7: Notifications

Should I continue with the remaining tasks in this same file, or would you like me to save what we have so far and continue in a second plan file?
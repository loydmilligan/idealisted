# Sprint 2: New Features & Polish

**Date**: 2025-11-24
**Priority**: MEDIUM - New features and UX improvements
**Estimated Effort**: 10-12 hours
**Prerequisites**: Sprint 1 must be complete

---

## Overview

This sprint focuses on:
1. AI Daily Summary implementation (CRON + test button + custom time)
2. AI append to existing lists/projects (the smart "add X to Y" feature)
3. UI polish and test buttons

---

## Phase 4: AI Daily Summary Implementation (4 hours)

### Task 4.1: Implement Daily Summary CRON Job
**Current State**: UI exists, feature flag exists, but no CRON job

**File**: `/lib/scheduler.ts`

**Implementation**:
```typescript
class SchedulerService {
  // ... existing code

  private initializeDailySummaryCron() {
    console.log('[Scheduler] Initializing daily summary CRON...')

    // Load config
    const settingRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('daily_summary_config') as any

    if (!settingRow) {
      console.log('[Scheduler] No daily summary config found')
      return
    }

    const config = JSON.parse(settingRow.value)

    if (!config.enabled) {
      console.log('[Scheduler] Daily summary disabled in settings')
      return
    }

    // Check if AI features enabled
    const aiConfig = this.getAIConfig()
    if (!aiConfig?.enabled) {
      console.log('[Scheduler] Daily summary requires AI features enabled')
      return
    }

    // Check if notifications enabled
    const ntfyConfig = this.getNtfyConfig()
    if (!ntfyConfig?.enabled) {
      console.log('[Scheduler] Daily summary requires notifications enabled')
      return
    }

    // Schedule CRON for each configured time
    config.times.forEach((time: string) => {
      const [hour, minute] = time.split(':')
      const cronPattern = `${minute} ${hour} * * *`

      console.log(`[Scheduler] Scheduling daily summary for ${time} (${cronPattern})`)

      cron.schedule(cronPattern, async () => {
        await this.sendDailySummary()
      })
    })
  }

  private async sendDailySummary() {
    console.log('[Daily Summary] Generating summary...')

    try {
      // 1. Check feature is still enabled
      const featureEnabled = await aiService.isFeatureEnabled('daily_summary')
      if (!featureEnabled) {
        console.log('[Daily Summary] Feature disabled, skipping')
        return
      }

      // 2. Generate AI summary using summary service
      const summaryService = await import('./summary-service')
      const summary = await summaryService.generateDailySummary()

      // 3. Send via ntfy
      const { ntfyService } = await import('./notify')
      const result = await ntfyService.sendNotification(
        'AI Daily Summary',
        summary,
        [],
        'default'
      )

      if (result.success) {
        console.log('[Daily Summary] ✓ Summary sent successfully')
      } else {
        console.error('[Daily Summary] ✗ Failed to send:', result.error)
      }

    } catch (error) {
      console.error('[Daily Summary] Error:', error)
    }
  }

  // Helper methods
  private getAIConfig(): any {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_config') as any
    return setting ? JSON.parse(setting.value) : null
  }

  private getNtfyConfig(): any {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ntfy_config') as any
    return setting ? JSON.parse(setting.value) : null
  }

  // Update start() to call initializeDailySummaryCron
  start() {
    // ... existing CRON jobs
    this.initializeDailySummaryCron()
  }
}
```

**Create `/lib/summary-service.ts`**:
```typescript
import { db } from './db'
import { aiService } from './ai'
import { format, startOfDay, endOfDay } from 'date-fns'

export async function generateDailySummary(): Promise<string> {
  const today = new Date()
  const todayStart = startOfDay(today).getTime()
  const todayEnd = endOfDay(today).getTime()

  // Gather stats
  const stats = {
    ideasCaptured: db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE type = 'idea' AND created_at >= ? AND created_at <= ?
    `).get(todayStart, todayEnd)?.count || 0,

    ideasConverted: db.prepare(`
      SELECT COUNT(*) as count FROM items
      WHERE type != 'idea' AND created_at >= ? AND created_at <= ?
    `).get(todayStart, todayEnd)?.count || 0,

    tasksCompleted: db.prepare(`
      SELECT COUNT(*) as count FROM tasks t
      JOIN items i ON t.item_id = i.id
      WHERE t.status = 'completed' AND i.updated_at >= ? AND i.updated_at <= ?
    `).get(todayStart, todayEnd)?.count || 0,

    tasksDueToday: db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE due_date >= ? AND due_date <= ? AND status != 'completed'
    `).get(todayStart, todayEnd)?.count || 0,
  }

  // Build context for AI
  const prompt = `Generate a brief, encouraging daily summary for ${format(today, 'MMMM d, yyyy')}.

Stats:
- Ideas captured: ${stats.ideasCaptured}
- Ideas converted to tasks/notes/projects: ${stats.ideasConverted}
- Tasks completed: ${stats.tasksCompleted}
- Tasks due today: ${stats.tasksDueToday}

Provide a 2-3 sentence summary highlighting key accomplishments and momentum. Be encouraging and specific.`

  try {
    const response = await aiService.chat(prompt, 'You are a helpful productivity assistant.')
    return response.suggestion || generateFallbackSummary(stats)
  } catch (error) {
    console.error('AI summary generation failed:', error)
    return generateFallbackSummary(stats)
  }
}

function generateFallbackSummary(stats: any): string {
  const parts: string[] = []

  if (stats.tasksCompleted > 0) {
    parts.push(`You completed ${stats.tasksCompleted} task${stats.tasksCompleted > 1 ? 's' : ''} today`)
  }

  if (stats.ideasConverted > 0) {
    parts.push(`converted ${stats.ideasConverted} idea${stats.ideasConverted > 1 ? 's' : ''}`)
  }

  if (stats.tasksDueToday > 0) {
    parts.push(`${stats.tasksDueToday} task${stats.tasksDueToday > 1 ? 's' : ''} still due today`)
  }

  return parts.length > 0
    ? `Good work! ${parts.join(', ')}.`
    : 'Keep up the great work with IdeaListed!'
}
```

**Acceptance Criteria**:
- ✅ CRON jobs scheduled for each configured time (9 AM, 12 PM, 6 PM, custom)
- ✅ AI generates contextual summary
- ✅ Summary sent via ntfy
- ✅ Respects feature flags (AI enabled, notifications enabled, daily_summary enabled)
- ✅ Logs show CRON running
- ✅ Graceful fallback if AI fails

---

### Task 4.2: Add Custom Time Picker to Daily Summary
**File**: `/components/modern/settings/NotificationsTab.tsx`

**Update DailySummaryConfig Type** in `/types/index.ts`:
```typescript
export interface DailySummaryConfig {
  enabled: boolean
  times: string[]  // Array of "HH:mm" strings
  customTime?: string  // Optional custom time "HH:mm"
  includeMetrics: {
    ideasCaptured: boolean
    ideasConverted: boolean
    tasksCompleted: boolean
    tasksDueToday: boolean
    tasksDueSoon: boolean
  }
}
```

**UI Changes**:
```tsx
<div className="retro-form-group">
  <label className="retro-form-label">Send summary at:</label>

  {/* Preset times */}
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {[
      { value: '09:00', label: 'Morning (9:00 AM)' },
      { value: '12:00', label: 'Midday (12:00 PM)' },
      { value: '18:00', label: 'Evening (6:00 PM)' },
    ].map((time) => (
      <label key={time.value} className="retro-checkbox-label">
        <input
          type="checkbox"
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

    {/* Custom time option */}
    <label className="retro-checkbox-label">
      <input
        type="checkbox"
        checked={!!dailySummaryConfig.customTime}
        onChange={(e) => {
          if (e.target.checked) {
            setDailySummaryConfig({
              ...dailySummaryConfig,
              customTime: '14:00',  // Default to 2 PM
              times: [...dailySummaryConfig.times, '14:00']
            })
          } else {
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
        style={{ marginLeft: '24px', width: '150px' }}
        value={dailySummaryConfig.customTime}
        onChange={(e) => {
          const oldTime = dailySummaryConfig.customTime
          const newTime = e.target.value

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
```

**Acceptance Criteria**:
- ✅ Custom time checkbox appears
- ✅ Time picker appears when checked
- ✅ Custom time defaults to 14:00 (2 PM)
- ✅ User can change custom time
- ✅ Custom time added to times array
- ✅ CRON job scheduled for custom time
- ✅ Unchecking custom removes it from times

---

### Task 4.3: Add Test Summary Button
**File**: `/components/modern/settings/NotificationsTab.tsx`

**State**:
```typescript
const [testingSummary, setTestingSummary] = useState(false)
```

**Handler**:
```typescript
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
```

**Button UI**:
```tsx
<div className="retro-button-row">
  <button
    className="retro-btn retro-btn-secondary"
    onClick={handleTestSummary}
    disabled={testingSummary || !dailySummaryConfig.enabled || !config.enabled}
  >
    {testingSummary ? 'TESTING...' : 'TEST SUMMARY'}
  </button>
</div>
```

**Create API Endpoint** `/app/api/summary/test/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { generateDailySummary } from '@/lib/summary-service'
import { ntfyService } from '@/lib/notify'

export async function POST() {
  try {
    // Generate summary
    const summary = await generateDailySummary()

    // Send via ntfy
    const result = await ntfyService.sendNotification(
      'AI Daily Summary (Test)',
      summary,
      [],
      'default'
    )

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send' },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Acceptance Criteria**:
- ✅ Button appears below summary time options
- ✅ Button disabled when summary or ntfy disabled
- ✅ Clicking sends test notification immediately
- ✅ Shows success/error message
- ✅ Uses real AI summary logic
- ✅ Button shows loading state

---

### Task 4.4: Add Test Reminder Button
**File**: `/components/modern/settings/NotificationsTab.tsx`

**Similar implementation to test summary**:

**State**:
```typescript
const [testingReminder, setTestingReminder] = useState(false)
```

**Handler**:
```typescript
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
      setMessage(`✗ Test failed: ${data.error}`)
    }
  } finally {
    setTestingReminder(false)
    setTimeout(() => setMessage(''), 5000)
  }
}
```

**Button UI**:
```tsx
<div className="retro-button-row">
  <button
    className="retro-btn retro-btn-secondary"
    onClick={handleTestReminder}
    disabled={testingReminder || !reminderConfig.enabled || !config.enabled}
  >
    {testingReminder ? 'TESTING...' : 'TEST REMINDER'}
  </button>
</div>
```

**Create API Endpoint** `/app/api/reminders/test/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { ntfyService } from '@/lib/notify'
import { format } from 'date-fns'

export async function POST() {
  try {
    // Send test reminder
    const now = new Date()
    const timeStr = format(now, 'h:mm a')

    const result = await ntfyService.notifyTaskDue(
      'Test task reminder - this is a sample task',
      `in 1 hour (${timeStr})`
    )

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send' },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

**Acceptance Criteria**:
- ✅ Button appears in Task Reminders section
- ✅ Sends test reminder notification
- ✅ Shows success/error message
- ✅ Uses real notification format

---

## Phase 5: AI Append to Lists/Projects (5 hours)

### Task 5.1: Enhance AI Suggestion Detection for Existing Entities
**File**: `/app/api/ai/suggest/route.ts`

**Goal**: When user types "add eggs to grocery list", search for existing "grocery list" and suggest appending instead of creating new

**Current Behavior**: Always creates new list
**Desired Behavior**: Search database, offer append if found

**Implementation**:

**Add Database Search**:
```typescript
// After AI processes suggestion, check if it's an "add to" pattern
const addToListPattern = /add\s+(.+?)\s+to\s+(.+?)\s+list/i
const addToProjectPattern = /add\s+(.+?)\s+to\s+(.+?)(?:\s+project)?$/i

const listMatch = text.match(addToListPattern)
const projectMatch = text.match(addToProjectPattern)

if (listMatch) {
  const [_, itemsText, listName] = listMatch

  // Search for existing list (fuzzy match)
  const existingList = db.prepare(`
    SELECT l.id, l.name, l.item_id
    FROM lists l
    JOIN items i ON l.item_id = i.id
    WHERE LOWER(l.name) LIKE ? OR LOWER(i.text) LIKE ?
    LIMIT 1
  `).get(`%${listName.toLowerCase()}%`, `%${listName.toLowerCase()}%`)

  if (existingList) {
    // Found existing list - suggest appending
    const items = itemsText.split(/,|and/).map(s => s.trim()).filter(Boolean)

    return NextResponse.json({
      suggested_type: 'list',
      suggested_action: 'append_to_list',
      target_entity_id: existingList.id,
      target_entity_name: existingList.name,
      append_items: items,
      confidence: 0.95,
      processed_text: `Add ${items.join(', ')} to ${existingList.name}`,
      reasoning: `Found existing list "${existingList.name}". Will append ${items.length} item(s).`
    })
  } else {
    // No match - create new list (existing behavior)
    // ... fall through to normal list creation
  }
}

if (projectMatch) {
  const [_, taskText, projectName] = projectMatch

  // Search for existing project
  const existingProject = db.prepare(`
    SELECT p.id, i.text as name, p.item_id
    FROM projects p
    JOIN items i ON p.item_id = i.id
    WHERE LOWER(i.text) LIKE ?
    LIMIT 1
  `).get(`%${projectName.toLowerCase()}%`)

  if (existingProject) {
    // Found existing project - suggest adding task
    return NextResponse.json({
      suggested_type: 'task',
      suggested_action: 'add_to_project',
      target_entity_id: existingProject.id,
      target_entity_name: existingProject.name,
      processed_text: taskText.trim(),
      additional_fields: {
        project_id: existingProject.id,
        status: 'pending',
        priority: 2
      },
      confidence: 0.95,
      reasoning: `Found existing project "${existingProject.name}". Will add task to it.`
    })
  }
}

// If no matches found, proceed with normal AI suggestion flow
```

**Acceptance Criteria**:
- ✅ "add eggs to grocery" finds "Grocery List"
- ✅ "add milk, bread to shopping list" finds list and extracts both items
- ✅ "add bug tracking to MyProject" finds project
- ✅ Fuzzy matching handles typos/case differences
- ✅ Returns new action types: append_to_list, add_to_project

---

### Task 5.2: Update AISuggestion Type
**File**: `/types/index.ts`

```typescript
export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  confidence: number
  processed_text: string
  title?: string
  tags?: string[]
  reasoning?: string
  additional_fields?: {
    priority?: number
    due_date?: string
    category?: string
    estimated_time?: number
    deadline?: string
    status?: string
    list_name?: string
    list_items?: string[]
    project_id?: string  // For tasks being added to projects
  }

  // NEW: Action types for append/add flows
  suggested_action?: 'create_new' | 'append_to_list' | 'add_to_project'
  target_entity_id?: string       // ID of existing list/project
  target_entity_name?: string     // Name of existing list/project
  append_items?: string[]         // Items to append to list
}
```

---

### Task 5.3: Handle Append Actions in AISuggestionPanel
**File**: `/components/ui/AISuggestionPanel.tsx`

**Add UI for Append to List**:
```tsx
{suggestion.suggested_action === 'append_to_list' && (
  <div className="append-suggestion">
    <div className="flex items-center gap-2 mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
      <span style={{ color: '#22C55E', fontSize: '20px' }}>✓</span>
      <div>
        <div className="font-semibold">Found existing list</div>
        <div className="text-sm opacity-70">"{suggestion.target_entity_name}"</div>
      </div>
    </div>

    <div className="text-sm font-semibold mb-2">Items to add:</div>
    <ul className="list-disc pl-5 mb-3 space-y-1">
      {suggestion.append_items?.map((item, i) => (
        <li key={i} className="text-sm">{item}</li>
      ))}
    </ul>

    <div className="flex gap-2">
      <button
        className="retro-btn retro-btn-primary flex-1"
        onClick={handleAppendToList}
      >
        Append to List
      </button>
      <button
        className="retro-btn retro-btn-secondary flex-1"
        onClick={handleCreateNewList}
      >
        Create New List
      </button>
    </div>
  </div>
)}

{suggestion.suggested_action === 'add_to_project' && (
  <div className="append-suggestion">
    <div className="flex items-center gap-2 mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
      <span style={{ color: '#22C55E', fontSize: '20px' }}>✓</span>
      <div>
        <div className="font-semibold">Found existing project</div>
        <div className="text-sm opacity-70">"{suggestion.target_entity_name}"</div>
      </div>
    </div>

    <div className="text-sm mb-2">
      <strong>New task:</strong> {suggestion.processed_text}
    </div>

    <div className="flex gap-2">
      <button
        className="retro-btn retro-btn-primary flex-1"
        onClick={handleAddToProject}
      >
        Add to Project
      </button>
      <button
        className="retro-btn retro-btn-secondary flex-1"
        onClick={handleCreateNewTask}
      >
        Create Standalone Task
      </button>
    </div>
  </div>
)}
```

**Handler Functions**:
```typescript
const handleAppendToList = async () => {
  try {
    // Call existing append-list endpoint
    const response = await fetch('/api/list-items/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        list_id: suggestion.target_entity_id,
        items: suggestion.append_items?.map(text => ({ text, done: false }))
      })
    })

    if (response.ok) {
      onAccept()  // Clear input, show success
      onItemsUpdate()  // Refresh items list
    } else {
      console.error('Failed to append items')
    }
  } catch (error) {
    console.error('Error appending to list:', error)
  }
}

const handleAddToProject = async () => {
  try {
    // Create task with project_id
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'task',
        text: suggestion.processed_text,
        task: {
          status: suggestion.additional_fields?.status || 'pending',
          priority: suggestion.additional_fields?.priority || 2,
          project_id: suggestion.target_entity_id,
          tags: suggestion.tags || []
        }
      })
    })

    if (response.ok) {
      onAccept()
      onItemsUpdate()
    }
  } catch (error) {
    console.error('Error adding task to project:', error)
  }
}
```

**Create Bulk List Items Endpoint** `/app/api/list-items/bulk/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { list_id, items } = await request.json()

    if (!list_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'list_id and items array required' },
        { status: 400 }
      )
    }

    // Get current max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max_pos FROM list_items WHERE list_id = ?
    `).get(list_id) as any

    const startPos = (maxPos?.max_pos || 0) + 1

    // Insert items
    const insert = db.prepare(`
      INSERT INTO list_items (id, list_id, text, done, position, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    items.forEach((item: { text: string, done: boolean }, index: number) => {
      insert.run(
        uuidv4(),
        list_id,
        item.text,
        item.done ? 1 : 0,
        startPos + index,
        Date.now()
      )
    })

    return NextResponse.json({ success: true, added: items.length })

  } catch (error) {
    console.error('Error adding list items:', error)
    return NextResponse.json({ error: 'Failed to add items' }, { status: 500 })
  }
}
```

**Acceptance Criteria**:
- ✅ Shows "Found existing list" UI
- ✅ Lists items to append
- ✅ User can choose append or create new
- ✅ Append calls bulk endpoint
- ✅ Items successfully added
- ✅ UI clears after success
- ✅ Same flow for projects

---

## Testing Checklist

**Before marking Sprint 2 complete**:

### AI Daily Summary
- [ ] CRON jobs scheduled for preset times (9 AM, 12 PM, 6 PM)
- [ ] Custom time option works
- [ ] Custom time picker updates CRON
- [ ] AI generates contextual summary
- [ ] Test summary button sends notification
- [ ] Summary respects feature flags
- [ ] Logs show CRON attempts

### AI Append
- [ ] "add eggs to grocery list" finds existing list
- [ ] "add milk, bread to shopping" finds list and extracts both items
- [ ] "add task to MyProject" finds project
- [ ] UI shows "Found existing [entity]"
- [ ] User can choose append vs create new
- [ ] Append adds items successfully
- [ ] Create new falls back to normal flow
- [ ] Works for both lists and projects

### Test Buttons
- [ ] Test summary button works
- [ ] Test reminder button works
- [ ] Both show loading states
- [ ] Both show success/error messages
- [ ] Both disabled when features disabled

---

## Success Metrics

**Before**:
- Daily Summary: UI only, doesn't work
- AI append: Doesn't exist
- Test buttons: Only connection test

**After**:
- Daily Summary: CRON working, custom time, test button
- AI append: Fully functional for lists and projects
- Test buttons: All notification types testable

---

## Files Modified Summary

### Daily Summary
- `/lib/scheduler.ts` - Add daily summary CRON
- `/lib/summary-service.ts` - NEW FILE (AI summary generation)
- `/components/modern/settings/NotificationsTab.tsx` - Custom time picker, test button
- `/app/api/summary/test/route.ts` - NEW FILE (test endpoint)
- `/app/api/reminders/test/route.ts` - NEW FILE (test endpoint)
- `/types/index.ts` - Update DailySummaryConfig

### AI Append
- `/app/api/ai/suggest/route.ts` - Add entity search logic
- `/types/index.ts` - Update AISuggestion type
- `/components/ui/AISuggestionPanel.tsx` - Append UI
- `/app/api/list-items/bulk/route.ts` - NEW FILE (bulk add endpoint)

**Total**: ~8 files modified, 3 new files created

---

## Dependencies on Sprint 1

This sprint requires Sprint 1 to be complete because:
1. Daily Summary uses simplified notification structure
2. Test buttons follow pattern from Sprint 1
3. Tag system must be working before adding more AI features

**Do not start Sprint 2 until Sprint 1 is tested and verified working.**

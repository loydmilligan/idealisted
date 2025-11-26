# Simplified Next Sprint: Notifications & AI Improvements

**Date**: 2025-11-24
**Changes**: Removed Daily Review, consolidated redundant features, focused on core functionality

---

## Sprint Goals

1. ✅ Remove redundant Daily Review (keep only AI Daily Summary)
2. ✅ Consolidate task notification systems (remove Event > Task Due Soon)
3. ✅ Implement missing AI features (append to lists/projects)
4. ✅ Fix broken notification systems
5. ✅ Simplify settings UX

---

## Phase 1: Notifications Simplification & Cleanup (3 hours)

### Task 1.1: Remove Daily Review System
**What to delete**:
- `/lib/review.ts` (or archive for reference)
- Daily Review CRON job from `/lib/scheduler.ts`
- Daily Review section from `/components/modern/settings/NotificationsTab.tsx`
- `/app/api/review/route.ts` if it exists

**What to keep**:
- Daily snapshot generation (useful for AI summaries)
- Summary service logic

**Acceptance Criteria**:
- ✅ Daily Review section removed from settings
- ✅ No CRON job trying to send daily reviews
- ✅ No 404 errors from review links
- ✅ Database cleaned up (remove daily_review settings)

---

### Task 1.2: Consolidate Event Notifications
**Current state**: 5 event types (task completed, task due soon, idea captured, idea sorted, entity created)

**Proposed state**: 1 event type (task completed only)

**Changes to `/components/modern/settings/NotificationsTab.tsx`**:
```typescript
// REMOVE these from NotificationEvents interface:
- taskDueSoon      // Redundant with Task Reminders
- ideaCaptured     // Too spammy
- ideaSorted       // Too spammy
- entityCreated    // Too spammy

// KEEP only:
- taskCompleted    // Useful milestone
```

**Changes to `/lib/notify.ts`**:
- Keep `notifyTaskCompleted()` method
- Delete or deprecate other event methods
- Remove event-aware wrappers that check settings

**Acceptance Criteria**:
- ✅ Only "Task completed" toggle in Event Notifications
- ✅ Settings UI shows 1 event instead of 5
- ✅ Task completed notifications work
- ✅ No errors from deleted events

---

### Task 1.3: Rename & Simplify Section Titles
**Changes**:
- "TASK REMINDER PREFERENCES" → "TASK REMINDERS"
- "DAILY SUMMARY PREFERENCES" → "AI DAILY SUMMARY"
- "EVENT NOTIFICATIONS" → "OTHER EVENTS" (or remove entirely)

**Simplify descriptions**:
- Remove verbose explanations
- Keep only essential info

**Acceptance Criteria**:
- ✅ All section titles updated
- ✅ Descriptions are concise
- ✅ UI is cleaner

---

## Phase 2: Add Missing Features to AI Daily Summary (3 hours)

### Task 2.1: Implement Daily Summary CRON Job
**Current state**: No CRON job, feature doesn't work

**Implementation** in `/lib/scheduler.ts`:
```typescript
private initializeDailySummaryCron() {
  // Load config from settings
  const config = loadDailySummaryConfig()

  if (!config.enabled) return

  // Schedule for each configured time
  config.times.forEach(time => {
    const [hour, minute] = time.split(':')
    const cronPattern = `${minute} ${hour} * * *`

    cron.schedule(cronPattern, async () => {
      await this.sendDailySummary()
    })
  })
}

private async sendDailySummary() {
  // 1. Check if AI + notifications enabled
  // 2. Generate AI summary via summaryService
  // 3. Send via ntfyService
  // 4. Log success/failure
}
```

**Acceptance Criteria**:
- ✅ CRON jobs scheduled for each configured time
- ✅ AI summary generated at scheduled times
- ✅ Notifications sent successfully
- ✅ Respects enabled toggles

---

### Task 2.2: Add Custom Time Picker
**File**: `/components/modern/settings/NotificationsTab.tsx`

**UI Changes**:
```tsx
<div className="retro-form-group">
  <label className="retro-form-label">Send summary at:</label>

  {/* Preset times */}
  <label className="retro-checkbox-label">
    <input type="checkbox" ... />
    Morning (9:00 AM)
  </label>
  <label className="retro-checkbox-label">
    <input type="checkbox" ... />
    Midday (12:00 PM)
  </label>
  <label className="retro-checkbox-label">
    <input type="checkbox" ... />
    Evening (6:00 PM)
  </label>

  {/* Custom time */}
  <label className="retro-checkbox-label">
    <input
      type="checkbox"
      checked={dailySummaryConfig.customTimeEnabled}
      onChange={...}
    />
    Custom time
  </label>

  {dailySummaryConfig.customTimeEnabled && (
    <input
      type="time"
      value={dailySummaryConfig.customTime}
      onChange={...}
    />
  )}
</div>
```

**Backend changes**:
- Update `DailySummaryConfig` type to include `customTime?: string`
- CRON scheduler reads custom time from config

**Acceptance Criteria**:
- ✅ User can enable custom time checkbox
- ✅ Time picker appears when enabled
- ✅ Custom time is saved to settings
- ✅ CRON job scheduled for custom time

---

### Task 2.3: Add Test Summary Button
**File**: `/components/modern/settings/NotificationsTab.tsx`

**Implementation**:
```tsx
const handleTestSummary = async () => {
  setTestingSummary(true)
  try {
    const response = await fetch('/api/summary/test', {
      method: 'POST'
    })

    if (response.ok) {
      setMessage('✓ Test summary sent')
    } else {
      const data = await response.json()
      setMessage(`✗ Failed: ${data.error}`)
    }
  } catch (error) {
    setMessage('✗ Connection failed')
  } finally {
    setTestingSummary(false)
  }
}

<button
  className="retro-btn retro-btn-secondary"
  onClick={handleTestSummary}
  disabled={testingSummary || !config.enabled}
>
  {testingSummary ? 'TESTING...' : 'TEST SUMMARY'}
</button>
```

**Backend**: Create `/app/api/summary/test/route.ts`
```typescript
export async function POST() {
  // Generate summary for today
  const summary = await summaryService.generateSummary()

  // Send via ntfy
  await ntfyService.sendNotification(
    'AI Daily Summary (Test)',
    summary
  )

  return NextResponse.json({ success: true })
}
```

**Acceptance Criteria**:
- ✅ Button appears below summary times
- ✅ Clicking sends test notification immediately
- ✅ Shows success/error message
- ✅ Uses real AI summary logic

---

## Phase 3: Fix Broken Event Notifications (2 hours)

### Task 3.1: Debug Why Notifications Don't Fire
**Issue**: None of the event notifications work despite being enabled

**Investigation checklist**:
```bash
# 1. Check if event handlers exist
grep -rn "notifyTaskCompleted\|notifyEntityCreated" app/api

# 2. Check PM2 logs for notification attempts
pm2 logs idealisted | grep -i "notif"

# 3. Check if settings are loaded correctly
# Visit settings UI, enable all events, create entity

# 4. Check ntfy service initialization
# Is ntfyService singleton initialized?
```

**Likely fixes**:
1. **Missing event handlers**: API routes don't call notification methods
2. **Async not awaited**: Event calls happen but don't wait
3. **Feature flags blocking**: Event settings not checked properly

**Files to modify**:
- `/app/api/items/route.ts` - POST handler should call `notifyEntityCreated()`
- `/app/api/items/[id]/route.ts` - PATCH handler should call `notifyTaskCompleted()`

**Example fix**:
```typescript
// In POST /api/items (after creating item)
if (config.enabled) {
  await ntfyService.notifyEntityCreated(
    body.text,
    body.type
  )
}

// In PATCH /api/items/[id] (after marking task complete)
if (item.type === 'task' && body.task?.status === 'completed') {
  await ntfyService.notifyTaskCompleted(item.text)
}
```

**Acceptance Criteria**:
- ✅ Creating entity sends notification
- ✅ Completing task sends notification
- ✅ Event toggles in settings control behavior
- ✅ Notifications respect master ntfy toggle

---

## Phase 4: Fix Task Reminders Not Working (2 hours)

### Task 4.1: Debug Task Reminder CRON
**Issue**: Task reminders enabled but never received any

**Investigation**:
```bash
# Check if CRON job is running
pm2 logs idealisted | grep "Reminder"

# Check if scheduler is initialized
# Should see "[Scheduler] Starting..." in logs

# Check database for tasks with reminders
sqlite3 data/idealisted.db "SELECT * FROM tasks WHERE reminder_datetime IS NOT NULL"

# Check if reminder_datetime is in past or future
```

**Likely issues**:
1. Scheduler not initialized (lib/init.ts not imported in layout.tsx)
2. CRON query filters too strict
3. reminder_datetime stored incorrectly (wrong timezone/format)

**Fixes**:
1. Verify `/lib/init.ts` is imported in `/app/layout.tsx` (was re-enabled in Phase 5.3)
2. Check CRON query in `/lib/scheduler.ts`:
```typescript
// Should check for reminders due NOW or in the past
const tasks = db.prepare(`
  SELECT * FROM tasks
  WHERE reminder_datetime IS NOT NULL
    AND reminder_datetime <= ?  -- Due now or overdue
    AND status != 'completed'
    AND (last_notified_at IS NULL OR last_notified_at < ?) -- Not notified in last hour
`).all(now, now - (60 * 60 * 1000))
```

**Acceptance Criteria**:
- ✅ CRON job runs every minute (see logs)
- ✅ Tasks with reminder_datetime send notifications
- ✅ Priority filter works
- ✅ Quiet hours respected
- ✅ No spam (respects last_notified_at)

---

### Task 4.2: Add Test Reminder Button
**File**: `/components/modern/settings/NotificationsTab.tsx`

**Implementation**:
```tsx
const handleTestReminder = async () => {
  setTestingReminder(true)
  try {
    const response = await fetch('/api/reminders/test', {
      method: 'POST'
    })

    if (response.ok) {
      setMessage('✓ Test reminder sent')
    } else {
      setMessage('✗ Test failed')
    }
  } finally {
    setTestingReminder(false)
  }
}

<button
  className="retro-btn retro-btn-secondary"
  onClick={handleTestReminder}
  disabled={testingReminder || !reminderConfig.enabled}
>
  {testingReminder ? 'TESTING...' : 'TEST REMINDER'}
</button>
```

**Backend**: Create `/app/api/reminders/test/route.ts`
```typescript
export async function POST() {
  await ntfyService.notifyTaskDue(
    'Test task reminder',
    'in 1 hour'
  )
  return NextResponse.json({ success: true })
}
```

**Acceptance Criteria**:
- ✅ Button appears in Task Reminders section
- ✅ Sends test reminder notification
- ✅ Shows success/error message

---

## Phase 5: AI Append to Lists/Projects (4 hours)

### Task 5.1: Enhance AI Suggestion Detection
**File**: `/app/api/ai/suggest/route.ts`

**Current**: Detects "add X to Y list" pattern but creates NEW list
**Goal**: Search for existing list/project and suggest appending

**Implementation**:
```typescript
// After detecting "add X to Y" pattern:

// 1. Search for existing list
const listMatch = db.prepare(`
  SELECT l.id, l.name, i.id as item_id
  FROM lists l
  JOIN items i ON l.item_id = i.id
  WHERE LOWER(l.name) LIKE ?
  LIMIT 1
`).get(`%${listName.toLowerCase()}%`)

if (listMatch) {
  // Found existing list - suggest appending
  return {
    suggested_type: 'list',
    suggested_action: 'append_to_list',
    target_entity_id: listMatch.id,
    target_entity_name: listMatch.name,
    append_items: itemsToAdd,
    confidence: 0.9,
    reasoning: `Found existing list "${listMatch.name}" - will append items`
  }
} else {
  // No match - create new list (existing behavior)
  return {
    suggested_type: 'list',
    suggested_action: 'create_new',
    // ... existing fields
  }
}
```

**Similar logic for projects**:
```typescript
// Detect "add [task description] to [project name]"
const projectMatch = db.prepare(`
  SELECT p.id, i.text as name
  FROM projects p
  JOIN items i ON p.item_id = i.id
  WHERE LOWER(i.text) LIKE ?
  LIMIT 1
`).get(`%${projectName.toLowerCase()}%`)

if (projectMatch) {
  return {
    suggested_type: 'task', // or 'note'
    suggested_action: 'add_to_project',
    target_entity_id: projectMatch.id,
    target_entity_name: projectMatch.name,
    // ... task/note fields
  }
}
```

**Acceptance Criteria**:
- ✅ "add eggs to grocery" finds "Grocery List"
- ✅ "add milk, bread to shopping list" finds existing list
- ✅ "add bug tracking to MyProject" finds project
- ✅ Fuzzy matching works (handles typos/case)
- ✅ Returns new action types in AISuggestion

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
    // ... existing fields
  }

  // NEW FIELDS:
  suggested_action?: 'create_new' | 'append_to_list' | 'add_to_project'
  target_entity_id?: string
  target_entity_name?: string
  append_items?: string[]
}
```

---

### Task 5.3: Handle Append Actions in Frontend
**File**: `/components/ui/AISuggestionPanel.tsx`

**UI for append actions**:
```tsx
{suggestion.suggested_action === 'append_to_list' && (
  <div className="append-suggestion">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-green-600">✓</span>
      <span>Found existing list: "{suggestion.target_entity_name}"</span>
    </div>

    <div className="text-sm mb-2">Add these items:</div>
    <ul className="list-disc pl-4 mb-3">
      {suggestion.append_items?.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>

    <div className="flex gap-2">
      <button
        className="retro-btn retro-btn-primary"
        onClick={() => handleAppendToList()}
      >
        Append to List
      </button>
      <button
        className="retro-btn retro-btn-secondary"
        onClick={() => handleCreateNew()}
      >
        Create New List
      </button>
    </div>
  </div>
)}
```

**Handler functions**:
```typescript
const handleAppendToList = async () => {
  const response = await fetch('/api/ai/append-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      list_id: suggestion.target_entity_id,
      items: suggestion.append_items
    })
  })

  // Show success, refresh items
}
```

**Acceptance Criteria**:
- ✅ Shows "Found existing list" message
- ✅ Lists items to append
- ✅ User can choose append or create new
- ✅ Append calls `/api/ai/append-list`
- ✅ Items are added successfully

---

## Phase 6: Fix AI Tag Suggestions Button (1 hour)

### Task 6.1: Debug Tag Suggestions
**Issue**: "AI suggest tags button is not working"

**Investigation**:
```bash
# Check if button exists
grep -rn "Suggest Tags\|suggest-tags" components/modern/modals

# Check if endpoint works
curl -X POST http://localhost:3000/api/ai/suggest-tags \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy groceries for party", "entity_type": "task"}'

# Check browser console when clicking button
```

**Likely issues**:
1. Button missing from modal UI
2. API endpoint broken
3. Feature flag disabled
4. Frontend not handling response

**Files to check**:
- `/components/modern/modals/TaskModal.tsx`
- `/components/modern/modals/NoteModal.tsx`
- `/app/api/ai/suggest-tags/route.ts`

**Acceptance Criteria**:
- ✅ Button appears in all entity modals
- ✅ Button enabled when AI is enabled
- ✅ Clicking sends request to API
- ✅ Tags are displayed with confidence
- ✅ User can add tags individually or all at once

---

## Testing Checklist

**Before marking sprint complete**:

### Notifications
- [ ] Task completed notification works
- [ ] Daily AI summary sends at configured times
- [ ] Daily AI summary test button works
- [ ] Custom time picker works for summaries
- [ ] Task reminder sends at reminder_datetime
- [ ] Task reminder test button works
- [ ] Priority filter works for reminders
- [ ] Quiet hours respected for reminders

### AI Features
- [ ] "add eggs to grocery list" appends to existing list
- [ ] "add task to MyProject" appends to existing project
- [ ] AI tag suggestions button works in all modals
- [ ] Append UI shows found entity name
- [ ] User can choose append vs create new

### Settings
- [ ] Daily Review section removed
- [ ] Event notifications simplified (task completed only)
- [ ] All test buttons work
- [ ] All settings save/load correctly
- [ ] Section titles updated

---

## Effort Estimate

- **Phase 1**: Simplification (3 hours)
- **Phase 2**: Daily Summary features (3 hours)
- **Phase 3**: Event notifications (2 hours)
- **Phase 4**: Task reminders (2 hours)
- **Phase 5**: AI append (4 hours)
- **Phase 6**: Tag suggestions (1 hour)

**Total**: ~15 hours of focused work

---

## Success Metrics

**Before**:
- 5 notification sections (confusing, redundant)
- Daily Review + Daily Summary (overlapping)
- Event notifications + Task reminders (redundant "task due soon")
- No test buttons
- AI append doesn't work
- Event notifications broken
- Task reminders broken

**After**:
- 3 notification sections (clear purpose)
- Only AI Daily Summary (smarter)
- Single task reminder system (no redundancy)
- Test buttons everywhere
- AI append works perfectly
- All notifications working
- Clean, simple UX

---

## Migration Notes

**Database cleanup**:
```sql
-- Remove daily_review settings
DELETE FROM settings WHERE key = 'daily_review';

-- Remove old event flags (keep taskCompleted)
UPDATE settings
SET value = json_set(value, '$.ideaCaptured', 0, '$.ideaSorted', 0, '$.entityCreated', 0, '$.taskDueSoon', 0)
WHERE key = 'notification_events';
```

**File cleanup**:
- Archive `/lib/review.ts` (don't delete - has useful snapshot logic)
- Delete `/app/api/review/route.ts` if it exists
- Update documentation to reflect simplified notification system

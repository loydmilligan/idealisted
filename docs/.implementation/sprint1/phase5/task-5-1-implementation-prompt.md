# Task 5.1 Implementation Prompt: Add Reminder DateTime UI to Task Modal

## Task: Add Reminder DateTime UI to Task Modal

### Objective
Implement a complete reminder system UI in the task modal that allows users to:
1. Enable/disable reminders via checkbox
2. Select from quick reminder presets (Morning of, 1hr before, 1 day before)
3. Choose custom reminder times
4. See human-readable display of when reminder will trigger

### Context Reference
All necessary context is documented in `/docs/.implementation/phase5/task-5-1-reminder-ui.md` including:
- Current modal implementation patterns
- Database schema (columns already exist)
- TypeScript types (already defined)
- Design system patterns (retro CSS classes)
- API gaps that need fixing

### Changes Required

#### Part 1: Fix API Endpoints (CRITICAL - Must do first)

**File: `/app/api/items/[id]/route.ts`**

1. **Line 14**: Update SELECT query to include reminder fields:
```typescript
SELECT i.*,
       t.id as todo_id, t.done as todo_done, t.due_date, t.priority, t.recurring_rule, t.completed_at,
       task.id as task_id, task.status as task_status, task.priority as task_priority,
       task.tags as task_tags, task.estimated_time, task.project_id, task.due_date as task_due_date,
       task.reminder_datetime, task.last_notified_at,  // ADD THIS LINE
```

2. **Lines 59-69**: Add reminder fields to task object construction:
```typescript
if (row.task_id) {
  item.task = {
    id: row.task_id,
    item_id: row.id,
    status: row.task_status || 'pending',
    priority: row.task_priority || 1,
    tags: row.task_tags ? JSON.parse(row.task_tags) : [],
    estimated_time: row.estimated_time,
    project_id: row.project_id,
    due_date: row.task_due_date,
    reminder_datetime: row.reminder_datetime,  // ADD THIS
    last_notified_at: row.last_notified_at     // ADD THIS
  }
}
```

3. **Lines 240-253**: Update PUT statement to save reminder_datetime:
```typescript
const updateTask = db.prepare(`
  UPDATE tasks
  SET status = ?, priority = ?, tags = ?, estimated_time = ?, project_id = ?, due_date = ?, reminder_datetime = ?
  WHERE item_id = ?
`)
updateTask.run(
  body.task.status || 'pending',
  body.task.priority || 1,
  body.task.tags ? JSON.stringify(body.task.tags) : null,
  body.task.estimated_time || null,
  body.task.project_id || null,
  body.task.due_date || null,
  body.task.reminder_datetime || null,  // ADD THIS
  params.id
)
```

4. **Lines 255-269**: Update INSERT statement (same pattern):
```typescript
insertTask.run(
  `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  params.id,
  body.task.status || 'pending',
  body.task.priority || 1,
  body.task.tags ? JSON.stringify(body.task.tags) : null,
  body.task.estimated_time || null,
  body.task.project_id || null,
  body.task.due_date || null,
  body.task.reminder_datetime || null  // ADD THIS (match column order)
)
```

**File: `/app/api/items/route.ts`**

5. **Lines 204-218**: Add reminder_datetime to POST INSERT:
```typescript
const insertTask = db.prepare(`
  INSERT INTO tasks (id, item_id, status, priority, tags, estimated_time, project_id, due_date, reminder_datetime)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
insertTask.run(
  uuidv4(),
  id,
  body.task.status || 'pending',
  body.task.priority || 1,
  body.task.tags ? JSON.stringify(body.task.tags) : null,
  body.task.estimated_time || null,
  body.task.project_id || null,
  body.task.due_date || null,
  body.task.reminder_datetime || null  // ADD THIS
)
```

#### Part 2: Add Reminder UI to Task Modal

**File: `/app/page.tsx`**

**Insert Location**: After line 758 (after Due Date field), before line 760 (before Estimated Time)

**Code to Insert**:

```tsx
{/* Reminder Section */}
<div className="mb-4">
  <label className="retro-checkbox-label">
    <input
      type="checkbox"
      className="retro-checkbox"
      checked={modalData.reminderEnabled || false}
      onChange={(e) => {
        const enabled = e.target.checked
        setModalData(prev => ({
          ...prev,
          reminderEnabled: enabled,
          // Clear reminder data if unchecking
          ...(!enabled && {
            reminderOption: null,
            reminderDatetime: '',
            reminder_datetime: null
          })
        }))
      }}
      disabled={!modalData.dueDate}
    />
    <span>Set Reminder</span>
  </label>
  {!modalData.dueDate && (
    <p className="text-xs opacity-60 ml-6 -mt-2">Set a due date first</p>
  )}
</div>

{modalData.reminderEnabled && modalData.dueDate && (
  <div className="mb-4 ml-6">
    {/* Quick Options */}
    <div className="flex gap-2 flex-wrap mb-3">
      <button
        type="button"
        className={`retro-btn retro-btn-sm ${modalData.reminderOption === 'morning' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
        onClick={() => {
          const due = new Date(modalData.dueDate + 'T00:00:00')
          due.setHours(9, 0, 0, 0)
          const timestamp = due.getTime()
          setModalData(prev => ({
            ...prev,
            reminderOption: 'morning',
            reminder_datetime: timestamp,
            reminderDatetime: due.toISOString().slice(0, 16)
          }))
        }}
      >
        Morning of
      </button>
      <button
        type="button"
        className={`retro-btn retro-btn-sm ${modalData.reminderOption === '1hr' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
        onClick={() => {
          const due = new Date(modalData.dueDate + 'T00:00:00')
          const remind = new Date(due.getTime() - (60 * 60 * 1000))
          const timestamp = remind.getTime()
          setModalData(prev => ({
            ...prev,
            reminderOption: '1hr',
            reminder_datetime: timestamp,
            reminderDatetime: remind.toISOString().slice(0, 16)
          }))
        }}
      >
        1hr before
      </button>
      <button
        type="button"
        className={`retro-btn retro-btn-sm ${modalData.reminderOption === '1day' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
        onClick={() => {
          const due = new Date(modalData.dueDate + 'T00:00:00')
          const remind = new Date(due.getTime() - (24 * 60 * 60 * 1000))
          remind.setHours(9, 0, 0, 0)
          const timestamp = remind.getTime()
          setModalData(prev => ({
            ...prev,
            reminderOption: '1day',
            reminder_datetime: timestamp,
            reminderDatetime: remind.toISOString().slice(0, 16)
          }))
        }}
      >
        1 day before
      </button>
      <button
        type="button"
        className={`retro-btn retro-btn-sm ${modalData.reminderOption === 'custom' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
        onClick={() => setModalData(prev => ({ ...prev, reminderOption: 'custom' }))}
      >
        Custom
      </button>
    </div>

    {/* Custom Datetime Picker */}
    {modalData.reminderOption === 'custom' && (
      <div className="mb-3">
        <label className="retro-label">Reminder Date & Time</label>
        <input
          type="datetime-local"
          className="retro-input"
          value={modalData.reminderDatetime || ''}
          onChange={(e) => {
            const timestamp = new Date(e.target.value).getTime()
            setModalData(prev => ({
              ...prev,
              reminderDatetime: e.target.value,
              reminder_datetime: timestamp
            }))
          }}
        />
      </div>
    )}

    {/* Display Reminder Info */}
    {modalData.reminder_datetime && (
      <div className="text-xs p-2" style={{
        background: 'var(--retro-screen-light)',
        border: '1px solid var(--retro-border)',
        borderRadius: '4px'
      }}>
        <div className="font-semibold mb-1">⏰ Reminder set for:</div>
        <div>{new Date(modalData.reminder_datetime).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}</div>
        {modalData.reminder_datetime < Date.now() && (
          <div className="text-red-500 mt-1">⚠️ This reminder is in the past</div>
        )}
      </div>
    )}
  </div>
)}
```

#### Part 3: Update Save Handler

**File: `/app/page.tsx`**

**Lines 470-478**: Update task data object to include reminder_datetime:

```typescript
entityData.task = {
  status: data.status || 'pending',
  priority: data.priority ? parseInt(data.priority) : 1,
  tags: modalData.tags || [],
  estimated_time: data.estimatedTime ? parseInt(data.estimatedTime) : null,
  due_date: data.dueDate ? new Date(data.dueDate).getTime() : null,
  project_id: data.project_id || null,
  reminder_datetime: modalData.reminder_datetime || null  // ADD THIS
}
```

### Acceptance Criteria

- ✅ Reminder checkbox appears below Due Date field
- ✅ Checkbox disabled if no due date set, with helper text
- ✅ When checked, quick option buttons appear
- ✅ Each quick option correctly calculates timestamp:
  - Morning of: Due date at 9:00 AM
  - 1hr before: Due date minus 1 hour
  - 1 day before: Day before due date at 9:00 AM
- ✅ Custom option shows datetime-local input
- ✅ Display shows formatted reminder time
- ✅ Past reminder times show warning
- ✅ reminder_datetime saves to database on Save click
- ✅ Reminder data persists when reopening task modal
- ✅ All retro styling classes applied consistently

### Files to Modify

1. `/app/api/items/[id]/route.ts` - GET and PUT endpoints
2. `/app/api/items/route.ts` - POST endpoint
3. `/app/page.tsx` - Task modal UI and save handler

### Edge Cases to Handle

1. **No due date**: Disable checkbox, show helper text
2. **Past reminder time**: Show warning but allow save
3. **Unchecking reminder**: Clear all reminder state
4. **Custom datetime invalid**: Browser validation handles this
5. **Modal close/reopen**: State should persist from API data

### Testing Notes

After implementation:
- Open task modal, set due date
- Check reminder checkbox
- Click each quick option, verify display updates
- Select custom, enter datetime, verify display
- Save task, close modal
- Reopen task, verify reminder data loaded
- Check API response includes reminder_datetime
- Verify database has correct Unix timestamp

---

**Agent Instructions:**
You have ALL the context needed. Do NOT research or gather additional information. Simply:
1. Make the exact code changes specified above
2. Follow existing patterns exactly
3. Use the retro CSS classes as shown
4. Test that build succeeds
5. Report completion with file changes summary

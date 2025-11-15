# Task 5.1: Add Reminder DateTime UI to Task Modal

**Phase**: 5 - Task Reminders
**Status**: In Progress
**Dependencies**: Phase 1 Complete (database schema already has reminder_datetime and last_notified_at columns)

## Objective

Add UI to the task modal allowing users to set when they want to be reminded about a task.

## Requirements

1. **Reminder Checkbox**: Toggle to enable/disable reminder functionality
2. **Quick Options**: Pre-configured reminder times relative to due date
   - Morning of (9:00 AM on due date)
   - 1 hour before due date
   - 1 day before (9:00 AM day before due date)
   - Custom (full datetime picker)
3. **Display**: Show relative time description (e.g., "1 hour before due")
4. **Integration**: Save `reminder_datetime` to tasks table

## Files to Modify

- `/components/modern/EntityModal.tsx` - Add reminder UI to task modal section
- May need to create a reminder component if UI becomes complex

## Success Criteria

- ✅ Checkbox enables/disables reminder picker
- ✅ Quick options calculate datetime correctly relative to due date
- ✅ Custom picker allows any future datetime
- ✅ Relative time displayed clearly to user
- ✅ `reminder_datetime` saved correctly to database

## Implementation Notes

### UI Layout
```
[✓] Set Reminder

  Quick Options:
  [ Morning of ] [ 1hr before ] [ 1 day before ] [ Custom ]

  Reminder: 1 hour before due date (Nov 15, 2:30 PM)
```

### Data Flow
1. User checks "Set Reminder"
2. User selects quick option or custom time
3. Calculate Unix timestamp for reminder_datetime
4. Display human-readable relative time
5. Save to database when task is saved

### Edge Cases
- What if task has no due date? (Disable reminder feature or require due date)
- What if reminder time is in the past? (Show warning or disable)
- Custom time before task creation date? (Allow but show warning)

## Technical Details

**Database field** (already exists from Phase 1):
```sql
reminder_datetime INTEGER  -- Unix timestamp
```

**TypeScript type** (already exists from Phase 1):
```typescript
interface Task {
  reminder_datetime?: number;  // Unix timestamp
}
```

---

## Context Manifest

### How The Task Modal Currently Works

**Entry Point: User Opens Task Modal**

When a user taps on a task (from Files tab) or converts an idea to a task (from Ready/Unsorted), the modal flow begins in `/app/page.tsx`:

1. **Opening the Modal** (Lines 406-418, 391-403):
   - From Files tab: `handleEntityTap()` is called with entity ID
   - From Ready/Unsorted: `handleConvertFromReady()` or `handleConvertFromUnsorted()` is called
   - Both functions fetch the item, populate `modalData` state with existing values, set `modalEntity` state with `{ id?, type }`, and set `modalOpen` to true

2. **Modal Component Structure** (`/components/modern/EntityModal.tsx`):
   - The EntityModal is a retro-styled bottom sheet that slides up from bottom with spring animation (framer-motion)
   - It receives `children` as a render prop pattern - the parent (`app/page.tsx`) defines the form fields inline
   - The modal itself only provides the chrome: overlay, sheet container, header, scrollable content area, and fixed bottom action buttons

3. **Task-Specific Form Fields** (Lines 714-768 in `app/page.tsx`):
   Currently the task modal shows these fields in order:
   - Title (text input via FormField)
   - Description (textarea via FormField)
   - Tags (TagInput component)
   - Status (select dropdown: pending/in-progress/completed)
   - Priority (number input: 1-5)
   - Project (select dropdown with projects list, optional)
   - Due Date (date input, accepts YYYY-MM-DD format)
   - Estimated Time (number input, hours)

4. **Data Flow Pattern**:
   - All field values stored in `modalData` state object (line 59)
   - Each FormField has controlled value from `modalData.{fieldName}`
   - onChange handlers update via `setModalData(prev => ({ ...prev, {field}: value }))`
   - This pattern allows parent component to maintain full control of form state

5. **Save Mechanism** (Lines 458-538):
   When user clicks "SAVE" button:
   - `handleModalSave()` is triggered
   - Fetches current item from state
   - Builds entity-specific data object for task (lines 470-478):
     ```typescript
     entityData.task = {
       status: data.status || 'pending',
       priority: data.priority ? parseInt(data.priority) : 1,
       tags: modalData.tags || [],
       estimated_time: data.estimatedTime ? parseInt(data.estimatedTime) : null,
       due_date: data.dueDate ? new Date(data.dueDate).getTime() : null,
       project_id: data.project_id || null,
     }
     ```
   - Note: `due_date` is converted from date string to Unix timestamp via `new Date().getTime()`
   - Sends PUT request to `/api/items/[id]` with full item + task data
   - On success: refetches items, flashes Files tab, closes modal

### Database Schema and API Integration

**Database Schema** (`/lib/db.ts` lines 178-211):

The tasks table has these columns:
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  tags TEXT,               -- JSON array
  estimated_time INTEGER,
  project_id TEXT,
  due_date INTEGER,
  reminder_datetime INTEGER,    -- ✅ ALREADY EXISTS (added Phase 1)
  last_notified_at INTEGER,     -- ✅ ALREADY EXISTS (added Phase 1)
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
)
```

**Critical Discovery: API Gap**

The database columns exist, but the API routes DO NOT yet handle reminder_datetime:

1. **GET `/api/items/[id]`** (lines 14-15 in route):
   - Query DOES NOT SELECT `task.reminder_datetime` or `task.last_notified_at`
   - Response object construction (lines 59-69) doesn't include these fields
   - **Action Required**: Add fields to SELECT query and response object

2. **PUT `/api/items/[id]`** (lines 240-253):
   - UPDATE statement only handles: status, priority, tags, estimated_time, project_id, due_date
   - **Action Required**: Add `reminder_datetime = ?` to UPDATE statement
   - **Action Required**: Pass `body.task.reminder_datetime || null` in run() params

3. **POST `/api/items`** (lines 203-218):
   - INSERT statement doesn't include reminder_datetime
   - **Action Required**: Add column to INSERT statement

**TypeScript Types** (`/types/index.ts`):

The Task interface (lines 81-92) ALREADY includes:
```typescript
export interface Task {
  id: string
  item_id: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: number
  tags?: string[]
  estimated_time?: number
  project_id?: string
  due_date?: number
  reminder_datetime?: number    // ✅ ALREADY EXISTS
  last_notified_at?: number     // ✅ ALREADY EXISTS
}
```

### Retro Design System Patterns

**Form Field Component** (`/components/modern/EntityModal.tsx` lines 344-405):

The existing `FormField` component supports:
- Types: 'text', 'textarea', 'date', 'number', 'select'
- Props: label, value, onChange, placeholder, options (for select), min/max (for number)
- Styling: Uses `.retro-label`, `.retro-input`, `.retro-textarea` classes

**Retro CSS Classes** (`/styles/retro.css`):

Form styling conventions:
```css
.retro-label {
  font-family: var(--font-mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: block;
  margin-bottom: var(--space-xs); /* 4px */
}

.retro-input, .retro-textarea {
  font-family: var(--font-sans);
  font-size: 15px;
  border: 1px solid;
  /* Inset border effect - pressed into screen */
  border-top-color: var(--palm-border-dark);
  border-left-color: var(--palm-border-dark);
  border-bottom-color: var(--palm-border-light);
  border-right-color: var(--palm-border-light);
  background: var(--palm-screen-dark);
  color: var(--palm-text-dark);
  padding: 8px;
  width: 100%;
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

.retro-checkbox {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}
```

**Button Patterns**:
- Primary buttons: `.retro-btn.retro-btn-primary` (beveled 3D effect)
- Secondary buttons: `.retro-btn.retro-btn-secondary` (flat with border)
- Small variant: `.retro-btn-sm` (for compact UIs)

### Existing Date Input Pattern

**Current Due Date Implementation** (line 752-758 in `app/page.tsx`):

```tsx
<FormField
  label="Due Date"
  value={modalData.dueDate || ''}
  onChange={(value) => setModalData(prev => ({ ...prev, dueDate: value }))}
  type="date"
  entityType={modalEntity.type}
/>
```

- HTML5 date input (`type="date"`) renders native browser datepicker
- Value format: YYYY-MM-DD string
- Conversion to timestamp happens in save handler: `new Date(data.dueDate).getTime()`
- Empty value: empty string `''`

**For datetime-local inputs**:
- Use `type="datetime-local"` on input element
- Format: `YYYY-MM-DDTHH:MM` (ISO 8601 format without timezone)
- Example: "2025-11-15T14:30" for Nov 15, 2025 at 2:30 PM

### Modal Layout Structure

**Scrollable vs Fixed Areas** (`/components/modern/EntityModal.tsx`):

```tsx
<motion.div className="retro-bottom-sheet">
  {/* Sheet Handle */}
  <div className="flex justify-center pt-3 pb-2">...</div>

  {/* Header */}
  <div className="retro-sheet-header">{entityLabel}</div>

  {/* Scrollable Content Area */}
  <div className="px-6 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
    {children}  {/* Form fields go here */}
  </div>

  {/* Fixed Bottom Actions */}
  <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
    {/* AI Autofill button (if enabled) */}
    {/* Tag Suggestions button (if enabled) */}
    {/* SAVE and SAVE & GO TO FILES buttons */}
  </div>
</motion.div>
```

The reminder UI should be added inside the `{children}` section, which in the task modal context means inserting FormField components between lines 714-768 in `app/page.tsx`.

### Technical Implementation Considerations

**Relative Time Calculation**:

For quick options (Morning of, 1hr before, 1 day before):
1. Parse `modalData.dueDate` string to Date object
2. Apply offset:
   - Morning of: Set hours to 9, minutes to 0
   - 1hr before: Subtract 1 hour
   - 1 day before: Subtract 1 day, set to 9:00 AM
3. Convert to Unix timestamp: `date.getTime()`

**Human-Readable Display**:

Show both relative ("1 hour before due") AND absolute time ("Nov 15, 2:30 PM"):
- Use `Intl.DateTimeFormat` for locale-aware date formatting
- Calculate difference from due date for relative description
- Example: "Reminder set for 1 hour before due date (Nov 15, 2025 at 2:30 PM)"

**Edge Case: No Due Date**:

If `modalData.dueDate` is empty:
- Disable reminder checkbox with helper text: "Set a due date first to enable reminders"
- OR: When checking reminder checkbox, require due date to be filled
- Check this on render and disable quick options accordingly

**Edge Case: Past Reminder Times**:

When calculating reminder datetime:
- Check if calculated timestamp < Date.now()
- Show warning badge or text: "⚠️ This reminder is in the past"
- Allow saving (user might be creating historical record) but show clear visual indicator

**State Management**:

Add to `modalData` state:
```typescript
{
  reminderEnabled: boolean,      // Checkbox state
  reminderOption: 'morning' | '1hr' | '1day' | 'custom' | null,
  reminderDatetime: string,      // For custom datetime-local input (YYYY-MM-DDTHH:MM)
  reminder_datetime: number,     // Computed Unix timestamp for API
}
```

### API Update Requirements Summary

**File**: `/app/api/items/[id]/route.ts`

**Line 240-253**: Update the UPDATE statement:
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

**Line 255-269**: Update the INSERT statement similarly

**Line 14-15**: Add to SELECT query:
```sql
task.reminder_datetime, task.last_notified_at
```

**Line 59-69**: Add to response object:
```typescript
item.task = {
  // ... existing fields
  reminder_datetime: row.reminder_datetime,
  last_notified_at: row.last_notified_at
}
```

**File**: `/app/api/items/route.ts`

**Line 204-218**: Add `reminder_datetime` to INSERT statement (both column list and VALUES)

### Component Insertion Point

Add reminder UI in `/app/page.tsx` after the Due Date field (after line 758) and before Estimated Time field (before line 760):

```tsx
{modalEntity.type === 'task' && (
  <>
    {/* ... existing Status, Priority, Project, Due Date fields ... */}

    <FormField
      label="Due Date"
      value={modalData.dueDate || ''}
      onChange={(value) => setModalData(prev => ({ ...prev, dueDate: value }))}
      type="date"
      entityType={modalEntity.type}
    />

    {/* ========== INSERT REMINDER UI HERE ========== */}

    <FormField
      label="Estimated Time (hours)"
      value={modalData.estimatedTime || ''}
      onChange={(value) => setModalData(prev => ({ ...prev, estimatedTime: value }))}
      type="number"
      placeholder="0"
      entityType={modalEntity.type}
    />
  </>
)}
```

---

## Implementation Checklist

### Phase 1: API Updates (Foundation)
- [ ] Update `/app/api/items/[id]/route.ts` GET query to SELECT reminder fields
- [ ] Update `/app/api/items/[id]/route.ts` GET response to include reminder fields
- [ ] Update `/app/api/items/[id]/route.ts` PUT UPDATE statement to save reminder_datetime
- [ ] Update `/app/api/items/route.ts` POST INSERT statement to save reminder_datetime

### Phase 2: UI Components
- [ ] Add reminder checkbox with label "Set Reminder"
- [ ] Add quick option buttons (Morning of, 1hr before, 1 day before, Custom)
- [ ] Add custom datetime-local input (hidden unless "Custom" selected)
- [ ] Add human-readable display text showing calculated reminder time
- [ ] Apply retro styling classes consistently

### Phase 3: State & Logic
- [ ] Add reminder state fields to modalData
- [ ] Implement quick option calculation functions
- [ ] Implement custom datetime handling
- [ ] Add due date validation (disable if no due date)
- [ ] Add past-time warning display
- [ ] Update handleModalSave to include reminder_datetime in API request

### Phase 4: Testing
- [ ] Test each quick option calculates correct timestamp
- [ ] Test custom datetime saves correctly
- [ ] Test checkbox enable/disable flow
- [ ] Test with no due date (should disable)
- [ ] Test with past reminder times (should warn)
- [ ] Test data persists on modal close/reopen

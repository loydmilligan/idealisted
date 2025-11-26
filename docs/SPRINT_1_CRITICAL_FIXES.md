# Sprint 1: Critical Fixes & Notifications Cleanup

**Date**: 2025-11-24
**Priority**: HIGH - Fix broken features and remove redundancy
**Estimated Effort**: 12-15 hours

---

## Overview

This sprint focuses on:
1. Fixing broken notification systems
2. Removing redundant Daily Review
3. Consolidating event notifications
4. Complete tag system overhaul (icons, UI, behavior)

---

## Phase 1: Notifications Simplification & Cleanup (3 hours)

### Task 1.1: Remove Daily Review System
**What to delete**:
- `/lib/review.ts` (archive, don't delete - has snapshot logic we might need)
- Daily Review CRON job from `/lib/scheduler.ts`
- Daily Review section from `/components/modern/settings/NotificationsTab.tsx`
- `/app/api/review` folder if it exists

**Database cleanup**:
```sql
DELETE FROM settings WHERE key = 'daily_review';
```

**Acceptance Criteria**:
- ✅ Daily Review section removed from settings
- ✅ No CRON job trying to send daily reviews
- ✅ No 404 errors from review links (old notifications still work or gracefully fail)
- ✅ Database cleaned up

---

### Task 1.2: Consolidate Event Notifications
**Current**: 5 event types
**Proposed**: 1 event type (task completed only)

**Changes to `/types/index.ts`**:
```typescript
interface NotificationEvents {
  taskCompleted: boolean
  // REMOVE:
  // taskDueSoon: boolean      // Redundant with Task Reminders
  // ideaCaptured: boolean     // Too spammy
  // ideaSorted: boolean       // Too spammy
  // entityCreated: boolean    // Too spammy
}
```

**Changes to `/components/modern/settings/NotificationsTab.tsx`**:
- Remove UI for taskDueSoon, ideaCaptured, ideaSorted, entityCreated
- Keep only taskCompleted toggle
- Rename section from "EVENT NOTIFICATIONS" to "OTHER EVENTS"

**Changes to `/lib/notify.ts`**:
- Keep `notifyTaskCompleted()` method
- Delete or comment out:
  - `notifyIdeaCaptured()`
  - `notifyIdeaSorted()`
  - `notifyEntityCreated()`

**Database migration**:
```typescript
// Update existing settings to remove old events
const currentEvents = JSON.parse(settings.notification_events)
const newEvents = {
  taskCompleted: currentEvents.taskCompleted || false
}
// Save back to database
```

**Acceptance Criteria**:
- ✅ Only "Task completed" toggle visible
- ✅ Settings UI simplified
- ✅ Task completed notifications work
- ✅ No errors from deleted events

---

### Task 1.3: Rename & Simplify Section Titles
**Changes**:
1. "TASK REMINDER PREFERENCES" → "TASK REMINDERS"
2. "DAILY SUMMARY PREFERENCES" → "AI DAILY SUMMARY"
3. "EVENT NOTIFICATIONS" → "OTHER EVENTS"

**Simplify descriptions**:
```typescript
// BEFORE:
"Automatically send notifications for tasks with due dates"

// AFTER:
"Send reminders when tasks are due"
```

**Acceptance Criteria**:
- ✅ All section titles updated
- ✅ Descriptions concise (1 line max)
- ✅ UI cleaner and easier to scan

---

## Phase 2: Fix Broken Event Notifications (3 hours)

### Task 2.1: Debug Why Task Completed Doesn't Fire
**Issue**: Creating/completing tasks doesn't send notifications despite toggle enabled

**Investigation Steps**:
```bash
# 1. Check if handlers exist in API routes
grep -rn "notifyTaskCompleted\|notifyEntityCreated" app/api/items

# 2. Check PM2 logs for notification attempts
pm2 logs idealisted --lines 100 | grep -i "notif"

# 3. Enable all debugging
# Add console.logs to see if code paths are hit
```

**Likely Root Causes**:
1. API routes don't call notification service at all
2. Calls exist but aren't awaited (fire-and-forget that fails silently)
3. Event settings not loaded/checked properly
4. Ntfy service not initialized

**Expected Behavior**:
```typescript
// In /app/api/items/[id]/route.ts PATCH handler
// When task status changes to 'completed':

if (item.type === 'task' && updates.status === 'completed') {
  // Load notification settings
  const ntfySettings = await loadNotificationSettings()

  if (ntfySettings.enabled && ntfySettings.events.taskCompleted) {
    try {
      await ntfyService.notifyTaskCompleted(item.text)
    } catch (error) {
      console.error('Failed to send task completed notification:', error)
      // Don't fail the request, just log
    }
  }
}
```

**Files to Modify**:
- `/app/api/items/[id]/route.ts` - PATCH handler
- Possibly `/app/api/items/route.ts` - POST handler (if we bring back entity created)

**Acceptance Criteria**:
- ✅ Completing task sends notification
- ✅ Toggle in settings controls behavior
- ✅ Respects master ntfy enabled flag
- ✅ Errors logged but don't break API
- ✅ PM2 logs show notification attempts

---

### Task 2.2: Fix Task Reminders Not Working
**Issue**: Task reminders enabled, tasks with reminder_datetime set, but no notifications received

**Investigation Steps**:
```bash
# 1. Check if scheduler is initialized
pm2 logs idealisted | grep -i "scheduler\|cron"

# 2. Check if CRON job runs
pm2 logs idealisted | grep "Reminder"

# 3. Check database
sqlite3 data/idealisted.db "SELECT id, text, reminder_datetime, last_notified_at FROM tasks WHERE reminder_datetime IS NOT NULL"

# 4. Check if lib/init.ts is imported
grep -n "lib/init" app/layout.tsx
```

**Likely Root Causes**:
1. Scheduler not initialized (lib/init.ts not imported in layout.tsx)
2. CRON query filters too strict
3. reminder_datetime stored in wrong timezone
4. Notifications sent but ntfy config wrong

**Expected CRON Logic** in `/lib/scheduler.ts`:
```typescript
private initializeTaskReminderCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[Reminder] Checking for due task reminders...')

    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)

    // Find tasks due for reminder
    const tasks = db.prepare(`
      SELECT t.id, i.text, t.reminder_datetime, t.priority
      FROM tasks t
      JOIN items i ON t.item_id = i.id
      WHERE t.reminder_datetime IS NOT NULL
        AND t.reminder_datetime <= ?           -- Due now or overdue
        AND t.status != 'completed'            -- Not completed
        AND (t.last_notified_at IS NULL        -- Never notified
             OR t.last_notified_at < ?)        -- Or not notified in last hour
    `).all(now, oneHourAgo) as any[]

    console.log(`[Reminder] Found ${tasks.length} tasks due for notification`)

    // Send notifications
    for (const task of tasks) {
      // Check priority filter
      if (!reminderConfig.priorityFilter.includes(task.priority)) {
        continue
      }

      // Check quiet hours
      if (isQuietHours(reminderConfig.quietHours)) {
        continue
      }

      // Send notification
      const dueTime = format(new Date(task.reminder_datetime), 'h:mm a')
      await ntfyService.notifyTaskDue(task.text, dueTime)

      // Update last_notified_at
      db.prepare(`
        UPDATE tasks SET last_notified_at = ? WHERE id = ?
      `).run(now, task.id)
    }
  })
}
```

**Files to Modify**:
- `/lib/scheduler.ts` - Fix CRON query and logging
- `/lib/init.ts` - Ensure exported and called
- `/app/layout.tsx` - Ensure lib/init imported (should already be there)

**Acceptance Criteria**:
- ✅ CRON job runs every minute (see in logs)
- ✅ Tasks with reminder_datetime send notifications
- ✅ Priority filter works
- ✅ Quiet hours respected
- ✅ No spam (last_notified_at prevents duplicates)
- ✅ PM2 logs show "[Reminder] Checking..." every minute

---

## Phase 3: Complete Tag System Overhaul (6 hours)

### Task 3.1: Fix AI Tag Suggestions Button
**Issue**: Button not working in entity modals

**Investigation**:
```bash
# Check if button exists
grep -rn "Suggest Tags" components/modern/modals

# Check if API endpoint works
curl -X POST http://localhost:3000/api/ai/suggest-tags \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy groceries", "entity_type": "task"}'
```

**Expected Button Location**:
- `/components/modern/modals/TaskModal.tsx`
- `/components/modern/modals/NoteModal.tsx`
- `/components/modern/modals/ProjectModal.tsx`
- `/components/modern/modals/ListModal.tsx`

**Expected Button Behavior**:
```tsx
<button
  className="retro-btn retro-btn-secondary retro-btn-sm"
  onClick={handleAISuggestTags}
  disabled={!aiEnabled || !tagSuggestionsEnabled || isLoading}
>
  🏷️ Suggest Tags
</button>
```

**Handler**:
```typescript
const handleAISuggestTags = async () => {
  setLoadingSuggestions(true)
  try {
    const response = await fetch('/api/ai/suggest-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: formData.text,
        entity_type: 'task' // or note/project/list
      })
    })

    const data = await response.json()

    if (data.success && data.suggestions) {
      setTagSuggestions(data.suggestions)
      setShowSuggestions(true)
    }
  } catch (error) {
    console.error('Failed to get tag suggestions:', error)
  } finally {
    setLoadingSuggestions(false)
  }
}
```

**Acceptance Criteria**:
- ✅ Button appears in all 4 entity modals
- ✅ Button disabled when AI disabled
- ✅ Clicking sends request to /api/ai/suggest-tags
- ✅ Suggestions displayed with confidence scores
- ✅ User can add individual tags or accept all

---

### Task 3.2: Fix Enter Key in Tag Input (Mobile)
**Issue**: Pressing Enter in tag input moves to next field instead of creating tag

**File**: Find tag input component (likely in entity modals or shared component)

**Current Behavior**:
```tsx
<input
  type="text"
  value={newTag}
  onChange={(e) => setNewTag(e.target.value)}
  // Missing onKeyDown handler
/>
```

**Fixed Behavior**:
```tsx
<input
  type="text"
  value={newTag}
  onChange={(e) => setNewTag(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      e.preventDefault()  // Prevent form submission
      handleAddTag()      // Add the tag
    }
  }}
/>
```

**Acceptance Criteria**:
- ✅ Pressing Enter in tag input adds tag
- ✅ Doesn't move to next field
- ✅ Works on mobile and desktop
- ✅ Works in all entity modals

---

### Task 3.3: Design New Tag Icon System
**Requirements**:
- Avoid entity colors (blue, orange, green, purple)
- Use red, grey, yellow (various shades)
- 10 shapes: square, circle, hexagon, star, heart, diamond, spade, club, ring, trapezoid
- 10 textures: spotted, lined, dotted, striped, checkered, crosshatch, wavy, grid, zigzag, concentric
- Each tag gets unique combo (never reused)
- Shapes correlate with tag types (work=spade, health=heart, personal=star, finance=diamond, other=circle)
- Icons appear on background shapes (also variable)

**Color Palette Design**:
```typescript
// Reds (warm, not entity colors)
const TAG_REDS = [
  '#DC2626', // red-600
  '#B91C1C', // red-700
  '#991B1B', // red-800
  '#EF4444', // red-500
  '#F87171', // red-400
]

// Greys (neutral)
const TAG_GREYS = [
  '#6B7280', // gray-500
  '#4B5563', // gray-600
  '#374151', // gray-700
  '#9CA3AF', // gray-400
  '#D1D5DB', // gray-300
]

// Yellows/Golds (warm, distinct from entity colors)
const TAG_YELLOWS = [
  '#F59E0B', // amber-500
  '#D97706', // amber-600
  '#B45309', // amber-700
  '#FCD34D', // amber-300
  '#FBBF24', // amber-400
]

const ALL_TAG_COLORS = [...TAG_REDS, ...TAG_GREYS, ...TAG_YELLOWS]
```

**Shape Mapping**:
```typescript
const TAG_TYPE_SHAPES: Record<string, string> = {
  'work': 'spade',       // ♠ Professional
  'personal': 'star',    // ⭐ Personal goals
  'health': 'heart',     // ♥ Health/wellness
  'finance': 'diamond',  // ♦ Money matters
  'other': 'circle',     // ● General/default
}

const ALL_SHAPES = [
  'square', 'circle', 'hexagon', 'star', 'heart',
  'diamond', 'spade', 'club', 'ring', 'trapezoid'
]
```

**Texture Patterns**:
```typescript
const TEXTURES = [
  'solid',        // No pattern (default)
  'spotted',      // Random dots
  'lined',        // Horizontal lines
  'dotted',       // Dotted grid
  'striped',      // Diagonal stripes
  'checkered',    // Checkerboard
  'crosshatch',   // Cross-hatched lines
  'wavy',         // Wavy lines
  'grid',         // Grid pattern
  'zigzag',       // Zigzag pattern
]
```

**Tag Icon Data Structure**:
```typescript
interface TagIcon {
  foregroundColor: string    // From TAG_COLORS
  backgroundColor: string    // Lighter shade or complementary
  shape: string             // From ALL_SHAPES (default from category)
  texture: string           // From TEXTURES
  backgroundShape: string   // square | circle | hexagon
}
```

**Icon Generation Logic**:
```typescript
function generateTagIcon(tagName: string, category: string): TagIcon {
  // Check if tag already has icon (load from database)
  const existing = loadTagIcon(tagName)
  if (existing) return existing

  // Generate new unique icon
  const usedCombos = loadUsedIconCombos()

  let combo: TagIcon
  let attempts = 0

  do {
    combo = {
      foregroundColor: randomChoice(ALL_TAG_COLORS),
      backgroundColor: lightenColor(randomChoice(ALL_TAG_COLORS), 0.8),
      shape: TAG_TYPE_SHAPES[category] || randomChoice(ALL_SHAPES),
      texture: randomChoice(TEXTURES),
      backgroundShape: randomChoice(['square', 'circle', 'hexagon'])
    }
    attempts++
  } while (isComboUsed(combo, usedCombos) && attempts < 100)

  // Save to database
  saveTagIcon(tagName, combo)

  return combo
}
```

**Acceptance Criteria**:
- ✅ Colors avoid blue/orange/green/purple
- ✅ Each tag gets unique combo
- ✅ Tag type determines default shape (work=spade, health=heart, etc.)
- ✅ Icon stored in database with tag
- ✅ Icons visually distinct from entity colors

---

### Task 3.4: Implement Tag Icon Rendering
**File**: Create `/components/ui/TagIcon.tsx`

**SVG Icon Component**:
```tsx
interface TagIconProps {
  icon: TagIcon
  size?: number
}

export const TagIcon: React.FC<TagIconProps> = ({ icon, size = 20 }) => {
  const renderShape = () => {
    switch (icon.shape) {
      case 'circle':
        return <circle cx="50" cy="50" r="40" />
      case 'square':
        return <rect x="10" y="10" width="80" height="80" />
      case 'hexagon':
        return <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" />
      case 'star':
        return <polygon points="50,5 61,35 93,35 67,57 79,91 50,70 21,91 33,57 7,35 39,35" />
      case 'heart':
        return <path d="M50,85 C20,65 5,45 5,30 C5,15 15,5 28,5 C38,5 45,10 50,20 C55,10 62,5 72,5 C85,5 95,15 95,30 C95,45 80,65 50,85 Z" />
      case 'diamond':
        return <polygon points="50,5 90,50 50,95 10,50" />
      case 'spade':
        return <path d="M50,5 C30,25 10,35 10,50 C10,65 20,75 35,75 L30,90 L70,90 L65,75 C80,75 90,65 90,50 C90,35 70,25 50,5 Z" />
      // Add other shapes...
      default:
        return <circle cx="50" cy="50" r="40" />
    }
  }

  const renderTexture = () => {
    switch (icon.texture) {
      case 'spotted':
        return (
          <pattern id={`spotted-${icon.foregroundColor}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.2)" />
            <circle cx="7" cy="7" r="1" fill="rgba(0,0,0,0.2)" />
          </pattern>
        )
      case 'lined':
        return (
          <pattern id={`lined-${icon.foregroundColor}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
          </pattern>
        )
      case 'striped':
        return (
          <pattern id={`striped-${icon.foregroundColor}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
          </pattern>
        )
      // Add other textures...
      default:
        return null
    }
  }

  const backgroundPath = icon.backgroundShape === 'circle'
    ? <circle cx="50" cy="50" r="48" />
    : icon.backgroundShape === 'hexagon'
    ? <polygon points="50,2 95,27 95,73 50,98 5,73 5,27" />
    : <rect x="2" y="2" width="96" height="96" rx="4" />

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: 'inline-block' }}
    >
      <defs>
        {renderTexture()}
      </defs>

      {/* Background shape */}
      <g fill={icon.backgroundColor}>
        {backgroundPath}
      </g>

      {/* Foreground shape with texture */}
      <g fill={icon.texture === 'solid' ? icon.foregroundColor : `url(#${icon.texture}-${icon.foregroundColor})`}>
        {renderShape()}
      </g>
    </svg>
  )
}
```

**Usage**:
```tsx
<div className="flex items-center gap-2">
  <TagIcon icon={tag.icon} size={16} />
  <span>{tag.name}</span>
</div>
```

**Acceptance Criteria**:
- ✅ All 10 shapes render correctly
- ✅ All 10 textures work
- ✅ Colors distinct from entity colors
- ✅ Background shapes work
- ✅ SVG scales properly

---

### Task 3.5: Update Tag Database Schema
**Add columns to `tags` table**:
```sql
ALTER TABLE tags ADD COLUMN icon_foreground_color TEXT;
ALTER TABLE tags ADD COLUMN icon_background_color TEXT;
ALTER TABLE tags ADD COLUMN icon_shape TEXT;
ALTER TABLE tags ADD COLUMN icon_texture TEXT;
ALTER TABLE tags ADD COLUMN icon_background_shape TEXT;
```

**Migration Script**:
```typescript
// Generate icons for existing tags
const tags = db.prepare('SELECT name, category FROM tags').all()

for (const tag of tags) {
  const icon = generateTagIcon(tag.name, tag.category)

  db.prepare(`
    UPDATE tags
    SET icon_foreground_color = ?,
        icon_background_color = ?,
        icon_shape = ?,
        icon_texture = ?,
        icon_background_shape = ?
    WHERE name = ?
  `).run(
    icon.foregroundColor,
    icon.backgroundColor,
    icon.shape,
    icon.texture,
    icon.backgroundShape,
    tag.name
  )
}
```

**Acceptance Criteria**:
- ✅ Database schema updated
- ✅ Existing tags migrated with icons
- ✅ New tags get icons on creation
- ✅ Icons persist across sessions

---

### Task 3.6: Fix Tag Creation/Edit UI
**Issue**: Text input too skinny, can't see what you're typing

**File**: `/components/modern/settings/TagsTab.tsx`

**Current Problem**:
```tsx
<input
  type="text"
  className="retro-input retro-tag-input"  // Too narrow
  value={newTagName}
  onChange={...}
/>
```

**Fix**:
```css
/* In retro.css or component styles */
.retro-tag-input {
  width: 100%;           /* Full width */
  min-width: 200px;      /* Ensure minimum width */
  font-size: 14px;       /* Readable size */
  padding: 8px 12px;     /* Comfortable padding */
}

.retro-tag-form {
  display: flex;
  flex-direction: column;
  gap: 12px;             /* Space between fields */
  margin-bottom: 16px;
}

.retro-tag-edit-form {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--retro-primary);
  border-radius: 4px;
  background: var(--palm-bg-secondary);
}
```

**Layout Fix**:
```tsx
<div className="retro-tag-form">
  {/* Tag name input - full width */}
  <div className="retro-form-group">
    <label className="retro-form-label">Tag Name</label>
    <input
      type="text"
      className="retro-input"
      style={{ width: '100%' }}
      value={newTagName}
      onChange={...}
      placeholder="Enter tag name"
    />
  </div>

  {/* Category selector */}
  <div className="retro-form-group">
    <label className="retro-form-label">Category</label>
    <select
      className="retro-select"
      style={{ width: '100%' }}
      value={newTagCategory}
      onChange={...}
    >
      {TAG_CATEGORIES.map(...)}
    </select>
  </div>

  {/* Color picker removed - auto-generated */}

  {/* Action buttons */}
  <div className="flex gap-2">
    <button className="retro-btn retro-btn-primary" onClick={handleSave}>
      Save
    </button>
    <button className="retro-btn retro-btn-secondary" onClick={handleCancel}>
      Cancel
    </button>
  </div>
</div>
```

**Acceptance Criteria**:
- ✅ Tag name input is full width
- ✅ Text clearly visible while typing
- ✅ Category selector full width
- ✅ Color picker removed (icons auto-generated)
- ✅ Layout clean and easy to use
- ✅ Works on mobile and desktop

---

## Testing Checklist

**Before marking Sprint 1 complete**:

### Notifications
- [ ] Daily Review section removed from settings
- [ ] Only "Task completed" event notification visible
- [ ] Section titles simplified
- [ ] Task completed notification works
- [ ] Task reminder CRON runs every minute (check logs)
- [ ] Tasks with reminder_datetime send notifications
- [ ] Priority filter works
- [ ] Quiet hours respected

### Tags
- [ ] AI suggest tags button appears in all modals
- [ ] Clicking button fetches suggestions
- [ ] Tags display with icons
- [ ] Enter key creates tag in modal
- [ ] Tag icons avoid entity colors (blue/orange/green/purple)
- [ ] Each tag has unique icon combo
- [ ] Tag type determines shape (work=spade, health=heart, etc.)
- [ ] Tag creation UI is full width and readable
- [ ] Tag edit UI works properly

---

## Success Metrics

**Notifications**:
- 5 sections → 3 sections (40% reduction)
- 5 event types → 1 event type (80% reduction)
- All notifications working (currently 0% → 100%)

**Tags**:
- AI suggestions working (0% → 100%)
- Enter key works (0% → 100%)
- Unique icon system (new feature)
- UI readable (broken → fixed)

---

## Files Modified Summary

### Notifications
- `/components/modern/settings/NotificationsTab.tsx` - Remove sections, rename titles
- `/lib/scheduler.ts` - Remove daily review CRON, fix task reminder CRON
- `/lib/notify.ts` - Remove unused event methods
- `/types/index.ts` - Update NotificationEvents interface
- `/app/api/items/[id]/route.ts` - Add task completed notification

### Tags
- `/components/ui/TagIcon.tsx` - NEW FILE (SVG icon component)
- `/lib/tag-icons.ts` - NEW FILE (icon generation logic)
- `/components/modern/settings/TagsTab.tsx` - Fix UI layout, remove color picker
- `/components/modern/modals/TaskModal.tsx` - Fix AI suggest button, Enter key
- `/components/modern/modals/NoteModal.tsx` - Fix AI suggest button, Enter key
- `/components/modern/modals/ProjectModal.tsx` - Fix AI suggest button, Enter key
- `/components/modern/modals/ListModal.tsx` - Fix AI suggest button, Enter key
- `/lib/db.ts` - Add tag icon columns, migration
- `/styles/retro.css` - Fix tag form styles

**Total**: ~15 files modified, 2 new files created

---

## Migration Steps

1. **Database Backup**: `cp data/idealisted.db data/idealisted.db.backup-$(date +%Y%m%d)`
2. **Run Tag Icon Migration**: Generate icons for existing tags
3. **Update Settings**: Remove daily_review, clean notification_events
4. **Test Notifications**: Create task, complete it, verify notification
5. **Test Tags**: Create tag, verify icon, verify UI
6. **PM2 Restart**: `pm2 restart idealisted`
7. **Monitor Logs**: `pm2 logs idealisted --lines 100`

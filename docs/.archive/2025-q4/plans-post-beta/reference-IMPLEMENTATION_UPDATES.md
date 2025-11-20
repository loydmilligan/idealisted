# Implementation Plan Updates - User Feedback

**Date**: 2025-01-14
**Source**: User feedback on FOCUSED_IMPLEMENTATION_PLAN.md

---

## Update 1: AI Feature Toggles with Explanations

### Requirement
Each AI feature should have its own toggle in settings with detailed explanation of what it does.

### Settings UI Design

**Settings > AI Tab:**

```
┌─────────────────────────────────────────────────────────────┐
│ AI SETTINGS                                                  │
│                                                              │
│ Master Toggle:                                               │
│ ☑ Enable AI features                                        │
│                                                              │
│ OpenRouter API Key: [••••••••••••••] [Test Connection]      │
│ Model: [anthropic/claude-3-haiku] (Free)                    │
│                                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ INDIVIDUAL FEATURES                                          │
│                                                              │
│ ☑ AI Suggestion Panel                                       │
│   When you click the AI button, show a preview of what      │
│   the AI thinks your idea is (task, note, project, etc.)    │
│   with confidence score and extracted metadata before        │
│   creating the item. You can accept, override, or dismiss.  │
│                                                              │
│ ☑ AI Tag Suggestions                                        │
│   Get AI-powered tag suggestions when creating or editing   │
│   entities. AI analyzes your content and suggests 3-5       │
│   relevant tags, prioritizing tags you already use.         │
│   Click individual tags to add, or "Accept All" button.     │
│                                                              │
│ ☐ AI Daily Summary                                          │
│   Include an AI-generated summary in your daily review      │
│   notification. AI analyzes your day's activity and         │
│   highlights achievements, patterns, and insights.          │
│   (Requires notifications enabled)                          │
│                                                              │
│ ☐ Smart Quick Add                                           │
│   Parse natural language when capturing ideas. Extract      │
│   due dates ("tomorrow"), times ("at 2pm"), priorities      │
│   ("important"), and tags ("#work") automatically.          │
│   Example: "Buy milk tomorrow #shopping" → Task with        │
│   due date and tag pre-filled.                              │
│                                                              │
│ ☐ AI Entity Recommendations                                 │
│   Get suggestions when entities might work better as a      │
│   different type. Example: Task with 5+ subtasks → "This    │
│   might work better as a Project". One-click conversion.    │
│                                                              │
│ [Save Settings]                                              │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Update ai_config structure to support feature toggles
CREATE TABLE ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  requires_master_toggle BOOLEAN DEFAULT true
);

-- Default features
INSERT INTO ai_feature_settings VALUES
  ('suggestion_panel', true, 'Preview AI analysis before creating items', true),
  ('tag_suggestions', true, 'AI-powered tag recommendations', true),
  ('daily_summary', false, 'AI summary in daily review notifications', true),
  ('smart_quick_add', false, 'Natural language parsing for quick capture', true),
  ('entity_recommendations', false, 'Suggest entity type conversions', true);
```

### Implementation Files

**Modify:**
- `components/modern/settings/AISettingsTab.tsx`:
  - Add feature toggle checkboxes with explanations
  - Add help icons with tooltips for each feature
  - Save/load individual feature states

**Create:**
- `lib/ai-feature-flags.ts`:
  ```typescript
  export async function isAIFeatureEnabled(featureName: string): Promise<boolean> {
    const masterEnabled = await isAIMasterEnabled()
    if (!masterEnabled) return false

    const featureEnabled = await getFeatureSetting(featureName)
    return featureEnabled
  }
  ```

**Update API checks:**
- Before using AI features, check both master toggle AND feature-specific toggle
- Example in `/api/ai/suggest`:
  ```typescript
  if (!await isAIFeatureEnabled('suggestion_panel')) {
    return NextResponse.json({ error: 'AI suggestions disabled' }, { status: 403 })
  }
  ```

---

## Update 2: Default Tags & Existing Tag Reuse

### Requirement
1. Add default starter tags that users can delete
2. AI should prioritize existing tags when suggesting
3. Prompt: 3-5 tags total, 1-3 should come from existing pool (unless confidence < threshold)

### Default Tags to Include

**Suggested Starter Tags (20 tags):**

**Work & Productivity:**
- #work
- #urgent
- #meeting
- #deadline
- #project

**Personal:**
- #home
- #health
- #finance
- #shopping
- #family

**Learning & Development:**
- #learning
- #reading
- #idea
- #research

**Categories:**
- #bug
- #feature
- #design
- #writing
- #planning
- #review

### Database Schema

```sql
-- Track all tags used in the system
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  tag_name TEXT UNIQUE NOT NULL, -- e.g., "work" (without #)
  usage_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);

-- Create index for fast lookups
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX idx_tags_name ON tags(tag_name);

-- Seed default tags
INSERT INTO tags (id, tag_name, is_default, created_at) VALUES
  (uuid(), 'work', true, unixepoch()),
  (uuid(), 'urgent', true, unixepoch()),
  (uuid(), 'meeting', true, unixepoch()),
  -- ... all default tags
```

### AI Tag Suggestion Logic

**Enhanced Prompt:**
```
You are a tag suggestion assistant for a task management app.

TASK: Suggest 3-5 relevant tags for the following {entityType}:
Title: "{title}"
Content: "{content}"
Entity Type: {entityType}

EXISTING TAGS IN SYSTEM:
{existingTagsList} (sorted by usage frequency)

RULES:
1. Suggest 3-5 tags total
2. TRY to include 1-3 tags from the EXISTING TAGS list above
3. Only use existing tags if confidence is >= 70%
4. If no existing tags fit well (confidence < 70%), suggest new tags
5. New tags should be:
   - Single words or short phrases
   - Lowercase
   - Relevant to content and entity type
   - Not duplicates of existing tags

OUTPUT FORMAT (JSON):
{
  "tags": [
    {
      "tag": "work",
      "source": "existing",
      "confidence": 95,
      "reason": "Content mentions office and project tasks"
    },
    {
      "tag": "planning",
      "source": "new",
      "confidence": 88,
      "reason": "Text describes strategic planning activities"
    }
  ]
}

Return ONLY valid JSON, no additional text.
```

### Tag Suggestion UI

**Entity Modal - Tag Section:**

```
┌─────────────────────────────────────────────────────────────┐
│ Tags: [#work] [#urgent] [x]                                 │
│                                                              │
│ [🤖 Suggest Tags]                                           │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ AI Suggestions:                           [Accept All]   ││
│ │                                                          ││
│ │ [+ #planning 95%] [+ #project 88%] [+ #deadline 75%]   ││
│ │ [+ #writing 65%] [+ #research 60%]                      ││
│ │                                                          ││
│ │ Existing: ●  New: ○                                      ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Interaction:**
- Click individual tag chip → Adds to tag list above
- Click "Accept All" → Adds all suggested tags at once
- Existing tags shown with filled circle (●)
- New tags shown with empty circle (○)
- Grayed out if already added
- Confidence % shown subtly (smaller text)

### Implementation

**Step 1: Default Tag Seeding**
- File: `lib/db.ts` - Add default tags on initialization
- Migration script to populate `tags` table

**Step 2: Tag Usage Tracking**
- When tag is added to any entity:
  ```typescript
  await incrementTagUsage(tagName)
  // Updates usage_count and last_used_at
  ```

**Step 3: Get Existing Tags for AI**
- File: `lib/ai-tag-suggester.ts`:
  ```typescript
  async function getExistingTagsForAI(limit = 50): Promise<string[]> {
    return db.prepare(`
      SELECT tag_name FROM tags
      ORDER BY usage_count DESC, last_used_at DESC
      LIMIT ?
    `).all(limit).map(row => row.tag_name)
  }
  ```

**Step 4: Enhanced API Endpoint**
- File: `app/api/ai/suggest-tags/route.ts`:
  - Fetch top 50 existing tags by usage
  - Include in prompt
  - Parse response and separate existing vs new
  - Return with source indicator

**Step 5: Settings UI for Tag Management**
- Add "Tag Management" section in Settings
- Show all tags with usage counts
- Allow deleting tags (including defaults)
- Warning before deleting frequently-used tags

**Files to Create/Modify:**
- Modify: `lib/db.ts` (add tags table, seed defaults)
- Create: `lib/tag-manager.ts` (tag operations)
- Modify: `lib/ai-tag-suggester.ts` (enhanced prompting)
- Modify: `app/api/ai/suggest-tags/route.ts` (existing tag logic)
- Modify: `components/modern/EntityModal.tsx` (improved tag UI)
- Create: `components/modern/settings/TagManagementTab.tsx`

---

## Update 3: Task Reminder Time Schema

### Current State
- Tasks have: `due_date` (DATE only) + `duration` (minutes)
- No time-of-day for reminders

### Requirement
Add ability to set reminder time for notifications.

### Schema Options Analysis

#### Option A: Add `due_time` to tasks
```sql
ALTER TABLE tasks ADD COLUMN due_time TEXT; -- "14:30" or "02:00 PM"
```
**Pros:**
- Simple: Due date + due time = complete datetime
- Intuitive for users: "Task is due at 2:30 PM"
- Works well for tasks with specific deadlines

**Cons:**
- Forces all tasks to have a time (even if not needed)
- Mixing date-only and datetime tasks is awkward
- "Due time" might be different from "when to remind me"

#### Option B: Add `reminder_datetime`
```sql
ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER; -- Unix timestamp
```
**Pros:**
- Separate concept: "Task due vs when to remind me"
- Flexible: Can remind before actual due time
- Optional: Not all tasks need reminders
- Works for date-only tasks (remind morning of due date)

**Cons:**
- More complex: User picks both due date AND reminder time
- Might confuse users: "What's the difference?"

#### Option C: Add both `due_time` AND `reminder_datetime`
```sql
ALTER TABLE tasks ADD COLUMN due_time TEXT;
ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER;
```
**Pros:**
- Maximum flexibility
- Due time = actual deadline, reminder = notification time
- Can remind 1 hour before due time automatically

**Cons:**
- Most complex UX
- Overkill for MVP

### Recommendation: **Option B** (reminder_datetime)

**Reasoning:**
1. Clearer purpose: "When should I remind you?"
2. Works for both date-only and specific-time tasks
3. More flexible (can remind day before, hour before, etc.)
4. Simpler UX: One optional datetime picker

### Updated Schema

```sql
-- Add to tasks table
ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER; -- Unix timestamp, nullable

-- Add to items metadata (for other entity types)
-- metadata JSON can include: { reminder_datetime: 1234567890 }
```

### UI Design

**Task Modal - Reminder Section:**

```
┌─────────────────────────────────────────────────────────────┐
│ Due Date: [Jan 15, 2025 ▼]                                  │
│                                                              │
│ Duration: [30] minutes                                       │
│                                                              │
│ ☑ Set reminder                                              │
│   [Jan 15, 2025 ▼] at [02:00 PM ▼]                         │
│   (1 hour before due date)                                   │
│                                                              │
│   Quick options:                                             │
│   [Morning of] [1 hour before] [1 day before] [Custom]      │
└─────────────────────────────────────────────────────────────┘
```

**Quick Option Logic:**
- **Morning of**: Due date at 9:00 AM
- **1 hour before**: Due date minus 1 hour (default if due_time exists)
- **1 day before**: Due date minus 24 hours at 9:00 AM
- **Custom**: Full datetime picker

### CRON Job Logic

```typescript
async function checkTaskReminders() {
  const now = Date.now()
  const reminderWindow = 15 * 60 * 1000 // 15 minutes

  const tasks = db.prepare(`
    SELECT * FROM tasks
    WHERE reminder_datetime IS NOT NULL
    AND reminder_datetime > ?
    AND reminder_datetime < ?
    AND status != 'done'
    AND last_notified_at IS NULL
  `).all(now, now + reminderWindow)

  for (const task of tasks) {
    await ntfyService.notifyTaskDue(task)
    markTaskNotified(task.id)
  }
}
```

### Settings UI

**Notifications > Task Reminders:**

```
☑ Enable task reminders

Default reminder time:
○ Morning of due date (9:00 AM)
○ 1 hour before due date
○ 1 day before due date
● Custom for each task

Quiet hours: [22:00] to [08:00]
```

### Migration Strategy

1. Add `reminder_datetime` column (nullable)
2. For existing tasks with due_date:
   - Don't set reminder_datetime automatically
   - User can edit task to add reminder
3. For new tasks:
   - Show reminder checkbox (unchecked by default)
   - If user wants reminders, they enable it

### Implementation Files

**Database:**
- `lib/db.ts`: Add column to tasks table

**UI:**
- `components/modern/EntityModal.tsx`:
  - Add reminder datetime picker
  - Add quick option buttons
  - Show relative time ("1 hour before")

**API:**
- `app/api/items/[id]/route.ts`:
  - Accept `reminder_datetime` in update payload
  - Validate datetime format

**CRON:**
- `lib/scheduler.ts`:
  - Update `checkTaskReminders()` to query `reminder_datetime`

**Notifications:**
- `lib/notify.ts`:
  - Update `notifyTaskDue()` to handle reminder time format

---

## Update 4: Wizard AI Explanation

### Requirement
Add a step in the onboarding wizard explaining AI suggestions.

### New Tour Step

**Insert after "Buttons" step (Step 2):**

```
Tour Steps:
1. Capture Screen (textarea)
2. Buttons (Unsorted/AI)
3. ✨ AI Suggestions (NEW) ← Insert here
4. Unsorted Tab
5. Ready Tab
6. Files Tab
7. Settings
8. Complete
```

### Step 3: AI Suggestions

**Spotlight**: AI button (with pulse animation)

**Tooltip Content:**

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Step 3: AI-Powered Suggestions                           │
│                                                              │
│ Click the AI button to get smart suggestions!               │
│                                                              │
│ AI will:                                                     │
│ • Analyze your idea                                         │
│ • Suggest what it is (task, note, project, etc.)           │
│ • Extract tags, due dates, and priorities                   │
│ • Give you a confidence score                               │
│                                                              │
│ You can:                                                     │
│ ✓ Accept the suggestion                                     │
│ ✓ Change to a different type                                │
│ ✓ Dismiss and sort manually                                 │
│                                                              │
│ Example:                                                     │
│ "Buy milk tomorrow" →                                       │
│   AI: Task, Due: Tomorrow, Tag: #shopping                   │
│                                                              │
│ 💡 Tip: Enable AI in Settings first!                        │
│                                                              │
│                          [← Back]  [Next →]                 │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- File: `lib/tour-steps.tsx`:
  - Add new step object at position 3
  - Update step numbers for subsequent steps
  - Add conditional check: Skip if AI disabled

**Conditional Logic:**
```typescript
// Skip AI step if master toggle is off
if (!isAIEnabled && currentStep === 3) {
  nextStep() // Skip to step 4
}
```

### Settings Tour Integration

**Settings Step (now Step 7):**

Update tooltip to mention AI:

```
💡 Step 7: Customize Everything

• Enable AI features (requires API key)
• Set up notifications
• Choose your theme
• Manage tags

Make IdeaListed yours!

[← Back]  [Next →]
```

---

## Summary of Changes

### 1. AI Settings Updates
✅ Feature-specific toggles with detailed explanations
✅ Master toggle + individual feature flags
✅ Database schema for feature settings
✅ API checks for both master and feature toggles

### 2. Tag System Enhancements
✅ 20 default starter tags (deletable)
✅ Tag usage tracking in database
✅ AI prioritizes existing tags (1-3 from pool if confidence >= 70%)
✅ UI: "Accept All" + individual click-to-add
✅ Visual indicator for existing vs new tags (● vs ○)
✅ Tag management in settings

### 3. Task Reminder Time
✅ Add `reminder_datetime` column (Option B)
✅ Optional per-task reminder setting
✅ Quick options: Morning of, 1 hour before, 1 day before, Custom
✅ CRON checks reminder_datetime for notifications
✅ Quiet hours support

### 4. Wizard Enhancement
✅ New Step 3: AI Suggestions explanation
✅ Shows example of AI analysis
✅ Conditional skip if AI disabled
✅ Updated Settings step to mention AI

---

## Updated Implementation Timeline

**Week 1: AI Suggestion Flow + Settings**
- Day 1-2: Feature toggles in settings UI
- Day 3-4: AI suggestion flow with feature flag checks
- Day 5: Testing

**Week 2: Tags + Reminders Foundation**
- Day 1-2: Default tags system + usage tracking
- Day 3-4: Enhanced AI tag suggestions with existing tag reuse
- Day 5: Task reminder_datetime schema + UI

**Week 3: Notifications + Summary**
- Day 1-2: Task reminder CRON with reminder_datetime
- Day 3-4: Scheduled summary implementation
- Day 5-7: Testing notifications

**Week 4: Onboarding + Polish**
- Day 1-3: Onboarding wizard with AI explanation step
- Day 4-5: End-to-end testing
- Day 6-7: Bug fixes and documentation

---

## Next Implementation Step

**Ready to begin Week 1 with:**
1. ✅ AI feature toggles in settings (with explanations)
2. ✅ Default tags seeding
3. ✅ Task reminder_datetime schema design

**Shall we start coding?** I can begin with:
- Database migrations (tags table + reminder_datetime)
- Updated AISettingsTab component
- Default tag seeding script

Let me know if you want any other adjustments before we start implementation!

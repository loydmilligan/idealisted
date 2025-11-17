# AI and Notification Features - Implementation Plan

**Sprint**: Post-Beta AI & NTFY Integration
**Started**: 2025-01-14
**Status**: Phase 1 Complete ✅, Phase 2 Complete ✅, Phase 3 Complete ✅, Phase 4 Complete ✅, Phase 5 Tasks 5.1 ✅ and 5.3 ✅ Complete, Phase 6 Complete ✅ (Tasks 6.2 ✅ and 6.3 ✅)

---

## Overview

This sprint implements AI-powered features and notification capabilities for IdeaListed. The implementation is divided into 7 phases, building from database foundation through to user onboarding.

**Key Decisions** (see Reference Documents below):
- AI disabled by default (user's top priority) ✅
- Only 3 user-facing AI features (removed Smart Quick Add, Entity Recommendations)
- 25 default starter tags across 4 categories
- Task reminders use `reminder_datetime` (not `due_time`)
- No timeline estimates (user directive - focus on priority/order only)

---

## Reference Documents

**Decision History** (in same directory, prefixed with `reference-`):
- `reference-FOCUSED_IMPLEMENTATION_PLAN.md` - Original detailed feature designs (2025-01-14)
- `reference-IMPLEMENTATION_UPDATES.md` - User feedback and requirements (2025-01-14)
- `reference-IMPLEMENTATION_UPDATES_V2.md` - Final scope refinement (2025-01-14)

**Current Working Documents**:
- `AI_AND_NTFY_PLAN.md` - THIS FILE (high-level phase overview)
- `AI_AND_NTFY_TASKS.md` - Detailed task breakdown for all phases

---

## Phase 1: Database Foundation ✅ COMPLETE

**Status**: Completed 2025-01-14
**Commit**: eac26fe

**Purpose**: Establish database schema for tags, task reminders, and AI feature settings.

**What Was Built**:
- Tags table with usage tracking (usage_count, is_default, last_used_at)
- Seeded 25 default starter tags
- Tasks table: Added reminder_datetime and last_notified_at columns
- Created ai_feature_settings table
- Seeded 3 AI features (suggestion_panel, tag_suggestions, daily_summary)
- TypeScript type definitions (Tag, AIFeatureSetting, Task updates)

**Database Tables Created/Modified**:
- `tags` - Tag management with usage tracking
- `tasks` - Added reminder columns
- `ai_feature_settings` - Individual feature toggles
- Updated TypeScript interfaces in `types/index.ts`

**Verification**:
- ✅ 25 default tags seeded
- ✅ 3 AI feature settings seeded
- ✅ TypeScript compilation successful
- ✅ Idempotent migrations confirmed

---

## Phase 2: AI Settings UI ✅ COMPLETE

**Status**: Completed 2025-11-14
**Commit**: c015cd6
**Dependencies**: Phase 1 complete ✅

**Purpose**: Build UI for AI feature management and wire up feature flag checking.

**What Was Built**:
1. **AI Feature Settings API** - REST endpoints for managing ai_feature_settings
2. **AISettingsTab Enhancement** - Add feature toggles with descriptions to Settings UI
3. **Feature Flag Logic** - Wire feature checks into AIService and components
4. **Test Connection Enhancement** - Show feature status in test results

**Components Modified**:
- `components/modern/settings/AISettingsTab.tsx` - Add feature toggle UI
- `lib/ai.ts` - Add isFeatureEnabled() method
- `components/ui/AISuggestionPanel.tsx` - Feature flag gating
- `components/modern/EntityModal.tsx` - Tag suggestions gating

**API Endpoints Created**:
- `GET /api/ai-features` - Fetch all feature settings
- `PUT /api/ai-features` - Update feature(s)

**Success Criteria**:
- Users can toggle individual AI features in Settings
- Master AI toggle disables all features
- Feature descriptions clearly explain what each does
- Backend respects feature flags

**Verification**:
- ✅ All 4 tasks complete (2.1, 2.2, 2.3, 2.4)
- ✅ 36/36 success criteria met (100%)
- ✅ Code review passed with no blocking issues
- ✅ TypeScript compilation successful
- ✅ Defense-in-depth feature flag architecture

---

## Phase 3: AI Suggestion Flow ✅ COMPLETE

**Status**: Completed 2025-11-15
**Commit**: [To be created on phase completion]
**Dependencies**: Phase 2 complete ✅

**Purpose**: Implement preview-first AI suggestion workflow in capture screen.

**What Was Built (Task 3.1)**:
- ✅ Modified capture flow with preview-first pattern
- ✅ Input validation (empty text check before API call)
- ✅ Better error handling (graceful fallback instead of browser alerts)
- ✅ Metadata transformation with validation (date strings → timestamps)
- ✅ Field validation (priority 1-5, status enum, positive estimated_time)
- ✅ Removed redundant /api/tags/usage endpoint call

**What Was Built (Task 3.2)**:
- ✅ Enhanced AISuggestionPanel with visual improvements
- ✅ Confidence bar visualization (color-coded: green/amber/red)
- ✅ Better formatting for additional fields (icons, labels, alignment)
- ✅ Entity type button icons (✓, 📝, 📁, 📋)
- ✅ Empty state handling for tags ("No tags suggested")
- ✅ Fixed 2 code review warnings (CSS class, date parsing)

**What Was Built (Task 3.3)**:
- ✅ Refined Accept/Override/Dismiss logic with UX enhancements
- ✅ Error handling with user feedback (alert dialog on failure)
- ✅ Success feedback (console log + tab flash animation)
- ✅ Button disabled state during API call (prevents duplicate submissions)
- ✅ Enhanced UX: Suggestion panel stays open on error for retry
- ✅ Tag usage tracking integrated (automatic via POST /api/items)

**What Was Built (Task 3.4)**:
- ✅ All entity buttons (Task, Note, Project, List) disabled during AI analysis AND item creation
- ✅ Unsorted and AI buttons disabled with visual feedback (⏳ icon during analysis)
- ✅ Error messages displayed in-UI with red styling and warning icon (replaced browser alerts)
- ✅ Improved loading state with animation and descriptive messaging
- ✅ Error state management with automatic clearing on success

**User Experience**:
1. User types idea and clicks "AI" button
2. Loading state appears ("Analyzing with AI..." + animate-pulse)
3. All buttons disabled during analysis (⏳ icon on AI button)
4. Suggestion panel shows: confidence, type, reasoning, extracted metadata
5. User can accept, change type, or dismiss
6. Item created with AI-extracted metadata (all buttons remain disabled during creation)
7. Success feedback via tab flash animation, or error displayed in-UI with retry option

**Key Features**:
- Preview-first (no more auto-creating items before AI review) ✅
- Coordinated button states across analysis AND creation phases ✅
- In-UI error messaging with automatic clearing ✅

**Verification**:
- ✅ All 4 tasks complete (3.1, 3.2, 3.3, 3.4)
- ✅ All success criteria met
- ✅ TypeScript compilation successful
- ✅ Build passes without errors

---

## Phase 4: AI Tag Suggestions ✅ COMPLETE

**Status**: Completed 2025-11-15
**Commit**: [To be created on phase completion]
**Dependencies**: Phase 2 complete (feature flags) ✅, Phase 1 complete (tags table) ✅

**Purpose**: AI-powered tag suggestions that prioritize existing tags.

**What Was Built**:
1. **AI Tag Suggestion API** - `/api/ai/suggest-tags` endpoint with feature flag protection
2. **Existing Tag Reuse Logic** - Fetches top 50 tags, prioritizes reuse (confidence >= 70%)
3. **EntityModal Tag UI** - "Suggest Tags" button with loading states and visual indicators
4. **Tag Usage Tracking** - `updateTagUsage()` helper with atomic database operations

**Components Modified**:
- `app/api/ai/suggest-tags/route.ts` (NEW - 182 lines)
- `components/modern/EntityModal.tsx` - Added tag suggestion UI
- `lib/db.ts` - Added `updateTagUsage()` function (lines 391-436)
- `app/api/items/route.ts` - Integrated tag tracking
- `app/api/items/[id]/route.ts` - Integrated tag tracking

**AI Prompt Strategy**:
- Request 3-5 tags total
- Include top 50 existing tags by usage in prompt
- Prioritize existing tags when confidence >= 70%
- Return with source indicator (existing vs new)
- Filter displayed suggestions: confidence >= 60%

**UI Features**:
- Button-triggered (🏷️ Suggest Tags)
- Shows confidence scores and usage counts
- Visual indicator for existing (●) vs new (○) tags
- One-click add individual or "Accept All"
- Loading state during analysis
- Gated by AI master toggle + tag_suggestions feature flag

**Code Review Improvements**:
- Input validation and sanitization for tag names
- Transaction wrapper for atomic database operations
- EntityType parameter validation (task, note, project, list)
- Empty/whitespace text handling
- Performance optimization (Map instead of Array.find)
- Better error messages with specific HTTP status codes
- JSDoc documentation for updateTagUsage()

**Success Criteria**:
- Users can request AI tag suggestions in entity modals
- System prioritizes reusing existing tags over creating new ones
- Tags ranked by existing/new status and confidence
- Usage tracking updates automatically on tag add/remove
- All operations atomic and validated

**Verification**:
- ✅ All 4 tasks complete (4.1, 4.2, 4.3, 4.4)
- ✅ Code review passed with comprehensive improvements
- ✅ Feature flag protection working
- ✅ Tag usage tracking integrated in all item operations
- ✅ UI gated by master AI toggle + feature flag

---

## Phase 5: Task Reminders

**Status**: In Progress (Tasks 5.1 ✅, 5.3 ✅ Complete)
**Dependencies**: Phase 1 complete (reminder_datetime column) ✅

**Purpose**: NTFY-based task due reminders with configurable timing.

**What Was Built (Task 5.1)**:
- ✅ Task modal reminder datetime picker with checkbox
- ✅ Quick reminder presets: Morning of (9 AM), 1hr before (4 PM), 1 day before (9 AM)
- ✅ Custom datetime picker option
- ✅ Human-readable display with past-time warning
- ✅ API integration for saving/loading reminder_datetime
- ✅ UX improvement: Checkbox disabled without due date

**What Was Built (Task 5.3)**:
- ✅ CRON job runs every minute (better UX than 15-minute interval)
- ✅ Extended SchedulerService with checkAndNotifyReminders() method
- ✅ Query filters: reminder_datetime <= now, status != completed, 1-hour notification cooldown
- ✅ Sends notifications via ntfyService.notifyTaskDue(taskText, dueTime)
- ✅ Updates last_notified_at timestamp after successful notification
- ✅ Database index on tasks.reminder_datetime for performance
- ✅ Global variables for HMR compatibility
- ✅ Comprehensive logging (start, count, success, failure, completion)
- ✅ Re-enabled scheduler in app/layout.tsx

**What Will Be Built (Remaining Tasks)**:
- Settings UI for reminder preferences - Task 5.4 (optional)

**Notification Format** (Implemented):
- Title: "⏰ Task Due Soon"
- Message: "{taskText}" is due at {dueTime}
- Actions: Mark Complete (URL callback), Snooze (clear notification)
- Priority: urgent

**Configuration Options** (Future Enhancements):
- Default reminder timing
- Priority filtering (high/medium/low)
- Quiet hours (22:00 - 08:00)

**Implementation Notes**:
- Task 5.2 (Quick Reminder Options) was implemented as part of Task 5.1, as the quick options are integral to the datetime picker UI
- Task 5.3 CRON implementation uses existing ntfyService.notifyTaskDue() method (no changes to lib/notify.ts needed)
- Action button handlers (Mark Complete, Snooze) are placeholders for future implementation

---

## Phase 6: Scheduled Summary

**Status**: Phase 6 Complete ✅ (Tasks 6.2 ✅ and 6.3 ✅)
**Dependencies**: Phase 1 complete (ai_feature_settings with daily_summary)

**Purpose**: Periodic digest notifications of user activity.

**What Was Built (Task 6.2)**:
- ✅ Extended SchedulerService with daily summary CRON job
- ✅ CRON runs every minute, checks time matching (09:00, 12:00, 18:00)
- ✅ Hour-based deduplication using daily_summaries table
- ✅ Feature flag check (ai_feature_settings.daily_summary)
- ✅ NTFY configuration validation
- ✅ Calls generateDailySummary() from lib/summary.ts
- ✅ Skips sending if no activity (hasActivity flag)
- ✅ Sends notification via ntfyService.sendNotification()
- ✅ Records summaries in daily_summaries table
- ✅ Global variables for HMR compatibility (__daily_summary_cron_task, __daily_summary_is_running)
- ✅ Fixed stop() method to stop all three CRON tasks
- ✅ Bug fix: Changed database query from feature_id to feature_name (line 271)

**What Was Built (Task 6.3)**:
- ✅ Enhanced notification format with three improvements:
  1. **Time-of-Day Label**: Dynamic title based on hour (Morning/Midday/Evening Summary)
  2. **Dynamic Priority**: Set to 'high' if tasks are due today, otherwise 'default'
  3. **Contextual Action Buttons**: Up to 2 buttons based on summary content:
     - "View Tasks" button if tasks due today or soon
     - "View Inbox" button if ideas were captured or unconverted ideas exist
- ✅ Mobile-friendly UI (max 2 buttons to avoid clutter)
- ✅ Variable name collision fix (used `hourOfDay` to avoid conflict with `currentHour`)
- ✅ Follows existing NTFY notification patterns
- ✅ Code review: 10/10 score with greenlight
- ✅ Implementation location: lib/scheduler.ts lines 346-396

**What Will Be Built (Remaining Tasks)**:
- Settings UI for summary preferences - Task 6.4 (optional)

**Summary Includes**:
- Ideas captured today
- Ideas converted today
- Tasks completed today
- Tasks due today
- Optional: AI-generated insights (future enhancement)

**Smart Logic** (Implemented):
- Don't send if no activity ✅
- Hour-based deduplication (allows 9am, 12pm, 6pm summaries) ✅
- Respects AI feature flags and NTFY settings ✅

---

## Context Manifest for Task 6.3: NTFY Summary Notification Format

### What This Task Is About

Task 6.2 successfully implemented the daily summary CRON job that generates summaries and sends them via NTFY notifications. However, the current notification format is **basic** - it uses a simple title ("📊 Daily Summary") and passes the formatted message with **no action buttons**, **default priority**, and **default tags**.

Task 6.3's purpose is to **review and enhance** the notification format to make it more **actionable** and **user-friendly** on mobile devices. This means considering:
1. Whether to add action buttons (e.g., "View Inbox", "Start Planning")
2. Whether to adjust the notification priority based on urgency (e.g., tasks due today = higher priority)
3. Whether to customize NTFY tags/icons for better visual identity
4. Whether the message format itself is optimal for mobile readability

**Important Context**: Task 6.2 already sends summaries successfully. This task is about **polish and UX enhancement**, not fixing broken functionality.

---

### How The Current Notification System Works

**The NTFY Protocol** (`lib/notify.ts`):

IdeaListed uses ntfy.sh for push notifications. The NTFY protocol is **HTTP-based** and uses **headers for metadata**, with the **message body as plain text**. Understanding this architecture is critical for Task 6.3.

The `sendNotification()` method (lines 65-125 in `lib/notify.ts`) is the core notification dispatcher:

```typescript
async sendNotification(
  title: string,
  message: string,
  actions?: Array<{
    action: string
    label: string
    url?: string
    clear?: boolean
  }>,
  priority: NtfyConfig['priority'] = 'default'
)
```

**How it works step-by-step**:

1. **Configuration Loading** (line 77): Calls `await this.loadConfig()` which queries the `settings` table for `key='ntfy_config'` and parses the JSON. The config includes:
   - `enabled` (boolean) - master toggle
   - `server` (string) - NTFY server URL (e.g., "https://ntfy.sh")
   - `topic` (string) - channel name for notifications
   - `username/password` (optional) - for authenticated topics
   - `priority` (enum) - default priority level

2. **Enabled Check** (lines 80-82): Returns `{ success: false, error: 'Ntfy notifications disabled' }` if not enabled. This is a defensive pattern used throughout.

3. **Header Preparation** (lines 86-94): NTFY uses HTTP headers for all metadata:
   - `Title`: Notification title (sanitized, max 100 chars)
   - `Priority`: One of 'default', 'low', 'high', 'urgent' (affects sound/vibration on mobile)
   - `Tags`: Comma-separated emoji/icon identifiers (e.g., 'brain,lightbulb')
   - `Actions`: JSON array of action button definitions (if provided)

4. **Header Sanitization** (lines 86-88): The `sanitizeHeader()` helper removes newlines and limits length because HTTP headers can't contain newlines. This is important for message formatting.

5. **Basic Authentication** (lines 102-105): If username/password are configured, adds `Authorization: Basic {base64}` header.

6. **HTTP POST Request** (lines 111-115): Sends to `{server}/{topic}` with:
   - Method: POST
   - Headers: All metadata (title, priority, tags, actions)
   - Body: Plain text message (sanitized to remove excessive newlines)

7. **Response Handling** (line 117): Returns `{ success: true, id: response.data.id }` or `{ success: false, error: message }` on failure.

**Action Buttons Pattern**:

The `actions` parameter is an array of objects with this structure:
```typescript
{
  action: string,     // Action type ('view', 'http', 'broadcast', etc.)
  label: string,      // Button text shown to user
  url?: string,       // URL to open (for 'view' action)
  clear?: boolean     // Whether to dismiss notification after action
}
```

Looking at existing implementations:

**Task Reminders** (`notifyTaskDue()` at lines 174-193):
```typescript
[
  {
    action: 'complete',
    label: 'Mark Complete',
    url: `${baseURL}/api/todos/complete`,
    clear: true
  },
  {
    action: 'snooze',
    label: 'Snooze',
    clear: true
  }
]
```

**Daily Review** (`checkAndSendDailyReview()` in scheduler.ts at lines 151-157):
```typescript
[
  {
    action: 'view',
    label: 'View Review',
    url: `${baseURL}/review/${reviewData.date}`
  }
]
```

**Priority Levels**:
- `'urgent'` - Used for task reminders (line 191 in notify.ts)
- `'high'` - Used for AI suggestions (line 155)
- `'default'` - Used for daily review (line 158) and daily summaries (line 351 in scheduler.ts)
- `'low'` - Used for idea capture notifications (line 206)

**Priority affects**:
- Notification sound/vibration intensity on mobile
- Visual prominence in notification drawer
- Delivery priority (urgent may bypass quiet hours)

**Tags Pattern** (line 93 in notify.ts):

All notifications currently use `'brain,lightbulb'` as the tag string. NTFY interprets these as emoji icons:
- `brain` → 🧠 icon
- `lightbulb` → 💡 icon

Other available tags include: `calendar`, `clock`, `chart`, `warning`, `checkmark`, etc. (see NTFY docs for full list)

**Current Daily Summary Notification** (scheduler.ts lines 347-352):

```typescript
const notificationResult = await ntfyService.sendNotification(
  '📊 Daily Summary',      // Title
  message,                  // Formatted message from formatSummaryMessage()
  [],                       // NO action buttons
  'default'                 // Default priority
)
```

This is the **minimal implementation**. Task 6.3 is about deciding if this needs enhancement.

---

### How The Summary Message Formatting Works

**Summary Generation Service** (`lib/summary.ts`):

The `formatSummaryMessage()` function (lines 107-151) takes a `DailySummaryData` object and returns a **multi-line plain text string** optimized for NTFY display.

**Input Structure** (`DailySummaryData` interface, lines 3-11):
```typescript
{
  date: string               // YYYY-MM-DD format
  ideasCaptured: number      // Count from today
  ideasConverted: number     // Ideas sorted today
  tasksCompleted: number     // Tasks marked done today
  tasksDueToday: number      // Tasks due today (not completed)
  tasksDueSoon: number       // Tasks due in next 3 days
  hasActivity: boolean       // True if any of first 4 metrics > 0
}
```

**Output Format** (example with actual data):

```
📊 Daily Summary for Friday, Jan 17

✨ Today's Activity:
  💡 3 ideas captured
  ✅ 2 ideas converted
  🎯 5 tasks completed

⏰ Upcoming:
  📅 1 task due today
  🔜 4 tasks due in next 3 days
```

**Formatting Logic Breakdown**:

1. **No Activity Case** (lines 108-110): Returns single-line message "No activity today. Time to capture some ideas!" - BUT this should never be sent because the scheduler skips sending when `hasActivity` is false (scheduler.ts lines 338-341).

2. **Header Line** (line 115): Uses `formatDate()` helper (lines 158-169) to convert YYYY-MM-DD to human-readable format like "Friday, Jan 17". Uses UTC to avoid timezone issues.

3. **Activity Section** (lines 119-135):
   - Only shown if ANY activity metric > 0
   - Section header: "✨ Today's Activity:"
   - Each metric on its own line with 2-space indent
   - Emoji prefix for visual hierarchy (💡 for ideas, ✅ for converted, 🎯 for completed)
   - Proper pluralization (e.g., "1 idea" vs "2 ideas")
   - Blank line after section

4. **Upcoming Section** (lines 138-147):
   - Only shown if tasks due today OR tasks due soon > 0
   - Section header: "⏰ Upcoming:"
   - Same formatting pattern as activity section
   - 📅 emoji for "due today"
   - 🔜 emoji for "due soon"

5. **Message Assembly** (lines 112, 150): Uses `lines.join('\n')` to create multi-line string.

**Message Sanitization** (notify.ts lines 108-109):

Before sending, the NTFY service sanitizes the message body:
```typescript
const sanitizedMessage = message.replace(/\n{3,}/g, '\n\n').trim()
```

This collapses 3+ consecutive newlines to 2, preventing excessive whitespace that could make mobile notifications look broken.

**Mobile Readability Considerations**:

The current format is designed for mobile with:
- **Short lines**: No line exceeds ~40 characters
- **Visual hierarchy**: Emoji prefixes make sections scannable
- **Whitespace**: Blank lines separate sections
- **Conciseness**: No verbose text, just metrics

**Potential Issues**:

1. **No context switching**: User reads the summary but has no quick action to act on it (no buttons)
2. **Generic title**: "📊 Daily Summary" doesn't indicate urgency (e.g., if tasks due today)
3. **Time ambiguity**: Title doesn't show which summary time this is (9am, 12pm, or 6pm)
4. **No priority differentiation**: All summaries use 'default' priority even if tasks are urgent

---

### How The Scheduler Sends Summaries

**CRON Job Implementation** (`lib/scheduler.ts` lines 271-370):

The `checkAndSendDailySummary()` method runs **every minute** (cron schedule `'* * * * *'`). Here's the complete flow:

1. **Mutex Lock** (lines 273, 276): Checks `global.__daily_summary_is_running` to prevent concurrent executions. This is critical because the job runs every 60 seconds but could take longer than 60s to complete.

2. **Feature Flag Check** (lines 279-285): Queries `ai_feature_settings` table for `feature_name='daily_summary'` and checks if `enabled=1`. If disabled, returns silently (no log spam).

3. **NTFY Configuration Check** (lines 287-298): Loads `ntfy_config` from settings and verifies `enabled=true`. Returns silently if disabled.

4. **Time Matching** (lines 300-309):
   - Gets current time in HH:mm format using `date-fns` `format()` function
   - Checks if current time matches one of the hardcoded summary times: `['09:00', '12:00', '18:00']`
   - Returns if not a summary time
   - **Why run every minute instead of scheduling at specific times?** More reliable, handles server restarts better, and simpler logic

5. **Deduplication Check** (lines 311-329):
   - Gets current hour (0-23) from Date object
   - Queries `daily_summaries` table for most recent summary sent today (created_at >= start of day)
   - If found, checks if it was sent in the same hour as current time
   - Returns if already sent at this hour
   - **Why hour-based instead of time-based?** Allows multiple summaries per day (9am, 12pm, 6pm) while preventing duplicates at each time slot

6. **Summary Generation** (lines 332-335):
   - Dynamic import: `await import('./summary')` (lazy loading, only when needed)
   - Calls `generateDailySummary()` with no arguments (defaults to today)
   - Returns `DailySummaryData` object with metrics

7. **Activity Check** (lines 338-341):
   - Checks `summary.hasActivity` boolean
   - Returns with log message if false: "[Scheduler] No activity today - skipping summary"
   - **Critical UX decision**: Don't spam users with "no activity" notifications

8. **Message Formatting** (line 344):
   - Calls `formatSummaryMessage(summary)`
   - Returns multi-line plain text string

9. **Notification Sending** (lines 347-352):
   - Calls `ntfyService.sendNotification()` with:
     - Title: `'📊 Daily Summary'` (hardcoded)
     - Message: formatted message
     - Actions: `[]` (empty array - **THIS IS WHAT TASK 6.3 ADDRESSES**)
     - Priority: `'default'` (hardcoded - **TASK 6.3 COULD MAKE THIS DYNAMIC**)

10. **Success Recording** (lines 354-359):
    - If notification succeeds, inserts record into `daily_summaries` table:
      - `date`: YYYY-MM-DD string from summary
      - `data`: JSON.stringify(summary) - full summary object for future reference
      - `created_at`: Date.now() - timestamp in milliseconds
    - Logs success: "[Scheduler] Daily summary sent successfully"

11. **Error Handling** (lines 362-363, 365-369):
    - If notification fails, logs error but doesn't throw
    - Outer try/catch handles unexpected errors
    - `finally` block always releases mutex lock

**Database Table** (from sqlite3 output):

```sql
CREATE TABLE daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX idx_daily_summaries_created_at ON daily_summaries(created_at);
```

The `data` column stores the full `DailySummaryData` JSON for:
- Future UI display of summary history (not yet implemented)
- Debugging why a summary was sent
- Analytics (not yet implemented)

**Comparison With Task Reminder Notifications** (for consistency):

Task reminders (`notifyTaskDue()` at notify.ts lines 174-193):
- **Title**: "⏰ Task Due Soon" (emoji + urgency indication)
- **Message**: `"{taskText}" is due at {dueTime}` (quoted text + specific time)
- **Actions**: 2 buttons (Mark Complete, Snooze)
- **Priority**: `'urgent'` (highest level)

Daily summaries currently:
- **Title**: "📊 Daily Summary" (emoji but no urgency/time indication)
- **Message**: Multi-line formatted metrics
- **Actions**: None (empty array)
- **Priority**: `'default'` (medium level)

**Key Difference**: Task reminders are **actionable** (you can mark complete from notification), while summaries are **informational** (just read and dismiss).

---

### What Task 6.3 Should Consider

**The Core Question**: Does the current notification format meet user needs, or should it be enhanced?

**Option 1: Keep Current Format (Minimal)**

Arguments for minimal approach:
- Summary is **informational**, not actionable (unlike task reminders which need "Mark Complete")
- Users will naturally open the app to act on tasks/ideas, not from notification
- Simpler is better - fewer buttons = less cluttered notification
- Current format is already mobile-optimized with emoji and short lines

If keeping minimal, document that this was a deliberate design decision and close Task 6.3 as "reviewed and approved current format".

**Option 2: Add Action Buttons**

Potential action buttons to consider:

**Button 1: "View Inbox"**
```typescript
{
  action: 'view',
  label: 'View Inbox',
  url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox`
}
```
- Takes user to Ready tab (inbox) where unsorted items live
- Useful if summary shows ideas captured/converted
- Pattern: Same as Daily Review's "View Review" button

**Button 2: "View Tasks"** or **"View Files"**
```typescript
{
  action: 'view',
  label: 'View Tasks',
  url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/files?type=task`
}
```
- Takes user directly to Files tab filtered to tasks
- Useful if summary shows tasks due today
- URL pattern: Files tab supports `?type=task` query parameter

**Button 3: "Start Planning"**
```typescript
{
  action: 'view',
  label: 'Start Planning',
  url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/capture`
}
```
- Takes user to capture screen to start new planning
- Generic action, always relevant

**Button Constraints**:
- Mobile screens are small - max 2-3 buttons recommended
- Each button takes vertical space in notification
- More buttons = more decision paralysis

**Option 3: Dynamic Priority Based on Urgency**

Current implementation always uses `'default'` priority. Could make it dynamic:

```typescript
// Determine priority based on urgency
let priority: NtfyConfig['priority'] = 'default'
if (summary.tasksDueToday > 0) {
  priority = 'high'  // Tasks due today = more urgent
}

const notificationResult = await ntfyService.sendNotification(
  '📊 Daily Summary',
  message,
  actions,
  priority
)
```

**Effect**:
- `'high'` priority = louder notification sound, more prominent in drawer
- Draws user's attention when there are tasks due today
- Still not as urgent as task reminders (`'urgent'` priority)

**Option 4: Enhanced Title with Time Indicator**

Current title: `'📊 Daily Summary'` (generic)

Potential enhancements:

**Include summary time**:
```typescript
const now = new Date()
const currentHour = now.getHours()
let timeLabel = 'Morning'
if (currentHour >= 12 && currentHour < 18) timeLabel = 'Midday'
if (currentHour >= 18) timeLabel = 'Evening'

const title = `📊 ${timeLabel} Summary`
// Results in: "📊 Morning Summary", "📊 Midday Summary", "📊 Evening Summary"
```

**Include urgency indicator**:
```typescript
const title = summary.tasksDueToday > 0
  ? `📊 Daily Summary - ${summary.tasksDueToday} task(s) due!`
  : '📊 Daily Summary'
```

**Trade-off**: Longer titles may get truncated on mobile (NTFY sanitizes to max 100 chars)

**Option 5: Custom NTFY Tags/Icons**

Current tags: `'brain,lightbulb'` (hardcoded in notify.ts line 93)

Could customize for summaries:
```typescript
headers['Tags'] = 'chart,calendar'  // 📊 + 📅 icons
```

Or make dynamic:
```typescript
const tags = summary.tasksDueToday > 0
  ? 'chart,warning'  // 📊 + ⚠️ if tasks due
  : 'chart,calendar' // 📊 + 📅 normal
```

**Effect**: Changes icon shown in notification drawer. Minor visual polish.

---

### Technical Reference Details

**Files Involved**:
- `/home/mmariani/Projects/idealisted/lib/scheduler.ts` (lines 347-352) - Where notification is sent
- `/home/mmariani/Projects/idealisted/lib/summary.ts` (lines 107-151) - Message formatting
- `/home/mmariani/Projects/idealisted/lib/notify.ts` (lines 65-125) - NTFY service core

**Key Functions**:
- `schedulerService.checkAndSendDailySummary()` - CRON job that sends summaries
- `ntfyService.sendNotification(title, message, actions, priority)` - Core notification sender
- `formatSummaryMessage(summary)` - Formats DailySummaryData into plain text

**Data Structures**:
- `DailySummaryData` (lib/summary.ts lines 3-11) - Summary metrics object
- `NtfyConfig` (types/index.ts lines 214-221) - NTFY configuration type
- Action button format: `{ action: string, label: string, url?: string, clear?: boolean }`

**Environment Variables**:
- `NEXT_PUBLIC_APP_URL` - Base URL for action button URLs (defaults to http://localhost:3000)

**NTFY Protocol Capabilities** (from existing implementations):
- **Priorities**: 'urgent', 'high', 'default', 'low' (affects sound/vibration)
- **Tags**: Comma-separated emoji identifiers (e.g., 'brain,lightbulb,warning,chart')
- **Actions**: JSON array, supports 'view' action with URL, 'clear' to dismiss
- **Title**: Max 100 characters (sanitized)
- **Message**: Plain text, newlines preserved (excessive newlines collapsed)

**Current Notification Call** (scheduler.ts lines 347-352):
```typescript
await ntfyService.sendNotification(
  '📊 Daily Summary',  // title
  message,              // formatted message from formatSummaryMessage()
  [],                   // actions (EMPTY - Task 6.3 addresses this)
  'default'             // priority (HARDCODED - Task 6.3 could make dynamic)
)
```

**Example Enhanced Implementation** (Option 2 + 3 + 4 combined):

```typescript
// Determine time of day label
const currentHour = now.getHours()
let timeLabel = 'Morning'
if (currentHour >= 12 && currentHour < 18) timeLabel = 'Midday'
if (currentHour >= 18) timeLabel = 'Evening'

// Determine priority based on urgency
let priority: NtfyConfig['priority'] = 'default'
if (summary.tasksDueToday > 0) priority = 'high'

// Build action buttons
const actions = []
if (summary.tasksDueToday > 0 || summary.tasksDueSoon > 0) {
  actions.push({
    action: 'view',
    label: 'View Tasks',
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/files?type=task`
  })
}
if (summary.ideasCaptured > 0 || summary.ideasConverted > 0) {
  actions.push({
    action: 'view',
    label: 'View Inbox',
    url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/inbox`
  })
}

// Send notification
const notificationResult = await ntfyService.sendNotification(
  `📊 ${timeLabel} Summary`,
  message,
  actions,
  priority
)
```

**Testing Checklist for Task 6.3**:
- [ ] Review current notification format on actual mobile device (not just logs)
- [ ] Decide if action buttons add value or clutter
- [ ] Determine if priority should be dynamic based on urgency
- [ ] Consider if title should include time-of-day indicator
- [ ] Test with multiple button combinations (1 button, 2 buttons, 3 buttons)
- [ ] Verify action button URLs work correctly
- [ ] Ensure notification remains readable on small screens
- [ ] Check that enhanced format doesn't break NTFY protocol limits
- [ ] Document decision (keep minimal OR enhance with rationale)

**Implementation Location**:

All changes will be in `/home/mmariani/Projects/idealisted/lib/scheduler.ts` at lines 332-352. The `formatSummaryMessage()` function in `lib/summary.ts` should NOT change - it's already well-designed for plain text messages.

**No New Dependencies Required**: All necessary functions and types already exist.

**Success Criteria**:
- Notification format is **clear and actionable** (or documented as intentionally minimal)
- Action buttons (if added) use correct URL patterns and work on mobile
- Priority level (if dynamic) correctly reflects urgency
- Title (if enhanced) provides useful context without truncation
- Implementation follows existing patterns (see task reminders and daily review)
- Code is documented with comments explaining design decisions

---

**Recommendation for Implementation**:

Start by **testing the current format** on an actual mobile device to see if it needs enhancement. If it looks good and serves user needs, document that decision and mark task complete. If enhancement is needed, implement a **conservative approach**:

1. **Add 1-2 action buttons** (not 3+) based on summary content
2. **Make priority dynamic** (high if tasks due today, otherwise default)
3. **Keep title simple** (maybe add time-of-day label, but not urgency metrics)
4. **Keep NTFY tags as-is** (brain,lightbulb) unless there's a specific reason to change

The goal is **subtle enhancement**, not radical redesign. The current format is already good - just needs polish.

---

## Context Manifest for Task 6.2: CRON Scheduled Summary Jobs

### How The Existing CRON Scheduler Works

IdeaListed already has a fully operational CRON scheduler system that handles recurring background tasks. This system was built for Phase 5 (Daily Review and Task Reminders) and follows a specific architectural pattern that Phase 6 Task 6.2 must extend, not replace.

**The SchedulerService Architecture** (`/lib/scheduler.ts`):

The scheduler is a **singleton service** that manages all timed background jobs. When the Next.js server starts up, the `initializeServices()` function in `/lib/init.ts` (lines 8-28) is automatically called because it's imported at the top level. This function calls `schedulerService.start()` which initializes all CRON jobs.

The service uses a critical pattern for **Next.js hot-reload compatibility**. During development, Next.js frequently reloads modules when code changes. Without protection, this would create duplicate CRON jobs on every reload, causing chaos. The solution is **global variables** that persist across module reloads:

```typescript
declare global {
  var __daily_review_cron_task: any | undefined
  var __daily_review_is_running: boolean | undefined
  var __reminder_check_cron_task: any | undefined
  var __reminder_check_is_running: boolean | undefined
  var __daily_summary_cron_task: any | undefined
  var __daily_summary_is_running: boolean | undefined
}
```

These globals serve two purposes:
1. **Task deduplication**: The `start()` method checks if a global task exists and stops it before creating a new one (lines 23-27, 37-40)
2. **Mutex locking**: The `is_running` flag prevents concurrent executions of the same job

**Current CRON Jobs** (already implemented):

1. **Daily Review CRON** (lines 30-34): Runs every minute (`'* * * * *'`), checks if it's time to send the daily review notification. The actual logic is in `checkAndSendDailyReview()` (lines 75-164).

2. **Task Reminder CRON** (lines 42-46): Runs every minute, checks for tasks with due reminders. The logic is in `checkAndNotifyReminders()` (lines 170-256).

Both jobs follow the same execution pattern:

```typescript
// 1. Check mutex lock to prevent concurrent runs
if (global.__job_is_running) return

try {
  global.__job_is_running = true

  // 2. Load configuration from settings table
  // 3. Check if feature is enabled
  // 4. Check if it's the right time
  // 5. Check if already sent (deduplication)
  // 6. Perform the action (generate review/send notification)
  // 7. Mark as sent or update timestamp

} catch (error) {
  console.error('[Scheduler] Error:', error)
} finally {
  global.__job_is_running = false
}
```

**Daily Review CRON Deep Dive** (lines 75-164):

This job demonstrates the exact pattern we need for daily summaries. Let me trace through its execution:

1. **Mutex check** (line 77): `if (global.__daily_review_is_running) return` - prevents concurrent executions
2. **Configuration loading** (lines 84-91): Queries the `settings` table for `key='daily_review'`, parses the JSON value
3. **Enabled check** (lines 94-96): If `config.enabled` is false, returns early
4. **NTFY check** (lines 99-109): Loads `ntfy_config` from settings, checks if `ntfyConfig.enabled` is true
5. **Time matching** (lines 112-119): Gets current time as "HH:mm" format, compares to configured review time
6. **Deduplication** (lines 122-127): Calls `reviewService.hasReviewBeenSentToday()` to check if already sent
7. **Execution** (lines 130-158): Generates review, formats notification, sends via ntfyService, marks as sent

The deduplication strategy uses a `lastSent` field in the configuration JSON that stores the date (YYYY-MM-DD format). This prevents sending multiple reviews on the same day.

**Task Reminder CRON Deep Dive** (lines 170-256):

This is the newer implementation (Phase 5.3) and shows a different deduplication strategy:

1. **Mutex check** (line 172): Same pattern
2. **Database query** (lines 182-199): Uses prepared statement with timestamp filters:
   - `reminder_datetime <= now` (task is due)
   - `status != 'completed'` (don't notify completed tasks)
   - `last_notified_at IS NULL OR last_notified_at < oneHourAgo` (1-hour cooldown)
3. **Silent return** (lines 201-204): If no tasks need notification, returns without logging (prevents log spam)
4. **Batch processing** (lines 206-247): Loops through tasks, sends notifications, updates `last_notified_at` timestamps
5. **Performance logging** (lines 249-250): Logs execution time and success/failure counts

The key difference: Task reminders use a **per-task timestamp** (`last_notified_at`) for deduplication, while daily review uses a **global date string**. For daily summaries, we'll use a **database table** (`daily_summaries`) for deduplication.

**CRON Schedule Syntax** (`node-cron` format):

The scheduler uses `node-cron` which supports standard cron syntax:
- `'* * * * *'` - Every minute (what we use for all jobs)
- `'0 9,12,18 * * *'` - At 9:00, 12:00, and 18:00 (what we COULD use, but won't)

Why run every minute instead of at specific times? Because it's more reliable. The "check every minute and compare current time" pattern (used in daily review) is simpler than scheduling jobs at specific times. It also handles edge cases better (server restarts, clock changes, etc.).

**Initialization Flow**:

1. `app/layout.tsx` (server-side layout) imports `/lib/init`
2. `/lib/init.ts` exports `initializeServices()` which auto-runs on import (line 31)
3. Server-side check: `if (typeof window !== 'undefined') return` (line 15) prevents browser execution
4. Global flag check: `if (global.__scheduler_initialized) return` (line 10) prevents duplicate initialization
5. Calls `schedulerService.start()` which creates all CRON jobs
6. Sets `global.__scheduler_initialized = true` (line 24)

This means the scheduler is ALWAYS running when the server is running, but it's protected from hot-reload issues in development.

### How The Summary Service Works

**Summary Generation Service** (`/lib/summary.ts`):

This service was created specifically for Phase 6 Task 6.1. It provides two main functions:

**1. generateDailySummary(date?: string)** (lines 18-100):

This function queries the database for activity metrics on a given date (defaults to today). Here's what it calculates:

**Ideas Captured** (lines 32-39): Counts `items` where `type='idea'` AND `created_at` is between start and end of day AND not archived. This tells us how many new ideas the user captured.

**Ideas Converted** (lines 42-49): Counts `items` where `type != 'idea'` AND `updated_at` is between start and end of day AND not archived. This is a bit nuanced - it finds items that WERE ideas but are now something else, meaning they were sorted/converted during the day.

**Tasks Completed** (lines 52-60): Counts `tasks` where `status='completed'` AND `updated_at` is between start and end of day, joined with `items` to filter archived. This shows productivity.

**Tasks Due Today** (lines 63-71): Counts `tasks` where `due_date` falls within the target day AND status is not completed AND not archived. These are urgent items.

**Tasks Due Soon** (lines 74-82): Counts `tasks` where `due_date` is between tomorrow and 3 days from now AND not completed. This is a forward-looking metric.

**Has Activity Flag** (lines 85-89): Boolean that's true if ANY of the first 4 metrics are > 0. This is CRITICAL - we only send summaries if there's actual activity.

The function returns a `DailySummaryData` object with all these metrics plus the date and hasActivity flag.

**2. formatSummaryMessage(summary: DailySummaryData)** (lines 107-151):

This function takes the metrics and formats them into a human-readable notification message. Let me trace through the logic:

**No Activity Case** (lines 108-110): If `hasActivity` is false, returns a single-line message: "No activity today. Time to capture some ideas!" But wait - the CRON job should skip sending if no activity, so this is a defensive fallback.

**Message Structure** (lines 112-150):
- **Header** (line 115): "📊 Daily Summary for {formatted date}" (e.g., "Monday, Jan 15")
- **Activity Section** (lines 119-135): Only shown if there's activity. Lists:
  - Ideas captured: "💡 X idea(s) captured"
  - Ideas converted: "✅ X idea(s) converted"
  - Tasks completed: "🎯 X task(s) completed"
- **Due Section** (lines 138-147): Only shown if there are upcoming tasks. Lists:
  - Tasks due today: "📅 X task(s) due today"
  - Tasks due soon: "🔜 X task(s) due in next 3 days"

The message uses emoji prefixes for visual hierarchy and proper pluralization (e.g., "1 task" vs "2 tasks").

**Date Formatting Helper** (lines 158-169):

The `formatDate()` function converts YYYY-MM-DD to "Monday, Jan 15" format. It uses UTC date manipulation to avoid timezone issues (line 159 sets time to noon UTC).

**Return Type**: The summary service returns a plain object, NOT a database model. This is important for the CRON job.

### How The NTFY Service Works

**Notification Service** (`/lib/notify.ts`):

The NTFY service is a singleton that sends push notifications via the ntfy.sh protocol. For daily summaries, we'll use the core `sendNotification()` method (lines 65-125).

**Service Initialization Pattern**:

The service has a `config` property (line 13) that's null by default. Every method calls `loadConfig()` (lines 16-31) which:
1. Imports the database module dynamically: `const { db } = await import('./db')`
2. Queries settings table: `SELECT value FROM settings WHERE key = 'ntfy_config'`
3. Parses JSON and stores in `this.config`

This pattern ensures the config is always fresh, even if it changes in the database.

**Core Notification Method** (lines 65-125):

The `sendNotification(title, message, actions?, priority?)` method:

1. **Load config** (line 77): Calls `await this.loadConfig()`
2. **Enabled check** (lines 80-82): Returns `{ success: false, error: 'Ntfy notifications disabled' }` if not enabled
3. **Header sanitization** (lines 86-94): NTFY uses HTTP headers for metadata, so we sanitize title and prepare headers
4. **Basic auth** (lines 101-105): If username/password provided, adds Authorization header
5. **HTTP POST** (lines 111-115): Sends to `{server}/{topic}` with message as plain text body
6. **Response** (line 117): Returns `{ success: true, id: response.data.id }`

**Important**: The method signature accepts `actions` array, but for daily summaries we'll pass an empty array `[]` since there are no user actions needed.

**Priority Levels**: The NTFY protocol supports priority: 'default', 'low', 'high', 'urgent'. For daily summaries, we'll use 'default'.

**Error Handling**: The method wraps everything in try/catch and returns `{ success: false, error: message }` on failure. This means the CRON job can always check `result.success` without worrying about exceptions.

### How The Daily Summaries Table Works

**Database Schema** (from sqlite3 output):

```sql
CREATE TABLE daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX idx_daily_summaries_created_at ON daily_summaries(created_at);
```

This table stores records of sent summaries for deduplication. The schema is simple:
- **id**: Auto-incrementing primary key
- **date**: YYYY-MM-DD format string (indexed for fast lookups)
- **data**: JSON string containing the full `DailySummaryData` object
- **created_at**: Unix timestamp (milliseconds) of when the summary was sent

**Deduplication Strategy**:

The CRON job will check if a summary has already been sent TODAY at the current HOUR. This prevents sending multiple summaries at the same time on the same day, while still allowing summaries at different times (9am, 12pm, 6pm).

Example query pattern:
```sql
SELECT created_at FROM daily_summaries
WHERE created_at >= {startOfTodayTimestamp}
ORDER BY created_at DESC
LIMIT 1
```

Then check if the returned `created_at` has the same hour as the current time.

**Why Store the Data?**:

The `data` column preserves the full summary for future reference. This could be used for:
- Displaying summary history in the UI (future feature)
- Analytics or trend analysis
- Debugging why a summary was sent

### What The CRON Job Needs To Do

Now that we understand all the pieces, here's the complete flow for Phase 6 Task 6.2:

**checkAndSendDailySummary() Method** (to be added to `/lib/scheduler.ts`):

1. **Mutex Lock** (prevent concurrent runs):
   ```typescript
   if (global.__daily_summary_is_running) return
   global.__daily_summary_is_running = true
   ```

2. **Feature Flag Check** (respect user preferences):
   ```typescript
   const featureSetting = db.prepare('SELECT enabled FROM ai_feature_settings WHERE feature_id = ?').get('daily_summary')
   if (!featureSetting || !featureSetting.enabled) return
   ```
   This checks the `ai_feature_settings` table created in Phase 1. The `daily_summary` feature is seeded with `enabled=0` by default, so users must explicitly enable it.

3. **NTFY Configuration Check** (ensure notifications are possible):
   ```typescript
   const ntfySetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ntfy_config')
   if (!ntfySetting) return
   const ntfyConfig = JSON.parse(ntfySetting.value)
   if (!ntfyConfig.enabled) return
   ```

4. **Time Matching** (check if current time is a summary time):
   ```typescript
   const now = new Date()
   const currentTime = format(now, 'HH:mm')  // Uses date-fns
   const summaryTimes = ['09:00', '12:00', '18:00']
   if (!summaryTimes.includes(currentTime)) return
   ```

   This runs every minute but only proceeds at exactly 9:00am, 12:00pm, or 6:00pm. The `date-fns` library is already imported (line 4).

5. **Deduplication Check** (prevent duplicate summaries):
   ```typescript
   const currentHour = now.getHours()
   const todayStart = new Date()
   todayStart.setHours(0, 0, 0, 0)

   const lastSummary = db.prepare(`
     SELECT created_at FROM daily_summaries
     WHERE created_at >= ?
     ORDER BY created_at DESC
     LIMIT 1
   `).get(todayStart.getTime())

   if (lastSummary) {
     const lastSummaryDate = new Date(lastSummary.created_at)
     if (lastSummaryDate.getHours() === currentHour) {
       console.log('[Scheduler] Daily summary already sent at this hour')
       return
     }
   }
   ```

   This finds the most recent summary sent today and checks if it was sent in the current hour. This allows multiple summaries per day (9am, 12pm, 6pm) but prevents duplicates at the same hour.

6. **Summary Generation**:
   ```typescript
   const { generateDailySummary, formatSummaryMessage } = await import('./summary')
   const summary = generateDailySummary()  // Defaults to today
   ```

7. **Activity Check** (skip if no activity):
   ```typescript
   if (!summary.hasActivity) {
     console.log('[Scheduler] No activity today - skipping summary')
     return
   }
   ```

   This is a critical optimization. We don't spam the user with "no activity" notifications.

8. **Message Formatting**:
   ```typescript
   const message = formatSummaryMessage(summary)
   ```

   This uses the formatting function from `/lib/summary.ts` which returns a multi-line string with emoji icons and proper grammar.

9. **Notification Sending**:
   ```typescript
   const notificationResult = await ntfyService.sendNotification(
     '📊 Daily Summary',
     message,
     [],  // No action buttons
     'default'  // Normal priority
   )
   ```

10. **Record Keeping** (on success):
    ```typescript
    if (notificationResult.success) {
      db.prepare(`
        INSERT INTO daily_summaries (date, data, created_at)
        VALUES (?, ?, ?)
      `).run(summary.date, JSON.stringify(summary), Date.now())

      console.log('[Scheduler] Daily summary sent successfully')
    } else {
      console.error('[Scheduler] Failed to send summary notification:', notificationResult.error)
    }
    ```

11. **Cleanup**:
    ```typescript
    } catch (error) {
      console.error('[Scheduler] Error in daily summary check:', error)
    } finally {
      global.__daily_summary_is_running = false
    }
    ```

**Global Variable Declarations** (add to top of `/lib/scheduler.ts`):

The existing global declarations (lines 6-14) need to be extended:
```typescript
declare global {
  var __daily_summary_cron_task: any | undefined
  var __daily_summary_is_running: boolean | undefined
}
```

**CRON Job Registration** (in `start()` method):

Add this after the task reminder CRON setup (after line 46):
```typescript
// Daily Summary Check (Phase 6 - Task 6.2)
if (global.__daily_summary_cron_task) {
  global.__daily_summary_cron_task.stop()
  global.__daily_summary_cron_task = undefined
}

global.__daily_summary_cron_task = cron.schedule('* * * * *', async () => {
  await this.checkAndSendDailySummary()
})

console.log('[Scheduler] Daily summary check cron started (every minute)')
```

### Technical Reference Details

**File Locations**:
- Implementation file: `/home/mmariani/Projects/idealisted/lib/scheduler.ts`
- Summary service: `/home/mmariani/Projects/idealisted/lib/summary.ts` (already complete)
- NTFY service: `/home/mmariani/Projects/idealisted/lib/notify.ts` (no changes needed)
- Database schema: `/home/mmariani/Projects/idealisted/lib/db.ts` (daily_summaries table already exists)
- Initialization: `/home/mmariani/Projects/idealisted/lib/init.ts` (no changes needed)

**Database Tables Used**:
- `ai_feature_settings` (read): Check if `feature_name='daily_summary'` is enabled
- `settings` (read): Load `key='ntfy_config'` for notification settings
- `items` (read): Query for ideas captured/converted (via summary service)
- `tasks` (read): Query for tasks completed/due (via summary service)
- `daily_summaries` (read/write): Deduplication and record keeping

**Dependencies**:
- `node-cron` (already installed, imported in scheduler.ts)
- `date-fns` (already imported, used for `format()`)
- `lib/summary` (dynamic import: `await import('./summary')`)
- `lib/notify` (already imported: `ntfyService`)
- `lib/db` (dynamic import: `await import('./db')`)

**Type Definitions**:
- `DailySummaryData` - Defined in `/lib/summary.ts` lines 3-11
- `NtfyConfig` - Defined in `/types/index.ts` lines 214-221
- `AIFeatureSetting` - Defined in `/types/index.ts` lines 208-212

**Configuration Values**:
- Summary times: Hardcoded array `['09:00', '12:00', '18:00']`
- Feature flag: `daily_summary` in `ai_feature_settings` table
- NTFY config: JSON object in `settings` table with key `ntfy_config`
- Notification priority: `'default'`
- Notification title: `'📊 Daily Summary'`

**Error Handling Pattern**:
- All database queries wrapped in try/catch
- Early returns for disabled features (silent)
- Console logging for success/failure
- Graceful degradation (if NTFY fails, log error but don't crash)
- Mutex lock always released in finally block

**Logging Strategy**:
- Start check: No log (runs every minute, would spam)
- Feature disabled: No log (expected state)
- No activity: `console.log('[Scheduler] No activity today - skipping summary')`
- Already sent: `console.log('[Scheduler] Daily summary already sent at this hour')`
- Generating: `console.log('[Scheduler] Generating daily summary...')`
- Success: `console.log('[Scheduler] Daily summary sent successfully')`
- Failure: `console.error('[Scheduler] Failed to send summary notification:', error)`
- Exception: `console.error('[Scheduler] Error in daily summary check:', error)`

**Performance Considerations**:
- CRON runs every minute but returns early 99% of the time (fast)
- Database queries are indexed (daily_summaries has indexes on date and created_at)
- Summary generation queries use indexes on items/tasks tables
- Dynamic imports (`await import()`) only load modules when needed
- Mutex lock prevents concurrent executions (important for database writes)

**Edge Cases**:
1. **Server restart during summary time**: CRON restarts, checks deduplication table, skips if already sent
2. **Clock change (DST)**: Uses system time, handles naturally
3. **Multiple server instances**: SQLite is single-file, doesn't support multi-instance well (not a concern for IdeaListed)
4. **Feature disabled mid-day**: Next summary time will skip
5. **NTFY disabled mid-day**: Next summary time will skip
6. **No activity all day**: No summaries sent (hasActivity check prevents spam)
7. **Database locked**: WAL mode prevents this (lib/db.ts line 16)
8. **User in different timezone**: Uses server timezone (system time), not user timezone

**What This Task Does NOT Include**:
- Settings UI for enabling/disabling summaries (future enhancement)
- Customizing summary times (hardcoded to 9am, 12pm, 6pm)
- Action buttons in notifications (empty actions array)
- Email/SMS summaries (only NTFY)
- AI-generated insights (summary service doesn't use AI)
- Historical summary viewing UI (data is stored but not displayed)

**Implementation Checklist**:
- [ ] Add global variable declarations for daily_summary CRON
- [ ] Add `checkAndSendDailySummary()` private method to SchedulerService class
- [ ] Register CRON job in `start()` method
- [ ] Implement mutex lock pattern (check and set is_running flag)
- [ ] Load and check daily_summary feature flag from ai_feature_settings
- [ ] Load and check NTFY configuration from settings table
- [ ] Check current time against summary times array ['09:00', '12:00', '18:00']
- [ ] Query daily_summaries table for deduplication (check if sent this hour)
- [ ] Call generateDailySummary() from lib/summary.ts
- [ ] Check hasActivity flag and skip if false
- [ ] Call formatSummaryMessage() to format notification text
- [ ] Send notification via ntfyService.sendNotification()
- [ ] Insert record into daily_summaries table on success
- [ ] Add comprehensive logging (start, skip reasons, success, failure)
- [ ] Test with feature enabled/disabled
- [ ] Test with NTFY enabled/disabled
- [ ] Test with no activity (should skip)
- [ ] Test deduplication (run twice at same hour)
- [ ] Verify logs are clear and helpful

---

## Phase 7: Onboarding Wizard

**Status**: Not Started
**Dependencies**: All features complete (demonstrates full app)

**Purpose**: Interactive walkthrough for first-time users.

**What Will Be Built**:
- Spotlight/tooltip tour system
- Welcome modal on first launch
- 7-8 tour steps covering key features
- Settings integration for "Restart Tour"

**Tour Steps**:
1. Capture screen (textarea)
2. Buttons (Unsorted/AI)
3. AI Suggestions (explains AI features)
4. Unsorted tab (inbox review)
5. Ready tab (sorted items)
6. Files tab (entity browser)
7. Settings (customization)
8. Complete

**Technical Components**:
- TourSpotlight.tsx - Overlay with cutout
- TourTooltip.tsx - Step content display
- OnboardingWizard.tsx - State management
- tour-steps.tsx - Step definitions

---

## Implementation Workflow

**For Each Phase**:

1. **Planning** (this document + AI_AND_NTFY_TASKS.md)
2. **Context Gathering** - Generate context bundles for each task
3. **Task Prompts** - Create prompts referencing context bundles
4. **Orchestrator Review** - Greenlight each task before implementation
5. **Parallel Implementation** - Use specialty subagents
6. **Code Review** - Review all changes
7. **Testing** - Playwright tests where applicable
8. **Documentation** - Update docs and commit

**Specialty Subagents Used**:
- `backend-architect` - Database and API work
- `frontend-developer` - UI components
- `ai-engineer` - AI integration work
- `code-review` - Post-implementation review

---

## Success Metrics

**Phase Completion Checklist**:
- [x] Phase 1: Database Foundation ✅
- [x] Phase 2: AI Settings UI ✅
- [x] Phase 3: AI Suggestion Flow ✅
- [x] Phase 4: AI Tag Suggestions ✅
- [ ] Phase 5: Task Reminders (Tasks 5.1 ✅ and 5.3 ✅ Complete, Task 5.4 Optional)
- [x] Phase 6: Scheduled Summary ✅ (Tasks 6.2 ✅ and 6.3 ✅ Complete, Task 6.4 Optional)
- [ ] Phase 7: Onboarding Wizard

**Overall Sprint Goals**:
- AI features optional and user-controlled
- Tag system with intelligent reuse
- Reliable notification system
- Smooth onboarding experience
- Zero breaking changes to existing functionality

---

## Notes

- **Timeline**: No estimates per user directive - focus on quality and order
- **Testing**: Manual + automated where possible
- **Commits**: One per phase completion
- **Breaking Changes**: None allowed - all features additive
- **Backward Compatibility**: Maintained throughout

---

**Last Updated**: 2025-11-17
**Current Phase**: Phase 6 Complete ✅ (Tasks 6.2 ✅ and 6.3 ✅)
**Next Phase**: Phase 5 Task 5.4 (Settings UI for reminder preferences) OR Phase 6 Task 6.4 (Settings UI for summary preferences) - Both Optional

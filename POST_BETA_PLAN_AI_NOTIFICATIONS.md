# Post-Beta Plan: AI & Notifications Reintroduction

**Created**: 2025-01-14
**Status**: Planning Phase
**Priority**: High

## Overview

This document outlines the phased reintroduction of AI features and notification integrations for IdeaListed post-Beta MVP. Both systems have foundational infrastructure in place but need gradual, user-friendly enablement with proper UX and integration.

---

## Current State Analysis

### AI System (Phase 3 - Master Toggle)
✅ **What's Built:**
- Master toggle in Settings > AI (default: disabled)
- OpenRouter API integration (`lib/ai.ts`)
- AI config stored in database (`settings` table)
- Backend protection (enabled flag checked before processing)
- AISuggestionPanel component exists (`components/modern/AISuggestionPanel.tsx`)
- `/api/ai/suggest` endpoint working

❌ **What's Missing:**
- Suggestion panel not integrated into capture flow
- AI button creates item immediately (no preview/review)
- No inline AI assistance during entity editing
- No AI-powered tag suggestions
- No AI summary generation for daily review
- No AI-powered entity recommendations (e.g., "should this task be a project?")

### Notification System (Ntfy.sh)
✅ **What's Built:**
- Complete ntfy.sh service (`lib/notify.ts`)
- Settings UI with event toggles (`components/modern/settings/NotificationsTab.tsx`)
- Event-based notification system (5 events)
- Daily review reminder system
- `/api/notify` endpoint
- Test notification functionality

❌ **What's Missing:**
- Not integrated into any workflows (notifications never sent)
- CRON system disabled (daily review won't trigger)
- No notifications on actual events (capture, sort, complete, etc.)
- No push notification setup guidance for users
- No notification action handlers (e.g., "Mark Complete" button in notification)

---

## Phase 1: Foundation & User Experience

**Goal**: Make both systems discoverable, testable, and easy to enable

### 1.1 AI Onboarding Experience

**Tasks:**
1. Create AI setup wizard (first-time user experience)
   - Welcome screen explaining AI features
   - OpenRouter API key input with validation
   - Model selection (free vs paid)
   - Test AI connection before saving
   - Show example suggestions

2. Add AI status indicator to UI
   - Small icon in header showing AI status (enabled/disabled/error)
   - Click to view AI credits/usage (if available from OpenRouter)
   - Quick enable/disable toggle

3. Improve AI settings page
   - Add "What can AI do?" section with examples
   - Show API key status (valid/invalid/not set)
   - Add cost transparency (est. cost per request)
   - Link to OpenRouter dashboard

**Files to Modify:**
- Create: `components/modern/AIOnboardingWizard.tsx`
- Create: `components/modern/AIStatusIndicator.tsx`
- Modify: `components/modern/settings/AISettingsTab.tsx`

### 1.2 Notification Onboarding Experience

**Tasks:**
1. Create ntfy.sh setup guide
   - Step-by-step visual guide:
     - Install ntfy app on phone
     - Choose topic name (suggest: `idealisted-{random}`)
     - Configure server (ntfy.sh or self-hosted)
     - Test notification
   - QR code generation for mobile app subscription
   - Link to ntfy.sh documentation

2. Add notification status to UI
   - Icon in header showing notification status
   - Visual feedback when notification sent
   - Toast message: "Notification sent to your phone!"

3. Improve notification settings
   - Group events by category (Capture, Tasks, Daily Review)
   - Show notification preview for each event type
   - Add "quiet hours" feature (don't send notifications between X-Y time)

**Files to Modify:**
- Create: `components/modern/NtfySetupGuide.tsx`
- Create: `components/modern/NotificationStatusIndicator.tsx`
- Modify: `components/modern/settings/NotificationsTab.tsx`
- Create: `lib/qr-code-generator.ts` (for mobile app subscription)

---

## Phase 2: AI Suggestion Flow Redesign

**Goal**: Implement the preview-first AI workflow (from PLANNING_NEEDED.md)

**Reference**: `PLANNING_NEEDED.md` Section 1 - AI Suggestion Flow Redesign

### 2.1 Inline AI Suggestion Panel

**Current Behavior:**
```
User clicks "AI" → Item created immediately → AI processes in background
```

**Desired Behavior:**
```
User clicks "AI" → Show inline suggestion panel → User reviews → User selects type → Item created
```

**Implementation:**
1. Rewire `handleAICapture` in `app/page.tsx`:
   ```typescript
   // OLD:
   const handleAICapture = () => {
     createItem(text) // Creates immediately
     callAI(itemId)   // Processes after creation
   }

   // NEW:
   const handleAICapture = async () => {
     setShowAISuggestionPanel(true)
     const suggestion = await callAI(text) // Call FIRST
     setAISuggestion(suggestion)
     // Wait for user to select type from panel
     // THEN create item with AI metadata
   }
   ```

2. Update `AISuggestionPanel.tsx`:
   - Display confidence percentage
   - Show AI reasoning ("This looks like a task because...")
   - Show extracted metadata (tags, priority, due date, etc.)
   - Provide type buttons (Task, Note, Project, List, Idea)
   - Allow override to any type
   - "Dismiss" button to cancel AI suggestion

3. Add loading states:
   - Show spinner while AI processes
   - Disable input during AI processing
   - Keep "Unsorted" button always available (bypass AI)

**Questions to Answer:**
- [ ] Inline panel or modal overlay? **Recommendation**: Inline (less disruptive)
- [ ] Handle AI errors? **Recommendation**: Show fallback buttons, log error
- [ ] Persist input text during suggestion? **Yes** - lock input as readonly
- [ ] User dismisses suggestion? **Recommendation**: Show normal entity type buttons
- [ ] Auto-accept high confidence? **No** - always show review (user preference)

**Files to Modify:**
- `app/page.tsx`: Rewire `handleAICapture`
- `components/modern/AISuggestionPanel.tsx`: Enhance UI
- `components/modern/screens/CaptureScreen.tsx`: Integration

**Acceptance Criteria:**
- [ ] AI button shows loading spinner
- [ ] Suggestion panel appears with confidence % and reasoning
- [ ] User can accept or override suggested type
- [ ] User can dismiss and revert to normal flow
- [ ] Input remains visible but read-only during review
- [ ] Item only created after user selects type

---

## Phase 3: Smart AI Features

**Goal**: Add intelligent AI-powered assistance beyond basic suggestion

### 3.1 AI Tag Suggestions

**Feature**: When creating/editing entities, AI suggests relevant tags

**Implementation:**
1. Add "Suggest Tags" button in entity modals
2. Call `/api/ai/suggest-tags` with entity text + existing tags
3. Display suggested tags with confidence scores
4. One-click to add suggested tag

**Use Cases:**
- Task: "Write quarterly report" → Tags: #work, #deadline, #writing
- Note: "Meeting with John about new feature" → Tags: #meeting, #john, #feature-planning
- Project: "Redesign landing page" → Tags: #design, #web, #marketing

### 3.2 AI Entity Type Recommendations

**Feature**: AI suggests when entities should be converted to different types

**Example Scenarios:**
- Task with 5+ subtasks → "This might work better as a Project"
- Note with actionable items → "Extract 3 tasks from this note?"
- Multiple related tasks → "Create a list to group these?"

**Implementation:**
1. Background analysis when viewing entity
2. Show banner: "💡 AI suggestion: This task could be a project"
3. One-click conversion with metadata preservation

### 3.3 AI Daily Summary

**Feature**: Generate AI-powered summary for daily review notification

**Implementation:**
1. Integrate with Daily Review system
2. When `includeAiSummary: true` in settings:
   - AI analyzes completed tasks, created entities, time spent
   - Generates 2-3 sentence summary
   - Highlights achievements and patterns
3. Include summary in ntfy.sh notification

**Example Output:**
```
Daily Summary (Jan 14):
Completed 8 tasks including 3 high-priority items.
Created 2 new project ideas focused on design work.
Strong productivity in morning hours.
```

**Files to Create/Modify:**
- Create: `lib/ai-summaries.ts`
- Create: `/api/ai/daily-summary/route.ts`
- Modify: `lib/review.ts` (integrate AI summary)

### 3.4 Smart Quick Add

**Feature**: Natural language parsing with AI

**Examples:**
- "Buy milk tomorrow" → Task with due_date: tomorrow
- "Meeting with Sarah next Tuesday at 2pm" → Task with due_date + time
- "Research React best practices #learning #dev" → Note with tags

**Implementation:**
1. Add "Smart Add" toggle in capture screen
2. When enabled, parse with AI before showing suggestion panel
3. Extract: entity type, due dates, times, tags, priority
4. Pre-fill entity modal with extracted data

---

## Phase 4: Notification Integration

**Goal**: Wire up notifications to actual app events

### 4.1 Event Notification Triggers

**Integrate ntfy.sh into workflows:**

1. **Idea Captured** (`ideaCaptured` event)
   - Trigger: After successful item creation in capture screen
   - Location: `app/page.tsx` → `handleCapture`
   - Code:
     ```typescript
     await ntfyService.notifyIdeaCaptured(newItem.text)
     ```

2. **Idea Sorted** (`ideaSorted` event)
   - Trigger: After converting idea to entity type
   - Location: `app/page.tsx` → `handleSort`, `handleConvert`
   - Code:
     ```typescript
     await ntfyService.notifyIdeaSorted(item.text, newType)
     ```

3. **Entity Created** (`entityCreated` event)
   - Trigger: After creating entity via modal
   - Location: `components/modern/EntityModal.tsx` → `handleSave`
   - Code:
     ```typescript
     await ntfyService.notifyEntityCreated(title, entityType)
     ```

4. **Task Completed** (`taskCompleted` event)
   - Trigger: After marking task as done
   - Location: Task completion handler
   - Code:
     ```typescript
     await ntfyService.notifyTaskCompleted(task.text)
     ```

5. **Task Due Soon** (`taskDueSoon` event)
   - Trigger: CRON job checking tasks due in 1 hour
   - Requires: CRON system re-enablement (Phase 5)

**Files to Modify:**
- `app/page.tsx`
- `components/modern/EntityModal.tsx`
- `components/modern/screens/FilesScreen.tsx` (task completion)

### 4.2 Notification Action Handlers

**Make notifications interactive:**

1. Add `/api/notify/actions` endpoint
2. Handle ntfy.sh action callbacks:
   - "Mark Complete" → Update task status
   - "Snooze" → Reschedule task
   - "View" → Return deep link to item
   - "Accept Suggestion" → Apply AI suggestion

3. Add action tracking:
   - Log when actions are clicked
   - Show analytics in settings: "You've completed 15 tasks via notifications"

**Files to Create:**
- `app/api/notify/actions/route.ts`

### 4.3 Daily Review Integration

**Connect daily review to notifications:**

1. Re-enable CRON system (see Phase 5)
2. Schedule daily review notification at configured time
3. Notification includes:
   - Tasks completed count
   - Tasks pending count
   - AI summary (if enabled)
   - "Start Review" action → Opens evening review flow

**Files to Modify:**
- `lib/scheduler.ts` (re-enable)
- `lib/review.ts` (add notification trigger)

---

## Phase 5: CRON System Re-enablement

**Goal**: Fix and re-enable automated scheduling for daily workflows

**Status**: Disabled in `app/layout.tsx:4` due to warnings

### 5.1 Fix CRON Warnings

**Problem**: `[NODE-CRON] [WARN] missed execution` every minute

**Potential Causes:**
1. CRON task taking longer than 1 minute interval
2. Event loop blocking
3. Multiple instances running

**Solution Options:**
1. **Increase interval**: Change from `* * * * *` (every minute) to `*/5 * * * *` (every 5 minutes)
2. **Add execution locking**: Prevent overlapping runs
   ```typescript
   let isRunning = false
   cron.schedule('*/5 * * * *', async () => {
     if (isRunning) return
     isRunning = true
     try {
       await checkDailyReview()
       await checkTasksDue()
     } finally {
       isRunning = false
     }
   })
   ```
3. **Move to background worker**: Use Vercel Cron or separate worker process

### 5.2 CRON Tasks to Implement

1. **Daily Review Check** (every hour between 17:00-23:00)
   - Check if daily review notification should be sent
   - Check user's configured time
   - Send ntfy.sh notification

2. **Task Due Soon** (every 15 minutes)
   - Query tasks due in next 60 minutes
   - Send notification for each upcoming task
   - Mark as notified to avoid duplicates

3. **Daily Plan Auto-Populate** (optional - disabled for now)
   - Could be re-enabled post-beta
   - Auto-create daily plan from high-priority tasks

**Files to Modify:**
- `lib/scheduler.ts`
- `app/layout.tsx` (uncomment import)
- `lib/init.ts`

### 5.3 Alternative: Vercel Cron

**If node-cron continues to be problematic:**

1. Create `/api/cron/daily-review/route.ts`
2. Create `/api/cron/task-reminders/route.ts`
3. Configure in `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/daily-review",
         "schedule": "0 */1 17-23 * * *"
       },
       {
         "path": "/api/cron/task-reminders",
         "schedule": "*/15 * * * *"
       }
     ]
   }
   ```

**Pros**: No warnings, Vercel-managed
**Cons**: Only works on Vercel, not in local development

---

## Phase 6: Advanced Features (Future)

### 6.1 AI Context Learning

- AI learns from user's correction patterns
- Suggests tags user commonly uses
- Learns entity type preferences
- Stores learning in `ai_learning` table

### 6.2 Multi-Model Support

- Allow different models for different tasks:
  - Fast model for tag suggestions
  - Smart model for daily summaries
  - Vision model for image notes (future)

### 6.3 Notification Channels

- Support multiple notification channels:
  - Ntfy.sh (current)
  - Email
  - Telegram
  - Discord webhook
  - SMS (Twilio)

### 6.4 Notification Scheduling

- "Remind me about this later"
- Snooze functionality
- Recurring reminders for projects

---

## Implementation Priorities

### Must Have (Post-Beta v1.0)
1. ✅ Phase 1.1: AI Onboarding Experience
2. ✅ Phase 1.2: Notification Onboarding Experience
3. ✅ Phase 2.1: AI Suggestion Flow Redesign
4. ✅ Phase 4.1: Event Notification Triggers

### Should Have (v1.1)
5. Phase 3.1: AI Tag Suggestions
6. Phase 3.4: Smart Quick Add
7. Phase 4.2: Notification Action Handlers
8. Phase 5: CRON System Re-enablement

### Nice to Have (v1.2+)
9. Phase 3.2: AI Entity Type Recommendations
10. Phase 3.3: AI Daily Summary
11. Phase 4.3: Daily Review Integration
12. Phase 6: Advanced Features

---

## Technical Decisions

### Decision 1: AI Suggestion Panel Location
**Options:**
- A) Inline below capture textarea
- B) Modal overlay
- C) Side panel

**Recommendation**: **A) Inline below textarea**
- Less disruptive to flow
- Keeps context visible
- Faster than modal animation
- Matches retro UI aesthetic

### Decision 2: CRON vs Vercel Cron
**Options:**
- A) Fix node-cron warnings
- B) Switch to Vercel Cron
- C) Hybrid (node-cron for dev, Vercel for prod)

**Recommendation**: **C) Hybrid approach**
- Best developer experience (works locally)
- Production reliability (Vercel-managed)
- Conditional import based on environment

### Decision 3: Notification Delivery Guarantee
**Options:**
- A) Fire-and-forget (current)
- B) Retry on failure
- C) Queue with persistence

**Recommendation**: **B) Retry on failure**
- Simple retry logic (3 attempts)
- Log failures to database
- Show "notification failed" toast to user
- Don't over-engineer for MVP

### Decision 4: AI Model Selection
**Options:**
- A) Single model for all tasks
- B) Task-specific models
- C) User selects per-task

**Recommendation**: **A) Single model for MVP**
- Simpler UX
- Easier to test and optimize
- Can add task-specific later
- User chooses free vs paid globally

---

## Database Schema Changes

### New Tables

```sql
-- AI learning and preferences
CREATE TABLE ai_learning (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- Future multi-user support
  entity_type TEXT NOT NULL,
  pattern TEXT NOT NULL, -- Text pattern AI learned from
  suggested_tags TEXT, -- JSON array
  correction_count INTEGER DEFAULT 0,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Notification log
CREATE TABLE notification_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_id TEXT,
  sent_at INTEGER NOT NULL,
  delivery_status TEXT, -- 'sent', 'failed', 'pending'
  retry_count INTEGER DEFAULT 0,
  error TEXT,
  action_taken TEXT -- If user clicked action in notification
);

-- CRON execution log
CREATE TABLE cron_log (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at INTEGER NOT NULL,
  duration_ms INTEGER,
  status TEXT, -- 'success', 'error'
  error TEXT
);
```

### Settings Schema Updates

```sql
-- Add new settings keys
INSERT INTO settings (key, value) VALUES
  ('ai_learning_enabled', 'true'),
  ('notification_quiet_hours', '{"start": "22:00", "end": "08:00"}'),
  ('cron_enabled', 'false');
```

---

## Testing Strategy

### AI Features Testing

1. **Unit Tests**:
   - AI suggestion parsing logic
   - Tag extraction algorithms
   - Confidence score calculation

2. **Integration Tests**:
   - Full capture → AI suggest → review → create flow
   - AI error handling
   - API key validation

3. **User Testing**:
   - Test with real OpenRouter API
   - Measure suggestion accuracy
   - Collect user feedback on suggestions

### Notification Testing

1. **Unit Tests**:
   - Event trigger logic
   - Notification formatting
   - Retry logic

2. **Integration Tests**:
   - End-to-end notification delivery
   - Action handler callbacks
   - Quiet hours enforcement

3. **Real-World Testing**:
   - Test on multiple devices
   - Verify ntfy.sh delivery
   - Test action buttons in notifications

### CRON Testing

1. **Local Testing**:
   - Use `node-cron` in development
   - Manual trigger endpoints for testing
   - Mock time to test schedules

2. **Production Testing**:
   - Vercel Cron in staging environment
   - Monitor execution logs
   - Verify daily review timing

---

## Rollout Plan

### Week 1: Foundation
- [ ] Phase 1.1: AI Onboarding
- [ ] Phase 1.2: Notification Onboarding
- [ ] Create database migrations
- [ ] Update documentation

### Week 2: Core Features
- [ ] Phase 2.1: AI Suggestion Flow Redesign
- [ ] Phase 4.1: Event Notification Integration
- [ ] Testing and bug fixes

### Week 3: Smart Features
- [ ] Phase 3.1: AI Tag Suggestions
- [ ] Phase 3.4: Smart Quick Add
- [ ] Phase 4.2: Notification Actions

### Week 4: CRON & Polish
- [ ] Phase 5: CRON Re-enablement
- [ ] Phase 4.3: Daily Review Integration
- [ ] Final testing
- [ ] Documentation updates
- [ ] Release v1.0

---

## Success Metrics

### AI Adoption
- % of users who enable AI
- Average confidence score of suggestions
- Acceptance rate of AI suggestions
- API costs per user/month

### Notification Engagement
- % of users who enable notifications
- Notification click-through rate
- Most popular notification events
- Action completion rate from notifications

### Overall Impact
- User retention (before/after AI)
- Time spent in app
- Ideas captured per user
- Task completion rate

---

## Documentation Updates Needed

1. **CLAUDE.md**: Add AI and notification integration patterns
2. **README.md**: Update with AI and notification setup instructions
3. **UNUSED_CODE.md**: Remove CRON from "disabled" section when re-enabled
4. Create: **AI_INTEGRATION_GUIDE.md** for developers
5. Create: **NOTIFICATION_SETUP.md** for users

---

## Questions for User

Before proceeding with implementation, please clarify:

1. **AI Priority**: Which AI feature is most valuable to you?
   - [ ] Suggestion flow redesign
   - [ ] Tag suggestions
   - [ ] Daily summaries
   - [ ] Smart quick add

2. **Notification Priority**: Which notifications matter most?
   - [ ] Task due reminders
   - [ ] Daily review
   - [ ] Capture confirmations
   - [ ] AI suggestions

3. **CRON Approach**: Preference for scheduling?
   - [ ] Fix node-cron (works locally + prod)
   - [ ] Switch to Vercel Cron (prod only, simpler)
   - [ ] Hybrid approach (both)

4. **AI Costs**: Comfort level with AI API costs?
   - [ ] Cost is not a concern, use best models
   - [ ] Keep costs low, use free models by default
   - [ ] Show cost estimates, let me decide per-feature

5. **Rollout Speed**: Implementation pace?
   - [ ] Fast (2 weeks, minimal features)
   - [ ] Medium (4 weeks, core features)
   - [ ] Thorough (6+ weeks, all features + testing)

---

**Next Steps**: Review this plan, answer questions above, then create detailed implementation tasks for Phase 1.

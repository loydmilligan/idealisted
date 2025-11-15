# Focused Implementation Plan - Post Beta MVP

**Created**: 2025-01-14
**Priority Features**: AI Suggestions, Tag Suggestions, Task Reminders, Scheduled Summaries, Onboarding Wizard
**Target**: v1.0 Release

---

## Priority Features Overview

### AI Features
1. **Suggestion Flow Redesign** - Preview-first AI workflow
2. **Tag Suggestions** - AI-powered tag recommendations

### Notification Features
3. **Task Due Reminders** - NTFY alerts before tasks due
4. **Scheduled Summary** - Periodic digest of captures and conversions

### UX Enhancement
5. **Onboarding Wizard** - Step-by-step feature walkthrough

---

## Feature 1: AI Suggestion Flow Redesign

### Current Problem
- User clicks "AI" button → Item created immediately → AI processes after
- No chance to review AI suggestions before committing
- Can't preview what AI thinks the entity should be

### Desired Flow
```
1. User types idea: "Buy groceries tomorrow"
2. User clicks "AI" button
3. [LOADING STATE] "Analyzing with AI..."
4. [SUGGESTION PANEL] Shows:
   - Confidence: 95%
   - Type: Task
   - Reasoning: "Contains action verb 'buy' and temporal indicator 'tomorrow'"
   - Extracted metadata:
     * Due date: Tomorrow
     * Suggested tags: #shopping, #errands
     * Priority: Medium
5. User can:
   - ✅ Accept as Task
   - 📝 Change to Note
   - 📋 Change to List
   - 🚫 Dismiss (revert to normal buttons)
6. Item created with AI-extracted metadata
```

### Implementation Steps

**Step 1: Update Capture Flow**
- Modify `app/page.tsx` → `handleAICapture`:
  ```typescript
  const handleAICapture = async () => {
    setAILoading(true)
    setInputDisabled(true) // Make textarea read-only

    try {
      // Call AI FIRST (don't create item yet)
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({ text: captureText })
      })

      const suggestion = await response.json()

      // Show suggestion panel
      setAISuggestion(suggestion)
      setShowAISuggestionPanel(true)

    } catch (error) {
      // On error, fall back to normal buttons
      setMessage('AI suggestion failed. Choose type manually.')
      setInputDisabled(false)
    } finally {
      setAILoading(false)
    }
  }
  ```

**Step 2: Enhance AISuggestionPanel Component**
- File: `components/modern/AISuggestionPanel.tsx`
- Display:
  - Confidence bar (visual percentage)
  - AI reasoning (1-2 sentences)
  - Suggested entity type (with icon)
  - Extracted metadata (tags, due date, priority)
  - Action buttons for each entity type
  - Dismiss button

**Step 3: Create Handler for User Selection**
- When user selects entity type:
  ```typescript
  const handleAcceptSuggestion = async (selectedType: string) => {
    const newItem = {
      text: captureText,
      type: selectedType,
      metadata: {
        tags: suggestion.suggestedTags,
        priority: suggestion.priority,
        due_date: suggestion.dueDate,
        // ... other AI-extracted metadata
      }
    }

    await createItem(newItem)
    setShowAISuggestionPanel(false)
    setCaptureText('')
    setInputDisabled(false)
  }
  ```

**Step 4: Add Loading State UI**
- Show spinner overlay on textarea
- Disable all buttons during processing
- Keep "Unsorted" button visible (with note: "AI in progress...")

**Files to Modify:**
- `app/page.tsx`
- `components/modern/AISuggestionPanel.tsx`
- `components/modern/screens/CaptureScreen.tsx`
- `/api/ai/suggest/route.ts` (enhance response format)

**Testing:**
- [ ] AI button shows loading state
- [ ] Suggestion panel displays with all metadata
- [ ] User can accept suggested type
- [ ] User can override to different type
- [ ] User can dismiss and use normal flow
- [ ] Error handling shows fallback UI
- [ ] "Unsorted" button always works (bypass AI)

---

## Feature 2: AI Tag Suggestions

### Use Case
User is creating/editing an entity and wants tag suggestions based on content.

### UI Design

**Option A: Inline in Modal**
```
Entity Modal:
┌─────────────────────────────────────┐
│ Title: Write quarterly report       │
│                                      │
│ Tags: [#work] [#deadline] [+]       │
│                                      │
│ 💡 Suggested: #writing #q1 #reports │
│    [+ Add all] [+ writing] [+ q1]   │
└─────────────────────────────────────┘
```

**Option B: Dedicated Button**
```
Entity Modal:
┌─────────────────────────────────────┐
│ Title: Write quarterly report       │
│                                      │
│ Tags: [#work] [#deadline] [+]       │
│       [🤖 Suggest Tags]             │
│                                      │
│ [Showing 3 suggestions...]          │
│ [+ #writing 85%] [+ #q1 78%] ...    │
└─────────────────────────────────────┘
```

**Recommendation**: **Option B** - Explicit control, doesn't auto-suggest on every modal open (saves API calls)

### Implementation

**Step 1: Add UI to Entity Modals**
- Add "Suggest Tags" button below tag input
- Show loading state when clicked
- Display suggested tags with confidence %
- One-click to add individual tag or all tags

**Step 2: Create API Endpoint**
- File: `app/api/ai/suggest-tags/route.ts`
- Input: entity text, entity type, existing tags
- Output: array of { tag: string, confidence: number, reason: string }
- Prompt engineering:
  ```
  Analyze this {type} and suggest 3-5 relevant tags.
  Title: {text}
  Existing tags: {existingTags}

  Consider:
  - Content topics and themes
  - Action verbs and context
  - Project categories
  - Time sensitivity

  Return JSON: [{ tag: string, confidence: 0-100, reason: string }]
  ```

**Step 3: Smart Tag Learning**
- Track which suggested tags user accepts/rejects
- Store in `ai_learning` table
- Improve suggestions over time based on user patterns

**Files to Create/Modify:**
- Create: `app/api/ai/suggest-tags/route.ts`
- Modify: `components/modern/EntityModal.tsx`
- Create: `lib/ai-tag-suggester.ts`

**Testing:**
- [ ] Button triggers AI tag suggestion
- [ ] Loading state displays
- [ ] Suggested tags show with confidence scores
- [ ] Can add individual tags
- [ ] Can add all tags at once
- [ ] Duplicate tags not added
- [ ] Works for all entity types

---

## Feature 3: Task Due Reminders (NTFY)

### Use Case
User has tasks with due dates/times. They want notifications before tasks are due.

### Configuration

**Settings UI:**
```
Notifications > Task Reminders

☑ Enable task due reminders

Reminder timing:
○ 15 minutes before
○ 30 minutes before
● 1 hour before
○ 1 day before

Reminder for:
☑ High priority tasks
☑ Medium priority tasks
☐ Low priority tasks

Quiet hours: 22:00 - 08:00
```

### Implementation

**Step 1: CRON Job for Task Checking**
- Check every 15 minutes for upcoming tasks
- Query tasks with `due_date` within reminder window
- Filter by priority preferences
- Respect quiet hours
- Track `last_notified_at` to prevent duplicates

**Step 2: Notification Format**
```
Title: ⏰ Task Due Soon
Message: "Write quarterly report" is due at 3:00 PM

Actions:
[Mark Complete] [Snooze 1hr] [View Task]
```

**Step 3: Notification Action Handlers**
- "Mark Complete": Call `/api/items/{id}` to update status
- "Snooze 1hr": Update due_date to +1 hour
- "View Task": Deep link to task detail modal

**Implementation Tasks:**

1. **Database Schema:**
   ```sql
   ALTER TABLE tasks ADD COLUMN last_notified_at INTEGER;

   CREATE TABLE notification_preferences (
     user_id TEXT PRIMARY KEY,
     task_reminder_enabled BOOLEAN DEFAULT true,
     reminder_timing TEXT DEFAULT '1_hour', -- '15_min', '30_min', '1_hour', '1_day'
     high_priority BOOLEAN DEFAULT true,
     medium_priority BOOLEAN DEFAULT true,
     low_priority BOOLEAN DEFAULT false,
     quiet_hours_start TEXT DEFAULT '22:00',
     quiet_hours_end TEXT DEFAULT '08:00'
   );
   ```

2. **CRON Job:**
   - File: `lib/scheduler.ts` → `checkTaskReminders()`
   - Schedule: Every 15 minutes
   - Logic:
     ```typescript
     async function checkTaskReminders() {
       const prefs = loadNotificationPreferences()
       const now = Date.now()
       const reminderWindow = getReminderWindowMs(prefs.reminder_timing)

       const upcomingTasks = db.prepare(`
         SELECT * FROM tasks
         WHERE due_date > ?
         AND due_date < ?
         AND (last_notified_at IS NULL OR last_notified_at < ?)
         AND status != 'done'
       `).all(now, now + reminderWindow, now - 86400000) // Don't re-notify within 24hrs

       for (const task of upcomingTasks) {
         if (shouldNotify(task, prefs)) {
           await ntfyService.notifyTaskDue(task.text, task.due_date)
           markTaskNotified(task.id)
         }
       }
     }
     ```

3. **Settings UI:**
   - Modify: `components/modern/settings/NotificationsTab.tsx`
   - Add task reminder configuration section

**Files to Create/Modify:**
- Modify: `lib/scheduler.ts`
- Modify: `lib/notify.ts` (add `notifyTaskDue` method)
- Modify: `components/modern/settings/NotificationsTab.tsx`
- Create: `app/api/notify/actions/route.ts` (action handlers)
- Modify: `lib/db.ts` (schema updates)

**Testing:**
- [ ] CRON job runs every 15 minutes
- [ ] Notifications sent 1 hour before due time
- [ ] High/medium/low priority filtering works
- [ ] Quiet hours respected
- [ ] No duplicate notifications
- [ ] Action buttons work (complete, snooze, view)

---

## Feature 4: Scheduled Summary (NTFY)

### Use Case
User wants periodic digest of their activity without constant notifications.

### Summary Types

**Option 1: Time-Based**
- Morning summary (9:00 AM): "You have 5 tasks due today"
- Midday summary (12:00 PM): "You've captured 3 ideas today"
- Evening summary (6:00 PM): "You completed 8 tasks today"

**Option 2: Event-Based**
- After 5 captures: "You've captured 5 ideas. Ready to sort them?"
- After 10 conversions: "Great job! You've converted 10 ideas today"

**Recommendation**: **Hybrid** - Time-based with event thresholds

### Implementation Design

**Settings UI:**
```
Notifications > Activity Summary

☑ Enable activity summaries

Send summary:
☑ Morning (9:00 AM)
☑ Midday (12:00 PM)
☑ Evening (6:00 PM)

Include in summary:
☑ Ideas captured today
☑ Ideas converted today
☑ Tasks completed today
☑ Tasks due today
☐ AI suggestions count
```

### Notification Format

```
Title: 📊 Midday Summary - Jan 14
Message:
Today so far:
✨ 7 ideas captured
📋 5 ideas converted
✅ 3 tasks completed
⏰ 2 tasks due this afternoon

[View Inbox] [Start Planning]
```

### Implementation Tasks

**Step 1: Data Aggregation Service**
- File: `lib/summary-service.ts`
- Functions:
  ```typescript
  async function getDailySummary(date: string) {
    return {
      ideasCaptured: countIdeasCaptured(date),
      ideasConverted: countIdeasConverted(date),
      tasksCompleted: countTasksCompleted(date),
      tasksDueToday: countTasksDue(date),
      aiSuggestionsUsed: countAISuggestions(date)
    }
  }
  ```

**Step 2: CRON Jobs**
- Schedule: 9:00 AM, 12:00 PM, 6:00 PM
- Check if user enabled that time slot
- Generate summary
- Send via ntfy.sh

**Step 3: Smart Summary Logic**
- Don't send if all counts are zero
- Highlight achievements ("Great job! 10 tasks completed")
- Provide actionable suggestions ("You have 5 unsorted ideas")

**Implementation:**
```typescript
// lib/scheduler.ts
cron.schedule('0 9,12,18 * * *', async () => {
  const hour = new Date().getHours()
  const prefs = loadSummaryPreferences()

  if (!shouldSendSummary(hour, prefs)) return

  const summary = await getDailySummary(getTodayDate())

  if (summary.hasActivity) {
    await ntfyService.notifyDailySummary(summary, hour)
  }
})
```

**Files to Create/Modify:**
- Create: `lib/summary-service.ts`
- Modify: `lib/scheduler.ts`
- Modify: `lib/notify.ts` (add `notifyDailySummary` method)
- Modify: `components/modern/settings/NotificationsTab.tsx`

**Testing:**
- [ ] Summaries sent at configured times
- [ ] Empty summaries not sent
- [ ] Counts accurate for each metric
- [ ] Action buttons work
- [ ] User can disable specific times
- [ ] User can choose which metrics to include

---

## Feature 5: Onboarding Wizard/Walkthrough

### Brainstorming Session

#### Common Patterns for Feature Walkthroughs

**Pattern 1: Spotlight/Tooltip Tour**
- Highlights specific UI elements
- Shows tooltips with arrows pointing to features
- "Next" button advances through steps
- Common in web apps (Product Tours, Intro.js, Shepherd.js)
- Example: Slack, Notion, Asana

**Pattern 2: Modal-Based Tutorial**
- Full-screen or centered modal
- Shows screenshots/animations
- Step-by-step slides
- Common in mobile apps
- Example: Instagram, TikTok

**Pattern 3: Interactive Playground**
- Dedicated "Tutorial Mode"
- User actually performs actions
- Provides real-time feedback
- Common in games, design tools
- Example: Figma, Duolingo

**Pattern 4: Progressive Disclosure**
- Features unlock as user progresses
- Contextual hints when user reaches new feature
- No formal walkthrough
- Common in minimalist apps
- Example: Things 3, Bear

#### Recommendation for IdeaListed

**Hybrid Approach: Contextual Spotlight + Quick Start Modal**

**Why:**
- Retro UI fits spotlight overlay aesthetic
- Users learn by doing (interactive)
- Can skip and revisit later
- Doesn't overwhelm with upfront info

### Design Concept

**First Launch Experience:**

```
┌─────────────────────────────────────────────┐
│                                             │
│         Welcome to IdeaListed! 📝            │
│                                             │
│     Your retro idea capture companion       │
│                                             │
│  [🚀 Take a Quick Tour]  [⏭️ Skip for now]   │
│                                             │
│  [ ] Don't show this again                  │
└─────────────────────────────────────────────┘
```

**Tour Steps (5-7 steps):**

1. **Capture Screen** (Spotlight on textarea)
   ```
   ┌─────────────────────────────────┐
   │ 💡 Step 1: Capture Ideas        │
   │                                 │
   │ Type any thought, task, or idea │
   │ No need to organize yet!        │
   │                                 │
   │              [Next →]           │
   └─────────────────────────────────┘
             ↓ (arrow pointing to textarea)
   ```

2. **Buttons** (Spotlight on Unsorted/AI buttons)
   ```
   💡 Step 2: Quick Capture

   "Unsorted" - Save to inbox
   "AI" - Let AI suggest what it is

   [← Back]  [Next →]
   ```

3. **Unsorted Tab** (Spotlight on tab)
   ```
   💡 Step 3: Review Inbox

   All unsorted ideas land here.
   Swipe or click to convert them!

   [← Back]  [Next →]
   ```

4. **Ready Tab** (Spotlight on tab)
   ```
   💡 Step 4: Ready to Act

   Sorted items appear here.
   Your to-do list lives here!

   [← Back]  [Next →]
   ```

5. **Files Tab** (Spotlight on tab)
   ```
   💡 Step 5: Browse All Entities

   Find all your tasks, notes,
   projects, and lists here.

   [← Back]  [Next →]
   ```

6. **Settings** (Spotlight on settings icon)
   ```
   💡 Step 6: Customize Everything

   Enable AI, notifications, themes.
   Make IdeaListed yours!

   [← Back]  [Next →]
   ```

7. **Complete!**
   ```
   🎉 You're ready to go!

   Start capturing your ideas.
   Need help? Visit Settings > Help

   [🚀 Start Using IdeaListed]
   ```

### Implementation Architecture

**Component Structure:**
```
<OnboardingWizard>
  <WelcomeModal /> // First launch
  <TourOverlay>    // Spotlight system
    <TourStep step={currentStep}>
      <Spotlight target={stepTarget} />
      <TourTooltip position="bottom">
        {stepContent}
        <TourButtons />
      </TourTooltip>
    </TourStep>
  </TourOverlay>
</OnboardingWizard>
```

**State Management:**
```typescript
// Stored in localStorage + database
interface OnboardingState {
  hasSeenWelcome: boolean
  hasCompletedTour: boolean
  currentStep: number
  tourSkipped: boolean
  lastSeenVersion: string // Re-show on major updates
}
```

**Tour Trigger Locations:**
1. **Automatic**: First app launch
2. **Manual**: Settings > Help > "Restart Tour"
3. **Contextual**: First time user visits new feature
4. **Version Update**: Show "What's New" tour on updates

### Technical Implementation

**Step 1: Create Spotlight System**
- File: `components/ui/TourSpotlight.tsx`
- Features:
  - SVG overlay with cutout for highlighted element
  - Animated pulsing border around target
  - Prevents interaction with non-highlighted elements
  - Responsive positioning

**Step 2: Tour Content**
- File: `lib/tour-steps.tsx`
- Define all steps:
  ```typescript
  const tourSteps = [
    {
      id: 'capture',
      target: '#capture-textarea',
      title: 'Capture Ideas',
      content: 'Type any thought...',
      position: 'bottom',
      highlightPadding: 16
    },
    // ... more steps
  ]
  ```

**Step 3: Welcome Modal**
- File: `components/modern/WelcomeModal.tsx`
- Show on first launch
- "Take Tour" or "Skip" options
- Checkbox: "Don't show again"

**Step 4: Tour State Management**
- Check `localStorage.hasSeenWelcome` on app load
- Show welcome modal if false
- Track current step
- Save completion state

**Step 5: Settings Integration**
- Add "Help" tab to settings
- Button: "Restart Tour"
- Button: "What's New" (version highlights)
- Checkbox: "Show tips" (contextual hints)

**Files to Create:**
- `components/ui/TourSpotlight.tsx`
- `components/ui/TourTooltip.tsx`
- `components/modern/OnboardingWizard.tsx`
- `components/modern/WelcomeModal.tsx`
- `lib/tour-steps.tsx`
- `lib/tour-state.ts`

### Retro UI Styling

**Spotlight Effect:**
```css
.tour-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 9999;
}

.tour-spotlight {
  /* SVG with cutout */
  animation: pulse-spotlight 2s infinite;
}

@keyframes pulse-spotlight {
  0%, 100% { box-shadow: 0 0 0 4px var(--retro-primary); }
  50% { box-shadow: 0 0 0 8px var(--retro-primary); }
}

.tour-tooltip {
  font-family: var(--font-mono);
  background: var(--palm-bg-primary);
  border: 2px solid var(--retro-border);
  box-shadow: 4px 4px 0 var(--retro-shadow);
}
```

**Welcome Modal:**
```css
.welcome-modal {
  font-family: var(--font-mono);
  background: var(--palm-screen-base);
  border: 4px solid var(--retro-border);
  /* Palm Pilot aesthetic */
}

.welcome-title {
  font-size: 24px;
  letter-spacing: 2px;
  text-transform: uppercase;
}
```

### User Settings Toggle

**Settings > General > Onboarding:**
```
☑ Show onboarding tour on first launch
☑ Show contextual tips
☐ Show what's new on updates

[🔄 Restart Tour]
```

### Testing Strategy

**Test Cases:**
- [ ] Welcome modal shows on first launch
- [ ] Tour advances through all steps
- [ ] Spotlight highlights correct elements
- [ ] Can skip tour at any step
- [ ] Can restart tour from settings
- [ ] "Don't show again" persists
- [ ] Works on mobile and desktop
- [ ] Retro styling matches app aesthetic
- [ ] Keyboard navigation works (Tab, Enter, Esc)

---

## Implementation Order

### Week 1: Foundation
**Priority 1: AI Suggestion Flow**
- Day 1-2: Modify capture flow, add loading states
- Day 3-4: Enhance AISuggestionPanel UI
- Day 5: Testing and refinement

### Week 2: Notifications + Tags
**Priority 2: Task Due Reminders**
- Day 1-2: CRON job for task checking
- Day 3: Notification format and actions
- Day 4: Settings UI

**Priority 3: AI Tag Suggestions**
- Day 5: API endpoint for tag suggestions
- Day 6-7: UI in entity modals

### Week 3: Summary + Onboarding
**Priority 4: Scheduled Summary**
- Day 1-2: Summary aggregation service
- Day 3: CRON jobs for summaries
- Day 4: Settings and testing

**Priority 5: Onboarding Wizard**
- Day 5-6: Spotlight system and tour steps
- Day 7: Welcome modal and settings integration

### Week 4: Polish + Testing
- Day 1-2: End-to-end testing
- Day 3-4: Bug fixes and refinement
- Day 5: Documentation updates
- Day 6-7: Final testing and release prep

---

## Questions for Design Decisions

### AI Suggestion Flow
1. Should suggestion panel be inline or modal?
   - **Recommendation**: Inline (less disruptive)
2. What to show during AI loading?
   - **Recommendation**: Spinner overlay with "Analyzing..." text
3. Allow editing text during AI review?
   - **Recommendation**: Lock as read-only, show "Edit" button to dismiss AI and edit

### Tag Suggestions
1. Auto-suggest on modal open or button-triggered?
   - **Recommendation**: Button-triggered (saves API costs, gives user control)
2. Show confidence scores to user?
   - **Recommendation**: Yes, but subtle (small percentage badge)
3. How many tags to suggest?
   - **Recommendation**: 3-5 tags max

### Task Reminders
1. Default reminder timing?
   - **Recommendation**: 1 hour before (good balance)
2. Snooze options?
   - **Recommendation**: 15min, 30min, 1hr, Custom
3. Should low-priority tasks get reminders by default?
   - **Recommendation**: No (opt-in for low priority)

### Scheduled Summary
1. Which times to send by default?
   - **Recommendation**: Only evening (6pm) by default, others opt-in
2. Minimum activity threshold to send?
   - **Recommendation**: At least 1 action (capture, convert, or complete)
3. Include AI summary in digest?
   - **Recommendation**: Make it optional, costs API call

### Onboarding Wizard
1. Show tour automatically or ask first?
   - **Recommendation**: Ask via welcome modal (less intrusive)
2. How many steps max?
   - **Recommendation**: 5-7 steps (captures essentials without overwhelming)
3. Re-show on major updates?
   - **Recommendation**: Yes, show "What's New" tour for big features

---

## Next Steps

1. **Review this plan** - Any changes to priorities or design decisions?
2. **Confirm design choices** - Answer questions above
3. **Begin implementation** - Start with Week 1 (AI Suggestion Flow)
4. **Create detailed tasks** - Break down each feature into specific development tasks

**Ready to proceed?** Let me know if you want to dive deeper into any specific feature or if you want to adjust priorities!

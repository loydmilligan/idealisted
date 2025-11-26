# Next Sprint: Notification & AI Improvements

**Created**: 2025-11-24
**Priority**: High - Multiple broken/incomplete features

## Sprint Overview

This sprint focuses on fixing broken notification features, completing AI append functionality, and cleaning up settings UX issues.

---

## Phase 1: AI Append to Existing Lists/Projects ⭐ NEW FEATURE

### **Goal**: Enable AI to detect "add X to existing Y" intent and append to existing entities instead of creating new ones.

### Task 1.1: Modify AI Suggestion Flow
**File**: `/app/api/ai/suggest/route.ts`

**Current Behavior**:
- "add eggs to ralphs grocery list" → Creates NEW list with "eggs"
- "add bug tracking to idealisted project" → Creates NEW project

**Desired Behavior**:
- Search database for existing lists/projects matching the name
- If found: Return `suggested_action: "append_to_list"` or `"add_to_project"`
- If not found: Create new entity (current behavior)

**Implementation**:
1. Add database search for existing lists/projects (fuzzy name matching)
2. Return new AISuggestion fields:
   ```typescript
   {
     suggested_action?: 'create_new' | 'append_to_list' | 'add_to_project'
     target_entity_id?: string  // ID of existing list/project
     append_items?: string[]    // Items to add
   }
   ```
3. Update prompt to detect "add X to Y" patterns

**Files to modify**:
- `/app/api/ai/suggest/route.ts` - Add detection logic
- `/types/index.ts` - Add new AISuggestion fields
- `/components/ui/AISuggestionPanel.tsx` - Handle new action types

**Acceptance Criteria**:
- ✅ "add eggs to shopping list" finds existing "Shopping List" and suggests appending
- ✅ "add milk, bread to grocery" finds "Grocery List" and suggests both items
- ✅ "add bug tracking task to MyProject" finds project and suggests new task
- ✅ If no match found, falls back to creating new entity
- ✅ User can accept/reject append suggestion

---

### Task 1.2: Frontend UI for Append Actions
**Files**: `/components/ui/AISuggestionPanel.tsx`, `/components/modern/screens/CaptureScreen.tsx`

**Implementation**:
1. Detect `suggested_action === 'append_to_list'` or `'add_to_project'`
2. Show special UI:
   ```
   ┌─────────────────────────────────────┐
   │ ✓ Found existing list: "Shopping"  │
   │                                     │
   │ Add these items:                    │
   │ • eggs                              │
   │ • milk                              │
   │                                     │
   │ [Append to List] [Create New List] │
   └─────────────────────────────────────┘
   ```
3. On "Append", call `/api/ai/append-list` or `/api/ai/project-suggest`
4. On "Create New", use current flow

**Acceptance Criteria**:
- ✅ Clear indication that existing entity was found
- ✅ User can choose to append or create new
- ✅ Items are added to existing list/project
- ✅ Success message confirms append

---

## Phase 2: Fix AI Tag Suggestions Button

### Task 2.1: Debug Tag Suggestions
**Issue**: "AI suggest tags button is not working"

**Investigation needed**:
1. Check if button appears in entity modals
2. Check if `/api/ai/suggest-tags` endpoint works
3. Check if tag_suggestions feature flag is enabled
4. Check browser console for errors

**Files to check**:
- `/components/modern/modals/TaskModal.tsx`
- `/components/modern/modals/NoteModal.tsx`
- `/components/modern/modals/ProjectModal.tsx`
- `/components/modern/modals/ListModal.tsx`
- `/app/api/ai/suggest-tags/route.ts`

**Acceptance Criteria**:
- ✅ Button appears in all entity modals when AI enabled
- ✅ Clicking button sends request to `/api/ai/suggest-tags`
- ✅ Tags are displayed with confidence scores
- ✅ User can add individual tags or accept all

---

## Phase 3: Fix Event Notifications

### Task 3.1: Debug Event Notifications Not Firing
**Issue**: None of the event notifications work (task completed, entity created, idea captured, etc.)

**Investigation**:
1. Check if notifications are being sent at all
2. Check if ntfy config is correct (you said test notification worked)
3. Check if event handlers are calling notification service
4. Check logs for notification attempts

**Files to investigate**:
- `/lib/notify.ts` - Event notification methods
- `/app/api/items/route.ts` - Should call `ntfyService.notifyEntityCreated()`
- `/app/api/items/[id]/route.ts` - Should call `ntfyService.notifyTaskCompleted()`
- Check PM2 logs for notification attempts

**Likely Issues**:
- Event handlers not calling ntfy service
- Event settings not being checked properly
- Missing await on async calls

**Acceptance Criteria**:
- ✅ Creating entity sends "Entity Created" notification
- ✅ Completing task sends "Task Completed" notification
- ✅ Capturing idea sends "Idea Captured" notification
- ✅ Converting idea sends "Idea Sorted" notification
- ✅ Event toggles in settings actually control notifications

---

## Phase 4: Fix Daily Review Link (404 Issue)

### Task 4.1: Create `/app/review/[date]/route.ts` or Page
**Issue**: Daily review notification links to `http://localhost:3000/review/2025-11-24` which returns 404

**Options**:
1. **Option A**: Create API route that redirects to planner with date selected
2. **Option B**: Create review page that displays the snapshot
3. **Option C**: Change notification link to point to planner directly

**Recommendation**: Option C (simplest)
- Change link from `/review/[date]` to `/planner?date=[date]`
- Or just link to `/` (home/ready tab)

**File to modify**:
- `/lib/review.ts` - Change notification link generation

**Acceptance Criteria**:
- ✅ Clicking review notification link goes to valid page
- ✅ User can see their day's activity

---

## Phase 5: Task Reminders Not Working

### Task 5.1: Debug Task Reminder CRON Job
**Issue**: "I have task reminders enabled and all priorities checked but never received anything"

**Investigation**:
1. Check if CRON job is running (check PM2 logs)
2. Check if tasks with reminders exist in database
3. Check if `last_notified_at` is being updated
4. Check ntfy service calls

**Files to check**:
- `/lib/scheduler.ts` - checkAndNotifyReminders()
- Check database: `SELECT * FROM tasks WHERE reminder_datetime IS NOT NULL`
- Check PM2 logs for "[Reminder]" entries

**Likely Issues**:
- CRON job not running (scheduler not initialized)
- Query filters too strict
- Ntfy service failing silently

**Acceptance Criteria**:
- ✅ Tasks with reminders send notifications at reminder_datetime
- ✅ Priority filter respects settings
- ✅ Quiet hours respected
- ✅ No spam (respects last_notified_at)

---

## Phase 6: Daily Summary Notifications

### Task 6.1: Implement Daily Summary CRON Job
**Issue**: "Never received daily summary notifications"

**Current State**:
- Settings UI exists
- Feature flag exists (`daily_summary`)
- **No implementation** - no CRON job calls this

**Implementation**:
1. Add CRON job to `/lib/scheduler.ts`
   ```typescript
   private initializeDailySummaryCron() {
     // Run at configured times (9 AM, 12 PM, 6 PM)
     // Check if enabled
     // Generate AI summary
     // Send notification
   }
   ```
2. Create `/lib/summary-service.ts` logic (may already exist)
3. Call AI to generate smart summary
4. Send via ntfy

**Files to modify**:
- `/lib/scheduler.ts` - Add CRON job
- `/lib/summary-service.ts` - Summary generation logic
- `/lib/notify.ts` - notifyDailySummary() method

**Acceptance Criteria**:
- ✅ Summaries sent at configured times
- ✅ AI generates contextual summary
- ✅ Toggle in settings works
- ✅ Respects AI master toggle

---

### Task 6.2: Add Test Button for Daily Summary
**Files**: `/components/modern/settings/NotificationsTab.tsx`

**Implementation**:
1. Add "Test Daily Summary" button below summary times checkboxes
2. Calls `/api/summary/test` (create this endpoint)
3. Shows notification immediately

**Acceptance Criteria**:
- ✅ Button sends test summary notification
- ✅ Uses current AI summary logic
- ✅ Shows success/error message

---

### Task 6.3: Add Custom Time Picker for Daily Summary
**Files**: `/components/modern/settings/NotificationsTab.tsx`

**Current**: Only 9 AM, 12 PM, 6 PM checkboxes
**Desired**: Add "Custom" option with time picker

**Implementation**:
```tsx
<label className="retro-checkbox-label">
  <input type="checkbox" ... />
  Custom time
</label>
{customTimeEnabled && (
  <input type="time" value={customTime} onChange={...} />
)}
```

**Acceptance Criteria**:
- ✅ User can select custom time
- ✅ Custom time appears in summary times list
- ✅ CRON job respects custom time

---

## Phase 7: Settings UX Cleanup

### Task 7.1: Review Redundant Settings
**Issue**: "Task reminder preferences seem redundant with event notifications"

**Analysis needed**:
- **Event Notifications**: Per-event toggles (task completed, task due soon, etc.)
- **Task Reminder Preferences**: Global task reminder settings (quiet hours, priority filter, timing)

**Decision needed**:
- Are these actually redundant?
- Or do they serve different purposes?

**Recommendation**: Keep both but clarify:
- **Event Notifications > Task due soon**: Quick reminder when task is due in 1 hour
- **Task Reminder Preferences**: For tasks with explicit reminder_datetime set

**Action**: Add descriptions to clarify difference

---

### Task 7.2: Consolidate AI Feature Toggles
**Issue**: "Shouldn't have to go to two tabs to enable a feature"

**Current State**:
- AI tab: Has feature toggles
- Notifications tab: Has "Daily Summary" settings

**Recommendation**:
- Keep AI feature flags in AI tab
- Keep notification delivery settings in Notifications tab
- Add clear dependency warnings: "Requires AI features enabled in AI tab"

**No code changes needed** - just better UX messaging

---

## Phase 8: Quick Fixes (Already Done ✅)

- ✅ System prompt defaults to sensible value when blank
- ✅ "NOTIF" tab renamed to "NOTIFICATIONS"
- ✅ Daily review grammar fixed: "You converted 3 ideas" instead of "You 3 ideas converted"

---

## Testing Checklist

**Before marking sprint complete, verify**:
- [ ] "add eggs to grocery list" appends to existing list
- [ ] "add task to MyProject" appends to existing project
- [ ] AI tag suggestions button works in all modals
- [ ] Creating entity sends notification
- [ ] Completing task sends notification
- [ ] Daily review link doesn't 404
- [ ] Task reminders send at reminder_datetime
- [ ] Daily summary sends at configured times
- [ ] Test buttons work for all notification types
- [ ] All settings properly save and load

---

## Priority Order

1. **High Priority** (Broken features):
   - Event notifications not working
   - Task reminders not working
   - AI tag suggestions button broken
   - Daily review link 404

2. **Medium Priority** (New features):
   - AI append to existing lists/projects
   - Daily summary CRON implementation

3. **Low Priority** (UX improvements):
   - Custom time picker for summaries
   - Test button for daily summary
   - Settings descriptions/clarifications

---

## Estimated Effort

- **Phase 1** (AI Append): 4-6 hours
- **Phase 2** (Tag button): 1-2 hours
- **Phase 3** (Event notifications): 2-3 hours
- **Phase 4** (Review link): 30 minutes
- **Phase 5** (Task reminders): 1-2 hours
- **Phase 6** (Daily summary): 3-4 hours
- **Phase 7** (Settings cleanup): 1 hour

**Total**: 13-19 hours of work

---

## Notes

- All broken notification features suggest a systemic issue - likely event handlers not calling ntfy service
- Consider adding integration tests for notification flows
- May want to add notification history/log to help debug issues

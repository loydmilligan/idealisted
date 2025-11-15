# AI and Notification Features - Task Breakdown

**Master Plan**: See `AI_AND_NTFY_PLAN.md` for high-level phase overview
**Reference**: See `reference-IMPLEMENTATION_UPDATES_V2.md` for scope decisions

---

## Phase 1: Database Foundation ✅ COMPLETE

**Status**: Complete (2025-01-14)
**Documentation**: `docs/.implementation/phase1/`

### Task 1.1: Add Usage Tracking Columns to Tags Table ✅
- Add usage_count (INTEGER DEFAULT 0)
- Add is_default (INTEGER DEFAULT 0)
- Add last_used_at (INTEGER)
- Add index on usage_count DESC
- **Implementation**: lib/db.ts:193-222, 233

### Task 1.2: Seed Default Starter Tags ✅
- Create seedDefaultTags() function
- Seed 25 tags across 4 categories
- All tags with is_default=1, color=#999999
- **Implementation**: lib/db.ts:19-80, 302

### Task 1.3: Add Reminder Columns to Tasks Table ✅
- Add reminder_datetime (INTEGER)
- Add last_notified_at (INTEGER)
- **Implementation**: lib/db.ts:156-175

### Task 1.4: Create AI Feature Settings Table ✅
- Create ai_feature_settings table
- Create seedAIFeatureSettings() function
- Seed 3 features (suggestion_panel, tag_suggestions, daily_summary)
- **Implementation**: lib/db.ts:82-116, 266-273, 369

### Task 1.5: Update TypeScript Type Definitions ✅
- Add Tag interface (8 fields)
- Add AIFeatureSetting interface (3 fields)
- Update Task interface with reminder fields
- **Implementation**: types/index.ts:42-51, 81-92, 166-170

---

## Phase 2: AI Settings UI ✅ COMPLETE

**Status**: Complete (2025-11-14)
**Dependencies**: Phase 1 complete ✅
**Documentation**: `docs/.implementation/phase2/`

### Task 2.1: Create AI Feature Settings API ✅
**Objective**: REST endpoints for managing ai_feature_settings table

**Deliverables**:
- GET `/api/ai-features` - Fetch all feature settings
- PUT `/api/ai-features` - Update specific feature(s)
- Return format: `{ feature_name, enabled, description }[]`

**Files Created**:
- `app/api/ai-features/route.ts` (95 lines)

**Success Criteria**: ✅ 11/11 passed
- ✅ GET returns all 3 features with correct state
- ✅ PUT updates database successfully
- ✅ Changes persist across server restarts
- ✅ Proper error handling
- ✅ Validation and proper HTTP status codes

**Dependencies**: None

---

### Task 2.2: Update AISettingsTab with Feature Toggles ✅
**Objective**: Add UI section for individual AI feature toggles

**Deliverables**:
- "AI Features" section below master toggle
- 3 feature toggles with descriptions:
  - ☑ AI Suggestion Panel
  - ☑ AI Tag Suggestions
  - ☐ AI Daily Summary
- Toggles disabled when master AI toggle is off
- Load/save via `/api/ai-features` endpoint

**Files Modified**:
- `components/modern/settings/AISettingsTab.tsx` (408 lines)

**UI Layout**:
```
Master Toggle: ☑ Enable AI features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURES

☑ AI Suggestion Panel
  Preview AI analysis before creating items.
  Shows confidence score and metadata.

☑ AI Tag Suggestions
  AI-powered tag recommendations when creating
  or editing entities. Prioritizes existing tags.

☐ AI Daily Summary
  AI-generated summary in daily review notification.
  Requires notifications enabled.
```

**Success Criteria**: ✅ 11/11 passed
- ✅ Feature toggles render correctly with proper labels
- ✅ Descriptions match spec exactly
- ✅ Toggles disabled when master off
- ✅ Settings save and reload correctly
- ✅ UI matches retro theme
- ✅ Loading states and error handling

**Dependencies**: Task 2.1 (API endpoint) ✅

---

### Task 2.3: Implement Feature Flag Checking Logic ✅
**Objective**: Add feature flag checks in AI processing flow

**Deliverables**:
- Update AIService with `isFeatureEnabled(featureName)` method
- Load ai_feature_settings from database
- Gate AI operations by feature flag:
  - suggestion_panel: Check before showing AISuggestionPanel
  - tag_suggestions: Check before calling suggestTags()
  - daily_summary: Check before generating summaries

**Files Modified**:
- `lib/ai.ts` - Added isFeatureEnabled() method (296 lines)
- `components/ui/AISuggestionPanel.tsx` - Feature flag check (198 lines)
- `components/modern/EntityModal.tsx` - Tag suggestions gating (278 lines)
- `lib/review.ts` - Daily summary check (259 lines)
- `app/api/ai/suggest/route.ts` - Route-level protection (234 lines)

**Implementation Approach**:
```typescript
// lib/ai.ts
async isFeatureEnabled(featureName: string): Promise<boolean> {
  if (!this.config.enabled) return false // Master toggle check

  const feature = db.prepare(`
    SELECT enabled FROM ai_feature_settings WHERE feature_name = ?
  `).get(featureName)

  return feature?.enabled === 1
}
```

**Success Criteria**: ✅ 9/9 passed
- ✅ isFeatureEnabled() method works correctly
- ✅ Two-tier checking (master + individual)
- ✅ Disabling suggestion_panel hides AISuggestionPanel
- ✅ Tag suggestions prepared for Phase 4
- ✅ Daily summary gated correctly
- ✅ Clear error messages when feature disabled
- ✅ Defense-in-depth (route + component level)
- ✅ Fail-closed error handling

**Dependencies**: Task 2.1 (API endpoint) ✅

---

### Task 2.4: Enhanced Test Connection ✅
**Objective**: Improve test connection to show feature status

**Deliverables**:
- Test shows which features are enabled
- Verify API key works with selected model
- Better error messages (401, 429, 500)
- Display feature availability in test results

**Files Modified**:
- `components/modern/settings/AISettingsTab.tsx` - Enhanced handleTest() method
- `styles/retro.css` - Multi-line message support confirmed

**Enhanced Test Output**:
```
✓ API Key Valid
✓ Model: anthropic/claude-3-haiku
✓ Features Enabled: 2/3
  - AI Suggestion Panel: ✓
  - AI Tag Suggestions: ✓
  - AI Daily Summary: ✗ (disabled)
```

**Success Criteria**: ✅ 5/5 passed
- ✅ Test verifies API key works
- ✅ Shows enabled/disabled feature status
- ✅ Better error messages for common failures (401, 429, 500)
- ✅ Test results formatted clearly with multi-line support
- ✅ Parallel API requests for efficiency

**Dependencies**: Task 2.2 (feature toggle UI) ✅

---

## Phase 3: AI Suggestion Flow

**Status**: Not Started
**Dependencies**: Phase 2 complete

### Task 3.1: Modify Capture Flow for Preview-First
**Objective**: AI processes BEFORE item creation

**Deliverables**:
- Update handleAICapture in capture screen
- Add loading states
- Call /api/ai/suggest BEFORE creating item
- Show AISuggestionPanel with results

**Files to Modify**:
- `app/page.tsx` or capture screen component
- `components/modern/screens/CaptureScreen.tsx`

**Success Criteria**:
- AI button triggers analysis without creating item
- Loading state shows during processing
- Textarea becomes read-only during analysis
- Falls back gracefully on error

---

### Task 3.2: Enhance AISuggestionPanel Component
**Objective**: Display comprehensive AI analysis results

**Deliverables**:
- Show confidence score (visual bar)
- Display AI reasoning (1-2 sentences)
- Show suggested entity type with icon
- Display extracted metadata (tags, due date, priority)
- Action buttons for each entity type
- Dismiss button

**Files to Modify**:
- `components/ui/AISuggestionPanel.tsx`

**Success Criteria**:
- All AI analysis data displayed clearly
- Confidence bar visual and accurate
- Reasoning shown in readable format
- Metadata displayed appropriately

---

### Task 3.3: Implement Accept/Override/Dismiss Logic
**Objective**: User can review and act on AI suggestions

**Deliverables**:
- Accept button creates item with suggested type + metadata
- Override buttons allow changing entity type
- Dismiss button returns to normal capture flow
- Clear textarea after successful creation

**Files to Modify**:
- Capture screen component
- AISuggestionPanel

**Success Criteria**:
- Accept creates item correctly
- Override changes type but keeps metadata
- Dismiss clears panel and re-enables input
- Textarea cleared on success

---

### Task 3.4: Add Loading States and Error Handling
**Objective**: Clear feedback during AI processing

**Deliverables**:
- Spinner overlay on textarea
- "Analyzing with AI..." message
- Disable all buttons during processing
- Error messages for failed analysis
- Fallback to manual sorting on error

**Success Criteria**:
- Loading state shows immediately on AI click
- User knows processing is happening
- Errors displayed clearly
- Graceful fallback on failure

---

## Phase 4: AI Tag Suggestions

**Status**: Not Started
**Dependencies**: Phase 2 complete (feature flags), Phase 1 complete (tags table)

### Task 4.1: Create /api/ai/suggest-tags Endpoint
**Objective**: AI-powered tag suggestions with existing tag reuse

**Deliverables**:
- POST endpoint accepting entity text and type
- Fetch top 50 existing tags by usage
- Include existing tags in AI prompt
- Parse AI response
- Return tags with source indicator (existing vs new)

**Files to Create**:
- `app/api/ai/suggest-tags/route.ts`

**AI Prompt Strategy**:
- Request 3-5 tags total
- Instruction: Include 1-3 from existing pool if confidence >= 70%
- Return JSON with tag, source, confidence, reason

**Success Criteria**:
- Endpoint returns 3-5 tag suggestions
- Existing tags prioritized when relevant
- Source field indicates existing vs new
- Confidence scores included

---

### Task 4.2: Implement Existing Tag Reuse Logic
**Objective**: Prioritize tags user already has

**Deliverables**:
- Query top 50 tags by usage_count
- Include in AI prompt context
- AI returns mix of existing and new tags
- Track which suggestions are accepted

**Files to Modify**:
- `app/api/ai/suggest-tags/route.ts`
- `lib/ai.ts` (if shared logic)

**Success Criteria**:
- Existing tags appear in suggestions when relevant
- New tags only when existing don't fit
- Confidence threshold (70%) enforced

---

### Task 4.3: Update EntityModal UI with Tag Suggestions
**Objective**: UI for requesting and applying tag suggestions

**Deliverables**:
- "Suggest Tags" button below tag input
- Loading state while fetching suggestions
- Display suggested tags with confidence %
- Visual indicator: existing (●) vs new (○)
- Individual click-to-add buttons
- "Accept All" button

**Files to Modify**:
- `components/modern/EntityModal.tsx`

**UI Design**:
```
Tags: [#work] [#urgent] [+]
      [🤖 Suggest Tags]

AI Suggestions:           [Accept All]
[+ #planning 95% ●] [+ #project 88% ○]
[+ #deadline 75% ●]

Existing: ●  New: ○
```

**Success Criteria**:
- Button triggers tag suggestion API
- Suggestions display with all metadata
- Click individual tag to add
- "Accept All" adds all suggestions
- Duplicates not added
- Works for all entity types

---

### Task 4.4: Implement "Accept All" and Individual Add
**Objective**: Easy tag application

**Deliverables**:
- Click individual tag chip to add
- "Accept All" adds all suggested tags at once
- Already-added tags grayed out
- Update tag list in modal

**Success Criteria**:
- Individual add works
- Accept All adds all tags
- No duplicate tags
- UI updates immediately

---

## Phase 5: Task Reminders

**Status**: Not Started
**Dependencies**: Phase 1 complete (reminder_datetime column)

### Task 5.1: Add Reminder DateTime UI to Task Modal
**Objective**: User can set when to be reminded

**Deliverables**:
- Reminder checkbox in task modal
- Date + time picker for reminder_datetime
- Quick options: Morning of, 1hr before, 1 day before, Custom
- Display relative time ("1 hour before due")

**Files to Modify**:
- `components/modern/EntityModal.tsx` (Task modal section)

**Success Criteria**:
- Checkbox enables reminder picker
- Quick options set datetime correctly
- Custom picker allows any datetime
- Relative time displayed clearly

---

### Task 5.2: Implement Quick Reminder Options
**Objective**: Fast reminder time selection

**Deliverables**:
- "Morning of" - Due date at 9:00 AM
- "1 hour before" - Due date minus 1 hour
- "1 day before" - Due date minus 24 hours at 9:00 AM
- "Custom" - Full datetime picker

**Success Criteria**:
- Each option calculates datetime correctly
- UI updates to show selected time
- Saves reminder_datetime to database

---

### Task 5.3: Create CRON Job for Reminder Checks
**Objective**: Periodic check for upcoming task reminders

**Deliverables**:
- CRON job runs every 15 minutes
- Query tasks with reminder_datetime in window
- Filter by status (not done)
- Check last_notified_at to prevent duplicates
- Send notification via NTFY
- Update last_notified_at

**Files to Create/Modify**:
- `lib/scheduler.ts` - CRON job logic
- `lib/notify.ts` - NTFY integration

**Success Criteria**:
- CRON runs reliably every 15 minutes
- Only upcoming tasks notified
- No duplicate notifications
- last_notified_at updated correctly

---

### Task 5.4: Notification Integration
**Objective**: Send task reminders via NTFY

**Deliverables**:
- Format: "⏰ Task Due Soon: {task text}"
- Include due time in message
- Action buttons: Mark Complete, Snooze, View
- Respect quiet hours setting

**Files to Modify**:
- `lib/notify.ts`

**Success Criteria**:
- Notifications sent successfully
- Message format clear
- Action buttons work (if implemented)
- Quiet hours respected

---

## Phase 6: Scheduled Summary

**Status**: Not Started
**Dependencies**: Phase 1 complete (ai_feature_settings), Phase 2 complete (feature flags)

### Task 6.1: Create Summary Aggregation Service
**Objective**: Collect daily activity metrics

**Deliverables**:
- Count ideas captured today
- Count ideas converted today
- Count tasks completed today
- Count tasks due today
- Optional: AI-generated insights

**Files to Create**:
- `lib/summary-service.ts`

**Success Criteria**:
- All metrics calculated correctly
- Efficient database queries
- Returns structured summary object

---

### Task 6.2: Implement CRON Jobs for Scheduled Times
**Objective**: Send summaries at configured times

**Deliverables**:
- CRON jobs for 9am, 12pm, 6pm
- Check if user enabled that time slot
- Generate summary
- Send via NTFY if activity exists

**Files to Modify**:
- `lib/scheduler.ts`

**Success Criteria**:
- Jobs run at correct times
- Only send if user opted in
- Don't send empty summaries

---

### Task 6.3: Design Notification Format
**Objective**: Clear, actionable summary notifications

**Deliverables**:
- Title: "📊 {Time} Summary - {Date}"
- Message with metrics
- Action buttons: View Inbox, Start Planning

**Files to Modify**:
- `lib/notify.ts`

**Success Criteria**:
- Format readable and useful
- Metrics accurate
- Actions functional

---

### Task 6.4: Create Settings UI for Summary Preferences
**Objective**: User controls when to receive summaries

**Deliverables**:
- Enable/disable activity summaries
- Choose which times (9am/12pm/6pm)
- Select which metrics to include

**Files to Create/Modify**:
- `components/modern/settings/NotificationsTab.tsx`

**Success Criteria**:
- UI clear and intuitive
- Settings save correctly
- CRON jobs respect preferences

---

## Phase 7: Onboarding Wizard

**Status**: Not Started
**Dependencies**: All features complete

### Task 7.1: Create Spotlight/Tooltip System
**Objective**: Interactive tour overlay system

**Deliverables**:
- TourSpotlight component (SVG overlay with cutout)
- TourTooltip component (step content display)
- Animated pulsing border around target
- Prevents interaction with non-highlighted elements

**Files to Create**:
- `components/ui/TourSpotlight.tsx`
- `components/ui/TourTooltip.tsx`

**Success Criteria**:
- Spotlight highlights correct elements
- Tooltip positions correctly
- Animations smooth
- Blocks interaction appropriately

---

### Task 7.2: Create Welcome Modal
**Objective**: First launch greeting

**Deliverables**:
- Welcome modal on first app launch
- "Take Tour" button
- "Skip for now" button
- "Don't show again" checkbox

**Files to Create**:
- `components/modern/WelcomeModal.tsx`

**Success Criteria**:
- Shows on first launch only
- Buttons work correctly
- Preference saves

---

### Task 7.3: Define Tour Steps
**Objective**: Content for each tour step

**Deliverables**:
- 7-8 tour steps with content
- Step 1: Capture screen
- Step 2: Buttons
- Step 3: AI Suggestions (conditional)
- Step 4: Unsorted tab
- Step 5: Ready tab
- Step 6: Files tab
- Step 7: Settings
- Step 8: Complete

**Files to Create**:
- `lib/tour-steps.tsx`

**Success Criteria**:
- All steps defined
- Content clear and helpful
- AI step conditional on enabled

---

### Task 7.4: Add Settings Integration for "Restart Tour"
**Objective**: User can replay tour anytime

**Deliverables**:
- "Help" section in settings
- "Restart Tour" button
- Tour state management (localStorage + database)

**Files to Modify**:
- Settings component
- `lib/tour-state.ts` (new)

**Success Criteria**:
- Button restarts tour from beginning
- State tracked correctly
- Can skip or complete tour

---

## Task Dependencies Summary

**Phase 2**:
- 2.1 → 2.2 (API needed for UI)
- 2.2 → 2.3 (UI first, then logic)
- 2.2 → 2.4 (test enhancement needs UI)

**Phase 3**:
- 3.1 → 3.2 → 3.3 (sequential flow)
- 3.4 can be done alongside 3.1-3.3

**Phase 4**:
- 4.1 → 4.2 → 4.3 → 4.4 (sequential)

**Phase 5**:
- 5.1 → 5.2 (UI first)
- 5.3 independent
- 5.4 depends on 5.3

**Phase 6**:
- 6.1 → 6.2 → 6.3 (sequential)
- 6.4 independent

**Phase 7**:
- 7.1 → 7.2 → 7.3 → 7.4 (sequential)

---

**Last Updated**: 2025-11-14
**Current Status**: Phase 2 Complete ✅ (Tasks 2.1-2.4)
**Next Tasks**: Phase 3 (Tasks 3.1-3.4)

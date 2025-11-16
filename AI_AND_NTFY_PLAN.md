# AI and Notification Features - Implementation Plan

**Sprint**: Post-Beta AI & NTFY Integration
**Started**: 2025-01-14
**Status**: Phase 1 Complete ✅, Phase 2 Complete ✅, Phase 4 Complete ✅, Phase 5 Tasks 5.1 ✅ and 5.3 ✅ Complete

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

## Phase 3: AI Suggestion Flow

**Status**: In Progress (Tasks 3.1 ✅, 3.2 ✅, and 3.3 ✅ Complete)
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

**What Will Be Built (Remaining Tasks)**:
- Loading state enhancements - Spinner overlays, retry buttons (Task 3.4)

**User Experience**:
1. User types idea and clicks "AI" button
2. Loading state appears ("Analyzing with AI...")
3. Suggestion panel shows: confidence, type, reasoning, extracted metadata
4. User can accept, change type, or dismiss
5. Item created with AI-extracted metadata (buttons disabled during creation)
6. Success feedback via tab flash animation, or error alert with retry option

**Key Feature**: Preview-first (no more auto-creating items before AI review) ✅ Implemented

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

**Status**: Not Started
**Dependencies**: Phase 1 complete (ai_feature_settings with daily_summary)

**Purpose**: Periodic digest notifications of user activity.

**What Will Be Built**:
- Summary aggregation service
- CRON jobs for scheduled times (9am, 12pm, 6pm)
- NTFY notification format
- Settings UI for summary preferences

**Summary Includes**:
- Ideas captured today
- Ideas converted today
- Tasks completed today
- Tasks due today
- Optional: AI-generated insights

**Smart Logic**:
- Don't send if no activity
- Highlight achievements
- Provide actionable suggestions

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
- [ ] Phase 3: AI Suggestion Flow (Tasks 3.1 ✅, 3.2 ✅, and 3.3 ✅ Complete, Task 3.4 Remaining)
- [x] Phase 4: AI Tag Suggestions ✅
- [ ] Phase 5: Task Reminders (Tasks 5.1 ✅ and 5.3 ✅ Complete, Task 5.4 Optional)
- [ ] Phase 6: Scheduled Summary
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

**Last Updated**: 2025-11-15
**Current Phase**: Phase 3 In Progress (Tasks 3.1 ✅, 3.2 ✅, and 3.3 ✅ Complete), Phase 5 In Progress (Tasks 5.1 ✅ and 5.3 ✅ Complete)
**Next Phase**: Phase 3 Task 3.4 (Loading state enhancements) or Phase 5 Task 5.4 (optional settings UI)

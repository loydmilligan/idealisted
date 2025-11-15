# AI and Notification Features - Implementation Plan

**Sprint**: Post-Beta AI & NTFY Integration
**Started**: 2025-01-14
**Status**: Phase 1 Complete ✅, Phase 2 Complete ✅

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
**Commit**: eac26fe "Complete Phase 1: Database Foundation (all 5 tasks)"

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
**Commit**: c015cd6 "Complete Phase 2: AI Settings UI (all 4 tasks)"
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

**Status**: Not Started
**Dependencies**: Phase 2 complete

**Purpose**: Implement preview-first AI suggestion workflow in capture screen.

**What Will Be Built**:
- Modified capture flow - AI processes BEFORE item creation
- Enhanced AISuggestionPanel - Shows confidence, reasoning, metadata
- Accept/override/dismiss logic - User reviews AI suggestions
- Loading states - Clear feedback during AI processing

**User Experience**:
1. User types idea and clicks "AI" button
2. Loading state appears ("Analyzing with AI...")
3. Suggestion panel shows: confidence, type, reasoning, extracted metadata
4. User can accept, change type, or dismiss
5. Item created with AI-extracted metadata

**Key Feature**: Preview-first (no more auto-creating items before AI review)

---

## Phase 4: AI Tag Suggestions

**Status**: Not Started
**Dependencies**: Phase 2 complete (feature flags), Phase 1 complete (tags table)

**Purpose**: AI-powered tag suggestions that prioritize existing tags.

**What Will Be Built**:
- `/api/ai/suggest-tags` endpoint
- Existing tag reuse logic (1-3 from pool if confidence >= 70%)
- EntityModal tag suggestion UI
- "Accept All" + individual click-to-add buttons

**AI Prompt Strategy**:
- Request 3-5 tags total
- Include top 50 existing tags by usage in prompt
- Prioritize existing tags when confidence high
- Return with source indicator (existing vs new)

**UI Features**:
- Button-triggered (not auto-suggest on open)
- Shows confidence scores
- Visual indicator for existing (●) vs new (○) tags
- One-click add individual or all

---

## Phase 5: Task Reminders

**Status**: Not Started
**Dependencies**: Phase 1 complete (reminder_datetime column)

**Purpose**: NTFY-based task due reminders with configurable timing.

**What Will Be Built**:
- Task modal reminder datetime picker
- Quick options (Morning of, 1hr before, 1 day before, Custom)
- CRON job for reminder checks (every 15 minutes)
- NTFY notification integration
- Settings UI for reminder preferences

**Notification Format**:
- Title: "⏰ Task Due Soon"
- Message: Task text + due time
- Actions: Mark Complete, Snooze, View Task

**Configuration Options**:
- Default reminder timing
- Priority filtering (high/medium/low)
- Quiet hours (22:00 - 08:00)

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
- [ ] All tasks in phase complete
- [ ] Code review passed
- [ ] Tests passing (where applicable)
- [ ] Documentation updated
- [ ] Changes committed to git
- [ ] Phase marked complete in this document

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

**Last Updated**: 2025-11-14
**Current Phase**: Phase 2 Complete ✅
**Next Phase**: Phase 3 (AI Suggestion Flow)

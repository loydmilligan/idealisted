# Phase 2: AI Settings UI - Implementation Plan

**Status**: Planning
**Dependencies**: Phase 1 complete ✅ (ai_feature_settings table exists)

---

## Overview

Phase 2 enhances the AI Settings UI to include feature-specific toggles for granular control over AI features. This builds on the Phase 1 database foundation (ai_feature_settings table) and the existing master AI toggle system.

---

## Current State (From Exploration)

### Existing Implementation
- ✅ AISettingsTab component with master toggle (`/components/modern/settings/AISettingsTab.tsx`)
- ✅ Master `enabled` flag in AIConfig controls all AI features
- ✅ Settings API (`/app/api/settings/route.ts`) with GET/PUT endpoints
- ✅ AI disabled by default (user's top priority - confirmed working)
- ✅ Component gating (EntityModal, InboxCard check enabled flag)
- ✅ Test connection button (tests `/api/ai/suggest` endpoint)

### What's Missing
- ❌ UI for individual feature toggles (ai_feature_settings table not wired to UI)
- ❌ API endpoint for managing ai_feature_settings
- ❌ Feature flag checking in AI processing logic
- ❌ UI explanations for what each feature does

---

## Phase 2 Tasks Breakdown

### Task 2.1: Create AI Feature Settings API
**Objective**: Create REST API endpoints to manage ai_feature_settings table

**Deliverables**:
- GET `/api/ai-features` - Fetch all feature settings
- PUT `/api/ai-features` - Update specific feature(s)
- Return format: `{ feature_name, enabled, description }[]`

**Files to Create/Modify**:
- `app/api/ai-features/route.ts` (NEW)

**Dependencies**: None (table exists from Phase 1)

---

### Task 2.2: Update AISettingsTab with Feature Toggles
**Objective**: Add UI section for individual AI feature toggles below master toggle

**Deliverables**:
- "AI Features" section in AISettingsTab
- 3 feature toggles with descriptions:
  - ☑ AI Suggestion Panel - "Preview AI analysis before creating items"
  - ☑ AI Tag Suggestions - "AI-powered tag recommendations"
  - ☐ AI Daily Summary - "AI summary in daily review notifications"
- Toggles disabled when master AI toggle is off
- Load/save feature settings via new API endpoint

**Files to Modify**:
- `components/modern/settings/AISettingsTab.tsx`

**Dependencies**: Task 2.1 (API endpoint)

**UI Design**:
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
│ FEATURES                                                     │
│                                                              │
│ ☑ AI Suggestion Panel                                       │
│   Preview AI analysis before creating items. Shows          │
│   confidence score and extracted metadata.                  │
│                                                              │
│ ☑ AI Tag Suggestions                                        │
│   Get AI-powered tag suggestions when creating or editing   │
│   entities. Prioritizes tags you already use.               │
│                                                              │
│ ☐ AI Daily Summary                                          │
│   Include an AI-generated summary in your daily review      │
│   notification. Requires notifications enabled.             │
│                                                              │
│ [Save Settings]                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Task 2.3: Implement Feature Flag Checking Logic
**Objective**: Add feature flag checks in AI processing flow to respect individual feature toggles

**Deliverables**:
- Update AIService to load and check ai_feature_settings
- Add `isFeatureEnabled(featureName)` method to AIService
- Gate specific AI operations by feature flag:
  - Suggestion panel: Check before showing AISuggestionPanel
  - Tag suggestions: Check before calling suggestTags()
  - Daily summary: Check before generating summaries

**Files to Modify**:
- `lib/ai.ts` (AIService class)
- `components/ui/AISuggestionPanel.tsx` (conditionally render based on feature flag)
- `components/modern/EntityModal.tsx` (check tag_suggestions feature)

**Dependencies**: Task 2.1 (API endpoint to fetch feature settings)

---

### Task 2.4: Enhanced Test Connection
**Objective**: Improve test connection to verify API key AND feature availability

**Deliverables**:
- Test connection shows which features are enabled
- Verify API key works with selected model
- Show feature status in test results
- Better error messages for common issues (401, 429, 500)

**Files to Modify**:
- `components/modern/settings/AISettingsTab.tsx` (test button handler)
- Possibly `app/api/ai/suggest/route.ts` (test endpoint)

**Dependencies**: Task 2.2 (feature toggle UI)

---

## Implementation Order

**Sequential Dependencies**:
1. Task 2.1 (API) → Task 2.2 (UI) → Task 2.3 (Feature flags) → Task 2.4 (Test enhancement)

**Critical Path**:
- Task 2.1 must complete before Task 2.2 (UI needs API)
- Task 2.2 should complete before Task 2.3 (UI first, then logic)
- Task 2.4 can be done anytime after Task 2.2

---

## Success Criteria

### Task 2.1: API Endpoints
- [ ] GET `/api/ai-features` returns all 3 features with correct state
- [ ] PUT `/api/ai-features` updates feature enabled status
- [ ] Database updates persist across server restarts
- [ ] API handles errors gracefully

### Task 2.2: UI Implementation
- [ ] Feature toggles appear in AISettingsTab
- [ ] All 3 features shown with descriptions
- [ ] Toggles disabled when master AI toggle is off
- [ ] Settings save and reload correctly
- [ ] UI matches design spec

### Task 2.3: Feature Flags
- [ ] AIService checks feature flags before operations
- [ ] Disabling suggestion_panel hides AISuggestionPanel
- [ ] Disabling tag_suggestions prevents tag API calls
- [ ] Daily summary feature gated correctly
- [ ] Error messages clear when feature disabled

### Task 2.4: Test Enhancement
- [ ] Test connection verifies API key works
- [ ] Shows which features are enabled
- [ ] Better error messages for common failures
- [ ] Test results show feature availability

---

## Files to Create

1. `app/api/ai-features/route.ts` - AI feature settings API endpoints
2. `docs/.implementation/phase2/README.md` - Phase 2 documentation
3. `docs/.implementation/phase2/context-task-2-*.md` - Context packs (4 tasks)
4. `docs/.implementation/phase2/task-2-*.md` - Task instruction files (4 tasks)

---

## Files to Modify

1. `components/modern/settings/AISettingsTab.tsx` - Add feature toggles UI
2. `lib/ai.ts` - Add feature flag checking logic
3. `components/ui/AISuggestionPanel.tsx` - Conditional rendering based on feature
4. `components/modern/EntityModal.tsx` - Check tag_suggestions feature

---

## Testing Strategy

### Unit Testing
- API endpoints return correct data
- Feature toggles update database correctly
- AIService feature flag logic works

### Integration Testing
- Master toggle disables all features
- Individual feature toggles work independently
- Settings persist across sessions
- Feature gates work in UI components

### Manual Testing
1. Fresh install: Verify features have correct defaults
2. Toggle master AI: Verify all features disable
3. Toggle individual features: Verify specific functionality gates
4. Test connection: Verify API key validation works
5. Restart server: Verify settings persist

---

## Notes

- **User Priority**: AI disabled by default is already working (confirmed in exploration)
- **Backward Compatibility**: Existing AI config continues to work
- **Database Schema**: Already complete from Phase 1
- **No Breaking Changes**: All changes are additive

---

## Ready for Context Pack Generation

Phase 2 plan complete. Ready to generate context packs for all 4 tasks.

# Task 2.2: Update AISettingsTab with Feature Toggles

## Context Bundle
**Read**: `docs/.implementation/phase2/context-task-2-2-settings-ui.md` (comprehensive UI guide)

## Task Summary
Add feature toggle UI section to AISettingsTab component for managing individual AI features.

## Deliverables

### 1. Update Component File
**File**: `components/modern/settings/AISettingsTab.tsx`

**Add**:
- State for loading/saving feature settings
- Feature toggle checkboxes (3 features)
- Feature descriptions matching spec
- Load from `/api/ai-features` on mount
- Save to `/api/ai-features` on submit

### 2. UI Layout (from spec)

```
Master Toggle: ☑ Enable AI features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURES

☑ AI Suggestion Panel
  Preview AI analysis before creating items.

☑ AI Tag Suggestions
  AI-powered tag recommendations when creating
  or editing entities. Prioritizes existing tags.

☐ AI Daily Summary
  AI-generated summary in daily review notification.
  Requires notifications enabled.
```

### 3. Behavior Requirements

- Feature toggles disabled when master AI toggle is off
- Load feature settings from API on mount
- Save both ai_config AND feature settings together
- Use retro styling classes from context

## Success Criteria

**UI**:
- [ ] 3 feature toggles render with correct labels
- [ ] Descriptions match spec exactly
- [ ] Toggles disabled when master toggle off
- [ ] Retro styling consistent with existing UI

**Functionality**:
- [ ] Loads current feature states from API
- [ ] Saves changes to API correctly
- [ ] Settings persist across page reloads
- [ ] No console errors

**UX**:
- [ ] Loading state during API calls
- [ ] Success message after save
- [ ] Error handling with user feedback

## Testing
Manual testing steps provided in context bundle.

## Dependencies
Task 2.1 complete (API endpoint must exist).

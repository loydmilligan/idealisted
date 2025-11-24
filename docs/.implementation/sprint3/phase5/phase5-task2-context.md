# Context: P5-T2 — AI append preview UI

Purpose: Add an "Append with AI" button to the list viewer/editor that triggers the AI append endpoint and displays suggestions in a preview panel before committing.

## Key Decisions

- From plan: Preview-first pattern means user sees suggestions before any changes are made.
- Button only visible when AI is enabled (master toggle + feature flag).
- Preview panel shows checkable list of suggestions with confidence indicators.
- User can accept all, accept individual items, regenerate, or cancel.
- Loading state while AI processes; inline error messaging (no browser alerts).

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 5: AI Append Flows).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P5-T2 steps).
- List viewer component: Search for list editor/viewer in `components/` or `app/`.
- AI gating pattern: Check `ai_config.enabled` from settings context.
- Similar UI pattern: `components/AISuggestionPanel.tsx` if exists, or entity modals.
- Retro styling: Use existing retro component patterns from `components/ui/`.

## Implementation Notes

- Locate list viewer/editor component (likely in modern/ or modals).
- Add "Append with AI" button conditionally rendered when AI enabled.
- On click: show loading spinner, call `/api/ai/append-list` with list_id.
- Display preview panel overlay or inline:
  - List of suggestions as checkboxes (default checked)
  - Show confidence as subtle indicator (high/medium/low or %)
  - "Accept Selected" primary action button
  - "Regenerate" secondary button to get new suggestions
  - "Cancel" to close without changes
- Handle empty suggestions gracefully ("No suggestions available").
- Pass accepted items to parent/next task for persistence.

## Testing/QA

- Button hidden when AI disabled in settings.
- Loading state visible during API call.
- Preview panel displays suggestions correctly.
- Checkboxes work; can select/deselect individual items.
- Accept Selected button disabled when nothing selected.
- Cancel closes panel without side effects.
- Regenerate fetches new suggestions.
- Error messages display inline (not browser alerts).

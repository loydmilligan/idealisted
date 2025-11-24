# Prompt: P6-T1 — Recap mode settings

Context: docs/.implementation/sprint3/phase6/phase6-task1-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 6), docs/.implementation/sprint3/tasks.md (P6-T1)

Goal
- Add settings UI for recap mode selection and configuration, with helper library for reading config.

Deliverables
- Settings UI section for "Daily Recap" with mode selector, threshold input, and enable toggle.
- Database persistence via existing settings API pattern.
- `lib/recap-config.ts` with `getRecapMode()`, `getActivityThreshold()`, `isRecapEnabled()` helpers.
- TypeScript type for RecapConfig.

Implementation steps (from tasks)
1) Add `RecapConfig` type to `types/index.ts`: `{ mode: 'summary' | 'quote', threshold: number, enabled: boolean }`.
2) Create `lib/recap-config.ts` with async functions: `getRecapMode()`, `getActivityThreshold()`, `isRecapEnabled()` that load from settings table.
3) In `app/settings/page.tsx`, add state for `recapConfig` with defaults: `{ mode: 'summary', threshold: 3, enabled: true }`.
4) Add loading logic in `loadSettings()` to read `recap_config` from API response.
5) Create settings section "Daily Recap" in GENERAL tab with:
   - Enable/disable toggle checkbox
   - Mode selector radio buttons or dropdown: "Summary Bullets" | "Quote/Reflection"
   - Threshold input (number, min 1, max 10) - only shown when mode is 'summary'
   - Explanatory text for each mode
6) Add `saveRecapSettings()` function that calls `apiClient.updateSettings({ recap_config: recapConfig })`.
7) Add save button with loading/success feedback matching existing patterns.
8) Test: change settings, refresh page, verify config persists correctly.

Acceptance criteria
- Settings section visible in GENERAL tab.
- Mode selection toggles between summary and quote.
- Threshold input validates and persists correctly.
- Enable toggle works and persists.
- Helper functions return correct values from database.

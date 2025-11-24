# Context: P6-T1 — Recap mode settings

Purpose: Add settings UI for recap mode selection (summary vs quote/reflection), with data threshold configuration and disable toggle.

Key decisions
- From plan: Default mode is "Summary" (3-5 bullet points of yesterday's activity). If activity below threshold, auto-fallback to quote mode.
- Scope: Settings UI only; actual recap generation is P6-T3 and display is P6-T4.
- Recap can be disabled entirely via toggle.
- Default data threshold: 3 items minimum to generate summary.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 6).
- Tasks: docs/.implementation/sprint3/tasks.md (P6-T1 steps).
- Settings page: app/settings/page.tsx (existing tabs: AI, NTFY, GENERAL).
- Settings API: app/api/settings/route.ts.
- Types: types/index.ts.

Implementation notes
- Add new settings section "Daily Recap" to GENERAL tab or create new tab.
- Store config as `recap_config: { mode: 'summary' | 'quote', threshold: number, enabled: boolean }`.
- Create `lib/recap-config.ts` with helper functions for reading config.
- Follow existing settings patterns for loading/saving (see ntfyConfig pattern).

Testing/QA
- Settings persist across page reload.
- Changing mode updates database correctly.
- Threshold value validation (positive integers only).
- Disable toggle hides recap-related UI in other areas.

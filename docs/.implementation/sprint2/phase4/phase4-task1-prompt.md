# Prompt: P4-T1 — Daily review reminder (ntfy + client fallback)

Context: docs/.implementation/sprint2/phase4/phase4-task1-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 4), docs/.implementation/sprint2/tasks.md (P4-T1)

Goal
- Implement daily review reminder with server ntfy (when enabled) and client fallback, configurable time.

Deliverables
- Settings UI for toggle + time; persisted.
- Server ntfy scheduling with throttle/dedupe; client fallback single-fire per day when ntfy unavailable.
- Timezone-safe display; dismiss/snooze behavior without spamming.
- QA notes for reminder paths.

Implementation steps (from tasks)
1) Add settings UI for toggle/time and persist.
2) Implement server ntfy scheduling when enabled with dedupe.
3) Add client fallback when ntfy disabled/unavailable; prevent double send.
4) Handle timezone/local time and validate inputs.
5) Add dismiss/snooze behavior client-side; log sends if applicable.
6) Test end-to-end across modes (enabled/disabled, ntfy on/off).
7) Log QA results.

Acceptance criteria
- Reminder fires at configured time via ntfy when enabled; fallback works when not; no duplicates.

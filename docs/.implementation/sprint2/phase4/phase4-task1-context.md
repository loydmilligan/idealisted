# Context: P4-T1 — Daily review reminder (ntfy + client fallback)

Purpose: Implement daily review reminder with server ntfy when enabled and client fallback, configurable time.

Key decisions
- Use existing ntfy infra when available; fallback to client reminder if disabled/unavailable.
- Needs toggle + time persistence; dedupe/throttle to avoid double sends.
- Respect local time/timezone display.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 4).
- Tasks: docs/.implementation/sprint2/tasks.md (P4-T1 steps).
- ntfy references in CLAUDE.md/AI_AND_NTFY docs.

Implementation notes
- Settings UI for toggle/time; server schedule when enabled; client single-fire per day with snooze/dismiss.

Testing/QA
- Enabled/disabled, ntfy available/unavailable; time selection validity; no spam.

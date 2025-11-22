# Context: P3-T1 — AI append items to existing lists

Purpose: Allow AI to append items to lists via target picker with preview-first flow.

Key decisions
- AI append only (no rewrite/cleanup; deferred to Sprint 3).
- Supports all list types (bulleted/numbered/tasklist/shopping) with correct markdown syntax.
- AI calls gated; UI must degrade gracefully when disabled/failing.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 3).
- Tasks: docs/.implementation/sprint2/tasks.md (P3-T1 steps).
- AI gating/feature flags per CLAUDE.md; AI endpoints in app/api/ai*.

Implementation notes
- Entry point on list viewer/editor; modal/panel for target selection + user hint.
- Apply preview accept/cancel; persist markdown append atomically; handle concurrency.

Testing/QA
- Append on each list type; AI enabled/disabled; errors handled inline; no state corruption.

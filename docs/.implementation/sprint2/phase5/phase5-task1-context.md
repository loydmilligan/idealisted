# Context: P5-T1 — Daily plan + filters + AI suggested rail

Purpose: Build Planner main view (Today) with filters and AI “suggested for today” rail.

Key decisions
- Main view = daily plan with filters (due date, project, tags, overdue).
- AI suggestions are rail-only, accept/dismiss; no auto-apply. Gated by AI.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 5).
- Tasks: docs/.implementation/sprint2/tasks.md (P5-T1 steps).

Implementation notes
- Assign tasks/lists/notes to day; persist ordering. Ensure performance/pagination if needed.
- Mobile/desktop filter usability; empty/overdue states clear.

Testing/QA
- Filters apply; assigning works; AI off/on behavior correct.

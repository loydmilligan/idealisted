# Context: P3-T2 — AI add notes and tasks to projects

Purpose: Add AI-assisted creation of notes and tasks linked to a project with preview-first control.

Key decisions
- Scope: add notes/tasks via AI only; no rewrite/cleanup here. AI-gated; hidden when disabled.
- Project preselected; user can accept/cancel per item.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 3).
- Tasks: docs/.implementation/sprint2/tasks.md (P3-T2 steps).
- Project associations UI; AI endpoints; feature flags per CLAUDE.md.

Implementation notes
- Entry point in project view (buttons/menus). Request payload should include project metadata.
- On accept, create entities linked to project; refresh associations; preserve manual create flows.

Testing/QA
- AI on/off; errors; mobile tap targets; regression of project load and manual add.

# Context: P1-T2 — Note-type picker modal + Recently Captured links + project edit entry

Purpose: Add note-type picker modal, fix Recently Captured links to correct viewer/tab, expose project edit flow from viewer.

Key decisions
- Note-type picker should mirror list selector style (Phase 1 intent). New note types from Phase 2 will appear once added.
- Recently Captured must deep-link correctly (viewer/tab). Project viewer must surface edit CTA.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 1).
- Tasks: docs/.implementation/sprint2/tasks.md (P1-T2 steps).
- Code likely: capture list/cards, routing/viewer components, project viewer/edit entry points.

Implementation notes
- Picker modal: available note types only (current set), modular so new types drop in.
- Routing: ensure slug/id mapping; back navigation sane.

Testing/QA
- Capture → pick type → create → view works on mobile/desktop.
- Recently Captured opens correct view; project edit opens modal/page and saves.

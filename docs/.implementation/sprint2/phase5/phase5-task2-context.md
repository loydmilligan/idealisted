# Context: P5-T2 — Week view drag/drop + month overlay + global tasks drawer

Purpose: Add week grid with drag/drop between days, month overlay for jump-to-day, and global tasks drawer to pick items into plan.

Key decisions
- Week grid defaults to 7-day; month overlay is lightweight navigator, not full scheduler.
- Global tasks drawer provides full list with light filters to add into plan.
- Drag/drop on mobile may need alternatives (menus/buttons).

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 5).
- Tasks: docs/.implementation/sprint2/tasks.md (P5-T2 steps).

Implementation notes
- Persist changes after move/add; handle conflicts/reorder gracefully.
- State retention when switching day/week/month.

Testing/QA
- Drag/drop desktop; mobile alternative; drawer usability; state persists across views.

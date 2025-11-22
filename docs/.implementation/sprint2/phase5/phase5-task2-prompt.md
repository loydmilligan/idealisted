# Prompt: P5-T2 — Week view drag/drop + month overlay + global tasks drawer

Context: docs/.implementation/sprint2/phase5/phase5-task2-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 5), docs/.implementation/sprint2/tasks.md (P5-T2)

Goal
- Add week grid with drag/drop between days, month overlay to jump to a day, and global tasks drawer to pick items into the plan.

Deliverables
- Week (7-day) grid with drag/drop; mobile alternative for move.
- Month overlay/calendar for jump-to-day feeding planner state.
- Global tasks slide-out with light filters; add items into day plans.
- QA notes for view switching and persistence.

Implementation steps (from tasks)
1) Add week grid view with drag/drop moves.
2) Implement month overlay/calendar for jump-to-day.
3) Add global tasks drawer with filters to add items into plan.
4) Persist changes after move/add; handle reorder/conflicts.
5) Mobile alternative to drag/drop; drawer usability on small screens.
6) Regression: switching day/week/month retains state.
7) Log QA results.

Acceptance criteria
- Week drag/drop works (or mobile alternative); month overlay navigates; drawer adds items; state persists across views.

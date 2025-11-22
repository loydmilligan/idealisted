# Context: P3-T3 — Project widgets (completion, momentum, recent activity, Danger Zone)

Purpose: Add project health widgets showing completion %, momentum, recent activity, and Danger Zone alert.

Key decisions
- Danger Zone: trigger when ≥70% tasks complete AND no activity for ≥7 days.
- Momentum: tasks per week with g/y/r thresholds.
- Show completion counts and last activity timestamp. Handle zero-task projects gracefully.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 3).
- Tasks: docs/.implementation/sprint2/tasks.md (P3-T3 steps).

Implementation notes
- Computation can be client helper or lightweight backend; avoid heavy queries.
- UI block should be responsive, accessible, with brief help text.

Testing/QA
- Validate calculations with sample data; edge cases (no tasks, all done, stale).

# Prompt: P3-T3 — Project widgets (completion, momentum, recent activity, Danger Zone)

Context: docs/.implementation/sprint2/phase3/phase3-task3-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 3), docs/.implementation/sprint2/tasks.md (P3-T3)

Goal
- Add project health widgets for completion %, momentum, recent activity, and Danger Zone alert.

Deliverables
- Helpers to compute completion %, momentum (tasks/week with g/y/r thresholds), recent activity timestamp.
- Danger Zone: trigger when ≥70% complete and no activity for ≥7 days; visible alert.
- UI block in project view (responsive, accessible) with brief help/tooltip.
- QA notes for calculations and edge cases.

Implementation steps (from tasks)
1) Add helper(s) to compute completion % (project scoped).
2) Compute momentum with thresholds; cache if needed.
3) Track recent activity timestamp for display.
4) Implement Danger Zone trigger/alert per rule.
5) Render widget block with accessibility/responsive handling.
6) Validate calculations with sample data; handle zero-task projects.
7) Log QA results.

Acceptance criteria
- Widgets show correct values/states; Danger Zone fires per rule; safe handling of empty projects.

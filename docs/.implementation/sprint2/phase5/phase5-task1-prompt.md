# Prompt: P5-T1 — Daily plan + filters + AI suggested rail

Context: docs/.implementation/sprint2/phase5/phase5-task1-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 5), docs/.implementation/sprint2/tasks.md (P5-T1)

Goal
- Build Planner main view (Today) with filters and AI “suggested for today” rail (accept/dismiss only).

Deliverables
- Today view showing planned items; filters for due date/project/tags/overdue.
- Ability to assign tasks/lists/notes to a day and order them; persisted.
- AI suggestion rail (gated) with accept/dismiss; no auto-apply.
- QA notes for filters and AI states.

Implementation steps (from tasks)
1) Build Today view with filters applied to candidate items.
2) Allow assigning items to day; persist and maintain ordering.
3) Implement AI suggested rail with accept/dismiss; gated when AI off.
4) Ensure filter UI mobile/desktop friendly; handle empty/overdue states.
5) Regression: task data unaffected; performance acceptable.
6) Log QA results.

Acceptance criteria
- Filters work; assignments persist; AI rail behaves with/without AI; UX responsive.

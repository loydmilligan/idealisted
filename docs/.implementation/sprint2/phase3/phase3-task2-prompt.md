# Prompt: P3-T2 — AI add notes and tasks to projects

Context: docs/.implementation/sprint2/phase3/phase3-task2-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 3), docs/.implementation/sprint2/tasks.md (P3-T2)

Goal
- Enable AI-assisted creation of notes and tasks linked to a project with preview-first control.

Deliverables
- “Add via AI” control in project view for notes/tasks (hidden when AI off).
- AI request includes project context; preview panel for candidate items with per-item accept/cancel.
- Accepted items created and linked to project; associations list refreshed.
- QA notes for project flows.

Implementation steps (from tasks)
1) Add controls in project view.
2) Build AI payload with project metadata; respect gating/errors.
3) Show preview panel; accept/cancel per item.
4) On accept, create note/task entities linked to project; refresh association list.
5) Preserve manual creation flows; hide controls when AI disabled.
6) Regression on project load/manual add/AI add; mobile tap targets.
7) Log QA results.

Acceptance criteria
- AI control only when enabled; preview-first; links created correctly; no regression to project view.

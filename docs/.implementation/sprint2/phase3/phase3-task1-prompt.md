# Prompt: P3-T1 — AI append items to existing lists

Context: docs/.implementation/sprint2/phase3/phase3-task1-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 3), docs/.implementation/sprint2/tasks.md (P3-T1)

Goal
- Let users append list items via AI with target picker and preview-first flow; supports all list types.

Deliverables
- “Append with AI” entry in list view/editor; modal/panel for target selection + user hint.
- AI call gated; preview with accept/cancel; graceful error handling.
- On accept, markdown items appended with correct syntax per type; view refreshes.
- QA notes for list types and AI states.

Implementation steps (from tasks)
1) Add entry point and target picker.
2) Build AI payload with list id/type context + user hint; respect gating.
3) Render preview; accept/cancel; handle errors inline.
4) Persist appended items atomically; refresh view.
5) Disable during request; debounce submissions; audit logs if present.
6) Manual regression across list types and AI off/on.
7) Log QA results.

Acceptance criteria
- Works for bulleted/numbered/tasklist/shopping; no corruption on failures; hidden or disabled when AI off.

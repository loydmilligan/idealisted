# Prompt: P1-T3 — Tags everywhere + Files tag filters fix

Context: docs/.implementation/sprint2/phase1/phase1-task3-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 1), docs/.implementation/sprint2/tasks.md (P1-T3)

Goal
- Ensure tag input + AI tag suggestion button on all markdown modals; fix Files tag filtering.

Deliverables
- Tag selector present across notes/lists/projects/tasks modals; AI tag button respects gating.
- Files tag filter shows tags, applies filter, and clears properly.
- QA notes for tagging flows.

Implementation steps (from tasks)
1) Audit modals; add missing tag selector.
2) Ensure AI tag button appears, gated by AI enablement.
3) Fix Files tag filters (UI, query, clear state).
4) Normalize tag plumbing (lowercase, usage counts) on add/remove.
5) Verify suggest API calls respect gating/errors inline.
6) Manual checks for create/edit with tags and Files filter combos.
7) Log QA results.

Acceptance criteria
- Tag + AI suggestion available everywhere; AI respects feature toggle.
- Files tagging filter works end-to-end.

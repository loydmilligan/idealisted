# Context: P1-T3 — Tags everywhere + Files tag filters fix

Purpose: Ensure tag selector + AI tag suggestion button appear in all markdown modals; fix Files tag filtering.

Key decisions
- AI tag button must respect AI gating; errors inline.
- Use normalized tag handling (lowercase, usage counts) per CLAUDE.md/tag helpers.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 1).
- Tasks: docs/.implementation/sprint2/tasks.md (P1-T3 steps).
- Code likely: markdown modals for notes/lists/projects/tasks; Files view filter logic; ai suggest-tags API usage.

Implementation notes
- Check missing tag inputs; add without disturbing legacy todo.
- Files filter should display tags, apply filter, and clear cleanly.

Testing/QA
- Manual create/edit each entity with tags; AI suggestions when enabled; Files filter combinations.

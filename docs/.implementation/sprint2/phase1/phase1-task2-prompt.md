# Prompt: P1-T2 — Note-type picker modal + Recently Captured links + project edit entry

Context: docs/.implementation/sprint2/phase1/phase1-task2-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 1), docs/.implementation/sprint2/tasks.md (P1-T2)

Goal
- Add note-type picker modal, fix Recently Captured links to open correct viewer/tab, and expose project edit from viewer.

Deliverables
- Picker modal aligned with list selector style; creation flow sets selected type.
- Recently Captured items deep-link correctly.
- Project viewer shows edit CTA that opens edit flow.
- QA notes for navigation.

Implementation steps (from tasks)
1) Add picker modal with available note types.
2) Wire capture entry to open picker and set type in state.
3) Fix Recently Captured routing to correct viewer/tab.
4) Ensure project edit CTA opens edit modal/page properly.
5) Validate navigation state/back behavior and ids/slugs.
6) Regression on capture → view → edit flows (mobile/desktop).
7) Log QA results.

Acceptance criteria
- Picker usable on mobile/desktop; new types appear when added.
- Recently Captured opens right view every time.
- Project edit accessible from viewer without broken navigation.

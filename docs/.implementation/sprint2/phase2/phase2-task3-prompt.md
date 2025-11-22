# Prompt: P2-T3 — New note types (Meeting, Research, Media) + URL handling

Context: docs/.implementation/sprint2/phase2/phase2-task3-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 2), docs/.implementation/sprint2/tasks.md (P2-T3)

Goal
- Add note types Meeting, Research, Media; support URL capture (esp. Research) and render appropriately.

Deliverables
- Templates/metadata for the three types; registered in creation flows and API/storage.
- Type picker shows these; creation persists type field + template content.
- URL field/validation for Research (and quick-add if used).
- Media attachments (audio/video/image) upload + preview; Media viewer renders.
- Viewers/list cards show type badges; tags work.
- QA notes for each type.

Implementation steps (from tasks)
1) Define templates/metadata for Meeting, Research, Media.
2) Add to type picker and creation flows; ensure API/storage support.
3) Implement URL capture in Research (and relevant flows).
4) Wire Media upload handling with persistence and preview.
5) Render new types in viewer with sections/badges/attachments.
6) Validate create/edit/view on desktop/mobile with tags.
7) Update template registration/guardrails; log QA.

Acceptance criteria
- All three types can be created/edited/viewed; URLs validated/rendered; media uploads persist and display.

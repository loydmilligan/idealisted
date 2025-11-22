# Context: P2-T3 — New note types (Meeting, Research, Media) + URL handling

Purpose: Add note types Meeting, Research, Media; support URL capture (esp. Research), and render accordingly.

Key decisions
- Types: Meeting (attendees/decisions/next steps), Research (question/sources/findings/next actions), Media (attachment-first). URL field included; Journal stays in Today surface, not a type.
- Avoid legacy todo collision; templates registered accordingly.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint2/tasks.md (P2-T3 steps).
- Might touch template registration, note viewer/renderers.

Implementation notes
- Type picker must show these; creation/storage must persist type field + template.
- Media: upload pipeline for audio/video/image with preview.
- URL validation field in Research (and quick-add if used).

Testing/QA
- Create/edit/view for each type on desktop/mobile; tags and AI tag button present.
- List cards show type badges; URLs render/click; attachments visible.

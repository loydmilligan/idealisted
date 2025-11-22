# Sprint 2 Status — Capture/Planner & AI Enhancements

Date: 2025-01-14 (paused mid-sprint)

## Current Scope (Plan)
- Phases per `docs/.implementation/sprint2/plan.md` and tasks per `docs/.implementation/sprint2/tasks.md`
- Key pillars: Capture Today surface, note type expansion, AI append flows, project widgets, planner, notifications, QA/docs.

## Completed / In-Progress
- **Docs & Structure**
  - Plan, tasks, per-task context, and prompts created under `docs/.implementation/sprint2/`.
  - Sprint 3 parking lot at `docs/.implementation/sprint3/plan.md` for deferred features.
- **Capture & Templates** (Phase 1/2 groundwork)
  - TemplateSelector: mobile bottom-sheet behavior, rounded top; desktop unchanged.
  - Note picker: bottom sheet in Capture backed by `/api/templates` (Meeting/Research/Media/Generic/YouTube).
  - Capture screen: Recently Captured cards open viewer; monochrome mic/AI icons.
  - Today surface scaffolding added: quick actions, journal card (save -> journal note), media card (save -> media note), AI recap placeholder, Unsorted toggle section.
- **Note Types**
  - Seeded new templates in `lib/db.ts`: Meeting (`note-meeting`), Research (`note-research`), Media (`note-media`).
  - Subtype → template mapping wired in `app/page.tsx`; Capture picker pulls templates dynamically.
- **Tags UX**
  - MarkdownEntityEditor now includes TagInput + AI tag suggest (AI-gated); tags sanitize/lowercase/hyphenate/dedup before save.
  - Tags persisted on create/update; Files list receives tags; EntitiesScreen tag filters enabled (Files view).
  - Tag usage increments on create in items API.
- **Tests**
  - Placeholder `__tests__/markdown-parser.test.cjs` added so `npm test -- --watch=false` passes (stub only).

## Not Started / Deferred
- AI recap actual implementation (placeholder only).
- Unsorted auto-expand-on-first-capture persistence; full Today surface polish (mobile/desktop tuning).
- Phase 2 deeper capture/inbox rework (tabs/Recently Captured replacement decisions finalized in plan, not executed).
- Phase 3: AI append to lists; AI add notes/tasks to projects; project widgets (completion/momentum/recent activity/danger zone).
- Phase 4: Daily review reminder (ntfy + fallback).
- Phase 5: Planner tab (daily + week drag/drop, AI suggestions rail, month overlay, global tasks drawer).
- Phase 6: QA sweeps, docs/CHANGELOG updates (partial tagging/testing notes only).
- AI rewrite/cleanup, promote-to-task, auto-create tasks<->notes (parked in Sprint 3).

## Risk / Gaps
- Tests are stubbed; no real coverage for new flows.
- Today surface is functional scaffold; AI recap and inbox behavior need completion.
- Tagging relies on sanitized tags; ensure downstream views expect lowercase/hyphen tags.
- Many archived phase docs removed (per repo cleanup); ensure consumers know to use sprint2 docs.

## Suggested Next Steps
1) Finish Phase 2: polish Today surface (AI recap, auto-expand Unsorted, mobile spacing), finalize capture/inbox merge per plan.
2) Implement new note type views (Meeting/Research/Media) with URL handling and attachments (media preview).
3) Phase 3 AI flows: append to lists, add notes/tasks to projects; add project widgets.
4) Phase 4 reminder; Phase 5 planner; Phase 6 QA/docs; replace placeholder test with real coverage of markdown/tag flows.

## Files to Reference
- Plan: `docs/.implementation/sprint2/plan.md`
- Tasks: `docs/.implementation/sprint2/tasks.md`
- Context/prompts: `docs/.implementation/sprint2/phase*/`
- Sprint 3 parking: `docs/.implementation/sprint3/plan.md`

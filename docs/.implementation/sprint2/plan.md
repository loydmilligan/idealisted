# Sprint 2 Plan — Capture/Planner & AI Enhancements

Source: `NEXT_SPRINT_PLAN_V2.md` + sprint-2 decisions (this doc). Phases = the WHAT. Tasks will be defined separately in `tasks.md` (the HOW) after plan acceptance.

## Scope & Decisions
- Capture front surface: Top "Today" card with quick-add (note/task/list), AI Yesterday Recap (gated), and Today streak tag. Below: Journal card (rich text + mood/emoji, optional image), Media card (one image/audio/video of the day). Unsorted sits below, initially collapsed until first capture.
- Note types to add (Phase 2): Meeting Note, Research Note, Media Note (attachment-first). URL capture supported inside these (especially Research) and as a quick-add field. Journal remains part of the Today surface (not a separate type).
- AI append/augment (Phase 3): Lists → append items; Projects → add notes and tasks (preview-first, AI-gated). AI rewrite/cleanup deferred to Sprint 3.
- Planner (Phase 5): Main view = daily plan with filters; adds multi-day drag/drop (Today/Week), AI "suggested for today" rail, week grid (7-day) plus lightweight month overlay, and a global tasks slide-out with filters.
- Project widgets (Phase 3): Completion %, Momentum (tasks/week thresholds g/y/r), Recent Activity timestamp, Danger Zone alert (≥70% complete & ≥7 days inactivity).
- Out of scope (parked for Sprint 3): AI rewrite/cleanup; auto-create tasks from new notes (Meeting/Research/Learning) and vice versa; additional note types beyond above; Promote-to-task flow for TaskLists.

## Phases
1) **Markdown polish & UI refinement**
   - Mobile bottom-sheet template selector for lists; monochrome AI/mic icons; note-type picker modal.
   - Link Recently Captured items to correct viewer/tab; ensure project edit flow visible from viewer.
   - Tags everywhere (all markdown modals) + fix Files tag filters; AI tag suggestion button present.

2) **Capture/Inbox rework**
   - Implement Today surface (Today card, Journal card, Media card, AI Yesterday Recap) with Unsorted below (collapsed until first capture).
   - Decide/implement Capture+Unsorted merge vs current tabs: adopt Today surface as primary when tab loads, with Unsorted as the inbox list beneath.
   - Add new note types: Meeting, Research, Media (+ URL handling). Journal lives in Today surface.

3) **AI append/augment**
   - AI append items to existing lists (target picker, preview-first, gated).
   - AI add notes and tasks to projects (target picker, preview-first, gated).
   - Project widgets: completion %, momentum, recent activity, Danger Zone alert.

4) **Notifications**
   - Daily review reminder (client/server prompt) with configurable time; reuse ntfy when enabled; client fallback when disabled. UI + persistence + dup/throttle.

5) **Planner tab**
   - Daily plan with filters (due date, project, tags, overdue) as main.
   - Week view with drag/drop; AI "suggested tasks for today" rail; week grid + month overlay jump.
   - Global tasks slide-out (full list + light filters) to pick items into the plan.

6) **QA & Docs**
   - Mobile/desktop passes for new flows; regression on capture, AI append, planner.
   - Update README/CHANGELOG/pm2 notes; add testing steps to `TESTING_GUIDE.md` if needed.

## Exit Criteria per Phase
- P1: Selectors consistent mobile/desktop; tags/AI tag buttons present; Files tag filters fixed; project edit available from viewer.
- P2: Today surface live; Unsorted collapses/expands; new note types selectable and persisted; URL capture supported; Journal captured via Today surface.
- P3: AI append flows succeed/fail gracefully under gating; project widgets show correct states; no regression to other entity creation.
- P4: Reminder fires at configured time (ntfy when enabled, client fallback otherwise); deduped; user-toggle + time persists.
- P5: Can assign items to days; drag/drop across week; AI suggestions visible but optional; month jump works; global tasks drawer accessible with filters.
- P6: Regressions cleared; docs updated; tests/playwright/manual notes recorded; ready to ship.

## Deliverables
- `docs/.implementation/sprint2/plan.md` (this file) — accepted.
- `docs/.implementation/sprint2/tasks.md` — detailed HOW (7–8 atomic steps per task) after plan acceptance.
- Per-task bundles: `docs/.implementation/sprint2/phase#/phase#-task#-context.md` + task prompt files, created after tasks.md acceptance and before coding.

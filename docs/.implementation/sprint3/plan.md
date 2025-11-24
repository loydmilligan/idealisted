# Sprint 3 Plan — Planner Maturity & Feature Polish

Source: `rough-plan.md` + brainstorming session decisions. Phases = the WHAT. Tasks will be defined separately in `tasks.md` (the HOW) after plan acceptance.

## Theme

**Planner Maturity** — Transform the Planner tab from a local-only prototype into a fully-functional planning system with persistence, drag/drop, morning/evening workflows, and AI integrations.

## Scope & Decisions

### Planner Core (P1-P4)
- **Persistence (Hybrid)**: LocalStorage for immediate UX, background sync to SQLite database. Assignments survive page refresh and work across sessions.
- **Drag/Drop**: Enable dragging items between days in week view. Visual feedback during drag.
- **Draft/Final Flow**: Wire existing `MorningFinalizeModal.tsx` and `EveningReviewFlow.tsx` components. Auto-forward incomplete tasks to next day by default; evening review allows reassign to future date or remove due date entirely.
- **Global Tasks Drawer**: Render the existing `PlannerDrawer` component. Add visual indicators (badge/dimming) for already-planned items. No hard hide—show all tasks but mark planned ones.
- **Mini Calendar**: Compact calendar in header/sidebar with task count indicators per day, click to navigate.

### Sprint 2 Cherry-Picks (P5-P6)
- **AI Append Flows**: AI append items to existing lists (max 10 suggestions), AI add notes/tasks to projects. Preview-first, gated by AI toggle.
- **Daily Reminder**: Ntfy notification + client fallback for daily review. Configurable time, dedupe/throttle.
- **Recap Controls**: Summary bullets as default mode (3-5 points of yesterday's activity). Smarter generation with data thresholds. Quote fallback for low-activity days.
- **Ntfy Polish**: Update docs to current flow, improve notification content (planner milestones, clearer messaging).

### Today Surface Polish (P7)
- **AI Recap**: Replace placeholder with actual AI-powered summary of yesterday's activity.
- **Unsorted Auto-Expand**: Expand Unsorted section when first item captured; persist toggle state.
- **Mobile Tuning**: Spacing, tap targets, responsive layout fixes for Today surface.

### Out of Scope (Parked for Sprint 4)
- Archive surfacing and auto-archive features
- Chrome Extension documentation/polish
- AI rewrite/cleanup for markdown content
- Smarter list parsing without AI
- Project widgets (completion %, momentum, danger zone)
- Additional note types beyond current set

## Phases

### Phase 1: Planner Persistence
- Create `plan_assignments` table linking items to dates with ordering
- Implement LocalStorage layer for immediate saves (no API delay)
- Background sync to database on changes (debounced)
- Load assignments from DB on mount, merge with localStorage
- Wire existing `assignToDay()` function to persist instead of just state update
- Handle conflict resolution (DB wins on initial load, local wins during session)

### Phase 2: Drag/Drop & Week View
- Add drag handles to planner items in week grid
- Implement drop zones for each day column
- Visual feedback during drag (ghost element, drop zone highlight)
- Update both localStorage and trigger DB sync on drop
- Reorder within same day via drag
- Mini calendar in planner header with task count indicators per day
- Click mini calendar day to navigate week view

### Phase 3: Draft/Final Flow
- Integrate `MorningFinalizeModal.tsx` into planner tab
- Add time-based trigger (configurable morning hour, default 7-9 AM window)
- Show modal when user opens planner during morning window if plan not yet finalized
- Allow drag-to-reorder in morning modal
- Integrate `EveningReviewFlow.tsx` into planner tab
- Add time-based trigger (configurable evening hour, default 7-9 PM window)
- Auto-forward incomplete tasks to next day as default action
- Evening review: options to reassign to specific future date, mark complete, or remove due date
- Persist plan status (draft/finalized) per day
- Track finalized_at timestamp

### Phase 4: Global Tasks Drawer
- Render `PlannerDrawer` component when "Add" button clicked
- Wire `onAdd` callback to `assignToDay()` function
- Add visual indicator (badge/dimming) for items already assigned to any day
- Sort items by due date (past due first), then priority
- Add search input to filter items by text
- Preserve drawer filters during session
- Slide-in animation (already configured in component)

### Phase 5: AI Append Flows (S2 Cherry-Pick)
- "Append with AI" button on list viewer/editor
- Prompt AI with list context, existing items, user hint
- Render preview panel with suggested items (max 10)
- Accept all / accept individual / cancel UI
- Persist accepted items to list on confirmation
- "Add via AI" control in project view for notes and tasks
- Same preview-first pattern, gated by AI toggle
- Handle AI errors gracefully (no alerts, inline messaging)

### Phase 6: Recap & Notifications (S2 Cherry-Pick)
- Settings UI for recap mode selection (summary vs quote/ramblings)
- Default: Summary bullets (3-5 points)
- Implement actual AI recap call for yesterday's activity
- Data threshold check: if minimal activity, fall back to inspirational quote
- Quote fallback database (10-15 curated quotes)
- Daily reminder settings: toggle + time picker
- Server-side ntfy scheduling when enabled
- Client-side fallback reminder when ntfy disabled
- Dedupe logic (one reminder per day)
- Update ntfy docs to reflect current configuration flow
- Improve notification content for planner milestones

### Phase 7: Today Surface Polish & QA
- Wire AI recap display to actual AI service (replace placeholder)
- Unsorted auto-expand: expand on first capture, persist toggle to localStorage
- Mobile spacing and tap target fixes for Today surface
- Responsive layout audit for Planner views (mobile/tablet/desktop)
- Full regression pass: capture flows, AI gating, planner persistence, drag/drop
- Run lint/tests, fix any failures
- Update README/CHANGELOG with Sprint 3 features
- Document any follow-ups for Sprint 4

## Exit Criteria per Phase

- **P1**: Assignments persist across page refresh; DB contains assignment records; localStorage serves as immediate cache; no data loss on normal usage patterns.
- **P2**: Can drag items between days in week grid; visual feedback during drag; mini calendar displays task counts; clicking day navigates view.
- **P3**: Morning modal shows during configured window; can finalize plan with drag-to-reorder; evening modal shows during window; incomplete tasks auto-forward; can reassign or clear due date; plan status persisted.
- **P4**: Drawer opens on "Add" click; items show planned indicators; search/filter works; items can be added to current day from drawer.
- **P5**: Can append AI items to any list type; can add AI notes/tasks to projects; preview shows before commit; respects AI gating; max 10 suggestions enforced.
- **P6**: Recap mode configurable in settings; summary bullets appear on capture tab; quote fallback works for low-activity; daily reminder fires at configured time; ntfy and fallback both work.
- **P7**: AI recap displays real content; Unsorted expands on first capture; mobile planner layouts work properly; no regressions; docs updated.

## Deliverables

- `docs/.implementation/sprint3/plan.md` (this file) — accepted
- `docs/.implementation/sprint3/tasks.md` — detailed HOW (7-8 atomic steps per task) after plan acceptance
- `docs/.implementation/sprint3/status.md` — progress tracking during implementation
- Per-phase context bundles: `docs/.implementation/sprint3/phase#/` created as needed before coding

## Reference Files

- Existing components: `components/EveningReviewFlow.tsx`, `components/MorningFinalizeModal.tsx`
- PlannerDrawer: `app/page.tsx` lines 2385-2453 (defined but not rendered)
- Plans API: `app/api/plans/route.ts`
- Plans schema: `lib/db.ts` plans table
- Sprint 2 status: `docs/.implementation/sprint2/status.md`

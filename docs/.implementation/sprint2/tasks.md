# Sprint 2 Tasks — The HOW

Each task lists 7–8 atomic steps, implementation-ready. Create per-task context bundles later under `docs/.implementation/sprint2/phase#/` before coding.

## Phase 1 — Markdown polish & UI refinement

### Task P1-T1: List template bottom-sheet + monochrome AI/mic
1. Locate list template selector component; refactor to render as mobile bottom sheet (desktop parity preserved) with open/close state managed in parent.
2. Wire trigger buttons to sheet open/close; ensure focus trap + escape/overlay click close behaviors.
3. Apply existing markdown editor bottom sheet styles (spacing, animation) for consistency; set height/scroll bounds.
4. Swap AI/mic icons to monochrome variants per entity color/logo only; update assets/theme tokens if needed.
5. Verify templates list renders without legacy todo collision; ensure selection updates state/creation payload.
6. Add tests or story checks if present; smoke on mobile viewport for tap targets/scroll.
7. Record QA notes for selectors and icon swap.

### Task P1-T2: Note-type picker modal + Recently Captured links + project edit entry
1. Add note-type picker modal analogous to list selector with available note types (existing + new when added).
2. Wire capture entry points to open picker and set selected type into creation flow/state.
3. Update Recently Captured list items to link to correct viewer/tab; fix routing/viewer mapping.
4. Ensure project edit CTA/flow is available from project viewer (button/menu) and opens edit modal/page correctly.
5. Validate navigation state: return/back behavior, no double mounts, correct slugs/ids.
6. Light regression: capture → view → edit path for notes/projects works; mobile tap targets validated.
7. Log QA notes for navigation/link fixes.

### Task P1-T3: Tags everywhere + Files tag filters fix
1. Audit markdown modals (notes/lists/projects/tasks) for tag chip input; add missing tag selector where absent.
2. Ensure AI tag suggestion button appears across all markdown modals, gated by AI enablement.
3. Fix Files tag filters: ensure filter UI shows tags, applies to list/grid queries, and clears correctly.
4. Normalize tag data plumbing (lowercase, usage count updates) on add/remove for new surfaces.
5. Verify tag suggestion API calls respect gating and handle errors inline.
6. Manual check: tags on create/edit for each entity type; Files filter combinations.
7. Capture QA notes and any follow-ups.

## Phase 2 — Capture/Inbox rework

### Task P2-T1: Today surface (Today card + Journal + Media + AI recap) with Unsorted collapse
1. Implement Today card at top of Capture tab with quick-add (note/task/list) and streak tag.
2. Add Journal card (rich text + mood/emoji, optional single image) saving as Journal content within Today surface (not separate type).
3. Add Media card allowing one image/audio/video upload with caption; persist as Media note instance or embedded entity per decision.
4. Add AI Yesterday Recap block (2–3 bullets) behind AI gating with retry/fail states; do not block UI.
5. Position Unsorted list below; default collapsed on load until first capture, then expand; preserve toggle state as needed.
6. Ensure layout stacks on mobile and uses columns on desktop; handle empty states gracefully.
7. Smoke create flows from Today quick-add, Journal save, Media upload, Unsorted expand/collapse.
8. Note QA outcomes and edge cases (offline/AI disabled).

### Task P2-T2: Capture tab structure with Unsorted as inbox beneath Today surface
1. Set Today surface as primary content when Capture tab loads; keep Unsorted list as the inbox beneath.
2. Confirm or adjust tab headers/navigation to reflect new structure (no orphaned “Recently Captured”).
3. Wire capture actions to drop new items into Unsorted and trigger expand when first item appears.
4. Ensure scroll/anchor behavior between Today surface and Unsorted; add “jump to inbox” link if needed.
5. Verify data fetch boundaries: Today UI should not block Unsorted fetch/render; handle loading separately.
6. Regression check: previous capture flows (JumpTheLine, LetAIDoIt, Ready → Convert) unaffected.
7. Record QA notes for structure/navigation changes.

### Task P2-T3: New note types (Meeting, Research, Media) + URL handling
1. Define templates/metadata for Meeting (attendees/decisions/next steps), Research (question/sources/findings/next actions), Media (attachment-first) note types.
2. Add type selection to note-type picker and creation flows; ensure API/storage support for type field and templates.
3. Implement URL capture support (field + validation) within Research (and other relevant types) and quick-add where appropriate.
4. Wire Media note to accept attachments (audio/video/image) with upload handling and persistence; show preview.
5. Add rendering for new types in viewer: sections, source links, attachments; ensure list cards show type badge.
6. Validate create/edit/view for each new type on desktop/mobile; ensure tag support present.
7. Update any seed/template registration and guardrails (no collision with legacy todo); log QA.

## Phase 3 — AI append/augment + project widgets

### Task P3-T1: AI append items to existing lists
1. Add “Append with AI” entry point on list viewer/editor; opens target picker modal.
2. Build prompt payload with target list id, list type context, and user hint; call AI endpoint respecting gating.
3. Render preview of suggested items; allow accept/cancel; handle AI errors gracefully without state corruption.
4. On accept, persist new markdown items onto list (correct list syntax per type) and refresh view.
5. Ensure disabled states during request; debounce submissions; audit telemetry/logs if present.
6. Manual regression: append on each list type (bulleted/numbered/tasklist/shopping), AI off/on.
7. Capture QA notes and edge cases.

### Task P3-T2: AI add notes and tasks to projects
1. Add “Add via AI” control in project view for notes and tasks; target project preselected.
2. Build request payload with project metadata/context; call AI endpoint with gating and error handling.
3. Show preview panel with candidate notes/tasks; allow per-item accept/cancel.
4. On accept, create note/task entities linked to project; refresh project associations list.
5. Preserve existing creation flows; ensure AI-disabled state hides controls.
6. Regression: project view load, manual add, AI add; mobile tap targets.
7. Record QA notes.

### Task P3-T3: Project widgets (completion, momentum, recent activity, Danger Zone)
1. Add backend or client helpers to compute completion % (tasks complete/total) scoped to project.
2. Compute momentum (tasks completed per week) with thresholds for green/yellow/red; store lightweight cache if needed.
3. Track recent activity timestamp (latest task or note update) for display.
4. Implement Danger Zone indicator: trigger when ≥70% complete and no activity for ≥7 days; surface alert in UI.
5. Render widget block in project view (responsive, accessible); include tooltip/help text.
6. Validate calculations with sample data; ensure zero-task projects handled gracefully.
7. Log QA notes and follow-ups.

## Phase 4 — Notifications

### Task P4-T1: Daily review reminder (ntfy + client fallback)
1. Add settings UI for daily reminder toggle and time selection; persist to storage.
2. Implement server-side ntfy scheduling when enabled; include throttle/dedupe.
3. Add client-side fallback reminder when ntfy disabled/unavailable; ensure single firing per day.
4. Handle time zone considerations/local time display; validate input.
5. Add dismiss/snooze behavior (client) without spamming; log sends if applicable.
6. Test reminder end-to-end: enabled/disabled, ntfy available/unavailable.
7. Capture QA notes.

## Phase 5 — Planner tab

### Task P5-T1: Daily plan + filters + AI suggested rail
1. Build Planner main view showing Today with filters (due date, project, tags, overdue) applied to candidate items.
2. Allow assigning tasks/lists/notes to a day; persist selection and ordering.
3. Implement AI “suggested for today” rail (gated) with accept/dismiss; no auto-apply.
4. Ensure filter UI works on mobile/desktop; empty/overdue states handled.
5. Regression: existing task data unaffected; planner loads quickly with pagination or limits as needed.
6. Log QA notes.

### Task P5-T2: Week view drag/drop + month overlay + global tasks drawer
1. Add week grid view (7-day) with drag/drop to move planned items between days.
2. Implement month overlay/calendar for jump-to-day, feeding the planner state.
3. Add global tasks slide-out/drawer showing full task list with light filters; enable selecting items into a day’s plan.
4. Persist changes after drag/drop/add; handle conflicts and reorder gracefully.
5. Mobile behaviors: drag/drop alternatives (menus), drawer usability on small screens.
6. Regression: switching between day/week/month retains state sensibly.
7. Record QA notes.

## Phase 6 — QA & Docs

### Task P6-T1: QA sweeps + docs/CHANGELOG
1. Perform mobile/desktop passes on new flows (capture surface, note types, AI append, planner, reminder, widgets).
2. Run automated checks available (lint/tests) and note results; rerun after fixes.
3. Update README/CHANGELOG, pm2 instructions if touched; add testing steps to `TESTING_GUIDE.md` as needed.
4. Document known follow-ups or Sprint 3 deferrals.
5. Confirm all QA notes resolved or filed; prepare release summary inputs.
6. Verify ready-to-commit state.

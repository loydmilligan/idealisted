# Sprint 3 Tasks — The HOW

Each task lists 7-8 atomic steps, implementation-ready. Create per-task context bundles under `docs/.implementation/sprint3/phase#/` before coding each phase.

---

## Phase 1 — Planner Persistence

### Task P1-T1: Database schema for plan assignments

1. Open `lib/db.ts` and locate the schema definitions section (near existing `plans` table).
2. Add `plan_assignments` table: `id`, `item_id` (FK to items), `assigned_date` (TEXT YYYY-MM-DD), `position` (INTEGER for ordering), `created_at`, `updated_at`.
3. Add unique constraint on `(item_id, assigned_date)` to prevent duplicate assignments.
4. Add index on `assigned_date` for efficient day-based queries.
5. Run dev server to trigger schema auto-migration; verify table exists via SQLite browser or query.
6. Add TypeScript type `PlanAssignment` to `types/index.ts`: `{ id: string; item_id: string; assigned_date: string; position: number }`.
7. Document migration in code comment noting Sprint 3 addition.

### Task P1-T2: Plan assignments API endpoints

1. Create `app/api/plan-assignments/route.ts` with GET (query by date) and POST (create assignment).
2. GET: Accept `date` query param, return all assignments for that date with joined item data, ordered by position.
3. POST: Accept `{ item_id, assigned_date, position? }`, insert record, return created assignment.
4. Create `app/api/plan-assignments/[id]/route.ts` with PUT (update position/date) and DELETE (remove assignment).
5. PUT: Update position or move to different date; handle reordering other items if needed.
6. DELETE: Remove assignment, don't delete the underlying item.
7. Add error handling for FK violations (item doesn't exist) and duplicate assignment attempts.
8. Test endpoints via curl or API client; verify data persists across requests.

### Task P1-T3: LocalStorage layer for immediate UX

1. Create `lib/plan-storage.ts` with functions: `getLocalAssignments(date)`, `setLocalAssignments(date, assignments)`, `clearLocalAssignments()`.
2. Use localStorage key pattern: `planner_assignments_YYYY-MM-DD`.
3. Add `syncToServer(date)` function that POSTs/PUTs local changes to API (debounced 1000ms).
4. Add `loadFromServer(date)` function that fetches from API and updates localStorage.
5. Implement merge strategy: on page load, fetch server data; if localStorage has newer timestamps, prefer local; otherwise use server.
6. Add `isOnline()` check; queue syncs when offline, flush when online.
7. Export typed interface; add JSDoc comments explaining sync behavior.

### Task P1-T4: Create PlannerScreen component

1. Create `components/modern/screens/PlannerScreen.tsx` with props: `assignments`, `items`, `onAssign`, `onRemove`, `selectedDate`.
2. Import from plan-storage; call `loadFromServer` on mount and when `selectedDate` changes.
3. Display date navigation header: < prev | Today | next > with date display.
4. Render today's assignments list with drag handles (visual only this task; P2 adds drag).
5. Add "Add to Plan" button that will open drawer (P4 wires this).
6. Show empty state when no assignments: "No items planned for [date]. Add some tasks!"
7. Integrate into `app/page.tsx` planner tab case; pass through required props.
8. Test: navigate to planner tab, change dates, verify data loads correctly.

### Task P1-T5: Wire assignToDay to persistence

1. In PlannerScreen, add `assignToDay(itemId, date)` function that: (a) updates localStorage, (b) triggers server sync.
2. Calculate next position as `max(existing positions) + 1` for new assignments.
3. Update React state optimistically before sync completes.
4. Handle sync failures: show toast, keep local state, retry on next action.
5. Wire "Add" button click in drawer (when implemented) to call `assignToDay`.
6. Add `removeFromDay(assignmentId)` that deletes from localStorage and syncs.
7. Test: assign item, refresh page, verify assignment persists; remove item, verify removal persists.

---

## Phase 2 — Drag/Drop & Week View

### Task P2-T1: Add drag-drop library and week grid

1. Install `@dnd-kit/core` and `@dnd-kit/sortable` for React drag-drop support.
2. In PlannerScreen, add week view mode state: `viewMode: 'day' | 'week'`.
3. Add toggle button in header to switch between day and week views.
4. Create WeekGrid component showing 7 day columns with date headers (Mon-Sun or Sun-Sat based on locale).
5. Each day column renders its assignments as vertical list.
6. Style columns with equal width, scroll if content overflows vertically.
7. Add visual indicator for "today" column (highlight border/background).
8. Test: toggle to week view, see 7 days with current week dates.

### Task P2-T2: Implement draggable items and drop zones

1. Wrap each assignment item in `<Draggable>` from dnd-kit with unique `id`.
2. Wrap each day column in `<Droppable>` with `id` matching the date string.
3. Add `onDragEnd` handler to PlannerScreen that receives `{ active, over }`.
4. When dropped on different day: call `moveToDay(assignmentId, newDate)` updating both localStorage and server.
5. When dropped on same day different position: update position values, re-sync.
6. Add visual feedback during drag: ghost element follows cursor, drop zone highlights on hover.
7. Handle edge cases: dropping outside valid zone (cancel), dropping on full day (append to end).
8. Test: drag item between days, verify position updates persist.

### Task P2-T3: Reorder within same day

1. Use `@dnd-kit/sortable` for within-day reordering.
2. Each day list uses `SortableContext` with item IDs.
3. On reorder, update `position` values for affected items.
4. Batch position updates in single API call for efficiency.
5. Optimistic update: reorder visually immediately, sync in background.
6. Add subtle animation for items shifting during reorder.
7. Test: reorder items within same day, refresh, verify order persists.

### Task P2-T4: Mini calendar with task counts

1. Create `MiniCalendar.tsx` component with props: `selectedDate`, `onDateSelect`, `taskCounts`.
2. Display compact month grid (7 columns, 5-6 rows) with day numbers.
3. `taskCounts` is `Record<string, number>` mapping YYYY-MM-DD to count.
4. Show small dot or number indicator on days with tasks.
5. Highlight selected date and today differently.
6. Add month navigation arrows; clicking day calls `onDateSelect`.
7. Position in planner header or sidebar based on viewport (mobile: collapsible, desktop: always visible).
8. Test: click dates, verify planner view updates; verify counts match actual assignments.

---

## Phase 3 — Draft/Final Flow

### Task P3-T1: Plan status tracking

1. Add `plan_status` column to `plans` table: 'draft' | 'finalized' | 'completed'.
2. Add `finalized_at` timestamp column (nullable).
3. Modify plan creation to set status='draft' by default.
4. Add API endpoint PUT `/api/plans/[id]/finalize` that sets status='finalized' and `finalized_at`.
5. Add API endpoint PUT `/api/plans/[id]/complete` that sets status='completed'.
6. Update `Plan` type in `types/index.ts` with new fields.
7. Test: create plan, finalize it, verify status changes in DB.

### Task P3-T2: Integrate MorningFinalizeModal

1. In PlannerScreen, add state: `showMorningModal: boolean`, `todayPlan: Plan | null`.
2. On mount, check if: (a) current time is within morning window (configurable, default 7-9 AM), (b) today's plan exists but status='draft'.
3. If conditions met, fetch today's plan with tasks and set `showMorningModal=true`.
4. Import `MorningFinalizeModal` from `components/MorningFinalizeModal.tsx`.
5. Render modal when `showMorningModal` is true; pass plan and tasks.
6. On `onFinalize` callback: update plan status, close modal, refresh planner view.
7. Add "Finalize Plan" manual button in planner header for user-triggered finalization.
8. Test: set system time to morning, have draft plan, verify modal appears.

### Task P3-T3: Integrate EveningReviewFlow

1. In PlannerScreen, add state: `showEveningModal: boolean`.
2. On mount, check if: (a) current time is within evening window (configurable, default 7-9 PM), (b) today's plan exists with status='finalized', (c) plan not yet 'completed'.
3. If conditions met, fetch plan with tasks, projects list, unparsed count.
4. Import `EveningReviewFlow` from `components/EveningReviewFlow.tsx`.
5. Render modal when `showEveningModal` is true; pass all required props.
6. On `onComplete` callback: refresh planner, navigate to tomorrow's view optionally.
7. Add "Evening Review" manual button in planner header (shown only if plan is finalized).
8. Test: set system time to evening, have finalized plan, verify modal appears.

### Task P3-T4: Auto-forward incomplete tasks

1. In EveningReviewFlow reschedule step, default action for incomplete tasks = "tomorrow".
2. Add bulk "Move All to Tomorrow" button that sets all incomplete tasks to next day.
3. Modify `handleReschedule` to support 'custom' option opening date picker.
4. Add "Remove due date" option that sets task due_date to null (backlog).
5. On complete, actually update task due_dates in DB via existing API.
6. Create plan assignments for rescheduled tasks on their new dates.
7. Test: complete evening review with incomplete tasks, verify they appear on future dates.

### Task P3-T5: Settings for morning/evening windows

1. Add settings section in Settings page: "Planner Schedule".
2. Add time pickers for: `morning_start`, `morning_end`, `evening_start`, `evening_end`.
3. Store in settings table as JSON: `planner_schedule_config`.
4. Create `lib/planner-schedule.ts` with `isInMorningWindow()`, `isInEveningWindow()` helpers.
5. Default values: morning 7:00-9:00 AM, evening 7:00-9:00 PM.
6. Add toggle to disable auto-popups (user prefers manual buttons only).
7. Update PlannerScreen to read config and use helpers for modal triggering.
8. Test: change settings, verify windows respected.

---

## Phase 4 — Global Tasks Drawer

### Task P4-T1: Create PlannerDrawer component

1. Create `components/modern/PlannerDrawer.tsx` (or locate if exists; adapt existing implementation).
2. Props: `isOpen`, `onClose`, `items`, `assignments`, `onAdd`, `selectedDate`.
3. Drawer slides in from right (mobile: full width, desktop: 400px).
4. Use framer-motion for slide animation; backdrop click closes.
5. Header: "Add to Plan" title, close button, selected date display.
6. Filter tabs: All | Tasks | Notes | Lists.
7. Show item list filtered by selected type.
8. Test: render drawer, verify open/close animation works.

### Task P4-T2: Visual indicators for planned items

1. In PlannerDrawer, receive `assignments` prop (all assignments, not just today).
2. For each item, check if it has any assignment via `assignments.some(a => a.item_id === item.id)`.
3. If assigned: show badge/indicator with assigned date(s).
4. If assigned to current selectedDate: show "Already planned" with dimmed style.
5. Style: checkmark icon or colored border for assigned items.
6. Clicking assigned item shows option to "View in plan" or "Add to another day".
7. Test: have items assigned to various days, verify indicators show correctly.

### Task P4-T3: Search and sorting

1. Add search input at top of drawer; filter items by text match.
2. Sort order: (a) past due first (red highlight), (b) due today, (c) due soon, (d) no due date.
3. Within each group, sort by priority (high first).
4. Add sort dropdown: "Due date", "Priority", "Created", "Alphabetical".
5. Persist selected sort in localStorage.
6. Debounce search input (300ms) for performance.
7. Show "No matching items" empty state when search/filter yields nothing.
8. Test: search for items, change sort, verify results update correctly.

### Task P4-T4: Wire drawer to planner

1. In PlannerScreen, add state: `drawerOpen: boolean`.
2. Wire "Add to Plan" button to set `drawerOpen=true`.
3. Pass `onAdd` callback that calls `assignToDay(item.id, selectedDate)`.
4. After successful add, optionally close drawer or keep open for multiple adds.
5. Show toast/feedback: "Added [item text] to [date]".
6. Update planner view immediately via optimistic update.
7. Test: open drawer, add items, verify they appear in planner.

---

## Phase 5 — AI Append Flows (S2 Cherry-Pick)

### Task P5-T1: AI append to lists endpoint

1. Create `app/api/ai/append-list/route.ts` accepting `{ list_id, hint?, count? }`.
2. Fetch target list with existing items from DB.
3. Build prompt: "Given this list and its items, suggest [count, default 5, max 10] new items that fit the theme."
4. Include list type (shopping, todo, etc.) in prompt for context.
5. Call AI service via existing `aiService.generateSuggestions()` or similar.
6. Parse response into array of suggested item texts.
7. Return `{ suggestions: string[], confidence: number }`.
8. Add AI gating check; return 403 if AI disabled.

### Task P5-T2: AI append preview UI

1. In list viewer/editor, add "Append with AI" button (only when AI enabled).
2. On click, show loading state, call append-list API.
3. Display preview panel with suggested items as checkable list.
4. Each item has checkbox (default checked) and text.
5. "Accept Selected" button to add checked items to list.
6. "Regenerate" button to get new suggestions.
7. "Cancel" to close without changes.
8. Test: open list, click append, see suggestions, accept some.

### Task P5-T3: Persist appended items

1. When "Accept Selected" clicked, build list of selected suggestion texts.
2. Determine list item format (markdown bullets, numbered, checkbox based on list type).
3. Append formatted items to list content via update API.
4. Refresh list view to show new items.
5. Show success toast: "Added N items to list".
6. Handle partial failures gracefully (some items fail validation).
7. Test: accept suggestions, verify list content updated correctly.

### Task P5-T4: AI add to projects

1. Create `app/api/ai/project-suggest/route.ts` accepting `{ project_id, type: 'task' | 'note', hint? }`.
2. Fetch project with existing tasks/notes for context.
3. Build prompt: "Suggest [type]s that would help advance this project."
4. Return `{ suggestions: Array<{ text: string, metadata?: object }> }`.
5. In project view, add "Add Tasks via AI" and "Add Notes via AI" buttons.
6. Show preview panel similar to list append.
7. On accept, create actual task/note entities linked to project.
8. Test: use AI to add tasks to project, verify entities created with project link.

---

## Phase 6 — Recap & Notifications (S2 Cherry-Pick)

### Task P6-T1: Recap mode settings

1. Add settings section "Daily Recap" with mode selector: "Summary" | "Quote/Reflection".
2. Store in settings as `recap_config: { mode: 'summary' | 'quote' }`.
3. Default mode: 'summary'.
4. Add data threshold setting: minimum activity count to generate summary (default: 3 items).
5. If activity below threshold, auto-fallback to quote mode.
6. Add toggle to disable recap entirely.
7. Create `lib/recap-config.ts` with `getRecapMode()`, `getActivityThreshold()` helpers.
8. Test: change settings, verify config persists.

### Task P6-T2: Quote fallback database

1. Create `lib/quotes.ts` with array of 15-20 curated productivity/motivation quotes.
2. Each quote: `{ text: string, author?: string, category: 'motivation' | 'reflection' | 'productivity' }`.
3. Add `getRandomQuote()` function that returns a quote.
4. Add `getQuoteForDay(date: string)` that returns deterministic quote based on date hash (same quote for same day).
5. Add `getQuoteByCategory(category)` for themed selection.
6. Format quotes for display: "[text]" — [author].
7. Export for use in recap components.

### Task P6-T3: AI recap generation

1. Create `app/api/ai/recap/route.ts` accepting `{ date }`.
2. Fetch yesterday's activity: tasks completed, notes created, items captured.
3. If activity count < threshold, return `{ fallback: true, quote: getQuoteForDay(date) }`.
4. Otherwise, build prompt: "Summarize yesterday's productivity in 3-5 bullet points."
5. Call AI service, parse response into bullet array.
6. Return `{ summary: string[], stats: { tasks: N, notes: N, ... } }`.
7. Cache results in DB or localStorage (same recap for same day).
8. Test: trigger recap for yesterday, verify appropriate response.

### Task P6-T4: Recap display in Capture tab

1. In CaptureScreen, add "Yesterday's Recap" card at top (below header, above Today card).
2. On mount, check if recap enabled and call recap API.
3. Display based on mode: bullet list for summary, styled quote for quote mode.
4. Add collapse/expand toggle; remember state in localStorage.
5. Add "Regenerate" button for summary mode.
6. Style with retro card, appropriate typography.
7. Gate entire card behind AI enabled + recap enabled settings.
8. Test: see recap card, toggle modes, verify display changes.

### Task P6-T5: Daily reminder notification

1. Add settings UI: "Daily Review Reminder" toggle + time picker.
2. Store as `reminder_config: { enabled: boolean, time: string (HH:MM) }`.
3. In scheduler (lib/scheduler.ts), add CRON job that runs every minute.
4. Check if current time matches configured reminder time (within 1 minute).
5. If match and ntfy enabled: call `ntfyService.sendNotification('Time for daily review', ...)`.
6. If match and ntfy disabled: store flag to show in-app reminder on next visit.
7. Add dedupe: track last reminder date, only send once per day.
8. Test: set reminder time, verify notification fires (check ntfy or in-app flag).

### Task P6-T6: Ntfy docs and planner milestones

1. Update `docs/NTFY_SETUP.md` (or create) with current configuration flow.
2. Document: server URL, topic, auth if needed, testing steps.
3. Add milestone notifications: "Plan finalized!", "Evening review complete!".
4. Add notification for: all tasks completed for the day.
5. Make milestone notifications optional (setting toggle).
6. Improve notification content: include task count, completion percentage.
7. Test: complete milestones, verify notifications sent with good content.

---

## Phase 7 — Today Surface Polish & QA

### Task P7-T1: Wire AI recap to actual service

1. In CaptureScreen, replace any placeholder recap with actual API call.
2. Handle loading state with skeleton or spinner.
3. Handle error state gracefully (show generic message, offer retry).
4. Cache successful recap response for the day.
5. Add "last updated" timestamp display.
6. Ensure recap respects AI master toggle.
7. Test: verify real AI recap appears when enabled.

### Task P7-T2: Unsorted auto-expand behavior

1. In CaptureScreen, track `unsortedExpanded` state.
2. On new item captured to unsorted: auto-expand if collapsed.
3. Persist expand/collapse state to localStorage key `unsorted_expanded`.
4. On mount, read from localStorage; default to collapsed.
5. Add clear visual toggle button (chevron/arrow icon).
6. Animate expand/collapse with smooth height transition.
7. Test: capture item, verify unsorted expands; toggle collapse, refresh, verify state persists.

### Task P7-T3: Mobile spacing and tap targets

1. Audit CaptureScreen on mobile viewport (375px, 414px).
2. Ensure all tap targets are minimum 44x44px.
3. Fix any overlapping elements or cramped spacing.
4. Test Today card, Journal card, Media card interactions.
5. Verify scroll behavior works smoothly.
6. Fix any z-index issues with modals/drawers.
7. Test on actual mobile device or accurate emulation.

### Task P7-T4: Planner responsive audit

1. Test PlannerScreen on mobile (375px), tablet (768px), desktop (1200px+).
2. Week view: single column scroll on mobile, 7-column grid on desktop.
3. Mini calendar: collapsible on mobile, always visible on desktop.
4. Drawer: full-width on mobile, side panel on desktop.
5. Drag-drop: ensure works on touch devices (may need touch-specific handling).
6. Fix any layout breaks or overflow issues.
7. Document any mobile-specific limitations.

### Task P7-T5: Regression testing

1. Test capture flow: quick capture, voice input (if enabled), AI analysis.
2. Test entity creation: task, note, list, project modals save correctly.
3. Test planner: assign items, drag between days, morning/evening flows.
4. Test AI features with AI enabled and disabled.
5. Test settings: all toggles persist and affect behavior.
6. Run `npm run lint` and fix any errors.
7. Run `npm run build` to verify production build succeeds.
8. Document any issues found for immediate fix or Sprint 4.

### Task P7-T6: Documentation updates

1. Update `README.md` with Sprint 3 features: planner persistence, drag-drop, AI append.
2. Add usage notes for morning finalize and evening review flows.
3. Update `CHANGELOG.md` with sprint 3 release notes.
4. Update `CLAUDE.md` project context with new components and patterns.
5. Move completed rough-plan.md content to reference section.
6. Create Sprint 4 parking lot file with deferred items.
7. Commit all documentation changes.

---

## Execution Notes

- Each task is designed for independent implementation
- Tasks within a phase should generally be done in order (dependencies)
- Phases can be partially parallelized where noted
- Reference existing Sprint 2 context bundles for patterns
- Create phase-specific context files before starting each phase

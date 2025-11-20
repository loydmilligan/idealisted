# Next Sprint Plan — Capture/Planner & AI Enhancements

## Phase 1 — Markdown polish & UI refinement (former Phase 6)
- Convert list Template Selector to a mobile-friendly bottom sheet (match markdown editor).
- Swap AI/mic buttons to monochrome icons (entity colors + logo only).
- Add note-type picker modal similar to list selector.
- Link “Recently Captured” items to open the correct viewer/tab.
- Ensure tags on all markdown entities and fix tag filters on Files; add AI tag suggestion button in all markdown editor modals.
- Confirm project edit flow present in viewer.

## Phase 2 — Capture/Inbox rework
- Option A: merge Capture + Unsorted, using the “Recently Captured” section as the inbox; Option B: replace “Recently Captured” with a more useful surface (decide and implement).
- Add additional note types (beyond current generic/YouTube).

## Phase 3 — AI append/augment
- Allow AI to add items to existing lists (select target list, append items).
- Allow AI to add notes/tasks to existing projects (“add a note to project X…”).

## Phase 4 — Notifications
- Daily review reminder (client/server prompt) with configurable time; reuse ntfy infra if applicable.

## Phase 5 — Planner tab
- New Planner tab to choose tasks/lists/notes for a given day (“today’s plan”) with filters (due date, project, tags, overdue).
- Workflows: finalize today’s plan (morning/daily review) and draft tomorrow’s plan (evening); include multi-day planner view.
- Integrate “real” Idealisted tasks inside TaskLists/Projects where appropriate.

## Phase 6 — QA & Docs
- Mobile + desktop passes for new flows.
- Update README/CHANGELOG; ensure PM2 instructions remain accurate.

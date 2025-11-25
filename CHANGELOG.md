# Changelog

## 2025-11-24
- **Sprint 3 Batch 8**: Week view drag-drop (reorder within day, move between days), auto-forward incomplete tasks with reschedule API, AI recap localStorage caching with timestamps, responsive layout improvements (touch sensors, collapsible calendar, mobile grid optimization).
- **Sprint 3 Batch 9**: Comprehensive QA and documentation. Fixed test data generator to use API endpoints with proper template IDs (task, note-generic/meeting/research, project-standard, list-tasklist/shopping/bulleted). Verified markdown viewer opens correctly for all entity types (tasks, notes, projects, lists) instead of old editor. Planner week view, navigation, and mini calendar verified working.
- **Test Infrastructure**: Created `scripts/generate-test-data.js` for comprehensive test data generation (10 tasks with due dates/reminders/subtasks, 4 notes of various types, 3 projects with linked tasks, 3 lists, 3 plan assignments, 3 unsorted ideas).

## 2025-01-15
- Navigation: removed Unsorted tab; tabs now Capture / Ready / Planner / Files.
- Capture: quick-sort buttons with note/list subtypes; inline inbox collapsed by default with flash on new items; AI panel inline under capture; mobile tag input enter/tab fixed.
- Entities: Files cards now color-coded; task checkboxes with dim/line-through on completion; AI-created markdown entities open the markdown viewer via template inference.
- Planner: added tab scaffold with subheader, color-coded cards, task checkbox toggle, week grid, and slide-in “Add” drawer; journal/media streaks and recap/quote fallback in Today surface.
- Chrome extension: added for capturing YouTube and arbitrary URLs (see `chrome-extension/`).

## 2025-11-20
- Project markdown: added linked tasks/notes with viewer widgets (completion/staleness/last activity/priority, danger-zone alert) and “Add Note” flow using markdown templates.
- List markdown: added template selector for list conversions and reorder controls (up/down, enter-to-add, backspace-to-remove).
- AI UX: improved suggestion prompt to generate concise titles for lists/projects/notes; fixed double-save bug in markdown editor.
- PM2: added `ecosystem.config.js` for dev server (`npm run dev -- --hostname 0.0.0.0 --port 3300`), standardized PM2 start/reload.
- Planning cleanup: archived prior sprint/reference docs and added new plan for next sprint.

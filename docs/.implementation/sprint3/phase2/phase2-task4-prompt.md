# Prompt: P2-T4 — Mini calendar with task counts

Context: docs/.implementation/sprint3/phase2/phase2-task4-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 2), docs/.implementation/sprint3/tasks.md (P2-T4)

Goal
- Create MiniCalendar component for compact date navigation.
- Display task counts per day as visual indicators.
- Enable clicking days to navigate the planner view.
- Support month navigation with prev/next arrows.

Deliverables
- MiniCalendar.tsx component with month grid layout.
- Props: selectedDate, onDateSelect, taskCounts.
- Task count indicators (dots or numbers) on days with assignments.
- Month navigation arrows.
- Visual distinction for today and selected date.
- Integration into PlannerScreen header or sidebar.

Implementation steps (from tasks)
1) Create `components/modern/MiniCalendar.tsx` with props: selectedDate, onDateSelect, taskCounts.
2) Add local state for displayedMonth (month/year being shown, independent of selectedDate).
3) Generate day grid for displayed month: calculate first day of month, total days, weeks needed.
4) Render 7-column CSS grid with day-of-week headers (S M T W T F S or locale-based).
5) Render day cells: day number, onClick calls onDateSelect with that date.
6) For days with tasks (taskCounts[dateString] > 0): show indicator (dot or number badge).
7) Style today's date distinctly (e.g., bold text, ring border).
8) Style selected date differently (e.g., filled background, different color).
9) Add month navigation: prev/next arrows that change displayedMonth.
10) Position in PlannerScreen: header area on desktop; collapsible on mobile.
11) Calculate taskCounts in parent: group assignments by assigned_date, pass counts to MiniCalendar.
12) Test: click dates, verify planner updates; check counts match actual assignments.

Acceptance criteria
- MiniCalendar displays current month as 7-column grid.
- Days with tasks show visual indicator (dot or number).
- Clicking a day calls onDateSelect and updates planner view.
- Month navigation arrows work correctly.
- Today has distinct styling (identifiable at a glance).
- Selected date has distinct styling (different from today).
- Task counts accurately reflect actual assignments.
- Component is responsive (usable on mobile viewports).

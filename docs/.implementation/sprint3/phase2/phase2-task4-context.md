# Context: P2-T4 — Mini calendar with task counts

Purpose: Create a compact calendar component for the planner header/sidebar that displays task counts per day and enables date navigation.

Key decisions
- From plan: Compact month grid (7 columns, 5-6 rows) showing day numbers.
- Task counts: Fetch assignment counts per day; display as dot or number badge.
- Selected date: Highlight currently selected date distinctly from today.
- Today indicator: Different visual treatment (bold, ring, background).
- Navigation: Month arrows to navigate; clicking day triggers onDateSelect callback.
- Responsive: Mobile = collapsible/drawer; desktop = always visible in sidebar/header.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint3/tasks.md (P2-T4 steps).
- Code: PlannerScreen, plan-storage.ts (assignments data).
- API: GET /api/plan-assignments with date range for counts, or compute from loaded data.
- Similar patterns: date pickers in task modal, calendar components in other apps.

Implementation notes
- MiniCalendar props: selectedDate, onDateSelect, taskCounts (Record<string, number>).
- Calculate taskCounts from assignments data: group by assigned_date, count per day.
- Display: days with tasks show indicator (dot, number, colored background).
- Month navigation: prev/next arrows change displayed month; does not change selectedDate until day clicked.
- Grid layout: CSS grid 7 columns; rows vary by month (4-6 weeks).
- Accessibility: keyboard navigation, aria-labels for dates.

Testing/QA
- Calendar displays current month correctly.
- Task count indicators visible on days with assignments.
- Clicking a day updates the planner view to that date.
- Month navigation works (prev/next arrows).
- Today and selected date have distinct visual styling.
- Mobile: calendar collapses or fits within viewport.

# Context: P2-T1 — Add dnd-kit and week grid

Purpose: Install drag-drop library and create week grid view for the Planner, enabling the visual structure for multi-day planning.

Key decisions
- From plan: Use @dnd-kit/core and @dnd-kit/sortable for React drag-drop (modern, accessible, maintained).
- ViewMode toggle: 'day' | 'week' with button in header to switch.
- Week layout: 7 day columns (Mon-Sun or Sun-Sat based on locale), equal width, vertical scroll per column if content overflows.
- Today column gets visual highlight (border/background differentiation).
- Phase 1 must be complete (PlannerScreen, persistence layer, assignToDay wired).

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint3/tasks.md (P2-T1 steps).
- Code: components/modern/screens/PlannerScreen.tsx (created in P1), lib/plan-storage.ts.
- dnd-kit docs: https://dndkit.com/

Implementation notes
- Add dependencies: `npm install @dnd-kit/core @dnd-kit/sortable`
- Create WeekGrid as separate component for clarity; import into PlannerScreen.
- Each day column should receive assignments filtered by date.
- Columns should be styled consistently; use CSS grid or flexbox for equal widths.
- Consider viewport: on very narrow screens, week view may need horizontal scroll.

Testing/QA
- Toggle between day and week view; verify both render correctly.
- Week view shows 7 days with correct date headers for current week.
- Today column visually distinct.
- Assignments appear in correct day columns.
- No console errors from dnd-kit installation.

# Prompt: P2-T1 — Add dnd-kit and week grid

Context: docs/.implementation/sprint3/phase2/phase2-task1-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 2), docs/.implementation/sprint3/tasks.md (P2-T1)

Goal
- Install @dnd-kit/core and @dnd-kit/sortable for drag-drop functionality.
- Add week grid view mode to PlannerScreen with day/week toggle.
- Create WeekGrid component showing 7 day columns with assignments.

Deliverables
- dnd-kit packages installed and importable.
- PlannerScreen with viewMode state and toggle button.
- WeekGrid component rendering 7 day columns with date headers.
- Today column highlighted visually.
- Assignments displayed in their respective day columns.

Implementation steps (from tasks)
1) Install `@dnd-kit/core` and `@dnd-kit/sortable` via npm.
2) In PlannerScreen, add `viewMode: 'day' | 'week'` state (default 'day').
3) Add toggle button in planner header to switch between day and week views.
4) Create WeekGrid component with props for assignments, selectedDate, onDateSelect.
5) WeekGrid renders 7 day columns with date headers (Mon-Sun or locale-based).
6) Each day column renders its assignments as a vertical list (placeholder items, drag handles added in P2-T2).
7) Style columns with equal width; add vertical scroll if content overflows.
8) Add visual indicator for "today" column (highlighted border or background).
9) Integrate WeekGrid into PlannerScreen, shown when viewMode === 'week'.
10) Test: toggle to week view, verify 7 days display with current week dates.

Acceptance criteria
- dnd-kit packages in package.json and importable without errors.
- Day/week toggle works; both views render correctly.
- Week view shows 7 columns with correct dates for the current week.
- Today column has distinct visual styling.
- Assignments appear in correct day columns based on assigned_date.
- No layout breaks; columns have equal width.

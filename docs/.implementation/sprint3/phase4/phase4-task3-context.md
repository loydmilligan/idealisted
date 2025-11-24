# Context: P4-T3 — Search and sorting

Purpose: Add search input and sort controls to PlannerDrawer for efficient item discovery and organization.

## Key Decisions

- From plan: Add search input to filter items by text; sort by due date (past due first), then priority.
- Search input at top of drawer; filter items by text match (case-insensitive).
- Sort dropdown with options: Due date, Priority, Created, Alphabetical.
- Default sort: Due date (past due first, due today, due soon, no due date).
- Persist selected sort in localStorage.
- Debounce search input (300ms) for performance.
- Show "No matching items" empty state when search/filter yields nothing.

## Scope

- Add search text input with debounced filtering
- Add sort dropdown with multiple options
- Implement sort logic for each option
- Past due items highlighted (red indicator)
- Persist sort preference to localStorage
- Maintain filter tabs (All/Tasks/Notes/Lists) working alongside search

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 4)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P4-T3 steps)
- Component: `components/modern/PlannerDrawer.tsx`
- Item type: `types/index.ts` - `Item` with `task?.due_date`, `task?.priority`

## Implementation Notes

- Search state: local `searchQuery: string`
- Sort state: local with localStorage persistence, key `planner_drawer_sort`
- Debounce hook or inline setTimeout for search
- Sort order definitions:
  - Due date: past due (red) -> due today -> due soon -> no due date; within groups by date
  - Priority: high (3) -> medium (2) -> low (1) -> no priority
  - Created: newest first (created_at descending)
  - Alphabetical: A-Z by item.text
- Past due detection: `task?.due_date && task.due_date < Date.now()`
- Filter chain: type filter -> search filter -> sort

## Testing/QA

- Search filters items by text match (case-insensitive)
- Search debounced (no rapid re-filtering on each keystroke)
- Sort dropdown changes item order correctly
- Past due items appear first in due date sort
- Past due items have red visual indicator
- Sort preference persists across drawer open/close
- Sort preference persists across page refresh
- Empty state shown when no items match search + filter
- Filter tabs + search work together correctly

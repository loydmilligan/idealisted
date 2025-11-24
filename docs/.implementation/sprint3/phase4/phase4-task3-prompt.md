# Prompt: P4-T3 — Search and sorting

Context: `docs/.implementation/sprint3/phase4/phase4-task3-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 4), `docs/.implementation/sprint3/tasks.md` (P4-T3)

## Goal

Add search input and sort dropdown to PlannerDrawer for efficient item filtering and organization, with past-due highlighting and localStorage persistence.

## Deliverables

- Search input with debounced text filtering
- Sort dropdown: Due date, Priority, Created, Alphabetical
- Past-due visual highlighting (red indicator)
- localStorage persistence for sort preference
- "No matching items" empty state

## Implementation Steps (from tasks)

1. Add search input at top of drawer with placeholder "Search items..."
2. Implement debounced search (300ms) using useState + useEffect or custom hook
3. Add sort dropdown next to search: options = ["Due date", "Priority", "Created", "Alphabetical"]
4. Implement sort logic for each option:
   - Due date: group by past due (negative diff) -> today -> future -> no date; sort within by date
   - Priority: sort by task?.priority descending (high=3 first, handle null as 0)
   - Created: sort by created_at descending (newest first)
   - Alphabetical: sort by item.text.toLowerCase() ascending
5. Add past-due detection: `const isPastDue = task?.due_date && task.due_date < Date.now()`
6. Apply red highlight/badge for past-due items (e.g., "OVERDUE" badge or red border)
7. Save sort preference to localStorage key `planner_drawer_sort`; read on mount
8. Show empty state when filtered list is empty: "No matching items" with reset option
9. Test: search, sort, past-due highlighting, persistence

## Acceptance Criteria

- Search input filters items case-insensitively by text content
- Search debounced at 300ms (no flicker during typing)
- Sort dropdown has 4 options, all functional
- Due date sort groups: past due -> due today -> due soon -> no due date
- Priority sort: high first, then medium, low, unset
- Past-due items have visible red indicator (badge, border, or text color)
- Sort preference saved to localStorage and restored on drawer open
- Empty state shown when no items match current search + type filter
- Filter tabs (All/Tasks/Notes/Lists) combine correctly with search

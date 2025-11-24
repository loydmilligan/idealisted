# Context: P4-T4 — Wire drawer to planner

Purpose: Integrate PlannerDrawer component with PlannerScreen, connecting the Add button functionality to the planner assignment system.

## Key Decisions

- From plan: Wire "Add" button click in drawer to call `assignToDay()` function.
- After successful add, show feedback toast and optionally keep drawer open for multiple adds.
- Planner view updates immediately via optimistic update.
- Drawer opens when "Add to Plan" button clicked in PlannerScreen.
- Drawer receives current selectedDate for assignment targeting.

## Scope

- Add drawer state to PlannerScreen: `drawerOpen: boolean`
- Wire "Add to Plan" button to open drawer
- Pass `onAdd` callback that calls `assignToDay(item.id, selectedDate)`
- Implement feedback (toast/notification) on successful add
- Optimistic UI update: item appears in planner immediately
- Handle add errors gracefully

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 4)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P4-T4 steps)
- Components:
  - `components/modern/PlannerDrawer.tsx` (created P4-T1 through P4-T3)
  - `components/modern/screens/PlannerScreen.tsx` (created P1-T4 or needs creation)
- Assignment function: `assignToDay()` from P1-T5 (plan-storage.ts)
- Toast pattern: look for existing toast/notification usage in codebase

## Implementation Notes

- State: `const [drawerOpen, setDrawerOpen] = useState(false)`
- Props to pass to drawer:
  - `isOpen={drawerOpen}`
  - `onClose={() => setDrawerOpen(false)}`
  - `items={availableItems}` (filtered by type, excluding already archived)
  - `assignments={allAssignments}` (for indicator logic)
  - `onAdd={handleAddToDay}`
  - `selectedDate={selectedDate}`
- `handleAddToDay` function:
  1. Call `assignToDay(itemId, selectedDate)`
  2. Update local assignments state optimistically
  3. Show success toast: "Added [item text] to [formatted date]"
  4. Optionally keep drawer open for batch adds
- Error handling: catch assignment failures, show error toast, rollback optimistic update
- Filter: availableItems should exclude archived items, possibly filter by !planned-for-today

## Testing/QA

- "Add to Plan" button in planner opens drawer
- Drawer receives correct selectedDate
- Clicking Add on item calls assignToDay with correct params
- Item appears in planner view immediately (optimistic)
- Success toast/feedback shown
- Multiple items can be added without closing drawer
- Drawer can be closed via backdrop, button, or escape
- Errors handled gracefully (toast + rollback)
- Assignment persists after page refresh (via P1 persistence layer)

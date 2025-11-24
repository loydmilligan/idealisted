# Context: P1-T4 — Create PlannerScreen component

Purpose: Create the main PlannerScreen component that displays daily assignments with date navigation, integrating with the LocalStorage layer for data loading.

## Key Decisions

- **Component location**: `components/modern/screens/PlannerScreen.tsx` follows app architecture
- **Date navigation**: Previous/Today/Next navigation in header
- **Data loading**: Uses `loadFromServer` on mount and date change
- **Visual placeholder**: Drag handles visible but non-functional (P2 adds drag)
- **Empty state**: Friendly message when no assignments for a date
- **Integration point**: Wires into `app/page.tsx` planner tab case

## Component API

```typescript
interface PlannerScreenProps {
  assignments: PlanAssignment[]
  items: ItemWithRelations[]
  onAssign: (itemId: string, date: string) => void
  onRemove: (assignmentId: string) => void
  selectedDate: string  // YYYY-MM-DD
  onDateChange: (date: string) => void
}
```

## UI Structure

```
+---------------------------------------+
| < Prev   [Today]   Next >   Jan 15    |
+---------------------------------------+
|                                       |
|  [=] Task: Review PR #123             |
|  [=] Note: Meeting notes              |
|  [=] Task: Fix login bug              |
|                                       |
|  [+ Add to Plan]                      |
|                                       |
|  --- Empty state when no items ---    |
|  No items planned for Jan 15.         |
|  Add some tasks!                      |
|                                       |
+---------------------------------------+
```

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 1)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P1-T4 steps)
- Storage layer: `lib/plan-storage.ts` (from P1-T3)
- Types: `types/index.ts` (PlanAssignment, ItemWithRelations)
- Main page: `app/page.tsx` (planner tab integration point)

## Implementation Notes

- Use framer-motion for any animations (consistent with app)
- Follow retro design system (`components/ui/` patterns)
- Date formatting: use `toLocaleDateString` with appropriate options
- "Today" button should jump to current date
- Drag handle icon: `=` or grip icon (visual only this task)
- Load data on mount via `useEffect` calling `loadFromServer`
- Update data when `selectedDate` changes

## Integration with page.tsx

Find the planner tab case in the main switch/conditional and render:
```tsx
<PlannerScreen
  assignments={assignments}
  items={items}
  onAssign={handleAssignToDay}
  onRemove={handleRemoveFromDay}
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
/>
```

## Testing/QA

- Navigate to Planner tab; component renders
- Click prev/next; date changes, data reloads
- Click Today; jumps to current date
- Empty state shows when no assignments
- Items display with drag handles (visual only)
- "Add to Plan" button visible (wired in P4)

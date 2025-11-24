# Prompt: P1-T4 — Create PlannerScreen component

Context: `docs/.implementation/sprint3/phase1/phase1-task4-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 1), `docs/.implementation/sprint3/tasks.md` (P1-T4)

## Goal

Create the main PlannerScreen component that displays daily assignments with date navigation, loading data via the LocalStorage layer.

## Deliverables

- `components/modern/screens/PlannerScreen.tsx` component
- Date navigation header (prev/today/next)
- Assignment list with drag handles (visual only)
- Empty state display
- Integration into `app/page.tsx` planner tab

## Implementation Steps (from tasks)

1. Create `components/modern/screens/PlannerScreen.tsx` with props:
   ```typescript
   interface PlannerScreenProps {
     assignments: PlanAssignment[]
     items: ItemWithRelations[]
     onAssign: (itemId: string, date: string) => void
     onRemove: (assignmentId: string) => void
     selectedDate: string
     onDateChange: (date: string) => void
   }
   ```

2. Import from `lib/plan-storage.ts`; call `loadFromServer` on mount and when `selectedDate` changes.
   ```typescript
   useEffect(() => {
     loadFromServer(selectedDate).then(setLocalAssignments)
   }, [selectedDate])
   ```

3. Display date navigation header:
   - `< Prev` button: decrements date by 1 day
   - `Today` button: jumps to current date
   - `Next >` button: increments date by 1 day
   - Date display: formatted nicely (e.g., "January 15, 2024")

4. Render today's assignments list with drag handles (visual only this task; P2 adds drag functionality).
   - Each item shows: drag handle icon (`=` or grip), entity type badge, item text
   - Style with retro design system classes

5. Add "Add to Plan" button that will open drawer (P4 wires this).
   - Button visible but onClick empty/placeholder for now

6. Show empty state when no assignments:
   ```
   No items planned for [formatted date].
   Add some tasks!
   ```

7. Integrate into `app/page.tsx` planner tab case:
   - Add state for `selectedDate` (default: today's date YYYY-MM-DD)
   - Add state for planner `assignments`
   - Pass through required props to PlannerScreen

8. Test: navigate to planner tab, change dates, verify data loads correctly.

## Acceptance Criteria

- [ ] PlannerScreen component created with all required props
- [ ] Date navigation works: prev/today/next buttons function
- [ ] `loadFromServer` called on mount and date change
- [ ] Assignments list displays items with drag handles
- [ ] Empty state shows when no assignments for date
- [ ] "Add to Plan" button visible
- [ ] Integrated into main page planner tab
- [ ] Follows retro design system styling

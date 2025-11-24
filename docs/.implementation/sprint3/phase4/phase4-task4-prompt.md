# Prompt: P4-T4 — Wire drawer to planner

Context: `docs/.implementation/sprint3/phase4/phase4-task4-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 4), `docs/.implementation/sprint3/tasks.md` (P4-T4)

## Goal

Integrate PlannerDrawer with PlannerScreen, wiring the Add functionality to the assignment system with optimistic updates and user feedback.

## Deliverables

- Drawer state management in PlannerScreen
- "Add to Plan" button that opens drawer
- `onAdd` callback wired to `assignToDay()` function
- Success toast/feedback on add
- Optimistic UI updates
- Error handling

## Implementation Steps (from tasks)

1. In PlannerScreen, add state: `const [drawerOpen, setDrawerOpen] = useState(false)`
2. Add "Add to Plan" button in planner header/toolbar that sets `drawerOpen=true`
3. Import and render PlannerDrawer with AnimatePresence wrapper
4. Create `handleAddToDay` async function:
   ```typescript
   const handleAddToDay = async (itemId: string) => {
     const item = items.find(i => i.id === itemId)
     try {
       await assignToDay(itemId, selectedDate)
       // Optimistic: add to local assignments state
       setAssignments(prev => [...prev, { id: generateId(), item_id: itemId, assigned_date: selectedDate, position: getNextPosition() }])
       showToast(`Added "${item?.text}" to ${formatDate(selectedDate)}`)
     } catch (error) {
       showToast('Failed to add item', 'error')
     }
   }
   ```
5. Pass all required props to PlannerDrawer: `isOpen`, `onClose`, `items`, `assignments`, `onAdd`, `selectedDate`
6. Keep drawer open after add for batch operations (user closes manually when done)
7. Verify planner view updates immediately with newly added item
8. Test: full flow from button click to assignment persisted

## Acceptance Criteria

- "Add to Plan" button visible and functional in PlannerScreen
- Clicking button opens PlannerDrawer with correct props
- Items from drawer can be added via Add button
- `assignToDay()` called with correct (itemId, selectedDate)
- Planner view shows new item immediately (optimistic update)
- Success feedback displayed (toast or inline message)
- Drawer stays open for adding multiple items
- Drawer closes correctly via all methods (backdrop, button, escape)
- Errors show error toast, no crash
- Added items persist after page refresh
- Items added to correct date (not wrong day)

# Prompt: P1-T5 — Wire assignToDay to persistence

Context: `docs/.implementation/sprint3/phase1/phase1-task5-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 1), `docs/.implementation/sprint3/tasks.md` (P1-T5)

## Goal

Implement `assignToDay` and `removeFromDay` functions that connect UI actions to LocalStorage (immediate) and database (background sync), completing the persistence layer.

## Deliverables

- `assignToDay(itemId, date)` function with optimistic updates
- `removeFromDay(assignmentId)` function with optimistic updates
- Position calculation for new assignments
- Error handling with toast notifications
- Integration with PlannerScreen component

## Implementation Steps (from tasks)

1. In PlannerScreen, add `assignToDay(itemId, date)` function that:
   - (a) Creates new assignment object with generated ID, position = max + 1
   - (b) Updates React state optimistically (add to assignments array)
   - (c) Updates localStorage via `setLocalAssignments`
   - (d) Triggers `syncToServer(date)` for background sync

2. Calculate next position as `max(existing positions) + 1` for new assignments:
   ```typescript
   const existingAssignments = getLocalAssignments(date)
   const maxPosition = existingAssignments.reduce(
     (max, a) => Math.max(max, a.position),
     0
   )
   const newPosition = maxPosition + 1
   ```

3. Update React state optimistically before sync completes:
   ```typescript
   setAssignments(prev => [...prev, newAssignment])
   ```

4. Handle sync failures: show toast, keep local state, retry on next action.
   - Use try/catch around syncToServer
   - Display non-blocking error toast
   - Local state remains correct for user

5. Wire "Add" button click in drawer (when implemented in P4) to call `assignToDay`.
   - For now, prepare the callback; P4 will connect the drawer

6. Add `removeFromDay(assignmentId)` that:
   - Updates React state (filter out assignment)
   - Updates localStorage
   - Triggers sync to delete from server

7. Test: assign item, refresh page, verify assignment persists; remove item, verify removal persists.

## Acceptance Criteria

- [ ] `assignToDay(itemId, date)` adds assignment optimistically
- [ ] New assignments get correct position (max + 1)
- [ ] LocalStorage updated immediately on assign/remove
- [ ] Background sync triggered via `syncToServer`
- [ ] Sync failures show toast; local state preserved
- [ ] `removeFromDay(assignmentId)` removes assignment optimistically
- [ ] Assignment persists across page refresh
- [ ] Removal persists across page refresh
- [ ] Functions ready for drawer integration in P4

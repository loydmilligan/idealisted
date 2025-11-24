# Context: P1-T5 — Wire assignToDay to persistence

Purpose: Implement the `assignToDay` and `removeFromDay` functions that connect UI actions to both LocalStorage (immediate) and database (background sync), completing the persistence loop.

## Key Decisions

- **Optimistic updates**: React state updates immediately before sync completes
- **Position calculation**: New assignments get `MAX(position) + 1` for the date
- **Error recovery**: Show toast on sync failure, keep local state, retry on next action
- **Remove behavior**: Deletes assignment record only (item remains)
- **Drawer wiring**: `assignToDay` becomes the callback for drawer item selection (P4)

## Function Signatures

```typescript
// Assign an item to a specific date
async function assignToDay(itemId: string, date: string): Promise<void>

// Remove an assignment (not the item itself)
async function removeFromDay(assignmentId: string): Promise<void>
```

## Flow Diagram

```
User clicks "Add" in drawer
      |
      v
assignToDay(itemId, date)
      |
      +---> Update React state (optimistic)
      |
      +---> Update localStorage
      |
      +---> Trigger syncToServer(date) [debounced]
      |
      v
Sync succeeds -> Done
Sync fails -> Show toast, state already correct locally, retry later
```

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 1)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P1-T5 steps)
- Storage layer: `lib/plan-storage.ts` (from P1-T3)
- API endpoints: `app/api/plan-assignments/` (from P1-T2)
- PlannerScreen: `components/modern/screens/PlannerScreen.tsx` (from P1-T4)

## Implementation Notes

- Add functions to PlannerScreen or create hook `usePlannerPersistence`
- Use `useState` for assignments with optimistic updates
- Position calculation: query localStorage for max position of target date
- Generate UUID for new assignment (use `crypto.randomUUID()` or uuid)
- Toast notifications: use existing toast system if available, or simple inline error

## Error Handling

- Sync failure: Log error, show non-blocking toast, keep local state
- Network offline: Queue in localStorage (handled by plan-storage layer)
- Duplicate assignment: Should not happen if UI prevents it; API returns 409

## Testing/QA

- Assign item to today; verify appears in list immediately
- Refresh page; verify assignment persists from database
- Remove item from day; verify disappears immediately
- Refresh page; verify removal persisted
- Simulate network failure; verify local state intact, toast shown
- Verify position ordering: new items appear at end of list

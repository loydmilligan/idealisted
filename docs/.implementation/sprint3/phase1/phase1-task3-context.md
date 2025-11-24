# Context: P1-T3 — LocalStorage layer for immediate UX

Purpose: Create a LocalStorage caching layer that provides immediate UI feedback while syncing to the database in the background, ensuring a responsive planner experience.

## Key Decisions

- **LocalStorage as cache**: Immediate writes to localStorage, background sync to server
- **Debounced sync**: 1000ms debounce prevents API spam during rapid interactions
- **Merge strategy**: Server data wins on initial load; local changes win during session
- **Offline support**: Queue syncs when offline; flush when back online
- **Key pattern**: `planner_assignments_YYYY-MM-DD` for per-date storage

## Architecture

```
User Action -> LocalStorage (instant) -> Debounce -> API Sync (background)
                     ^                                    |
                     |_____ On page load, merge <---------+
```

## API Contract

```typescript
// lib/plan-storage.ts

// Get assignments for a date from localStorage
function getLocalAssignments(date: string): PlanAssignment[]

// Save assignments for a date to localStorage
function setLocalAssignments(date: string, assignments: PlanAssignment[]): void

// Clear all local assignment data
function clearLocalAssignments(): void

// Sync local changes to server (debounced)
function syncToServer(date: string): Promise<void>

// Fetch from server and update localStorage
function loadFromServer(date: string): Promise<PlanAssignment[]>

// Check network status
function isOnline(): boolean
```

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 1)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P1-T3 steps)
- Types: `types/index.ts` (PlanAssignment type from P1-T1)
- API: `app/api/plan-assignments/` (endpoints from P1-T2)

## Implementation Notes

- Use `window.localStorage` with JSON stringify/parse
- Debounce via setTimeout pattern or lodash-style debounce
- Track `last_synced_at` timestamp in localStorage for merge decisions
- Queue offline operations in `planner_sync_queue` localStorage key
- Add error handling for localStorage quota exceeded
- Export typed interface; add JSDoc comments explaining sync behavior

## Merge Strategy Details

1. **Initial load (page refresh)**:
   - Fetch server data first
   - Compare server `updated_at` vs local `last_synced_at`
   - If server is newer, replace local data
   - If local is newer (offline changes), push local to server

2. **During session**:
   - Local changes are immediately visible
   - Background sync to server
   - No merge conflicts expected (single user)

3. **Coming back online**:
   - Process queued sync operations
   - Re-fetch server data for any dates that had pending syncs

## Testing/QA

- Verify immediate localStorage updates on assignment
- Verify debounced sync fires after 1000ms idle
- Test offline: make changes, verify queued, go online, verify synced
- Test page refresh: data persists from localStorage immediately
- Test server fetch: merges correctly with local data

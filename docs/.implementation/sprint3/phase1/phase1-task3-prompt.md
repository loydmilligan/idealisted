# Prompt: P1-T3 — LocalStorage layer for immediate UX

Context: `docs/.implementation/sprint3/phase1/phase1-task3-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 1), `docs/.implementation/sprint3/tasks.md` (P1-T3)

## Goal

Create a LocalStorage caching layer that provides immediate UI updates while syncing to the database in the background.

## Deliverables

- `lib/plan-storage.ts` with localStorage CRUD functions
- Debounced sync to server (1000ms)
- Merge strategy implementation (server wins on load, local wins during session)
- Offline queue with sync-on-reconnect
- JSDoc comments explaining behavior

## Implementation Steps (from tasks)

1. Create `lib/plan-storage.ts` with functions: `getLocalAssignments(date)`, `setLocalAssignments(date, assignments)`, `clearLocalAssignments()`.

2. Use localStorage key pattern: `planner_assignments_YYYY-MM-DD` for per-date storage.
   ```typescript
   const STORAGE_KEY_PREFIX = 'planner_assignments_'
   const getStorageKey = (date: string) => `${STORAGE_KEY_PREFIX}${date}`
   ```

3. Add `syncToServer(date)` function that POSTs/PUTs local changes to API (debounced 1000ms).
   - Compare local vs last known server state
   - Send only changed assignments
   - Handle partial failures gracefully

4. Add `loadFromServer(date)` function that fetches from API and updates localStorage.
   - Call GET `/api/plan-assignments?date=YYYY-MM-DD`
   - Update localStorage with server data
   - Track `last_synced_at` timestamp

5. Implement merge strategy:
   - On page load, fetch server data
   - If localStorage has newer timestamps, prefer local; otherwise use server
   - Store comparison metadata in `planner_sync_meta` key

6. Add `isOnline()` check using `navigator.onLine`.
   - Queue syncs when offline in `planner_sync_queue` key
   - Listen for `online` event to flush queue

7. Export typed interface; add JSDoc comments explaining sync behavior.

## Acceptance Criteria

- [ ] `getLocalAssignments(date)` returns cached data instantly
- [ ] `setLocalAssignments(date, assignments)` saves to localStorage immediately
- [ ] `syncToServer(date)` debounces at 1000ms; only fires once after rapid changes
- [ ] `loadFromServer(date)` fetches from API and updates localStorage
- [ ] Merge correctly: server wins on fresh load, local wins during session
- [ ] Offline changes queued and synced when back online
- [ ] TypeScript types properly defined
- [ ] JSDoc comments on all exported functions

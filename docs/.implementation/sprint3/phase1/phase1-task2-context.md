# Context: P1-T2 — Plan assignments API endpoints

Purpose: Create REST API endpoints for CRUD operations on plan assignments, enabling the frontend to persist and retrieve item-to-date mappings.

## Key Decisions

- **RESTful design**: Standard CRUD pattern matching existing API routes
- **GET with date filter**: Query by date returns all assignments for that day with joined item data
- **Ordering support**: Position field enables drag-drop reordering; PUT handles position updates
- **Item data join**: GET returns full item data with assignments for immediate display
- **Error handling**: FK violations (item doesn't exist) and duplicate constraint violations

## API Endpoints

### `GET /api/plan-assignments?date=YYYY-MM-DD`
- Returns all assignments for the specified date
- Includes joined item data (text, type, task/note details)
- Ordered by position ascending

### `POST /api/plan-assignments`
- Body: `{ item_id, assigned_date, position? }`
- Creates new assignment; auto-assigns position if not provided
- Returns created assignment with ID

### `PUT /api/plan-assignments/[id]`
- Body: `{ assigned_date?, position? }`
- Updates position or moves to different date
- Handles reordering other items when position changes

### `DELETE /api/plan-assignments/[id]`
- Removes assignment (does NOT delete the underlying item)
- Returns success status

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 1)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P1-T2 steps)
- API patterns: `app/api/items/route.ts` (GET/POST pattern)
- API patterns: `app/api/items/[id]/route.ts` (GET/PUT/DELETE pattern)
- Schema: P1-T1 creates `plan_assignments` table

## Implementation Notes

- Follow existing API route patterns in `app/api/`
- Use prepared statements for all queries
- Return `{ success: true, data: ... }` or `{ error: '...' }` format
- Handle 400 for validation errors, 404 for not found, 500 for server errors
- Join with items table for GET to return full item data
- Position calculation for new assignments: `MAX(position) + 1` for the date

## Testing/QA

- Test GET with different dates; verify filtering works
- Test POST creates assignment with correct position
- Test PUT moves between dates; verify positions updated
- Test DELETE removes assignment; item still exists
- Test FK violation when item_id doesn't exist (should 400)
- Test duplicate assignment blocked by unique constraint

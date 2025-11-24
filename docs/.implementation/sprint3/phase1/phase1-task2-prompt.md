# Prompt: P1-T2 — Plan assignments API endpoints

Context: `docs/.implementation/sprint3/phase1/phase1-task2-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 1), `docs/.implementation/sprint3/tasks.md` (P1-T2)

## Goal

Create RESTful API endpoints for CRUD operations on plan assignments, enabling persistence of item-to-date mappings.

## Deliverables

- `app/api/plan-assignments/route.ts` with GET (query by date) and POST (create assignment)
- `app/api/plan-assignments/[id]/route.ts` with PUT (update) and DELETE (remove)
- Proper error handling for FK violations and duplicates
- Joined item data in GET responses

## Implementation Steps (from tasks)

1. Create `app/api/plan-assignments/route.ts` with GET (query by date) and POST (create assignment).

2. **GET handler**:
   - Accept `date` query param (YYYY-MM-DD format)
   - Return all assignments for that date with joined item data
   - Order by position ascending
   - Include task/note/project details from related tables

3. **POST handler**:
   - Accept `{ item_id, assigned_date, position? }` body
   - Validate item_id exists in items table
   - Calculate position as `MAX(position) + 1` if not provided
   - Insert record, return created assignment with ID

4. Create `app/api/plan-assignments/[id]/route.ts` with PUT (update position/date) and DELETE (remove assignment).

5. **PUT handler**:
   - Accept `{ assigned_date?, position? }` body
   - Update position or move to different date
   - Handle reordering other items if needed (shift positions)

6. **DELETE handler**:
   - Remove assignment by ID
   - Do NOT delete the underlying item
   - Return `{ success: true }`

7. Add error handling for FK violations (item doesn't exist - 400) and duplicate assignment attempts (409).

8. Test endpoints via curl or API client; verify data persists across requests.

## Acceptance Criteria

- [ ] GET `/api/plan-assignments?date=2024-01-15` returns assignments for that date
- [ ] GET response includes joined item data (text, type, entity details)
- [ ] POST creates assignment with auto-calculated position
- [ ] POST with non-existent item_id returns 400 error
- [ ] POST duplicate assignment returns 409 conflict
- [ ] PUT updates position or date correctly
- [ ] DELETE removes assignment; underlying item remains
- [ ] All responses follow `{ success, data/error }` pattern

# Context: P5-T3 — Persist appended items

Purpose: When user clicks "Accept Selected" in the AI preview panel, persist the selected suggestions as actual list items in the database.

## Key Decisions

- From plan: Persist accepted items to list on confirmation.
- Items added via existing list item API or direct database insert.
- Position calculation: append to end of current items (max position + 1, incrementing).
- List type determines item format: shopping list items vs tasklist checkboxes.
- Success feedback via toast notification.
- Handle partial failures gracefully.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 5: AI Append Flows).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P5-T3 steps).
- List item types: `types/index.ts` (ListItem interface).
- Database schema: `lib/db.ts` (list_items table).
- Items API: `app/api/items/route.ts` for patterns.
- List items API: May need to create or extend if not exists.

## Implementation Notes

- Receive selected suggestions from P5-T2 preview panel.
- Determine list type to set initial `done` state:
  - Shopping/tasklist: `done = false` (checkable items)
  - Bulleted/numbered: `done = false` (or null if not applicable)
- Calculate next position value from existing items.
- Insert items with proper structure:
  ```typescript
  {
    id: uuid,
    list_id: string,
    text: string,
    done: boolean,
    position: number,
    created_at: timestamp
  }
  ```
- Use transaction for atomic insert of multiple items.
- Refresh list view to show new items.
- Show success toast: "Added N items to list".
- Handle validation failures (empty text, etc.) gracefully.

## Testing/QA

- Selected items are saved to database correctly.
- New items appear in correct positions (at end of list).
- List refreshes to show new items immediately.
- Toast notification confirms addition.
- Partial failures don't break entire operation.
- Empty selection doesn't trigger save.
- List type correctly determines item format.

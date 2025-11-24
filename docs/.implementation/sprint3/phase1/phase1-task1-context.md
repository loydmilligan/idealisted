# Context: P1-T1 — Database schema for plan assignments

Purpose: Create the `plan_assignments` table to persist item-to-date mappings for the Planner feature, enabling items to be assigned to specific days with ordering support.

## Key Decisions

- **Table design**: `plan_assignments` links items to dates with position ordering
- **Unique constraint**: `(item_id, assigned_date)` prevents duplicate assignments of same item to same day
- **Index on assigned_date**: Enables efficient queries for "what's planned for this day"
- **Separate from plans table**: The existing `plans` table tracks daily plan metadata; `plan_assignments` tracks individual item assignments
- **Position field**: Integer for drag-drop reordering within a day

## Schema Definition

```sql
CREATE TABLE plan_assignments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  assigned_date TEXT NOT NULL,  -- YYYY-MM-DD format
  position INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE(item_id, assigned_date)
);

CREATE INDEX idx_plan_assignments_date ON plan_assignments(assigned_date);
CREATE INDEX idx_plan_assignments_item ON plan_assignments(item_id);
```

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 1)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P1-T1 steps)
- Schema patterns: `lib/db.ts` (existing tables, ALTER TABLE patterns, index creation)
- Types: `types/index.ts` (existing type definitions)

## Implementation Notes

- Follow existing schema patterns in `lib/db.ts` lines 431-726
- Use ALTER TABLE with try/catch for adding columns (pattern at lines 477-495)
- Add to existing `initializeDatabase()` function (lines 403-734)
- Migration handled by auto-drop logic if schema test fails (lines 405-428)
- Create TypeScript type `PlanAssignment` in `types/index.ts`

## Testing/QA

- Run dev server to trigger auto-migration
- Verify table exists via SQLite browser or query
- Check unique constraint prevents duplicate assignments
- Verify ON DELETE CASCADE removes assignments when item deleted
- Check indexes created properly

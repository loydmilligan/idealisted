# Prompt: P1-T1 — Database schema for plan assignments

Context: `docs/.implementation/sprint3/phase1/phase1-task1-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 1), `docs/.implementation/sprint3/tasks.md` (P1-T1)

## Goal

Create the `plan_assignments` database table to persist item-to-date mappings with ordering support for the Planner feature.

## Deliverables

- `plan_assignments` table in `lib/db.ts` with proper schema
- Unique constraint on `(item_id, assigned_date)`
- Index on `assigned_date` for efficient day-based queries
- TypeScript type `PlanAssignment` in `types/index.ts`
- Schema migration comment noting Sprint 3 addition

## Implementation Steps (from tasks)

1. Open `lib/db.ts` and locate the schema definitions section (near existing `plans` table around line 629).
2. Add `plan_assignments` table creation with columns: `id`, `item_id` (FK to items), `assigned_date` (TEXT YYYY-MM-DD), `position` (INTEGER for ordering), `created_at`, `updated_at`.
3. Add unique constraint on `(item_id, assigned_date)` to prevent duplicate assignments.
4. Add index on `assigned_date` for efficient day-based queries (in the index creation section near line 714).
5. Run dev server to trigger schema auto-migration; verify table exists via SQLite browser or query.
6. Add TypeScript type `PlanAssignment` to `types/index.ts` with fields: `{ id: string; item_id: string; assigned_date: string; position: number; created_at: number; updated_at: number }`.
7. Document migration in code comment noting Sprint 3 Phase 1 addition.

## Acceptance Criteria

- [ ] `plan_assignments` table created with all required columns
- [ ] Foreign key to `items(id)` with ON DELETE CASCADE
- [ ] Unique constraint on `(item_id, assigned_date)` enforced
- [ ] Index on `assigned_date` exists
- [ ] TypeScript `PlanAssignment` type exported from `types/index.ts`
- [ ] Dev server starts without errors
- [ ] Test insert succeeds; duplicate assignment blocked by constraint

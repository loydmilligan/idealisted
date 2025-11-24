# Context: P3-T1 — Plan status tracking

Purpose: Add plan status tracking to the database and API layer to support draft/finalized/completed workflow states.

## Key decisions

- From plan: Plans progress through states: draft -> finalized -> completed
- The `finalized_at` timestamp captures when user locked in their plan for the day
- Status field enables conditional UI (morning modal for draft, evening modal for finalized)

## Scope

- Add `status` and `finalized_at` columns to plans table schema
- Create finalize and complete API endpoints
- Update Plan type in TypeScript

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 3)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P3-T1 steps)
- Existing plans table: `lib/db.ts` (schema section)
- Existing plans API: `app/api/plans/route.ts`
- Type definitions: `types/index.ts` (Plan interface already has status/finalized_at fields)

## Current State Analysis

**Plan type already includes status fields** (types/index.ts:188-201):
```typescript
export interface Plan {
  id: string
  date: string // YYYY-MM-DD
  status?: string  // Already exists!
  finalized_at?: number | null | undefined  // Already exists!
  completed_at?: number | null | undefined  // Already exists!
  // ... other fields
}
```

**Plans table already has columns** (verify in db.ts):
- `status` column exists (set to 'draft' on creation)
- `finalized_at` column exists
- `completed_at` column exists

**Missing pieces**:
- Finalize endpoint: PUT `/api/plans/[id]/finalize`
- Complete endpoint: PUT `/api/plans/[id]/complete`
- API client methods (referenced in modals but not implemented)

## Implementation notes

- Check existing schema before adding columns (may already exist from earlier work)
- Create `/api/plans/[id]/route.ts` if needed for PUT operations
- Create `/api/plans/[id]/finalize/route.ts` for finalize action
- Create `/api/plans/[id]/complete/route.ts` for complete action
- Add apiClient methods: `finalizePlan(id)`, `completePlan(id)`, `autoPopulatePlan(date)`, `rescheduleTask(id, option, date?)`
- These methods are called by EveningReviewFlow and MorningFinalizeModal

## Testing/QA

- Create plan via API, verify status='draft' by default
- Call finalize endpoint, verify status='finalized' and finalized_at is set
- Call complete endpoint, verify status='completed' and completed_at is set
- Verify timestamps are Unix epoch (milliseconds)

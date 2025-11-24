# Prompt: P3-T1 — Plan status tracking

Context: `docs/.implementation/sprint3/phase3/phase3-task1-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 3), `docs/.implementation/sprint3/tasks.md` (P3-T1)

## Goal

Add plan status tracking with finalize and complete API endpoints. The existing modal components (MorningFinalizeModal, EveningReviewFlow) call apiClient methods that don't exist yet.

## Deliverables

- Verified/updated plans table schema with status column and timestamps
- PUT `/api/plans/[id]/route.ts` for updating plan fields
- PUT `/api/plans/[id]/finalize/route.ts` endpoint
- PUT `/api/plans/[id]/complete/route.ts` endpoint
- Updated `lib/api-client.ts` with new plan methods

## Implementation steps (from tasks)

1. Verify `plans` table schema in `lib/db.ts` has: status (TEXT), finalized_at (INTEGER nullable), completed_at (INTEGER nullable). If missing, add columns.

2. Create `app/api/plans/[id]/route.ts`:
   - GET: Fetch plan by ID with related tasks
   - PUT: Update plan fields (journal_entry, etc.)
   - Follow existing API patterns from `app/api/items/[id]/route.ts`

3. Create `app/api/plans/[id]/finalize/route.ts`:
   - PUT handler that sets `status='finalized'` and `finalized_at=Date.now()`
   - Return updated plan
   - Handle 404 if plan doesn't exist

4. Create `app/api/plans/[id]/complete/route.ts`:
   - PUT handler that sets `status='completed'` and `completed_at=Date.now()`
   - Return updated plan
   - Handle 404 if plan doesn't exist

5. Add to `lib/api-client.ts`:
   ```typescript
   async finalizePlan(id: string) {
     return this.request<{ plan: Plan }>(`/plans/${id}/finalize`, {
       method: 'PUT',
     })
   }

   async completePlan(id: string) {
     return this.request<{ plan: Plan }>(`/plans/${id}/complete`, {
       method: 'PUT',
     })
   }

   async autoPopulatePlan(date: string) {
     return this.request<{ plan: Plan }>(`/plans/auto-populate`, {
       method: 'POST',
       body: JSON.stringify({ date }),
     })
   }

   async rescheduleTask(taskId: string, option: 'tomorrow' | 'pick' | 'backlog' | 'delete', targetDate?: string) {
     return this.request<{ success: boolean }>(`/items/${taskId}/reschedule`, {
       method: 'PUT',
       body: JSON.stringify({ option, targetDate }),
     })
   }
   ```

6. Create placeholder endpoints for auto-populate and reschedule (actual implementation in P3-T4).

7. Test: Create plan, finalize it via API, verify status='finalized' and finalized_at is set; complete it, verify status='completed'.

## Acceptance criteria

- Plan status transitions: draft -> finalized -> completed
- Finalize sets finalized_at timestamp
- Complete sets completed_at timestamp
- API client methods exist for modal components
- No regressions to existing plan creation flow

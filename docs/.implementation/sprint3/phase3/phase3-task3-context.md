# Context: P3-T3 — Integrate EveningReviewFlow

Purpose: Wire the existing `EveningReviewFlow.tsx` component into the planner tab with time-based triggering and manual review button.

## Key decisions

- From plan: Modal shows automatically during evening window (default 7-9 PM) when plan is finalized but not completed
- User can also trigger manually via "Evening Review" header button
- Evening window times are configurable (P3-T5 adds settings UI)
- Multi-step wizard: tasks -> projects -> journal -> inbox -> reschedule -> tomorrow

## Scope

- Add modal state management to PlannerScreen
- Time-based trigger logic for evening window
- Render modal when conditions met
- Manual trigger button in planner header (only when plan is finalized)
- Wire onComplete callback to API and refresh

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 3)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P3-T3 steps)
- Modal component: `components/EveningReviewFlow.tsx`
- Planner screen: `components/modern/screens/PlannerScreen.tsx` (from P1-T4)
- Plans API: `app/api/plans/[id]/complete/route.ts` (from P3-T1)
- API client: `lib/api-client.ts` (completePlan, autoPopulatePlan, rescheduleTask from P3-T1)

## Existing EveningReviewFlow Component

Located at `/components/EveningReviewFlow.tsx`:

**Props interface**:
```typescript
interface EveningReviewFlowProps {
  plan: PlanWithEntities
  allProjects: Item[]
  unparsedCount: number
  onClose: () => void
  onComplete: () => void
}
```

**6-Step Wizard Flow**:
1. **Tasks**: Checkbox list to mark tasks completed
2. **Projects**: Progress slider updates for active projects (optional)
3. **Journal**: Textarea for daily reflection (optional)
4. **Inbox**: Prompt to process unparsed items (skip or go to inbox)
5. **Reschedule**: Handle incomplete tasks (tomorrow/pick date/backlog/delete)
6. **Tomorrow**: Summary and "Complete Review" button

**Key behavior**:
- Progress bar shows current step (1-6)
- Previous/Next buttons for navigation
- Real-time task status updates via `apiClient.updateItem()`
- On complete: saves journal, reschedules tasks, auto-populates tomorrow, marks plan complete
- Uses `apiClient.completePlan()`, `apiClient.autoPopulatePlan()`, `apiClient.rescheduleTask()`

**Missing API methods** (must exist from P3-T1):
- `apiClient.rescheduleTask(taskId, option, date?)` - Update task due_date
- `apiClient.autoPopulatePlan(date)` - Create/populate plan for date

## Implementation notes

- Check current time against evening window (default 19:00-21:00)
- Only show if: within window AND today's plan exists AND status='finalized'
- Fetch today's plan with tasks, all projects, unparsed count on mount
- Store `showEveningModal` and plan data state
- On `onComplete` callback: close modal, optionally navigate to tomorrow's view
- Add "Evening Review" button to header (visible when plan is finalized)

## Data fetching for modal

```typescript
// Fetch data needed for EveningReviewFlow
async function loadEveningReviewData() {
  const today = new Date().toISOString().split('T')[0]

  // Get plan with tasks
  const { plan } = await apiClient.getPlanWithEntities(today)

  // Get all active projects
  const { items: projects } = await apiClient.getItems({
    type: 'project',
    archived: false
  })

  // Count unparsed ideas
  const { items: unparsed } = await apiClient.getItems({
    type: 'idea',
    parsed: false
  })

  return {
    plan,
    projects,
    unparsedCount: unparsed.length
  }
}
```

## Testing/QA

- Set system time to within evening window (or mock date)
- Have finalized plan for today with some tasks
- Navigate to planner tab
- Verify modal appears automatically
- Step through wizard: mark tasks, update project, write journal
- Test reschedule options for incomplete tasks
- Click Complete Review, verify plan status='completed'
- Verify tomorrow's plan is created
- Test manual "Evening Review" button works
- Verify modal doesn't show after completion

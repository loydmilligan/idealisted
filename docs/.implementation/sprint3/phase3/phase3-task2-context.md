# Context: P3-T2 — Integrate MorningFinalizeModal

Purpose: Wire the existing `MorningFinalizeModal.tsx` component into the planner tab with time-based triggering and manual finalize button.

## Key decisions

- From plan: Modal shows automatically during morning window (default 7-9 AM) when plan is in draft state
- User can also trigger manually via "Finalize Plan" header button
- Morning window times are configurable (P3-T5 adds settings UI)
- Modal allows reordering and removing tasks before locking in the plan

## Scope

- Add modal state management to PlannerScreen
- Time-based trigger logic for morning window
- Render modal when conditions met
- Manual trigger button in planner header
- Wire onFinalize callback to API and refresh

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 3)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P3-T2 steps)
- Modal component: `components/MorningFinalizeModal.tsx`
- Planner screen: To be created in P1-T4 as `components/modern/screens/PlannerScreen.tsx`
- Plans API: `app/api/plans/route.ts`, `app/api/plans/[id]/finalize/route.ts` (from P3-T1)
- API client: `lib/api-client.ts` (finalizePlan method from P3-T1)

## Existing MorningFinalizeModal Component

Located at `/components/MorningFinalizeModal.tsx`:

**Props interface**:
```typescript
interface MorningFinalizeModalProps {
  plan: Plan
  tasks: Item[]
  onClose: () => void
  onFinalize: () => void
}
```

**Features**:
- Displays task list with reorder buttons (up/down arrows)
- Remove button per task
- "Finalize Plan" button calls `apiClient.finalizePlan(plan.id)`
- Cancel button to close without action
- Shows task count and optional estimated time

**Key behavior**:
- Uses local state `planTasks` for in-modal ordering
- Calls `apiClient.finalizePlan()` on submit
- Alerts on error (should be updated to toast in future)

## Implementation notes

- Check current time against morning window (default 7:00-9:00 AM)
- Only show if: within window AND today's plan exists AND status='draft'
- Fetch today's plan with tasks on mount
- Store `showMorningModal` and `todayPlan` state
- On `onFinalize` callback: close modal, trigger planner refresh
- Add "Finalize Plan" button to header (visible when plan is draft)
- Use placeholder config for morning window times; P3-T5 adds settings

## Helper function pattern

```typescript
function isInMorningWindow(config?: PlannerScheduleConfig): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const start = config?.morning_start || '07:00'
  const end = config?.morning_end || '09:00'

  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)

  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin

  return currentTime >= startTime && currentTime <= endTime
}
```

## Testing/QA

- Set system time to within morning window (or mock date)
- Create plan in draft status for today
- Navigate to planner tab
- Verify modal appears automatically
- Test reorder buttons and remove task
- Click Finalize, verify plan status updates
- Test manual "Finalize Plan" button works
- Verify modal doesn't show after finalization

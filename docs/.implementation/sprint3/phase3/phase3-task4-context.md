# Context: P3-T4 — Auto-forward incomplete tasks

Purpose: Implement the task rescheduling logic used by EveningReviewFlow, including auto-forward to tomorrow, custom date selection, backlog (remove due date), and delete options.

## Key decisions

- From plan: Auto-forward incomplete tasks to next day as default action
- Evening review allows: tomorrow, pick specific date, remove due date (backlog), or delete
- Rescheduled tasks should also create plan assignments for their new dates
- Default behavior pre-selects "tomorrow" for all incomplete tasks

## Scope

- Create reschedule task API endpoint
- Create auto-populate plan API endpoint
- Implement bulk "Move All to Tomorrow" action
- Wire custom date picker in reschedule step
- Create plan assignments for rescheduled tasks

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 3)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P3-T4 steps)
- Evening modal: `components/EveningReviewFlow.tsx` (handleReschedule function)
- API client: `lib/api-client.ts` (rescheduleTask, autoPopulatePlan stubs from P3-T1)
- Plan assignments: `app/api/plan-assignments/route.ts` (from P1-T2)

## Existing EveningReviewFlow Reschedule Logic

Located at `/components/EveningReviewFlow.tsx` lines 64-79:

```typescript
const handleReschedule = (taskId: string, option: 'tomorrow' | 'pick' | 'backlog' | 'delete') => {
  if (option === 'delete') {
    setRescheduledTasks(prev => ({ ...prev, [taskId]: 'DELETE' }))
  } else if (option === 'tomorrow') {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setRescheduledTasks(prev => ({ ...prev, [taskId]: tomorrow.toISOString().split('T')[0] }))
  } else if (option === 'backlog') {
    setRescheduledTasks(prev => ({ ...prev, [taskId]: null }))
  } else if (option === 'pick') {
    // Currently just sets to next week - needs date picker
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    setRescheduledTasks(prev => ({ ...prev, [taskId]: nextWeek.toISOString().split('T')[0] }))
  }
}
```

**Current limitations**:
- "Pick Date" just defaults to +7 days (no actual picker)
- No "Move All to Tomorrow" bulk action
- Reschedule actions stored in state but not yet persisted

## API Endpoint Designs

### PUT /api/items/[id]/reschedule

```typescript
// Request body
{
  option: 'tomorrow' | 'pick' | 'backlog' | 'delete',
  targetDate?: string  // YYYY-MM-DD, required if option='pick'
}

// Response
{
  success: boolean,
  item?: Item  // Updated item (null if deleted)
}

// Logic:
// - tomorrow: Set due_date to tomorrow
// - pick: Set due_date to targetDate
// - backlog: Set due_date to null
// - delete: Delete the item entirely
```

### POST /api/plans/auto-populate

```typescript
// Request body
{
  date: string  // YYYY-MM-DD to create/populate plan for
}

// Response
{
  plan: Plan,
  taskCount: number
}

// Logic:
// 1. Check if plan exists for date, create if not
// 2. Find tasks with due_date = date
// 3. Find high-priority tasks from backlog (no due_date, priority >= 4)
// 4. Add to plan_tasks junction table
// 5. Return plan with count
```

## Implementation notes

- Update EveningReviewFlow to use real date picker for 'pick' option
- Add "Move All to Tomorrow" button in reschedule step
- In handleComplete, iterate through rescheduledTasks and call API for each
- Create plan assignments via plan-assignments API after reschedule
- Handle errors gracefully (some tasks fail, others succeed)

## Date Picker Integration

For the "Pick Date" option, consider:
- Native HTML date input (simplest)
- Retro-styled custom picker (matches theme)
- Mini calendar component (consistent with planner)

Minimal approach for this task:
```typescript
{showDatePicker && (
  <input
    type="date"
    min={new Date().toISOString().split('T')[0]}
    onChange={(e) => {
      handleReschedule(selectedTaskId, 'pick')
      // Store custom date
    }}
  />
)}
```

## Testing/QA

- Create tasks due today, don't complete them
- Start evening review
- In reschedule step, test each option:
  - Tomorrow: due_date moves to tomorrow
  - Pick date: opens picker, due_date moves to selected date
  - Backlog: due_date set to null
  - Delete: task removed from database
- Test "Move All to Tomorrow" bulk action
- Complete review, verify tasks appear on correct future dates
- Verify plan assignments created for rescheduled tasks

# Prompt: P3-T4 — Auto-forward incomplete tasks

Context: `docs/.implementation/sprint3/phase3/phase3-task4-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 3), `docs/.implementation/sprint3/tasks.md` (P3-T4)

## Goal

Implement the backend and frontend for task rescheduling during evening review, including auto-forward to tomorrow, custom date picker, backlog, and delete options.

## Prerequisites

- P3-T1 complete (API client stubs exist)
- P3-T3 complete (EveningReviewFlow integrated)
- P1-T2 complete (plan-assignments API exists)

## Deliverables

- PUT `/api/items/[id]/reschedule/route.ts` endpoint
- POST `/api/plans/auto-populate/route.ts` endpoint
- Updated EveningReviewFlow with date picker for 'pick' option
- "Move All to Tomorrow" bulk action button
- Plan assignments created for rescheduled tasks

## Implementation steps (from tasks)

1. Create `app/api/items/[id]/reschedule/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { db } from '@/lib/db'

   export async function PUT(
     request: NextRequest,
     { params }: { params: { id: string } }
   ) {
     try {
       const { option, targetDate } = await request.json()
       const taskId = params.id

       if (option === 'delete') {
         db.prepare('DELETE FROM items WHERE id = ?').run(taskId)
         return NextResponse.json({ success: true })
       }

       let newDueDate: number | null = null

       if (option === 'tomorrow') {
         const tomorrow = new Date()
         tomorrow.setDate(tomorrow.getDate() + 1)
         tomorrow.setHours(23, 59, 59, 999)
         newDueDate = tomorrow.getTime()
       } else if (option === 'pick' && targetDate) {
         newDueDate = new Date(targetDate).getTime()
       } else if (option === 'backlog') {
         newDueDate = null
       }

       db.prepare('UPDATE tasks SET due_date = ? WHERE item_id = ?')
         .run(newDueDate, taskId)

       const item = db.prepare('SELECT * FROM items WHERE id = ?').get(taskId)
       return NextResponse.json({ success: true, item })
     } catch (error) {
       return NextResponse.json({ error: 'Failed to reschedule' }, { status: 500 })
     }
   }
   ```

2. Create `app/api/plans/auto-populate/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { db } from '@/lib/db'
   import { v4 as uuidv4 } from 'uuid'

   export async function POST(request: NextRequest) {
     try {
       const { date } = await request.json()
       const now = Date.now()

       // Check/create plan for date
       let plan = db.prepare('SELECT * FROM plans WHERE date = ?').get(date)
       if (!plan) {
         plan = {
           id: uuidv4(),
           date,
           status: 'draft',
           created_at: now,
           updated_at: now
         }
         db.prepare(`
           INSERT INTO plans (id, date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
         `).run(plan.id, date, plan.status, plan.created_at, plan.updated_at)
       }

       // Find tasks due on this date
       const targetTimestamp = new Date(date).getTime()
       const nextDayTimestamp = targetTimestamp + 86400000

       const dueTasks = db.prepare(`
         SELECT i.id FROM items i
         JOIN tasks t ON t.item_id = i.id
         WHERE t.due_date >= ? AND t.due_date < ?
         AND i.archived = 0
       `).all(targetTimestamp, nextDayTimestamp)

       // Find high-priority backlog tasks
       const backlogTasks = db.prepare(`
         SELECT i.id FROM items i
         JOIN tasks t ON t.item_id = i.id
         WHERE t.due_date IS NULL AND t.priority >= 4
         AND i.archived = 0
         LIMIT 3
       `).all()

       // Add to plan_tasks
       const insertPlanTask = db.prepare(`
         INSERT OR IGNORE INTO plan_tasks (id, plan_id, task_id, added_at)
         VALUES (?, ?, ?, ?)
       `)

       const allTasks = [...dueTasks, ...backlogTasks]
       for (const task of allTasks) {
         insertPlanTask.run(uuidv4(), plan.id, task.id, now)
       }

       return NextResponse.json({
         plan,
         taskCount: allTasks.length
       })
     } catch (error) {
       return NextResponse.json({ error: 'Failed to auto-populate' }, { status: 500 })
     }
   }
   ```

3. Update `EveningReviewFlow.tsx` reschedule step with date picker:
   ```typescript
   // Add state for custom date picker
   const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null)
   const [customDate, setCustomDate] = useState('')

   // Update handleReschedule for 'pick' option
   const handleReschedule = (taskId: string, option: 'tomorrow' | 'pick' | 'backlog' | 'delete') => {
     if (option === 'pick') {
       setDatePickerTaskId(taskId)
       return // Don't set yet, wait for date selection
     }
     // ... existing logic
   }

   // Handle date picker selection
   const handleDatePicked = (taskId: string, date: string) => {
     setRescheduledTasks(prev => ({ ...prev, [taskId]: date }))
     setDatePickerTaskId(null)
   }
   ```

4. Add "Move All to Tomorrow" button:
   ```typescript
   <RetroButton
     onClick={() => {
       const tomorrow = new Date()
       tomorrow.setDate(tomorrow.getDate() + 1)
       const tomorrowStr = tomorrow.toISOString().split('T')[0]

       const updates: Record<string, string> = {}
       incompleteTasks.forEach(task => {
         updates[task.id] = tomorrowStr
       })
       setRescheduledTasks(prev => ({ ...prev, ...updates }))
     }}
     variant="primary"
     size="sm"
   >
     Move All to Tomorrow
   </RetroButton>
   ```

5. Update `handleComplete` to call reschedule API:
   ```typescript
   // Step 5: Reschedule tasks
   for (const [taskId, dueDate] of Object.entries(rescheduledTasks)) {
     if (dueDate === 'DELETE') {
       await apiClient.rescheduleTask(taskId, 'delete')
     } else if (dueDate === null) {
       await apiClient.rescheduleTask(taskId, 'backlog')
     } else {
       await apiClient.rescheduleTask(taskId, 'pick', dueDate)
     }
   }
   ```

6. Create plan assignments for rescheduled tasks:
   - After reschedule API calls, the auto-populate endpoint handles this when plan is created for the target date
   - Alternatively, add to plan_assignments directly in reschedule endpoint

7. Test the complete flow:
   - Have incomplete tasks at evening review
   - Test each reschedule option
   - Verify "Move All to Tomorrow" works
   - Complete review
   - Navigate to tomorrow, verify tasks appear

## Acceptance criteria

- Reschedule API updates task due_date correctly
- Delete option removes task from database
- Backlog option sets due_date to null
- Pick option opens date picker and sets custom date
- "Move All to Tomorrow" bulk action works
- Auto-populate creates plan with due tasks and backlog priorities
- Rescheduled tasks appear on correct future dates
- Plan assignments created for rescheduled tasks

# Task 5.3 Implementation Prompt: CRON Job for Reminder Checks

## Task: CRON Job for Reminder Checks

### Objective
Implement a scheduled background job that checks for due task reminders and sends notifications via NTFY service.

### Context Reference
All necessary context is documented in `/home/mmariani/Projects/idealisted/AI_AND_NTFY_TASKS.md` (Context Manifest section for Task 5.3) including:
- Existing CRON infrastructure in `lib/scheduler.ts`
- Database schema with reminder_datetime and last_notified_at columns
- Notification service with pre-built `notifyTaskDue()` method
- Global variables pattern for Next.js HMR
- Edge cases and performance considerations

### Changes Required

#### Part 1: Add Database Index for Performance

**File: `/lib/db.ts`**

**Location**: Inside `initializeDatabase()` function, after the tasks table creation (around line 211)

**Code to Add**:
```typescript
// Add index for reminder queries (Phase 5 - Task 5.3)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder_datetime);
`)
```

**Why**: This index speeds up the query that finds tasks with due reminders.

#### Part 2: Extend Scheduler Service with Reminder Checking

**File: `/lib/scheduler.ts`**

**Step 1**: Add global type declarations at the top of the file (after existing globals)

**Location**: After line 6 (after existing global declarations)

**Code to Add**:
```typescript
declare global {
  var __reminder_check_cron_task: any | undefined
  var __reminder_check_is_running: boolean | undefined
}
```

**Step 2**: Add reminder cron job to `start()` method

**Location**: Inside the `start()` method, after the daily review cron setup (around line 45, before the closing brace)

**Code to Add**:
```typescript
// Task Reminder Check (Phase 5 - Task 5.3)
// Check every minute for tasks with due reminders
if (global.__reminder_check_cron_task) {
  global.__reminder_check_cron_task.stop()
  global.__reminder_check_cron_task = undefined
}

global.__reminder_check_cron_task = cron.schedule('* * * * *', async () => {
  await this.checkAndNotifyReminders()
})

console.log('[Scheduler] Task reminder check cron started (every minute)')
```

**Step 3**: Implement `checkAndNotifyReminders()` method

**Location**: Add as a new private method in the SchedulerService class (after the existing `checkDailyReview()` method)

**Code to Add**:
```typescript
/**
 * Check for tasks with due reminders and send notifications
 * Runs every minute via cron job
 */
private async checkAndNotifyReminders() {
  // Mutex lock to prevent concurrent executions
  if (global.__reminder_check_is_running) {
    return
  }

  try {
    global.__reminder_check_is_running = true
    const startTime = Date.now()

    // Calculate time windows
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000) // 3600000 milliseconds

    // Query tasks with due reminders
    const dueTasks = db.prepare(`
      SELECT task.id, task.reminder_datetime, task.last_notified_at,
             i.text, task.due_date, task.priority, task.status
      FROM tasks task
      JOIN items i ON i.id = task.item_id
      WHERE task.reminder_datetime IS NOT NULL
        AND task.reminder_datetime <= ?
        AND task.status != 'completed'
        AND (task.last_notified_at IS NULL OR task.last_notified_at < ?)
      ORDER BY task.reminder_datetime ASC
    `).all(now, oneHourAgo) as Array<{
      id: string
      reminder_datetime: number
      last_notified_at: number | null
      text: string
      due_date: number | null
      priority: number
      status: string
    }>

    if (dueTasks.length === 0) {
      // No tasks need notification - silent return (don't spam logs)
      return
    }

    console.log(`[Reminder Check] Found ${dueTasks.length} task(s) needing notification`)

    // Process each task
    let successCount = 0
    let failureCount = 0

    for (const task of dueTasks) {
      try {
        // Format due time as human-readable
        const dueTime = task.due_date
          ? new Date(task.due_date).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : 'soon'

        // Send notification using existing helper
        const result = await ntfyService.notifyTaskDue(task.text, dueTime)

        if (result.success) {
          // Update last_notified_at timestamp
          db.prepare(`
            UPDATE tasks SET last_notified_at = ? WHERE id = ?
          `).run(now, task.id)

          console.log(`[Reminder] ✓ Sent notification for task: "${task.text}"`)
          successCount++
        } else if (result.skipped) {
          console.log(`[Reminder] ⊘ Skipped task "${task.text}": ${result.error || 'Notifications disabled'}`)
        } else {
          console.error(`[Reminder] ✗ Failed to notify task "${task.text}":`, result.error)
          failureCount++
        }
      } catch (error) {
        console.error(`[Reminder] ✗ Error processing task ${task.id}:`, error)
        failureCount++
        // Continue with next task even if this one fails
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[Reminder Check] Completed in ${elapsed}ms (${successCount} sent, ${failureCount} failed)`)
  } catch (error) {
    console.error('[Reminder Check] Fatal error:', error)
  } finally {
    global.__reminder_check_is_running = false
  }
}
```

#### Part 3: Re-Enable CRON System

**File: `/app/layout.tsx`**

**Location**: Line 4

**Change**:
```typescript
// Before:
// import '@/lib/init'

// After:
import '@/lib/init'
```

**Why**: This uncomments the initialization import that starts the scheduler service on server startup.

### Acceptance Criteria

- ✅ CRON job runs every minute checking for due reminders
- ✅ Only tasks with `reminder_datetime <= now` are checked
- ✅ Completed tasks are filtered out (status != 'completed')
- ✅ No duplicate notifications (last_notified_at prevents spam within 1 hour)
- ✅ last_notified_at updates after successful notification
- ✅ Notifications sent via existing ntfyService.notifyTaskDue()
- ✅ All notification attempts logged (success/failure)
- ✅ Mutex lock prevents concurrent executions
- ✅ Global variables survive Next.js HMR
- ✅ Database index added for performance
- ✅ Graceful error handling (one failure doesn't break the batch)

### Files to Modify

1. `/lib/db.ts` - Add index for reminder queries
2. `/lib/scheduler.ts` - Add reminder check cron job and method
3. `/app/layout.tsx` - Re-enable scheduler initialization

### Edge Cases Handled

1. **Task deleted after reminder set**: Foreign key cascade handles cleanup
2. **Task completed after reminder set**: Query filters by status != 'completed'
3. **Reminder time in the past**: Query includes overdue reminders (<=)
4. **Multiple reminders for same task**: last_notified_at check prevents re-notification within 1 hour
5. **NTFY not configured**: ntfyService returns `{ success: false, skipped: true }`
6. **Database locked**: SQLite WAL mode prevents locks
7. **Server restart**: Cron jobs restart when server restarts
8. **One notification fails**: Error caught, logged, continues with next task

### Testing Notes

After implementation:
1. **Set up a test task**:
   - Create task with due date
   - Set reminder to 1 minute in the future
   - Save task
2. **Monitor server logs**:
   - Should see `[Scheduler] Task reminder check cron started (every minute)`
   - Wait for reminder time to pass
   - Should see `[Reminder Check] Found 1 task(s) needing notification`
   - Should see `[Reminder] ✓ Sent notification for task: "{text}"`
3. **Check database**:
   - Verify `last_notified_at` is updated to current timestamp
4. **Verify no duplicate notifications**:
   - Wait another minute
   - Should NOT see notification sent again (within 1 hour)
5. **Test NTFY disabled**:
   - Disable NTFY in settings
   - Should see `[Reminder] ⊘ Skipped task` in logs
6. **Test completed task**:
   - Mark task as completed
   - Should NOT receive notification

---

**Agent Instructions:**
You have ALL the context needed. Do NOT research or gather additional information. Simply:
1. Make the exact code changes specified above
2. Follow existing patterns in scheduler.ts exactly
3. Use the existing ntfyService.notifyTaskDue() method
4. Test that build succeeds
5. Test basic functionality (set reminder for 1 min from now, verify notification)
6. Report completion with file changes summary

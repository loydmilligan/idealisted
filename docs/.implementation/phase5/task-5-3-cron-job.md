# Task 5.3: Create CRON Job for Reminder Checks

**Phase**: 5 - Task Reminders
**Status**: Not Started
**Dependencies**: Phase 1 Complete (database schema)

## Objective

Implement a periodic job that checks for upcoming task reminders and triggers notifications.

## Requirements

1. **CRON Schedule**: Run every 15 minutes
2. **Query Window**: Check tasks with `reminder_datetime` in next 15 minutes
3. **Filter Criteria**:
   - `reminder_datetime` between now and now+15min
   - Task status is not 'completed'
   - `last_notified_at` is NULL or older than current window
4. **Actions**:
   - Send notification via NTFY
   - Update `last_notified_at` to prevent duplicates
5. **Error Handling**: Log failures, continue processing other reminders

## Files to Create

- `/lib/scheduler.ts` - CRON job registration and logic

## Files to Modify

- `/lib/notify.ts` - Add reminder notification formatting
- `/app/api/cron/reminders/route.ts` - API endpoint for CRON trigger (optional, for Vercel cron)

## Success Criteria

- ✅ CRON runs reliably every 15 minutes
- ✅ Only upcoming tasks within window are processed
- ✅ No duplicate notifications sent
- ✅ `last_notified_at` updated correctly after notification
- ✅ Handles errors gracefully without stopping job

## Implementation Notes

### CRON Job Logic

```typescript
// lib/scheduler.ts
import { db } from './db';
import { sendTaskReminder } from './notify';

export async function checkTaskReminders() {
  const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
  const window = 15 * 60; // 15 minutes in seconds
  const windowStart = now;
  const windowEnd = now + window;

  try {
    // Query tasks with reminders in the window
    const tasks = db.prepare(`
      SELECT t.*, i.text as task_text
      FROM tasks t
      JOIN items i ON t.item_id = i.id
      WHERE t.reminder_datetime BETWEEN ? AND ?
        AND t.status != 'completed'
        AND (t.last_notified_at IS NULL
             OR t.last_notified_at < ?)
    `).all(windowStart, windowEnd, windowStart - window);

    console.log(`Found ${tasks.length} task reminders to process`);

    for (const task of tasks) {
      try {
        // Send notification
        await sendTaskReminder(task);

        // Update last_notified_at
        db.prepare(`
          UPDATE tasks
          SET last_notified_at = ?
          WHERE id = ?
        `).run(now, task.id);

        console.log(`Sent reminder for task: ${task.id}`);
      } catch (error) {
        console.error(`Failed to send reminder for task ${task.id}:`, error);
        // Continue processing other tasks
      }
    }
  } catch (error) {
    console.error('Error checking task reminders:', error);
  }
}
```

### CRON Registration

**Option 1: Node-cron (for self-hosted)**
```typescript
import cron from 'node-cron';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running task reminder check...');
  await checkTaskReminders();
});
```

**Option 2: Vercel Cron (for Vercel deployment)**
```typescript
// app/api/cron/reminders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkTaskReminders } from '@/lib/scheduler';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await checkTaskReminders();
  return NextResponse.json({ success: true });
}
```

**vercel.json**:
```json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "*/15 * * * *"
  }]
}
```

## Edge Cases

- Multiple tasks with same reminder time: Process all
- Notification service down: Log error, continue with others
- Database connection issues: Retry or skip cycle
- Task deleted during processing: Handle gracefully
- Reminder time updated while processing: Use snapshot query

## Technical Details

**Storage**:
- `reminder_datetime`: Unix timestamp (seconds)
- `last_notified_at`: Unix timestamp (seconds)

**Window Logic**:
- Current window: now to now+15min
- Prevents re-notification: `last_notified_at < (now - 15min)`
- This ensures each reminder only fires once per 15-minute window

**Performance**:
- Indexed query on `reminder_datetime` (already has index)
- Batch processing if many reminders
- Async notification sending to avoid blocking

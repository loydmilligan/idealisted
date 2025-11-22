# Task 5.4: Notification Integration

**Phase**: 5 - Task Reminders
**Status**: Not Started
**Dependencies**: Task 5.3 (CRON job calls this)

## Objective

Send task reminder notifications via NTFY with proper formatting and optional action buttons.

## Requirements

1. **Message Format**:
   - Title: `"⏰ Task Due Soon"`
   - Body: Task text + formatted due time
   - Tags: `reminder`, `task`
   - Priority: Based on task priority field

2. **Action Buttons** (if NTFY supports):
   - View: Deep link to task in app
   - Mark Complete: API call to complete task
   - Snooze: Reschedule reminder

3. **Quiet Hours**: Respect user's quiet hours setting (if configured)

4. **Error Handling**: Log failures, return error for retry

## Files to Modify

- `/lib/notify.ts` - Add `sendTaskReminder()` function

## Success Criteria

- ✅ Notifications sent successfully to NTFY
- ✅ Message format is clear and actionable
- ✅ Priority mapped correctly from task priority
- ✅ Quiet hours respected (no notifications during configured quiet time)
- ✅ Errors logged with context

## Implementation Notes

### Notification Function

```typescript
// lib/notify.ts
import { db } from './db';

interface TaskReminder {
  id: string;
  task_text: string;
  due_date?: number;
  priority: number;
  item_id: string;
}

export async function sendTaskReminder(task: TaskReminder): Promise<void> {
  // Get NTFY config from database
  const settings = db.prepare(`
    SELECT value FROM settings WHERE key = 'ntfy_config'
  `).get() as { value: string } | undefined;

  if (!settings) {
    throw new Error('NTFY not configured');
  }

  const config = JSON.parse(settings.value);

  if (!config.enabled || !config.serverUrl || !config.topic) {
    throw new Error('NTFY config incomplete');
  }

  // Check quiet hours
  if (isQuietHours(config.quietHours)) {
    console.log(`Skipping notification for task ${task.id} during quiet hours`);
    return;
  }

  // Format due date
  const dueText = task.due_date
    ? new Date(task.due_date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'No due date';

  // Map task priority to NTFY priority
  const ntfyPriority = mapPriority(task.priority);

  // Build notification payload
  const payload = {
    topic: config.topic,
    title: '⏰ Task Due Soon',
    message: `${task.task_text}\n\nDue: ${dueText}`,
    tags: ['reminder', 'task'],
    priority: ntfyPriority,
    // Optional: Action buttons (if NTFY server supports)
    actions: [
      {
        action: 'view',
        label: 'View Task',
        url: `https://your-app.com/tasks/${task.item_id}`
      },
      {
        action: 'http',
        label: 'Mark Complete',
        url: `https://your-app.com/api/tasks/${task.id}/complete`,
        method: 'POST'
      }
    ]
  };

  // Send to NTFY
  const response = await fetch(`${config.serverUrl}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.auth && { 'Authorization': `Bearer ${config.auth}` })
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`NTFY request failed: ${response.status}`);
  }

  console.log(`Task reminder sent for: ${task.id}`);
}

function mapPriority(taskPriority: number): number {
  // Map task priority (1-5) to NTFY priority (1-5)
  // 1 = low, 3 = default, 5 = urgent
  if (taskPriority >= 4) return 5; // Urgent
  if (taskPriority === 3) return 4; // High
  if (taskPriority === 2) return 3; // Default
  return 2; // Low
}

function isQuietHours(quietHours?: { start: string; end: string }): boolean {
  if (!quietHours) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = quietHours.end.split(':').map(Number);
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}
```

### Notification Format Examples

**High Priority Task**:
```
Title: ⏰ Task Due Soon
Body: Submit quarterly report
      Due: Nov 15, 3:00 PM
Tags: reminder, task
Priority: 5 (urgent)
```

**Low Priority Task**:
```
Title: ⏰ Task Due Soon
Body: Water plants
      Due: Nov 16, 9:00 AM
Tags: reminder, task
Priority: 2 (low)
```

## Edge Cases

- NTFY server unreachable: Throw error for retry in next CRON cycle
- No due date: Show "No due date" in notification
- Task deleted between CRON check and notification: Handle gracefully
- Multiple reminders in same minute: Send all (no deduplication beyond last_notified_at)
- Quiet hours spanning midnight: Handle overnight periods correctly

## Technical Details

**NTFY Config** (from settings table):
```json
{
  "enabled": true,
  "serverUrl": "https://ntfy.sh",
  "topic": "my-tasks",
  "auth": "optional-token",
  "quietHours": {
    "start": "22:00",
    "end": "07:00"
  }
}
```

**Error Handling**:
- Network errors: Log and re-throw for retry
- Invalid config: Log and skip notification
- Quiet hours: Skip silently with log

**Testing**:
- Mock NTFY server responses
- Test quiet hours logic with various time ranges
- Verify priority mapping
- Test with missing due dates

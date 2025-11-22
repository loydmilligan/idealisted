# Task 5.2: Implement Quick Reminder Options

**Phase**: 5 - Task Reminders
**Status**: Not Started
**Dependencies**: Task 5.1 (Reminder UI foundation)

## Objective

Provide fast reminder time selection with preset options that calculate times relative to the task's due date.

## Requirements

### Four Quick Options

1. **"Morning of"**
   - Set reminder to 9:00 AM on the due date
   - Example: Due Nov 15 3:00 PM → Remind Nov 15 9:00 AM

2. **"1 hour before"**
   - Set reminder to 1 hour before due datetime
   - Example: Due Nov 15 3:00 PM → Remind Nov 15 2:00 PM

3. **"1 day before"**
   - Set reminder to 9:00 AM one day before due date
   - Example: Due Nov 15 3:00 PM → Remind Nov 14 9:00 AM

4. **"Custom"**
   - Full datetime picker for any custom time
   - No restrictions on time selection

## Files to Modify

- `/components/modern/EntityModal.tsx` - Implement quick option buttons and logic

## Success Criteria

- ✅ Each option calculates correct Unix timestamp
- ✅ UI updates to show selected reminder time
- ✅ Relative time description displays correctly
- ✅ `reminder_datetime` saves to database on task save
- ✅ Handles timezone conversions properly

## Implementation Notes

### Time Calculation Logic

```typescript
const calculateReminderTime = (dueDate: number, option: string): number => {
  const due = new Date(dueDate);

  switch (option) {
    case 'morning-of':
      const morning = new Date(due);
      morning.setHours(9, 0, 0, 0);
      return morning.getTime();

    case '1hr-before':
      return dueDate - (60 * 60 * 1000); // 1 hour in ms

    case '1day-before':
      const dayBefore = new Date(due);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(9, 0, 0, 0);
      return dayBefore.getTime();

    default:
      return dueDate;
  }
};
```

### Relative Time Display

```typescript
const getRelativeDescription = (reminder: number, due: number): string => {
  const diffMs = due - reminder;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHrs / 24);

  if (diffDays >= 1) return `${diffDays} day${diffDays > 1 ? 's' : ''} before`;
  if (diffHrs >= 1) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} before`;
  return 'Same time as due date';
};
```

## Edge Cases

- Due date not set: Disable all quick options, show message
- Reminder time in past: Show warning, allow but highlight
- Custom time after due date: Allow (user might want post-due reminder)
- Timezone changes: Always store as Unix timestamp, display in local time

## Technical Details

**Storage**: All times stored as Unix timestamps (milliseconds since epoch)
**Display**: Convert to user's local timezone for display
**Validation**: No strict validation on reminder time vs due time

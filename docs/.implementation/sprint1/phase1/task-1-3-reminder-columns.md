# Task 1.3: Add Reminder Columns to Tasks Table

## Objective
Add two new columns to the existing `tasks` table to support task reminders and notifications:
- `reminder_datetime` - Unix timestamp for when to send reminder notification
- `last_notified_at` - Unix timestamp of last notification sent (prevents duplicate notifications)

## Context Bundle
See `docs/.implementation/phase1/context-task-1-3-reminder-columns.md` for complete implementation context including:
- Current tasks table schema
- ALTER TABLE migration patterns
- Error handling approach
- Library documentation

## Implementation Instructions

### 1. Add ALTER TABLE Statements
**File**: `lib/db.ts`
**Location**: After line 91 (after tasks table CREATE statement, before next table)

Add two ALTER TABLE statements with specific error handling:

```typescript
// Add reminder columns to tasks table
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add reminder_datetime column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN last_notified_at INTEGER`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add last_notified_at column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}
```

### 2. Verification Steps

After implementation:
1. Delete `data/idealisted.db` (force clean migration)
2. Run `npm run dev`
3. Verify tasks table has new columns:
   ```bash
   sqlite3 data/idealisted.db "PRAGMA table_info(tasks);"
   ```
   Should show reminder_datetime and last_notified_at columns
4. Stop and restart dev server (verify idempotency)
5. Verify no errors in console

### 3. Important Notes
- **No data backfill needed** - System not in production use
- **Idempotent** - Safe to run multiple times
- **No DEFAULT value** - Both columns are optional (NULL allowed)
- **No indexes yet** - Will add when notification system is implemented
- **Preserves existing data** - Uses ALTER TABLE, not DROP/CREATE

## Success Criteria
- [ ] Two columns added to tasks table
- [ ] Migration runs without errors on first start
- [ ] Migration runs without errors on subsequent starts
- [ ] No data loss from existing tasks
- [ ] New columns visible in schema

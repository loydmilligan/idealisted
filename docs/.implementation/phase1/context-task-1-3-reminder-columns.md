# Context Pack: Tasks Table Reminder Columns

## Task Summary
**Goal**: Add two new columns to the existing `tasks` table in the IdeaListed SQLite database to support task reminders.

**Current State**: Tasks table EXISTS with existing schema (no reminder tracking)
**Target State**: Tasks table with reminder scheduling capabilities

**Changes Required**:
1. Add `reminder_datetime INTEGER` - Unix timestamp for when to send notification
2. Add `last_notified_at INTEGER` - Unix timestamp tracking last notification sent
3. Use ALTER TABLE (preserve existing task data)
4. Make migration idempotent with error handling

---

## How This Currently Works: Tasks Table & Database Initialization

### Tasks Table Current Schema (lib/db.ts:79-91)

The tasks table is created with the following structure:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  priority INTEGER DEFAULT 1,
  tags TEXT, -- JSON array of tags
  estimated_time INTEGER,
  project_id TEXT,
  due_date INTEGER,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
)
```

**Current Columns**:
- `id` - Primary key (TEXT)
- `item_id` - Foreign key to items table
- `status` - Task status (pending, in-progress, completed)
- `priority` - Task priority level (1-5 typically)
- `tags` - JSON array of tags
- `estimated_time` - Estimated duration in minutes/hours
- `project_id` - Optional reference to project
- `due_date` - Unix timestamp for due date

### Database Initialization & Migration Pattern (lib/db.ts:20-45)

The `initializeDatabase()` function runs automatically when `lib/db.ts` is imported. It uses a test-insert approach to detect schema changes:

1. **Test Insert Verification** (lines 22-27):
   - Attempts to insert test records into `items` and `notes` tables
   - If it succeeds, schema is current (no migration needed)
   - If it fails, schema is outdated and needs migration

2. **Full Migration Strategy** (lines 28-45):
   - Drops ALL tables EXCEPT `tags` (which is intentionally preserved)
   - Recreates all tables with current schema from CREATE TABLE statements
   - This is destructive but appropriate for non-production database

3. **Safe for ALTER TABLE Approach**:
   - Since system is NOT in production use, ALTER TABLE statements can be added
   - Try-catch error handling makes them idempotent
   - Existing task data will be preserved

### Database Pragmas & Connection (lib/db.ts:13-17)

```typescript
export const db = new Database(DB_PATH)  // SQLite connection via better-sqlite3

// Enable features for data integrity
db.pragma('journal_mode = WAL')          // Write-Ahead Logging for concurrency
db.pragma('foreign_keys = ON')           // Enforce foreign key constraints
```

**Key Implications**:
- Foreign keys are enforced - task records MUST reference existing items
- WAL mode provides better concurrent access
- better-sqlite3 uses synchronous API (blocking operations)

### Task Type Definition (types/index.ts:70-79)

Current TypeScript interface:

```typescript
export interface Task {
  id: string
  item_id: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: number
  tags?: string[]
  estimated_time?: number
  project_id?: string
  due_date?: number
}
```

**Will Need Update After Migration**: Add optional reminder fields

```typescript
reminder_datetime?: number  // Unix timestamp for notification time
last_notified_at?: number   // Unix timestamp for last notification
```

### Existing ALTER TABLE Pattern Reference (lib/db.ts:382-398)

The codebase demonstrates ALTER TABLE usage in the tags migration section (added in Task 1.1):

```typescript
try {
  db.exec(`ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0`)
} catch (e) {
  // Column already exists, ignore
}
```

**Key Pattern**:
- Each ALTER wrapped in try-catch for idempotency
- Checks for 'duplicate column name' error to distinguish from real issues
- Preserves existing data (no DROP and recreate)

---

## Implementation Strategy

### Option 1: ALTER TABLE with Try-Catch (Recommended)

Add ALTER statements after tasks table creation (lib/db.ts, after line 91):

```typescript
// Migrate tasks table: add reminder tracking fields
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

**Advantages**:
- Preserves all existing task data
- Idempotent (safe to run multiple times)
- Follows established pattern from tags migration
- Proper error handling distinguishes real issues from harmless duplicate column

**Disadvantages**:
- Slightly more verbose than Option 2
- Requires try-catch for each column

### Option 2: Single ALTER Block with Multiple Statements

Less idempotent but cleaner:

```typescript
// Migrate tasks table: add reminder tracking fields
try {
  db.exec(`
    ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER;
    ALTER TABLE tasks ADD COLUMN last_notified_at INTEGER;
  `)
} catch (e) {
  if (e.message?.includes('duplicate column name')) {
    console.log('Reminder columns already exist')
  } else {
    console.error('Failed to add reminder columns:', e)
    throw e
  }
}
```

**Advantages**:
- Fewer try-catch blocks
- Single exec call

**Disadvantages**:
- Less granular error handling (can't distinguish which column failed)
- Single failure affects both columns

### Recommended: Option 1 with Improved Error Handling

---

## Exact Implementation Location

### File: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Current Tasks Table Section** (lines 78-91):
```typescript
  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
      priority INTEGER DEFAULT 1,
      tags TEXT, -- JSON array of tags
      estimated_time INTEGER,
      project_id TEXT,
      due_date INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)
```

**INSERT POINT FOR ALTER TABLE STATEMENTS**:
**After line 91** (after tasks table creation, before notes table section)

Insert the following code:

```typescript
  // Migrate tasks table: add reminder tracking fields (if they don't exist)
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

**No Index Required Yet**: Unlike the tags migration, reminder columns don't need immediate indexing since reminder notification system isn't yet implemented.

---

## SQLite Reference: ALTER TABLE Syntax

### Valid Alterations in SQLite

```sql
-- Add column (SQLite 3.25.0+)
ALTER TABLE table_name ADD COLUMN column_name datatype [constraints];

-- Rename column (SQLite 3.25.0+)
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- Rename table
ALTER TABLE old_table_name RENAME TO new_table_name;
```

### NOT Supported (Until SQLite 3.35.0)

```sql
-- Cannot drop columns
ALTER TABLE table_name DROP COLUMN column_name;  -- NOT SUPPORTED

-- Cannot modify column type
ALTER TABLE table_name MODIFY COLUMN name datatype;  -- NOT SUPPORTED
```

**Better-sqlite3 Version**: v12.4.1 bundles SQLite 3.46.0, so all modern ALTER features are available.

### NULL vs DEFAULT for New Columns

When adding a column via ALTER TABLE:
- Existing rows get NULL value (if no DEFAULT specified)
- New rows use DEFAULT value (if specified)
- `reminder_datetime INTEGER` (nullable) - OK, will be NULL until reminder set
- `last_notified_at INTEGER` (nullable) - OK, will be NULL until notification sent

---

## Implementation Notes & Gotchas

### 1. Idempotency Pattern

The try-catch pattern with `e.message?.includes('duplicate column name')` check is crucial:

```typescript
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER`)
} catch (e) {
  // SQLite error message for duplicate column: "table tasks already has column named reminder_datetime"
  if (!e.message?.includes('duplicate column name')) {
    console.error('Real error, not a duplicate:', e)
    throw e  // Re-throw actual errors
  }
  // Harmless duplicate column error, continue
}
```

**Why This Matters**:
- Dev rerunning migrations shouldn't cause failures
- Production deployments may run initialization multiple times
- Distinguishes between "already added" (safe to ignore) and "real error" (must fail)

### 2. Integer Timestamps (Unix Epoch)

Both columns use `INTEGER` type for Unix timestamps:

```typescript
// Current time as Unix timestamp
const now = Math.floor(Date.now() / 1000)  // seconds since epoch

// Or as milliseconds (milliseconds since epoch)
const nowMs = Date.now()  // 13-digit number
```

**Recommendation**: Use seconds (10-digit numbers) to match `created_at`, `updated_at` pattern in other tables.

### 3. Nullable vs NOT NULL

Both columns are **nullable** (no NOT NULL constraint):
- `reminder_datetime INTEGER` - NULL until reminder is set
- `last_notified_at INTEGER` - NULL until first notification sent

This is correct design because:
- Tasks typically have no reminder initially
- `last_notified_at` only has value after first notification
- Querying: `WHERE reminder_datetime IS NOT NULL` finds tasks with reminders

### 4. No Backfill Needed

Since system is not in production:
- Existing tasks will have NULL for both columns
- No backfill required
- When reminder system is implemented, new logic will handle NULL values

### 5. Error Handling in better-sqlite3

better-sqlite3 throws synchronous exceptions:

```typescript
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER`)
} catch (error) {
  // error is Error object with .message property
  // Common messages:
  // - "table tasks already has column named reminder_datetime"
  // - "no such table: tasks" (if tasks table doesn't exist)
  // - "syntax error" (malformed SQL)
}
```

---

## Related Files to Update (Future Tasks)

After database schema is updated, these components will need updates:

1. **types/index.ts** - Task interface (add reminder fields)
   ```typescript
   export interface Task {
     // ... existing fields ...
     reminder_datetime?: number
     last_notified_at?: number
   }
   ```

2. **API Routes** - Create/Update task handlers
   - `/app/api/items/route.ts` - Accept reminder_datetime in create request
   - `/app/api/items/[id]/route.ts` - Accept reminder_datetime in update request
   - Validation: reminder_datetime must be >= current time

3. **Reminder Service** (Future - not yet implemented)
   - Query tasks with `reminder_datetime IS NOT NULL`
   - Check `reminder_datetime <= NOW`
   - Send notification via ntfy.sh integration
   - Update `last_notified_at` after sending

4. **Task Modal Component** (Future)
   - Add "Set Reminder" input/datepicker to TaskModal
   - Allow clearing reminder
   - Display next reminder time if set

---

## Testing the Changes

After implementation, verify:

### 1. Table Schema

```bash
sqlite3 data/idealisted.db ".schema tasks"
```

Should show 10 columns including:
```
reminder_datetime INTEGER
last_notified_at INTEGER
```

### 2. Existing Data Preserved

```bash
sqlite3 data/idealisted.db "SELECT id, status, due_date, reminder_datetime, last_notified_at FROM tasks LIMIT 5;"
```

Should show:
- Existing tasks with their data intact
- New columns set to NULL (not 0 or empty)

### 3. ALTER Can Run Idempotently

```bash
# Run dev server to trigger initializeDatabase()
npm run dev

# Check console - should NOT show errors about duplicate columns
# Should log: "Database initialized successfully"
```

Restart dev server second time:
- Should succeed without errors about columns already existing
- Proves idempotency works correctly

### 4. Column Accepts NULL and Integer Values

```bash
sqlite3 data/idealisted.db << 'SQL'
-- Insert task with reminder
INSERT INTO items (id, type, text, created_at, updated_at) 
VALUES ('test-task', 'task', 'Test task with reminder', 1234567890, 1234567890);

INSERT INTO tasks (id, item_id, status, priority, reminder_datetime)
VALUES ('task-1', 'test-task', 'pending', 1, 1700000000);

-- Verify it was inserted
SELECT id, reminder_datetime, last_notified_at FROM tasks WHERE id = 'task-1';

-- Clean up
DELETE FROM tasks WHERE id = 'task-1';
DELETE FROM items WHERE id = 'test-task';
SQL
```

Expected output:
```
task-1|1700000000|
```
(reminder_datetime = 1700000000, last_notified_at = empty/NULL)

---

## Complete Code Change Summary

**File**: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Location**: Between line 91 (end of tasks table CREATE) and line 93 (start of notes table comment)

**Total Addition**: ~20 lines (try-catch for 2 columns with proper error handling)

---

## Code Patterns from Codebase

### CREATE TABLE IF NOT EXISTS Pattern
From existing tasks table:
```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    priority INTEGER DEFAULT 1,
    tags TEXT, -- JSON array of tags
    estimated_time INTEGER,
    project_id TEXT,
    due_date INTEGER,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )
`)
```

### ALTER TABLE Pattern (from Task 1.1 tags migration)
From improved tags migration:
```typescript
try {
  db.exec(`ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add usage_count column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}
```

### Error Handling with better-sqlite3
Synchronous try-catch (not async):
```typescript
try {
  const result = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
} catch (error) {
  // Error is thrown synchronously
  console.error('Database query failed:', error.message)
}
```

---

## Summary Checklist

- [ ] Add ALTER TABLE statement for `reminder_datetime` after line 91 in lib/db.ts
- [ ] Add ALTER TABLE statement for `last_notified_at` after first ALTER
- [ ] Wrap each ALTER in try-catch for idempotency
- [ ] Check error message for 'duplicate column name' to allow safe reruns
- [ ] Use proper error logging for real errors
- [ ] Test schema changes: `sqlite3 data/idealisted.db ".schema tasks"`
- [ ] Verify existing task data is preserved
- [ ] Run dev server twice to confirm idempotency
- [ ] Update Task interface in types/index.ts (future task)

---

## Expected Final Schema

After implementation, the tasks table schema will be:

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  priority INTEGER DEFAULT 1,
  tags TEXT,
  estimated_time INTEGER,
  project_id TEXT,
  due_date INTEGER,
  reminder_datetime INTEGER,
  last_notified_at INTEGER,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
)
```

---

*This context pack generated for implementing reminder functionality (Phase 1, Task 1.3) of the IdeaListed task management system.*

# Task 1.1: Add Columns to Tags Table

## Objective
Add three new columns to the existing `tags` table to support usage tracking and default tag identification:
- `usage_count` - Track how often each tag is used
- `is_default` - Flag for starter tags (seeded by system)
- `last_used_at` - Timestamp of most recent use

## Context Bundle
See `docs/.implementation/phase1/context-task-1-1-tags-table.md` for complete implementation context including:
- Current database schema and patterns
- ALTER TABLE migration strategy
- Error handling patterns
- Library documentation (better-sqlite3)
- Testing approach

## Implementation Instructions

### 1. Add ALTER TABLE Statements
**File**: `lib/db.ts`
**Location**: After line 191 (after tags table CREATE statement, before indexes)

Add three ALTER TABLE statements with specific error handling:

```typescript
// Add usage tracking columns to tags table
try {
  db.exec(`ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add usage_count column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}

try {
  db.exec(`ALTER TABLE tags ADD COLUMN is_default INTEGER DEFAULT 0`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add is_default column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}

try {
  db.exec(`ALTER TABLE tags ADD COLUMN last_used_at INTEGER`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add last_used_at column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}
```

### 2. Verification Steps

After implementation:
1. Delete `data/idealisted.db` (force clean migration)
2. Run `npm run dev` (triggers initializeDatabase)
3. Verify tags table has new columns:
   ```bash
   sqlite3 data/idealisted.db "PRAGMA table_info(tags);"
   ```
   Should show 8 columns including usage_count, is_default, last_used_at
4. Stop and restart dev server (verify idempotency - no errors on second run)
5. Verify no errors in console

### 3. Important Notes
- **No data backfill needed** - System not in production use
- **Idempotent** - Safe to run multiple times (try-catch handles duplicates)
- **Preserves existing data** - Uses ALTER TABLE, not DROP/CREATE
- DEFAULT values apply automatically to existing rows

## Success Criteria
- [ ] Three columns added to tags table
- [ ] Migration runs without errors on first start
- [ ] Migration runs without errors on subsequent starts (idempotent)
- [ ] No data loss from existing tags
- [ ] New columns visible in schema

# Context Pack: Tags Table Implementation

## Task Summary
**Goal**: Update the existing tags table schema in the IdeaListed SQLite database to add `usage_count`, `is_default`, and `last_used_at` fields with appropriate indexes.

**Current State**: Tags table EXISTS but has a DIFFERENT schema than required
**Target State**: Tags table with usage tracking and default tag support

---

## CRITICAL DISCOVERY: Table Already Exists!

**IMPORTANT**: The tags table already exists with the following schema (lib/db.ts:183-191):

```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
  created_at INTEGER NOT NULL
)
```

**Current Index** (lib/db.ts:201):
```sql
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
```

**Required Changes**:
1. Add `usage_count INTEGER DEFAULT 0`
2. Add `is_default BOOLEAN DEFAULT false` (SQLite uses INTEGER 0/1)
3. Add `last_used_at INTEGER` (nullable timestamp)
4. Add new index: `idx_tags_usage ON tags(usage_count DESC)`

---

## How This Currently Works: Database Initialization & Migration

### Database Location & Setup
- **Database Path**: `/home/mmariani/Projects/idealisted/data/idealisted.db`
- **Database Library**: `better-sqlite3` v12.4.1
- **Entry Point**: `lib/db.ts` (lines 1-210)

### Database Initialization Flow

When the application starts, `lib/db.ts` is imported and the following happens:

1. **Directory Creation** (lines 7-11):
   ```typescript
   const DB_PATH = path.join(process.cwd(), 'data', 'idealisted.db')
   const dataDir = path.dirname(DB_PATH)
   if (!fs.existsSync(dataDir)) {
     fs.mkdirSync(dataDir, { recursive: true })
   }
   ```

2. **Database Connection** (line 13):
   ```typescript
   export const db = new Database(DB_PATH)
   ```

3. **Pragma Settings** (lines 16-17):
   ```typescript
   db.pragma('journal_mode = WAL')  // Write-Ahead Logging for better concurrency
   db.pragma('foreign_keys = ON')   // Enable foreign key constraints
   ```

4. **Auto-Migration Logic** (lines 20-45):
   The `initializeDatabase()` function has a built-in migration strategy:
   
   - **Test Insert Approach**: Tries to insert test records into `items` and `notes` tables
   - **If it fails**: Assumes schema is outdated and drops ALL tables
   - **Then recreates**: All tables with the current schema

   ```typescript
   try {
     // Test if the new schema exists by trying to insert test records
     db.prepare(`INSERT INTO items (id, type, text, parsed, entity_type, created_at, updated_at) VALUES ('test', 'idea', 'test', 0, NULL, 1, 1)`).run()
     db.prepare(`INSERT INTO notes (id, item_id, subtype, content, frontmatter) VALUES ('test-note', 'test', 'general', 'test', '{}')`).run()
     db.prepare(`DELETE FROM notes WHERE id = 'test-note'`).run()
     db.prepare(`DELETE FROM items WHERE id = 'test'`).run()
   } catch (e) {
     // If it fails, we need to migrate - drop and recreate tables
     console.log('Database schema outdated, migrating...')
     
     // Drop ALL tables in dependency order
     db.exec(`DROP TABLE IF EXISTS list_items`)
     db.exec(`DROP TABLE IF EXISTS lists`)
     db.exec(`DROP TABLE IF EXISTS projects`)
     db.exec(`DROP TABLE IF EXISTS notes`)
     db.exec(`DROP TABLE IF EXISTS todos`)
     db.exec(`DROP TABLE IF EXISTS tasks`)
     db.exec(`DROP TABLE IF EXISTS plans`)
     db.exec(`DROP TABLE IF EXISTS ai_suggestions`)
     db.exec(`DROP TABLE IF EXISTS settings`)
     db.exec(`DROP TABLE IF EXISTS items`)
     // NOTE: tags table is NOT in the drop list!
   }
   ```

   **CRITICAL OBSERVATION**: The `tags` table is **NOT** included in the drop list (lines 33-42). This means tags data is preserved during migrations.

5. **Table Creation** (lines 47-180):
   Tables are created using `db.exec()` with multi-line SQL strings:
   
   ```typescript
   db.exec(`
     CREATE TABLE IF NOT EXISTS table_name (
       id TEXT PRIMARY KEY,
       field1 TYPE CONSTRAINT,
       field2 TYPE DEFAULT value,
       FOREIGN KEY (field) REFERENCES other_table(id) ON DELETE CASCADE
     )
   `)
   ```

6. **Index Creation** (lines 194-202):
   All indexes are created in a single `db.exec()` block:
   
   ```typescript
   db.exec(`
     CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
     CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
     CREATE INDEX IF NOT EXISTS idx_items_archived ON items(archived);
     CREATE INDEX IF NOT EXISTS idx_todos_item_id ON todos(item_id);
     CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
     CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);
     CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
   `)
   ```

7. **Auto-execution** (line 208):
   ```typescript
   initializeDatabase()  // Runs immediately on import
   ```

### Tags Table Current Implementation

**Table Definition** (lib/db.ts:183-191):
```typescript
// Tags table - stores tag metadata (color, category)
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
    created_at INTEGER NOT NULL
  )
`)
```

**Current Index** (lib/db.ts:201):
```sql
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
```

### Tags API Integration

The tags table is used by `/app/api/tags/route.ts` for:

1. **GET /api/tags** (lines 21-79):
   - Calculates usage counts by parsing `items.tags` JSON arrays
   - Joins with tags table metadata (color, category)
   - Returns combined tag info sorted by usage count

2. **POST /api/tags** (lines 82-147):
   - Creates new tag metadata records
   - Validates category against allowed values
   - Checks for duplicate tag names via UNIQUE constraint

3. **PUT /api/tags** (lines 150-252):
   - Updates tag metadata (color, category)
   - Renames tags globally across all items
   - Uses transaction for atomicity

4. **DELETE /api/tags** (lines 255-322):
   - Deletes tag metadata
   - Removes tag from all items
   - Uses transaction for atomicity

**Key Pattern**: Usage counts are currently calculated on-the-fly by parsing JSON, not stored in the database.

---

## SQLite & better-sqlite3 Reference

### Library Version
- **better-sqlite3**: v12.4.1 (from package.json)
- **Type Definitions**: @types/better-sqlite3 v7.6.13

### Key Methods Used in This Codebase

1. **db.exec()** - Execute SQL without returning results
   ```typescript
   db.exec(`CREATE TABLE IF NOT EXISTS ...`)
   ```
   - Used for DDL (CREATE TABLE, CREATE INDEX, DROP TABLE)
   - Can execute multiple statements separated by semicolons
   - Does not return data

2. **db.prepare().run()** - Execute parameterized query
   ```typescript
   db.prepare(`INSERT INTO tags (id, name) VALUES (?, ?)`).run(id, name)
   ```
   - Used for INSERT, UPDATE, DELETE
   - Returns `{ changes: number, lastInsertRowid: number }`

3. **db.prepare().get()** - Get single row
   ```typescript
   const tag = db.prepare(`SELECT * FROM tags WHERE name = ?`).get(tagName)
   ```
   - Returns single object or undefined

4. **db.prepare().all()** - Get all rows
   ```typescript
   const tags = db.prepare(`SELECT * FROM tags`).all()
   ```
   - Returns array of objects

5. **db.transaction()** - Atomic operations
   ```typescript
   const updateTag = db.transaction(() => {
     db.prepare(`UPDATE tags ...`).run()
     db.prepare(`UPDATE items ...`).run()
     return count
   })
   const result = updateTag()  // Execute transaction
   ```

### SQLite Data Types & Constraints

**SQLite Type Affinity**:
- `TEXT` - String values
- `INTEGER` - Whole numbers (also used for booleans: 0=false, 1=true)
- `REAL` - Floating point numbers

**Boolean in SQLite**:
SQLite doesn't have a native BOOLEAN type. Use:
```sql
is_default INTEGER DEFAULT 0 CHECK (is_default IN (0, 1))
-- Or more commonly:
is_default INTEGER DEFAULT 0
```
In JavaScript: `0 = false`, `1 = true`

**Common Constraints**:
- `PRIMARY KEY` - Unique identifier
- `UNIQUE` - No duplicates allowed
- `NOT NULL` - Value required
- `DEFAULT value` - Default if not specified
- `CHECK (condition)` - Validation rule
- `FOREIGN KEY (field) REFERENCES table(id) ON DELETE CASCADE` - Referential integrity

**Nullable Fields**:
- Fields are nullable by default unless `NOT NULL` is specified
- `last_used_at INTEGER` (without NOT NULL) allows NULL values

### CREATE TABLE IF NOT EXISTS

**Syntax**:
```sql
CREATE TABLE IF NOT EXISTS table_name (
  column1 datatype constraints,
  column2 datatype constraints,
  ...
  table_constraints
)
```

**Behavior**:
- Creates table only if it doesn't exist
- If table exists, statement is silently skipped
- **WARNING**: Does NOT modify existing table structure
- To modify existing table, use `ALTER TABLE` or drop/recreate

### CREATE INDEX IF NOT EXISTS

**Syntax**:
```sql
CREATE INDEX IF NOT EXISTS index_name ON table_name(column1 [ASC|DESC], column2, ...);
```

**Best Practices**:
- Use `DESC` for columns frequently sorted in descending order
- Index columns used in WHERE clauses, JOIN conditions, ORDER BY
- Don't over-index - each index adds write overhead
- Composite indexes: order matters (most selective column first)

**Example from codebase**:
```sql
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
```

### ALTER TABLE (for modifying existing tables)

**WARNING**: The current codebase does NOT use ALTER TABLE. Instead, it uses a drop/recreate migration strategy.

However, for reference:
```sql
ALTER TABLE table_name ADD COLUMN column_name datatype constraints;
```

**SQLite ALTER TABLE Limitations**:
- Can ADD COLUMN
- Can RENAME COLUMN (SQLite 3.25.0+)
- Can RENAME TABLE
- CANNOT drop columns (prior to SQLite 3.35.0)
- CANNOT modify column types/constraints

**For this project**: We will use the ALTER TABLE approach to preserve existing data.

---

## Implementation Strategy

### Option 1: ALTER TABLE (Recommended for Production)
Preserve existing tag data by adding new columns:

```sql
ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE tags ADD COLUMN is_default INTEGER DEFAULT 0;
ALTER TABLE tags ADD COLUMN last_used_at INTEGER;
```

Then add new index:
```sql
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
```

**Pros**:
- Preserves existing tag metadata (colors, categories)
- No data loss
- Safer for production

**Cons**:
- Requires additional migration logic

### Option 2: Update Schema and Let Migration Handle It
Since tags table is NOT in the drop list (lines 33-42), updating the schema won't trigger auto-migration. Need to manually add it to drop list temporarily.

**Pros**:
- Clean schema definition
- Consistent with codebase pattern

**Cons**:
- Loses existing tag data
- Not suitable if tags have been customized

### Recommended Approach: ALTER TABLE

Add ALTER TABLE statements in the `initializeDatabase()` function after the CREATE TABLE statement but before the indexes section.

---

## Exact Implementation Location

### File: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Current Tags Table Section** (lines 183-191):
```typescript
  // Tags table - stores tag metadata (color, category)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
      created_at INTEGER NOT NULL
    )
  `)
```

**INSERT POINT FOR ALTER TABLE STATEMENTS**: 
**After line 191** (after tags table creation, before indexes section)

Add:
```typescript
  // Migrate tags table: add usage tracking fields
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0`)
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN is_default INTEGER DEFAULT 0`)
  } catch (e) {
    // Column already exists, ignore
  }
  
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN last_used_at INTEGER`)
  } catch (e) {
    // Column already exists, ignore
  }
```

**Current Indexes Section** (lines 194-202):
```typescript
  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_archived ON items(archived);
    CREATE INDEX IF NOT EXISTS idx_todos_item_id ON todos(item_id);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `)
```

**UPDATE POINT FOR NEW INDEX**:
**Line 201** - Add new index to existing list

Change from:
```sql
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
```

To:
```sql
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
```

---

## Code Pattern Examples from Codebase

### Table Creation Pattern
```typescript
// Example: Projects table (lines 133-146)
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
    tags TEXT, -- JSON array of tags
    deadline INTEGER,
    description TEXT,
    progress INTEGER DEFAULT 0,
    start_date INTEGER,
    end_date INTEGER,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )
`)
```

### Index Creation Pattern
```typescript
// All indexes in single exec block (lines 194-202)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
  CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
  CREATE INDEX IF NOT EXISTS idx_items_archived ON items(archived);
  CREATE INDEX IF NOT EXISTS idx_todos_item_id ON todos(item_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
  CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);
  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
`)
```

### Transaction Pattern (from API routes)
```typescript
// Example: app/api/tags/route.ts lines 163-236
const updateTag = db.transaction(() => {
  // Multiple database operations
  db.prepare(`UPDATE tags ...`).run(...)
  db.prepare(`UPDATE items ...`).run(...)
  return result
})

const result = updateTag()  // Execute transaction
```

---

## Implementation Notes & Gotchas

### 1. ALTER TABLE Try-Catch Pattern
SQLite will throw an error if you try to add a column that already exists. Use try-catch to make it idempotent:

```typescript
try {
  db.exec(`ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0`)
} catch (e) {
  // Column already exists, safe to ignore
}
```

### 2. Boolean Fields in SQLite
Use `INTEGER DEFAULT 0` for boolean fields:
- `0` = false
- `1` = true
- Optional: Add CHECK constraint `CHECK (is_default IN (0, 1))`

### 3. Nullable vs NOT NULL
- `last_used_at INTEGER` (nullable) - OK for fields that may not have values initially
- New columns added via ALTER TABLE get DEFAULT value for existing rows
- NULL is acceptable for timestamp fields that haven't occurred yet

### 4. Index Order Matters
For `usage_count`, use `DESC` since queries will typically want most-used tags first:
```sql
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
```

### 5. Migration is Idempotent
- `CREATE TABLE IF NOT EXISTS` - safe to run multiple times
- `CREATE INDEX IF NOT EXISTS` - safe to run multiple times
- `ALTER TABLE ADD COLUMN` with try-catch - safe to run multiple times

### 6. Database File Location
- Development: `/home/mmariani/Projects/idealisted/data/idealisted.db`
- Created automatically if doesn't exist
- WAL mode creates additional files: `.db-wal`, `.db-shm`

### 7. No Need to Update Drop List
Since we're using ALTER TABLE (not recreating), we don't need to add `tags` to the drop list in the migration section.

---

## Testing the Changes

After implementation, verify:

1. **Table Schema**:
   ```bash
   sqlite3 data/idealisted.db ".schema tags"
   ```
   Should show all 8 fields including new ones.

2. **Indexes**:
   ```bash
   sqlite3 data/idealisted.db ".indexes tags"
   ```
   Should show both `idx_tags_name` and `idx_tags_usage`.

3. **Existing Data Preserved**:
   ```bash
   sqlite3 data/idealisted.db "SELECT * FROM tags;"
   ```
   Should show existing tags with new fields set to defaults (0 for usage_count/is_default, NULL for last_used_at).

4. **API Still Works**:
   Start dev server and test GET /api/tags endpoint.

---

## Related Files to Update (Future Tasks)

After database schema is updated, these files will need updates:

1. **types/index.ts** - Add Tag interface with new fields
2. **app/api/tags/route.ts** - Update to use database usage_count instead of calculating
3. **app/api/items/route.ts** - Update last_used_at when tags are used
4. **app/api/items/[id]/route.ts** - Update last_used_at on item updates

---

## Summary Checklist

- [ ] Add ALTER TABLE statements after line 191 in lib/db.ts
- [ ] Wrap each ALTER in try-catch for idempotency
- [ ] Add new index to line 201 in lib/db.ts
- [ ] Use `DESC` for usage_count index
- [ ] Test schema changes with sqlite3
- [ ] Verify existing tag data is preserved
- [ ] Verify API endpoints still work

---

## Complete Code Change

**File**: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Location 1**: After line 191 (after tags table creation)

```typescript
  // Migrate tags table: add usage tracking fields (if they don't exist)
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

**Location 2**: Line 201 (in indexes section)

Change:
```sql
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
```

To:
```sql
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
```

---

## Expected Final Schema

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
  created_at INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0,
  last_used_at INTEGER
);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);
```

---

*This context pack generated for implementing Step 1.1 of the Tags System implementation plan.*

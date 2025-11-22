# Context Manifest: seedDefaultTags() Implementation

## Task Overview
Create a `seedDefaultTags()` function in `lib/db.ts` that initializes a default set of 25 tags in the database with `is_default = true` flag, checking for existing tags to prevent duplicates.

---

## How Tags Currently Work in IdeaListed

### Database Schema
The tags table is defined in `lib/db.ts:182-191`:

```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
  created_at INTEGER NOT NULL
)
```

**Current Schema Limitation**: The `tags` table does NOT have an `is_default` column yet. This field needs to be added via migration.

### Existing Tag Operations
Tags are managed through the API (`/api/tags/route.ts`):

1. **Creation** (POST): Uses `db.prepare().run()` with checked columns:
   ```typescript
   db.prepare(`
     INSERT INTO tags (id, name, color, category, created_at)
     VALUES (?, ?, ?, ?, ?)
   `).run(id, name.trim(), color, category || 'Other', now)
   ```

2. **Validation**: 
   - Checks for existing tags by name with `.get()`:
   ```typescript
   const existing = db.prepare(`
     SELECT id FROM tags WHERE name = ?
   `).get(name.trim())
   ```
   - Category enum validation: only 'Work', 'Personal', 'Health', 'Finance', 'Other'
   - All color values are hex strings

3. **Storage**: Tag usage is stored in `items` table as JSON array in `tags` column
   - Tags are stored as string arrays: `["work", "urgent", "bug"]`
   - Parsed/unparsed with `JSON.parse()` and `JSON.stringify()`

4. **Existing Patterns**:
   - Uses `nanoid()` for IDs (see `/api/tags/route.ts:122`)
   - Uses transactions for multi-step updates (see `/api/tags/route.ts:163-236`)
   - All color values are hex: `#868e96` (grey default), no validation applied

### Tag Category Constraints
Valid categories hardcoded: `'Work' | 'Personal' | 'Health' | 'Finance' | 'Other'`

Category mapping for the 25 default tags:
- **Work**: work, urgent, meeting, deadline, focus, bug, feature, design, planning, review, web
- **Personal**: home, shopping, family, hobby, history, philosophy, news, politics, tech, entertainment, culture, science
- **Health**: health
- **Finance**: finance

---

## Implementation Requirements Analysis

### Default Tags to Seed (25 Total)
```
work, urgent, meeting, deadline, focus, home, health, finance, shopping, family, 
bug, feature, design, planning, review, news, politics, tech, entertainment, culture, 
web, hobby, history, philosophy, science
```

### Color Assignment Strategy
Better-sqlite3 has no built-in UUID support, so we must:
1. Use `crypto.randomUUID()` (Node.js built-in, no import needed in Node 15+)
2. Use prepared statements for batch inserts (performance)
3. Check if tags table is empty BEFORE seeding (idempotent)

### Prepared Statement Pattern (from codebase)
From `app/api/items/route.ts:164-182`:
```typescript
const insertItem = db.prepare(`
  INSERT INTO items (id, type, text, created_at, updated_at, metadata, tags, archived, parsed, entity_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
`)

insertItem.run(
  id,
  body.type,
  body.text,
  now,
  now,
  metadataJson,
  tagsJson,
  (body as any).parsed ? 1 : 0,
  (body as any).entity_type || null
)
```

Key pattern: Prepare once, call `.run()` multiple times for bulk inserts.

### Better-sqlite3 API Reference
From codebase usage:
- `.prepare(sqlString)` - Returns prepared statement object
- `.run(...params)` - Executes INSERT/UPDATE/DELETE, returns result with `changes` property
- `.get(...params)` - Executes SELECT, returns single row or undefined
- `.all(...params)` - Executes SELECT, returns array of rows
- `.transaction(fn)` - Wraps function in database transaction (atomic)

---

## Required Database Schema Migration

### Migration Required
The `tags` table needs an `is_default` column. The migration pattern used in `lib/db.ts:20-43` drops and recreates tables when the schema changes.

Add this column to the CREATE TABLE statement:
```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
)
```

---

## Implementation Location

**File**: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Placement**: After table creation block (after line 203, before `console.log('Database initialized successfully')`)

The function should be called at the bottom of `initializeDatabase()` to ensure:
1. Tables exist before seeding
2. Seeds run after schema is ready
3. Idempotent check prevents duplicate inserts on subsequent app starts

---

## Error Handling Strategy

From codebase patterns (`app/api/tags/route.ts:82-146`):
1. **Validation errors**: Return NextResponse with 400 status
2. **Database errors**: Log with console.error, return NextResponse with 500 status
3. **Graceful degradation**: Don't fail app startup if seeding fails (log warning, continue)

For seeding (not API route), recommend:
```typescript
try {
  // Seeding logic
} catch (error) {
  console.warn('Failed to seed default tags:', error)
  // Don't throw - let app continue without defaults
}
```

---

## Function Signature & Responsibilities

```typescript
function seedDefaultTags() {
  // 1. Check if tags table already has data (idempotent)
  // 2. If empty, insert 25 default tags
  // 3. Each tag needs:
  //    - id: crypto.randomUUID()
  //    - name: from list of 25
  //    - color: hex color string (assign category-appropriate colors)
  //    - category: Work|Personal|Health|Finance|Other
  //    - is_default: 1 (true)
  //    - created_at: Date.now()
  // 4. Use prepared statement for performance
  // 5. Log results (how many seeded)
}
```

---

## Color Palette Reference

From UI codebase (`lib/themes.ts` would have theme colors). Use safe palette:
- Work: Blues/Purples (#5B6FDD, #6C5CE7)
- Personal: Greens/Oranges (#00B894, #FDCB6E)
- Health: Reds/Pinks (#D63031, #E84393)
- Finance: Blues/Grays (#0984E3, #2D3436)
- Other: Grays (#95A5A6)

---

## Integration Points

### After Implementation
1. **No API changes needed** - POST /api/tags already handles tag creation
2. **No component changes** - Tags are just metadata, stored in items
3. **No config changes** - Seeding is automatic on app init

### Testing Points
- Verify seeds run exactly once (check count doesn't grow)
- Verify all 25 tags appear in GET /api/tags
- Verify colors and categories are correct
- Verify tags work in capture UI (dropdown/autocomplete if implemented)

---

## Code Organization

### File Structure
```
lib/db.ts
├── Database connection setup (lines 1-17)
├── initializeDatabase() function (lines 20-204)
│   ├── Schema migration logic (lines 22-44)
│   ├── CREATE TABLE statements (lines 47-191)
│   ├── CREATE INDEX statements (lines 193-202)
│   └── seedDefaultTags() call (TO BE ADDED)
├── Export db and default init (lines 207-210)
```

### Function to Add
Place `seedDefaultTags()` as an internal function (not exported):
- Define before `initializeDatabase()`
- Call from within `initializeDatabase()` at end
- Keep it focused: only insert default tags

---

## Dependencies & Imports

### Already Available
- `crypto.randomUUID()` - Node.js built-in, available globally
- `Date.now()` - Built-in JavaScript
- `db` object - Already initialized in this file

### No Additional Imports Needed
The file already imports `Database`, `path`, and `fs`. No additional packages required.

---

## Expected Output

When function runs successfully:
```
Database initialized successfully
Seeded 25 default tags
```

On subsequent app starts (idempotent):
```
Database initialized successfully
```
(No message - seed check finds existing tags and skips)

When seeding fails (graceful degradation):
```
Database initialized successfully
Failed to seed default tags: [error message]
(App continues, just without defaults)
```

---

## Summary

The `seedDefaultTags()` function should:
1. Use `db.prepare().count()` or simple SELECT COUNT to check if tags exist
2. If empty, prepare bulk INSERT with 25 tag rows
3. Use prepared statements (prepare once, run multiple times)
4. Include error handling that logs but doesn't crash
5. Be called once during database initialization
6. Be idempotent (safe to run multiple times)

This is a simple seeding operation that adds initial data on first app load.

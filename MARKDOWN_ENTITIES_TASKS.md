# Markdown Entity System - Task Breakdown

**Parent Plan**: MARKDOWN_ENTITIES_PLAN.md
**Last Updated**: 2025-11-16

---

## Task Tracking

This document provides granular task-level detail for implementing the Markdown Entity System. Each task follows the workflow:

1. Context Gathering (read relevant files, understand current state)
2. Prompt Generation (create implementation prompt referencing context)
3. Implementation (use subagent with prompt + context)
4. Code Review (review agent checks code)
5. Documentation (update docs, clean repo)
6. Commit (git commit with detailed message)

---

## Phase 1: Foundation (Database + Templates)

### Task 1.1: Database Migration
**Objective**: Add markdown columns to items table, create templates table

**Deliverables**:
- Add `markdown_content TEXT` to items table
- Add `template_id TEXT` to items table
- Create `templates` table with schema from plan
- Idempotent migration (can run multiple times safely)

**Files to Create/Modify**:
- `lib/db.ts` - Add migration logic in initDatabase()

**Success Criteria**:
- Tables updated successfully
- No errors on build
- Database schema validated

---

**Status**: ✅ COMPLETE
**Completed**: 2025-11-16
**Implementation**: `/home/mmariani/Projects/idealisted/lib/db.ts` lines 213-232, 289-302, 394, 401
**Code Review**: ✅ APPROVED - Idempotent migration, backward compatible, follows existing patterns
**Verification**: Server starts successfully, schema verified, indexes created

---

## Context Manifest

### How the Database System Currently Works

The IdeaListed application uses **better-sqlite3** for local SQLite database storage with a sophisticated auto-migration system. The database is located at `data/idealisted.db` and uses WAL (Write-Ahead Logging) mode for better concurrency with foreign key enforcement enabled.

#### Database Initialization Flow

When the application starts, `lib/db.ts` is imported, which immediately triggers the `initializeDatabase()` function at line 374. This function implements a **destructive migration pattern** (lines 120-144) that works as follows:

1. **Schema Validation via Test Insert**: The system attempts to insert test records into both the `items` and `notes` tables to verify the current schema supports all expected columns (lines 123-126)
2. **Migration Detection**: If the test insert fails (throws an exception), this signals that the schema is outdated and needs migration (line 127)
3. **Drop and Recreate**: When migration is needed, ALL tables are dropped in dependency order (child tables first to avoid FK constraint violations), then recreated with the new schema (lines 132-143)
4. **Idempotent Table Creation**: All tables use `CREATE TABLE IF NOT EXISTS`, allowing the creation statements to run safely even if tables already exist (lines 147-320)
5. **Post-Create Column Additions**: For incremental column additions (like the reminder columns added to tasks), the code uses `ALTER TABLE ADD COLUMN` wrapped in try-catch blocks that ignore "duplicate column name" errors (lines 193-211, 323-351)

This pattern means that **breaking schema changes** trigger a full reset, while **additive changes** (new columns) can be applied incrementally without data loss.

#### Current Items Table Schema

The `items` table (lines 147-161) is the **central entity table** following a polymorphic pattern. Current structure:

```sql
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('idea', 'todo', 'task', 'note', 'list', 'project')),
  text TEXT NOT NULL,
  metadata TEXT, -- JSON for additional data
  tags TEXT, -- JSON array of tags
  parsed INTEGER DEFAULT 0, -- Parse + Convert: has been categorized
  entity_type TEXT, -- Parse + Convert: suggested type (task|note|list|project)
  ai_suggestion TEXT, -- Parse + Convert: stored AI suggestion JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived INTEGER DEFAULT 0
)
```

**Key architectural points:**
- The `type` field determines which specialized table (tasks, notes, projects, lists) contains additional data for this item
- Each specialized table has a `item_id` foreign key pointing back to items with `ON DELETE CASCADE`
- JSON fields (metadata, tags, ai_suggestion) are stored as TEXT and must be parsed/stringified in application code
- Boolean fields use INTEGER (0 or 1) as SQLite doesn't have a native boolean type

#### Type-Specific Tables and Relationships

The system currently has these specialized tables with 1:1 relationships to items:

**Tasks Table** (lines 179-190): Stores task-specific data including status, priority, due dates, and project assignments. Already has reminder columns added via ALTER TABLE pattern (lines 193-211).

**Notes Table** (lines 215-226): Stores note content and metadata with subtype categorization (general, research, video, link, file, contact, meeting). Has frontmatter field for YAML metadata stored as JSON string.

**Projects, Lists, Todos**: Similar 1:1 relationships with specialized fields.

The test insert at line 124 validates the notes table specifically checks for the `frontmatter` column, indicating this was a recent schema addition.

#### Migration Pattern for This Task

For adding `markdown_content` and `template_id` to the items table, we have **two options**:

**Option A: Non-Destructive (Recommended for Production)**
Use the ALTER TABLE pattern similar to reminder columns (lines 193-211):
```typescript
try {
  db.exec(`ALTER TABLE items ADD COLUMN markdown_content TEXT`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add markdown_content column:', e)
    throw e
  }
  // Column already exists, safe to ignore
}

try {
  db.exec(`ALTER TABLE items ADD COLUMN template_id TEXT`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add template_id column:', e)
    throw e
  }
}
```

**Option B: Update Test Insert (Triggers Full Migration)**
Modify the test insert at line 123 to include the new columns:
```typescript
db.prepare(`INSERT INTO items (id, type, text, parsed, entity_type, markdown_content, template_id, created_at, updated_at) VALUES ('test', 'idea', 'test', 0, NULL, NULL, NULL, 1, 1)`).run()
```

This will cause the test to fail on existing databases, triggering a full drop/recreate. Since the user stated "we haven't used the tool in earnest yet" (from MARKDOWN_ENTITIES_PLAN.md line 493), data loss is acceptable.

**Recommendation**: Use Option A (ALTER TABLE) initially, as it's safer and follows the established pattern in the codebase.

#### Templates Table Specification

From MARKDOWN_ENTITIES_PLAN.md (lines 48-61), the new templates table should be created:

```sql
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,              -- 'task', 'note-generic', 'note-youtube'
  name TEXT NOT NULL,               -- Display name
  entity_type TEXT NOT NULL,        -- 'task', 'note', 'project', 'list'
  subtype TEXT,                     -- NULL for task, 'generic'/'youtube' for notes
  markdown_template TEXT NOT NULL,  -- Template content with {placeholders}
  field_config TEXT NOT NULL,       -- JSON: field types and validation rules
  is_system INTEGER DEFAULT 1,      -- 1 = system template, 0 = user template (future)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

This table should be created in the same section as other entity tables (after line 267, before the indexes section at line 354).

#### Data Access Patterns

The API layer (`app/api/items/route.ts`) demonstrates the query patterns:

**GET Queries** (lines 15-32): Use LEFT JOIN to fetch items with all related entity data in a single query, then transform flat rows into nested objects (lines 52-150).

**POST Queries** (lines 167-289): Use transactions (implicit via better-sqlite3's synchronous API) to insert into items table first, then insert into type-specific tables using the same item ID.

**JSON Field Handling** (lines 172-173, 59-60): Always stringify before INSERT, always parse after SELECT:
```typescript
const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null
// ... later ...
metadata: row.metadata ? JSON.parse(row.metadata) : undefined
```

This same pattern must be followed for `field_config` in the templates table.

#### Seeding Patterns

The codebase has two seeding functions showing the expected pattern:

**seedDefaultTags()** (lines 20-80): Checks for existing data before seeding to ensure idempotency:
```typescript
const existingCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
if (existingCount.count > 0) {
  return // Tags already seeded
}
```

**seedAIFeatureSettings()** (lines 82-116): Uses `INSERT OR IGNORE` for idempotent seeding:
```typescript
INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
VALUES (?, ?, ?)
```

Task 1.2 will need to implement a `seedTemplates()` function following this pattern.

### What This Migration Needs to Accomplish

**Primary Goals:**
1. Add two new nullable TEXT columns to the items table without data loss
2. Create a new templates table to store markdown template definitions
3. Ensure the migration is idempotent (can run multiple times without errors)
4. Follow existing code patterns for consistency

**Integration Points:**
- The `markdown_content` field will store rendered markdown for tasks and notes (NULL for legacy items and projects/lists)
- The `template_id` field will reference templates.id (e.g., 'task', 'note-generic', 'note-youtube')
- Detection pattern: `if (item.markdown_content !== null)` determines markdown vs legacy rendering (from plan line 72)

**Constraints:**
- Must not break existing API routes that query items table
- Must support NULL values for legacy items (backward compatibility)
- Must follow SQLite best practices (TEXT for strings, INTEGER for timestamps and booleans)
- Must be added to the initializeDatabase() function after existing table creation (lines 119-371)

### Files and Code Locations

**Primary File: `/home/mmariani/Projects/idealisted/lib/db.ts`**

Key sections:
- Lines 1-17: Database setup (imports, path, WAL mode, foreign keys)
- Lines 20-80: seedDefaultTags() - reference pattern for Task 1.2
- Lines 82-116: seedAIFeatureSettings() - alternate seeding pattern
- Lines 119-144: Migration detection and drop logic
- Lines 147-161: items table creation - **ADD COLUMNS HERE**
- Lines 163-267: Other entity tables
- Lines 270-320: Supporting tables (plans, ai_suggestions, settings, ai_feature_settings, tags)
- Lines 323-351: ALTER TABLE column additions (reminder columns, tag tracking)
- Lines 354-365: Index creation
- Lines 367-371: Seeding function calls

**Related Files for Context:**
- `/home/mmariani/Projects/idealisted/types/index.ts` - Type definitions (will need Template types in Task 1.3)
- `/home/mmariani/Projects/idealisted/app/api/items/route.ts` - API patterns for querying items
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md` - Template specifications (lines 344-437)

### Technical Reference: Migration Code Pattern

**For items table columns (choose one approach):**

```typescript
// Approach 1: ALTER TABLE (safer, preserves data)
// Add after line 211 (after last ALTER TABLE for tasks)
try {
  db.exec(`ALTER TABLE items ADD COLUMN markdown_content TEXT`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add markdown_content column:', e)
    throw e
  }
}

try {
  db.exec(`ALTER TABLE items ADD COLUMN template_id TEXT`)
} catch (e) {
  if (!e.message?.includes('duplicate column name')) {
    console.error('Failed to add template_id column:', e)
    throw e
  }
}

// Approach 2: Update items CREATE TABLE statement
// Modify lines 147-161 to include new columns in schema
// Then update test insert at line 123 to trigger migration
```

**For templates table:**

```typescript
// Add after projects table creation (after line 267)
// Templates table
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    subtype TEXT,
    markdown_template TEXT NOT NULL,
    field_config TEXT NOT NULL,
    is_system INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)
```

**Index creation:**

```typescript
// Add to indexes section (around line 364)
CREATE INDEX IF NOT EXISTS idx_items_template ON items(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_entity_type ON templates(entity_type);
```

### Dependencies and Prerequisites

**Before Starting:**
- Read MARKDOWN_ENTITIES_PLAN.md lines 42-61 for templates table specification
- Read MARKDOWN_ENTITIES_PLAN.md lines 344-437 for template examples (needed for Task 1.2)

**This Task Enables:**
- Task 1.2: Seed Initial Templates (requires templates table to exist)
- Task 1.3: TypeScript Type Definitions (requires knowing final schema)
- All Phase 2+ tasks depend on these database columns existing

**No External Dependencies:**
- Uses existing better-sqlite3 package (already installed)
- No new npm packages required
- No API changes required (columns are nullable for backward compatibility)

### Success Validation

After implementation, verify:

1. **Schema Check**: Run in SQLite shell or via query:
   ```sql
   PRAGMA table_info(items);
   -- Should show markdown_content and template_id columns

   SELECT sql FROM sqlite_master WHERE name='templates';
   -- Should return the templates table definition
   ```

2. **Build Check**: Run `npm run build` - should complete without TypeScript errors

3. **Idempotency Check**: Restart the dev server twice - should not error on second initialization

4. **Backward Compatibility**: Existing items should still load with NULL values for new columns

5. **Index Check**:
   ```sql
   SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='items';
   -- Should include idx_items_template
   ```

---

---

### Task 1.2: Seed Initial Templates
**Objective**: Insert 3 templates into templates table

**Deliverables**:
- Task template with field_config
- Note-Generic template with field_config
- Note-YouTube template with field_config
- Idempotent seeding (skip if already exists)

**Files to Modify**:
- `lib/db.ts` - Add seedTemplates() function

**Template Content**:
See MARKDOWN_ENTITIES_PLAN.md "Template Examples" section

**Success Criteria**:
- 3 rows in templates table
- field_config is valid JSON
- Templates queryable via SELECT

---

**Status**: ✅ COMPLETE
**Completed**: 2025-11-16
**Implementation**: `/home/mmariani/Projects/idealisted/lib/db.ts` lines 118-215, 409
**Code Review**: ✅ APPROVED - Perfect specification compliance, INSERT OR IGNORE pattern, verified in database
**Verification**: 3 templates seeded successfully, all field_config valid JSON, idempotent across restarts

---

## Context Manifest

### How Database Seeding Currently Works

The IdeaListed database initialization system in `/home/mmariani/Projects/idealisted/lib/db.ts` follows a well-established pattern for seeding initial data. This system was built to ensure that default application data exists in the database when the application starts, while preventing duplicate seeding on subsequent runs.

#### The Seeding Architecture

When the application starts, `lib/db.ts` is imported (line 1-17), which immediately triggers the database initialization at line 412 via the call to `initializeDatabase()`. The initialization flow creates all database tables (lines 119-402) and then, crucially, calls seeding functions at lines 407-408:

```typescript
// Seed default data
seedDefaultTags()
seedAIFeatureSettings()
```

These seeding functions run **after** all tables are created but **before** the application starts serving requests. This ensures that when API routes query the database, the default data already exists.

#### Pattern A: Count-Based Idempotency (seedDefaultTags)

The `seedDefaultTags()` function (lines 20-80) demonstrates the **count-based idempotency pattern**. Here's how it works:

**Step 1: Check if data already exists**

Before attempting any inserts, the function queries the target table to count existing rows:

```typescript
const existingCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
if (existingCount.count > 0) {
  return // Tags already seeded
}
```

This approach assumes that if ANY tags exist, the seeding has already occurred. It's simple and effective for tables where you're seeding a fixed set of records.

**Step 2: Insert all seed data in a transaction**

If the count is zero, the function proceeds to insert all 25 default tags (lines 27-73). It prepares a single INSERT statement outside the loop (line 63-66), then executes it multiple times with different values (lines 69-72). This is more efficient than preparing statements inside the loop.

**Step 3: Handle errors gracefully**

The entire seeding operation is wrapped in a try-catch block (lines 62-79) that logs warnings but doesn't throw errors. This means if seeding fails (perhaps due to database corruption or schema mismatch), the application continues to run rather than crashing at startup. The philosophy here is: default data is helpful but not critical to basic operation.

**Why this pattern?**

This pattern is used when:
- You're seeding a batch of related records as a unit
- It's acceptable to have "all or nothing" seeding (either all tags exist or none do)
- You want simple, fast idempotency checking (single COUNT query)
- Re-running seeding after partial success is acceptable (COUNT would return >0)

#### Pattern B: INSERT OR IGNORE (seedAIFeatureSettings)

The `seedAIFeatureSettings()` function (lines 82-116) demonstrates a different approach: **SQL-level idempotency** using SQLite's `INSERT OR IGNORE` clause.

**How INSERT OR IGNORE works:**

```typescript
const insert = db.prepare(`
  INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
  VALUES (?, ?, ?)
`)

features.forEach(feature => {
  insert.run(feature.name, feature.enabled, feature.description)
})
```

The `OR IGNORE` clause tells SQLite: "Try to insert this row, but if there's a constraint violation (like a PRIMARY KEY or UNIQUE constraint conflict), silently skip it instead of throwing an error."

Since `ai_feature_settings` has `feature_name TEXT PRIMARY KEY` (line 341), attempting to insert a duplicate feature_name will be ignored. This means the function can run safely every time the app starts:

- First run: All 3 features inserted successfully
- Second run: All 3 INSERT attempts result in IGNORE (no-op)
- Third run onwards: Same as second run

**Why this pattern?**

This pattern is preferred when:
- Each record can be seeded independently (not all-or-nothing)
- The table has a PRIMARY KEY or UNIQUE constraint that identifies duplicate attempts
- You want SQLite to handle idempotency (no application-level counting needed)
- You want individual records to be "self-healing" (if one is deleted, re-running seeds just that one)

**Trade-offs:**

INSERT OR IGNORE is slightly less efficient than the count-based pattern (it attempts 3 INSERT operations every startup vs. 1 SELECT COUNT), but it's more robust for individual record management.

#### Better-sqlite3 Patterns

Both functions use `better-sqlite3`'s synchronous API:

**Prepared Statements:**
```typescript
const insert = db.prepare('INSERT INTO table VALUES (?, ?)')
insert.run(value1, value2) // Execute with parameters
```

Prepared statements are cached by better-sqlite3 and provide SQL injection protection.

**Querying:**
```typescript
const result = db.prepare('SELECT COUNT(*) as count FROM table').get() as { count: number }
```

The `.get()` method returns a single row (or undefined if no rows). The `.all()` method returns an array of all rows.

**No explicit transactions needed:**

Better-sqlite3 runs all statements in autocommit mode by default. For multi-step operations requiring atomicity, you'd use `db.transaction()`, but simple INSERT operations don't require it.

### What Task 1.2 Needs to Accomplish

This task is about creating a `seedTemplates()` function that inserts 3 system templates into the newly created `templates` table. These templates are the foundation of the markdown entity system - every task and note created going forward will reference one of these templates.

#### The 3 Templates to Seed

**1. Task Template (id: 'task')**

This template defines the structure for all markdown-based tasks. It replaces the legacy tasks system with a richer, more structured format.

**Markdown Template:**
```markdown
# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes

```

**Field Configuration (as JSON object, will be stringified):**
```json
{
  "fields": {
    "Status": {
      "type": "select",
      "options": ["Not Started", "In Progress", "Completed"],
      "required": true
    },
    "Priority": {
      "type": "select",
      "options": ["Low", "Medium", "High", "Urgent"],
      "required": true
    },
    "Due Date": {
      "type": "date",
      "required": false
    }
  },
  "sections": {
    "Description": {
      "type": "textarea",
      "required": false
    },
    "Subtasks": {
      "type": "checklist",
      "required": false
    },
    "Notes": {
      "type": "textarea",
      "required": false
    }
  }
}
```

**Template Record Fields:**
- `id`: 'task'
- `name`: 'Task'
- `entity_type`: 'task'
- `subtype`: NULL (tasks don't have subtypes)
- `markdown_template`: The markdown string above
- `field_config`: JSON.stringify() the field config object
- `is_system`: 1 (system template, not user-created)
- `created_at`: Date.now()
- `updated_at`: Date.now()

**2. Note-Generic Template (id: 'note-generic')**

This is the default template for simple notes. It has minimal structure - just content and tags.

**Markdown Template:**
```markdown
# {title}

## Content


## Tags

```

**Field Configuration:**
```json
{
  "sections": {
    "Content": {
      "type": "textarea",
      "required": true
    },
    "Tags": {
      "type": "taglist",
      "required": false
    }
  }
}
```

**Template Record Fields:**
- `id`: 'note-generic'
- `name`: 'Generic Note'
- `entity_type`: 'note'
- `subtype`: 'generic'
- `markdown_template`: The markdown string above
- `field_config`: JSON.stringify() the field config object
- `is_system`: 1
- `created_at`: Date.now()
- `updated_at`: Date.now()

**3. Note-YouTube Template (id: 'note-youtube')**

This is a specialized template for taking notes on educational YouTube videos. It includes fields for the video URL, duration, watch status, key concepts, timestamps (for referencing specific video moments), an AI-generated summary section (for future AI integration), and user notes.

**Markdown Template:**
```markdown
# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes

```

**Field Configuration:**
```json
{
  "fields": {
    "URL": {
      "type": "url",
      "required": true,
      "validation": "youtube"
    },
    "Duration": {
      "type": "text",
      "required": false
    },
    "Status": {
      "type": "select",
      "options": ["Not Watched", "In Progress", "Completed"],
      "required": true
    }
  },
  "sections": {
    "Key Concepts": {
      "type": "bulletlist",
      "required": false
    },
    "Timestamps": {
      "type": "timestamplist",
      "required": false
    },
    "AI Summary": {
      "type": "textarea",
      "readonly": true,
      "required": false
    },
    "My Notes": {
      "type": "textarea",
      "required": false
    }
  }
}
```

**Template Record Fields:**
- `id`: 'note-youtube'
- `name`: 'YouTube Learning Note'
- `entity_type`: 'note'
- `subtype`: 'youtube'
- `markdown_template`: The markdown string above
- `field_config`: JSON.stringify() the field config object
- `is_system`: 1
- `created_at`: Date.now()
- `updated_at`: Date.now()

#### Why These Specific Templates?

The user explicitly requested these 3 templates based on their usage patterns:

1. **Task**: Structured todo tracking with priority, status, and due dates
2. **Generic Note**: Simple note-taking for general information
3. **YouTube Learning Note**: Specialized for educational content consumption with timestamp references

Future phases may add more templates (meeting notes, book notes, etc.), but these 3 are the MVP foundation.

#### Critical Implementation Details

**JSON Stringification:**

The `field_config` column in the templates table is defined as `TEXT NOT NULL` (line 297 of db.ts). This means we must store the field configuration objects as JSON strings:

```typescript
const fieldConfig = {
  fields: { /* ... */ },
  sections: { /* ... */ }
}

// When inserting:
const fieldConfigJson = JSON.stringify(fieldConfig)
insert.run(id, name, entityType, subtype, markdownTemplate, fieldConfigJson, isSystem, now, now)
```

Later, when templates are read from the database (in Phase 2+), they'll be parsed back to objects:

```typescript
const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId)
template.field_config = JSON.parse(template.field_config)
```

This pattern is consistent with how other JSON fields are handled in the codebase (see `items.metadata`, `items.tags`, etc. at lines 172-173 and 59-60 in app/api/items/route.ts).

**Newlines and Whitespace in Markdown Templates:**

The markdown templates contain significant whitespace (blank lines between sections). When defining these as template literal strings in TypeScript, preserve the exact formatting:

```typescript
const taskMarkdown = `# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes
`
```

The blank lines are intentional - they provide visual separation in the rendered markdown and are part of the template structure.

**Placeholder Syntax:**

The `{title}` placeholder in the markdown templates is a convention for the markdown parser (to be built in Phase 2). It indicates where the entity's title should be inserted. For now, we're just storing the templates as-is; the parser will handle placeholder substitution later.

### Choosing the Right Idempotency Pattern

For seeding templates, we have two options:

**Option A: Count-Based (like seedDefaultTags)**

```typescript
function seedTemplates() {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number }
  if (existingCount.count > 0) {
    return // Templates already seeded
  }

  // Insert all 3 templates...
}
```

**Pros:**
- Fast (single SELECT COUNT vs. 3 INSERT attempts)
- Matches existing pattern in codebase
- Clear intent: either seed all or seed none

**Cons:**
- If someone manually deletes one template, re-running won't restore it
- Assumes templates are seeded as an atomic unit

**Option B: INSERT OR IGNORE (like seedAIFeatureSettings)**

```typescript
function seedTemplates() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO templates (id, name, entity_type, subtype, markdown_template, field_config, is_system, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // Attempt to insert task template
  insert.run('task', 'Task', 'task', null, taskMarkdown, taskFieldConfig, 1, now, now)

  // Attempt to insert note-generic template
  insert.run('note-generic', 'Generic Note', 'note', 'generic', noteGenericMarkdown, noteGenericFieldConfig, 1, now, now)

  // Attempt to insert note-youtube template
  insert.run('note-youtube', 'YouTube Learning Note', 'note', 'youtube', noteYoutubeMarkdown, noteYoutubeFieldConfig, 1, now, now)
}
```

**Pros:**
- Self-healing: If one template is deleted, restarting the app re-seeds just that one
- No upfront COUNT query needed
- More granular control (each template independent)

**Cons:**
- Slightly less efficient (3 INSERT attempts every startup vs. 1 SELECT COUNT + early return)

**Recommendation: Use INSERT OR IGNORE (Option B)**

Why? Because templates are **critical system infrastructure**. If a template is accidentally deleted or corrupted, the app won't function correctly. The INSERT OR IGNORE pattern ensures that every app startup validates that all 3 system templates exist, and automatically restores any that are missing. This is worth the tiny performance cost.

Additionally, the `templates` table has `id TEXT PRIMARY KEY` (line 292), which makes INSERT OR IGNORE natural - duplicate `id` values will be silently ignored.

### Implementation Location and Code Structure

**Where to add the function:**

The `seedTemplates()` function should be added in `lib/db.ts` after the existing seeding functions, around line 116-117 (after `seedAIFeatureSettings()` closes).

**Function structure:**

```typescript
function seedTemplates() {
  const now = Date.now()

  // Template 1: Task
  const taskMarkdown = `# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes
`

  const taskFieldConfig = JSON.stringify({
    fields: {
      Status: { type: "select", options: ["Not Started", "In Progress", "Completed"], required: true },
      Priority: { type: "select", options: ["Low", "Medium", "High", "Urgent"], required: true },
      "Due Date": { type: "date", required: false }
    },
    sections: {
      Description: { type: "textarea", required: false },
      Subtasks: { type: "checklist", required: false },
      Notes: { type: "textarea", required: false }
    }
  })

  // Template 2: Note-Generic
  const noteGenericMarkdown = `# {title}

## Content


## Tags
`

  const noteGenericFieldConfig = JSON.stringify({
    sections: {
      Content: { type: "textarea", required: true },
      Tags: { type: "taglist", required: false }
    }
  })

  // Template 3: Note-YouTube
  const noteYoutubeMarkdown = `# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes
`

  const noteYoutubeFieldConfig = JSON.stringify({
    fields: {
      URL: { type: "url", required: true, validation: "youtube" },
      Duration: { type: "text", required: false },
      Status: { type: "select", options: ["Not Watched", "In Progress", "Completed"], required: true }
    },
    sections: {
      "Key Concepts": { type: "bulletlist", required: false },
      Timestamps: { type: "timestamplist", required: false },
      "AI Summary": { type: "textarea", readonly: true, required: false },
      "My Notes": { type: "textarea", required: false }
    }
  })

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO templates (id, name, entity_type, subtype, markdown_template, field_config, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insert.run('task', 'Task', 'task', null, taskMarkdown, taskFieldConfig, 1, now, now)
    insert.run('note-generic', 'Generic Note', 'note', 'generic', noteGenericMarkdown, noteGenericFieldConfig, 1, now, now)
    insert.run('note-youtube', 'YouTube Learning Note', 'note', 'youtube', noteYoutubeMarkdown, noteYoutubeFieldConfig, 1, now, now)

    console.log('Seeded system templates')
  } catch (error) {
    console.warn('Failed to seed templates:', error)
    // Don't throw - let app continue
  }
}
```

**Where to call the function:**

Add the call in the `initializeDatabase()` function after line 408, alongside the other seeding calls:

```typescript
// Seed default data
seedDefaultTags()
seedAIFeatureSettings()
seedTemplates() // ADD THIS LINE
```

This ensures templates are seeded every time the database is initialized, after all tables have been created.

### Data Validation and Error Handling

**Validation concerns:**

1. **Template IDs must be unique**: Handled by PRIMARY KEY constraint + INSERT OR IGNORE
2. **field_config must be valid JSON**: Ensured by using JSON.stringify() on well-formed objects
3. **Required fields must not be NULL**: All fields are provided in the INSERT statement
4. **Timestamps must be valid integers**: Date.now() returns milliseconds since epoch (integer)

**Error handling strategy:**

Following the existing pattern in `seedDefaultTags()` and `seedAIFeatureSettings()`, the function wraps the seeding logic in a try-catch that logs warnings but doesn't throw. This is because:

1. Template seeding is important but shouldn't crash the app at startup
2. If seeding fails, the error will surface when users try to create entities (API routes will fail to find templates)
3. Startup time is critical - we don't want to block the server from starting

However, in practice, seeding should never fail if:
- The templates table was created successfully (Task 1.1)
- The SQL syntax is correct
- The JSON.stringify() calls succeed (they will, with well-formed objects)

### Testing and Verification Strategy

After implementing the seeding function, verify it works by:

**1. Check that 3 templates exist:**

```sql
SELECT COUNT(*) FROM templates;
-- Expected: 3
```

**2. Verify template IDs:**

```sql
SELECT id, name, entity_type, subtype FROM templates ORDER BY id;
-- Expected:
-- note-generic | Generic Note | note | generic
-- note-youtube | YouTube Learning Note | note | youtube
-- task | Task | task | NULL
```

**3. Verify field_config is valid JSON:**

```sql
SELECT id, json_valid(field_config) FROM templates;
-- Expected: All rows return 1 (valid JSON)
```

**4. Test idempotency:**

Restart the dev server 2-3 times. Check the console logs for "Seeded system templates" - it should appear each time, but the COUNT(*) should remain 3 (no duplicates).

**5. Inspect a full template:**

```sql
SELECT * FROM templates WHERE id = 'task';
```

Verify the markdown_template contains the expected template structure with placeholders and the field_config contains the full configuration object.

### Integration Points and Dependencies

**What depends on this task succeeding:**

- **Phase 2 (Markdown Parser)**: The parser will query templates by ID to know what fields/sections to extract
- **Phase 3 (Task Conversion)**: Task creation will require the 'task' template to exist
- **Phase 4 (Note Conversion)**: Note creation will require 'note-generic' template
- **Phase 5 (YouTube Notes)**: YouTube note creation requires 'note-youtube' template
- **Phase 6 (AI Integration)**: AI will suggest template IDs that must exist in the database

If templates don't exist, all these subsequent phases will fail with database query errors.

**What this task depends on:**

- **Task 1.1 (Database Migration)**: The `templates` table must exist before seeding
- Specifically, the CREATE TABLE statement at lines 289-302 of lib/db.ts must have run successfully

**No external dependencies:**

- No new npm packages required
- No API changes needed
- No TypeScript type definitions needed yet (those come in Task 1.3)

### Files and Code Locations Reference

**Primary file:** `/home/mmariani/Projects/idealisted/lib/db.ts`

**Key line numbers:**
- Lines 20-80: `seedDefaultTags()` - reference pattern for count-based idempotency
- Lines 82-116: `seedAIFeatureSettings()` - reference pattern for INSERT OR IGNORE
- Lines 289-302: `templates` table creation (from Task 1.1)
- Line 408: Where seeding functions are called in `initializeDatabase()`
- Line 116-117: Where to insert the new `seedTemplates()` function

**Reference documents:**
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md` lines 343-436: Full template specifications
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_TASKS.md` lines 24-47: Task 1.1 context (database migration)

**Related files (for context, not modified in this task):**
- `/home/mmariani/Projects/idealisted/types/index.ts` - Will need Template type in Task 1.3
- `/home/mmariani/Projects/idealisted/app/api/items/route.ts` - Shows JSON field handling pattern

### Technical Reference: Complete Implementation

**Function to add at line 117 of lib/db.ts:**

```typescript
function seedTemplates() {
  const now = Date.now()

  // Template 1: Task
  const taskMarkdown = `# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes
`

  const taskFieldConfig = JSON.stringify({
    fields: {
      Status: { type: "select", options: ["Not Started", "In Progress", "Completed"], required: true },
      Priority: { type: "select", options: ["Low", "Medium", "High", "Urgent"], required: true },
      "Due Date": { type: "date", required: false }
    },
    sections: {
      Description: { type: "textarea", required: false },
      Subtasks: { type: "checklist", required: false },
      Notes: { type: "textarea", required: false }
    }
  })

  // Template 2: Note-Generic
  const noteGenericMarkdown = `# {title}

## Content


## Tags
`

  const noteGenericFieldConfig = JSON.stringify({
    sections: {
      Content: { type: "textarea", required: true },
      Tags: { type: "taglist", required: false }
    }
  })

  // Template 3: Note-YouTube
  const noteYoutubeMarkdown = `# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes
`

  const noteYoutubeFieldConfig = JSON.stringify({
    fields: {
      URL: { type: "url", required: true, validation: "youtube" },
      Duration: { type: "text", required: false },
      Status: { type: "select", options: ["Not Watched", "In Progress", "Completed"], required: true }
    },
    sections: {
      "Key Concepts": { type: "bulletlist", required: false },
      Timestamps: { type: "timestamplist", required: false },
      "AI Summary": { type: "textarea", readonly: true, required: false },
      "My Notes": { type: "textarea", required: false }
    }
  })

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO templates (id, name, entity_type, subtype, markdown_template, field_config, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insert.run('task', 'Task', 'task', null, taskMarkdown, taskFieldConfig, 1, now, now)
    insert.run('note-generic', 'Generic Note', 'note', 'generic', noteGenericMarkdown, noteGenericFieldConfig, 1, now, now)
    insert.run('note-youtube', 'YouTube Learning Note', 'note', 'youtube', noteYoutubeMarkdown, noteYoutubeFieldConfig, 1, now, now)

    console.log('Seeded system templates')
  } catch (error) {
    console.warn('Failed to seed templates:', error)
    // Don't throw - let app continue
  }
}
```

**Function call to add after line 408:**

```typescript
// Seed default data
seedDefaultTags()
seedAIFeatureSettings()
seedTemplates() // ADD THIS
```

---

### Task 1.3: TypeScript Type Definitions
**Objective**: Define types for new system

**Deliverables**:
```typescript
interface Template {
  id: string
  name: string
  entity_type: 'task' | 'note' | 'project' | 'list'
  subtype: string | null
  markdown_template: string
  field_config: FieldConfig
  is_system: boolean
  created_at: number
  updated_at: number
}

interface FieldConfig {
  fields?: Record<string, FieldDef>
  sections?: Record<string, SectionDef>
}

interface FieldDef {
  type: 'text' | 'date' | 'select' | 'url' | 'checkbox'
  required: boolean
  options?: string[] // for select type
  validation?: string // regex or special validator name
  readonly?: boolean
}

interface SectionDef {
  type: 'textarea' | 'bulletlist' | 'checklist' | 'timestamplist' | 'taglist'
  required: boolean
  readonly?: boolean
}

interface ParsedEntity {
  title: string
  fields: Record<string, string>
  sections: Record<string, string>
  raw: string // original markdown
}
```

**Files to Modify**:
- `types/index.ts` - Add new interfaces

**Success Criteria**:
- Types compile without errors
- Exported from types/index.ts
- Used in lib/db.ts

---

## Context Manifest

### How the TypeScript Type System Currently Works

The IdeaListed application uses a comprehensive TypeScript type system defined in `/home/mmariani/Projects/idealisted/types/index.ts`. This file serves as the **single source of truth** for all data structures used throughout the application - from database models to API request/response contracts. Understanding the existing patterns is crucial for adding the new markdown entity types in a way that's consistent with the codebase architecture.

#### Type Architecture Overview

The type system follows a **layered architecture** with three distinct type categories:

**Layer 1: Database Row Types (Direct SQLite Mapping)**

These interfaces represent the raw data structures as they exist in SQLite database tables. Every field in these interfaces corresponds 1:1 with a column in the database. Examples:

- `Item` (lines 1-40): Base entity interface matching the `items` table
- `Task` (lines 81-92): Task-specific fields matching the `tasks` table
- `Note` (lines 94-102): Note-specific fields matching the `notes` table
- `Tag` (lines 42-51): Tag metadata matching the `tags` table

**Key Pattern**: Database booleans are typed as `boolean` in TypeScript but stored as `INTEGER` (0 or 1) in SQLite. The conversion happens at the database boundary (see app/api/items/route.ts lines 61-64 for reading, lines 183 for writing).

**Layer 2: Combined/Enriched Types (API Response Models)**

These interfaces extend the base database types with relationships and computed data:

- `ItemWithRelations` (lines 201-215): Extends `Item` with nested entity objects (todo, task, note, list, project)
- `PlanWithTodos` (lines 217-219): Extends `Plan` with nested todo items

**Purpose**: These types represent data as it flows through the API layer and React components. They're richer than database rows because they include joined data from related tables.

**Layer 3: API Contract Types (Request/Response Payloads)**

These interfaces define the shape of data sent to and received from API endpoints:

- `CreateItemRequest` (lines 222-232): POST /api/items payload structure
- `UpdateItemRequest` (lines 234-240): PUT /api/items/[id] payload structure
- `AIRequest` (lines 242-247): AI service request structure
- `AIResponse` (lines 249-256): AI service response structure

**Pattern**: These use TypeScript utility types like `Omit` to derive request types from database types while excluding auto-generated fields (id, created_at).

#### Critical Pattern: JSON Field Handling

The SQLite database stores complex data structures as **TEXT columns containing JSON strings**. The type system handles this with a two-stage pattern:

**In Database Schema (lib/db.ts)**:
```sql
CREATE TABLE items (
  metadata TEXT,        -- JSON for additional data
  tags TEXT,           -- JSON array of tags
  ai_suggestion TEXT   -- Parse + Convert: stored AI suggestion JSON
)
```

**In TypeScript Types (types/index.ts)**:
```typescript
export interface Item {
  metadata?: Record<string, any>  // Parsed from JSON string
  tags?: string[]                 // Parsed from JSON array string
  ai_suggestion?: AISuggestion    // Parsed from JSON object string
}
```

**At the API Boundary (app/api/items/route.ts)**:

When **writing** to the database (line 172-173):
```typescript
const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null
const tagsJson = body.tags ? JSON.stringify(body.tags) : null
insertItem.run(id, type, text, now, now, metadataJson, tagsJson, ...)
```

When **reading** from the database (lines 59-64):
```typescript
const item: ItemWithRelations = {
  // ... other fields ...
  metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  tags: row.tags ? JSON.parse(row.tags) : [],
  ai_suggestion: row.ai_suggestion ? JSON.parse(row.ai_suggestion) : undefined
}
```

**This exact pattern must be followed for the new `field_config` column in the templates table.**

#### Existing Entity Type Patterns

Each entity type (Todo, Task, Note, List, Project) follows a consistent structure:

**Common Patterns Across All Entity Types**:

1. **Primary Key + Foreign Key**: Every entity has an `id` (primary key) and `item_id` (foreign key to items table)
2. **Optional Fields**: Most fields are optional (`?`) because they might not be provided during creation
3. **Type-Specific Data**: Each entity stores specialized fields (e.g., tasks have `status`, notes have `subtype`)

**Example: Task Interface (lines 81-92)**:
```typescript
export interface Task {
  id: string                        // Primary key
  item_id: string                   // Foreign key to items table
  status: 'pending' | 'in-progress' | 'completed'  // Literal union type
  priority: number                  // Integer 1-5
  tags?: string[]                   // Optional, parsed from JSON
  estimated_time?: number           // Optional timestamp
  project_id?: string               // Optional foreign key to projects
  due_date?: number                 // Optional timestamp
  reminder_datetime?: number        // Added in Task 1.3 (reminder feature)
  last_notified_at?: number         // Added in Task 1.3 (reminder feature)
}
```

**Pattern Observations**:
- Enum-like values use **literal union types** (`'pending' | 'in-progress' | 'completed'`)
- Timestamps are **number** type (milliseconds since epoch from `Date.now()`)
- Arrays (tags) are typed as `string[]` even though stored as JSON TEXT
- Recently added fields (`reminder_datetime`, `last_notified_at`) demonstrate the incremental evolution pattern

**Example: Note Interface (lines 94-102)**:
```typescript
export interface Note {
  id: string
  item_id: string
  subtype: 'general' | 'research' | 'video' | 'link' | 'file' | 'contact' | 'meeting'
  content?: string                  // Optional markdown/text content
  url?: string                      // Optional URL for link/video notes
  media_type?: string               // Optional media type identifier
  frontmatter?: string              // YAML frontmatter as JSON string
}
```

**Key Insight**: The `frontmatter` field (line 101) is a **JSON string** in the database but typed as `string` (not parsed). This is different from the `metadata` pattern. The comment explicitly says "YAML frontmatter as JSON string", meaning YAML is converted to JSON, then stringified. This shows there are different strategies for complex data depending on use case.

#### The Item Interface and Entity Type Polymorphism

The `Item` interface (lines 1-40) is the **central polymorphic type** that all entities share. It's designed to support **Parse + Convert workflow** (lines 9-12):

```typescript
export interface Item {
  id: string
  type: 'idea' | 'note' | 'task' | 'project' | 'list'  // Determines entity subtype
  text: string                                          // Main content/title
  created_at: number
  updated_at?: number
  archived?: boolean
  tags?: string[]
  // Parse + Convert workflow fields
  parsed?: boolean              // Stage 2: Has been categorized
  entity_type?: 'task' | 'note' | 'list' | 'project'  // Suggested type after parsing
  ai_suggestion?: AISuggestion  // Stored AI suggestion for later conversion
  // Embedded entity data (deprecated pattern, kept for backward compatibility)
  note?: { /* ... */ }          // Lines 13-20: Legacy note embedding
  task?: { /* ... */ }          // Lines 21-28: Legacy task embedding
  project?: { /* ... */ }       // Lines 29-34: Legacy project embedding
  list?: { /* ... */ }          // Lines 35-39: Legacy list embedding
}
```

**Critical Pattern**: The `type` field determines which specialized table contains additional data. The embedded entity objects (note, task, project, list) are **legacy patterns** kept for backward compatibility but **new code should NOT use this pattern**. Instead, entity data lives in separate tables (tasks, notes, projects, lists) and is joined via `ItemWithRelations` (lines 201-215).

#### Configuration Type Patterns

The application has several configuration interfaces showing how settings are structured:

**AIConfig (lines 155-164)**: AI service configuration with multiple fields
```typescript
export interface AIConfig {
  enabled: boolean              // Master toggle for AI features
  openrouterApiKey: string      // API key for OpenRouter
  freeModel: string             // Default free model identifier
  paidModel: string             // Paid model identifier
  usePaidModel: boolean         // Toggle between free/paid
  systemPrompt: string          // Custom system prompt
  temperature: number           // AI temperature parameter (0-1)
  maxTokens: number             // Max response tokens
}
```

**Pattern**: Configuration objects use descriptive field names, primitive types, and include comments explaining each field's purpose.

**AIFeatureSetting (lines 166-170)**: Individual feature toggles stored in database
```typescript
export interface AIFeatureSetting {
  feature_name: string          // Primary key in database
  enabled: number               // SQLite boolean (0 or 1) - NOT boolean type
  description: string           // Human-readable feature description
}
```

**Key Difference**: This type uses `enabled: number` (not `boolean`) because it's read directly from SQLite without transformation. This is an exception to the usual pattern where API layer converts integers to booleans.

**ReminderConfig (lines 188-198)**: Nested configuration structure
```typescript
export interface ReminderConfig {
  enabled: boolean
  quietHours: {                 // Nested object for grouped settings
    enabled: boolean
    start: string               // HH:mm format (e.g., "22:00")
    end: string                 // HH:mm format (e.g., "08:00")
  }
  defaultTiming: 'morning_of' | '1_hour_before' | '1_day_before' | 'custom'
  customMinutesBefore?: number  // Conditional field based on defaultTiming
  priorityFilter: number[]      // Array of priority levels (1-5)
}
```

**Pattern Insights**:
- Nested objects allowed for logically grouped settings
- String formats documented in comments (HH:mm)
- Literal union types for predefined options
- Conditional optional fields (`customMinutesBefore` only used if `defaultTiming` is 'custom')

### What Task 1.3 Needs to Accomplish

This task defines the **TypeScript type system for the markdown entity feature**. These types will be used across the entire implementation (Phases 2-8) for type safety, autocomplete, and documentation. The types must align perfectly with:

1. The database schema created in Task 1.1
2. The template data seeded in Task 1.2
3. The parser to be built in Phase 2
4. The API modifications in Phases 3-6
5. The UI components in Phase 7

#### The Template Interface

This interface represents a row from the `templates` table (lib/db.ts lines 389-401):

**Database Schema Reference**:
```sql
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,              -- 'task', 'note-generic', 'note-youtube'
  name TEXT NOT NULL,               -- Display name
  entity_type TEXT NOT NULL,        -- 'task', 'note', 'project', 'list'
  subtype TEXT,                     -- NULL for task, 'generic'/'youtube' for notes
  markdown_template TEXT NOT NULL,  -- Template content with {placeholders}
  field_config TEXT NOT NULL,       -- JSON: field types and validation rules
  is_system INTEGER DEFAULT 1,      -- 1 = system template, 0 = user template
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

**Required TypeScript Interface**:
```typescript
export interface Template {
  id: string                        // Primary key: 'task', 'note-generic', 'note-youtube'
  name: string                      // Display name: 'Task', 'Generic Note', etc.
  entity_type: 'task' | 'note' | 'project' | 'list'  // Literal union type
  subtype: string | null            // NULL for tasks, 'generic'/'youtube' for notes
  markdown_template: string         // Template with {title} placeholders
  field_config: FieldConfig         // PARSED from JSON string (important!)
  is_system: boolean                // Converted from INTEGER (0/1) to boolean
  created_at: number                // Timestamp in milliseconds
  updated_at: number                // Timestamp in milliseconds
}
```

**Critical Implementation Details**:

1. **field_config Type Transformation**: In the database, this is `TEXT NOT NULL` containing a JSON string. In TypeScript, it's typed as `FieldConfig` (a parsed object). The API layer will need to handle JSON.parse/stringify just like the `metadata` field pattern.

2. **is_system Boolean Conversion**: Database stores INTEGER (1 or 0), TypeScript uses boolean. This follows the same pattern as `Item.archived` (lines 7, 61).

3. **entity_type Constraint**: The literal union type `'task' | 'note' | 'project' | 'list'` matches the database CHECK constraint and provides autocomplete in the IDE.

4. **subtype Flexibility**: Typed as `string | null` (not a union of subtypes) because future templates may add new subtypes dynamically. The database doesn't have a CHECK constraint here either.

#### The FieldConfig Interface

This is the **core configuration structure** that defines how templates work. It's stored as JSON in the database but used as a structured object in TypeScript:

**Structure from Seeded Templates** (lib/db.ts lines 138-149, 160-165, 186-198):

```typescript
export interface FieldConfig {
  fields?: Record<string, FieldDef>      // Optional: Not all templates have fields
  sections?: Record<string, SectionDef>  // Optional: But all templates have sections
}
```

**Why Both Optional?**
- Task template has **both** fields (Status, Priority, Due Date) and sections (Description, Subtasks, Notes)
- Note-Generic template has **only** sections (Content, Tags) - no fields
- This flexibility allows simple templates (just content) and complex templates (many fields + sections)

**Record<string, T> Pattern**: This TypeScript utility type means "an object where keys are strings and values are of type T". It's used instead of defining explicit properties because template field names are dynamic (e.g., "Status", "Priority", "Due Date" are keys in the task template's fields object).

#### The FieldDef Interface

Defines **inline fields** (the `**Label**: value` patterns in markdown):

**Based on Seeded Field Configurations**:

Task template fields (lib/db.ts lines 139-143):
```json
{
  "Status": { "type": "select", "options": ["Not Started", "In Progress", "Completed"], "required": true },
  "Priority": { "type": "select", "options": ["Low", "Medium", "High", "Urgent"], "required": true },
  "Due Date": { "type": "date", "required": false }
}
```

YouTube note fields (lib/db.ts lines 187-191):
```json
{
  "URL": { "type": "url", "required": true, "validation": "youtube" },
  "Duration": { "type": "text", "required": false },
  "Status": { "type": "select", "options": ["Not Watched", "In Progress", "Completed"], "required": true }
}
```

**Required TypeScript Interface**:
```typescript
export interface FieldDef {
  type: 'text' | 'date' | 'select' | 'url' | 'checkbox'  // Field type determines editor component
  required: boolean                 // Validation: must be present
  options?: string[]                // For 'select' type: dropdown options
  validation?: string               // Special validators: 'youtube', or regex pattern
  readonly?: boolean                // For future use (AI Summary is readonly)
}
```

**Field Type Mapping** (from plan lines 366-376):
- `text`: Simple text input (Duration)
- `date`: Date picker (Due Date) - expects YYYY-MM-DD format
- `select`: Dropdown with predefined options (Status, Priority)
- `url`: URL input with validation (URL field in YouTube notes)
- `checkbox`: Boolean field (not used in initial templates but included for future)

**Optional Fields Explained**:
- `options`: Only present for `select` type fields
- `validation`: Only present for fields requiring special validation (e.g., YouTube URL must match youtube.com or youtu.be)
- `readonly`: Only used for AI Summary section in YouTube notes (line 195: `readonly: true`)

#### The SectionDef Interface

Defines **section blocks** (the `## Section Name` patterns in markdown):

**Based on Seeded Section Configurations**:

Task sections (lib/db.ts lines 144-148):
```json
{
  "Description": { "type": "textarea", "required": false },
  "Subtasks": { "type": "checklist", "required": false },
  "Notes": { "type": "textarea", "required": false }
}
```

YouTube note sections (lib/db.ts lines 192-197):
```json
{
  "Key Concepts": { "type": "bulletlist", "required": false },
  "Timestamps": { "type": "timestamplist", "required": false },
  "AI Summary": { "type": "textarea", "readonly": true, "required": false },
  "My Notes": { "type": "textarea", "required": false }
}
```

**Required TypeScript Interface**:
```typescript
export interface SectionDef {
  type: 'textarea' | 'bulletlist' | 'checklist' | 'timestamplist' | 'taglist'
  required: boolean                 // Validation: must have content
  readonly?: boolean                // For AI-generated sections
}
```

**Section Type Mapping**:
- `textarea`: Free-form text editor (Description, Notes, AI Summary)
- `bulletlist`: Unordered list editor (Key Concepts)
- `checklist`: Checkable list with `- [ ]` markdown syntax (Subtasks)
- `timestamplist`: Special list for `[HH:MM] Description` entries (Timestamps in YouTube notes)
- `taglist`: Tag input component (Tags in Generic Note)

**Readonly Sections**: The AI Summary section in YouTube notes is `readonly: true`, meaning users can view it but not edit it (it's populated by AI). This pattern will be used in Phase 6.

#### The ParsedEntity Interface

This interface represents **the output of the markdown parser** (to be built in Phase 2). It's the in-memory representation of a markdown entity after parsing:

**Purpose**: Bridge between raw markdown string and structured data. The parser reads markdown, extracts fields/sections, and returns a ParsedEntity. The renderer takes a ParsedEntity and reconstructs markdown.

**Required Interface**:
```typescript
export interface ParsedEntity {
  title: string                     // Extracted from # {title} heading
  fields: Record<string, string>    // All **Field**: value pairs
  sections: Record<string, string>  // All ## Section content blocks
  raw: string                       // Original markdown (for debugging/reference)
}
```

**Example Usage** (from Phase 2 parser pseudocode, plan lines 441-471):

Input markdown:
```markdown
# Complete the markdown parser

**Status**: In Progress
**Priority**: High
**Due Date**: 2025-11-20

## Description
Build the parser library for extracting fields from markdown.

## Subtasks
- [x] Create parser file
- [ ] Implement field detection
- [ ] Write tests

## Notes
Remember to handle edge cases.
```

Parser output:
```typescript
{
  title: "Complete the markdown parser",
  fields: {
    "Status": "In Progress",
    "Priority": "High",
    "Due Date": "2025-11-20"
  },
  sections: {
    "Description": "Build the parser library for extracting fields from markdown.",
    "Subtasks": "- [x] Create parser file\n- [ ] Implement field detection\n- [ ] Write tests",
    "Notes": "Remember to handle edge cases."
  },
  raw: "# Complete the markdown parser\n\n**Status**: In Progress\n..." // Full original markdown
}
```

**Why All Values Are Strings**:
- Fields are stored as strings even if they're dates ("2025-11-20") or selects ("In Progress") because parsing happens at a different layer
- Sections are strings containing the raw markdown content (preserves formatting like newlines, bullets)
- Type conversion (string to Date, etc.) happens when saving to the database or rendering in UI components

### Integration with Existing Types

The new markdown types need to integrate seamlessly with the existing type system:

#### Updates Needed to Item Interface

The `Item` interface (lines 1-40) needs to be extended with the new markdown fields:

**Current Item Interface** (relevant excerpt):
```typescript
export interface Item {
  id: string
  type: 'idea' | 'note' | 'task' | 'project' | 'list'
  text: string
  created_at: number
  updated_at?: number
  archived?: boolean
  tags?: string[]
  parsed?: boolean
  entity_type?: 'task' | 'note' | 'list' | 'project'
  ai_suggestion?: AISuggestion
  // ... embedded entity objects ...
}
```

**Required Additions** (add after line 12, before embedded entity objects):
```typescript
export interface Item {
  // ... existing fields ...
  ai_suggestion?: AISuggestion
  // Markdown entity support (added in Markdown Entity System implementation)
  markdown_content?: string         // Markdown content (NULL for legacy entities)
  template_id?: string              // Template reference (e.g., 'task', 'note-generic')
  // ... embedded entity objects ...
}
```

**Why Optional?**:
- These fields are NULL for all legacy entities (projects, lists, old tasks/notes)
- The detection pattern `if (item.markdown_content !== null)` determines whether to use markdown rendering or legacy rendering (plan line 72)

#### Updates to AISuggestion Interface

The AI system will need to suggest templates, so the `AISuggestion` interface (lines 53-69) should be extended:

**Current AISuggestion Interface**:
```typescript
export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  confidence: number
  processed_text: string
  tags: string[]
  additional_fields: {
    priority?: number
    due_date?: string
    category?: string
    estimated_time?: number
    deadline?: string
    status?: string
    list_name?: string
    list_items?: string[]
  }
  reasoning: string
}
```

**Required Additions** (Phase 6 enhancement, but define type now for forward compatibility):
```typescript
export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  suggested_template?: string       // NEW: Template ID (e.g., 'note-youtube', 'task')
  confidence: number
  processed_text: string
  tags: string[]
  additional_fields: {
    // ... existing fields ...
    list_items?: string[]
    markdown_sections?: Record<string, string>  // NEW: Pre-filled section content
  }
  reasoning: string
}
```

**Purpose**:
- `suggested_template`: AI detects YouTube URL → suggests 'note-youtube' template
- `markdown_sections`: AI can pre-populate sections (e.g., extract key concepts from YouTube description)

### Where to Add Types in types/index.ts

The file is organized logically, and new types should follow the existing structure:

**Current File Organization**:
1. Lines 1-40: Core entity types (Item)
2. Lines 42-51: Support types (Tag)
3. Lines 53-69: AI types (AISuggestion)
4. Lines 71-153: Entity-specific types (Todo, Task, Note, List, Project, Plan, Setting, RecurringRule)
5. Lines 155-198: Configuration types (AIConfig, AIFeatureSetting, NtfyConfig, AppearanceConfig, ReminderConfig)
6. Lines 201-219: Combined types (ItemWithRelations, PlanWithTodos)
7. Lines 222-256: API types (CreateItemRequest, UpdateItemRequest, AIRequest, AIResponse)

**Recommended Placement**:

1. **Template, FieldConfig, FieldDef, SectionDef** → Add after line 153 (after RecurringRule, before AIConfig)
   - Rationale: These are core data model types, similar to Note/Task/Project
   - They define table structures like the other entity types

2. **ParsedEntity** → Add after SectionDef (still in the same section)
   - Rationale: It's tightly coupled to Template/FieldConfig

3. **Item interface updates** → Modify lines 1-40 (add markdown_content and template_id fields)
   - Rationale: These are columns in the items table

4. **AISuggestion interface updates** → Modify lines 53-69 (add suggested_template and markdown_sections)
   - Rationale: Enhances existing AI type

**Insertion Point Example**:
```typescript
// Line 153: End of RecurringRule interface
}

// INSERT NEW MARKDOWN TYPES HERE (before AIConfig at line 155)
export interface Template {
  // ...
}

export interface FieldConfig {
  // ...
}

// ... etc.

// Line 155: AIConfig starts
export interface AIConfig {
```

### JSON Field Handling Pattern for field_config

The `field_config` column follows the same pattern as `metadata` and `tags` in the items table:

**Database Storage** (lib/db.ts line 396):
```sql
field_config TEXT NOT NULL,       -- JSON: field types and validation rules
```

**TypeScript Type** (in Template interface):
```typescript
field_config: FieldConfig         // Parsed object, not string
```

**API Layer Transformation** (to be implemented in Phase 2+):

When **reading** templates from database:
```typescript
const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as any
return {
  ...template,
  field_config: JSON.parse(template.field_config)  // String → Object
}
```

When **writing** templates to database (already done in seedTemplates, lib/db.ts lines 138-149):
```typescript
const taskFieldConfig = JSON.stringify({
  fields: { /* ... */ },
  sections: { /* ... */ }
})
insert.run('task', 'Task', 'task', null, taskMarkdown, taskFieldConfig, 1, now, now)
```

**Pattern Consistency**: This matches how `Item.metadata`, `Item.tags`, and `Item.ai_suggestion` are handled (see app/api/items/route.ts lines 59-64 for reading, lines 172-173 for writing).

### Type Safety and Validation

TypeScript provides compile-time type safety, but runtime validation is also needed:

**Compile-Time Safety** (what TypeScript provides):
- Autocomplete for field names
- Type checking for field values
- Catching typos and missing properties

**Runtime Validation** (to be implemented in Phase 2):
- Checking required fields are present
- Validating date formats (YYYY-MM-DD)
- Validating select options match allowed values
- Validating YouTube URLs

**Example Validation Function** (to be built in Phase 2):
```typescript
function validateParsedEntity(parsed: ParsedEntity, template: Template): ValidationResult {
  const errors: string[] = []

  // Check required fields
  for (const [fieldName, fieldDef] of Object.entries(template.field_config.fields || {})) {
    if (fieldDef.required && !parsed.fields[fieldName]) {
      errors.push(`Required field "${fieldName}" is missing`)
    }

    // Validate field types
    if (fieldDef.type === 'date' && parsed.fields[fieldName]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.fields[fieldName])) {
        errors.push(`Field "${fieldName}" must be in YYYY-MM-DD format`)
      }
    }

    // Validate select options
    if (fieldDef.type === 'select' && parsed.fields[fieldName]) {
      if (!fieldDef.options?.includes(parsed.fields[fieldName])) {
        errors.push(`Field "${fieldName}" must be one of: ${fieldDef.options?.join(', ')}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
```

### Files and Code Locations

**Primary File**: `/home/mmariani/Projects/idealisted/types/index.ts`

**Modification Points**:
- **Line 12** (after `ai_suggestion?: AISuggestion`): Add `markdown_content?: string` and `template_id?: string` to Item interface
- **Line 68** (after `additional_fields` object): Add `markdown_sections?: Record<string, string>` to additional_fields
- **Line 53** (after `suggested_type` line): Add `suggested_template?: string` to AISuggestion
- **Line 154** (after RecurringRule interface closes): Add all new interfaces (Template, FieldConfig, FieldDef, SectionDef, ParsedEntity)

**Reference Files** (for understanding context, not modified in this task):
- `/home/mmariani/Projects/idealisted/lib/db.ts` lines 389-401: Templates table schema
- `/home/mmariani/Projects/idealisted/lib/db.ts` lines 118-215: Seeded template data with field_config examples
- `/home/mmariani/Projects/idealisted/app/api/items/route.ts` lines 59-64, 172-173: JSON field handling pattern
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md` lines 344-436: Template specifications and field config examples

### Dependencies and Prerequisites

**What this task depends on**:
- Task 1.1 (Database Migration): The templates table must exist and the schema must be known
- Task 1.2 (Seed Initial Templates): The field_config JSON structure must be defined and seeded

**What depends on this task**:
- **Phase 2 (Markdown Parser)**: Parser functions use Template and ParsedEntity types
- **Phase 3-5 (Entity Conversion)**: API routes use Template type for querying templates
- **Phase 6 (AI Integration)**: Updated AISuggestion type used in AI responses
- **Phase 7 (UI Components)**: Editor components use FieldDef and SectionDef for rendering

**No external dependencies**:
- No new npm packages required
- Pure TypeScript type definitions

### Success Validation

After implementation, verify:

1. **Types compile without errors**:
   ```bash
   npm run build
   # Should complete without TypeScript errors
   ```

2. **Types are exported and importable**:
   ```typescript
   import { Template, FieldConfig, ParsedEntity } from '@/types'
   // Should autocomplete in IDE
   ```

3. **Template type matches database schema**:
   - Every field in Template interface corresponds to a column in templates table
   - Types align (string, number, boolean match TEXT, INTEGER conversions)

4. **FieldConfig structure matches seeded data**:
   - Parse the JSON from a seeded template and verify it matches FieldConfig type
   ```typescript
   const template = db.prepare('SELECT * FROM templates WHERE id = ?').get('task')
   const config: FieldConfig = JSON.parse(template.field_config)
   // Should compile and match structure
   ```

5. **API patterns are consistent**:
   - Template interface follows same boolean conversion pattern as Item (is_system)
   - field_config follows same JSON parsing pattern as metadata/tags
   - Optional fields use `?` syntax consistently

### Technical Reference: Complete Type Definitions

**Add these interfaces to types/index.ts after line 153**:

```typescript
// Markdown Entity System Types (added in Markdown Entity System implementation)

export interface Template {
  id: string
  name: string
  entity_type: 'task' | 'note' | 'project' | 'list'
  subtype: string | null
  markdown_template: string
  field_config: FieldConfig
  is_system: boolean
  created_at: number
  updated_at: number
}

export interface FieldConfig {
  fields?: Record<string, FieldDef>
  sections?: Record<string, SectionDef>
}

export interface FieldDef {
  type: 'text' | 'date' | 'select' | 'url' | 'checkbox'
  required: boolean
  options?: string[]
  validation?: string
  readonly?: boolean
}

export interface SectionDef {
  type: 'textarea' | 'bulletlist' | 'checklist' | 'timestamplist' | 'taglist'
  required: boolean
  readonly?: boolean
}

export interface ParsedEntity {
  title: string
  fields: Record<string, string>
  sections: Record<string, string>
  raw: string
}
```

**Modify Item interface (around line 12)**:

```typescript
export interface Item {
  id: string
  type: 'idea' | 'note' | 'task' | 'project' | 'list'
  text: string
  created_at: number
  updated_at?: number
  archived?: boolean
  tags?: string[]
  // Parse + Convert workflow fields
  parsed?: boolean
  entity_type?: 'task' | 'note' | 'list' | 'project'
  ai_suggestion?: AISuggestion
  // Markdown entity support (added in Markdown Entity System implementation)
  markdown_content?: string
  template_id?: string
  // ... rest of interface ...
}
```

**Modify AISuggestion interface (around line 53)**:

```typescript
export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  suggested_template?: string  // NEW: Template ID suggestion
  confidence: number
  processed_text: string
  tags: string[]
  additional_fields: {
    priority?: number
    due_date?: string
    category?: string
    estimated_time?: number
    deadline?: string
    status?: string
    list_name?: string
    list_items?: string[]
    markdown_sections?: Record<string, string>  // NEW: Pre-filled sections
  }
  reasoning: string
}
```

---

**Status**: ✅ COMPLETE
**Completed**: 2025-11-16
**Implementation**: `/home/mmariani/Projects/idealisted/types/index.ts` lines 9-10, 53-90, 92, 105
**Code Review**: ✅ APPROVED - Added Template, FieldConfig, ParsedEntity interfaces; updated Item and AISuggestion
**Verification**: TypeScript compilation successful, all types support 3 seeded templates

---

### Task 1.4: Migration Verification
**Objective**: Test that migration works correctly

**Deliverables**:
- Verify columns exist via SQL query
- Verify 3 templates seeded
- Test idempotency (run migration twice)
- Verify build succeeds

**Files to Test**:
- `lib/db.ts`

**Success Criteria**:
- `SELECT markdown_content, template_id FROM items` works
- `SELECT COUNT(*) FROM templates` returns 3
- Running migration twice doesn't error
- npm run build succeeds

---

**Status**: ✅ COMPLETE
**Completed**: 2025-11-16
**Implementation**: `/home/mmariani/Projects/idealisted/scripts/verify-phase1.js`
**Test Results**: 14/14 automated tests passed
**Verification**:
- ✅ Database schema correct (markdown_content, template_id, templates table, indexes)
- ✅ 3 templates seeded with valid JSON field_config
- ✅ Backward compatibility verified (legacy items work)
- ✅ TypeScript compilation successful
- ✅ Server starts and responds correctly
- ✅ Idempotency confirmed (template seeding safe across restarts)

**Phase 1 COMPLETE** - Ready for Phase 2 (Markdown Parser Library)

---

## Phase 2: Markdown Parser Library

### Task 2.1: Create Markdown Parser File
**Objective**: Set up parser library structure

**Deliverables**:
- Create `/lib/markdown-parser.ts`
- Export main functions (stubs for now)
- Import Template and ParsedEntity types

**Files to Create**:
- `lib/markdown-parser.ts`

**Function Stubs**:
```typescript
export function parseMarkdown(content: string, templateId: string): ParsedEntity
export function renderMarkdown(parsed: ParsedEntity): string
export function validateMarkdown(content: string, templateId: string): ValidationResult
export function getTemplate(templateId: string): Template | null
```

**Success Criteria**:
- File exists and compiles
- Exports defined
- Can be imported from other files

---

## Context Manifest

### How Parser Libraries Currently Work in IdeaListed

The IdeaListed codebase follows consistent patterns for library modules located in `/lib/`. These libraries provide reusable functionality across the application with clear separation of concerns. Understanding these patterns is critical for implementing the markdown parser library correctly.

#### Library File Structure Pattern

All library files in `/lib/` follow a similar architectural pattern:

**1. Database Library (`/lib/db.ts`)** - The Foundation Pattern

This is the most critical library as it demonstrates database interaction patterns that the markdown parser will need to follow. The database library structure:

- **Lines 1-17**: Module-level initialization (imports, path setup, database connection)
  - Creates database connection ONCE at module load time
  - Exports a singleton `db` instance
  - Enables WAL mode and foreign keys immediately

- **Lines 20-116**: Helper functions with clear single responsibilities
  - `seedDefaultTags()` - Demonstrates count-based idempotency pattern
  - `seedAIFeatureSettings()` - Demonstrates INSERT OR IGNORE pattern
  - Each function is self-contained with try-catch error handling that logs but doesn't throw

- **Lines 118-215**: Core seeding function for templates (added in Phase 1)
  - `seedTemplates()` - Seeds the 3 markdown templates (task, note-generic, note-youtube)
  - Uses INSERT OR IGNORE for idempotent seeding
  - Stores field_config as JSON stringified TEXT

- **Lines 218-509**: Main initialization function
  - `initializeDatabase()` - Creates all tables and runs seeders
  - Called ONCE at module load time (line 512)
  - Exports helper functions like `updateTagUsage()` at the bottom

**Key Pattern**: Module-level side effects (database initialization) happen on import, while exported functions provide the API.

**2. AI Service Library (`/lib/ai.ts`)** - The Class-Based Pattern

The AI service demonstrates a different pattern - a singleton service class:

- **Lines 1-3**: Type imports from centralized types file
- **Lines 4-292**: AIService class definition
  - Constructor initializes from database settings (lines 8-29)
  - Private methods for internal logic (lines 55-181)
  - Public API methods for external use (lines 183-291)
  - Error handling throws meaningful errors with context

- **Line 294**: Export singleton instance `export const aiService = new AIService()`
- **Line 295**: Also export class for type checking `export default aiService`

**Key Pattern**: Class-based singleton with async initialization, clear public/private separation, and comprehensive error messages.

**3. Theme Library (`/lib/themes.ts`)** - The Pure Functions Pattern

The simplest library pattern - stateless utility functions:

- **Lines 1-19**: TypeScript interface definitions
- **Lines 21-79**: Data structures (theme presets array)
- **Lines 81-100**: Pure utility functions
  - `applyTheme()` - Side effects (DOM manipulation, localStorage)
  - `getStoredTheme()` - Data retrieval
  - `getThemeById()` - Data lookup

**Key Pattern**: Export data structures and functions separately, no module-level initialization.

#### Which Pattern for Markdown Parser?

The markdown parser should follow a **hybrid approach**:

**Database Access Pattern** (like `db.ts`):
- Import `db` from `/lib/db` at the top
- Query templates table using prepared statements
- Cache loaded templates in module-level Map for performance

**Pure Function Pattern** (like `themes.ts`):
- Core parsing functions are stateless transformations
- Input markdown string → Output ParsedEntity object
- No side effects in parsing logic

**Error Handling Pattern** (like `ai.ts`):
- Throw meaningful errors with context
- Let calling code handle error display
- Use try-catch for database queries

### Template System Architecture (From Phase 1)

The markdown parser's primary job is to work with templates stored in the database. Here's how templates work:

#### Templates Table Schema

From `/lib/db.ts` lines 388-401, the templates table structure:

```sql
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,              -- 'task', 'note-generic', 'note-youtube'
  name TEXT NOT NULL,               -- 'Task', 'Generic Note', 'YouTube Learning Note'
  entity_type TEXT NOT NULL,        -- 'task', 'note', 'project', 'list'
  subtype TEXT,                     -- NULL for task, 'generic'/'youtube' for notes
  markdown_template TEXT NOT NULL,  -- Full markdown template with {title} placeholder
  field_config TEXT NOT NULL,       -- JSON string of FieldConfig
  is_system INTEGER DEFAULT 1,      -- 1 = system template, 0 = user (future)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

**Critical Understanding**: The `field_config` column stores a **JSON string** (not a JSON object) because SQLite only has TEXT type. This must be:
- Parsed with `JSON.parse()` when retrieved from database
- The result is a `FieldConfig` object with `fields` and `sections` properties

#### The 3 Seeded Templates

From `/lib/db.ts` lines 118-215, three templates are seeded:

**Template 1: Task (id='task')**

Markdown template:
```markdown
# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes
```

Field config (as JavaScript object before JSON.stringify):
```javascript
{
  fields: {
    Status: { type: "select", options: ["Not Started", "In Progress", "Completed"], required: true },
    Priority: { type: "select", options: ["Low", "Medium", "High", "Urgent"], required: true },
    "Due Date": { type: "date", required: false }
  },
  sections: {
    Description: { type: "textarea", required: false },
    Subtasks: { type: "checklist", required: false },
    Notes: { type: "textarea", required: false }
  }
}
```

**Template 2: Note-Generic (id='note-generic')**

Markdown template:
```markdown
# {title}

## Content


## Tags
```

Field config:
```javascript
{
  sections: {
    Content: { type: "textarea", required: true },
    Tags: { type: "taglist", required: false }
  }
}
```

Note: This template has NO `fields` property, only `sections`.

**Template 3: Note-YouTube (id='note-youtube')**

Markdown template:
```markdown
# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes
```

Field config:
```javascript
{
  fields: {
    URL: { type: "url", required: true, validation: "youtube" },
    Duration: { type: "text", required: false },
    Status: { type: "select", options: ["Not Watched", "In Progress", "Completed"], required: true }
  },
  sections: {
    "Key Concepts": { type: "bulletlist", required: false },
    Timestamps: { type: "timestamplist", required: false },
    "AI Summary": { type: "textarea", readonly: true, required: false },
    "My Notes": { type: "textarea", required: false }
  }
}
```

#### Template Detection Patterns (From Plan)

From `MARKDOWN_ENTITIES_PLAN.md` lines 94-99, the parser must recognize these markdown patterns:

**Field Pattern**: `**Label**: value`
- Regex: `/\*\*([^*]+)\*\*:\s*(.*)$/` on each line
- Captures the label (between **) and the value (after `: `)
- Example: `**Status**: In Progress` → field name = "Status", value = "In Progress"
- Example: `**Due Date**: 2025-11-20` → field name = "Due Date", value = "2025-11-20"

**Section Pattern**: `## SectionName\n...content...`
- Regex: `/## ([^\n]+)\n([\s\S]*?)(?=\n##|$)/`
- Captures section name and all content until next `##` or end of file
- Example:
  ```markdown
  ## Description
  This is the content
  Multiple lines allowed

  ## Notes
  More content
  ```
  Results in:
  - sections['Description'] = "This is the content\nMultiple lines allowed"
  - sections['Notes'] = "More content"

**Title Pattern**: `# {title}` or `# Actual Title`
- First line starting with `# `
- The `{title}` is a placeholder in the template
- In actual markdown, it's replaced with real text: `# My Task Name`

### TypeScript Type System (From Phase 1)

The parser MUST import and use these types from `/types/index.ts`:

#### Template Type (lines 55-65)

```typescript
export interface Template {
  id: string                    // 'task', 'note-generic', 'note-youtube'
  name: string                  // 'Task', 'Generic Note', etc.
  entity_type: 'task' | 'note' | 'project' | 'list'
  subtype: string | null        // 'generic', 'youtube', or null
  markdown_template: string     // Full template markdown
  field_config: string          // JSON string (must be parsed!)
  is_system: number             // SQLite boolean: 0 or 1
  created_at: number            // Unix timestamp
  updated_at: number            // Unix timestamp
}
```

**CRITICAL**: The `field_config` property is a STRING in the database, not an object. You must parse it to get a `FieldConfig` object.

#### FieldConfig Type (lines 81-84)

```typescript
export interface FieldConfig {
  fields?: Record<string, FieldDef>      // Optional - note-generic doesn't have fields
  sections?: Record<string, SectionDef>  // Optional - some templates might not have sections
}
```

**Why optional?** The note-generic template only has sections, no fields. Future templates might only have fields, no sections.

#### FieldDef Type (lines 68-73)

```typescript
export interface FieldDef {
  type: 'text' | 'date' | 'select' | 'url' | 'checkbox'
  options?: string[]       // For select fields: ["Low", "Medium", "High"]
  required: boolean        // Validation flag
  validation?: string      // e.g., 'youtube' for YouTube URL validation
  readonly?: boolean       // For AI-generated fields (future)
}
```

#### SectionDef Type (lines 75-79)

```typescript
export interface SectionDef {
  type: 'textarea' | 'bulletlist' | 'checklist' | 'timestamplist' | 'taglist'
  required: boolean
  readonly?: boolean
}
```

#### ParsedEntity Type (lines 86-91)

```typescript
export interface ParsedEntity {
  title: string                          // Extracted from # heading
  fields: Record<string, string>         // All **Field**: value pairs
  sections: Record<string, string>       // All ## Section content
  raw: string                            // Original markdown (for debugging)
}
```

**Key Design Decision**: All values are stored as strings in ParsedEntity. Type conversion (string → Date, string → number) happens at validation time, not parsing time. This keeps parsing simple and pure.

#### ValidationResult Type (MISSING - Must be defined!)

The plan mentions `validateMarkdown(content: string, templateId: string): ValidationResult` but this type doesn't exist yet in `/types/index.ts`. Task 2.1 should define it:

```typescript
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field?: string      // Field name if field error
  section?: string    // Section name if section error
  message: string     // Human-readable error
  code: string        // Error code for programmatic handling
}
```

### Parser Architecture Design (From Plan)

From `MARKDOWN_ENTITIES_PLAN.md` lines 86-106, the parser architecture:

#### Core Function Signatures

**1. parseMarkdown(content: string, templateId: string): ParsedEntity**

Purpose: Extract structured data from markdown string

Flow:
1. Load template from database using `getTemplate(templateId)`
2. Parse field_config JSON to get FieldConfig object
3. Extract title from first `# ` line
4. Extract all fields matching `**Label**: value` pattern
5. Extract all sections matching `## Section\ncontent` pattern
6. Return ParsedEntity with title, fields, sections, and raw markdown

Error handling:
- If template not found: throw Error('Template not found: {templateId}')
- If markdown invalid: return ParsedEntity with empty fields/sections (permissive parsing)
- Store original markdown in `raw` field for debugging

**2. renderMarkdown(parsed: ParsedEntity): string**

Purpose: Reconstruct markdown from ParsedEntity

Flow:
1. Start with title: `# ${parsed.title}\n\n`
2. Add all fields: `**${fieldName}**: ${fieldValue}\n` for each field
3. Add blank line between fields and sections
4. Add all sections: `## ${sectionName}\n${sectionContent}\n\n` for each section
5. Return complete markdown string

Order: Fields appear before sections (matches template structure)

**3. validateMarkdown(content: string, templateId: string): ValidationResult**

Purpose: Check if markdown meets template requirements

Flow:
1. Parse markdown using parseMarkdown()
2. Load template to get field_config
3. Check required fields exist and are non-empty
4. Check required sections exist and are non-empty
5. Validate field types:
   - date: matches YYYY-MM-DD format
   - select: value is in options array
   - url: is valid URL
   - url with validation='youtube': matches youtube.com or youtu.be
6. Return ValidationResult with errors array

**4. getTemplate(templateId: string): Template | null**

Purpose: Load template from database

Flow:
1. Query: `SELECT * FROM templates WHERE id = ?`
2. If not found: return null
3. If found: return Template object (field_config is still JSON string!)

Optimization opportunity: Cache templates in module-level Map for performance (future enhancement)

#### Pseudocode Example (From Plan lines 355-386)

The plan provides this pseudocode example showing the expected implementation approach:

```typescript
function parseMarkdown(content: string, templateId: string): ParsedEntity {
  const template = getTemplate(templateId)
  const lines = content.split('\n')

  const parsed: ParsedEntity = {
    title: extractTitle(lines), // First # heading
    fields: {},
    sections: {},
    raw: content
  }

  // Extract **Field**: value patterns
  for (const field of template.field_config.fields) {
    const regex = new RegExp(`\\*\\*${field}\\*\\*:\\s*(.*)`)
    const match = content.match(regex)
    if (match) {
      parsed.fields[field] = match[1].trim()
    }
  }

  // Extract ## Section content
  for (const section of template.field_config.sections) {
    const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n##|$)`)
    const match = content.match(regex)
    if (match) {
      parsed.sections[section] = match[1].trim()
    }
  }

  return parsed
}
```

**Important Notes**:
1. This pseudocode assumes `template.field_config` is already parsed (it's not - it's a JSON string!)
2. The regex patterns need escaping for special characters in field/section names
3. The loop syntax is conceptual - actual implementation needs null checks

### Integration Points with Existing Code

#### Database Access Pattern

The parser will query the database exactly like other API code does. From `/app/api/items/route.ts` lines 15-32, the pattern:

```typescript
// Import db at top
import { db } from '@/lib/db'

// Use prepared statements
const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId) as Template

// Parse JSON fields
if (template) {
  const fieldConfig: FieldConfig = JSON.parse(template.field_config)
}
```

**CRITICAL**: The `as Template` type assertion tells TypeScript what shape to expect, but at runtime `field_config` is still a string. You MUST parse it.

#### Better-sqlite3 Query Patterns

From `/lib/db.ts` examples:

**Single Row Query** (get):
```typescript
const row = db.prepare('SELECT * FROM table WHERE id = ?').get(id)
// Returns single object or undefined
```

**Multiple Rows Query** (all):
```typescript
const rows = db.prepare('SELECT * FROM table').all()
// Returns array of objects
```

**No Async/Await**: better-sqlite3 is synchronous. All queries are blocking but fast.

#### Error Handling Philosophy

From `/lib/ai.ts` lines 55-63:

```typescript
private getConfig(): AIConfig {
  if (!this.config) {
    throw new Error('AI not configured. Please set up your OpenRouter API key.')
  }
  if (!this.config.enabled) {
    throw new Error('AI features are disabled. Enable AI in settings to use this feature.')
  }
  return this.config
}
```

**Pattern**: Throw descriptive errors that tell users exactly what's wrong and how to fix it. Don't just throw generic errors.

For the parser:
- Template not found? `throw new Error(\`Template '${templateId}' not found. Available templates: task, note-generic, note-youtube\`)`
- Invalid field config JSON? `throw new Error(\`Template '${templateId}' has invalid field_config JSON: ${error.message}\`)`

### File Structure for Task 2.1

The initial file should be structured as:

```typescript
// 1. IMPORTS
import { db } from '@/lib/db'
import { Template, FieldConfig, ParsedEntity } from '@/types'

// 2. TYPE DEFINITIONS (ValidationResult - missing from types/index.ts)
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field?: string
  section?: string
  message: string
  code: string
}

// 3. HELPER FUNCTION - getTemplate
export function getTemplate(templateId: string): Template | null {
  // Query database, return Template or null
  // This is the ONLY function that touches the database
}

// 4. CORE FUNCTION STUBS - parseMarkdown
export function parseMarkdown(content: string, templateId: string): ParsedEntity {
  // TODO: Implement in Task 2.2
  throw new Error('Not implemented yet')
}

// 5. CORE FUNCTION STUBS - renderMarkdown
export function renderMarkdown(parsed: ParsedEntity): string {
  // TODO: Implement in Task 2.4
  throw new Error('Not implemented yet')
}

// 6. CORE FUNCTION STUBS - validateMarkdown
export function validateMarkdown(content: string, templateId: string): ValidationResult {
  // TODO: Implement in Task 2.5
  throw new Error('Not implemented yet')
}
```

**Why this order?**
1. Imports first (standard)
2. Type definitions (needed by functions)
3. Helper functions (getTemplate) before core functions (it's a dependency)
4. Core functions in order of implementation (Tasks 2.2, 2.4, 2.5)

### Task 2.1 Specific Implementation Requirements

**What to implement NOW (Task 2.1)**:
1. Create the file `/lib/markdown-parser.ts`
2. Add imports for db, Template, FieldConfig, ParsedEntity
3. Define ValidationResult and ValidationError types (export them!)
4. Implement getTemplate() function FULLY (this is the only complete function in Task 2.1)
5. Create STUB functions for parseMarkdown, renderMarkdown, validateMarkdown
   - Each stub should throw Error('Not implemented yet')
   - Include JSDoc comments explaining what they WILL do

**What NOT to implement yet**:
- Actual parsing logic (Task 2.2, 2.3)
- Markdown rendering logic (Task 2.4)
- Validation logic (Task 2.5)
- Template caching optimization (future enhancement)

### getTemplate() Implementation Details

This is the only function to implement completely in Task 2.1:

```typescript
/**
 * Loads a template from the database by ID
 * @param templateId - Template ID ('task', 'note-generic', 'note-youtube')
 * @returns Template object with parsed field_config, or null if not found
 * @throws Error if field_config JSON is invalid
 */
export function getTemplate(templateId: string): Template | null {
  try {
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId)

    if (!row) {
      return null
    }

    // Cast to Template type
    const template = row as Template

    // Validate that field_config can be parsed (don't parse yet, just validate)
    try {
      JSON.parse(template.field_config)
    } catch (error) {
      throw new Error(`Template '${templateId}' has invalid field_config JSON: ${error.message}`)
    }

    return template
  } catch (error) {
    if (error.message?.includes('invalid field_config')) {
      throw error // Re-throw our custom error
    }
    // Database errors
    throw new Error(`Failed to load template '${templateId}': ${error.message}`)
  }
}
```

**Why validate but not parse field_config here?**
- The Template type has `field_config: string` (the database schema)
- Parsing happens in parseMarkdown/validateMarkdown when needed
- Keeping it as a string preserves the database structure
- Validation ensures we fail fast on corrupted data

### Success Criteria Verification

After implementing Task 2.1, verify:

1. **File compiles**: `npm run build` succeeds with no TypeScript errors
2. **Exports work**: Can import functions in another file:
   ```typescript
   import { getTemplate, parseMarkdown } from '@/lib/markdown-parser'
   ```
3. **getTemplate works**: Can load all 3 templates:
   ```typescript
   const taskTemplate = getTemplate('task')
   console.log(taskTemplate.name) // 'Task'
   const config = JSON.parse(taskTemplate.field_config)
   console.log(config.fields.Status) // { type: 'select', ... }
   ```
4. **Stubs throw errors**: Calling unimplemented functions throws:
   ```typescript
   parseMarkdown('# Test', 'task') // throws Error('Not implemented yet')
   ```
5. **Types exported**: ValidationResult and ValidationError can be imported:
   ```typescript
   import { ValidationResult, ValidationError } from '@/lib/markdown-parser'
   ```

### Dependencies and Prerequisites

**External Dependencies**: None! All required packages already installed:
- `better-sqlite3` - Already in package.json
- TypeScript - Already configured

**Internal Dependencies**:
- Phase 1 must be complete (templates table exists with 3 seeded templates)
- `/types/index.ts` must have Template, FieldConfig, ParsedEntity types (already added in Phase 1 Task 1.3)

**No Breaking Changes**: This task creates a new file - it doesn't modify any existing code, so zero risk of breaking current functionality.

### What Task 2.2 Will Add

Next task (Field Detection) will replace the parseMarkdown stub with real implementation that:
1. Calls getTemplate() to load template
2. Parses field_config JSON to FieldConfig
3. Uses regex to find `**Label**: value` patterns
4. Populates parsed.fields object
5. Returns ParsedEntity

But for now (Task 2.1), we just need the structure in place.

---

### Task 2.2: Implement Field Detection
**Objective**: Parse **Field**: value patterns from markdown

**Deliverables**:
- Regex to match `**Label**: value` patterns
- Extract field name and value
- Store in ParsedEntity.fields object
- Handle multiline values (capture until next field or section)

**Files to Modify**:
- `lib/markdown-parser.ts` - Implement field detection in parseMarkdown()

**Test Cases**:
```markdown
**Status**: In Progress
**Due Date**: 2025-11-20
```
Should extract: `{ Status: "In Progress", Due Date: "2025-11-20" }`

**Success Criteria**:
- Can extract all field types
- Handles edge cases (missing value, special chars)
- Unit tests pass

---

## Context Manifest for Task 2.2: Field Detection

### How the Markdown Parser System Works

The markdown parsing system converts structured markdown content (using specific patterns defined by templates) into a ParsedEntity object with three main components:

1. **title**: Extracted from the first H1 heading (`# Title`)
2. **fields**: Key-value pairs from `**FieldName**: value` patterns
3. **sections**: Multi-line content blocks from `## SectionName` blocks

Task 2.2 focuses specifically on implementing the **field detection** portion of the parseMarkdown() function, which extracts `**FieldName**: value` patterns and populates the `fields` object.

#### Current State of markdown-parser.ts

The file `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts` was created in Task 2.1 and currently contains:

**Fully Implemented (lines 20-49)**:
```typescript
getTemplate(templateId: string): Template | null
```
- Loads template from database using prepared statement
- Validates that field_config JSON is parseable (but keeps as string)
- Returns Template object or null if not found
- Throws errors with clear messages for database failures or invalid JSON

**Stub Functions (need implementation)**:
- `parseMarkdown()` at line 66: Currently throws "Not yet implemented - Task 2.2"
- `renderMarkdown()` at line 86: Stub for future Task 2.4
- `validateMarkdown()` at line 106: Stub for future Task 2.5

The parseMarkdown() stub includes comprehensive JSDoc (lines 51-65) explaining what it WILL do when implemented.

#### How Templates Define Fields

Templates are stored in the `templates` table (seeded in Task 1.2 via `/home/mmariani/Projects/idealisted/lib/db.ts` lines 118-215). Each template contains:

- `markdown_template`: The markdown structure with placeholders
- `field_config`: A JSON string that when parsed becomes a FieldConfig object

The FieldConfig object has this structure (from `/home/mmariani/Projects/idealisted/types/index.ts` lines 81-84):

```typescript
export interface FieldConfig {
  fields?: Record<string, FieldDef>     // Optional - some templates have no fields
  sections?: Record<string, SectionDef>  // Optional - task 2.3 will handle this
}
```

Three templates are currently seeded in the database:

**1. Task Template** (db.ts lines 138-149):
```json
{
  "fields": {
    "Status": { "type": "select", "options": ["Not Started", "In Progress", "Completed"], "required": true },
    "Priority": { "type": "select", "options": ["Low", "Medium", "High", "Urgent"], "required": true },
    "Due Date": { "type": "date", "required": false }
  },
  "sections": {
    "Description": { "type": "textarea", "required": false },
    "Subtasks": { "type": "checklist", "required": false },
    "Notes": { "type": "textarea", "required": false }
  }
}
```

The corresponding markdown template (lines 122-136):
```markdown
# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes
```

**2. Note-Generic Template** (db.ts lines 160-165):
```json
{
  "sections": {
    "Content": { "type": "textarea", "required": true },
    "Tags": { "type": "taglist", "required": false }
  }
}
```

**CRITICAL**: This template has NO `fields` property - only `sections`. The parseMarkdown implementation must handle this case gracefully.

**3. Note-YouTube Template** (db.ts lines 186-198):
```json
{
  "fields": {
    "URL": { "type": "url", "required": true, "validation": "youtube" },
    "Duration": { "type": "text", "required": false },
    "Status": { "type": "select", "options": ["Not Watched", "In Progress", "Completed"], "required": true }
  },
  "sections": {
    "Key Concepts": { "type": "bulletlist", "required": false },
    "Timestamps": { "type": "timestamplist", "required": false },
    "AI Summary": { "type": "textarea", "readonly": true, "required": false },
    "My Notes": { "type": "textarea", "required": false }
  }
}
```

Corresponding markdown (lines 168-184):
```markdown
# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes
```

#### Field Detection Pattern Specification

From MARKDOWN_ENTITIES_PLAN.md (lines 438-471), the pseudocode shows the intended approach:

```typescript
// Extract **Field**: value patterns
for (const field of template.field_config.fields) {
  const regex = new RegExp(`\\*\\*${field}\\*\\*:\\s*(.*)`)
  const match = content.match(regex)
  if (match) {
    parsed.fields[field] = match[1].trim()
  }
}
```

**Pattern Breakdown:**
- `\\*\\*` - Two escaped asterisks (markdown bold syntax)
- `${field}` - The field name from template config (e.g., "Status", "Priority", "Due Date")
- `\\*\\*` - Two more escaped asterisks (close bold)
- `:` - Literal colon separator
- `\\s*` - Zero or more whitespace characters
- `(.*)` - Capture group: any characters to end of line

**Examples:**
- `**Status**: In Progress` → captures `"In Progress"`
- `**Due Date**: 2025-11-20` → captures `"2025-11-20"`
- `**Priority**:` → captures empty string `""`
- `**URL**: https://youtube.com/watch?v=abc` → captures full URL

### Implementation Requirements for Task 2.2

The parseMarkdown() function must be implemented with this complete logic:

**1. Load and validate template**:
```typescript
const template = getTemplate(templateId)
if (!template) {
  throw new Error(`Template '${templateId}' not found`)
}
```

**2. Parse field_config JSON**:
```typescript
let fieldConfig: FieldConfig
try {
  fieldConfig = JSON.parse(template.field_config)
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  throw new Error(`Failed to parse field_config for template '${templateId}': ${errorMessage}`)
}
```

**3. Initialize ParsedEntity with raw content**:
```typescript
const parsed: ParsedEntity = {
  title: '',
  fields: {},
  sections: {},
  raw: content
}
```

**4. Extract title from H1 heading**:
```typescript
const titleMatch = content.match(/^# (.+)$/m)
parsed.title = titleMatch ? titleMatch[1].trim() : ''
```

The regex breakdown:
- `/^# (.+)$/m` - Multiline mode (`m` flag)
- `^` - Start of line (in multiline mode, matches after newlines too)
- `# ` - Literal hash and space
- `(.+)` - Capture one or more characters (the title text)
- `$` - End of line
- `m` flag makes `^` and `$` match line boundaries, not just string boundaries

**5. Extract field values with proper escaping**:
```typescript
if (fieldConfig.fields) {
  for (const fieldName in fieldConfig.fields) {
    // Escape special regex characters in field name
    const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Match pattern: **FieldName**: value (rest of line)
    const regex = new RegExp(`\\*\\*${escapedFieldName}\\*\\*:\\s*(.*)`, 'm')
    const match = content.match(regex)

    if (match) {
      // Field found - capture value and trim whitespace
      parsed.fields[fieldName] = match[1].trim()
    } else {
      // Field not found in markdown - store empty string
      parsed.fields[fieldName] = ''
    }
  }
}
```

**Why escape field names?**
Field names like "Due Date" are safe, but if a field name contained regex special characters (like `[`, `(`, `.`, etc.), the regex would break. The escape pattern `[.*+?^${}()|[\]\\]` matches any regex metacharacter and prepends `\` to escape it.

**Why check `if (fieldConfig.fields)`?**
The note-generic template has NO fields property - only sections. Without this check, the code would throw a TypeError trying to iterate undefined.

**Why store empty string instead of undefined?**
Consistency. The ParsedEntity type defines `fields: Record<string, string>`, which expects string values. Empty string `''` is semantically correct for "field exists but has no value", while `undefined` would indicate "field doesn't exist".

**6. Leave sections empty for now**:
```typescript
// TODO (Task 2.3): Extract section content (## Section Name)
// For now, sections remain empty object {}

return parsed
```

Task 2.3 will implement section extraction, but for Task 2.2, `parsed.sections` stays as `{}`.

### Type Definitions Reference

From `/home/mmariani/Projects/idealisted/types/index.ts`:

**ParsedEntity** (lines 86-91):
```typescript
export interface ParsedEntity {
  title: string
  fields: Record<string, string>  // All values are strings
  sections: Record<string, string>
  raw: string  // Original markdown preserved for debugging
}
```

**FieldConfig** (lines 81-84):
```typescript
export interface FieldConfig {
  fields?: Record<string, FieldDef>   // Optional
  sections?: Record<string, SectionDef> // Optional
}
```

**FieldDef** (lines 67-73):
```typescript
export interface FieldDef {
  type: 'text' | 'date' | 'select' | 'url' | 'checkbox'
  options?: string[]  // For select fields
  required: boolean
  validation?: string // e.g., 'youtube' for URL validation
  readonly?: boolean  // For AI-generated fields
}
```

**Note**: Task 2.2 does NOT validate field types or requirements - it only extracts values as strings. Validation happens in Task 2.5.

### Edge Cases and Error Handling

**Edge Case 1: Template with no fields**
```markdown
# Meeting Notes

## Content
Discussed the quarterly roadmap
```

Template config: `{ "sections": { "Content": { ... } } }`

Expected behavior:
- Title: `"Meeting Notes"`
- Fields: `{}` (empty object - no fields to extract)
- Sections: `{}` (Task 2.3 not implemented yet)

**Edge Case 2: Empty field values**
```markdown
# Task Title

**Status**: In Progress
**Priority**:
**Due Date**:
```

Expected fields:
```typescript
{
  "Status": "In Progress",
  "Priority": "",
  "Due Date": ""
}
```

The regex `(.*)` captures empty string when there's no text after the colon. After `.trim()`, empty strings stay empty.

**Edge Case 3: Field name with spaces**
```markdown
**Due Date**: 2025-11-20
```

Field name: `"Due Date"` (contains space)

The regex escaping handles this correctly:
- Original: `"Due Date"`
- After escape: `"Due\\ Date"` (space doesn't need escaping, but other chars would)
- Regex matches: `**Due Date**: 2025-11-20`

**Edge Case 4: Field value with special characters**
```markdown
**URL**: https://youtube.com/watch?v=abc123&t=45s
```

The capture group `(.*)` captures ALL characters to end of line, including `&`, `=`, `?`, etc. No escaping needed on the value side.

**Edge Case 5: Missing field in markdown**
```markdown
# Task

**Status**: Not Started

## Description
```

Template expects: `Status`, `Priority`, `Due Date`

Expected fields:
```typescript
{
  "Status": "Not Started",
  "Priority": "",       // Missing - gets empty string
  "Due Date": ""        // Missing - gets empty string
}
```

The `if (match)` check handles this - when regex doesn't find the field, we explicitly set it to empty string in the else branch.

**Edge Case 6: Extra fields in markdown not in template**
```markdown
**Status**: Done
**Custom Field**: Some value
**Priority**: High
```

Template only defines: `Status`, `Priority`

Expected fields:
```typescript
{
  "Status": "Done",
  "Priority": "High"
  // "Custom Field" is ignored - not in template config
}
```

We only iterate through `fieldConfig.fields`, so extra fields in the markdown are simply not extracted.

**Edge Case 7: Template not found**
```typescript
parseMarkdown(content, 'invalid-template-id')
```

Expected behavior: Throws `Error("Template 'invalid-template-id' not found")`

The `getTemplate()` function returns `null`, which we check and throw a clear error message.

**Edge Case 8: Invalid field_config JSON in database**
This shouldn't happen (Task 1.2 validated all templates), but defensive programming:

```typescript
template.field_config = "{ invalid json"
```

Expected behavior: Throws `Error("Failed to parse field_config for template 'task': Unexpected token i...")`

### Test Cases with Expected Results

**Test 1: Task template with all fields populated**
```markdown
# Buy groceries

**Status**: In Progress
**Priority**: High
**Due Date**: 2025-11-20

## Description
Need milk and eggs

## Notes
Don't forget bananas
```

Expected ParsedEntity:
```typescript
{
  title: "Buy groceries",
  fields: {
    "Status": "In Progress",
    "Priority": "High",
    "Due Date": "2025-11-20"
  },
  sections: {},  // Task 2.3 not implemented
  raw: "# Buy groceries\n\n**Status**: In Progress..."
}
```

**Test 2: Task template with empty fields**
```markdown
# Empty task

**Status**: Not Started
**Priority**:
**Due Date**:

## Description
```

Expected fields:
```typescript
{
  "Status": "Not Started",
  "Priority": "",
  "Due Date": ""
}
```

**Test 3: YouTube note template**
```markdown
# TypeScript Tutorial

**URL**: https://youtube.com/watch?v=abc123
**Duration**: 45 minutes
**Status**: In Progress

## Key Concepts
Types, interfaces, generics
```

Expected fields:
```typescript
{
  "URL": "https://youtube.com/watch?v=abc123",
  "Duration": "45 minutes",
  "Status": "In Progress"
}
```

**Test 4: Note-generic template (no fields)**
```markdown
# Meeting notes 2025-11-16

## Content
Discussed Q1 roadmap and hiring plan
```

Expected:
```typescript
{
  title: "Meeting notes 2025-11-16",
  fields: {},  // No fields defined in template
  sections: {},  // Task 2.3 not implemented
  raw: "# Meeting notes..."
}
```

**Test 5: Missing title**
```markdown
**Status**: Done
**Priority**: Low
```

Expected:
```typescript
{
  title: "",  // No H1 heading found
  fields: { "Status": "Done", "Priority": "Low", "Due Date": "" },
  sections: {},
  raw: "**Status**: Done..."
}
```

### Complete Implementation Code

```typescript
/**
 * Parse markdown content into structured fields and sections
 *
 * Extracts:
 * - Title from first H1 heading (# Title)
 * - Field values from **FieldName**: value patterns
 * - Section content from ## SectionName blocks (Task 2.3)
 *
 * @param content - Raw markdown string
 * @param templateId - Template ID to use for parsing ('task', 'note-generic', 'note-youtube')
 * @returns Parsed entity with title, fields, sections, and raw markdown
 * @throws Error if template not found or field_config is invalid JSON
 */
export function parseMarkdown(content: string, templateId: string): ParsedEntity {
  // 1. Load template from database
  const template = getTemplate(templateId)
  if (!template) {
    throw new Error(`Template '${templateId}' not found`)
  }

  // 2. Parse field_config JSON to FieldConfig object
  let fieldConfig: FieldConfig
  try {
    fieldConfig = JSON.parse(template.field_config)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse field_config for template '${templateId}': ${errorMessage}`)
  }

  // 3. Initialize parsed entity with raw content
  const parsed: ParsedEntity = {
    title: '',
    fields: {},
    sections: {},
    raw: content
  }

  // 4. Extract title from first H1 heading (# Title)
  const titleMatch = content.match(/^# (.+)$/m)
  parsed.title = titleMatch ? titleMatch[1].trim() : ''

  // 5. Extract field values (**FieldName**: value)
  if (fieldConfig.fields) {
    for (const fieldName in fieldConfig.fields) {
      // Escape special regex characters in field name
      const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match pattern: **FieldName**: value (rest of line)
      const regex = new RegExp(`\\*\\*${escapedFieldName}\\*\\*:\\s*(.*)`, 'm')
      const match = content.match(regex)

      if (match) {
        // Field found - capture value and trim whitespace
        parsed.fields[fieldName] = match[1].trim()
      } else {
        // Field not found in markdown - store empty string
        parsed.fields[fieldName] = ''
      }
    }
  }

  // 6. TODO (Task 2.3): Extract section content (## Section Name)
  // For now, sections remain empty object {}

  return parsed
}
```

### What NOT to Implement

Task 2.2 scope is ONLY field detection. Do NOT implement:

- **Section extraction** (Task 2.3): `parsed.sections` stays `{}`
- **Validation** (Task 2.5): No checking of required fields, date formats, select options, etc.
- **Markdown reconstruction** (Task 2.4): renderMarkdown() stays as stub
- **Checkbox field parsing**: None of the 3 seeded templates use checkbox-type fields. The plan mentions `**Label**: [x]` patterns, but this can be deferred until a template actually needs it.
- **Multi-line field values**: The pattern `(.*)` captures to end of line only. Multi-line support would require more complex regex with `[\s\S]` and lookahead. Not needed for current templates.

### Files and Locations

**Primary Implementation File**:
- `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts`
  - Lines 66-68: Replace parseMarkdown() stub with full implementation

**Reference Files**:
- `/home/mmariani/Projects/idealisted/types/index.ts`
  - Lines 55-65: Template interface
  - Lines 67-73: FieldDef interface
  - Lines 81-84: FieldConfig interface
  - Lines 86-91: ParsedEntity interface
- `/home/mmariani/Projects/idealisted/lib/db.ts`
  - Lines 118-215: Template seeding (shows exact markdown and field_config structure)
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md`
  - Lines 438-471: Pseudocode specification

### Success Criteria Checklist

After implementing parseMarkdown() field detection:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Can extract title from H1 heading
- [ ] Can extract all 3 fields from task template markdown
- [ ] Can extract all 3 fields from YouTube note template markdown
- [ ] Handles note-generic template (no fields) without errors
- [ ] Empty field values stored as `""` not `null`/`undefined`
- [ ] Missing fields in markdown get `""` default
- [ ] Field names with spaces (like "Due Date") handled correctly
- [ ] sections object remains `{}` (not implemented yet)
- [ ] Template not found throws: `Error("Template 'xyz' not found")`
- [ ] Invalid field_config JSON throws clear error with template ID
- [ ] Can parse all test cases above with correct results

---

### Task 2.3: Implement Section Detection
**Objective**: Parse ## Section headers and content from markdown

**Deliverables**:
- Regex to match `## SectionName\n...content...` patterns
- Extract section name and content
- Stop at next ## or end of file
- Store in ParsedEntity.sections object

**Files to Modify**:
- `lib/markdown-parser.ts` - Implement section detection in parseMarkdown()

**Test Cases**:
```markdown
## Description
This is the description content.
It can span multiple lines.

## Notes
These are my notes.
```
Should extract:
```
{
  Description: "This is the description content.\nIt can span multiple lines.",
  Notes: "These are my notes."
}
```

**Success Criteria**:
- Extracts all sections correctly
- Preserves whitespace and newlines
- Handles empty sections
- Unit tests pass

---

**Status**: Not Started

---

## Context Manifest for Task 2.3: Section Detection

### How Section Extraction Works in the Markdown Parser

The markdown parsing system is building up a `ParsedEntity` object from structured markdown content. Task 2.2 implemented field detection (extracting `**FieldName**: value` patterns). Task 2.3 completes the parsing implementation by extracting section content from `## SectionName` blocks.

#### Current Parser State After Task 2.2

The `parseMarkdown()` function in `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts` (lines 66-122) currently:

1. **Loads the template** (line 68): Calls `getTemplate(templateId)` to fetch template from database
2. **Parses field_config** (lines 74-80): Converts JSON string to `FieldConfig` object
3. **Initializes ParsedEntity** (lines 83-88): Creates result object with empty title, fields, sections, and raw markdown
4. **Extracts title** (lines 91-94): Uses regex `/^#\s+(.+)$/m` to find first H1 heading
5. **Extracts fields** (lines 99-116): Iterates through `fieldConfig.fields`, using regex to find `**FieldName**: value` patterns
6. **Section extraction placeholder** (lines 118-119): Contains `// TODO: Implement section extraction in Task 2.3`

**What's Missing**: The sections object in the returned ParsedEntity is always empty (`{}`). Task 2.3 adds the logic to populate it.

#### Template Section Configurations

From the three seeded templates in `/home/mmariani/Projects/idealisted/lib/db.ts`:

**Task Template (lines 144-148)**: Has 3 sections
```json
{
  "Description": { "type": "textarea", "required": false },
  "Subtasks": { "type": "checklist", "required": false },
  "Notes": { "type": "textarea", "required": false }
}
```

Corresponding markdown (lines 127-135):
```markdown
## Description


## Subtasks
- [ ]


## Notes
```

**Note-Generic Template (lines 161-165)**: Has 2 sections
```json
{
  "Content": { "type": "textarea", "required": true },
  "Tags": { "type": "taglist", "required": false }
}
```

Corresponding markdown (lines 154-157):
```markdown
## Content


## Tags
```

**Note-YouTube Template (lines 192-197)**: Has 4 sections
```json
{
  "Key Concepts": { "type": "bulletlist", "required": false },
  "Timestamps": { "type": "timestamplist", "required": false },
  "AI Summary": { "type": "textarea", "readonly": true, "required": false },
  "My Notes": { "type": "textarea", "required": false }
}
```

Corresponding markdown (lines 174-183):
```markdown
## Key Concepts


## Timestamps


## AI Summary


## My Notes
```

**Critical Observations**:
- Section names can contain spaces ("Key Concepts", "AI Summary", "My Notes")
- Sections are defined in `fieldConfig.sections` as `Record<string, SectionDef>`
- Each section starts with `## SectionName` heading
- Content spans from after the heading until the next `##` heading OR end of file
- Blank lines between sections are part of the template structure but NOT part of section content

#### Section Detection Pattern from Plan

From `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md` lines 460-467, the pseudocode shows:

```typescript
// Extract ## Section content
for (const section of template.field_config.sections) {
  const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n##|$)`)
  const match = content.match(regex)
  if (match) {
    parsed.sections[section] = match[1].trim()
  }
}
```

**Breaking down the regex pattern**:

1. `## ${section}` - Literal "##" followed by space and section name
2. `\\n` - Newline after section heading
3. `([\\s\\S]*?)` - Capture group: Match ANY characters (whitespace and non-whitespace) non-greedily
4. `(?=\\n##|$)` - Lookahead: Stop when you see newline followed by "##" OR end of string
5. The `m` flag is NOT needed because we're using `[\\s\\S]` which matches across lines

**Why this pattern works**:
- `[\\s\\S]` matches everything including newlines (unlike `.` which doesn't match newlines by default)
- The `?` after `*` makes it non-greedy, stopping at the first occurrence of the lookahead
- The lookahead `(?=...)` doesn't consume characters, so the next section's `##` remains for the next match
- Using `$` in the lookahead handles the last section (no closing `##`)

**Important**: The section name must be escaped for regex special characters, just like field names in Task 2.2.

#### Edge Cases and How to Handle Them

**Edge Case 1: Empty section**
```markdown
## Description

## Notes
Some content
```

Expected: `{ Description: "", Notes: "Some content" }`

The regex captures everything between headings. If there's nothing (just whitespace), `trim()` makes it an empty string.

**Edge Case 2: Section not in markdown but defined in template**
```markdown
# Task Title

**Status**: Done

## Description
Content here
```

Template expects: `Description`, `Subtasks`, `Notes`

Expected sections:
```typescript
{
  "Description": "Content here",
  "Subtasks": "",    // Not in markdown
  "Notes": ""        // Not in markdown
}
```

**Implementation**: Loop through all sections in `fieldConfig.sections`, not sections found in markdown. If regex doesn't match, store empty string (same pattern as field detection).

**Edge Case 3: Section at end of file**
```markdown
## Description
This is the last section
```

The regex pattern `(?=\\n##|$)` uses `$` to match end of string, so this works correctly. The content "This is the last section" is captured.

**Edge Case 4: Section with multiple blank lines**
```markdown
## Description

Line 1

Line 2


Line 3

## Notes
```

Expected: `{ Description: "Line 1\n\nLine 2\n\n\nLine 3" }`

The `[\\s\\S]*?` captures ALL content including blank lines. The `trim()` removes leading/trailing whitespace but preserves internal blank lines.

**Edge Case 5: Section name with special regex characters**
```markdown
## My Notes (v2.0)
Content
```

If a section name had regex special chars like parentheses, they need escaping. Currently, no seeded templates have this, but defensive programming requires it.

**Edge Case 6: Content before first section**
```markdown
# Title

**Status**: Done

Some random content here

## Description
Actual description
```

The "Some random content here" line is NOT part of any section. It will be ignored (not captured by any section regex). This is expected behavior - only content under `##` headings is extracted.

**Edge Case 7: Template with no sections**

Theoretically possible (a template with only fields, no sections). The `if (fieldConfig.sections)` check handles this - if sections is undefined, skip the loop entirely.

**Edge Case 8: Section names with spaces**

Already tested in seeded templates: "Key Concepts", "AI Summary", "My Notes". The regex escaping handles this correctly.

#### Implementation Code Pattern

Following the exact same pattern as field detection (Task 2.2 implementation):

```typescript
// Step 6: Extract section content (## Section Name)
if (fieldConfig.sections) {
  for (const sectionName in fieldConfig.sections) {
    // Escape special regex characters in section name
    const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Match pattern: ## SectionName\ncontent (until next ## or EOF)
    // [\\s\\S]*? matches any character including newlines (non-greedy)
    // (?=\\n##|$) lookahead stops at next ## heading or end of string
    const regex = new RegExp(`## ${escapedSectionName}\\n([\\s\\S]*?)(?=\\n##|$)`)
    const match = content.match(regex)

    if (match) {
      // Section found - capture content and trim leading/trailing whitespace
      parsed.sections[sectionName] = match[1].trim()
    } else {
      // Section not found in markdown - store empty string
      parsed.sections[sectionName] = ''
    }
  }
}
```

**Why this matches the field detection pattern**:
1. Check if `fieldConfig.sections` exists (handles templates with no sections)
2. Iterate through section names from template config (not sections found in markdown)
3. Escape special regex characters in section name
4. Use regex to find section in content
5. If found: trim and store content
6. If not found: store empty string
7. Consistency with field detection makes code predictable and maintainable

#### Where to Insert the Code

In `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts`:

**Current line 118-119**:
```typescript
  // Step 6: Extract sections (deferred to Task 2.3)
  // TODO: Implement section extraction in Task 2.3
```

**Replace with** (keeping the step number comment for consistency):
```typescript
  // Step 6: Extract section content (## Section Name)
  if (fieldConfig.sections) {
    for (const sectionName in fieldConfig.sections) {
      // ... implementation code here ...
    }
  }
```

This goes AFTER field extraction (Step 5, lines 99-116) and BEFORE the return statement (line 121).

#### Test Cases with Expected Results

**Test 1: Task template with all sections populated**
```markdown
# Buy groceries

**Status**: In Progress
**Priority**: High
**Due Date**: 2025-11-20

## Description
Need milk, eggs, and bread from the store.

## Subtasks
- [ ] Get milk
- [ ] Get eggs
- [ ] Get bread

## Notes
Don't forget to use the coupons!
```

Expected sections:
```typescript
{
  "Description": "Need milk, eggs, and bread from the store.",
  "Subtasks": "- [ ] Get milk\n- [ ] Get eggs\n- [ ] Get bread",
  "Notes": "Don't forget to use the coupons!"
}
```

**Test 2: Note-Generic template**
```markdown
# Meeting notes 2025-11-16

## Content
Discussed Q1 roadmap. Key decisions:
- Launch feature X in January
- Hire 2 engineers

## Tags
meeting, q1, roadmap
```

Expected sections:
```typescript
{
  "Content": "Discussed Q1 roadmap. Key decisions:\n- Launch feature X in January\n- Hire 2 engineers",
  "Tags": "meeting, q1, roadmap"
}
```

**Test 3: YouTube note with Key Concepts section**
```markdown
# TypeScript Advanced Patterns

**URL**: https://youtube.com/watch?v=abc123
**Duration**: 45 minutes
**Status**: Completed

## Key Concepts
- Generic types
- Conditional types
- Mapped types
- Template literal types

## Timestamps

## AI Summary

## My Notes
Great explanations of advanced concepts. Need to practice mapped types more.
```

Expected sections:
```typescript
{
  "Key Concepts": "- Generic types\n- Conditional types\n- Mapped types\n- Template literal types",
  "Timestamps": "",
  "AI Summary": "",
  "My Notes": "Great explanations of advanced concepts. Need to practice mapped types more."
}
```

Note: Empty sections get empty string, not null/undefined.

**Test 4: Section with blank lines preserved**
```markdown
## Description

First paragraph

Second paragraph after blank line


Third paragraph after two blank lines

## Notes
```

Expected:
```typescript
{
  "Description": "First paragraph\n\nSecond paragraph after blank line\n\n\nThird paragraph after two blank lines"
}
```

Internal blank lines are preserved. Leading/trailing whitespace is trimmed.

**Test 5: Last section at EOF (no trailing newline)**
```markdown
## Notes
This is the very last line of the file
```

Expected:
```typescript
{
  "Notes": "This is the very last line of the file"
}
```

The `$` in the lookahead `(?=\\n##|$)` handles EOF correctly.

#### Integration with Existing Code

**No changes needed to other functions**:
- `getTemplate()` - Already complete, returns template with field_config as JSON string
- Field extraction (Step 5) - Already complete in Task 2.2
- Return statement - Already returns `parsed` object with sections property

**Type safety**:
- `ParsedEntity.sections` is typed as `Record<string, string>` (lines 89 in types/index.ts)
- All section values MUST be strings (even empty sections are `""` not `null`)
- This matches the field handling pattern

**Backward compatibility**:
- Templates without sections (if any exist in future) are handled by the `if (fieldConfig.sections)` check
- No breaking changes to existing API

#### Dependencies and Prerequisites

**This task depends on**:
- Task 2.1 ✅ Complete: `getTemplate()` function exists and works
- Task 2.2 ✅ Complete: Field extraction implemented and tested
- Phase 1 ✅ Complete: Templates seeded in database with section configs

**What depends on this task**:
- Task 2.4 (Markdown Reconstruction): `renderMarkdown()` will need to reconstruct sections
- Task 2.5 (Validation): Will validate required sections are non-empty
- Phase 3+ (Entity Conversion): API routes will use section data to populate UI

**No external dependencies**:
- Uses same regex approach as field detection
- No new npm packages
- No database changes

#### Files and Code Locations

**Primary Implementation File**:
- `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts`
  - Lines 118-119: Replace TODO comment with section extraction code

**Type Definitions** (reference only, no changes needed):
- `/home/mmariani/Projects/idealisted/types/index.ts`
  - Lines 75-79: `SectionDef` interface
  - Lines 81-84: `FieldConfig` interface with `sections?: Record<string, SectionDef>`
  - Lines 86-91: `ParsedEntity` interface with `sections: Record<string, string>`

**Template Data** (reference for testing):
- `/home/mmariani/Projects/idealisted/lib/db.ts`
  - Lines 127-136: Task template markdown with 3 sections
  - Lines 144-148: Task template section config
  - Lines 152-158: Note-Generic template markdown with 2 sections
  - Lines 161-165: Note-Generic section config
  - Lines 168-184: YouTube note template markdown with 4 sections
  - Lines 192-197: YouTube note section config

**Plan Reference**:
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md`
  - Lines 438-471: Pseudocode showing section extraction pattern

#### Success Criteria Checklist

After implementing section extraction:

- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] Can extract all 3 sections from task template markdown
- [ ] Can extract all 2 sections from note-generic template markdown
- [ ] Can extract all 4 sections from YouTube note template markdown
- [ ] Empty sections stored as `""` not `null`/`undefined`
- [ ] Missing sections in markdown get `""` default
- [ ] Section names with spaces ("Key Concepts", "AI Summary") handled correctly
- [ ] Multi-line section content captured correctly with newlines preserved
- [ ] Internal blank lines preserved (only leading/trailing trimmed)
- [ ] Last section at EOF captured correctly
- [ ] Sections object populated for all templates (no longer always empty)
- [ ] All test cases above pass with correct results
- [ ] Field extraction (Task 2.2) still works (no regressions)

#### Complete Implementation Code

**Replace lines 118-119 in `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts` with**:

```typescript
  // Step 6: Extract section content (## Section Name)
  if (fieldConfig.sections) {
    for (const sectionName in fieldConfig.sections) {
      // Escape special regex characters in section name
      const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match pattern: ## SectionName\ncontent (until next ## or EOF)
      // [\\s\\S]*? matches any character including newlines (non-greedy)
      // (?=\\n##|$) lookahead stops at next ## heading or end of string
      const regex = new RegExp(`## ${escapedSectionName}\\n([\\s\\S]*?)(?=\\n##|$)`)
      const match = content.match(regex)

      if (match) {
        // Section found - capture content and trim leading/trailing whitespace
        parsed.sections[sectionName] = match[1].trim()
      } else {
        // Section not found in markdown - store empty string
        parsed.sections[sectionName] = ''
      }
    }
  }
```

**That's it!** No other changes needed to the file. This implementation:
1. Follows the exact same pattern as field extraction (consistency)
2. Handles all edge cases identified above
3. Matches the pseudocode from the plan
4. Works with all 3 seeded templates
5. Is defensive (checks if sections exist, escapes special chars, handles missing sections)

---

### Task 2.4: Implement Markdown Reconstruction
**Objective**: Convert ParsedEntity back to markdown string

**Deliverables**:
- renderMarkdown() function
- Reconstruct title (# heading)
- Reconstruct fields (**Label**: value)
- Reconstruct sections (## Section\ncontent)
- Preserve order from template

**Files to Modify**:
- `lib/markdown-parser.ts` - Implement renderMarkdown()

**Test Case**:
```typescript
const parsed: ParsedEntity = {
  title: "My Task",
  fields: { Status: "In Progress", Priority: "High" },
  sections: { Description: "Do the thing", Notes: "Remember to..." }
}
renderMarkdown(parsed)
// Should output:
// # My Task
//
// **Status**: In Progress
// **Priority**: High
//
// ## Description
// Do the thing
//
// ## Notes
// Remember to...
```

**Success Criteria**:
- Round-trip works (parse → render → parse produces same result)
- Formatting consistent
- Unit tests pass

---

## Context Manifest for Task 2.4: Markdown Reconstruction

### How Markdown Parsing Currently Works

The markdown parser library (`/home/mmariani/Projects/idealisted/lib/markdown-parser.ts`) implements a **template-driven bidirectional conversion system** between markdown text and structured ParsedEntity objects. Task 2.4 focuses on the **reconstruction direction**: taking a ParsedEntity and rebuilding valid markdown.

#### Current Implementation Status

**What's Already Working** (Task 2.1-2.3 Complete):

1. **getTemplate() function** (lines 20-49): Loads templates from the database, validates field_config JSON
2. **parseMarkdown() function** (lines 66-143): Extracts structured data from markdown content
   - Title extraction from first H1 heading (`# Title`)
   - Field extraction using pattern `**Field Name**: value`
   - Section extraction using pattern `## Section Name\ncontent`
   - Stores original markdown in `parsed.raw` for debugging

**What Needs Implementation** (Task 2.4 - THIS TASK):

3. **renderMarkdown() function** (lines 145-163): Currently a stub that throws "Not yet implemented - Task 2.4"

#### The Template-Driven Architecture

The system uses three seed templates stored in the database (seeded at `/home/mmariani/Projects/idealisted/lib/db.ts` lines 118-215):

**Template 1: Task** (`id: 'task'`):
```markdown
# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:

## Description


## Subtasks
- [ ]


## Notes
```

**Field Config** (lines 138-149):
```json
{
  "fields": {
    "Status": { "type": "select", "options": ["Not Started", "In Progress", "Completed"], "required": true },
    "Priority": { "type": "select", "options": ["Low", "Medium", "High", "Urgent"], "required": true },
    "Due Date": { "type": "date", "required": false }
  },
  "sections": {
    "Description": { "type": "textarea", "required": false },
    "Subtasks": { "type": "checklist", "required": false },
    "Notes": { "type": "textarea", "required": false }
  }
}
```

**Template 2: Note-Generic** (`id: 'note-generic'`, lines 151-165):
```markdown
# {title}

## Content


## Tags
```

**Field Config**: No fields, only sections (Content, Tags)

**Template 3: Note-YouTube** (`id: 'note-youtube'`, lines 167-198):
```markdown
# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes
```

**Field Config**: 3 fields (URL, Duration, Status), 4 sections (Key Concepts, Timestamps, AI Summary, My Notes)

#### How parseMarkdown() Extracts Data (The Reverse Operation)

Understanding how parsing works is critical because **renderMarkdown() must reverse this process exactly**.

**Title Extraction** (lines 90-94):
```typescript
const titleMatch = content.match(/^#\s+(.+)$/m)
if (titleMatch) {
  parsed.title = titleMatch[1].trim()
}
```
Pattern: Matches first H1 heading, captures text after `# `

**Field Extraction** (lines 96-116):
```typescript
if (fieldConfig.fields) {
  for (const fieldName in fieldConfig.fields) {
    const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const fieldRegex = new RegExp(`\\*\\*${escapedFieldName}\\*\\*:\\s*(.*)`, 'm')
    const match = content.match(fieldRegex)

    if (match) {
      parsed.fields[fieldName] = match[1].trim()
    } else {
      parsed.fields[fieldName] = ''
    }
  }
}
```
Pattern: `**FieldName**: value` - Extracts value, stores empty string if not found

**Section Extraction** (lines 118-140):
```typescript
if (fieldConfig.sections) {
  for (const sectionName in fieldConfig.sections) {
    const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const sectionRegex = new RegExp(`##\\s+${escapedSectionName}\\n([\\s\\S]*?)(?=\\n##|$)`, 'm')
    const match = content.match(sectionRegex)

    if (match) {
      parsed.sections[sectionName] = match[1].trim()
    } else {
      parsed.sections[sectionName] = ''
    }
  }
}
```
Pattern: `## SectionName\ncontent` - Content captured until next section or EOF, trimmed

#### The ParsedEntity Structure (Input to renderMarkdown)

From `/home/mmariani/Projects/idealisted/types/index.ts` lines 86-91:

```typescript
export interface ParsedEntity {
  title: string
  fields: Record<string, string>  // Extracted field values
  sections: Record<string, string>  // Extracted section content
  raw: string  // Original markdown for debugging/reference
}
```

**Example ParsedEntity** (Task template):
```typescript
{
  title: "Implement API endpoint",
  fields: {
    Status: "In Progress",
    Priority: "High",
    "Due Date": "2025-11-20"
  },
  sections: {
    Description: "Create REST endpoint for user authentication",
    Subtasks: "- [ ] Design schema\n- [x] Implement handler",
    Notes: "Remember to add rate limiting"
  },
  raw: "# Implement API endpoint\n\n**Status**: In Progress\n..."
}
```

**Example ParsedEntity** (Note-Generic template):
```typescript
{
  title: "Meeting Notes - Sprint Planning",
  fields: {},  // Note-generic has no fields!
  sections: {
    Content: "Discussed Q1 goals and timeline",
    Tags: "meeting, planning, q1"
  },
  raw: "# Meeting Notes - Sprint Planning\n\n## Content\n..."
}
```

### What renderMarkdown() Must Do

The `renderMarkdown()` function signature at line 161:
```typescript
export function renderMarkdown(parsed: ParsedEntity, templateId: string): string
```

**Input**: ParsedEntity object + templateId string
**Output**: Valid markdown string that matches the template structure

#### Reconstruction Algorithm (From MARKDOWN_ENTITIES_PLAN.md lines 438-470)

The plan provides this pseudocode showing the expected approach:

**Step 1: Load Template**
```typescript
const template = getTemplate(templateId)
if (!template) {
  throw new Error(`Template '${templateId}' not found`)
}
```

**Step 2: Start with Title**
```typescript
let markdown = `# ${parsed.title}\n\n`
```

**Step 3: Reconstruct Fields** (from template's field_config)
```typescript
const fieldConfig: FieldConfig = JSON.parse(template.field_config)

if (fieldConfig.fields) {
  for (const fieldName in fieldConfig.fields) {
    const fieldValue = parsed.fields[fieldName] || ''
    markdown += `**${fieldName}**: ${fieldValue}\n`
  }
  markdown += '\n'  // Blank line after fields section
}
```

**Step 4: Reconstruct Sections** (from template's field_config)
```typescript
if (fieldConfig.sections) {
  for (const sectionName in fieldConfig.sections) {
    const sectionContent = parsed.sections[sectionName] || ''
    markdown += `## ${sectionName}\n${sectionContent}\n\n`
  }
}
```

**Step 5: Return Markdown**
```typescript
return markdown
```

#### Critical Implementation Details

**1. Template-Driven Order Preservation**

The reconstruction MUST follow the template's field_config order, NOT the order of keys in the ParsedEntity. Why?
- JavaScript object key iteration order is not guaranteed for all scenarios
- The template defines the canonical structure
- Round-trip consistency requires: `parse(render(parse(md))) === parse(md)`

**2. Handling Empty Values**

From the parseMarkdown implementation, we know that missing fields/sections are stored as empty strings:
```typescript
parsed.fields[fieldName] = match ? match[1].trim() : ''
parsed.sections[sectionName] = match ? match[1].trim() : ''
```

When rendering:
- Empty field values should still render the field label: `**Status**: \n` (not skip it)
- Empty sections should still render the heading: `## Notes\n\n` (not skip it)
- This ensures the template structure is always preserved

**3. Spacing and Formatting Rules**

From analyzing the template markdown (lines 122-136, 152-158, 168-184):
- Title: `# {title}\n\n` (H1 with TWO newlines after)
- Fields: `**Label**: value\n` (one newline after each field)
- Blank line: Between fields section and first section (`\n`)
- Sections: `## Name\ncontent\n\n` (H2, content, TWO newlines after)
- Final output: Should end with double newline after last section

**4. Edge Cases to Handle**

**Empty Title**:
```typescript
title: ""
// Should render: `# \n\n` (not skip the heading)
```

**Template with No Fields** (Note-Generic):
```typescript
fields: {}
// Should skip field iteration entirely, go straight to sections
```

**Template with No Sections** (hypothetical):
```typescript
sections: {}
// Should skip section iteration, end after fields
```

**Field Value with Newlines** (shouldn't happen but be defensive):
```typescript
fields: { Status: "In\nProgress" }
// Should render as-is: **Status**: In\nProgress\n
// Parser will extract first line only on round-trip
```

**Section Content with Multiple Paragraphs**:
```typescript
sections: { Notes: "First paragraph\n\nSecond paragraph" }
// Should render: ## Notes\nFirst paragraph\n\nSecond paragraph\n\n
// Preserves internal newlines, adds double newline at end
```

#### Round-Trip Consistency Requirement

The success criteria states: "Round-trip works (parse → render → parse produces same result)"

What this means in practice:
```typescript
const original = parseMarkdown(markdown, 'task')
const reconstructed = renderMarkdown(original, 'task')
const reparsed = parseMarkdown(reconstructed, 'task')

// These should be deeply equal:
assert.deepEqual(original.title, reparsed.title)
assert.deepEqual(original.fields, reparsed.fields)
assert.deepEqual(original.sections, reparsed.sections)
```

**Why round-trip matters:**
- Ensures data integrity through edit cycles
- Validates that parsing and rendering are true inverses
- Prevents data loss when users edit → save → re-open

**Known limitation**: The `raw` field will differ (it contains the new markdown), but title/fields/sections must match exactly.

### Technical Reference Details

#### Function Signature and JSDoc

Current stub (lines 145-163):
```typescript
/**
 * Render a ParsedEntity back into markdown format
 *
 * This function will:
 * - Load the template by templateId
 * - Reconstruct the markdown from the template structure
 * - Insert the title into the {title} placeholder
 * - Insert field values after their bold labels
 * - Insert section content under ## headings
 * - Return properly formatted markdown string
 *
 * @param parsed - Parsed entity object
 * @param templateId - Template ID to use for rendering
 * @returns Markdown string
 * @throws Error when called (not yet implemented)
 */
export function renderMarkdown(parsed: ParsedEntity, templateId: string): string {
  throw new Error('Not yet implemented - Task 2.4')
}
```

This JSDoc is already correct and should be kept.

#### Error Handling

**Template Not Found**:
```typescript
const template = getTemplate(templateId)
if (!template) {
  throw new Error(`Template '${templateId}' not found`)
}
```

**Invalid field_config JSON**:
The getTemplate() function already validates JSON at line 32-36, so this will throw before reaching renderMarkdown. No additional handling needed.

**Database Errors**:
Also handled by getTemplate() (lines 40-48). If DB access fails, error is thrown with context.

#### TypeScript Type Safety

**FieldConfig Type** (from `/home/mmariani/Projects/idealisted/types/index.ts` lines 81-84):
```typescript
export interface FieldConfig {
  fields?: Record<string, FieldDef>
  sections?: Record<string, SectionDef>
}
```

Both `fields` and `sections` are OPTIONAL (note the `?`). Must check for existence:
```typescript
if (fieldConfig.fields) {
  // Safe to iterate
}
```

**ParsedEntity Fields** (lines 86-91):
```typescript
fields: Record<string, string>  // Key-value pairs
sections: Record<string, string>  // Key-value pairs
```

These are always defined (not optional), but MAY be empty objects `{}`.

Accessing a non-existent key returns `undefined`, so use fallback:
```typescript
const fieldValue = parsed.fields[fieldName] || ''
```

### Implementation Strategy

**Recommended Implementation Pattern**:

```typescript
export function renderMarkdown(parsed: ParsedEntity, templateId: string): string {
  // 1. Load template
  const template = getTemplate(templateId)
  if (!template) {
    throw new Error(`Template '${templateId}' not found`)
  }

  // 2. Parse field_config
  const fieldConfig: FieldConfig = JSON.parse(template.field_config)

  // 3. Build markdown incrementally
  let markdown = ''

  // 4. Add title
  markdown += `# ${parsed.title}\n\n`

  // 5. Add fields (if template has any)
  if (fieldConfig.fields) {
    for (const fieldName in fieldConfig.fields) {
      const fieldValue = parsed.fields[fieldName] || ''
      markdown += `**${fieldName}**: ${fieldValue}\n`
    }
    // Blank line after fields section
    markdown += '\n'
  }

  // 6. Add sections (if template has any)
  if (fieldConfig.sections) {
    for (const sectionName in fieldConfig.sections) {
      const sectionContent = parsed.sections[sectionName] || ''
      markdown += `## ${sectionName}\n${sectionContent}\n\n`
    }
  }

  return markdown
}
```

**Alternative: Use Template as Base**

Instead of building from scratch, could load `template.markdown_template` and perform replacements:
1. Replace `{title}` placeholder with `parsed.title`
2. Replace field values after their labels
3. Replace section content under headings

**Pros**: Preserves exact template formatting (default values, empty lines)
**Cons**: More complex regex/string manipulation, harder to handle missing fields

**Recommendation**: Use the incremental building approach (shown above) for simplicity and predictability.

### Files to Reference During Implementation

**Core Files**:
- `/home/mmariani/Projects/idealisted/lib/markdown-parser.ts` - Where renderMarkdown() will be implemented
- `/home/mmariani/Projects/idealisted/types/index.ts` - Type definitions (ParsedEntity, FieldConfig, Template)
- `/home/mmariani/Projects/idealisted/lib/db.ts` - Template seed data showing structure

**Related Code**:
- `parseMarkdown()` function (lines 66-143 of markdown-parser.ts) - The inverse operation
- `getTemplate()` function (lines 20-49 of markdown-parser.ts) - Template loading helper

**Planning Documents**:
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_PLAN.md` - Overall architecture (lines 438-470 for pseudocode)
- `/home/mmariani/Projects/idealisted/MARKDOWN_ENTITIES_TASKS.md` - Task 2.4 specification (lines 3946-3984)

### Verification Checklist

After implementing renderMarkdown():

1. **Compiles**: `npm run build` succeeds
2. **Type-safe**: No TypeScript errors
3. **Round-trip**: For each template (task, note-generic, note-youtube):
   - Parse markdown → render → parse again
   - Verify fields/sections/title unchanged
4. **Empty values**: Test with empty title, empty fields, empty sections
5. **Formatting**: Output matches template structure (spacing, newlines)
6. **Error handling**: Template not found throws clear error
7. **No side effects**: Function is pure (no DB writes, no state mutation)

---

### Task 2.5: Template-Specific Validation
**Objective**: Validate parsed markdown against template requirements

**Deliverables**:
- validateMarkdown() function
- Check required fields exist
- Validate field types (date format, select options, URL format)
- Return ValidationResult with errors array

**Files to Modify**:
- `lib/markdown-parser.ts` - Implement validateMarkdown()

**Validation Rules**:
- Required fields must be present
- Date fields must match YYYY-MM-DD format
- Select fields must have value in options list
- URL fields must be valid URLs
- YouTube URLs must match youtube.com or youtu.be

**Success Criteria**:
- Catches missing required fields
- Validates date formats
- Validates select options
- YouTube URL validation works
- Returns helpful error messages

---

### Task 2.6: Unit Tests for Parser
**Objective**: Comprehensive testing of parser functions

**Deliverables**:
- Test all 3 templates (task, note-generic, note-youtube)
- Test edge cases (empty sections, missing fields, invalid formats)
- Test round-trip (parse → render → parse)
- Test validation (required fields, formats)

**Files to Create**:
- `lib/__tests__/markdown-parser.test.ts` (if using Jest)
- Or manual test script

**Test Coverage**:
- Task template parsing
- Generic note parsing
- YouTube note parsing with timestamps
- Field validation (dates, URLs, selects)
- Section extraction
- Markdown reconstruction

**Success Criteria**:
- All tests pass
- Edge cases handled
- 90%+ code coverage

---

## Phase 3: Task Conversion

### Task 3.1: Update Task Creation API
**Objective**: Create tasks with markdown content

**Deliverables**:
- POST /api/items accepts template_id parameter
- Fetch template from database
- Populate markdown template with provided data
- Store markdown_content and template_id in items table
- Dual storage: Extract due_date from markdown → save to tasks.due_date

**Files to Modify**:
- `app/api/items/route.ts` - POST handler

**API Request Example**:
```json
{
  "type": "task",
  "template_id": "task",
  "fields": {
    "Status": "Not Started",
    "Priority": "High",
    "Due Date": "2025-11-20"
  },
  "sections": {
    "Description": "Complete the implementation",
    "Notes": "Remember to test"
  }
}
```

**Success Criteria**:
- Task created with markdown_content
- template_id stored
- due_date extracted and stored in tasks.due_date
- Existing task creation still works (backward compat)

---

### Task 3.2: Update Task Modal for Markdown Editing
**Objective**: Edit tasks using smart form fields

**Deliverables**:
- Parse existing markdown on modal open
- Render form fields for each markdown field
- Status dropdown (Not Started, In Progress, Completed)
- Priority dropdown (Low, Medium, High, Urgent)
- Due Date picker
- Description textarea
- Notes textarea
- Save button reconstructs markdown and saves

**Files to Create/Modify**:
- `components/modern/EntityModal.tsx` - Add markdown editing mode
- Or create new `components/modern/MarkdownTaskEditor.tsx`

**UI Layout**:
```
[Task Modal]
  Title: [_______________]
  Status: [Dropdown ▼]
  Priority: [Dropdown ▼]
  Due Date: [Date Picker]

  Description:
  [_________________]
  [_________________]

  Notes:
  [_________________]

  [Cancel] [Save]
```

**Success Criteria**:
- Loads existing markdown tasks
- Edits update markdown_content
- Form fields match template
- Save updates both markdown and tasks.due_date
- Retro styling consistent

---

### Task 3.3: Files Screen Markdown Detection
**Objective**: Detect markdown tasks and render appropriately

**Deliverables**:
- In Files screen, check if `item.markdown_content !== null`
- If markdown: Render with MarkdownViewer (basic for now)
- If legacy: Render with existing EntityCard
- Click to edit opens appropriate modal

**Files to Modify**:
- `components/modern/screens/FilesScreen.tsx`

**Render Logic**:
```typescript
{items.map(item => {
  if (item.markdown_content) {
    return <MarkdownEntityCard key={item.id} item={item} />
  } else {
    return <LegacyEntityCard key={item.id} item={item} />
  }
})}
```

**Success Criteria**:
- Markdown tasks display differently
- Legacy tasks (projects, lists) still work
- Click to edit opens correct modal
- No visual regressions

---

### Task 3.4: Verify Reminders Still Work
**Objective**: Ensure task reminders trigger correctly

**Deliverables**:
- Test that tasks.due_date is populated from markdown
- Test that CRON job finds tasks with reminders
- Test that notifications send correctly
- Verify dual storage (markdown + tasks table) works

**Files to Test**:
- `lib/scheduler.ts` - checkAndNotifyReminders()
- `app/api/items/route.ts` - Task creation

**Test Cases**:
1. Create task with due date in markdown
2. Verify tasks.due_date populated
3. Set reminder_datetime
4. Wait for CRON job (or trigger manually)
5. Verify notification sent

**Success Criteria**:
- due_date extracted from markdown correctly
- Reminders trigger as expected
- No regressions from markdown change

---

## Phase 4: Note Conversion (Generic)

### Task 4.1: Update Note Creation API
**Objective**: Create notes with markdown content

**Deliverables**:
- POST /api/items for type='note' accepts template_id
- Support note-generic template
- Store markdown_content and template_id
- Populate Content and Tags sections from request

**Files to Modify**:
- `app/api/items/route.ts` - POST handler

**API Request Example**:
```json
{
  "type": "note",
  "template_id": "note-generic",
  "title": "Meeting Notes",
  "sections": {
    "Content": "Discussed project timeline and deliverables.",
    "Tags": "meeting, project-a"
  }
}
```

**Success Criteria**:
- Note created with markdown_content
- template_id stored
- Content section populated
- Tags section populated
- Existing note creation still works

---

### Task 4.2: Create Generic Note Editor
**Objective**: Smart form editor for generic notes

**Deliverables**:
- NoteModal component (or enhance EntityModal)
- Title input
- Content textarea (large, main section)
- Tags input (comma-separated or tag chips)
- Save reconstructs markdown

**Files to Create/Modify**:
- `components/modern/NoteModal.tsx` (new or enhance EntityModal)

**UI Layout**:
```
[Note Modal]
  Title: [_______________]

  Content:
  [_________________]
  [_________________]
  [_________________]

  Tags: [tag1] [tag2] [+ Add Tag]

  [Cancel] [Save]
```

**Success Criteria**:
- Content section prominent (largest field)
- Tags editable (add/remove)
- Save updates markdown_content
- Retro styling

---

### Task 4.3: Note Subtype Selector
**Objective**: Choose between note subtypes when creating

**Deliverables**:
- When creating note, show template selector
- Options: Generic, YouTube Learning (more later)
- Selection determines which template and editor to use
- Default to Generic

**Files to Modify**:
- Capture screen note button
- Or note creation modal

**UI**:
```
Select Note Type:
( ) Generic Note
( ) YouTube Learning Note
[ ) Meeting Notes (future)
[ ) Book Notes (future)

[Continue]
```

**Success Criteria**:
- Can select note subtype
- Creates with correct template_id
- Opens appropriate editor

---

## Phase 5: YouTube Learning Note

### Task 5.1: YouTube Note Template & Parser
**Objective**: Implement YouTube-specific template parsing

**Deliverables**:
- note-youtube template already seeded (Task 1.2)
- Parser extracts URL, Duration, Status fields
- Parser extracts Key Concepts (bullet list)
- Parser extracts Timestamps (special format: `[HH:MM] Description`)
- Parser extracts AI Summary section
- Parser extracts My Notes section

**Files to Modify**:
- `lib/markdown-parser.ts` - Add YouTube-specific parsing logic

**Special Parsing**:
```markdown
## Timestamps
- [00:05] Introduction to topic
- [12:30] Deep dive into X
- [25:00] Summary
```
Should parse to:
```typescript
{
  Timestamps: [
    { time: "00:05", description: "Introduction to topic" },
    { time: "12:30", description: "Deep dive into X" },
    { time: "25:00", description: "Summary" }
  ]
}
```

**Success Criteria**:
- YouTube template parses correctly
- Timestamps extracted with time + description
- All sections detected
- Validation catches invalid YouTube URLs

---

### Task 5.2: YouTube Note Smart Editor
**Objective**: Rich editor for YouTube learning notes

**Deliverables**:
- Title input
- URL input (with YouTube icon, validation)
- Duration input (optional)
- Status dropdown (Not Watched, In Progress, Completed)
- Key Concepts bullet list editor (add/remove bullets)
- Timestamps list editor (time picker + description input)
- AI Summary section (readonly for now, placeholder for future)
- My Notes textarea

**Files to Create**:
- `components/modern/YouTubeNoteEditor.tsx`

**UI Layout**:
```
[YouTube Learning Note]
  Title: [_______________]

  URL: [🎥 _______________] (validates YouTube)
  Duration: [_____] (optional)
  Status: [Not Watched ▼]

  Key Concepts:
  • [_______________] [x]
  • [_______________] [x]
  [+ Add Concept]

  Timestamps:
  [00:00] [_______________] [x]
  [00:00] [_______________] [x]
  [+ Add Timestamp]

  AI Summary: (readonly)
  [Generated summary will appear here]
  [Generate Summary] (button for future)

  My Notes:
  [_________________]

  [Cancel] [Save]
```

**Success Criteria**:
- URL validation (must be YouTube)
- Timestamps have time picker (HH:MM format)
- Can add/remove bullets and timestamps
- AI Summary readonly (placeholder)
- Save reconstructs YouTube markdown

---

### Task 5.3: Timestamp Link Rendering
**Objective**: Make timestamps clickable in viewer

**Deliverables**:
- Detect `[HH:MM]` patterns in rendered markdown
- Convert to clickable links
- Click opens YouTube video at that timestamp
- Format: `https://youtube.com/watch?v=VIDEO_ID&t=SECONDS`

**Files to Create/Modify**:
- `components/ui/MarkdownViewer.tsx` - Custom renderer for timestamps

**Rendering Logic**:
```typescript
// Input: [12:30] Deep dive into X
// Output: <a href="https://youtube.com/watch?v=abc&t=750">12:30</a> Deep dive into X
```

**Success Criteria**:
- Timestamps are clickable
- Links open YouTube at correct time
- Works on mobile
- Styling consistent with retro theme

---

### Task 5.4: YouTube Note Files Screen Integration
**Objective**: Special rendering for YouTube notes in Files screen

**Deliverables**:
- Detect note subtype === 'youtube'
- Show YouTube thumbnail (if possible, or icon)
- Show video title and duration
- Show status badge (Not Watched, In Progress, Completed)
- Click opens YouTube note viewer

**Files to Modify**:
- `components/modern/screens/FilesScreen.tsx`

**Card Layout**:
```
[YouTube Note Card]
  🎥 [Thumbnail or Icon]

  Building RAG Systems with LangChain
  Duration: 45 min | Status: In Progress

  Key Concepts: 3 | Timestamps: 5 | Notes: Yes
```

**Success Criteria**:
- YouTube notes visually distinct
- Shows key info (title, duration, status)
- Thumbnail display (if feasible, else icon)
- Click opens viewer

---

## Phase 6: AI Integration

### Task 6.1: Update AI Prompt for Template Detection
**Objective**: AI detects which template to suggest

**Deliverables**:
- Update AI prompt to analyze content for template hints
- Detect YouTube URLs → Suggest note-youtube
- Detect meeting keywords → Suggest note-generic (or note-meeting future)
- Detect task keywords → Suggest task
- Default to note-generic for notes, task for tasks

**Files to Modify**:
- `app/api/ai/suggest/route.ts` - AI prompt engineering

**Detection Logic**:
```
If text contains youtube.com or youtu.be URL:
  suggested_template = 'note-youtube'
  Extract URL to additional_fields

If text contains "watch", "video", "learn":
  suggested_template = 'note-youtube' (maybe)

If text is task-like:
  suggested_template = 'task'

Else:
  suggested_template = 'note-generic'
```

**Success Criteria**:
- AI detects YouTube URLs reliably
- AI suggests correct template 80%+ of the time
- Template suggestion included in response

---

### Task 6.2: Update AI Response Type
**Objective**: Add suggested_template and markdown_sections to AISuggestion

**Deliverables**:
- Add `suggested_template?: string` to AISuggestion interface
- Add `markdown_sections?: Record<string, string>` to additional_fields
- AI response includes pre-filled markdown sections

**Files to Modify**:
- `types/index.ts` - Update AISuggestion interface

**Example Response**:
```json
{
  "suggested_type": "note",
  "suggested_template": "note-youtube",
  "processed_text": "Learn about RAG systems from this video",
  "additional_fields": {
    "url": "https://youtube.com/watch?v=abc123",
    "markdown_sections": {
      "Key Concepts": "• Vector databases\n• Semantic search\n• Context retrieval"
    }
  }
}
```

**Success Criteria**:
- Type updated
- AI response includes template
- Sections pre-populated when possible

---

### Task 6.3: Update AISuggestionPanel to Show Template
**Objective**: Preview template in suggestion panel

**Deliverables**:
- Show which template will be used
- Preview markdown structure
- Show pre-filled sections from AI
- Accept button uses template

**Files to Modify**:
- `components/ui/AISuggestionPanel.tsx`

**UI Addition**:
```
[AI Suggestion Panel]
  ...existing content...

  Template: 📝 YouTube Learning Note

  Sections:
  • URL
  • Key Concepts (3 pre-filled)
  • Timestamps
  • My Notes

  [Accept] [Override] [Dismiss]
```

**Success Criteria**:
- Template name displayed
- Section preview shown
- User understands what will be created
- Retro styling

---

### Task 6.4: Update Accept Flow to Create Markdown Entity
**Objective**: Accept creates markdown entity with template

**Deliverables**:
- handleAcceptSuggestion uses template_id from AI suggestion
- Creates markdown content from template + AI data
- Pre-fills sections from markdown_sections
- Stores markdown_content and template_id

**Files to Modify**:
- `app/page.tsx` - handleAcceptSuggestion function

**Creation Flow**:
```typescript
const template = getTemplate(aiSuggestion.suggested_template)
const markdown = populateTemplate(template, {
  title: aiSuggestion.processed_text,
  fields: aiSuggestion.additional_fields,
  sections: aiSuggestion.additional_fields.markdown_sections
})

// POST to /api/items
{
  type: aiSuggestion.suggested_type,
  template_id: aiSuggestion.suggested_template,
  markdown_content: markdown,
  ...
}
```

**Success Criteria**:
- AI-created entities use templates
- Sections pre-filled from AI
- User can edit after creation
- All entity types supported

---

## Phase 7: Markdown Viewer & Editor UI

### Task 7.1: Create MarkdownViewer Component ✅
**Objective**: Beautiful read-only markdown rendering
**Status**: Complete (2025-11-17)

**Deliverables**:
- Component renders markdown with react-markdown or similar
- Supports headings, lists, bold, italic, links
- Custom renderers for timestamps (Phase 5.3)
- Retro theme styling
- Mobile-responsive

**Files to Create**:
- `components/ui/MarkdownViewer.tsx`

**Dependencies**:
- Install: `npm install react-markdown remark-gfm`

**Styling**:
```css
.markdown-viewer h1 { /* retro heading */ }
.markdown-viewer h2 { /* retro subheading */ }
.markdown-viewer ul { /* retro list */ }
.markdown-viewer strong { /* retro bold */ }
```

**Success Criteria**:
- Renders all markdown elements
- Timestamps clickable (YouTube notes)
- Retro theme applied
**Status**: Complete (2025-11-17)
- Mobile-friendly

---

### Task 7.2: Create MarkdownEntityEditor Modal
**Objective**: Smart form-based markdown editor

**Deliverables**:
- Modal component with template-driven form
- Dynamically renders fields based on template.field_config
- Field components: TextField, DateField, SelectField, TextareaField
- Section components: TextareaSection, ListSection
- Save button validates and saves markdown

**Files to Create**:
- `components/modern/MarkdownEntityEditor.tsx`
- `components/ui/markdown-fields/TextField.tsx`
- `components/ui/markdown-fields/DateField.tsx`
- `components/ui/markdown-fields/SelectField.tsx`
- `components/ui/markdown-fields/TextareaSection.tsx`
- `components/ui/markdown-fields/ListSection.tsx`

**Component Structure**:
```typescript
<MarkdownEntityEditor
  item={item}
  template={template}
  onSave={(markdown) => saveMarkdown(markdown)}
  onCancel={() => closeModal()}
>
  {/* Dynamically render based on template.field_config */}
  {fields.map(field => <FieldComponent {...field} />)}
  {sections.map(section => <SectionComponent {...section} />)}
</MarkdownEntityEditor>
```

**Success Criteria**:
- Works with all 3 templates
- Fields render correctly
- Validation works
- Save reconstructs markdown
- Retro modal styling

---

### Task 7.3: Template Selector Component
**Objective**: Choose template when creating new entity

**Deliverables**:
- Component shows available templates
- Filter by entity type (task, note)
- Visual cards with template name and description
- Selection opens appropriate editor

**Files to Create**:
- `components/modern/TemplateSelector.tsx`

**UI**:
```
[Select Template]

Tasks:
  [📋 Task]
  Create a task with status, priority, and due date

Notes:
  [📝 Generic Note]
  Simple note with content and tags

  [🎥 YouTube Learning Note]
  Take notes on educational videos with timestamps

[Cancel]
```

**Success Criteria**:
- Shows all system templates
- Grouped by entity type
- Click selects template
- Retro card styling

---

### Task 7.4: Files Screen Integration
**Objective**: View and edit markdown entities from Files screen

**Deliverables**:
- Click markdown entity opens MarkdownViewer
- Edit button in viewer opens MarkdownEntityEditor
- Smooth transitions between view/edit modes
- Legacy entities still work with old modals

**Files to Modify**:
- `components/modern/screens/FilesScreen.tsx`

**Flow**:
```
[Files Screen]
  Click markdown entity
    ↓
  [MarkdownViewer Modal]
    Click Edit
      ↓
    [MarkdownEntityEditor Modal]
      Save
        ↓
      Back to Files Screen
```

**Success Criteria**:
- View mode beautiful
- Edit mode functional
- Transitions smooth
- No regressions for legacy entities

---

## Phase 8: Polishing & Testing

### Task 8.1: End-to-End Task Testing
**Objective**: Validate complete task workflow

**Test Cases**:
1. Create task with AI (capture → AI → accept)
2. Create task manually (button → template selector → editor)
3. Edit existing task
4. View task in Files screen
5. Set reminder, verify notification
6. Complete task, verify status updates

**Success Criteria**:
- All workflows work
- Reminders trigger
- No errors in console
- Mobile UX smooth

---

### Task 8.2: End-to-End Generic Note Testing
**Objective**: Validate complete generic note workflow

**Test Cases**:
1. Create note with AI
2. Create note manually
3. Edit existing note
4. View note in Files screen
5. Add/remove tags
6. Search notes by tag

**Success Criteria**:
- All workflows work
- Tags functional
- No errors

---

### Task 8.3: End-to-End YouTube Note Testing
**Objective**: Validate complete YouTube note workflow

**Test Cases**:
1. Create YouTube note from AI (paste YouTube URL in capture)
2. Create YouTube note manually
3. Edit timestamps
4. Click timestamp link (opens YouTube at time)
5. Add key concepts
6. Write notes

**Success Criteria**:
- YouTube URL validation works
- Timestamps clickable
- All sections editable
- AI detects YouTube URLs

---

### Task 8.4: Legacy Entity Regression Testing
**Objective**: Ensure Projects and Lists still work

**Test Cases**:
1. Create project (legacy flow)
2. Edit project
3. View project in Files screen
4. Create list (legacy flow)
5. Edit list items
6. View list in Files screen

**Success Criteria**:
- No breaking changes
- Legacy modals work
- Coexistence seamless

---

### Task 8.5: Mobile Responsiveness Testing
**Objective**: Validate mobile UX

**Test Cases**:
1. View markdown on mobile
2. Edit markdown on mobile (smart forms)
3. Template selector on mobile
4. Files screen on mobile
5. AI flow on mobile

**Success Criteria**:
- All screens responsive
- Forms usable on mobile
- No horizontal scroll
- Touch targets adequate

---

### Task 8.6: Edge Cases & Error Handling
**Objective**: Handle invalid inputs gracefully

**Test Cases**:
1. Invalid markdown (malformed)
2. Missing required fields
3. Invalid date formats
4. Invalid YouTube URLs
5. Empty sections
6. Very long content
7. Special characters in fields
8. Concurrent edits (if applicable)

**Success Criteria**:
- Validation catches errors
- Error messages helpful
- No crashes
- Data integrity maintained

---

## Summary

**Total Tasks**: 45 tasks across 8 phases

**Estimated Complexity**:
- Phase 1: Simple (database work)
- Phase 2: Moderate (parser logic)
- Phase 3: Moderate (first entity conversion)
- Phase 4: Simple (similar to Phase 3)
- Phase 5: Moderate (specialized template)
- Phase 6: Moderate (AI integration changes)
- Phase 7: Complex (UI components and editor)
- Phase 8: Simple (testing and polish)

**Dependencies**:
- Must complete phases in order
- Can parallelize some tasks within phases
- Testing tasks can run in parallel

**Next Steps**:
1. ✅ Plan created (MARKDOWN_ENTITIES_PLAN.md)
2. ✅ Tasks created (MARKDOWN_ENTITIES_TASKS.md)
3. ⏳ Review with user
4. ⏳ Context compaction
5. ⏳ Begin Phase 1 implementation

---

**Last Updated**: 2025-11-16
**Status**: Task Breakdown Complete, Ready for Implementation

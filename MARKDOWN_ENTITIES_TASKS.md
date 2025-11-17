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

### Task 7.1: Create MarkdownViewer Component
**Objective**: Beautiful read-only markdown rendering

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

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

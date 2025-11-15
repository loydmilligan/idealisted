# Context Pack: TypeScript Types Updates (Tag, AIFeatureSetting, Task Interfaces)

## Task Summary

**Goal**: Add three TypeScript interface updates to `types/index.ts`:
1. Add `Tag` interface matching the tags table schema
2. Add `AIFeatureSetting` interface matching the ai_feature_settings table (for future use)
3. Update existing `Task` interface to include `reminder_datetime?: number` and `last_notified_at?: number`

**Current State**: Types file exists with 21 interfaces but lacks standalone Tag and AIFeatureSetting types
**Target State**: Complete type definitions for all major database entities with notification fields for tasks

---

## How TypeScript Types Currently Work

### File Location & Structure
- **Primary Types File**: `/home/mmariani/Projects/idealisted/types/index.ts` (226 lines)
- **Global Types File**: `/home/mmariani/Projects/idealisted/types/global.d.ts` (minimal, used for ambient declarations)
- **Next.js Auto-Generated**: `/home/mmariani/Projects/idealisted/.next/types/` (generated, do not edit)

### Current Type Organization Pattern

The codebase follows a clear organizational pattern in types/index.ts:

1. **Core Entity Types** (lines 1-119):
   - `Item` - Base interface for all entities
   - `AISuggestion` - AI processing responses
   - `Todo` - Legacy todo entity
   - `Task` - Modern task entity (preferred over Todo)
   - `Note` - Detailed note entity
   - `List` - Collection entity
   - `ListItem` - Individual list items
   - `Project` - Project management entity
   - `Plan` - Daily plan aggregations

2. **Configuration Types** (lines 128-167):
   - `Setting` - Generic settings KV store
   - `RecurringRule` - Temporal configuration
   - `AIConfig` - AI system configuration
   - `NtfyConfig` - Notification service configuration
   - `AppearanceConfig` - Theme and UI configuration

3. **Composite/API Types** (lines 170-225):
   - `ItemWithRelations` - Item with all related entities
   - `PlanWithTodos` - Plan with populated todos
   - `CreateItemRequest` - API input shape
   - `UpdateItemRequest` - API input shape
   - `AIRequest` - AI service input
   - `AIResponse` - AI service output

### Database-to-TypeScript Pattern

Each database table has a corresponding TypeScript interface following this pattern:

#### Pattern Example 1: Task Interface
```typescript
// Database table: tasks (lib/db.ts:79-91)
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

// TypeScript interface: Task (types/index.ts:70-79)
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

**Mapping Rules**:
- `TEXT PRIMARY KEY` → `string` (required)
- `TEXT NOT NULL FOREIGN KEY` → `string` (required, no FK info in TS)
- `TEXT` → `string` (optional with `?`)
- `INTEGER` → `number` (optional with `?`)
- `TEXT DEFAULT` with CHECK → `'val1' | 'val2'` union type
- `TEXT` with JSON comment → `string[]` or `Record<string, any>` with comment
- No explicit null typing in interfaces (optionality via `?`)

#### Pattern Example 2: Project Interface
```typescript
// Database table: projects (lib/db.ts:133-146)
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

// TypeScript interface: Project (types/index.ts:108-118)
export interface Project {
  id: string
  item_id: string
  status: 'planning' | 'active' | 'completed'
  tags?: string[]
  deadline?: number
  description?: string
  progress: number
  start_date?: number
  end_date?: number
}
```

### Current Tags Table Definition (lib/db.ts:183-191)

The tags table already exists in the database with the following schema:

```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
  created_at INTEGER NOT NULL
)
```

**Plus added columns via ALTER TABLE** (from context-task-1-1):
- `usage_count INTEGER DEFAULT 0` - Usage tracking (added via migration)
- `is_default INTEGER DEFAULT 0` - Default tag flag (added via migration)
- `last_used_at INTEGER` - Last usage timestamp (added via migration)

### How Types Are Used in API Routes

#### Example 1: Creating Items (app/api/items/route.ts:1-150)
```typescript
// Line 3: Imports type
import { Item, CreateItemRequest, ItemWithRelations } from '@/types'

// Line 8: GET handler uses ItemWithRelations for response
const transformedItems: ItemWithRelations[] = items.map(row => {
  const item: ItemWithRelations = {
    id: row.id,
    type: row.type,
    text: row.text,
    created_at: row.created_at,
    // ... other fields
  }
  
  // Line 78: Nested Task object mapping
  if (row.task_id) {
    item.task = {
      id: row.task_id,
      item_id: row.id,
      status: row.task_status || 'pending',
      priority: row.task_priority || 1,
      tags: row.task_tags ? JSON.parse(row.task_tags) : [],
      estimated_time: row.estimated_time,
      project_id: row.project_id,
      due_date: row.task_due_date
    }
  }
  
  return item
})

// Returns ItemWithRelations[] as JSON
return NextResponse.json({ success: true, data: transformedItems })
```

**Key Pattern**: Database rows are mapped to TypeScript objects using explicit property assignments, with JSON parsing for complex fields.

#### Example 2: POST Request Validation (app/api/items/route.ts:POST handler)
```typescript
export async function POST(request: NextRequest) {
  // Request body type-checked against CreateItemRequest
  const body: CreateItemRequest = await request.json()
  
  // Type provides structure validation:
  // - type: required, must be Item['type']
  // - text: required, string
  // - task?: optional Task shape
  // - tags?: optional string array
}
```

### Type Imports & Module Pattern

All major components import from a single types file:

```typescript
// Pattern used throughout codebase
import { Item, Task, Note, Project, ItemWithRelations, CreateItemRequest } from '@/types'
// or
import type { Task, CreateItemRequest } from '@/types'  // Type-only import (preferred)
```

**Location of types imports**:
- API routes in `app/api/**/*.ts` - Import specific types needed
- React components in `components/**/*.tsx` - Import entity and config types
- Utility functions in `lib/**.ts` - Import types for parameter/return annotation

---

## Database Tables for New Types

### Tags Table (Already Exists)

**Current Status**: Table exists, schema complete with ALTER TABLE migrations
**Location**: `lib/db.ts:183-191` (CREATE) + migration ALTERs added in task 1-1

**Full Schema** (after ALTER TABLE migrations):
```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
  created_at INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0,        -- Added via ALTER TABLE
  is_default INTEGER DEFAULT 0,         -- Added via ALTER TABLE
  last_used_at INTEGER                  -- Added via ALTER TABLE
)

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC)
```

### AI Feature Settings Table (Future Table)

**Current Status**: Table does NOT exist yet - placeholder for future AI feature toggles
**Purpose**: Store per-feature AI toggle states (for more granular control than master toggle)

**Proposed Schema**:
```sql
CREATE TABLE IF NOT EXISTS ai_feature_settings (
  id TEXT PRIMARY KEY,
  feature_name TEXT UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 0,
  config TEXT,  -- JSON configuration for feature
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
```

**Planned Features** (examples):
- `parse_ideas` - Enable/disable idea parsing
- `tag_suggestions` - Enable/disable tag suggestions
- `rewrite_suggestions` - Enable/disable text rewriting
- `daily_plan_generation` - Enable/disable plan generation
- `speech_input` - Enable/disable voice input

### Tasks Table (Existing - Will Be Updated)

**Current Status**: Exists, needs addition of reminder/notification fields
**Location**: `lib/db.ts:79-91`

**Current Schema**:
```sql
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  priority INTEGER DEFAULT 1,
  tags TEXT,
  estimated_time INTEGER,
  project_id TEXT,
  due_date INTEGER,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
)
```

**Fields to Add**:
- `reminder_datetime INTEGER` - Unix timestamp for when to remind user
- `last_notified_at INTEGER` - Unix timestamp of last notification sent

---

## TypeScript Interface Design Patterns

### Pattern 1: Required vs Optional Fields

**Required fields** (no `?`):
- Primary keys: `id`
- Foreign keys: `item_id`
- Core entity fields: `name`, `text`, `status`
- Timestamps: `created_at`, `updated_at`

**Optional fields** (with `?`):
- Nullable database columns: `description`, `url`, `media_type`
- Fields with defaults that may be unset: `tags`, `estimated_time`
- Reminder/notification fields: `reminder_datetime`, `last_notified_at`

**Decision Rule**: "Will this field always have a meaningful value when the entity is created?"
- Yes → Required
- No → Optional

### Pattern 2: String Union Types

Used for enumerated values instead of string type:

```typescript
// ✅ Good: Strongly typed, autocomplete support, type safety
status: 'pending' | 'in-progress' | 'completed'
subtype: 'general' | 'research' | 'video' | 'link' | 'file' | 'contact' | 'meeting'
category: 'Work' | 'Personal' | 'Health' | 'Finance' | 'Other'

// ❌ Avoid: Loses type safety, no autocomplete
status: string
```

### Pattern 3: JSON Fields as Typed Properties

Database stores JSON strings, TypeScript shows typed objects:

```typescript
// In database: tags TEXT containing JSON string
// In SQL: tags = '["urgent", "feature"]'

// In TypeScript interface:
tags?: string[]  // Parsed array of strings

// In API handler:
tags: row.tags ? JSON.parse(row.tags) : []
```

### Pattern 4: Numeric Timestamps (Unix Milliseconds)

All timestamps are Unix milliseconds as numbers:

```typescript
created_at: number  // Unix milliseconds
updated_at?: number // Unix milliseconds
reminder_datetime?: number  // When reminder should fire
last_notified_at?: number   // When last notification was sent
```

**Why numbers**: Matches JavaScript Date.now() and database INTEGER type

### Pattern 5: No Null in Interfaces

TypeScript interfaces in this codebase don't use explicit `null` typing:

```typescript
// ✅ Correct pattern used in this codebase
field?: string  // May not be present (undefined)

// ❌ Not used in this codebase
field: string | null  // Explicitly null
field?: string | null  // Both undefined and null (uncommon)
```

**Reason**: Optional fields (`?`) implicitly allow undefined. Null is avoided in favor of undefined or omission.

---

## New Interfaces to Add

### 1. Tag Interface

**Location**: After `Setting` interface (around line 133), before `RecurringRule`

**Dependencies**:
- No dependencies on other custom types
- Matches tags table schema exactly (with ALTER TABLE additions)

**Interface Definition**:
```typescript
export interface Tag {
  id: string
  name: string
  color: string
  category: 'Work' | 'Personal' | 'Health' | 'Finance' | 'Other'
  created_at: number
  usage_count: number
  is_default: number  // 0 or 1 (SQLite boolean)
  last_used_at?: number
}
```

**Notes**:
- `color`: Hex code like `#FF5733` or color name
- `category`: Hardcoded options matching SQL CHECK constraint
- `is_default`: SQLite stores as 0/1 (could convert to boolean in JS but keeping as number for direct DB mapping)
- `last_used_at`: Optional because tags may never be used

**API Usage Locations**:
- `/app/api/tags/route.ts` - GET/POST/PUT/DELETE tag operations
- Response type for `GET /api/tags`
- Request body type for `POST /api/tags` (will need `Omit<Tag, 'id' | 'created_at' | 'usage_count' | 'last_used_at'>`)

### 2. AIFeatureSetting Interface

**Location**: After `AIConfig` interface (around line 151), before `NtfyConfig`

**Dependencies**:
- No dependencies on other custom types
- Designed for future ai_feature_settings table

**Interface Definition**:
```typescript
export interface AIFeatureSetting {
  id: string
  feature_name: string
  enabled: number  // 0 or 1 (SQLite boolean)
  config?: string  // JSON string with feature-specific configuration
  created_at: number
  updated_at: number
}
```

**Notes**:
- `feature_name`: Unique identifier like "parse_ideas", "tag_suggestions"
- `enabled`: SQLite integer (0/1) representing true/false
- `config`: Optional JSON string for feature-specific settings
- Similar pattern to `Setting` interface but with feature-specific fields

**Future API Usage** (not implemented yet):
- `/api/ai/features` - Manage individual AI feature toggles
- Separate from master `AIConfig.enabled` for granular control

### 3. Update Task Interface

**Location**: Existing at lines 70-79

**Current Definition**:
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

**Updated Definition**:
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
  reminder_datetime?: number  // NEW: Unix ms for reminder notification
  last_notified_at?: number   // NEW: Unix ms of last notification sent
}
```

**Notes**:
- Both new fields are optional (tasks may not have reminders)
- `reminder_datetime`: When the user should be reminded (check if current time >= this value)
- `last_notified_at`: Prevents duplicate notifications (check if already notified, only notify once per change)
- Field order: Maintain existing order, add new fields at end

**Database Mapping** (lib/db.ts tasks table will be updated):
```sql
-- Current: (lines 79-91)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  tags TEXT,
  estimated_time INTEGER,
  project_id TEXT,
  due_date INTEGER,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
)

-- Will add via ALTER TABLE:
-- reminder_datetime INTEGER
-- last_notified_at INTEGER
```

---

## Implementation Steps

### Step 1: Add Tag Interface

**File**: `/home/mmariani/Projects/idealisted/types/index.ts`
**Insert Position**: After line 132 (after `Setting` interface), before `RecurringRule`

**Find This Section** (lines 128-134):
```typescript
export interface Setting {
  key: string
  value: string
  updated_at: number
}

export interface RecurringRule {
```

**Insert New Code**:
```typescript
export interface Tag {
  id: string
  name: string
  color: string
  category: 'Work' | 'Personal' | 'Health' | 'Finance' | 'Other'
  created_at: number
  usage_count: number
  is_default: number
  last_used_at?: number
}

```

### Step 2: Add AIFeatureSetting Interface

**File**: `/home/mmariani/Projects/idealisted/types/index.ts`
**Insert Position**: After line 151 (after `AIConfig` interface), before `NtfyConfig`

**Find This Section** (lines 142-153):
```typescript
export interface AIConfig {
  enabled: boolean
  openrouterApiKey: string
  freeModel: string
  paidModel: string
  usePaidModel: boolean
  systemPrompt: string
  temperature: number
  maxTokens: number
}

export interface NtfyConfig {
```

**Insert New Code**:
```typescript
export interface AIFeatureSetting {
  id: string
  feature_name: string
  enabled: number
  config?: string
  created_at: number
  updated_at: number
}

```

### Step 3: Update Task Interface

**File**: `/home/mmariani/Projects/idealisted/types/index.ts`
**Update Position**: Lines 70-79 (existing Task interface)

**Current Code**:
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

**Replace With**:
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
  reminder_datetime?: number
  last_notified_at?: number
}
```

---

## Type Safety Patterns to Follow

### Pattern 1: Type-Only Imports
When using types in files that don't instantiate objects at runtime:

```typescript
// ✅ Use type-only import (smaller bundle)
import type { Task, Note, Project } from '@/types'

// ❌ Avoid regular import if only using for types
import { Task, Note, Project } from '@/types'
```

### Pattern 2: Omit Pattern for Request Types
When creating request types that exclude certain fields:

```typescript
// In types/index.ts
export interface CreateTagRequest extends Omit<Tag, 'id' | 'created_at' | 'usage_count' | 'last_used_at'> {}
// Resulting type: { name, color, category, is_default? }

// In API routes
async function createTag(req: CreateTagRequest) {
  const tag: Tag = {
    id: uuidv4(),
    created_at: Date.now(),
    usage_count: 0,
    last_used_at: undefined,
    ...req  // Spreads in the provided fields
  }
}
```

### Pattern 3: Conditional Type Narrowing
Checking interface fields before using them:

```typescript
function processTask(task: Task) {
  // If reminder_datetime is set, schedule notification
  if (task.reminder_datetime) {
    scheduleReminder(task.id, task.reminder_datetime)
  }
  
  // last_notified_at might be undefined
  if (task.last_notified_at && task.last_notified_at > Date.now() - 86400000) {
    // Already notified in last 24 hours
    return
  }
}
```

---

## File Locations & Context

### Types File Structure (After Changes)
```
/home/mmariani/Projects/idealisted/types/index.ts
├── Core Entity Types (lines 1-119)
│   ├── Item (lines 1-40)
│   ├── AISuggestion (lines 42-58)
│   ├── Todo (lines 60-68)
│   ├── Task (lines 70-79) ← UPDATE
│   ├── Note (lines 81-89)
│   ├── List (lines 91-97)
│   ├── ListItem (lines 99-106)
│   ├── Project (lines 108-118)
│   └── Plan (lines 120-126)
├── Configuration Types (lines 128-167)
│   ├── Setting (lines 128-132)
│   ├── Tag (lines 134-142) ← NEW
│   ├── RecurringRule (lines 144-150) [shifts by ~8 lines]
│   ├── AIConfig (lines 152-160) [shifts by ~8 lines]
│   ├── AIFeatureSetting (lines 162-168) ← NEW
│   ├── NtfyConfig (lines 170-176) [shifts by ~16 lines]
│   └── AppearanceConfig (lines 178-184) [shifts by ~16 lines]
└── API Types (lines 186+)
    ├── ItemWithRelations (lines 188+)
    ├── PlanWithTodos (lines 204+)
    ├── CreateItemRequest (lines 209+)
    ├── UpdateItemRequest (lines 219+)
    ├── AIRequest (lines 229+)
    └── AIResponse (lines 236+)
```

### Related Files Using Task Type

Files that will automatically benefit from Task interface updates:

1. **API Routes**:
   - `/app/api/items/route.ts` - GET returns Task objects
   - `/app/api/items/[id]/route.ts` - Update Task objects
   - `/app/api/items/convert/route.ts` - Convert items to Tasks

2. **React Components**:
   - `components/modern/EntityModal.tsx` - Display Task fields in form
   - `components/modern/TaskCard.tsx` - Display task data (if exists)
   - `components/TaskForm.tsx` - Edit task with reminder/notification fields

3. **Utility Functions**:
   - `lib/ai.ts` - May reference Task in AI suggestions
   - `lib/db.ts` - Queries returning tasks

---

## TypeScript Compilation Notes

### Strict Mode Compatibility

The project's `tsconfig.json` configuration determines type checking strictness. As of latest changes, strict mode is likely enabled, meaning:

- All parameters must have explicit types
- All properties must be typed
- Null/undefined must be explicitly handled
- Unused variables trigger errors

**Impact on New Interfaces**:
- All three new interfaces will be validated against strict mode
- Optional fields (`?`) are properly handled
- Union types for enums are required (no plain `string`)

### Type Checking in API Routes

When new fields are added to Task, API route handlers that map database rows to Task objects must include the new fields:

**Example (app/api/items/route.ts line 78-89)**:
Current code that would need update:
```typescript
if (row.task_id) {
  item.task = {
    id: row.task_id,
    item_id: row.id,
    status: row.task_status || 'pending',
    priority: row.task_priority || 1,
    tags: row.task_tags ? JSON.parse(row.task_tags) : [],
    estimated_time: row.estimated_time,
    project_id: row.project_id,
    due_date: row.task_due_date
    // WILL NEED: reminder_datetime and last_notified_at fields added
  }
}
```

After Task interface update, TypeScript will require:
```typescript
if (row.task_id) {
  item.task = {
    id: row.task_id,
    item_id: row.id,
    status: row.task_status || 'pending',
    priority: row.task_priority || 1,
    tags: row.task_tags ? JSON.parse(row.task_tags) : [],
    estimated_time: row.estimated_time,
    project_id: row.project_id,
    due_date: row.task_due_date,
    reminder_datetime: row.task_reminder_datetime,  // NEW
    last_notified_at: row.task_last_notified_at      // NEW
  }
}
```

---

## Validation Rules for New Interfaces

### Tag Interface Validation
- `name`: UNIQUE constraint in database, must not be empty
- `color`: Valid hex color (#RRGGBB) or named color
- `category`: Must be one of the five allowed values (enforced by union type)
- `created_at`: Must be positive integer (unix milliseconds)
- `usage_count`: Should be >= 0 (non-negative)
- `is_default`: Must be 0 or 1
- `last_used_at`: If present, must be > 0 (unix milliseconds)

### AIFeatureSetting Interface Validation
- `feature_name`: UNIQUE constraint, alphanumeric with underscores
- `enabled`: Must be 0 or 1
- `config`: If present, must be valid JSON string
- `created_at`, `updated_at`: Must be positive integers

### Task Interface Updates
- `reminder_datetime`: If set, should be > created_at of task
- `last_notified_at`: If set, should be > created_at of task
- Both optional, validated at API route level (not in type definition)

---

## Related Database Migrations

### Tasks Table Migration (Future)

When database schema is updated to add reminder fields:

**File**: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Location**: After tasks table CREATE (around line 91)

```typescript
// Migrate tasks table: add reminder fields (if they don't exist)
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

### Tags Table Already Updated
From prior task (1-1), tags table already has ALTER TABLE migrations for:
- `usage_count INTEGER DEFAULT 0`
- `is_default INTEGER DEFAULT 0`
- `last_used_at INTEGER`

---

## Implementation Checklist

- [ ] Open `/home/mmariani/Projects/idealisted/types/index.ts`
- [ ] Add Tag interface after Setting (line 132)
- [ ] Add AIFeatureSetting interface after AIConfig (line 151)
- [ ] Update Task interface with reminder and notification fields
- [ ] Verify TypeScript compilation with `npm run lint`
- [ ] Check for type errors in API routes using Task
- [ ] Test that Tag type is properly exported and importable
- [ ] Test that AIFeatureSetting type is properly exported

---

## Testing the Changes

### 1. TypeScript Compilation
```bash
cd /home/mmariani/Projects/idealisted
npm run lint  # Runs ESLint and TypeScript check
```

Should complete without errors related to types.

### 2. Type Exports
Verify types are properly exported:
```bash
node -e "const types = require('./types/index.ts'); console.log('Tag' in types, 'AIFeatureSetting' in types, 'Task' in types)"
```

### 3. Import in Test File
Create temporary test to verify imports work:
```typescript
import type { Task, Tag, AIFeatureSetting } from '@/types'

const tag: Tag = {
  id: 'test',
  name: 'urgent',
  color: '#FF0000',
  category: 'Work',
  created_at: Date.now(),
  usage_count: 5,
  is_default: 0
}

const task: Task = {
  id: 'task-1',
  item_id: 'item-1',
  status: 'pending',
  priority: 1,
  reminder_datetime: Date.now() + 86400000  // Tomorrow
}

const aiFeature: AIFeatureSetting = {
  id: 'feat-1',
  feature_name: 'parse_ideas',
  enabled: 1,
  created_at: Date.now(),
  updated_at: Date.now()
}
```

---

## Summary

This context pack provides complete information for adding three TypeScript interface definitions to the IdeaListed project:

1. **Tag Interface**: Matches the tags table schema including ALTER TABLE additions for usage tracking
2. **AIFeatureSetting Interface**: Prepares for future granular AI feature toggles
3. **Task Interface Update**: Adds reminder and notification timestamp fields

All three changes follow existing patterns in the codebase and maintain type safety. The changes are backward compatible and ready for future database migrations.

---

*This context pack generated for implementing Task 1.5 of Phase 1.*


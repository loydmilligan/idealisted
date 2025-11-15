# Context Pack: AI Feature Settings Table Implementation

## Task Summary
**Goal**: Create a new `ai_feature_settings` table in the IdeaListed SQLite database to manage individual AI feature toggles with descriptions, then seed it with 3 initial feature settings.

**Current State**: Settings table exists (used for AI config and other app settings), but no feature-level granularity
**Target State**: Dedicated table for per-feature AI feature toggles with seeding function

---

## Critical Discovery: Settings Table Architecture

The application already has a **generic settings table** (lib/db.ts:174-180):

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)
```

This is a key-value store for:
- `ai_config` - Master AI configuration (enabled, API key, model selection, temperature, etc.)
- `ntfy_config` - Notification service configuration
- `appearance_config` - Theme and UI preferences

**Current Usage Pattern**:
```typescript
// Getting settings (app/api/settings/route.ts:8-18)
const settings = db.prepare('SELECT key, value FROM settings').all() as any[]
const result: Record<string, any> = {}
settings.forEach(setting => {
  try {
    result[setting.key] = JSON.parse(setting.value)
  } catch {
    result[setting.key] = setting.value
  }
})

// Updating settings (app/api/settings/route.ts:67-75)
const updateSetting = db.prepare(`
  INSERT OR REPLACE INTO settings (key, value, updated_at)
  VALUES (?, ?, ?)
`)
for (const [key, value] of Object.entries(body)) {
  updateSetting.run(key, JSON.stringify(value), now)
}
```

**Why Create Separate Table**:
- Feature toggles need independent CRUD operations
- Each feature needs a description for UI display
- Boolean enabled state (vs. JSON string) is cleaner
- Features can be queried independently: "Get all enabled AI features"
- Seeding pattern clearer than generic key-value store

---

## How This Currently Works: AI Feature Architecture

### AI Master Toggle Implementation

The **master AI toggle** (AIConfig.enabled) controls overall AI functionality:

```typescript
// AIConfig interface (types/index.ts:142-151)
export interface AIConfig {
  enabled: boolean  // Master toggle - disables ALL AI features
  openrouterApiKey: string
  freeModel: string
  paidModel: string
  usePaidModel: boolean
  systemPrompt: string
  temperature: number
  maxTokens: number
}
```

When user disables AI in Settings:
1. Settings GET endpoint (app/api/settings/route.ts) creates default config with `enabled: false`
2. AIService checks `config.enabled` before processing (lib/ai.ts:59-60)
3. All AI UI elements hidden when disabled (from CLAUDE.md)

### Current AI Features (From lib/ai.ts)

The system currently supports these AI operations:

```typescript
// AIService methods (lib/ai.ts:183-234)
async parseIdea(text: string): Promise<AIResponse>
async convertIdea(text: string): Promise<AIResponse>
async suggestTags(text: string): Promise<AIResponse>
async rewriteText(text: string): Promise<AIResponse>
async suggestResearch(text: string): Promise<AIResponse>
async generatePlan(completedTodos, incompleteTodos, context): Promise<AIResponse>
async chat(prompt: string, systemMessage?: string): Promise<AIResponse>
```

**Problem**: All features are all-or-nothing. User can't disable just "tag suggestions" while keeping "idea parsing" enabled.

### New Feature Settings Architecture

We'll create a system to control individual features:

1. **`ai_feature_settings` table** - Store feature toggles
2. **Feature-aware AIService** - Check individual feature flags before processing
3. **Settings UI** - Display toggles for each feature with descriptions

---

## Database Schema & Initialization

### Current Table Creation Pattern (lib/db.ts)

All tables follow this pattern:

```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS table_name (
    id TEXT PRIMARY KEY,
    field1 TEXT NOT NULL,
    field2 INTEGER DEFAULT value,
    field3 TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (field) REFERENCES other_table(id) ON DELETE CASCADE
  )
`)
```

### Tags Table Reference (Similar Structure - lib/db.ts:183-191)

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

---

## AIService Integration Points

### Current getConfig() Method (lib/ai.ts:55-63)

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

**How We'll Extend It**:
After checking master toggle, also check individual feature settings:

```typescript
private async isFeatureEnabled(featureName: string): Promise<boolean> {
  const { db } = await import('@/lib/db')
  const result = db.prepare(
    'SELECT enabled FROM ai_feature_settings WHERE feature_name = ?'
  ).get(featureName) as any
  return result?.enabled === 1  // SQLite uses 0/1 for boolean
}
```

---

## SQLite Context: PRIMARY KEY vs FOREIGN KEY

### Why TEXT PRIMARY KEY for feature_name

```sql
CREATE TABLE ai_feature_settings (
  feature_name TEXT PRIMARY KEY,  -- Direct string key, like 'suggestion_panel'
  enabled BOOLEAN,                -- Feature is on/off
  description TEXT                -- Human-readable feature description
)
```

**Rationale**:
- Features don't need auto-incrementing IDs (they have semantic names)
- Feature names are stable identifiers (won't change)
- Simpler queries: `SELECT * FROM ai_feature_settings WHERE feature_name = 'tag_suggestions'`
- No foreign key relationships needed (features stand alone)

### SQLite BOOLEAN Handling

SQLite doesn't have native BOOLEAN type:

```typescript
// Correct: Use INTEGER 0/1
enabled INTEGER DEFAULT 0    // 0=false, 1=true

// Reading from DB:
const setting = db.prepare('SELECT enabled FROM ai_feature_settings WHERE feature_name = ?').get(name)
if (setting.enabled === 1) { /* enabled */ }

// Writing to DB:
db.prepare('INSERT INTO ai_feature_settings VALUES (?, ?, ?)').run('tag_suggestions', 1, 'AI tag recommendations')
```

---

## Seeding Function Pattern

### Settings Table Doesn't Have Seeds

The generic settings table uses lazy initialization in the GET endpoint (app/api/settings/route.ts:20-39):

```typescript
// Initialize AI config with default values if not present
if (!result.ai_config) {
  const defaultAIConfig: AIConfig = {
    enabled: false,
    openrouterApiKey: '',
    freeModel: 'meta-llama/llama-3.1-8b-instruct:free',
    paidModel: 'anthropic/claude-3.5-sonnet',
    usePaidModel: false,
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2000
  }
  
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run('ai_config', JSON.stringify(defaultAIConfig), Date.now())
  
  result.ai_config = defaultAIConfig
}
```

### Why We Need Explicit Seeds for ai_feature_settings

Unlike generic settings (which use INSERT OR REPLACE on-demand), feature settings need:
- All features defined from app startup
- Consistent default state across installations
- Fast lookups without initialization logic

**Seeding Strategy**:
- Create `seedAIFeatureSettings()` function in lib/db.ts
- Call it in `initializeDatabase()` after table creation
- Use `INSERT OR IGNORE` for idempotency (insert only if feature_name doesn't exist)

---

## Implementation Location & Exact Placement

### File: `/home/mmariani/Projects/idealisted/lib/db.ts`

**Current Tags Table** (lines 183-191):
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

**Current Indexes** (lines 194-202):
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

**INSERTION POINT**: After tags table creation (after line 191), before indexes section

Add these components:

1. **Table Creation** (lines 191-200):
```typescript
// AI Feature Settings table - individual feature toggles
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_feature_settings (
    feature_name TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    description TEXT NOT NULL
  )
`)
```

2. **Seeding Function** (lines 203-220, before indexes):
```typescript
// Seed AI feature settings with defaults
function seedAIFeatureSettings() {
  const features = [
    { name: 'suggestion_panel', enabled: 1, description: 'AI suggestion panel in idea capture' },
    { name: 'tag_suggestions', enabled: 1, description: 'Automatic tag recommendations' },
    { name: 'daily_summary', enabled: 0, description: 'Daily AI-generated summary of completed items' }
  ]
  
  const insertFeature = db.prepare(`
    INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
    VALUES (?, ?, ?)
  `)
  
  features.forEach(feature => {
    insertFeature.run(feature.name, feature.enabled, feature.description)
  })
}

// Call seeding function
seedAIFeatureSettings()
```

**Then existing indexes section starts** (line 221+)

---

## Seeding Function Detailed Explanation

### Why seedAIFeatureSettings() Function

**INSERT OR IGNORE Pattern**:
```typescript
const insertFeature = db.prepare(`
  INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
  VALUES (?, ?, ?)
`)

features.forEach(feature => {
  insertFeature.run(feature.name, feature.enabled, feature.description)
})
```

**Behavior**:
- Attempts to INSERT each feature
- If feature_name already exists (PRIMARY KEY conflict), silently ignores
- Idempotent: safe to run multiple times (dev restarts, migrations, etc.)
- Faster than checking if each feature exists first

**Alternative Pattern (Check First)**:
```typescript
// NOT recommended - less efficient
const existing = db.prepare('SELECT * FROM ai_feature_settings WHERE feature_name = ?').get(name)
if (!existing) {
  db.prepare('INSERT INTO ...').run(...)
}
```

### Three Initial Features & Defaults

```typescript
{ name: 'suggestion_panel', enabled: 1, description: 'AI suggestion panel in idea capture' }
```
- **Feature**: Shows AI suggestion panel when capturing ideas
- **Default**: ENABLED (enabled: 1)
- **Rationale**: Core feature for idea processing, user expects to see it

```typescript
{ name: 'tag_suggestions', enabled: 1, description: 'Automatic tag recommendations' }
```
- **Feature**: AI suggests tags for new items
- **Default**: ENABLED (enabled: 1)
- **Rationale**: Helps with organization, complements suggestion panel

```typescript
{ name: 'daily_summary', enabled: 0, description: 'Daily AI-generated summary of completed items' }
```
- **Feature**: AI generates summary of what was accomplished each day
- **Default**: DISABLED (enabled: 0)
- **Rationale**: Nice-to-have feature, not core, defaults off to reduce API calls

---

## Feature Queries & Usage Patterns

### Checking Individual Feature Status

```typescript
// In AIService or API routes
const featureSetting = db.prepare(
  'SELECT enabled FROM ai_feature_settings WHERE feature_name = ?'
).get('tag_suggestions') as any

if (featureSetting?.enabled === 1) {
  // Feature is enabled, proceed with tag suggestions
  const tags = await this.suggestTags(text)
}
```

### Getting All Features for UI

```typescript
// In Settings page to show feature toggles
const features = db.prepare(
  'SELECT * FROM ai_feature_settings ORDER BY feature_name'
).all() as any[]

// Returns:
[
  { feature_name: 'daily_summary', enabled: 0, description: '...' },
  { feature_name: 'suggestion_panel', enabled: 1, description: '...' },
  { feature_name: 'tag_suggestions', enabled: 1, description: '...' }
]
```

### Updating Feature Status (Future API)

```typescript
// PUT /api/ai-features/:name
db.prepare(
  'UPDATE ai_feature_settings SET enabled = ? WHERE feature_name = ?'
).run(enabled ? 1 : 0, featureName)
```

---

## SQLite & better-sqlite3 Reference

### prepared Statements with db.prepare()

**Pattern used in this codebase**:
```typescript
const stmt = db.prepare('SELECT * FROM table WHERE id = ?')
const row = stmt.get(id)           // Single row or undefined
const rows = stmt.all()            // Array of all rows
const result = stmt.run(value)     // For INSERT/UPDATE/DELETE
```

**For INSERT OR IGNORE**:
```typescript
const insertFeature = db.prepare(`
  INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
  VALUES (?, ?, ?)
`)

insertFeature.run('tag_suggestions', 1, 'Automatic tag recommendations')
```

- `?` placeholders prevent SQL injection
- `run()` returns `{ changes: number, lastInsertRowid: number }`
- INSERT OR IGNORE returns `changes: 0` if row already exists

### SQLite Type Affinity

```typescript
feature_name TEXT PRIMARY KEY        // String, unique identifier
enabled INTEGER DEFAULT 0             // Number: 0 or 1 for boolean
description TEXT NOT NULL             // String, required
```

**No BOOLEAN Type in SQLite**:
- Use `INTEGER` with values 0 (false) and 1 (true)
- Optional: Add CHECK constraint `CHECK (enabled IN (0, 1))`
- JavaScript comparison: `enabled === 1` or `Boolean(enabled)`

### db.exec() vs db.prepare()

**db.exec()** - Used in initializeDatabase():
```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_feature_settings (
    feature_name TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    description TEXT NOT NULL
  )
`)
```
- No return value
- Can execute multiple SQL statements
- Used for DDL (CREATE TABLE, CREATE INDEX, DROP TABLE)
- **NOT used for data operations**

**db.prepare()** - Used for queries:
```typescript
const stmt = db.prepare('SELECT * FROM ai_feature_settings')
const features = stmt.all()
```
- Returns prepared statement object
- Must call `.get()`, `.all()`, or `.run()` to execute
- Used for DML (SELECT, INSERT, UPDATE, DELETE)

---

## Implementation Details & Code Examples

### Complete Table Creation Code

```typescript
// AI Feature Settings table - individual feature toggles
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_feature_settings (
    feature_name TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    description TEXT NOT NULL
  )
`)
```

### Complete Seeding Function Code

```typescript
// Seed AI feature settings with defaults
function seedAIFeatureSettings() {
  const features = [
    { 
      name: 'suggestion_panel', 
      enabled: 1, 
      description: 'AI suggestion panel in idea capture' 
    },
    { 
      name: 'tag_suggestions', 
      enabled: 1, 
      description: 'Automatic tag recommendations' 
    },
    { 
      name: 'daily_summary', 
      enabled: 0, 
      description: 'Daily AI-generated summary of completed items' 
    }
  ]
  
  const insertFeature = db.prepare(`
    INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
    VALUES (?, ?, ?)
  `)
  
  features.forEach(feature => {
    insertFeature.run(feature.name, feature.enabled, feature.description)
  })
}

// Call seeding function after table creation
seedAIFeatureSettings()
```

### Updating the Migration Drop List (lib/db.ts:33-42)

The `initializeDatabase()` function's drop list needs to be updated if we want feature settings cleared on migration:

**Current** (lines 33-42):
```typescript
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
```

**Updated** (add ai_feature_settings):
```typescript
db.exec(`DROP TABLE IF EXISTS list_items`)
db.exec(`DROP TABLE IF EXISTS lists`)
db.exec(`DROP TABLE IF EXISTS projects`)
db.exec(`DROP TABLE IF EXISTS notes`)
db.exec(`DROP TABLE IF EXISTS todos`)
db.exec(`DROP TABLE IF EXISTS tasks`)
db.exec(`DROP TABLE IF EXISTS plans`)
db.exec(`DROP TABLE IF EXISTS ai_suggestions`)
db.exec(`DROP TABLE IF EXISTS ai_feature_settings`)  // ADD THIS LINE
db.exec(`DROP TABLE IF EXISTS settings`)
db.exec(`DROP TABLE IF EXISTS items`)
```

**Note**: This is NOT required for this implementation to work. It only matters if you're resetting the database. Feature settings will still be seeded correctly because of INSERT OR IGNORE.

---

## Integration with AIService (Future Implementation)

### How Feature Settings Will Be Used

```typescript
// In lib/ai.ts - extend AIService class
private async isFeatureEnabled(featureName: string): Promise<boolean> {
  try {
    const { db } = await import('@/lib/db')
    const result = db.prepare(
      'SELECT enabled FROM ai_feature_settings WHERE feature_name = ?'
    ).get(featureName) as any
    return result?.enabled === 1
  } catch (error) {
    console.error(`Failed to check feature ${featureName}:`, error)
    return false  // Default to disabled on error
  }
}

// Usage in feature methods
async suggestTags(text: string): Promise<AIResponse> {
  const isEnabled = await this.isFeatureEnabled('tag_suggestions')
  if (!isEnabled) {
    throw new Error('Tag suggestions feature is disabled')
  }
  return this.processRequest({
    type: 'tag',
    text,
    context: { operation: 'suggest_tags' }
  })
}
```

### Relationship to Master Toggle

The hierarchy:
1. **Master Toggle** (AIConfig.enabled): All AI OFF vs ON
2. **Feature Toggles** (ai_feature_settings): Individual features OFF vs ON
3. **Execution**: Check master first, then feature

```typescript
async processRequest(request: AIRequest): Promise<AIResponse> {
  const config = this.getConfig()  // Throws if AI disabled globally
  
  // Also check feature-specific toggle
  const isFeatureEnabled = await this.isFeatureEnabled(request.type)
  if (!isFeatureEnabled) {
    throw new Error(`Feature ${request.type} is disabled`)
  }
  
  // Proceed with request
  // ...
}
```

---

## Code Patterns from Existing Codebase

### Settings Table Pattern (app/api/settings/route.ts)

```typescript
// Getting all settings
const settings = db.prepare('SELECT key, value FROM settings').all() as any[]

// Updating single setting
db.prepare(`
  INSERT OR REPLACE INTO settings (key, value, updated_at)
  VALUES (?, ?, ?)
`).run('ai_config', JSON.stringify(config), Date.now())
```

### Table Creation Pattern (lib/db.ts)

```typescript
// Projects table (lines 133-146) - similar structure
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
    tags TEXT,
    deadline INTEGER,
    description TEXT,
    progress INTEGER DEFAULT 0,
    start_date INTEGER,
    end_date INTEGER,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )
`)
```

### Seeding/Initialization Pattern

The codebase DOES NOT have explicit seed files. Instead it uses:
1. **Lazy initialization** - Create defaults on first use (settings table)
2. **Test insert check** - Verify schema exists (migration logic)
3. **Our approach** - Explicit function called during initializeDatabase()

---

## Testing the Implementation

### Verify Table Creation

```bash
# In terminal, after running npm run dev
sqlite3 /home/mmariani/Projects/idealisted/data/idealisted.db

# List tables
.tables

# Show schema
.schema ai_feature_settings

# Expected output:
CREATE TABLE ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  description TEXT NOT NULL
);
```

### Verify Seeding

```bash
# Query the seeded features
SELECT * FROM ai_feature_settings;

# Expected output:
feature_name|enabled|description
suggestion_panel|1|AI suggestion panel in idea capture
tag_suggestions|1|Automatic tag recommendations
daily_summary|0|Daily AI-generated summary of completed items
```

### Verify Idempotency

Run the application multiple times (dev server restarts). The INSERT OR IGNORE prevents duplicate errors:

```bash
npm run dev  # Start 1st time - seeds 3 features
# ... make some code changes ...
npm run dev  # Start 2nd time - still has same 3 features, no errors
```

### Database File Verification

```bash
# Check database exists
ls -lh /home/mmariani/Projects/idealisted/data/idealisted.db

# Check size increased (new table + data)
# Should be a few KB larger than before

# Check WAL files created by SQLite
ls -lh /home/mmariani/Projects/idealisted/data/idealisted.db-*
```

---

## File Locations & References

### Primary Implementation File
- **File**: `/home/mmariani/Projects/idealisted/lib/db.ts`
- **Lines**: Insert after 191 (after tags table), before 194 (indexes)

### Related Files for Context
- `/home/mmariani/Projects/idealisted/types/index.ts` - AIConfig interface (142-151)
- `/home/mmariani/Projects/idealisted/lib/ai.ts` - AIService class
- `/home/mmariani/Projects/idealisted/app/api/settings/route.ts` - Settings API
- `/home/mmariani/Projects/idealisted/data/idealisted.db` - Database file (created on first run)

### Future Implementation Files (After This Task)
- `/home/mmariani/Projects/idealisted/app/api/ai-features/route.ts` - API for managing features
- `/home/mmariani/Projects/idealisted/components/AIFeaturesSettings.tsx` - Settings UI component
- `/home/mmariani/Projects/idealisted/lib/ai.ts` - Update AIService to check feature flags

---

## Summary Checklist

- [ ] Add table creation for `ai_feature_settings` after line 191 in lib/db.ts
- [ ] Add `seedAIFeatureSettings()` function after table creation
- [ ] Verify table uses TEXT PRIMARY KEY (not auto-incrementing id)
- [ ] Verify enabled field uses INTEGER (0/1) not boolean
- [ ] Verify description field is NOT NULL
- [ ] Seed exactly 3 features: suggestion_panel (enabled), tag_suggestions (enabled), daily_summary (disabled)
- [ ] Use INSERT OR IGNORE for idempotency
- [ ] Call seedAIFeatureSettings() in initializeDatabase()
- [ ] Optional: Add ai_feature_settings to DROP TABLE list (line 40)
- [ ] Test with sqlite3 to verify data
- [ ] Verify multiple app restarts don't cause errors

---

## Complete Implementation Code Block

**Location**: `/home/mmariani/Projects/idealisted/lib/db.ts` - After line 191

```typescript
  // AI Feature Settings table - individual feature toggles
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_feature_settings (
      feature_name TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      description TEXT NOT NULL
    )
  `)

  // Seed AI feature settings with defaults
  function seedAIFeatureSettings() {
    const features = [
      { 
        name: 'suggestion_panel', 
        enabled: 1, 
        description: 'AI suggestion panel in idea capture' 
      },
      { 
        name: 'tag_suggestions', 
        enabled: 1, 
        description: 'Automatic tag recommendations' 
      },
      { 
        name: 'daily_summary', 
        enabled: 0, 
        description: 'Daily AI-generated summary of completed items' 
      }
    ]
    
    const insertFeature = db.prepare(`
      INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
      VALUES (?, ?, ?)
    `)
    
    features.forEach(feature => {
      insertFeature.run(feature.name, feature.enabled, feature.description)
    })
  }

  // Call seeding function
  seedAIFeatureSettings()
```

---

## Important Notes & Gotchas

### 1. INSERT OR IGNORE Idempotency
```typescript
// Safe to run multiple times
insertFeature.run('suggestion_panel', 1, '...')
insertFeature.run('suggestion_panel', 1, '...')  // Second run ignored, no error
```

### 2. Boolean as INTEGER
```typescript
// Correct way to check
if (result.enabled === 1) { /* true */ }

// DO NOT use:
if (result.enabled) { /* might work due to truthiness, but unsafe */ }
if (result.enabled === true) { /* wrong, it's 0 or 1 */ }
```

### 3. TEXT PRIMARY KEY vs Auto-Increment
- We use feature_name as PRIMARY KEY (not auto-id)
- This is correct because feature names are semantic and stable
- No need for id field
- Simpler queries and no accidental duplicate names

### 4. Description NOT NULL
- Every feature must have a description for UI display
- Can't leave it blank
- Descriptions should explain what the feature does

### 5. Order of Execution
- Table created: `CREATE TABLE IF NOT EXISTS` (safe, idempotent)
- Seeding function defined: `function seedAIFeatureSettings() { ... }`
- Seeding executed: `seedAIFeatureSettings()` (call the function)
- This order matters - function must be defined before calling

### 6. Database File Location
- Development: `/home/mmariani/Projects/idealisted/data/idealisted.db`
- Created automatically on first import of lib/db.ts
- WAL mode creates companion files: `.db-wal` and `.db-shm`
- All files are in `data/` directory which is gitignored

---

## Expected Final Schema

```sql
CREATE TABLE ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  description TEXT NOT NULL
);

-- Data:
-- ('suggestion_panel', 1, 'AI suggestion panel in idea capture')
-- ('tag_suggestions', 1, 'Automatic tag recommendations')
-- ('daily_summary', 0, 'Daily AI-generated summary of completed items')
```

---

## Related Architecture Notes

### Settings Table vs Feature Settings Table

**Settings Table** (existing):
- Generic key-value store
- Stores JSON values (AI config, theme config, etc.)
- Used for user-configurable app settings
- Lazy initialization on first access
- Example: `{ key: 'ai_config', value: '{"enabled": false, ...}' }`

**Feature Settings Table** (new):
- Dedicated to AI feature toggles
- Simple boolean enabled/disabled per feature
- Seeded with defaults on app startup
- Easy to query: "Which features are enabled?"
- Per-feature descriptions for UI
- Example: `{ feature_name: 'tag_suggestions', enabled: 1, description: '...' }`

### Why Not Just Add to AIConfig

**AIConfig** (current master toggle):
```typescript
{
  enabled: boolean,           // Master switch
  openrouterApiKey: string,  // Credentials
  freeModel: string,         // Model selection
  paidModel: string,
  usePaidModel: boolean,
  systemPrompt: string,      // Prompting
  temperature: number,       // Parameters
  maxTokens: number
}
```

If we added feature toggles here:
```typescript
{
  enabled: boolean,
  ...
  features: {                // Would need to add this
    suggestion_panel: boolean,
    tag_suggestions: boolean,
    daily_summary: boolean
  }
}
```

**Problems**:
- Mixes credentials with feature toggles
- Would need to parse JSON for each feature check
- Harder to scale to more features
- Can't query features independently

**Benefit of separate table**:
- Clean separation of concerns
- Fast direct lookups
- Easy to add/remove features
- Can manage features separately from credentials

---

*This context pack generated for implementing Step 1.4 of the AI Feature Settings implementation plan. It provides complete architecture, code patterns, and integration points for creating the ai_feature_settings table with seeded data.*


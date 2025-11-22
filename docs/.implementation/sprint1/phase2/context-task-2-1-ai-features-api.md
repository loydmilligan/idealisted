# Context Pack: AI Feature Settings API Implementation

## Task Summary
**Goal**: Create REST API endpoints (`/api/ai-features`) to manage the `ai_feature_settings` table with GET and PUT operations for granular AI feature control.

**Current State**: 
- `ai_feature_settings` table exists (Phase 1 complete)
- Seeded with 3 features: suggestion_panel, tag_suggestions, daily_summary
- No API endpoint to access/modify these settings

**Target State**: 
- GET `/api/ai-features` returns all feature settings
- PUT `/api/ai-features` updates feature enabled status
- API follows existing Next.js App Router patterns

---

## Critical Context: ai_feature_settings Table

### Database Schema (from lib/db.ts:303-309)

```sql
CREATE TABLE IF NOT EXISTS ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  description TEXT NOT NULL
)
```

**Key Details**:
- **feature_name**: TEXT PRIMARY KEY - Unique identifier (e.g., "suggestion_panel")
- **enabled**: INTEGER (0 or 1) - SQLite boolean (0 = disabled, 1 = enabled)
- **description**: TEXT - Human-readable feature description for UI display

### Seeded Data (from lib/db.ts:82-116)

Three features are auto-seeded on database initialization:

```typescript
const features = [
  {
    name: 'suggestion_panel',
    enabled: 1,
    description: 'Preview AI analysis before creating items'
  },
  {
    name: 'tag_suggestions',
    enabled: 1,
    description: 'AI-powered tag recommendations'
  },
  {
    name: 'daily_summary',
    enabled: 0,
    description: 'AI summary in daily review notifications'
  },
]
```

**Default States**:
- ✅ suggestion_panel: ENABLED (1)
- ✅ tag_suggestions: ENABLED (1)
- ❌ daily_summary: DISABLED (0)

---

## How This Currently Works: Settings API Pattern

### Existing Settings API (app/api/settings/route.ts)

The application has a **generic settings API** that manages the `settings` table (key-value store for ai_config, ntfy_config, appearance_config). Our new endpoint will follow the same architectural patterns.

#### GET /api/settings Pattern (lines 6-59)

```typescript
export async function GET() {
  try {
    const settings = db.prepare('SELECT key, value FROM settings').all() as any[]

    const result: Record<string, any> = {}

    settings.forEach(setting => {
      try {
        result[setting.key] = JSON.parse(setting.value)
      } catch {
        result[setting.key] = setting.value
      }
    })

    return NextResponse.json({ settings: result })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
```

**Key Patterns**:
1. ✅ Simple SELECT query with `.all()` for multiple rows
2. ✅ Transform database rows into JSON response
3. ✅ Try/catch with error logging
4. ✅ Return `{ success: true, data }` OR `{ error: string, status: 500 }`
5. ✅ JSON.parse for stored JSON values (settings table stores JSON strings)

#### PUT /api/settings Pattern (lines 62-82)

```typescript
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const now = Date.now()

    const updateSetting = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `)

    // Update each setting
    for (const [key, value] of Object.entries(body)) {
      updateSetting.run(key, JSON.stringify(value), now)
    }

    return NextResponse.json({ success: true, settings: body })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
```

**Key Patterns**:
1. ✅ Parse request body with `await request.json()`
2. ✅ Use prepared statements for safety
3. ✅ Use `INSERT OR REPLACE` for upsert semantics
4. ✅ Iterate over body entries for bulk updates
5. ✅ Return success flag with updated data

---

## How This Currently Works: Database Access Patterns

### better-sqlite3 API Usage

The app uses **synchronous** better-sqlite3 API (NOT async):

```typescript
import { db } from '@/lib/db'

// SELECT all rows
const rows = db.prepare('SELECT * FROM table').all() as RowType[]

// SELECT single row
const row = db.prepare('SELECT * FROM table WHERE id = ?').get(id) as RowType | undefined

// INSERT/UPDATE (returns info object)
const info = db.prepare('INSERT INTO table (col) VALUES (?)').run(value)

// UPDATE with multiple params
db.prepare('UPDATE table SET col1 = ?, col2 = ? WHERE id = ?').run(val1, val2, id)
```

**Critical**: These are **synchronous** methods (no await needed in Next.js route handlers)

### Tags API Example (app/api/tags/route.ts)

Similar pattern - let's examine for consistency:

#### GET /api/tags (lines 21-79)

```typescript
export async function GET() {
  try {
    // Query database
    const tagMetadata = db.prepare(`
      SELECT id, name, color, category, created_at FROM tags
    `).all() as TagMetadata[]

    // Transform data
    const tags: TagInfo[] = // ... transformation logic

    return NextResponse.json({
      success: true,
      tags
    })
  } catch (error) {
    console.error('Failed to get tags:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve tags' },
      { status: 500 }
    )
  }
}
```

**Patterns to Adopt**:
1. ✅ `success: true/false` in response body
2. ✅ Named data field (`tags`, not generic `data`)
3. ✅ Descriptive error messages
4. ✅ Console logging before error response

#### PUT /api/tags Pattern (lines 150-252)

```typescript
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { oldName, newName, color, category } = body

    // Validation
    if (!oldName || !newName) {
      return NextResponse.json(
        { success: false, error: 'oldName and newName are required' },
        { status: 400 }
      )
    }

    // Use transaction for atomic updates
    const updateTag = db.transaction(() => {
      // ... multi-step updates
      return updatedCount
    })

    const updatedCount = updateTag()

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} items`,
      updatedCount
    })
  } catch (error) {
    console.error('Failed to rename tag:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to rename tag' },
      { status: 500 }
    )
  }
}
```

**Patterns to Adopt**:
1. ✅ Destructure request body for cleaner code
2. ✅ Early validation with 400 status
3. ✅ Use transactions for multi-step operations
4. ✅ Return metadata about changes (`updatedCount`, `message`)

---

## What Needs to Connect: AI Feature Settings API

### GET /api/ai-features - Fetch All Features

**Purpose**: Return all AI feature settings for Settings UI display

**Requirements**:
- Query all rows from `ai_feature_settings` table
- Return array of `{ feature_name, enabled, description }`
- enabled should be number (0 or 1) as stored in SQLite
- No transformation needed (direct database → JSON)

**Response Format**:
```typescript
{
  success: true,
  features: [
    {
      feature_name: "suggestion_panel",
      enabled: 1,
      description: "Preview AI analysis before creating items"
    },
    {
      feature_name: "tag_suggestions",
      enabled: 1,
      description: "AI-powered tag recommendations"
    },
    {
      feature_name: "daily_summary",
      enabled: 0,
      description: "AI summary in daily review notifications"
    }
  ]
}
```

**Error Cases**:
- Database query failure → 500 Internal Server Error
- Empty results are valid (return empty array)

### PUT /api/ai-features - Update Feature(s)

**Purpose**: Update enabled status for one or more features

**Request Body Options**:

**Option A: Single Feature Update**
```json
{
  "feature_name": "tag_suggestions",
  "enabled": 0
}
```

**Option B: Bulk Feature Update**
```json
{
  "features": [
    { "feature_name": "suggestion_panel", "enabled": 1 },
    { "feature_name": "tag_suggestions", "enabled": 0 }
  ]
}
```

**Requirements**:
- Validate feature_name exists (prevent creating invalid features)
- Validate enabled is 0 or 1
- Use prepared statement with `UPDATE` (NOT INSERT OR REPLACE)
- Return updated feature(s) in response

**Response Format**:
```typescript
{
  success: true,
  updated: [
    {
      feature_name: "tag_suggestions",
      enabled: 0,
      description: "AI-powered tag recommendations"
    }
  ]
}
```

**Error Cases**:
- Missing feature_name → 400 Bad Request
- Invalid enabled value (not 0 or 1) → 400 Bad Request
- Feature doesn't exist → 404 Not Found
- Database error → 500 Internal Server Error

---

## Technical Reference Details

### TypeScript Interface (types/index.ts:166-170)

```typescript
export interface AIFeatureSetting {
  feature_name: string
  enabled: number          // SQLite boolean (0 or 1)
  description: string
}
```

**Usage in API**:
```typescript
import { AIFeatureSetting } from '@/types'

const features = db.prepare(
  'SELECT feature_name, enabled, description FROM ai_feature_settings'
).all() as AIFeatureSetting[]
```

### Database Import Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AIFeatureSetting } from '@/types'
```

**Critical**: `db` is already initialized singleton from lib/db.ts (no initialization needed)

### SQL Query Patterns

**Get All Features**:
```typescript
const features = db.prepare(`
  SELECT feature_name, enabled, description 
  FROM ai_feature_settings
  ORDER BY feature_name ASC
`).all() as AIFeatureSetting[]
```

**Update Single Feature**:
```typescript
const result = db.prepare(`
  UPDATE ai_feature_settings 
  SET enabled = ? 
  WHERE feature_name = ?
`).run(enabled, feature_name)

// Check if feature exists
if (result.changes === 0) {
  // Feature not found
}
```

**Check Feature Exists**:
```typescript
const feature = db.prepare(`
  SELECT feature_name FROM ai_feature_settings WHERE feature_name = ?
`).get(feature_name) as AIFeatureSetting | undefined

if (!feature) {
  return NextResponse.json(
    { success: false, error: 'Feature not found' },
    { status: 404 }
  )
}
```

---

## File Structure & Implementation

### File to Create

**Path**: `app/api/ai-features/route.ts`

**Location Context**:
- Sibling to `app/api/settings/route.ts`
- Sibling to `app/api/tags/route.ts`
- Follows Next.js 14 App Router conventions

### Next.js App Router API Conventions

**Handler Exports**:
```typescript
// GET endpoint
export async function GET(request: NextRequest) { }

// PUT endpoint  
export async function PUT(request: NextRequest) { }

// POST endpoint (if needed)
export async function POST(request: NextRequest) { }
```

**URL Access**:
- File: `app/api/ai-features/route.ts`
- URL: `http://localhost:3000/api/ai-features`
- GET: `GET /api/ai-features`
- PUT: `PUT /api/ai-features`

---

## Complete Implementation Examples

### GET /api/ai-features - Complete Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AIFeatureSetting } from '@/types'

export async function GET() {
  try {
    const features = db.prepare(`
      SELECT feature_name, enabled, description 
      FROM ai_feature_settings
      ORDER BY feature_name ASC
    `).all() as AIFeatureSetting[]

    return NextResponse.json({
      success: true,
      features
    })
  } catch (error) {
    console.error('Error fetching AI feature settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI feature settings' },
      { status: 500 }
    )
  }
}
```

**Key Points**:
- ✅ Simple query with ORDER BY for consistent UI display
- ✅ Type assertion to AIFeatureSetting[]
- ✅ Named `features` field (not generic `data`)
- ✅ Error logging before response

### PUT /api/ai-features - Complete Implementation

```typescript
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Support both single feature and bulk update
    const updates = Array.isArray(body.features) 
      ? body.features 
      : [{ feature_name: body.feature_name, enabled: body.enabled }]

    // Validation
    for (const update of updates) {
      if (!update.feature_name) {
        return NextResponse.json(
          { success: false, error: 'feature_name is required' },
          { status: 400 }
        )
      }

      if (update.enabled !== 0 && update.enabled !== 1) {
        return NextResponse.json(
          { success: false, error: 'enabled must be 0 or 1' },
          { status: 400 }
        )
      }
    }

    // Update features
    const updateStmt = db.prepare(`
      UPDATE ai_feature_settings 
      SET enabled = ? 
      WHERE feature_name = ?
    `)

    const updated: AIFeatureSetting[] = []

    for (const update of updates) {
      const result = updateStmt.run(update.enabled, update.feature_name)

      if (result.changes === 0) {
        return NextResponse.json(
          { success: false, error: `Feature not found: ${update.feature_name}` },
          { status: 404 }
        )
      }

      // Fetch updated feature
      const feature = db.prepare(`
        SELECT feature_name, enabled, description 
        FROM ai_feature_settings 
        WHERE feature_name = ?
      `).get(update.feature_name) as AIFeatureSetting

      updated.push(feature)
    }

    return NextResponse.json({
      success: true,
      updated
    })
  } catch (error) {
    console.error('Error updating AI feature settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update AI feature settings' },
      { status: 500 }
    )
  }
}
```

**Key Points**:
- ✅ Supports both single and bulk updates
- ✅ Validates all fields before database operations
- ✅ Checks if feature exists (404 if not found)
- ✅ Returns updated features with descriptions
- ✅ Error handling with descriptive messages

---

## Testing & Verification

### Manual Testing with curl

**Test GET endpoint**:
```bash
curl http://localhost:3000/api/ai-features
```

**Expected Response**:
```json
{
  "success": true,
  "features": [
    {
      "feature_name": "daily_summary",
      "enabled": 0,
      "description": "AI summary in daily review notifications"
    },
    {
      "feature_name": "suggestion_panel",
      "enabled": 1,
      "description": "Preview AI analysis before creating items"
    },
    {
      "feature_name": "tag_suggestions",
      "enabled": 1,
      "description": "AI-powered tag recommendations"
    }
  ]
}
```

**Test PUT endpoint (single feature)**:
```bash
curl -X PUT http://localhost:3000/api/ai-features \
  -H "Content-Type: application/json" \
  -d '{"feature_name": "tag_suggestions", "enabled": 0}'
```

**Expected Response**:
```json
{
  "success": true,
  "updated": [
    {
      "feature_name": "tag_suggestions",
      "enabled": 0,
      "description": "AI-powered tag recommendations"
    }
  ]
}
```

**Test PUT endpoint (bulk update)**:
```bash
curl -X PUT http://localhost:3000/api/ai-features \
  -H "Content-Type: application/json" \
  -d '{
    "features": [
      {"feature_name": "suggestion_panel", "enabled": 0},
      {"feature_name": "tag_suggestions", "enabled": 1}
    ]
  }'
```

**Test Error Cases**:

```bash
# Missing feature_name (400)
curl -X PUT http://localhost:3000/api/ai-features \
  -H "Content-Type: application/json" \
  -d '{"enabled": 1}'

# Invalid enabled value (400)
curl -X PUT http://localhost:3000/api/ai-features \
  -H "Content-Type: application/json" \
  -d '{"feature_name": "tag_suggestions", "enabled": 2}'

# Non-existent feature (404)
curl -X PUT http://localhost:3000/api/ai-features \
  -H "Content-Type: application/json" \
  -d '{"feature_name": "nonexistent", "enabled": 1}'
```

### Database Verification

**Check current state**:
```bash
# SQLite CLI
sqlite3 data/idealisted.db "SELECT * FROM ai_feature_settings"
```

**Verify persistence across server restarts**:
1. Start dev server: `npm run dev`
2. Update feature via API
3. Stop server (Ctrl+C)
4. Restart server
5. GET features - should show persisted changes

---

## Integration Points

### Where This API Will Be Used

**Task 2.2: AISettingsTab Component**:
```typescript
// components/modern/settings/AISettingsTab.tsx
const [features, setFeatures] = useState<AIFeatureSetting[]>([])

// Load features on mount
useEffect(() => {
  fetch('/api/ai-features')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setFeatures(data.features)
      }
    })
}, [])

// Update feature
const updateFeature = async (feature_name: string, enabled: number) => {
  const res = await fetch('/api/ai-features', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature_name, enabled })
  })
  
  const data = await res.json()
  if (data.success) {
    // Update local state
    setFeatures(prev => prev.map(f => 
      f.feature_name === feature_name 
        ? data.updated[0] 
        : f
    ))
  }
}
```

**Task 2.3: AIService Feature Checking**:
```typescript
// lib/ai.ts
async isFeatureEnabled(featureName: string): Promise<boolean> {
  const { db } = await import('@/lib/db')
  const feature = db.prepare(
    'SELECT enabled FROM ai_feature_settings WHERE feature_name = ?'
  ).get(featureName) as { enabled: number } | undefined
  
  return feature?.enabled === 1
}
```

---

## Success Criteria Checklist

### Functional Requirements
- [ ] GET `/api/ai-features` returns all 3 seeded features
- [ ] Features returned in consistent order (alphabetical)
- [ ] PUT updates single feature correctly
- [ ] PUT supports bulk updates (optional but recommended)
- [ ] Database changes persist across server restarts
- [ ] Validation prevents invalid feature names
- [ ] Validation prevents invalid enabled values

### Error Handling
- [ ] 400 Bad Request for missing/invalid parameters
- [ ] 404 Not Found for non-existent features
- [ ] 500 Internal Server Error for database failures
- [ ] All errors logged to console
- [ ] Error messages are descriptive

### Code Quality
- [ ] Follows existing API patterns (settings, tags)
- [ ] Uses TypeScript types from types/index.ts
- [ ] Prepared statements for SQL safety
- [ ] Consistent response format with success flag
- [ ] Clean, readable code with comments

### Testing
- [ ] Manual testing with curl passes
- [ ] Can toggle features on/off successfully
- [ ] Changes visible in database
- [ ] No console errors during normal operation

---

## Common Pitfalls to Avoid

### SQLite Integer vs JavaScript Boolean
❌ **Wrong**:
```typescript
body: JSON.stringify({ enabled: true })  // JavaScript boolean
```

✅ **Correct**:
```typescript
body: JSON.stringify({ enabled: 1 })  // SQLite integer
```

### Async/Await with better-sqlite3
❌ **Wrong**:
```typescript
const features = await db.prepare('SELECT ...').all()  // NO await!
```

✅ **Correct**:
```typescript
const features = db.prepare('SELECT ...').all()  // Synchronous
```

### Missing Type Assertions
❌ **Wrong**:
```typescript
const features = db.prepare('SELECT ...').all()  // any[]
```

✅ **Correct**:
```typescript
const features = db.prepare('SELECT ...').all() as AIFeatureSetting[]
```

### Inconsistent Response Format
❌ **Wrong**:
```typescript
return NextResponse.json({ data: features })  // Generic field name
```

✅ **Correct**:
```typescript
return NextResponse.json({ success: true, features })  // Named field
```

---

## References & Documentation

### Project Files
- Database schema: `lib/db.ts` (lines 303-309, 82-116)
- Type definitions: `types/index.ts` (lines 166-170)
- Settings API pattern: `app/api/settings/route.ts`
- Tags API pattern: `app/api/tags/route.ts`
- Task specification: `AI_AND_NTFY_TASKS.md` (lines 51-68)
- Phase 2 plan: `docs/.implementation/phase2/PHASE_2_PLAN.md`

### External Documentation
- Next.js 14 Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- better-sqlite3 API: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- SQLite INTEGER type: https://www.sqlite.org/datatype3.html

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read this entire context document
- [ ] Examine `app/api/settings/route.ts` for pattern reference
- [ ] Examine `app/api/tags/route.ts` for validation patterns
- [ ] Verify ai_feature_settings table exists (should be auto-created)

### Implementation Steps
1. [ ] Create `app/api/ai-features/route.ts`
2. [ ] Add imports (NextRequest, NextResponse, db, AIFeatureSetting)
3. [ ] Implement GET handler
4. [ ] Implement PUT handler with validation
5. [ ] Add error handling and logging
6. [ ] Test with curl commands
7. [ ] Verify database persistence

### Post-Implementation
- [ ] All curl tests pass
- [ ] Database updates visible in SQLite
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Ready for Task 2.2 (UI integration)

---

**Task Complete When**: 
- GET and PUT endpoints work correctly
- All validation and error handling implemented
- Manual testing passes
- Code follows project patterns
- Ready for UI integration in Task 2.2

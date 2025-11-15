# Task 1.4: Create AI Feature Settings Table

## Objective
Create a new `ai_feature_settings` table to store individual AI feature toggles (separate from the main ai_config in settings table). Seed with 3 default features: suggestion_panel, tag_suggestions, and daily_summary.

## Context Bundle
See `docs/.implementation/phase1/context-task-1-4-ai-settings-table.md` for complete implementation context including:
- Table schema design
- Settings table patterns
- Seeding approach with INSERT OR IGNORE
- Library documentation

## Implementation Instructions

### 1. Create Table
**File**: `lib/db.ts`
**Location**: After settings table CREATE statement (around line 62), before projects table

Add this table creation:

```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_feature_settings (
    feature_name TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    description TEXT NOT NULL
  )
`)
```

### 2. Create Seeding Function
**File**: `lib/db.ts`
**Location**: Before `initializeDatabase()` function (near seedDefaultTags function)

Add this function:

```typescript
function seedAIFeatureSettings() {
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

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
      VALUES (?, ?, ?)
    `)

    features.forEach(feature => {
      insert.run(feature.name, feature.enabled, feature.description)
    })

    console.log('Seeded AI feature settings')
  } catch (error) {
    console.warn('Failed to seed AI feature settings:', error)
    // Don't throw - let app continue
  }
}
```

### 3. Call Seeding Function
**File**: `lib/db.ts`
**Location**: End of `initializeDatabase()` function (after seedDefaultTags call)

Add this call:

```typescript
  seedAIFeatureSettings()
```

### 4. Verification Steps

After implementation:
1. Delete `data/idealisted.db`
2. Run `npm run dev`
3. Check console for "Seeded AI feature settings" message
4. Verify table and data:
   ```bash
   sqlite3 data/idealisted.db "SELECT * FROM ai_feature_settings;"
   ```
   Should show 3 features
5. Stop and restart dev server
6. Verify no duplicates (still 3 features)

### 5. Important Notes
- **CREATE TABLE IF NOT EXISTS** - Idempotent table creation
- **INSERT OR IGNORE** - Prevents duplicate seeding
- **Primary key** - feature_name is unique identifier
- **Default values** - suggestion_panel and tag_suggestions enabled by default, daily_summary disabled
- **Separate from ai_config** - Master toggle stays in settings table, this is for individual features

## Success Criteria
- [ ] ai_feature_settings table created
- [ ] 3 features seeded on first start
- [ ] No duplicates on subsequent starts
- [ ] Console shows success message
- [ ] Table schema matches design

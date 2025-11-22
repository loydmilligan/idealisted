# Task 1.2: Seed Default Starter Tags

## Objective
Create a seeding function that inserts 25 default starter tags into the database on first app initialization. The function must be idempotent (safe to run multiple times).

## Context Bundle
See `docs/.implementation/phase1/context-task-1-2-seed-tags.md` for complete implementation context including:
- 25 default tags organized by category (Work, Personal, Project Management, Categories)
- Database patterns and prepared statements
- Idempotency strategy
- Error handling approach

## Implementation Instructions

### 1. Create Seeding Function
**File**: `lib/db.ts`
**Location**: Before `initializeDatabase()` function (around line 19)

Add this function:

```typescript
function seedDefaultTags() {
  // Check if tags already exist (idempotent)
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
  if (existingCount.count > 0) {
    return // Tags already seeded
  }

  const tags = [
    // Work & Productivity
    { name: 'work', category: 'Work' },
    { name: 'urgent', category: 'Work' },
    { name: 'meeting', category: 'Work' },
    { name: 'deadline', category: 'Work' },
    { name: 'focus', category: 'Work' },

    // Personal
    { name: 'home', category: 'Personal' },
    { name: 'health', category: 'Personal' },
    { name: 'finance', category: 'Personal' },
    { name: 'shopping', category: 'Personal' },
    { name: 'family', category: 'Personal' },

    // Project Management
    { name: 'bug', category: 'Other' },
    { name: 'feature', category: 'Other' },
    { name: 'design', category: 'Other' },
    { name: 'planning', category: 'Other' },
    { name: 'review', category: 'Other' },

    // Categories
    { name: 'news', category: 'Other' },
    { name: 'politics', category: 'Other' },
    { name: 'tech', category: 'Other' },
    { name: 'entertainment', category: 'Other' },
    { name: 'culture', category: 'Other' },
    { name: 'web', category: 'Other' },
    { name: 'hobby', category: 'Other' },
    { name: 'history', category: 'Other' },
    { name: 'philosophy', category: 'Other' },
    { name: 'science', category: 'Other' },
  ]

  try {
    const insert = db.prepare(`
      INSERT INTO tags (id, name, color, category, created_at, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `)

    const now = Date.now()
    tags.forEach(tag => {
      const id = crypto.randomUUID()
      const color = '#999999' // Default gray for all starter tags
      insert.run(id, tag.name, color, tag.category, now)
    })

    console.log('Seeded 25 default tags')
  } catch (error) {
    console.warn('Failed to seed default tags:', error)
    // Don't throw - let app continue without defaults
  }
}
```

### 2. Call Seeding Function
**File**: `lib/db.ts`
**Location**: End of `initializeDatabase()` function (after indexes, before closing brace)

Add this call:

```typescript
  // Seed default data
  seedDefaultTags()
```

### 3. Verification Steps

After implementation:
1. Delete `data/idealisted.db`
2. Run `npm run dev`
3. Check console for "Seeded 25 default tags" message
4. Verify tags in database:
   ```bash
   sqlite3 data/idealisted.db "SELECT COUNT(*) FROM tags WHERE is_default = 1;"
   ```
   Should return 25
5. Stop and restart dev server
6. Verify no duplicate seeding (count stays at 25)
7. Test in UI: Tags should appear in tag selectors/autocomplete

### 4. Important Notes
- **Idempotent** - Checks if tags exist before inserting
- **Graceful failure** - Logs warning but doesn't crash app
- **Depends on Task 1.1** - Requires is_default column from previous task
- **Default color** - All starter tags use #999999 (gray)

## Success Criteria
- [ ] 25 tags inserted on first app start
- [ ] No duplicates on subsequent starts
- [ ] All tags have is_default = 1
- [ ] Console shows success message
- [ ] Tags visible in UI components

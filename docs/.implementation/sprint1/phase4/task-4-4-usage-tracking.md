# Task 4.4: Implement Tag Usage Tracking

## Objective
Update tag usage statistics when tags are applied to entities.

## Database Schema (Already Exists from Phase 1)

```sql
CREATE TABLE tags (
  name TEXT PRIMARY KEY,
  usage_count INTEGER DEFAULT 0,
  last_used_at INTEGER,
  is_default INTEGER DEFAULT 0
)
```

## Update Logic

### When Tag is Added to Entity

```typescript
// Increment usage_count
UPDATE tags
SET usage_count = usage_count + 1,
    last_used_at = ?
WHERE name = ?

// If tag doesn't exist, create it
INSERT OR IGNORE INTO tags (name, usage_count, last_used_at)
VALUES (?, 1, ?)
```

### When Tag is Removed from Entity

```typescript
// Decrement usage_count (don't go below 0)
UPDATE tags
SET usage_count = MAX(0, usage_count - 1)
WHERE name = ?
```

## Integration Points

**EntityModal Save**:
- When saving entity, compare old tags vs new tags
- Increment count for added tags
- Decrement count for removed tags

**Capture Flow**:
- When creating item with tags, increment all tag counts

**API Routes to Update**:
- `POST /api/items` - Increment tags on create
- `PUT /api/items/[id]` - Update tags on edit

## Implementation

```typescript
// Helper function
async function updateTagUsage(addedTags: string[], removedTags: string[]) {
  const now = Date.now()

  // Increment for added tags
  for (const tag of addedTags) {
    db.prepare(`
      INSERT INTO tags (name, usage_count, last_used_at)
      VALUES (?, 1, ?)
      ON CONFLICT(name) DO UPDATE SET
        usage_count = usage_count + 1,
        last_used_at = ?
    `).run(tag, now, now)
  }

  // Decrement for removed tags
  for (const tag of removedTags) {
    db.prepare(`
      UPDATE tags
      SET usage_count = MAX(0, usage_count - 1)
      WHERE name = ?
    `).run(tag)
  }
}
```

## Success Criteria
- ✅ Tag usage_count increments when tag added
- ✅ Tag usage_count decrements when tag removed
- ✅ last_used_at updates on tag use
- ✅ New tags auto-created with usage_count = 1
- ✅ Works in both create and edit flows
- ✅ No negative usage counts

# Task 1.5: Update TypeScript Type Definitions

## Objective
Update TypeScript interfaces in `types/index.ts` to match the new database schema changes from Tasks 1.1-1.4:
- Add `Tag` interface with new columns
- Add `AIFeatureSetting` interface
- Update `Task` interface with reminder columns

## Context Bundle
See `docs/.implementation/phase1/context-task-1-5-typescript-types.md` for complete implementation context including:
- Current type organization patterns
- Database schema mappings
- Optional field conventions
- Existing type examples

## Implementation Instructions

### 1. Add Tag Interface
**File**: `types/index.ts`
**Location**: After Item interface (around line 25), before AISuggestion

Add this interface:

```typescript
export interface Tag {
  id: string
  name: string
  color: string
  category: string
  created_at: number
  usage_count?: number      // Added in Task 1.1
  is_default?: number       // Added in Task 1.1 (0 or 1)
  last_used_at?: number     // Added in Task 1.1
}
```

### 2. Add AIFeatureSetting Interface
**File**: `types/index.ts`
**Location**: After AIConfig interface (around line 160), before NtfyConfig

Add this interface:

```typescript
export interface AIFeatureSetting {
  feature_name: string
  enabled: number          // SQLite boolean (0 or 1)
  description: string
}
```

### 3. Update Task Interface
**File**: `types/index.ts`
**Location**: Find the existing Task interface (around line 60)

Add two optional fields to the Task interface:

```typescript
export interface Task {
  id: string
  item_id: string
  status: 'not_started' | 'in_progress' | 'done' | 'archived'
  priority: number
  tags?: string[]
  estimated_time?: number
  project_id?: string
  due_date?: number
  reminder_datetime?: number    // Added in Task 1.3
  last_notified_at?: number     // Added in Task 1.3
}
```

### 4. Verification Steps

After implementation:
1. Run TypeScript compiler to check for errors:
   ```bash
   npx tsc --noEmit
   ```
2. Verify no type errors
3. Check that IDE autocomplete works for new fields
4. Verify imports work correctly in other files

### 5. Important Notes
- **Optional fields** - All new fields use `?` since they may not exist in legacy data
- **SQLite booleans** - Use `number` type (0 or 1), not `boolean`
- **Consistency** - Field names match database column names exactly
- **No runtime changes** - This is types-only, no code execution changes

## Success Criteria
- [ ] Tag interface added with 8 fields
- [ ] AIFeatureSetting interface added with 3 fields
- [ ] Task interface updated with 2 new optional fields
- [ ] TypeScript compilation succeeds (no errors)
- [ ] IDE autocomplete works for new fields

# Task 2.3: Implement Feature Flag Checking Logic

## Context Bundle
**Read**: `docs/.implementation/phase2/context-task-2-3-feature-flags.md` (comprehensive implementation guide)

## Task Summary
Add feature flag checking to AIService and components to respect individual feature toggles.

## Deliverables

### 1. Update AIService
**File**: `lib/ai.ts`

**Add**:
- `isFeatureEnabled(featureName: string): Promise<boolean>` method
- Check master toggle AND specific feature flag
- Query ai_feature_settings table
- Return false if either disabled

### 2. Update Components

**AISuggestionPanel** (`components/ui/AISuggestionPanel.tsx`):
- Check `suggestion_panel` feature before rendering
- Show message if feature disabled

**EntityModal** (`components/modern/EntityModal.tsx`):
- Check `tag_suggestions` feature before showing tag suggestion UI
- Hide/disable tag suggestion button if feature off

### 3. Implementation Pattern

```typescript
async isFeatureEnabled(featureName: string): Promise<boolean> {
  // Check master toggle first
  if (!this.config.enabled) return false

  // Query ai_feature_settings
  const { db } = await import('@/lib/db')
  const feature = db.prepare(`
    SELECT enabled FROM ai_feature_settings
    WHERE feature_name = ?
  `).get(featureName) as { enabled: number } | undefined

  return feature?.enabled === 1
}
```

## Success Criteria

**AIService**:
- [ ] isFeatureEnabled() method implemented
- [ ] Returns false if master toggle off
- [ ] Returns false if feature disabled
- [ ] Returns true only if both enabled

**Component Gating**:
- [ ] AISuggestionPanel hidden when suggestion_panel disabled
- [ ] Tag suggestions hidden when tag_suggestions disabled
- [ ] Daily summary skipped when daily_summary disabled

**Error Handling**:
- [ ] Clear messages when feature disabled
- [ ] Graceful degradation (fail closed)
- [ ] No crashes if database query fails

**Testing**:
- [ ] All 4 state combinations tested (master/feature on/off)
- [ ] Database updates reflected immediately
- [ ] No console errors

## Testing
Use SQLite commands from context bundle to toggle features and verify behavior.

## Dependencies
Task 2.1 complete (ai_feature_settings table seeded).

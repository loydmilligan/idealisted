# Task 4.2: Implement Tag Priority Logic

## Objective
Ensure AI reuses existing tags when appropriate, only creating new tags when necessary.

## Priority Rules

### Rule 1: Existing Tag Reuse (Confidence >= 70%)
```typescript
if (tag.source === 'existing' && tag.confidence >= 0.70) {
  // Use existing tag
  return { ...tag, priority: 'high' }
}
```

### Rule 2: New Tag Creation (Confidence >= 60%)
```typescript
if (tag.source === 'new' && tag.confidence >= 0.60) {
  // Create new tag
  return { ...tag, priority: 'medium' }
}
```

### Rule 3: Low Confidence (< 60%)
```typescript
if (tag.confidence < 0.60) {
  // Filter out - too uncertain
  return null
}
```

## AI Prompt Strategy

**Emphasize Reuse**:
```
IMPORTANT: Strongly prefer existing tags over creating new ones.
- If an existing tag matches >= 70% confidence, use it
- Only create new tags if NO existing tag fits
- Existing tags are already familiar to the user
```

## Display Order

1. **Existing tags** (sorted by confidence DESC)
2. **New tags** (sorted by confidence DESC)

## Visual Indicators

- Existing: ● (filled circle, green)
- New: ○ (empty circle, blue)

## Success Criteria
- ✅ AI prompt emphasizes existing tag reuse
- ✅ Confidence thresholds enforced
- ✅ Tags sorted by source then confidence
- ✅ Visual indicators in UI
- ✅ Usage count displayed for existing tags

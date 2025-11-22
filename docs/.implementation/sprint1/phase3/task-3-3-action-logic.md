# Task 3.3: Implement Accept/Override/Dismiss Logic

## Objective
Implement user action handlers for accepting, overriding, or dismissing AI suggestions.

## Accept Flow

**Handler**: `onAccept()`

1. Create item with AI-suggested type
2. Include all AI-extracted metadata:
   - `text` from original input
   - `type` from AI suggestion
   - `tags` from AI extraction
   - `metadata` object with priority, due_date, project
3. Call `POST /api/items` with full payload
4. On success:
   - Clear textarea
   - Hide suggestion panel
   - Show success message
   - Flash appropriate tab badge
5. On error:
   - Show error message
   - Keep panel open for retry

## Override Flow

**Handler**: `onOverride(newType: ItemType)`

1. Create item with USER-selected type (not AI suggestion)
2. Keep AI-extracted metadata but adapt:
   - Task priority → Note (ignore or convert)
   - Tags → Keep for all types
   - Due date → Keep for tasks, ignore for notes
3. Same success/error handling as Accept

## Dismiss Flow

**Handler**: `onDismiss()`

1. Hide suggestion panel
2. Keep original text in textarea
3. Re-enable input
4. No item created
5. Return to normal capture state

## API Integration

**Endpoint**: `POST /api/items`

**Request Format**:
```typescript
{
  text: string
  type: ItemType
  tags?: string[]
  metadata?: {
    priority?: number
    due_date?: string
    project_id?: string
    // etc
  }
}
```

## Success Criteria
- ✅ Accept creates item with AI type
- ✅ Override creates item with user type
- ✅ Dismiss cancels without creating
- ✅ Metadata properly transferred
- ✅ Error handling works

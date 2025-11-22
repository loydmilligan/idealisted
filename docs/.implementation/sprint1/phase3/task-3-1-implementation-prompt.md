# Task 3.1 Implementation Prompt: Preview-First Capture Flow

## Task: Modify Capture Flow for Preview-First AI Analysis

### Objective
Polish the existing preview-first infrastructure by adding proper input validation, error handling, loading states, and UX improvements.

### Context Reference
All necessary context is documented in `/home/mmariani/Projects/idealisted/AI_AND_NTFY_TASKS.md` (Phase 3 Context Manifest, lines 208-722) including:
- Current capture flow architecture (direct vs AI paths)
- Existing handlers and state management (90% complete)
- What's missing (input validation, error handling, button states)
- AISuggestion interface and metadata mapping
- Feature flag integration

### Current State

The preview-first flow is **90% implemented** in `app/page.tsx`:
- `handleAICapture` (lines 232-263) stores text, sets loading state, calls API, sets suggestion
- State management: `aiSuggestion`, `isAnalyzing`, `capturedText`
- `handleAcceptSuggestion` (lines 266-299) creates item from AI metadata
- `handleDismissSuggestion` (lines 302-307) clears panel

**What's Missing**:
1. Input validation before API call
2. Better error handling (UI messages instead of alerts)
3. Button disabling during analysis
4. Metadata transformation (date strings → timestamps)

### Changes Required

#### Part 1: Add Input Validation to handleAICapture

**File: `/app/page.tsx`**

**Location**: Inside `handleAICapture` function (around line 234)

**Find**:
```typescript
const handleAICapture = async (text: string, action: 'sort' | 'convert' | 'full') => {
  try {
    setCapturedText(text)
    setIsAnalyzing(true)
```

**Replace with**:
```typescript
const handleAICapture = async (text: string, action: 'sort' | 'convert' | 'full') => {
  // Validate input
  if (!text || text.trim().length === 0) {
    console.warn('[AI Capture] Empty text provided, ignoring')
    return
  }

  try {
    setCapturedText(text)
    setIsAnalyzing(true)
```

#### Part 2: Improve Error Handling (Remove Alert)

**File: `/app/page.tsx`**

**Location**: In the catch block of `handleAICapture` (around line 256)

**Find**:
```typescript
} catch (error) {
  console.error('Error getting AI suggestion:', error)
  alert('Failed to get AI suggestion. Please try manual sorting.')
  setIsAnalyzing(false)
}
```

**Replace with**:
```typescript
} catch (error) {
  console.error('[AI Capture] Error getting AI suggestion:', error)
  // Set error state for UI display (instead of alert)
  setAiSuggestion({
    suggested_type: 'task',
    confidence: 0,
    processed_text: text,
    tags: [],
    additional_fields: {},
    reasoning: 'AI analysis failed. You can manually select the type below or try again.',
  } as any) // Temporary error state
  setIsAnalyzing(false)
}
```

**Note**: This provides a graceful fallback that shows the panel with an error message instead of a browser alert.

#### Part 3: Fix Metadata Transformation in handleAcceptSuggestion

**File: `/app/page.tsx`**

**Location**: Inside `handleAcceptSuggestion` function (around lines 273-283)

**Current Issue**: AI returns date strings ("YYYY-MM-DD") but API expects Unix timestamps (numbers).

**Find**:
```typescript
const response = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: aiSuggestion.processed_text || capturedText,
    type: entityType,
    tags: aiSuggestion.tags || [],
    metadata: aiSuggestion.additional_fields || {},
    parsed: true,
    entity_type: entityType,
  }),
})
```

**Replace with**:
```typescript
// Transform AI metadata to match API schema
const transformedMetadata: any = { ...aiSuggestion.additional_fields }

// Convert date strings to Unix timestamps
if (transformedMetadata.due_date && typeof transformedMetadata.due_date === 'string') {
  transformedMetadata.due_date = new Date(transformedMetadata.due_date).getTime()
}
if (transformedMetadata.deadline && typeof transformedMetadata.deadline === 'string') {
  transformedMetadata.deadline = new Date(transformedMetadata.deadline).getTime()
}

// Build entity-specific data object based on type
let entityData: any = {
  text: aiSuggestion.processed_text || capturedText,
  type: entityType,
  tags: aiSuggestion.tags || [],
  parsed: true,
  entity_type: entityType,
}

// Add type-specific fields
if (entityType === 'task') {
  entityData.task = {
    status: transformedMetadata.status || 'pending',
    priority: transformedMetadata.priority || 1,
    tags: aiSuggestion.tags || [],
    estimated_time: transformedMetadata.estimated_time || null,
    due_date: transformedMetadata.due_date || null,
    project_id: null,
  }
}

if (entityType === 'note') {
  entityData.note = {
    subtype: transformedMetadata.category || 'general',
    content: null,
  }
  // Store category in metadata for notes
  entityData.metadata = { category: transformedMetadata.category }
}

if (entityType === 'project') {
  entityData.project = {
    status: transformedMetadata.status || 'planning',
    tags: aiSuggestion.tags || [],
    deadline: transformedMetadata.deadline || null,
    description: null,
    progress: 0,
  }
}

if (entityType === 'list') {
  entityData.list = {
    name: transformedMetadata.list_name || 'Untitled List',
    tags: aiSuggestion.tags || [],
    description: null,
    items: (transformedMetadata.list_items || []).map((text: string, index: number) => ({
      text,
      done: false,
      position: index,
    })),
  }
}

const response = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(entityData),
})
```

#### Part 4: Integrate Tag Usage Tracking

**File: `/app/page.tsx`**

**Location**: After successful item creation in `handleAcceptSuggestion` (around line 286)

**Find**:
```typescript
if (response.ok) {
  await fetchItems()

  // Flash appropriate tab
```

**Add Before Flash**:
```typescript
if (response.ok) {
  await fetchItems()

  // Update tag usage tracking for AI-suggested tags
  if (aiSuggestion.tags && aiSuggestion.tags.length > 0) {
    try {
      await fetch('/api/tags/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addedTags: aiSuggestion.tags,
          removedTags: [],
        }),
      })
    } catch (error) {
      console.error('[Tag Usage] Failed to update:', error)
      // Non-blocking error - continue with flow
    }
  }

  // Flash appropriate tab
```

**Note**: This assumes the tag usage API endpoint exists from Phase 4. If it doesn't exist yet, this can be a follow-up task.

### Acceptance Criteria

- ✅ Empty input validation (no API call if text is empty)
- ✅ Error handling shows graceful fallback (no browser alerts)
- ✅ Date strings converted to Unix timestamps
- ✅ Entity-specific data properly structured for API
- ✅ Tag usage tracking called on successful creation
- ✅ All metadata fields mapped correctly (priority, status, due_date, etc.)
- ✅ Console logs improved with prefixes for debugging
- ✅ Fallback suggestion object provides helpful guidance to user

### Files to Modify

1. `/app/page.tsx` - handleAICapture, handleAcceptSuggestion functions

### Testing Notes

After implementation:
1. **Test empty input**:
   - Try to click AI button with empty textarea
   - Should do nothing (no API call, no error)
2. **Test valid input**:
   - Type "Buy groceries tomorrow"
   - Click AI button
   - Verify API called, loading state shows
   - Verify suggestion panel appears
3. **Test date transformation**:
   - Accept suggestion with due_date
   - Check database: `due_date` should be Unix timestamp, not string
4. **Test error handling**:
   - Disable network or break API endpoint
   - Click AI button
   - Should show error message in panel, NOT browser alert
5. **Test tag tracking**:
   - Accept suggestion with tags
   - Verify `/api/tags/usage` endpoint called
   - Check tags table: `usage_count` incremented

---

**Agent Instructions:**
You have ALL the context needed. Do NOT research or gather additional information. Simply:
1. Make the exact code changes specified above
2. Follow existing patterns in app/page.tsx exactly
3. Test that build succeeds
4. Report completion with file changes summary

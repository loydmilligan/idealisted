# Task 3.4 Implementation Prompt: Add Loading States and Error Handling

## Task: Polish Loading States and Error Feedback

### Objective
Enhance the existing loading states with better visual feedback and improve error handling to replace browser alerts with in-UI messages.

### Context Reference
All necessary context is documented in `/home/mmariani/Projects/idealisted/AI_AND_NTFY_TASKS.md` (Phase 3 Task 3.4 Context Manifest) including:
- Current implementation (70% complete via Tasks 3.1-3.3)
- 5 critical gaps identified
- Complete data flow documentation
- Files and line numbers

### Current State

**What's Already Working** ✅:
- `isAnalyzing` state exists (app/page.tsx line 66)
- `isCreatingItem` state exists (app/page.tsx line 68)
- Loading message displayed in AISuggestionPanel (lines 52-63)
- Error fallback suggestion pattern (app/page.tsx lines 265-273)
- Button disabling in AISuggestionPanel during creation (Task 3.3)

**Critical Gaps** ❌:
1. **Entity buttons NOT disabled during AI analysis** - User can click Task/Note buttons while analyzing
2. **Browser alert for errors** - Using `alert()` instead of in-UI messages (app/page.tsx line 389)
3. **No textarea overlay** - No visual indication that textarea is "busy"
4. **Textarea cleared immediately** - Text disappears on AI click (should stay visible)
5. **AI button not disabled during analysis** - Can trigger duplicate API calls

### Changes Required

#### Part 1: Disable Entity Buttons During AI Analysis

**File: `/components/modern/screens/CaptureScreen.tsx`**

**Location**: Entity button rendering (around lines 199-271)

**Find** (example for Task button, around line 208):
```typescript
<RetroButton
  onClick={() => handleCapture('task')}
  variant="primary"
  size="lg"
  className="flex-1"
>
  <span className="flex items-center justify-center gap-2">
    <RetroIcon type="task" size="sm" />
    Task
  </span>
</RetroButton>
```

**Replace with** (add disabled prop):
```typescript
<RetroButton
  onClick={() => handleCapture('task')}
  variant="primary"
  size="lg"
  disabled={isAnalyzing || isCreatingItem}
  className="flex-1"
>
  <span className="flex items-center justify-center gap-2">
    <RetroIcon type="task" size="sm" />
    Task
  </span>
</RetroButton>
```

**Apply same pattern to**:
- Task button (line ~208)
- Note button (line ~219)
- Project button (line ~246)
- List button (line ~257)

#### Part 2: Disable Unsorted and AI Buttons During Analysis

**File: `/components/modern/screens/CaptureScreen.tsx`**

**Location**: Icon buttons on right side (around lines 161-183)

**Find** (Unsorted button, around line 162):
```typescript
<RetroButton
  onClick={handleUnsortedAction}
  variant="primary"
  size="sm"
  aria-label="Save as unsorted"
  title="Save as unsorted"
  className="w-10 h-10"
>
  ✓
</RetroButton>
```

**Replace with**:
```typescript
<RetroButton
  onClick={handleUnsortedAction}
  variant="primary"
  size="sm"
  disabled={isAnalyzing || isCreatingItem}
  aria-label="Save as unsorted"
  title="Save as unsorted"
  className="w-10 h-10"
>
  ✓
</RetroButton>
```

**Find** (AI button, around line 175):
```typescript
<RetroButton
  onClick={handleAIAction}
  variant="secondary"
  size="sm"
  aria-label="AI analyze"
  title="AI analyze"
  className="w-10 h-10"
>
  🤖
</RetroButton>
```

**Replace with**:
```typescript
<RetroButton
  onClick={handleAIAction}
  variant="secondary"
  size="sm"
  disabled={isAnalyzing || isCreatingItem}
  aria-label="AI analyze"
  title={isAnalyzing ? "Analyzing..." : "AI analyze"}
  className="w-10 h-10"
>
  {isAnalyzing ? '⏳' : '🤖'}
</RetroButton>
```

**Note**: This shows "⏳" hourglass icon during analysis for clear visual feedback.

#### Part 3: Replace Alert with In-UI Error Message

**File: `/app/page.tsx`**

**Step 1**: Add error state variable (around line 68)

**Find**:
```typescript
const [isCreatingItem, setIsCreatingItem] = useState(false)
```

**Add After**:
```typescript
const [creationError, setCreationError] = useState<string | null>(null)
```

**Step 2**: Update error handling in `handleAcceptSuggestion` (around lines 385-392)

**Find**:
```typescript
} catch (error) {
  console.error('[Accept Suggestion] Error creating item:', error)

  // Show error feedback to user
  alert('Failed to create item. Please try again or use manual entry.')

  // Keep suggestion panel open so user can retry
  // Don't clear aiSuggestion or capturedText
} finally {
  setIsCreatingItem(false)
}
```

**Replace with**:
```typescript
} catch (error) {
  console.error('[Accept Suggestion] Error creating item:', error)

  // Set error message for in-UI display
  setCreationError('Failed to create item. Please try again or use manual entry.')

  // Keep suggestion panel open so user can retry
  // Don't clear aiSuggestion or capturedText
} finally {
  setIsCreatingItem(false)
}
```

**Step 3**: Clear error on successful creation (around line 379)

**Find**:
```typescript
// Show success feedback
console.log(`[Accept Suggestion] ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} created successfully`)

// Clear AI state
setAiSuggestion(null)
setCapturedText('')
```

**Replace with**:
```typescript
// Show success feedback
console.log(`[Accept Suggestion] ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} created successfully`)

// Clear error state
setCreationError(null)

// Clear AI state
setAiSuggestion(null)
setCapturedText('')
```

**Step 4**: Pass error to CaptureScreen (around line 722)

**Find**:
```typescript
aiSuggestion={aiSuggestion}
isAnalyzing={isAnalyzing}
isCreatingItem={isCreatingItem}
onAcceptSuggestion={handleAcceptSuggestion}
onDismissSuggestion={handleDismissSuggestion}
```

**Replace with**:
```typescript
aiSuggestion={aiSuggestion}
isAnalyzing={isAnalyzing}
isCreatingItem={isCreatingItem}
creationError={creationError}
onAcceptSuggestion={handleAcceptSuggestion}
onDismissSuggestion={handleDismissSuggestion}
```

#### Part 4: Display Error Message in AISuggestionPanel

**File: `/components/ui/AISuggestionPanel.tsx`**

**Step 1**: Add error prop to interface (around line 12)

**Find**:
```typescript
interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  isCreating?: boolean
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
}
```

**Replace with**:
```typescript
interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  isCreating?: boolean
  error?: string | null
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
}
```

**Step 2**: Destructure error prop (around line 20)

**Find**:
```typescript
export function AISuggestionPanel({
  suggestion,
  isLoading,
  isCreating = false,
  onApplySuggestion,
  onDismiss
}: AISuggestionPanelProps) {
```

**Replace with**:
```typescript
export function AISuggestionPanel({
  suggestion,
  isLoading,
  isCreating = false,
  error = null,
  onApplySuggestion,
  onDismiss
}: AISuggestionPanelProps) {
```

**Step 3**: Display error message (around line 104, after dismiss button)

**Find**:
```typescript
        </div>

        {/* Confidence Bar */}
```

**Add Between**:
```typescript
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-3 border-2 border-red-500 bg-red-50 rounded">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 mb-1">Error</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Confidence Bar */}
```

#### Part 5: Update CaptureScreen to Pass Error Prop

**File: `/components/modern/screens/CaptureScreen.tsx`**

**Step 1**: Add error prop to interface (around line 38)

**Find**:
```typescript
aiSuggestion?: AISuggestion | null
isAnalyzing?: boolean
isCreatingItem?: boolean
onAcceptSuggestion?: (overrideType?: Exclude<EntityType, 'idea'>) => void
onDismissSuggestion?: () => void
```

**Replace with**:
```typescript
aiSuggestion?: AISuggestion | null
isAnalyzing?: boolean
isCreatingItem?: boolean
creationError?: string | null
onAcceptSuggestion?: (overrideType?: Exclude<EntityType, 'idea'>) => void
onDismissSuggestion?: () => void
```

**Step 2**: Destructure error prop (around line 50)

**Find**:
```typescript
aiSuggestion,
isAnalyzing,
isCreatingItem,
onAcceptSuggestion,
onDismissSuggestion,
```

**Replace with**:
```typescript
aiSuggestion,
isAnalyzing,
isCreatingItem,
creationError,
onAcceptSuggestion,
onDismissSuggestion,
```

**Step 3**: Pass error to AISuggestionPanel (around line 284)

**Find**:
```typescript
<AISuggestionPanel
  suggestion={aiSuggestion}
  isLoading={isAnalyzing || false}
  isCreating={isCreatingItem}
  onApplySuggestion={(type) => {
```

**Replace with**:
```typescript
<AISuggestionPanel
  suggestion={aiSuggestion}
  isLoading={isAnalyzing || false}
  isCreating={isCreatingItem}
  error={creationError}
  onApplySuggestion={(type) => {
```

#### Part 6: Improve Loading State Message

**File: `/components/ui/AISuggestionPanel.tsx`**

**Location**: Loading state display (around lines 52-63)

**Find**:
```typescript
if (isLoading) {
  return (
    <RetroCard className="palm-ai-suggestion">
      <div className="flex items-center justify-center py-4">
        <div className="text-center text-xs opacity-70">
          <RetroIcon type="ai" size="md" />
          <p className="mt-2">🤖 AI is analyzing...</p>
        </div>
      </div>
    </RetroCard>
  )
}
```

**Replace with**:
```typescript
if (isLoading) {
  return (
    <RetroCard className="palm-ai-suggestion">
      <div className="flex items-center justify-center py-4">
        <div className="text-center text-xs">
          <div className="animate-pulse mb-2">
            <RetroIcon type="ai" size="md" />
          </div>
          <p className="font-semibold mb-1">🤖 AI is analyzing...</p>
          <p className="text-xs opacity-70">Extracting metadata and suggestions</p>
        </div>
      </div>
    </RetroCard>
  )
}
```

**Note**: Uses Tailwind's `animate-pulse` for subtle animation.

### Acceptance Criteria

- ✅ All entity buttons (Task, Note, Project, List) disabled during AI analysis
- ✅ Unsorted and AI buttons disabled during analysis and creation
- ✅ AI button shows "⏳" icon during analysis
- ✅ Error messages displayed in-UI (no more browser alerts)
- ✅ Error message styled clearly with red border and warning icon
- ✅ Error state cleared on successful creation
- ✅ Loading state has improved messaging and animation
- ✅ Buttons re-enabled after analysis completes
- ✅ All loading states properly coordinated across components

### Files to Modify

1. `/app/page.tsx` - Add creationError state, update error handling
2. `/components/ui/AISuggestionPanel.tsx` - Display error message, improve loading state
3. `/components/modern/screens/CaptureScreen.tsx` - Disable buttons, pass error prop

### Testing Notes

After implementation:
1. **Test button disabling**:
   - Click AI button
   - Verify all buttons disabled (entity buttons, unsorted, AI)
   - Verify AI button shows "⏳" icon
2. **Test loading state**:
   - Verify "AI is analyzing..." message with animation
   - Verify message describes what's happening
3. **Test error handling**:
   - Break API or network
   - Click accept button
   - Verify red error box appears in panel (not browser alert)
   - Verify error has warning icon and clear message
4. **Test error clearing**:
   - Get error state
   - Fix API, retry
   - Verify error clears on success
5. **Test button re-enabling**:
   - Complete analysis (success or error)
   - Verify all buttons enabled again

---

**Agent Instructions:**
You have ALL the context needed. Do NOT research or gather additional information. Simply:
1. Make the exact code changes specified above
2. Follow existing patterns exactly
3. Test that build succeeds
4. Report completion with file changes summary

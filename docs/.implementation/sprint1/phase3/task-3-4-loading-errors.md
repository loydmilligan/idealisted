# Task 3.4: Add Loading States and Error Handling

## Objective
Implement comprehensive loading states and error handling for AI suggestion flow.

## Loading State Requirements

**Visual Elements**:
1. Spinner overlay on textarea
2. "Analyzing with AI..." message below textarea
3. Disable all buttons (AI, Unsorted)
4. Set textarea to read-only
5. Subtle loading animation

**State Management**:
```typescript
const [isAnalyzing, setIsAnalyzing] = useState(false)
```

**During Loading**:
- `isAnalyzing = true`
- Buttons disabled
- Textarea read-only
- Spinner visible

## Error Scenarios

### 1. AI API Error (500, 429, 401)
- Message: "AI analysis failed. Create item manually?"
- Buttons: "Create Anyway" | "Try Again" | "Cancel"
- Fallback: Allow manual sorting to Unsorted

### 2. Network Timeout
- Message: "Request timed out. Check your connection."
- Same buttons as above

### 3. AI Feature Disabled
- Message: "AI features are disabled in Settings"
- Hide AI button entirely (already implemented in Phase 2)

### 4. Empty/Invalid Input
- Message: "Please enter some text first"
- Don't call AI API
- Show inline validation

## Fallback Behavior

**On Any Error**:
1. Show user-friendly error message
2. Offer "Create Anyway" button
   - Creates item as "idea" type
   - Adds to Unsorted tab
   - User can sort later
3. Don't block user workflow
4. Clear error after 5 seconds or user action

## Loading UI Implementation

**CSS Classes** (from retro.css):
- `.retro-spinner` for loading animation
- `.retro-loading-message` for text
- `.disabled` for button states

**Component Structure**:
```tsx
{isAnalyzing && (
  <div className="loading-overlay">
    <div className="retro-spinner" />
    <p className="retro-loading-message">Analyzing with AI...</p>
  </div>
)}
```

## Success Criteria
- ✅ Loading state shows during AI processing
- ✅ All buttons disabled during loading
- ✅ Error messages clear and actionable
- ✅ Fallback "Create Anyway" works
- ✅ No UI blocking on errors

# Task 3.1: Modify Capture Flow for Preview-First

## Objective
Update the capture flow so AI processes BEFORE item creation (preview-first pattern).

## Current Flow (Bad)
1. User types idea
2. User clicks "AI" button
3. Item created immediately in "unsorted" state
4. AI processes in background
5. AISuggestionPanel shows results
6. User can't preview before creation

## New Flow (Good)
1. User types idea
2. User clicks "AI" button
3. Loading state appears ("Analyzing with AI...")
4. AI processes (NO item created yet)
5. AISuggestionPanel shows preview with confidence, reasoning, metadata
6. User chooses: Accept (creates item) | Override type | Dismiss

## Implementation

**File to Modify**: `app/page.tsx`

**Changes Needed**:
1. Update `handleAICapture` function
   - Remove immediate item creation
   - Call `/api/ai/suggest` first
   - Show loading state
   - Pass results to AISuggestionPanel
   - Wait for user action

2. Add loading state management
   - `isAnalyzing` boolean state
   - Disable buttons during analysis
   - Show spinner on textarea

3. Update AISuggestionPanel integration
   - Pass AI results as prop
   - Add callback for accept/override/dismiss
   - Show panel only after AI completes

## Success Criteria
- ✅ AI button triggers analysis WITHOUT creating item
- ✅ Loading state shows during AI processing
- ✅ AISuggestionPanel receives AI results
- ✅ No item created until user accepts
- ✅ User can dismiss to cancel

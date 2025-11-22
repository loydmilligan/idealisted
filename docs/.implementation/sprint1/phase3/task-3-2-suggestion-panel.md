# Task 3.2: Enhance AISuggestionPanel Component

## Objective
Display comprehensive AI analysis results with confidence score, reasoning, metadata, and action buttons.

## Required UI Elements

1. **Confidence Score Bar**
   - Visual progress bar (0-100%)
   - Color coding: <50% red, 50-75% yellow, >75% green
   - Percentage text display

2. **AI Reasoning**
   - Display `suggestion.reasoning` field
   - 1-2 sentences explaining the suggestion
   - Subtle text styling

3. **Suggested Entity Type**
   - Display suggested type with icon
   - Icons: Task=□, Note=📝, Project=📁, List=☰
   - Highlight with entity color

4. **Extracted Metadata**
   - Tags (if any) - show as chips
   - Due date (if extracted)
   - Priority (if task)
   - Project (if assigned)

5. **Action Buttons**
   - Primary: "Accept as [Type]" (green, large)
   - Override: "Create as Task/Note/Project/List" (smaller buttons)
   - Dismiss: "Cancel" (gray, small)

## Component Props

```typescript
interface AISuggestionPanelProps {
  suggestion: AIResponse | null
  onAccept: () => void
  onOverride: (type: ItemType) => void
  onDismiss: () => void
  isVisible: boolean
}
```

## Success Criteria
- ✅ Confidence bar displays correctly
- ✅ Reasoning text shows
- ✅ All metadata displayed
- ✅ Action buttons work
- ✅ Retro styling consistent

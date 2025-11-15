# Task 4.3: Add Tag Suggestion UI to EntityModal

## Objective
Add "Suggest Tags" button and UI to EntityModal for AI-powered tag recommendations.

## UI Location

In EntityModal, **before** the tag input field:

```
┌─────────────────────────────┐
│ Title: [_______________]    │
│                             │
│ Tags:                       │
│ ┌─────────────────────────┐ │
│ │ [Suggest Tags (AI)]     │ │ ← NEW BUTTON
│ └─────────────────────────┘ │
│                             │
│ [tag1] [tag2]              │ ← Existing tags
│ [+ Add tag]                │ ← Tag input
└─────────────────────────────┘
```

## Suggested Tags Display

When suggestions loaded:

```
┌─────────────────────────────────────┐
│ Suggested Tags:                     │
│ ● meeting (95%) - 42 uses  [Add]   │ ← Existing
│ ● planning (88%) - 28 uses [Add]   │ ← Existing
│ ○ q4 (75%)                [Add]    │ ← New
│                                     │
│ [Accept All] [Dismiss]              │
└─────────────────────────────────────┘
```

## Component State

```typescript
const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([])
const [loadingSuggestions, setLoadingSuggestions] = useState(false)
```

## Button Behavior

**"Suggest Tags" Button**:
- Disabled if no title text
- Shows loading spinner while fetching
- Hidden if `tag_suggestions` feature disabled (already implemented in Phase 2)

**Individual "Add" Buttons**:
- Adds tag to current tags
- Removes from suggestion list
- Updates tag input

**"Accept All" Button**:
- Adds all suggested tags
- Clears suggestion list

**"Dismiss" Button**:
- Clears suggestion list
- Returns to normal state

## API Integration

```typescript
const handleSuggestTags = async () => {
  setLoadingSuggestions(true)

  const response = await fetch('/api/ai/suggest-tags', {
    method: 'POST',
    body: JSON.stringify({
      text: modalData.title,
      entityType: modalEntity.type
    })
  })

  const data = await response.json()
  setSuggestedTags(data.tags)
  setLoadingSuggestions(false)
}
```

## Success Criteria
- ✅ "Suggest Tags" button renders in EntityModal
- ✅ Button disabled when no title text
- ✅ Loading state during API call
- ✅ Suggested tags display with indicators
- ✅ Individual + Accept All buttons work
- ✅ Tags added to entity correctly
- ✅ Feature flag check (already in Phase 2)

# Task 4.1: Create /api/ai/suggest-tags Endpoint

## Objective
Build AI endpoint that suggests tags, prioritizing existing tags from the database.

## API Design

**Endpoint**: `POST /api/ai/suggest-tags`

**Request**:
```json
{
  "text": "Meeting with Sarah about Q4 planning",
  "entityType": "note"
}
```

**Response**:
```json
{
  "success": true,
  "tags": [
    { "name": "meeting", "source": "existing", "confidence": 0.95, "usage_count": 42 },
    { "name": "planning", "source": "existing", "confidence": 0.88, "usage_count": 28 },
    { "name": "q4", "source": "new", "confidence": 0.75 }
  ]
}
```

## Implementation Strategy

1. **Fetch Existing Tags**
   - Query `tags` table ordered by `usage_count DESC`
   - Get top 50 most-used tags
   - Pass to AI as context

2. **AI Prompt**
   ```
   Given this text: "{text}"

   Existing tags in the system (prioritize these):
   {top_50_tags}

   Suggest 3-5 tags total:
   - Reuse existing tags when confidence >= 70%
   - Create new tags only if no good existing match
   - Return each tag with source (existing/new) and confidence
   ```

3. **Response Processing**
   - Sort by confidence DESC
   - Existing tags first, then new tags
   - Include usage_count for existing tags

## Success Criteria
- ✅ Endpoint accepts text + entityType
- ✅ Fetches top 50 existing tags from database
- ✅ AI prompt includes existing tags
- ✅ Returns 3-5 tags with source indicator
- ✅ Prioritizes existing tags (confidence >= 70%)
- ✅ Feature flag check (tag_suggestions)

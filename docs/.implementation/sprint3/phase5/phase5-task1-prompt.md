# Prompt: P5-T1 — AI append to lists endpoint

Context: `docs/.implementation/sprint3/phase5/phase5-task1-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 5), `docs/.implementation/sprint3/tasks.md` (P5-T1)

## Goal

Create an API endpoint that uses AI to suggest new items for an existing list, analyzing the list's name, type, and current items to generate contextually appropriate suggestions.

## Deliverables

- New API route: `app/api/ai/append-list/route.ts`
- New AI feature flag: `list_append_ai` in `ai_feature_settings` seeder
- TypeScript types for request/response if needed

## Implementation Steps (from tasks)

1. Create `app/api/ai/append-list/route.ts` accepting `{ list_id, hint?, count? }`.
2. Add `list_append_ai` feature flag to `lib/db.ts` seeder (`seedAIFeatureSettings` function).
3. Add AI gating check using `aiService.isFeatureEnabled('list_append_ai')`; return 403 if disabled.
4. Validate `list_id` parameter; return 400 if missing or invalid format.
5. Fetch target list with existing items from database:
   - Query `lists` table by id
   - Query `list_items` table for items belonging to list
   - Return 404 if list not found
6. Build AI prompt with context:
   - Include list name and type (shopping, tasklist, bulleted, numbered)
   - Include existing items (up to 20 for context)
   - Include user's hint if provided
   - Request specific count (default 5, max 10)
7. Call OpenRouter AI API (follow pattern from suggest-tags/route.ts):
   - Get config from settings
   - Build prompt requesting JSON array response
   - Parse response, handle markdown code blocks
8. Return `{ success: true, suggestions: Array<{ text: string, confidence: number }> }`.
9. Handle errors gracefully: AI API failures, parse errors, empty responses.

## AI Prompt Structure

```
Given this list, suggest [count] new items that fit the theme:

List Name: "[name]"
List Type: [type] (e.g., shopping list, checklist, etc.)
Current Items:
- [item 1]
- [item 2]
...

User hint: "[hint if provided]"

Rules:
1. Suggest items that complement existing ones
2. Don't duplicate existing items
3. Match the style/format of existing items
4. For shopping lists, suggest related products
5. For task lists, suggest related actionable items

Return ONLY a JSON array:
[
  { "text": "suggested item text", "confidence": 0.85 },
  ...
]
```

## Acceptance Criteria

- Returns 403 when AI master toggle or `list_append_ai` feature disabled.
- Returns 400 for missing or malformed list_id.
- Returns 404 when list doesn't exist.
- Returns 1-10 suggestions (respects count param, enforces max 10).
- Suggestions are contextually appropriate for list type.
- Suggestions don't duplicate existing items.
- Error states return structured JSON, not stack traces.
- Follows existing AI endpoint patterns for consistency.

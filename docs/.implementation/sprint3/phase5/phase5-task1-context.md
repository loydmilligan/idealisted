# Context: P5-T1 — AI append to lists endpoint

Purpose: Create an API endpoint that uses AI to suggest new items for an existing list, based on the list's context, type, and current items.

## Key Decisions

- From plan: AI append flows should be preview-first, gated by AI toggle, max 10 suggestions.
- Endpoint pattern follows existing AI routes (suggest, suggest-tags) with feature flag check.
- New feature flag needed: `list_append_ai` in `ai_feature_settings` table.
- Request accepts optional `hint` for user guidance and `count` for suggestion limit.
- Response returns structured array of suggestions with confidence scores.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 5: AI Append Flows).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P5-T1 steps).
- Existing AI patterns: `app/api/ai/suggest-tags/route.ts`, `app/api/ai/suggest/route.ts`.
- Types: `types/index.ts` (List, ListItem, ListType definitions).
- AI service: `lib/ai.ts` (aiService.isFeatureEnabled pattern).
- Database: `lib/db.ts` (list and list_items table access).

## Implementation Notes

- Endpoint: `POST /api/ai/append-list`
- Request body: `{ list_id: string, hint?: string, count?: number }`
- Must fetch list with existing items to provide context to AI.
- List type (shopping, tasklist, bulleted, numbered) informs prompt style.
- AI prompt should understand list theme and suggest complementary items.
- Response: `{ success: true, suggestions: Array<{ text: string, confidence: number }> }`
- Error handling: 403 for disabled AI, 400 for missing/invalid list_id, 404 for list not found.
- Max count enforced at 10; default to 5 if not specified.

## Testing/QA

- Verify AI gating: returns 403 when AI disabled or feature flag off.
- Verify list lookup: returns 404 for non-existent list.
- Verify suggestion quality: shopping list gets shopping items, task list gets actionable items.
- Verify count limits: never returns more than 10, respects user's count parameter.
- Verify error handling: graceful response for AI API failures.

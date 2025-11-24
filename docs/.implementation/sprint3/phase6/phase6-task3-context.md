# Context: P6-T3 — AI recap generation

Purpose: Implement AI-powered recap generation that summarizes yesterday's activity in 3-5 bullet points, with automatic fallback to quotes when activity is below threshold.

Key decisions
- From plan: Summary bullets (3-5 points) as default mode. Check activity threshold before calling AI.
- If minimal activity: fall back to quote from P6-T2 database.
- Cache results in database or localStorage (same recap for same day).
- Gated by AI master toggle and recap enabled setting.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 6).
- Tasks: docs/.implementation/sprint3/tasks.md (P6-T3 steps).
- AI service: lib/ai.ts (existing AI patterns).
- Recap config: lib/recap-config.ts (from P6-T1).
- Quotes: lib/quotes.ts (from P6-T2).
- Scheduler patterns: lib/scheduler.ts (for understanding data fetch patterns).
- Database schema: lib/db.ts.

Implementation notes
- Create `/api/ai/recap` endpoint accepting `{ date }` parameter.
- Query yesterday's activity: tasks completed, notes created, items captured.
- Count check against configured threshold from recap_config.
- If below threshold, return quote fallback immediately without AI call.
- Build prompt for AI: include activity counts, completed task titles, note titles.
- Parse AI response into bullet array.
- Store result in table or localStorage for caching.

Testing/QA
- Recap generated when activity meets threshold.
- Quote returned when activity below threshold.
- Same date returns cached result on subsequent calls.
- AI errors handled gracefully with fallback to quote.
- Works only when AI enabled and recap enabled.

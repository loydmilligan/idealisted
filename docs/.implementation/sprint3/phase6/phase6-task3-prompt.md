# Prompt: P6-T3 — AI recap generation

Context: docs/.implementation/sprint3/phase6/phase6-task3-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 6), docs/.implementation/sprint3/tasks.md (P6-T3)

Goal
- Create API endpoint for AI-powered daily recap generation with threshold checking and quote fallback.

Deliverables
- `/api/ai/recap/route.ts` endpoint.
- Activity fetching and threshold logic.
- AI prompt construction and response parsing.
- Caching mechanism for same-day requests.
- Quote fallback integration.

Implementation steps (from tasks)
1) Create `app/api/ai/recap/route.ts` accepting POST with `{ date }` parameter.
2) Add AI gating check at top: load AI config, if not enabled return 403 with appropriate message.
3) Load recap config using helpers from `lib/recap-config.ts`. If recap not enabled, return 403.
4) Calculate "yesterday" date range: start of yesterday to end of yesterday (Unix timestamps).
5) Query database for yesterday's activity:
   - Tasks completed: `SELECT COUNT(*) FROM tasks WHERE status='completed' AND updated_at BETWEEN ? AND ?`
   - Notes created: `SELECT COUNT(*) FROM items WHERE type='note' AND created_at BETWEEN ? AND ?`
   - Ideas captured: `SELECT COUNT(*) FROM items WHERE type='idea' AND created_at BETWEEN ? AND ?`
   - Also fetch task/note titles for context (LIMIT 10 each)
6) Calculate total activity count. If below threshold, return `{ fallback: true, quote: getQuoteForDay(date) }`.
7) Build AI prompt: "Based on yesterday's productivity activity, provide 3-5 bullet point summary. Activity: [completed X tasks, created Y notes, captured Z ideas]. Tasks: [list titles]. Notes: [list titles]. Be encouraging and insightful."
8) Call AI service, parse response into array of bullet strings.
9) Cache result: INSERT into `daily_recaps` table (or use localStorage via API flag) with date key.
10) Return `{ summary: string[], stats: { tasks: number, notes: number, ideas: number }, cached: boolean }`.
11) On subsequent requests for same date, return cached result.
12) Handle AI errors: catch, log, return quote fallback with error flag.

Acceptance criteria
- Endpoint returns 403 when AI or recap disabled.
- Activity correctly counted for yesterday.
- Threshold check works with configured value.
- Quote fallback returned when below threshold.
- AI generates meaningful 3-5 bullet summary.
- Same date returns cached result.
- Errors gracefully fall back to quotes.

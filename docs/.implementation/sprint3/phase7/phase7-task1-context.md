# Context: P7-T1 — Wire AI recap to actual service

Purpose: Replace placeholder recap display in CaptureScreen with actual AI-powered summary calls, integrating with the Phase 6 recap service.

## Key decisions

- From plan: AI recap shows 3-5 bullet summary of yesterday's activity when sufficient data; fallback to inspirational quote for low-activity days.
- Scope: Wire existing recap prop/display to fetch from `/api/ai/recap` endpoint; add loading/error states; cache results for the day.
- Phase 6 dependency: Requires P6-T3 (AI recap generation endpoint) and P6-T4 (recap display skeleton) to be complete.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 7).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P7-T1 steps).
- CaptureScreen: `components/modern/screens/CaptureScreen.tsx` (lines 569-581 for recap card).
- AI recap endpoint: `app/api/ai/recap/route.ts` (Phase 6 deliverable).
- Settings API: `app/api/settings/route.ts` for AI enabled check.
- Recap config: `lib/recap-config.ts` (Phase 6 deliverable).

## Implementation notes

- CaptureScreen already has `recap` prop with `{ title, body, link?, mode }` structure.
- Currently the parent component passes static/placeholder data; need to fetch from API on mount.
- Add loading skeleton while fetching; show error message with retry on failure.
- Cache successful response in localStorage with date key to avoid re-fetching same day.
- Check AI master toggle before making API call; skip entirely if disabled.
- Add "last updated" timestamp or visual indicator showing recap freshness.

## Testing/QA

- With AI enabled and sufficient activity: see AI-generated summary bullets.
- With AI enabled but low activity: see fallback quote.
- With AI disabled: recap card hidden or shows "AI disabled" message.
- Loading state visible during fetch; error state shows retry button.
- Page refresh uses cached recap; new day triggers fresh fetch.

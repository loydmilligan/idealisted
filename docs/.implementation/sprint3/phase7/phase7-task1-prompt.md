# Prompt: P7-T1 — Wire AI recap to actual service

Context: `docs/.implementation/sprint3/phase7/phase7-task1-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 7), `docs/.implementation/sprint3/tasks.md` (P7-T1)

## Goal

Replace placeholder recap display in CaptureScreen with actual API calls to the AI recap service, including loading states, error handling, and day-based caching.

## Deliverables

- Updated parent component (likely `app/page.tsx`) that fetches recap from `/api/ai/recap`.
- Loading skeleton in CaptureScreen while recap fetches.
- Error state with retry button for failed fetches.
- LocalStorage cache for recap responses (keyed by date).
- AI master toggle check before API call.
- Optional "last updated" indicator on recap card.

## Implementation steps (from tasks)

1. In CaptureScreen parent (app/page.tsx or wherever recap prop is set), replace static data with API fetch.
2. Add loading state: set `recap: null` initially, show skeleton in CaptureScreen.
3. Add error state: catch fetch failures, set error flag, offer retry button.
4. Implement localStorage caching: key `recap_cache_YYYY-MM-DD`, store response JSON.
5. On mount, check cache first; if valid for today, use cached; otherwise fetch fresh.
6. Check AI settings before fetch; if AI disabled, skip fetch and show appropriate message.
7. Add optional "last updated" timestamp display to recap card.

## Acceptance criteria

- Recap displays real AI-generated content when AI enabled and data sufficient.
- Quote fallback appears for low-activity days.
- Loading skeleton visible during API fetch.
- Error message with retry shown on fetch failure.
- Cached recap used on page refresh (same day).
- AI disabled: recap section hidden or shows disabled message.
- No console errors or unhandled promise rejections.

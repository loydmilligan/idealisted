# Context: P6-T4 — Recap display in Capture tab

Purpose: Display yesterday's recap (AI summary or quote fallback) at the top of the Capture screen with collapse/expand functionality.

Key decisions
- From plan: Recap card appears below header, above Today card in Capture tab.
- Display adapts to mode: bullet list for summary, styled quote for quote mode.
- Collapse/expand toggle with localStorage persistence.
- Regenerate button for summary mode.
- Entire card gated behind AI enabled + recap enabled settings.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 6).
- Tasks: docs/.implementation/sprint3/tasks.md (P6-T4 steps).
- CaptureScreen: components/modern/screens/CaptureScreen.tsx.
- Recap API: app/api/ai/recap/route.ts (from P6-T3).
- Retro components: components/ui/RetroCard.tsx, components/ui/RetroButton.tsx.
- Settings patterns: existing gating checks in page.tsx.

Implementation notes
- Add state for recap data, loading, and expanded toggle.
- On mount, check if recap is enabled before making API call.
- Render different layouts based on response type (summary vs quote).
- Style with retro aesthetics matching existing cards.
- Collapse state stored in localStorage key `recap_expanded`.
- Regenerate forces new API call ignoring cache.

Testing/QA
- Card appears only when both AI and recap are enabled.
- Summary mode shows bullet list correctly formatted.
- Quote mode shows styled quote with attribution.
- Collapse/expand works and persists across refresh.
- Regenerate fetches fresh recap.
- Loading state shown during API call.

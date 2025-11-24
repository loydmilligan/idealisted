# Prompt: P6-T4 — Recap display in Capture tab

Context: docs/.implementation/sprint3/phase6/phase6-task4-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 6), docs/.implementation/sprint3/tasks.md (P6-T4)

Goal
- Display yesterday's recap card at top of Capture screen with mode-aware rendering and collapse functionality.

Deliverables
- RecapCard component or inline section in CaptureScreen.
- API integration with `/api/ai/recap` endpoint.
- Mode-aware display (summary bullets vs styled quote).
- Collapse/expand with localStorage persistence.
- Regenerate functionality for summary mode.

Implementation steps (from tasks)
1) In `CaptureScreen.tsx`, add state: `recapData`, `recapLoading`, `recapExpanded`, `recapError`.
2) Add useEffect to load settings and check if AI + recap enabled. Store in state.
3) Add useEffect (dependent on enabled state) to call `/api/ai/recap` with yesterday's date if enabled.
4) Read `recapExpanded` from localStorage on mount, default to true.
5) Create "Yesterday's Recap" card section above the Today card:
   - Header with title "Yesterday's Recap", collapse chevron button, date display
   - AnimatePresence for smooth expand/collapse animation
   - If summary mode (`recapData.summary`): render as `<ul>` with styled `<li>` bullets
   - If quote mode (`recapData.quote`): render styled blockquote with author attribution
   - "Regenerate" button (only in summary mode) that calls API with `{ force: true }`
6) Apply retro card styling (use `RetroCard` component).
7) Show skeleton/spinner during loading.
8) Handle errors gracefully: show "Unable to load recap" message with retry button.
9) Save collapse state to localStorage on toggle: `localStorage.setItem('recap_expanded', JSON.stringify(expanded))`.
10) Gate entire card behind enabled check: `if (!aiEnabled || !recapEnabled) return null`.

Acceptance criteria
- Card only visible when both settings enabled.
- Summary displays as formatted bullet list.
- Quote displays as styled blockquote.
- Collapse hides content but keeps header visible.
- Expand/collapse state persists across page reload.
- Regenerate button works in summary mode.
- Loading and error states handled gracefully.

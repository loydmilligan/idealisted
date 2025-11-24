# Context: P7-T3 — Mobile spacing and tap targets

Purpose: Audit and fix mobile-specific spacing and tap target issues on the Today/Capture surface to ensure usable touch interactions.

## Key decisions

- From plan: Ensure all tap targets are minimum 44x44px per Apple/Android guidelines.
- Scope: CaptureScreen and its child components; focus on 375px (small phone) and 414px (large phone) viewports.
- Priority areas: capture buttons, sort type buttons, inbox item actions, Journal/Media save buttons.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 7).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P7-T3 steps).
- CaptureScreen: `components/modern/screens/CaptureScreen.tsx`.
  - Capture box buttons: lines 291-337 (checkmark, AI)
  - Quick sort buttons: lines 342-371
  - Inbox toggle: lines 446-451
  - Inbox item action buttons: lines 477-512
  - Journal/Media cards: lines 144-241
  - Recap card: lines 569-581
- Retro button styles: `styles/retro.css`

## Implementation notes

- Current button sizing varies: some use inline styles (width: 40px), some rely on `retro-btn-sm` class.
- Mobile audit checklist:
  1. Capture textarea right-padding for mic button.
  2. Primary capture button (checkmark) and AI button sizing.
  3. Quick sort buttons horizontal scroll area.
  4. Inline inbox action buttons (Task, Note, Project, List, Delete).
  5. Note/List subtype menu buttons.
  6. Journal textarea and Save button.
  7. Media inputs and Save button.
- Check z-index stacking for overlapping elements.
- Test scroll behavior in inbox container.
- Verify modals/drawers don't have tap target issues.

## Testing/QA

- Test on 375px viewport (Chrome DevTools mobile emulation).
- Test on 414px viewport.
- All buttons should pass 44x44px minimum tap target.
- No overlapping touch areas.
- Horizontal scroll for sort buttons works with touch.
- No content clipped or hidden off-screen.
- Test with actual mobile device if possible.

# Context: P7-T2 — Unsorted auto-expand behavior

Purpose: Automatically expand the Unsorted/Inbox section when a new item is captured, and persist the expand/collapse state to localStorage.

## Key decisions

- From plan: Expand on first capture; persist toggle state so user preference survives refresh.
- Scope: Modify CaptureScreen state management for `isUnsortedOpen`; add localStorage persistence; smooth height transition animation.
- Existing behavior: CaptureScreen line 73 has `isUnsortedOpen` state (defaults false); line 115-123 already auto-expands on new items but doesn't persist.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 7).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P7-T2 steps).
- CaptureScreen: `components/modern/screens/CaptureScreen.tsx`.
  - State: line 73 `const [isUnsortedOpen, setIsUnsortedOpen] = useState(false)`
  - Auto-expand effect: lines 115-123
  - Toggle button: lines 446-451
  - Inbox container: lines 452-560

## Implementation notes

- Change default state initialization to read from localStorage key `unsorted_expanded`.
- On toggle click, update both React state and localStorage.
- Existing auto-expand effect (lines 115-123) already sets `isUnsortedOpen(true)` on new items; this is correct.
- Add smooth CSS transition for expand/collapse (height/max-height animation).
- Toggle button (line 447-450) should show clear visual indicator (chevron up/down icon).
- Consider accessibility: toggle should have aria-expanded attribute.

## Testing/QA

- Fresh load (no localStorage): inbox collapsed by default.
- Capture new item: inbox auto-expands; state persists.
- Toggle to collapse: state persists across page refresh.
- Toggle animation smooth (no jarring jump).
- Clear localStorage: returns to default collapsed state.
- Multiple items captured rapidly: no flicker or state race conditions.

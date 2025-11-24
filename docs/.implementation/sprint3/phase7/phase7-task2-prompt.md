# Prompt: P7-T2 — Unsorted auto-expand behavior

Context: `docs/.implementation/sprint3/phase7/phase7-task2-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 7), `docs/.implementation/sprint3/tasks.md` (P7-T2)

## Goal

Make the Unsorted/Inbox section auto-expand when new items are captured and persist the expand/collapse preference to localStorage.

## Deliverables

- Updated CaptureScreen with localStorage-backed expand state.
- Auto-expand on first capture (already partially implemented).
- Smooth height transition animation for expand/collapse.
- Clear toggle button with visual indicator (chevron icon).
- Accessibility: aria-expanded attribute on toggle.

## Implementation steps (from tasks)

1. In CaptureScreen, modify `isUnsortedOpen` state to initialize from localStorage key `unsorted_expanded`.
2. Create effect to read localStorage on mount; default to `false` if not set.
3. Update toggle click handler to persist state to localStorage alongside setState.
4. Existing auto-expand effect (lines 115-123) already handles new item expansion; verify it also persists to localStorage.
5. Add chevron icon (up/down) to toggle button based on open state.
6. Add CSS transition for smooth height animation on the inbox container.
7. Add `aria-expanded={isUnsortedOpen}` to toggle button for accessibility.

## Acceptance criteria

- Default state: collapsed (no localStorage value).
- Capture item: inbox auto-expands and state saved to localStorage.
- Toggle: click toggles and persists; refresh preserves state.
- Animation: smooth expand/collapse transition (200-300ms).
- Toggle button shows chevron direction matching current state.
- No state flicker on rapid captures.
- Works correctly with empty inbox (0 items).

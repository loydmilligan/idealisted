# Context: P4-T1 — Create PlannerDrawer component

Purpose: Extract and refactor the inline PlannerDrawer component into a reusable, standalone component with proper props interface and mobile-responsive behavior.

## Key Decisions

- From plan: Drawer slides in from right; mobile = full width, desktop = 400px fixed width.
- Existing implementation at `app/page.tsx` lines 2385-2453 provides baseline behavior.
- Use framer-motion for slide animation (already in codebase).
- Backdrop click closes drawer; includes visual close button.
- Filter tabs: All | Tasks | Notes | Lists for entity type filtering.
- Props interface should support: `isOpen`, `onClose`, `items`, `assignments` (for P4-T2), `onAdd`, `selectedDate`.

## Scope

- Create standalone component file with proper TypeScript interface.
- Maintain existing visual styling (retro-card, entity colors).
- Add mobile responsiveness (full-width on mobile).
- Wire open/close animation with AnimatePresence.
- Header displays "Add to Plan" title and selected date.
- No search/sort in this task (added in P4-T3).

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 4)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P4-T1 steps)
- Existing inline component: `app/page.tsx` lines 2385-2453
- UI patterns: `components/RetroDevice.tsx`, existing modals for framer-motion usage
- Entity colors: `getEntityColor()`, `getEntityBackgroundColor()` utility functions

## Implementation Notes

- Component file: `components/modern/PlannerDrawer.tsx`
- Import framer-motion `motion` and `AnimatePresence`
- Use z-index layer 1002+ for backdrop and 1003+ for drawer (matches existing)
- Apply responsive classes: `w-full md:w-[400px]`
- Filter state should be local to drawer component
- Initial filter defaults to "All" (shows all entity types)
- Close on Escape key press (accessibility)

## Testing/QA

- Open/close animation smooth (no jank)
- Mobile viewport: drawer is full-width
- Desktop viewport: drawer is 400px
- Backdrop click closes drawer
- Close button works
- Filter tabs switch correctly
- Items list renders with correct styling
- Add button on each item triggers onAdd callback
- Component unmounts cleanly on close

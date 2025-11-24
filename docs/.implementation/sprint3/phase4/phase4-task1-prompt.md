# Prompt: P4-T1 — Create PlannerDrawer component

Context: `docs/.implementation/sprint3/phase4/phase4-task1-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 4), `docs/.implementation/sprint3/tasks.md` (P4-T1)

## Goal

Extract the inline PlannerDrawer from page.tsx into a standalone, reusable component with proper TypeScript interface, mobile-responsive sizing, and framer-motion animations.

## Deliverables

- `components/modern/PlannerDrawer.tsx` with typed props interface
- Mobile-responsive behavior (full-width mobile, 400px desktop)
- framer-motion slide animation with AnimatePresence
- Filter tabs: All | Tasks | Notes | Lists
- Item list with Add button per item
- Close via backdrop click, close button, or Escape key

## Implementation Steps (from tasks)

1. Create `components/modern/PlannerDrawer.tsx` with props interface: `{ isOpen, onClose, items, assignments, onAdd, selectedDate }`
2. Drawer slides in from right; apply responsive width classes: `w-full md:w-[400px]`
3. Use framer-motion `motion.div` with `initial={{ x: '100%' }}`, `animate={{ x: 0 }}`, `exit={{ x: '100%' }}`
4. Add backdrop overlay (fixed inset, z-index 1002) with onClick for close
5. Header section: "Add to Plan" title, close button, formatted selected date display
6. Implement filter tabs with local state; default to "All"
7. Render filtered item list with retro-card styling, entity color borders, Add button
8. Add Escape key handler for accessibility close
9. Test: verify open/close animation, mobile/desktop sizing, filter switching

## Acceptance Criteria

- Component exports properly typed PlannerDrawerProps interface
- Drawer animates smoothly in/out from right edge
- Full-width on mobile (< md breakpoint), 400px on desktop
- Filter tabs work correctly (All shows all, Tasks shows tasks, etc.)
- Add button on items triggers onAdd callback with item.id
- Backdrop click and close button both close drawer
- Escape key closes drawer
- No regressions to existing page.tsx behavior when drawer not yet integrated

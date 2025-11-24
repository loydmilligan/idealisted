# Prompt: P7-T4 — Planner responsive audit

Context: `docs/.implementation/sprint3/phase7/phase7-task4-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 7), `docs/.implementation/sprint3/tasks.md` (P7-T4)

## Goal

Audit and fix responsive layout issues in PlannerScreen and related components across mobile, tablet, and desktop viewports.

## Deliverables

- Responsive week view: adapts column count per viewport.
- Responsive mini calendar: collapsible on mobile, visible on desktop.
- Responsive drawer: full-width mobile, partial desktop.
- Touch-friendly drag-drop verified.
- QA notes documenting viewport behavior and any limitations.

## Implementation steps (from tasks)

1. Open PlannerScreen at 375px (mobile) viewport.
2. Test week view: verify single-column or horizontal swipe layout.
3. Test mini calendar: should be collapsible/hidden by default.
4. Test drawer: should be full-width.
5. Test drag-drop with touch simulation in DevTools.
6. Open at 768px (tablet) viewport.
7. Verify week grid shows 3-4 columns.
8. Verify mini calendar position and visibility.
9. Verify drawer is partial width (~50%).
10. Open at 1200px (desktop) viewport.
11. Verify full 7-column week grid.
12. Verify mini calendar always visible in sidebar.
13. Verify drawer is 400px fixed width.
14. Fix any overflow, cutoff, or layout break issues.
15. Document mobile-specific limitations in QA notes.

## Acceptance criteria

- Mobile: usable single-day or scrolling layout; drawer full-width; calendar collapsible.
- Tablet: 3-4 day columns; drawer partial width.
- Desktop: 7-day grid; mini calendar sidebar; drawer 400px.
- Drag-drop works on touch devices (no touch-specific bugs).
- No horizontal overflow at any viewport.
- Modals fit within mobile viewport.
- All layouts visually consistent with retro design system.

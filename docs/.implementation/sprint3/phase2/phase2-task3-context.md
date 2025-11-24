# Context: P2-T3 — Reorder within same day

Purpose: Enable drag-to-reorder for items within the same day column, updating position values and syncing to database.

Key decisions
- From plan: Use @dnd-kit/sortable for within-list reordering (more specialized than core).
- SortableContext: Each day's item list wrapped in SortableContext with item IDs.
- Position updates: When reordering, update position field for all affected items.
- Batch updates: Send position changes in single API call for efficiency.
- Optimistic updates: Reorder visually immediately; sync in background.
- Animation: Subtle shift animation as items move during reorder.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint3/tasks.md (P2-T3 steps).
- Code: components/modern/screens/PlannerScreen.tsx, WeekGrid, lib/plan-storage.ts.
- dnd-kit/sortable: SortableContext, useSortable, arrayMove utilities.
- API: Batch position update endpoint or multiple PUT calls.

Implementation notes
- Replace useDraggable with useSortable for items within each day column.
- SortableContext needs items prop with ordered IDs.
- Use arrayMove from @dnd-kit/sortable to compute new order.
- Calculate new position values (1, 2, 3...) based on new order.
- Consider batching: PUT /api/plan-assignments/batch with [{id, position}...] or loop through individual PUTs.
- Animation: dnd-kit provides default transition; can customize with CSS.

Testing/QA
- Drag item up or down within same day; items reorder smoothly.
- Position values update correctly in state.
- Positions persist after page refresh.
- Smooth animation during reorder (items shift to make space).
- Works alongside cross-day drag (P2-T2); both behaviors coexist.

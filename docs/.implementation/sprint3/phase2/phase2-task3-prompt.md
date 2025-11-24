# Prompt: P2-T3 — Reorder within same day

Context: docs/.implementation/sprint3/phase2/phase2-task3-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 2), docs/.implementation/sprint3/tasks.md (P2-T3)

Goal
- Enable drag-to-reorder for items within the same day column.
- Update position values for reordered items.
- Batch position updates for efficient database sync.
- Provide smooth animation during reorder.

Deliverables
- SortableContext wrapping each day's assignment list.
- useSortable hook for sortable items.
- Reorder handler that updates position values.
- Batch API call or efficient position sync.
- Visual animation for item shifts during reorder.

Implementation steps (from tasks)
1) Import SortableContext and useSortable from @dnd-kit/sortable.
2) Wrap each day's item list in SortableContext with items={assignmentIds}.
3) Replace or augment useDraggable with useSortable for assignment items.
4) In onDragEnd, detect same-day reorder: active and over exist, both have same day, but different positions.
5) Use arrayMove utility to compute new order of assignment IDs.
6) Calculate new position values (index + 1) for all items in the reordered list.
7) Update local state and localStorage with new positions immediately (optimistic).
8) Batch position updates: either PUT /api/plan-assignments/batch or loop PUT calls.
9) Add CSS transition for smooth animation as items shift during reorder.
10) Test: reorder items within same day, refresh page, verify order persists.

Acceptance criteria
- Items within a day can be reordered via drag-and-drop.
- Position values update correctly for affected items.
- Reordered list persists after page refresh.
- Smooth animation visible as items shift during reorder.
- Same-day reorder works alongside cross-day moves (P2-T2).
- No performance issues with multiple items reordering.

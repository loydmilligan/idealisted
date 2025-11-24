# Prompt: P2-T2 — Draggable items and drop zones

Context: docs/.implementation/sprint3/phase2/phase2-task2-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 2), docs/.implementation/sprint3/tasks.md (P2-T2)

Goal
- Implement drag-and-drop for planner items using dnd-kit.
- Enable moving items between different days in the week grid.
- Provide visual feedback during drag operations.
- Persist changes to both localStorage and database.

Deliverables
- DndContext wrapping the planner/week grid.
- Draggable assignment items with drag handles.
- Droppable day columns with date-based IDs.
- Visual feedback: ghost element, drop zone highlighting.
- moveToDay function that updates assignment and syncs to DB.

Implementation steps (from tasks)
1) Wrap WeekGrid (or relevant parent) in DndContext from @dnd-kit/core.
2) For each assignment item, use useDraggable hook with unique ID (assignment.id).
3) For each day column, use useDroppable hook with ID matching date string (YYYY-MM-DD).
4) Add onDragEnd handler to DndContext that receives {active, over}.
5) In onDragEnd: if over exists and differs from item's current date, call moveToDay(assignmentId, newDate).
6) Implement moveToDay: update localStorage immediately, trigger background API PUT to update assigned_date.
7) Add DragOverlay for ghost element that follows cursor during drag.
8) Style drop zones to highlight when a draggable item hovers over them (use over state).
9) Handle edge cases: dropping outside valid zone (cancel, no state change); dropping on same day (pass through to P2-T3 logic).
10) Test: drag item between days, verify position updates and persists after refresh.

Acceptance criteria
- Items can be dragged from one day column to another.
- Ghost element visible and follows cursor during drag.
- Target day column highlights when item is dragged over it.
- Dropped item appears in new day; old day no longer shows it.
- Assignment persists across page refresh (localStorage + DB sync).
- Dropping outside valid zones cancels the drag cleanly.
- No console errors during drag-drop operations.

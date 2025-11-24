# Context: P2-T2 — Draggable items and drop zones

Purpose: Implement drag-and-drop functionality for moving planner items between days in the week grid.

Key decisions
- From plan: Use dnd-kit's Draggable and Droppable primitives.
- Drop zones: Each day column is a droppable zone; ID matches the date string (YYYY-MM-DD).
- Draggable items: Each assignment gets a unique ID; wrap in dnd-kit's draggable component.
- Visual feedback: Ghost element follows cursor during drag; drop zone highlights when item hovers over it.
- Persistence: On drop, update both localStorage and trigger background DB sync.
- Cross-day moves update the assignment's assigned_date; same-day drops handled in P2-T3.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint3/tasks.md (P2-T2 steps).
- Code: components/modern/screens/PlannerScreen.tsx, lib/plan-storage.ts.
- dnd-kit: DndContext, useDraggable, useDroppable hooks.
- API: PUT /api/plan-assignments/[id] for updating assignment date.

Implementation notes
- Wrap PlannerScreen (or WeekGrid) in DndContext provider.
- Each assignment item uses useDraggable; day columns use useDroppable.
- onDragEnd receives {active, over} - active is the dragged item, over is the drop target.
- When over.id differs from item's current date: call moveToDay() to update assignment.
- Handle edge cases: dropping outside valid zone (no-op), dropping on own day (delegate to P2-T3).
- Ghost element: use DragOverlay for smooth visual feedback.

Testing/QA
- Drag item from one day to another; item moves to new day.
- Visual feedback visible during drag (ghost, drop zone highlight).
- Assignment persists after page refresh.
- Dropping outside grid cancels drag (no state change).
- Console shows no errors during drag operations.

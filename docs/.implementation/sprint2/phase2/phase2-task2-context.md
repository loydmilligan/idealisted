# Context: P2-T2 — Capture tab structure with Unsorted as inbox beneath Today surface

Purpose: Make Today surface the primary Capture content and keep Unsorted as inbox underneath; clean up tab labels/navigation.

Key decisions
- Remove/replace "Recently Captured" surfacing; Unsorted is the inbox list under Today. Today is default view.
- Scroll/anchor between Today surface and Unsorted; Unsorted auto-expands on first capture.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint2/tasks.md (P2-T2 steps).
- Related: P2-T1 handles Today surface UI elements.

Implementation notes
- Ensure capture flows (JumpTheLine, LetAIDoIt, Ready → Convert) remain unaffected.
- Data fetch separation: Today UI must not block Unsorted queries.

Testing/QA
- Navigation/tab headers correct; capture items go to Unsorted; expand behavior works.
- Regression across existing capture flows.

# Prompt: P2-T2 — Capture tab structure with Unsorted as inbox beneath Today surface

Context: docs/.implementation/sprint2/phase2/phase2-task2-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 2), docs/.implementation/sprint2/tasks.md (P2-T2)

Goal
- Make Today surface the primary Capture content; Unsorted is inbox beneath, replacing old “Recently Captured”.

Deliverables
- Capture tab loads with Today surface on top and Unsorted list below (collapsed initially per P2-T1 behavior).
- Clean tab/header labels reflecting new structure.
- Stable navigation/scroll between Today and Unsorted; jump link if needed.
- QA notes for structure/navigation.

Implementation steps (from tasks)
1) Set Today surface as primary; keep Unsorted underneath.
2) Adjust tab headers/nav to remove orphaned Recently Captured.
3) Wire capture actions to drop into Unsorted and trigger expand on first item.
4) Handle scroll/anchor between sections; add jump-to-inbox if appropriate.
5) Keep data fetch separated so Today UI doesn’t block Unsorted load.
6) Regression on existing capture flows (JumpTheLine, LetAIDoIt, Ready → Convert).
7) Log QA results.

Acceptance criteria
- New structure visible; no dead tabs; captures land in Unsorted.
- No regressions to other capture paths.

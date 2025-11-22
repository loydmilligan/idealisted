# Prompt: P1-T1 — List template bottom-sheet + monochrome AI/mic

Context: docs/.implementation/sprint2/phase1/phase1-task1-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 1), docs/.implementation/sprint2/tasks.md (P1-T1)

Goal
- Refactor list template selector to mobile bottom sheet (desktop parity) and swap AI/mic icons to monochrome variants.

Deliverables
- Updated selector UI with bottom-sheet behavior (focus trap, escape/overlay close, sizing per markdown editor sheet).
- Monochrome AI/mic icons applied in capture/editor surfaces.
- QA notes for selectors/icon swap.

Implementation steps (from tasks)
1) Locate selector and refactor to bottom sheet with managed open/close.
2) Wire triggers; ensure focus/escape/overlay close.
3) Apply existing editor sheet styles and scroll bounds.
4) Swap icons to monochrome; update assets/theme if needed.
5) Verify template selection updates state/payload; avoid legacy todo collision.
6) Add tests/story checks if available; smoke mobile viewport.
7) Log QA results.

Acceptance criteria
- Mobile sheet matches editor styling; desktop unaffected.
- Template selection works; no regressions to creation flow.
- Icons monochrome; no unexpected color regressions.

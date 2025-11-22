# Context: P1-T1 — List template bottom-sheet + monochrome AI/mic

Purpose: Refactor list template selector to mobile bottom sheet, keep desktop parity, swap AI/mic icons to monochrome.

Key decisions
- From plan: bottom sheet should mirror markdown editor sheet; legacy todo name collision avoided (use list types only). Icons go monochrome, entity colors kept only via logo.
- Scope: selectors only; no new templates created.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 1).
- Tasks: docs/.implementation/sprint2/tasks.md (P1-T1 steps).
- Code likely: components for list creation/template selector, markdown editor sheet styles, icon assets/theme tokens.

Implementation notes
- Ensure focus trap, escape/overlay close, height/scroll bounds match existing sheet.
- Verify selection updates state/creation payload correctly.
- Maintain desktop behavior; mobile uses sheet.

Testing/QA
- Mobile tap/scroll, desktop click, selection updates entity create flow.
- Icon swap visible in capture/editor; no color regressions.

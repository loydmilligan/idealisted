# Context: P7-T5 — Regression testing

Purpose: Full regression pass across all Sprint 3 features and critical existing functionality to ensure no regressions.

## Key decisions

- From plan: Test capture flows, AI gating, planner persistence, drag-drop, all entity types.
- Scope: Comprehensive testing covering Phases 1-7 deliverables plus existing Beta MVP features.
- Output: Run lint and build; document issues for immediate fix or Sprint 4.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 7).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P7-T5 steps).
- Sprint 3 phases: plan.md for all features.
- Beta MVP features: `CLAUDE.md` (Beta MVP Features section).
- Build commands: `npm run lint`, `npm run build`.

## Test areas

1. **Capture flow**:
   - Quick capture to unsorted.
   - Voice input (if enabled browser).
   - AI analyze button (when AI enabled).
   - Quick sort buttons (Task, Note, Project, List with subtypes).

2. **Entity creation**:
   - Task modal: all fields save correctly.
   - Note modal: subtype persists.
   - Project modal: status and description.
   - List modal: items saved.

3. **Planner (Sprint 3)**:
   - Assignments persist across refresh.
   - Drag between days updates correctly.
   - Morning/evening flows trigger appropriately.
   - Drawer shows planned indicators.

4. **AI features**:
   - AI enabled: suggestion panel, tag suggestions work.
   - AI disabled: all AI UI hidden, backend rejects requests.

5. **Settings**:
   - All toggles persist.
   - AI config saves.
   - Ntfy config saves.
   - Planner schedule settings (if implemented).

6. **Notifications**:
   - Task reminders fire.
   - Daily review reminder works.

## Implementation notes

- Create systematic test checklist.
- Run through each area manually.
- Check browser console for errors.
- Run `npm run lint` and fix any failures.
- Run `npm run build` to verify production build.
- Document issues: categorize as "fix now" vs "Sprint 4".

## Testing/QA

- All test areas pass or have documented issues.
- Lint passes with no errors.
- Build succeeds with no errors.
- Console has no unexpected errors/warnings.
- All Sprint 3 features work as specified.

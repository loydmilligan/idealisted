# Context: P7-T6 — Documentation updates

Purpose: Update all project documentation to reflect Sprint 3 features and prepare Sprint 4 planning materials.

## Key decisions

- From plan: Update README, CHANGELOG, CLAUDE.md; document new components/patterns; create Sprint 4 parking lot.
- Scope: Documentation only; no code changes.
- Files: README.md, CHANGELOG.md, CLAUDE.md, Sprint 4 parking lot file.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 7).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P7-T6 steps).
- README: `/home/dietpi/projects/idealisted/README.md`.
- CHANGELOG: `/home/dietpi/projects/idealisted/CHANGELOG.md`.
- CLAUDE.md: `/home/dietpi/projects/idealisted/CLAUDE.md`.
- Sprint 3 plan: `docs/.implementation/sprint3/plan.md` (Out of Scope section for Sprint 4 items).

## Documentation updates

### README.md
- Add Sprint 3 features section:
  - Planner persistence (LocalStorage + SQLite sync)
  - Drag-drop week view
  - Morning finalize / evening review flows
  - Global tasks drawer
  - AI append flows for lists and projects
  - Daily recap with AI summary or quote fallback
  - Daily reminder notifications

### CHANGELOG.md
- Add Sprint 3 release entry with:
  - New features (planner, AI append, recap, reminders)
  - Improvements (mobile polish, responsive layouts)
  - Bug fixes (if any documented during testing)

### CLAUDE.md
- Update Architecture section with new components:
  - PlannerScreen, WeekGrid, MiniCalendar, PlannerDrawer
  - Plan assignments API and storage layer
  - AI append and recap endpoints
- Update Important Implementation Details:
  - Planner persistence pattern (LocalStorage + DB sync)
  - Morning/evening flow triggers
- Update Post-Beta Features sprint status

### Sprint 4 Parking Lot
- Create `docs/.implementation/sprint4/parking-lot.md`
- Include items from Sprint 3 "Out of Scope":
  - Archive surfacing and auto-archive
  - Chrome Extension documentation/polish
  - AI rewrite/cleanup for markdown
  - Smarter list parsing without AI
  - Project widgets
  - Additional note types
- Add any issues discovered during P7-T5 testing

## Testing/QA

- All documentation files exist and are valid markdown.
- Feature descriptions are accurate.
- No broken links.
- Sprint 4 parking lot has all deferred items.

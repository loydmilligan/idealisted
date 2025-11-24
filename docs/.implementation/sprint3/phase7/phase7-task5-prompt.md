# Prompt: P7-T5 — Regression testing

Context: `docs/.implementation/sprint3/phase7/phase7-task5-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 7), `docs/.implementation/sprint3/tasks.md` (P7-T5)

## Goal

Execute comprehensive regression testing across all Sprint 3 features and existing functionality; run lint and build; document all issues.

## Deliverables

- Completed test checklist with pass/fail for each area.
- Lint passes with no errors.
- Production build succeeds.
- Issue log categorized as "immediate fix" vs "Sprint 4".

## Implementation steps (from tasks)

1. Test capture flow: quick capture, voice input, AI analysis, quick sort buttons.
2. Test entity creation: task, note, list, project modals all save correctly.
3. Test planner: assign items, drag between days, morning/evening flows.
4. Test AI features: enabled vs disabled behavior.
5. Test settings: all toggles persist and affect behavior.
6. Test notifications: task reminders, daily review reminder.
7. Check browser console for errors/warnings.
8. Run `npm run lint` and fix any errors.
9. Run `npm run build` to verify production build succeeds.
10. Document all issues found; categorize for immediate fix or Sprint 4.

## Acceptance criteria

- Capture flow: unsorted save, voice append, AI suggestion panel appears.
- Entity modals: all fields save to DB correctly.
- Planner: assignments persist refresh; drag updates both days.
- AI toggle: enabled shows AI UI; disabled hides all AI elements.
- Settings: values persist and behavior matches.
- Lint: zero errors (warnings acceptable if documented).
- Build: succeeds with exit code 0.
- Issues: all "immediate fix" issues resolved before merge.

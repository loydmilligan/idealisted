# Prompt: P4-T2 — Visual indicators for planned items

Context: `docs/.implementation/sprint3/phase4/phase4-task2-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 4), `docs/.implementation/sprint3/tasks.md` (P4-T2)

## Goal

Add visual indicators in PlannerDrawer to differentiate between unplanned items, items already planned for the selected date, and items planned for other dates.

## Deliverables

- Assignment status logic integrated into PlannerDrawer
- Visual differentiation for three states: unplanned, planned-for-today, planned-for-other-date
- Badge/indicator showing assigned date(s) for items planned elsewhere
- Dimmed styling for items already on selected date
- Updated Add button behavior based on assignment status

## Implementation Steps (from tasks)

1. In PlannerDrawer, ensure `assignments` prop is typed as `PlanAssignment[]`
2. Create helper: `const isPlannedFor = (itemId: string, date: string) => assignments.some(a => a.item_id === itemId && a.assigned_date === date)`
3. Create helper: `const getAssignedDates = (itemId: string) => assignments.filter(a => a.item_id === itemId).map(a => a.assigned_date)`
4. For each item, check if assigned to selectedDate: apply `opacity-60` class and show "Already planned" badge
5. For items assigned to other dates: show small date badge(s) indicating when planned
6. Style badges: pill/chip style, muted color, date formatted as "Mon 15" or similar short format
7. Clicking assigned item shows option to "View in plan" or "Add to another day" (basic implementation, can enhance in P4-T4)
8. Test: mix of unplanned/planned items, verify indicators correct

## Acceptance Criteria

- Unplanned items display normally with active Add button
- Items planned for selectedDate show dimmed (opacity ~0.6) with "Already planned" indicator
- Items planned for other dates show date badges
- Add button disabled or hidden for items already on selectedDate
- Badge styling matches retro theme
- Correct assignments checked via item_id matching
- No false positives/negatives in planned status detection

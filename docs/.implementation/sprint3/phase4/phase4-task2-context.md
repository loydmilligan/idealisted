# Context: P4-T2 — Visual indicators for planned items

Purpose: Add visual feedback in PlannerDrawer to show which items are already assigned to the planner, with differentiation between "planned for selected date" and "planned for another date."

## Key Decisions

- From plan: Show badge/dimming for already-planned items; no hard hide (show all but mark planned ones).
- Items assigned to current selectedDate: "Already planned" label with dimmed style.
- Items assigned to other dates: Show badge with assigned date(s).
- Clicking assigned item can show options: "View in plan" or "Add to another day".
- Visual treatment: checkmark icon, colored border, or badge indicator.

## Scope

- Receive and process `assignments` prop (all assignments, not just current day)
- Determine planned status per item via `assignments.some(a => a.item_id === item.id)`
- Apply visual differentiation for planned vs unplanned items
- Show assigned date info for items planned on other days
- Optional: click behavior for assigned items (can defer complex logic to P4-T4)

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 4)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P4-T2 steps)
- Component: `components/modern/PlannerDrawer.tsx` (created in P4-T1)
- Types: `PlanAssignment` type (created in P1-T1) with `{ id, item_id, assigned_date, position }`

## Implementation Notes

- Assignments prop type: `PlanAssignment[]`
- Helper function: `isPlannedForDate(itemId, date)` and `getPlannedDates(itemId)`
- Visual states:
  - Not planned: Normal display with Add button enabled
  - Planned for selectedDate: Dimmed (opacity ~0.6), "Already planned" badge, Add button disabled or hidden
  - Planned for other date(s): Normal display with date badge(s), Add button may add to another day
- Badge styling: Use retro-badge or custom pill component
- Consider using checkmark icon from existing icon set

## Testing/QA

- Items with no assignments show normal with Add button
- Items assigned to current date show dimmed with "Already planned"
- Items assigned to other dates show date badge
- Items assigned to multiple dates show multiple indicators or count
- Add button behavior correct for each state
- Visual styling consistent with retro theme

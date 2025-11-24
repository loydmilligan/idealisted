# Prompt: P7-T3 — Mobile spacing and tap targets

Context: `docs/.implementation/sprint3/phase7/phase7-task3-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 7), `docs/.implementation/sprint3/tasks.md` (P7-T3)

## Goal

Audit CaptureScreen on mobile viewports and fix any spacing or tap target issues to ensure comfortable touch interactions.

## Deliverables

- All interactive elements meet 44x44px minimum tap target.
- Fixed spacing/padding for cramped areas.
- Verified scroll behavior on touch.
- Z-index fixes for any overlapping elements.
- QA notes documenting audit results and changes.

## Implementation steps (from tasks)

1. Open CaptureScreen in browser at 375px viewport width.
2. Audit all tap targets; document any below 44x44px.
3. Fix capture box buttons (mic, checkmark, AI) sizing if needed.
4. Fix quick sort buttons padding/height.
5. Fix inbox item action buttons sizing.
6. Fix Journal/Media save buttons sizing.
7. Test Today card, Journal card, Media card interactions.
8. Verify scroll behavior in inbox container works with touch.
9. Check for z-index issues with any overlays or dropdowns.
10. Repeat audit at 414px viewport.
11. Test on actual mobile device or accurate emulator if available.
12. Document all changes and remaining issues.

## Acceptance criteria

- All buttons/tappable elements >= 44x44px touch area.
- No overlapping tap zones.
- Comfortable spacing between interactive elements (8px+ gap).
- Horizontal scroll on sort buttons works smoothly.
- No content clipped at mobile widths.
- Inbox scroll works correctly on touch.
- Note/List subtype menus don't overflow viewport.

# Phase 5: Badge Flash Animation Testing

## Manual Testing Checklist

### Capture Tests
- [ ] Capture to Unsorted → Unsorted tab badge flashes (no color)
- [ ] Capture to Task → Ready tab badge flashes BLUE
- [ ] Capture to Note → Ready tab badge flashes ORANGE
- [ ] Capture to Project → Ready tab badge flashes GREEN
- [ ] Capture to List → Ready tab badge flashes PURPLE

### Sort Tests (from Unsorted to Ready)
- [ ] Sort as Task → Ready tab badge flashes BLUE
- [ ] Sort as Note → Ready tab badge flashes ORANGE
- [ ] Sort as Project → Ready tab badge flashes GREEN
- [ ] Sort as List → Ready tab badge flashes PURPLE

### Convert Tests (from Ready to Files)
- [ ] Convert Task entity → Files tab badge flashes BLUE
- [ ] Convert Note entity → Files tab badge flashes ORANGE
- [ ] Convert Project entity → Files tab badge flashes GREEN
- [ ] Convert List entity → Files tab badge flashes PURPLE

### Edge Cases
- [ ] Multiple rapid captures → Each flash completes without overlap
- [ ] Flash duration approximately 600ms
- [ ] Badge count updates immediately (before flash completes)
- [ ] Switching tabs during flash → Flash continues

## Expected Behavior

**Flash Colors:**
- Task: Blue (#4A90E2)
- Note: Orange (#F5A623)
- Project: Green (#7ED321)
- List: Purple (#BD10E0)
- Unsorted: No color (default flash - currently no animation for null entityType)

**Timing:**
- Flash starts immediately after API success
- Flash lasts 600ms
- Badge count updates before flash animation

**Visual:**
- Flash should be visible but not jarring
- Should use CSS animations defined in retro.css
- Background color with opacity + glow effect
- Slight scale animation (1.05x at peak)

## Implementation Summary

### Files Modified

**1. /home/mmariani/Projects/idealisted/components/modern/BottomTabNav.tsx**
- Added forwardRef pattern with TabNavHandle interface
- Added state for flashingTab and flashColor
- Exposed triggerFlash method via useImperativeHandle
- Applied flash classes conditionally to tab buttons
- Removed deprecated useTabFlash hook

**2. /home/mmariani/Projects/idealisted/styles/retro.css**
- Added @keyframes flashTask, flashNote, flashProject, flashList
- Each animation has 3 phases: start (0%), peak (25%, 75%), mid (50%), end (100%)
- Applied entity-specific colors with opacity and glow
- CSS classes: .retro-tab.flash-task, .flash-note, .flash-project, .flash-list

**3. /home/mmariani/Projects/idealisted/app/page.tsx**
- Created tabNavRef with TabNavHandle type
- Passed ref to BottomTabNav component
- Added flash triggers in:
  - handleCapture: Flashes unsorted (null) or ready (entityType)
  - handleSort: Flashes ready with entityType
  - handleModalSave: Flashes files with entityType

## How Flash is Triggered

```typescript
// From parent component (app/page.tsx)
const tabNavRef = useRef<TabNavHandle>(null)

// Trigger flash after successful operation
tabNavRef.current?.triggerFlash('ready', 'task') // Blue flash
tabNavRef.current?.triggerFlash('unsorted', null) // No color flash
```

## CSS Classes Used

```css
/* Entity-specific flash animations */
.retro-tab.flash-task    /* Blue: #4A90E2 */
.retro-tab.flash-note    /* Orange: #F5A623 */
.retro-tab.flash-project /* Green: #7ED321 */
.retro-tab.flash-list    /* Purple: #BD10E0 */
```

## Testing Instructions

1. Start the dev server: `npm run dev`
2. Open the app in a browser
3. Test each scenario from the checklist above
4. Observe the flash animations on the bottom tab navigation
5. Verify colors match entity types
6. Check timing and smoothness of animations

## Known Limitations

- Unsorted captures (entityType = null) currently have no visual flash animation
- Could add a generic grey flash for unsorted if desired
- Rapid successive flashes on the same tab will restart the animation (last flash wins)

## Next Steps

If testing reveals issues:
1. Adjust animation timing in retro.css keyframes
2. Modify opacity/glow values for visibility
3. Add flash animation for null entityType if needed
4. Consider adding sound effects for accessibility

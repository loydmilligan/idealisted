# Entity Modal Enhancement Testing Guide

## Manual Test Steps

### Test 1: Task Entity Modal
1. Navigate to Capture tab
2. Type an idea: "Fix database schema"
3. Click "Task" button
4. Verify modal slides up smoothly from bottom
5. **Test all fields:**
   - Title: Pre-filled with "Fix database schema"
   - Description: Add "Update all tables to v2 schema"
   - Status: Change to "in-progress"
   - Priority: Set to "3"
   - Project: Select a project from dropdown (or None)
   - Due Date: Set to tomorrow's date
   - Estimated Time: Enter "4"
   - Tags: Add "backend", "database"
6. Click "SAVE" button
7. Verify modal slides down smoothly
8. Navigate to Files tab
9. Verify task appears with all data saved

### Test 2: Note Entity Modal with Subtype
1. Navigate to Capture tab
2. Type an idea: "Meeting notes from standup"
3. Click "Note ▾" dropdown
4. Select "Meeting" from dropdown
5. Verify modal opens
6. **Test all fields:**
   - Title: Pre-filled
   - Description: Add meeting details
   - Note Type: Should show "Meeting" selected
   - Change Note Type to "Research"
   - Tags: Add "team", "daily"
7. Click "SAVE & GO TO FILES" button
8. Verify:
   - Modal slides down
   - Automatically navigates to Files tab
   - Note appears with correct subtype saved

### Test 3: Project Entity Modal
1. Navigate to Unsorted tab
2. Add an idea: "Build new dashboard feature"
3. Sort to "Ready" as Project
4. Navigate to Ready tab
5. Click "Convert" on the project item
6. **Test all fields:**
   - Title: Pre-filled
   - Description: Add project details
   - Status: Set to "active"
   - Progress: Set to "25"
   - Start Date: Set to today
   - End Date: Set to 2 weeks from now
   - Deadline: Set to 3 weeks from now
   - Tags: Add "frontend", "ui"
7. Click "SAVE" button
8. Verify project appears in Files with all fields

### Test 4: Note Subtype Persistence
1. Capture idea directly as Note → Research
2. Navigate to Files tab
3. Click on the note to edit
4. Verify Note Type shows "Research"
5. Change to "Video"
6. Save and reopen
7. Verify Note Type persists as "Video"

### Test 5: Project Dropdown in Task Modal
1. Create 2-3 projects first
2. Create a new task
3. Open task modal
4. Verify Project dropdown shows:
   - "None" option
   - All created projects listed
5. Select a project
6. Save task
7. Reopen task
8. Verify selected project persists

### Test 6: Modal Animations
1. Open any entity modal
2. **Verify animations:**
   - Overlay fades in (opacity 0 → 1)
   - Modal slides up from bottom (y: 100% → 0)
   - Smooth spring animation (no jank)
3. Close modal
4. **Verify exit animations:**
   - Modal slides down (y: 0 → 100%)
   - Overlay fades out
   - Animations complete before unmount

### Test 7: Dual Save Buttons
1. Open any entity modal
2. Verify two buttons visible:
   - "SAVE" (or "CONVERT" for new items)
   - "SAVE & GO TO FILES"
3. Test "SAVE" button:
   - Saves data
   - Closes modal
   - Stays on current tab
4. Test "SAVE & GO TO FILES" button:
   - Saves data
   - Closes modal
   - Navigates to Files tab
   - (TODO: Should filter by entity type)

### Test 8: Field Validation
1. **Task Priority:**
   - Try entering priority > 5 → Should save but clamp to valid range
   - Try entering priority < 1 → Should handle gracefully
2. **Project Progress:**
   - Try entering > 100 → Should clamp to 100
   - Try entering < 0 → Should clamp to 0
3. **Date Fields:**
   - Verify date picker works on mobile and desktop
   - Verify dates save as timestamps correctly

### Test 9: Integration with Unsorted/Ready Flow
1. Add idea to Unsorted
2. Sort to Task (with note subtype)
3. Verify metadata carries forward
4. Convert from Ready tab
5. Verify modal pre-populates with sorted data
6. Complete conversion
7. Verify all data persists

### Test 10: API Validation
1. Open browser DevTools → Network tab
2. Create task with invalid priority (e.g., 10)
3. Verify API returns 400 error
4. Try invalid note subtype (e.g., "invalid")
5. Verify API returns 400 error
6. Try invalid project progress (e.g., 150)
7. Verify API returns 400 error

## Expected Results

### Working Features (✅)
- [ ] Modal slide animations (framer-motion)
- [ ] Dual save buttons render
- [ ] Task fields (Status, Priority, Project, Due Date, Est. Time)
- [ ] Note subtype selector
- [ ] Project fields (Status, Progress, Start/End/Deadline dates)
- [ ] Note template mapping (Capture → Note types)
- [ ] FormField select dropdown support
- [ ] API validation for new fields
- [ ] Save & Go to Files navigation
- [ ] Project dropdown in task modal

### Known Issues (❌)
- Entity type filter not applied in Files tab after "Save & Go to Files"
- Badge animations on entity creation not implemented yet

### Deferred (Future)
- Playwright E2E automated tests
- Entity type color filter in Files tab
- Badge flash animations on save

## Automation Test Structure (Playwright)

```typescript
// tests/entity-modal.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Entity Modal Enhancements', () => {
  test('should show all task fields', async ({ page }) => {
    await page.goto('http://localhost:3000?tab=capture')
    await page.fill('textarea', 'Test task')
    await page.click('button:has-text("Task")')

    await expect(page.locator('select[name="status"]')).toBeVisible()
    await expect(page.locator('input[type="number"][name="priority"]')).toBeVisible()
    await expect(page.locator('select[name="project"]')).toBeVisible()
  })

  test('should save and navigate with dual buttons', async ({ page }) => {
    // ... test implementation
  })

  test('should animate modal entrance/exit', async ({ page }) => {
    // ... test implementation
  })
})
```

## Performance Checklist

- [ ] Modal renders in < 100ms
- [ ] Animations run at 60fps
- [ ] No layout shift on modal open
- [ ] Project dropdown loads quickly (< 50ms for 100 projects)
- [ ] Save operation completes in < 500ms
- [ ] Navigation after save is instant (< 100ms)

## Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (Desktop)
- [ ] Safari (iOS)
- [ ] Chrome (Android)

## Accessibility Checklist

- [ ] Modal can be closed with Escape key (✅ already implemented)
- [ ] Focus trapped within modal
- [ ] Form fields have proper labels
- [ ] Select dropdowns keyboard navigable
- [ ] ARIA roles for modal dialog
- [ ] Screen reader announces modal open/close

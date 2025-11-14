# Beta MVP Implementation Plan

**Created:** 2025-01-13
**Goal:** Complete beta MVP with all core features working and tested

---

## PHASE 1: Quick Wins & Branding (2-3 hours)
**Goal:** Fix visible branding issues and logos
**Risk:** Low | **Impact:** High visibility

### Task 1.1: Fix Device Branding
- **File:** `app/page.tsx:503`
- **Change:** "IdeaListed" → "FrondNut"
- **Acceptance:** Device frame shows "FrondNut" on widescreen

### Task 1.2: Create FrondNut Palm/Blackberry Logo
- **Files:** Create new component or SVG
- **Requirements:**
  - Palm Pilot / Blackberry style
  - Retro aesthetic
  - Fits device branding area
- **Acceptance:** Logo displays in device branding section

### Task 1.3: Enhance Files Tab Icon - Inactive State
- **File:** `components/modern/TabIcons.tsx` (EntitiesIcon, lines 67-101)
- **Current Behavior:** Icon shows colored squares when active, fully gray when inactive
- **Required Change:** When inactive, show colored outlines instead of solid gray
- **Implementation:**
  - Keep fill colors when active
  - When inactive: transparent fill with colored strokes
  - Each square should have its entity color as stroke
- **Acceptance:** Inactive Files tab shows rainbow grid outlines, active shows filled squares

---

## PHASE 2: Entity Modal Enhancements (5-7 hours)
**Goal:** Add missing entity-specific fields to conversion modal, API routes, and template mapping
**Risk:** Medium | **Impact:** Core functionality

### Task 2.1: Add Task Entity Fields
**File:** `app/page.tsx` (modal fields section ~610-629)

**Add:**
1. **Priority Selector**
   - Type: Dropdown or number input (1-5)
   - Default: 1
   - Field: `modalData.priority`

2. **Status Selector**
   - Type: Dropdown/Radio
   - Options: pending, in-progress, completed
   - Default: pending
   - Field: `modalData.status`

3. **Project Dropdown**
   - Type: Dropdown (populated from projects)
   - Options: List of user's projects + "None"
   - Field: `modalData.project_id`

**Update Save Handler:** `handleModalSave` (lines 406-414)
- Add priority, status, project_id to task entity data

**Acceptance:**
- Modal shows all 3 new fields for tasks
- Values save to database correctly
- Files tab displays priority/status

### Task 2.2: Add Note Entity Fields
**File:** `app/page.tsx` (modal fields section ~586-607)

**Add:**
1. **Subtype Selector**
   - Type: Dropdown
   - Options: general, research, video, link, file, contact, meeting
   - Default: general
   - Field: `modalData.subtype`

**Update Save Handler:** (lines 415-421)
- Use `modalData.subtype` instead of hardcoded 'general'

**Update Quick Capture:** Capture template selection → Set entity_type AND subtype
- CaptureScreen.tsx: Pass subtype when template selected
- InboxCard.tsx: Pass subtype when template selected

**Acceptance:**
- Modal shows subtype selector
- Template selection sets correct subtype
- Files tab shows note subtype in badge/label

### Task 2.3: Add Project Entity Fields
**File:** `app/page.tsx` (modal fields section ~631-638)

**Add:**
1. **Status Selector**
   - Type: Dropdown/Radio
   - Options: planning, active, completed
   - Default: planning
   - Field: `modalData.projectStatus`

2. **Progress Input**
   - Type: Number input or slider
   - Range: 0-100
   - Label: "Progress (%)"
   - Field: `modalData.progress`

3. **Start Date**
   - Type: Date picker
   - Field: `modalData.start_date`

4. **End Date**
   - Type: Date picker
   - Field: `modalData.end_date`

**Update Save Handler:** (lines 423-431)
- Use actual values instead of hardcoded defaults
- Fix tags: Use `modalData.tags` not empty array

**Acceptance:**
- Modal shows all 4 new fields for projects
- Values save correctly
- Files tab displays project status/progress

### Task 2.4: Add Dual Save Buttons
**File:** `components/modern/EntityModal.tsx` (lines 146-151)

**Current:** Single "CONVERT" / "SAVE" button

**Change to:**
1. **"SAVE"** - Closes modal, stays on current tab
2. **"SAVE & GO TO FILES"** - Closes modal, navigates to Files tab

**Implementation:**
- Add `onSaveAndNavigate` prop to EntityModal
- Update button section to show both buttons
- Wire up handlers in app/page.tsx

**Files tab navigation:**
- Add optional `entityType` param to set default filter
- When navigating after save, select matching entity filter

**Acceptance:**
- Two buttons visible in modal
- "SAVE" closes modal, stays on tab
- "SAVE & GO TO FILES" navigates to Files and shows item

### Task 2.5: Add Modal Slide Animations
**File:** `components/modern/EntityModal.tsx`

**Current:** Modal appears instantly
**CSS exists:** `animate-slide-up` class in styles/modern.css

**Add:**
1. Apply `animate-slide-up` class to modal div (line 92)
2. Apply `animate-fade-overlay` to overlay div (line 87)
3. Handle exit animations (slide-down on close)

**Use framer-motion:**
```tsx
<motion.div
  initial={{ y: "100%" }}
  animate={{ y: 0 }}
  exit={{ y: "100%" }}
  transition={{ type: "spring", damping: 25, stiffness: 200 }}
>
```

**Wrap modal in AnimatePresence:**
In `app/page.tsx` (lines ~644-647):
```typescript
import { AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  {modalOpen && (
    <EntityModal
      isOpen={modalOpen}
      // ... rest of props
    />
  )}
</AnimatePresence>
```

**This enables proper exit animations (modal stays mounted during slide-down)**

**Acceptance:**
- Modal slides up from bottom when opening
- Modal slides down when closing
- Smooth animation (~300-400ms)

### Task 2.6: Create Playwright Manual Test
**File:** Create `tests/modal-animations.spec.ts`

**Test Steps:**
1. Open app
2. Capture idea → Sort to Ready
3. Click Convert button
4. Verify modal slides up smoothly
5. Fill in fields
6. Click "SAVE & GO TO FILES"
7. Verify modal slides down
8. Verify navigation to Files tab
9. Verify item appears with correct entity type

**Acceptance:**
- Test passes
- Manual verification confirms smooth UX

### Task 2.7: Update API Routes for New Entity Fields
**File:** `app/api/items/[id]/route.ts` (PUT handler)

**Add field handling:**
1. **Task fields** (lines ~210-244):
   - Accept `priority` (number 1-5)
   - Accept `status` (string: pending/in-progress/completed)
   - Accept `project_id` (string or null)
   - Validate values before saving

2. **Note fields** (lines ~246-274):
   - Accept `subtype` (validate against enum)
   - Enum: general, research, video, link, file, contact, meeting

3. **Project fields** (lines ~276-312):
   - Accept `progress` (number 0-100)
   - Accept `start_date` (timestamp or null)
   - Accept `end_date` (timestamp or null)
   - Already handles `status` and `deadline`

**Add validation:**
```typescript
if (body.task?.priority && (body.task.priority < 1 || body.task.priority > 5)) {
  return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
}
if (body.note?.subtype) {
  const validSubtypes = ['general', 'research', 'video', 'link', 'file', 'contact', 'meeting']
  if (!validSubtypes.includes(body.note.subtype)) {
    return NextResponse.json({ error: 'Invalid note subtype' }, { status: 400 })
  }
}
```

**Acceptance:**
- API accepts and persists all new fields
- Validation prevents invalid data
- Fields display correctly in Files tab

### Task 2.8: Wire Up Note Template to Subtype Mapping
**Files:**
- `components/modern/screens/CaptureScreen.tsx` (lines 131-166)
- `components/modern/InboxCard.tsx` (lines 92-107)
- `app/page.tsx` (handleCapture function)

**Update template configuration:**
```typescript
const templates = [
  { label: 'Note', subtype: 'general' },
  { label: 'Research', subtype: 'research' },
  { label: 'Video', subtype: 'video' },
  { label: 'Link', subtype: 'link' },
  { label: 'File', subtype: 'file' },
  { label: 'Meeting', subtype: 'meeting' },
]
```

**Update handlers:**
- Pass subtype through capture flow: `handleCapture('note', subtype)`
- Store in item metadata or entity_type field
- Use subtype when creating note entity

**Acceptance:**
- Selecting "Research" template creates note with subtype='research'
- Subtype persists through Ready tab to conversion
- Modal shows correct subtype when converting

---

## PHASE 3: AI Master Toggle System (2-3 hours)
**Goal:** Add toggle to disable ALL AI features
**Risk:** Low | **Impact:** Core requirement

### Task 3.1: Update AIConfig Type
**File:** `types/index.ts` (lines 142-150)

**Add field:**
```typescript
export interface AIConfig {
  enabled: boolean  // NEW - defaults to false
  openrouterApiKey: string
  // ... rest
}
```

### Task 3.2: Add Master Toggle to AI Settings Tab
**File:** `components/modern/settings/AISettingsTab.tsx`

**Add at top (before API key field):**
```tsx
<div className="retro-form-group">
  <label className="retro-label retro-toggle-label">
    <input
      type="checkbox"
      checked={config.enabled}
      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
      className="retro-toggle"
    />
    <span>Enable AI Features</span>
  </label>
</div>
```

**Disable all fields when `!config.enabled`:**
- Add `disabled={!config.enabled}` to all inputs
- Gray out/fade fields visually

### Task 3.3: Create Initial AI Config with enabled=false
**File:** `app/api/settings/route.ts` or database init

**Add default config creation:**
```typescript
// On first access, create default AI config
if (!existingConfig) {
  const defaultConfig = {
    enabled: false,  // Default to OFF
    openrouterApiKey: '',
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    freeModel: 'meta-llama/llama-3.1-8b-instruct:free',
    paidModel: 'anthropic/claude-3.5-sonnet',
  }
  // Save to database
}
```

### Task 3.4: Hide AI UI Elements Based on Settings
**Pattern:** Each component fetches AI config on mount and conditionally renders

**Files to update:**
- `components/modern/screens/CaptureScreen.tsx` - Hide "AI ▾" button
- `components/modern/InboxCard.tsx` - Hide "AI ▾" button
- `components/modern/EntityModal.tsx` - Hide "AI AUTOFILL" button
- `components/modern/ReadyCard.tsx` - Hide AI menu items

**Implementation pattern:**
```tsx
const [aiEnabled, setAiEnabled] = useState(false)

useEffect(() => {
  fetch('/api/settings/ai')
    .then(res => res.json())
    .then(data => setAiEnabled(data.enabled ?? false))
}, [])

{aiEnabled && (
  <button>AI ▾</button>
)}
```

**Acceptance:**
- AI toggle appears in settings
- Defaults to OFF
- Hides AI buttons throughout app when disabled
- Setting persists across sessions

---

## PHASE 4: Speech-to-Text Input (2-3 hours)
**Goal:** Add voice input to capture screen
**Risk:** Low | **Impact:** New feature

### Task 4.1: Add Microphone Button to CaptureScreen
**File:** `components/modern/screens/CaptureScreen.tsx`

**Add button next to textarea:**
```tsx
<button
  onClick={handleVoiceInput}
  disabled={isListening}
  className="retro-btn retro-btn-icon"
  aria-label="Voice input"
>
  {isListening ? '🔴' : '🎤'}
</button>
```

### Task 4.2: Implement Web Speech API Hook
**File:** Create `lib/useSpeechRecognition.ts`

```typescript
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const recognition = new webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setTranscript(transcript)
    }

    recognition.start()
  }

  return { isListening, transcript, startListening }
}
```

### Task 4.3: Integrate with Capture Flow
**File:** `components/modern/screens/CaptureScreen.tsx`

- Use hook
- On transcript update, set inputText
- Show visual feedback when listening (red dot icon)
- Auto-submit or let user edit before submitting

**Acceptance:**
- Mic button appears
- Clicking starts listening (turns red)
- Speech transcribed to text input
- Works in Chrome/Edge/Safari
- Graceful error in Firefox

---

## PHASE 5: Badge Flash Animations (2-3 hours)
**Goal:** Flash tabs with entity colors when items processed
**Risk:** Low | **Impact:** Visual feedback

### Task 5.1: Expose Flash Trigger via forwardRef
**File:** `components/modern/BottomTabNav.tsx`

**Refactor component to expose imperative handle:**
```tsx
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

export const BottomTabNav = forwardRef<
  { triggerFlash: (tabId: TabId, entityType: EntityType | null) => void },
  BottomTabNavProps
>((props, ref) => {
  const [flashingTab, setFlashingTab] = useState<TabId | null>(null)
  const [flashColor, setFlashColor] = useState<EntityType | null>(null)

  useImperativeHandle(ref, () => ({
    triggerFlash: (tabId, entityType) => {
      setFlashingTab(tabId)
      setFlashColor(entityType)
      setTimeout(() => {
        setFlashingTab(null)
        setFlashColor(null)
      }, 600)
    }
  }))

  // Rest of component...
})
```

**Remove unused `useTabFlash` hook export (lines 124-139)**

### Task 5.2: Add Flash CSS Classes to Tabs
**File:** `components/modern/BottomTabNav.tsx`

**Update tab button rendering:**
```tsx
<button
  className={`
    retro-tab
    ${tab.id === activeTab ? 'active' : ''}
    ${flashingTab === tab.id && flashColor ? `flash-${flashColor}` : ''}
  `}
>
```

**Verify CSS classes exist in `styles/retro.css`:**
- `@keyframes flash-entity` (should exist)
- May need to add entity-specific classes if not present

### Task 5.3: Trigger Flashes from Parent Component
**File:** `app/page.tsx`

**Create ref and pass to BottomTabNav:**
```tsx
const tabNavRef = useRef<{ triggerFlash: (tabId: TabId, entityType: EntityType | null) => void }>(null)

<BottomTabNav
  ref={tabNavRef}
  activeTab={activeTab}
  // ... other props
/>
```

**Add flash triggers in handlers:**

1. **handleCapture** (after successful capture):
```typescript
if (!entityType) {
  tabNavRef.current?.triggerFlash('unsorted', null)
} else {
  tabNavRef.current?.triggerFlash('ready', entityType)
}
```

2. **handleSort** (after sorting):
```typescript
tabNavRef.current?.triggerFlash('ready', entityType)
```

3. **handleModalSave** (after saving):
```typescript
tabNavRef.current?.triggerFlash('files', modalEntity.type)
```

### Task 5.4: Test Badge Flashes
**Manual testing checklist:**
1. Capture to Unsorted → Tab flashes (no color)
2. Sort to Ready as Task → Tab flashes blue
3. Sort to Ready as Note → Tab flashes orange
4. Sort to Ready as Project → Tab flashes green
5. Sort to Ready as List → Tab flashes purple
6. Convert entity → Files tab flashes with entity color

**Acceptance:**
- Badges update immediately
- Tabs flash with correct entity colors
- Flash duration is 600ms
- Multiple flashes don't overlap/conflict

---

## PHASE 6: Documentation & Cleanup (1 hour)
**Goal:** Document unused code for future reference
**Risk:** None | **Impact:** Code organization

### Task 6.1: Create UNUSED_CODE.md
**File:** Create `/home/mmariani/Projects/idealisted/UNUSED_CODE.md`

**Document:**
1. **Todos System**
   - Tables: `todos`, indexes
   - Types: `Todo` interface
   - Reason: Unified with tasks
   - Status: Keep for backward compatibility
   - Files: lib/db.ts:65-76, types/index.ts:60-68

2. **Plan_Tasks Junction Table** (if any remains)
   - Reason: Simplified to todoIds JSON array
   - Status: Removed in refactor

3. **Deprecated API Routes**
   - auto-populate, complete, finalize, reschedule
   - Reason: Workflow simplified
   - Status: Deleted

**Include:**
- Why it was removed/deprecated
- When it was removed
- Whether to keep or delete in future
- Migration notes if needed

### Task 6.2: Update CLAUDE.md
**File:** `CLAUDE.md`

**Update entity types section:**
- Clarify todos are legacy (use tasks instead)
- Document new entity modal fields
- Update workflow descriptions

**Acceptance:**
- Documentation clear and up-to-date
- Future developers understand codebase history

---

## TESTING & VERIFICATION

### After Each Phase:
1. Run `npm run dev` - verify no build errors
2. Test affected features manually
3. Check browser console for errors
4. Verify UI looks correct

### Final Integration Test:
1. Complete workflow: Capture → Unsorted → Sort → Ready → Convert → Files
2. Test all entity types (Task, Note, Project, List)
3. Verify all new fields save correctly
4. Test voice input
5. Test AI toggle (on/off)
6. Verify badge updates and flashes
7. Test dual save buttons
8. Test modal animations

---

## RISK MITIGATION

**High Risk Items:**
- AI toggle system (complex integration)
- Entity modal field additions (many files)

**Mitigation:**
- Test after each file change
- Commit frequently
- Use git branches if needed

**Rollback Plan:**
- Git reset to last working commit
- Each phase is independent

---

## ESTIMATED TIMELINE

- Phase 1: 2-3 hours
- Phase 2: 5-7 hours (added API updates + template mapping)
- Phase 3: 2-3 hours (simplified AI toggle)
- Phase 4: 2-3 hours
- Phase 5: 2-3 hours
- Phase 6: 1 hour

**Total: 14-22 hours** (2-3 work days)

---

## SUCCESS CRITERIA

✅ All beta MVP features working
✅ No console errors
✅ Smooth UX (animations, feedback)
✅ All entity types fully functional
✅ Voice input works in supported browsers
✅ AI can be disabled completely
✅ Documentation updated

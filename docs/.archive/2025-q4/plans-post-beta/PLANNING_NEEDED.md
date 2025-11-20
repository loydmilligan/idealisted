# Features Requiring Planning/Brainstorming

## 1. AI Suggestion Flow Redesign

**Status**: Needs Planning
**Priority**: Medium
**Reference**: AI_SUGGESTION_IMPLEMENTATION_FRM_OTR_WORKTREE.md, screenshots ai_suggestion_1_of_2.png, ai_suggestion_2_of_2.png

### Current State
- AI button in capture screen creates item immediately, then calls AI to parse/convert
- AISuggestionPanel component exists but is not being used in capture flow
- `/api/ai/suggest` endpoint exists and working

### Desired State (from other worktree)
- When user clicks AI button, show inline suggestion panel FIRST (before creating item)
- Display: confidence %, reasoning, extracted metadata (tags, priority, due date, etc.)
- User can review and choose to:
  - Accept suggested type
  - Override with any other entity type
  - Still use regular "Unsorted" button to bypass AI entirely
- Input fields should be read-only during AI suggestion review
- Only create item after user selects a type from the suggestion panel

### Technical Notes
- All components already exist (AISuggestionPanel, API endpoint)
- Main change needed: Rewire `handleAICapture` in app/page.tsx to:
  1. Call `/api/ai/suggest` first
  2. Show AISuggestionPanel with results
  3. Wait for user selection
  4. Create item with AI metadata when user chooses type
- Keep "Unsorted" button available for users who don't want AI assistance

### Questions to Answer During Planning
1. Should AI suggestion panel appear inline or as modal/overlay?
2. How to handle AI suggestion errors (show fallback? fail silently?)
3. Should we persist the input text while showing AI suggestion?
4. What happens if user dismisses AI suggestion? (revert to normal buttons?)
5. Should there be a setting to auto-accept AI suggestions?

---

## 2. Markdown Support for Note Entities

**Status**: Needs Planning (Work after merge to main)
**Priority**: High
**Reference**: Templates exist in main branch

### Overview
Convert note entities to be stored and edited as markdown documents instead of plain text.

### Current State
- Notes stored as plain text in database
- Basic textarea editing

### Desired State
- Notes stored as markdown
- Markdown editor for note editing
- Markdown rendering for note display
- Templates available in main branch

### Next Steps
1. Merge horizontal-workflow back to main
2. Review existing markdown templates in main branch
3. Plan migration strategy for existing notes
4. Design markdown editor UI (retro-styled)
5. Implement markdown rendering

---

## 3. List Items as Sub-Entities

**Status**: Needs Brainstorming & Development
**Priority**: Medium

### Overview
Lists need a sub-entity structure where individual items are separate database entities linked to their parent list.

### Requirements
- Create new entity type: **"item"** (list item)
- **Dependency**: Item cannot exist without being part of a list
- **Flexibility**: List can exist without any items (empty list)
- Items should have their own properties (text, completed status, order, etc.)

### Technical Considerations
- Database schema: New `list_items` table with foreign key to `lists`
- Cascade delete: When list deleted, all items deleted
- Ordering: Items need position/order field for reordering
- Completion tracking: Individual items can be checked off

### Questions to Answer
1. What properties should a list item have? (text, completed, order, due_date?)
2. Should items support sub-items (nested lists)?
3. How to handle reordering items in UI?
4. Should completed items auto-archive or stay visible?
5. Can items be moved between lists?
6. Should items have their own tags/metadata?

### Use Cases
- Shopping list with individual items to check off
- Todo checklist within a project
- Packing list for travel
- Recipe ingredients list

---

## Workflow: Clean Up & Merge

**Next Steps:**
1. Clean up horizontal-workflow worktree
2. Merge back to main branch
3. Review main branch markdown templates (for feature #2)
4. Continue development on main or new feature branches

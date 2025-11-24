# Prompt: P5-T2 — AI append preview UI

Context: `docs/.implementation/sprint3/phase5/phase5-task2-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 5), `docs/.implementation/sprint3/tasks.md` (P5-T2)

## Goal

Add an "Append with AI" button to the list viewer/editor that calls the AI append endpoint and displays a preview panel where users can review, select, and accept suggested items.

## Deliverables

- "Append with AI" button in list viewer/editor component
- AI suggestion preview panel component
- Loading and error state handling
- Integration with AI settings context for gating

## Implementation Steps (from tasks)

1. Locate the list viewer/editor component:
   - Search in `components/modern/` or entity modal files
   - Identify where list items are displayed/edited

2. Add AI enabled check:
   - Import settings context or fetch AI config
   - Create conditional render for AI button

3. Add "Append with AI" button:
   - Position near list items (e.g., below item list, or in header actions)
   - Style with retro theme classes
   - Icon suggestion: sparkles or wand
   - Only render when `ai_config.enabled && list_append_ai` feature enabled

4. Create preview panel component or section:
   - State: `suggestions: Array<{ text: string, confidence: number, selected: boolean }>`
   - State: `isLoading: boolean`, `error: string | null`
   - Display as modal overlay, slide-in panel, or inline section

5. Implement button click handler:
   - Set `isLoading = true`, clear any previous error
   - Call `POST /api/ai/append-list` with `{ list_id }`
   - On success: populate suggestions state (all selected by default)
   - On error: set error message, clear loading
   - Set `isLoading = false`

6. Build preview panel UI:
   ```jsx
   <div className="ai-suggestion-preview">
     <h4>AI Suggestions</h4>
     {isLoading && <Spinner />}
     {error && <ErrorMessage>{error}</ErrorMessage>}
     {suggestions.map((s, i) => (
       <label key={i} className="suggestion-item">
         <input
           type="checkbox"
           checked={s.selected}
           onChange={() => toggleSuggestion(i)}
         />
         <span>{s.text}</span>
         <ConfidenceBadge value={s.confidence} />
       </label>
     ))}
     <div className="actions">
       <Button onClick={handleAccept} disabled={noneSelected}>
         Accept Selected
       </Button>
       <Button variant="secondary" onClick={handleRegenerate}>
         Regenerate
       </Button>
       <Button variant="ghost" onClick={handleCancel}>
         Cancel
       </Button>
     </div>
   </div>
   ```

7. Implement action handlers:
   - `toggleSuggestion(index)`: flip selected boolean
   - `handleAccept`: pass selected suggestions to persistence (P5-T3)
   - `handleRegenerate`: clear suggestions, call API again
   - `handleCancel`: close panel, clear state

8. Add optional hint input:
   - Text field for user to guide suggestions
   - Pass as `hint` parameter to API

## Acceptance Criteria

- "Append with AI" button only visible when AI enabled.
- Clicking button shows loading indicator.
- Suggestions display with checkboxes after API returns.
- Can toggle individual suggestion selection.
- "Accept Selected" disabled when no items selected.
- "Regenerate" clears and fetches new suggestions.
- "Cancel" closes panel without changes.
- Errors display inline, not as browser alerts.
- UI follows retro theme styling conventions.
- Accessibility: keyboard navigation works for checkboxes and buttons.

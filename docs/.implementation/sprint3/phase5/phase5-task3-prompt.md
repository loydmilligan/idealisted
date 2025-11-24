# Prompt: P5-T3 — Persist appended items

Context: `docs/.implementation/sprint3/phase5/phase5-task3-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 5), `docs/.implementation/sprint3/tasks.md` (P5-T3)

## Goal

Implement the persistence logic that saves AI-suggested items to the database when the user clicks "Accept Selected" in the preview panel, then refreshes the list view.

## Deliverables

- Accept handler in preview panel that triggers persistence
- List items API endpoint or function for batch insert
- List view refresh after successful insert
- Success/error toast notifications

## Implementation Steps (from tasks)

1. Create or extend list items API:
   - If `app/api/list-items/route.ts` doesn't exist, create it
   - Support batch POST: `{ list_id, items: Array<{ text: string }> }`
   - Or add to existing items route with list-specific handling

2. Implement batch insert function:
   ```typescript
   async function addListItems(listId: string, items: string[]): Promise<{ success: boolean, added: number }> {
     // Get current max position
     const maxPos = db.prepare(`
       SELECT MAX(position) as max FROM list_items WHERE list_id = ?
     `).get(listId) as { max: number | null }

     let nextPosition = (maxPos?.max ?? -1) + 1

     // Insert items in transaction
     const insert = db.prepare(`
       INSERT INTO list_items (id, list_id, text, done, position, created_at)
       VALUES (?, ?, ?, 0, ?, ?)
     `)

     const insertMany = db.transaction((items: string[]) => {
       for (const text of items) {
         if (text.trim()) {
           insert.run(uuidv4(), listId, text.trim(), nextPosition++, Date.now())
         }
       }
     })

     insertMany(items)
     return { success: true, added: items.length }
   }
   ```

3. Wire "Accept Selected" handler in P5-T2 panel:
   ```typescript
   const handleAccept = async () => {
     const selectedItems = suggestions
       .filter(s => s.selected)
       .map(s => s.text)

     if (selectedItems.length === 0) return

     try {
       const response = await fetch('/api/list-items', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ list_id: listId, items: selectedItems })
       })

       if (!response.ok) throw new Error('Failed to add items')

       const data = await response.json()
       showToast(`Added ${data.added} items to list`)
       refreshList() // Re-fetch list data
       closePanel()
     } catch (error) {
       showToast('Failed to add items', 'error')
     }
   }
   ```

4. Determine list type handling:
   - Fetch list type when inserting
   - For tasklist/shopping: items have `done = 0`
   - For bulleted/numbered: same, but display differs

5. Refresh list view:
   - Call parent's refresh function or use SWR/React Query mutate
   - Ensure new items visible immediately
   - Maintain scroll position if possible

6. Add toast notifications:
   - Success: "Added N items to list"
   - Error: "Failed to add items" with retry option
   - Use existing toast system if available

7. Handle edge cases:
   - Empty text items filtered out
   - Duplicate detection (optional, can skip)
   - Very long item text (truncate or reject)

## API Endpoint Structure

```typescript
// POST /api/list-items
export async function POST(request: NextRequest) {
  try {
    const { list_id, items } = await request.json()

    // Validate list exists
    const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(list_id)
    if (!list) {
      return NextResponse.json({ success: false, error: 'List not found' }, { status: 404 })
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Items array required' }, { status: 400 })
    }

    // Insert items...

    return NextResponse.json({ success: true, added: insertedCount })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add items' }, { status: 500 })
  }
}
```

## Acceptance Criteria

- Clicking "Accept Selected" with items triggers API call.
- Items are inserted into database with correct positions.
- List view refreshes to show new items.
- Success toast shows count of added items.
- Empty selections don't trigger API call.
- API errors display inline error message.
- Partial failures handled gracefully (add what succeeds).
- Items maintain correct order (appended at end).
- Transaction ensures atomic insert (all or none per batch).

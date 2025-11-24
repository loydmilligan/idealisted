# Prompt: P5-T4 — AI add to projects

Context: `docs/.implementation/sprint3/phase5/phase5-task4-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 5), `docs/.implementation/sprint3/tasks.md` (P5-T4)

## Goal

Create an API endpoint and UI for adding AI-suggested tasks and notes to projects, following the preview-first pattern established in list append.

## Deliverables

- New API route: `app/api/ai/project-suggest/route.ts`
- New AI feature flag: `project_ai_add` in `ai_feature_settings` seeder
- "Add Tasks via AI" and "Add Notes via AI" buttons in project view
- Preview panel adapted for task/note suggestions
- Entity creation logic linking to project

## Implementation Steps (from tasks)

1. Add feature flag to seeder:
   ```typescript
   // In lib/db.ts seedAIFeatureSettings()
   {
     name: 'project_ai_add',
     enabled: 1,
     description: 'AI-powered task and note suggestions for projects'
   }
   ```

2. Create `app/api/ai/project-suggest/route.ts`:
   ```typescript
   export async function POST(request: NextRequest) {
     // Check feature flag
     const featureEnabled = await aiService.isFeatureEnabled('project_ai_add')
     if (!featureEnabled) {
       return NextResponse.json({ success: false, error: 'Feature disabled' }, { status: 403 })
     }

     const { project_id, type, hint, count = 5 } = await request.json()

     // Validate type
     if (!['task', 'note'].includes(type)) {
       return NextResponse.json({ success: false, error: 'Type must be task or note' }, { status: 400 })
     }

     // Fetch project with context
     const project = db.prepare(`
       SELECT p.*, i.text as name FROM projects p
       JOIN items i ON p.item_id = i.id
       WHERE p.id = ?
     `).get(project_id)

     if (!project) {
       return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
     }

     // Fetch existing tasks/notes for context
     const existingItems = db.prepare(`
       SELECT i.text FROM items i
       JOIN ${type}s t ON t.item_id = i.id
       WHERE t.project_id = ?
       LIMIT 20
     `).all(project_id)

     // Build and call AI...
   }
   ```

3. Build type-specific AI prompts:

   **For Tasks:**
   ```
   Project: "[name]"
   Description: "[description]"
   Status: [status]
   Existing Tasks:
   - [task 1]
   - [task 2]

   Suggest [count] actionable tasks that would help advance this project.
   Consider: next steps, blockers to address, improvements, maintenance.

   Return JSON array:
   [
     { "text": "task description", "priority": 2, "status": "pending" },
     ...
   ]
   ```

   **For Notes:**
   ```
   Project: "[name]"
   Description: "[description]"
   Existing Notes:
   - [note 1]
   - [note 2]

   Suggest [count] notes/documentation that would be useful for this project.
   Consider: research topics, reference material, meeting notes, decisions.

   Return JSON array:
   [
     { "text": "note title", "subtype": "research" },
     ...
   ]
   ```

4. Locate project view component:
   - Search in `components/modern/` or modals
   - Find where project details are displayed

5. Add AI buttons to project view:
   ```jsx
   {isAIEnabled && (
     <div className="ai-actions">
       <Button onClick={() => openAIPanel('task')}>
         Add Tasks via AI
       </Button>
       <Button onClick={() => openAIPanel('note')}>
         Add Notes via AI
       </Button>
     </div>
   )}
   ```

6. Adapt preview panel for project suggestions:
   - Reuse or extend list append preview component
   - Show additional metadata (priority for tasks, subtype for notes)
   - Allow editing metadata before accept

7. Implement accept handler for entity creation:
   ```typescript
   const handleAcceptTasks = async (suggestions) => {
     for (const s of suggestions.filter(s => s.selected)) {
       await fetch('/api/items', {
         method: 'POST',
         body: JSON.stringify({
           type: 'task',
           text: s.text,
           task: {
             status: s.status || 'pending',
             priority: s.priority || 2,
             project_id: projectId
           }
         })
       })
     }
     refreshProject()
   }
   ```

8. Handle note creation similarly:
   ```typescript
   const handleAcceptNotes = async (suggestions) => {
     for (const s of suggestions.filter(s => s.selected)) {
       await fetch('/api/items', {
         method: 'POST',
         body: JSON.stringify({
           type: 'note',
           text: s.text,
           note: {
             subtype: s.subtype || 'general',
             project_id: projectId
           }
         })
       })
     }
     refreshProject()
   }
   ```

## Response Structure

```typescript
interface ProjectSuggestion {
  text: string
  confidence: number
  // For tasks
  priority?: number  // 1-3
  status?: 'pending' | 'in-progress'
  // For notes
  subtype?: 'general' | 'research' | 'meeting' | 'reference'
}

interface ProjectSuggestResponse {
  success: boolean
  suggestions: ProjectSuggestion[]
}
```

## Acceptance Criteria

- Returns 403 when AI master toggle or `project_ai_add` feature disabled.
- Returns 400 for invalid type parameter (must be 'task' or 'note').
- Returns 404 when project doesn't exist.
- Task suggestions include relevant, actionable items for the project.
- Note suggestions include useful documentation/research topics.
- "Add Tasks via AI" and "Add Notes via AI" buttons visible when AI enabled.
- Preview panel shows suggestions with type-specific metadata.
- Accepted items create proper task/note entities in database.
- Created entities have correct `project_id` set.
- Entities appear in project view after creation.
- Error handling follows inline messaging pattern (no alerts).

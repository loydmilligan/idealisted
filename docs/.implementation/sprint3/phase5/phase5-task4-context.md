# Context: P5-T4 — AI add to projects

Purpose: Create an API endpoint and UI to let users add AI-suggested tasks and notes to projects, using the same preview-first pattern as list append.

## Key Decisions

- From plan: "Add via AI" control in project view for notes and tasks.
- Same preview-first pattern as list append, gated by AI toggle.
- Separate endpoint since projects contain full entities (tasks, notes), not simple text items.
- Suggestions return structured data with metadata (priority, status for tasks; subtype for notes).
- New feature flag: `project_ai_add` in `ai_feature_settings` table.
- Accept creates actual task/note entities linked to project via `project_id` field.

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 5: AI Append Flows).
- Tasks: `docs/.implementation/sprint3/tasks.md` (P5-T4 steps).
- Project types: `types/index.ts` (Project, Task, Note interfaces).
- Task/Note creation: `app/api/items/route.ts` POST handler.
- Existing AI patterns: `app/api/ai/suggest-tags/route.ts`.
- Project view: Search for project detail/viewer component.

## Implementation Notes

- Endpoint: `POST /api/ai/project-suggest`
- Request: `{ project_id, type: 'task' | 'note', hint?, count? }`
- Fetch project with existing tasks/notes for context.
- AI prompt based on type:
  - Tasks: "Suggest actionable tasks that would help advance this project"
  - Notes: "Suggest notes/documentation that would be useful for this project"
- Response includes metadata appropriate for type:
  - Tasks: `{ text: string, priority?: number, status?: string }`
  - Notes: `{ text: string, subtype?: string }`
- UI: "Add Tasks via AI" and "Add Notes via AI" buttons in project view.
- Preview panel similar to list append (checkboxes, accept, regenerate, cancel).
- On accept: create actual item + task/note entities with `project_id` set.

## Testing/QA

- Endpoint returns 403 when AI disabled or feature flag off.
- Endpoint returns 404 for non-existent project.
- Task suggestions include actionable, project-relevant items.
- Note suggestions include useful documentation/reference ideas.
- Created entities properly linked to project via project_id.
- Entities appear in project's task/note lists after creation.
- UI buttons only visible when AI enabled.
- Preview panel works correctly for both task and note types.

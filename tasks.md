# Tasks — Project & List Markdown Sprint

Plan reference: NEXT_SPRINT_PLAN.md  
Scope: deliver markdown-driven Project and List experiences (Bulleted, Numbered, TaskList, Shopping) with project widgets and associations.

## Phase 1 — Templates & Data Surface
- [ ] Add markdown templates for Lists (4 variants) and Projects; seed/register them alongside existing templates (`lib/db.ts` seeds, template registry, any template picker mappings).
- [ ] Update types/contracts for new list type enum and project type field (e.g., `types/index.ts`, API request/response DTOs, zod/validation schemas if present).
- [ ] Ensure create/edit flows can select new templates without colliding with legacy `todo` entity type; adjust template lookup logic to map entity_type → template_id for list/project.

## Phase 2 — List Authoring UX
- [ ] Extend `components/modern/MarkdownEntityEditor` (and related state helpers) to support per-item inputs with Enter-to-add-next, `+ Add item`, and remove-on-empty/backspace behaviors.
- [ ] Convert item arrays to markdown on save (bullet, numbered, tasklist `- [ ]`/`- [x]`, shopping lines) and parse from markdown when editing; keep markdown as single source of truth.
- [ ] Ensure preview/render shows correct list formatting and handles empty states; guard against collisions with legacy todo entity naming (use “TaskList” label).
- [ ] Add basic affordances for reorder/delete if existing patterns support it; otherwise, keep linear order stable.

## Phase 3 — Project Markdown Experience
- [ ] Add project template with core fields and fixed type dropdown {Personal, Coding, Smart Home, Work, Apartment}; wire into entity creation/edit flows.
- [ ] Build project detail markdown sections (description/goals/checkpoints) and surface associated tasks/notes lists with click-to-preview modal and jump-to-edit.
- [ ] Implement widgets: completion ratio (tasks done/total for project), staleness (age since creation), recent activity (latest task/note timestamp), priority indicator (reuse existing priority if available), and “Danger Zone” alert (≥70% complete AND ≥7 days inactivity).

## Phase 4 — Integration & State Coherence
- [ ] Thread new templates/types through capture flows (JumpTheLine, LetAIDoIt, Ready → Convert) and ensure AI/feature gating remains intact; avoid touching legacy todo entity.
- [ ] Persist list_type/project_type through API routes, DB interactions, and UI state; verify snapshots/exports (if any) stay consistent.
- [ ] Confirm markdown save/load paths for lists/projects reuse existing pipelines (no secondary sources of truth).

## Phase 5 — Validation & QA
- [ ] Manual pass on desktop/mobile: list entry ergonomics, markdown preview fidelity, project widgets/alerts, and modal previews.
- [ ] Regression spot-checks: Task/Note markdown flows, AI suggestion panel, tag suggestions, entity conversion paths, and data integrity in `items` + type tables.

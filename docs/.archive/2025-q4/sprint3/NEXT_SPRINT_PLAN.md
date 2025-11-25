# Next Sprint Plan — Project & List Markdown

Objective: add markdown-based Project and List experiences with focused UX, aligned to the recorded planning session.

Assumptions:
- List items stay as markdown text (not task entities); “Promote to task” is a future feature (captured in ROADMAP).
- List types: Bulleted, Numbered, TaskList, Shopping. “TaskList” avoids collision with legacy todo entity.
- Project types: fixed dropdown {Personal, Coding, Smart Home, Work, Apartment}.
- Use actual markdown structures for storage (bullets/numbered/checkbox/shopping text), not JSON/frontmatter.

## Phase 1 — Templates & Data Surface
- Create markdown templates for Lists (all four types) and Projects, including sensible starter sections/metadata.
- Ensure template registration/selection works in creation flows without colliding with legacy todo type.
- Add project type field support (fixed options) across create/edit APIs and UI state.

## Phase 2 — List Authoring UX
- Build list editing UI with per-item inputs, “Enter” to add-next, and a lightweight “+ add item” control.
- Render markdown preview consistent with stored format (bullets/numbers/checkbox/tasklist/shopping).
- Guardrails: keyboard-friendly flow, remove-empty on blur/backspace; handle reorder/delete affordances if present.

## Phase 3 — Project Markdown Experience
- Authoring: project template with core fields + type dropdown; sections for description, goals, checkpoints.
- Associations: surface linked tasks and notes in the project view with click-to-preview modal and jump-to-edit.
- Widgets: completion (X of X tasks), staleness (age since creation), recent activity, priority indicator, and “Danger Zone” alert (≥70% complete with ≥7 days inactivity).

## Phase 4 — Integration & State Coherence
- Wire list/project templates into capture flows (JumpTheLine, LetAIDoIt, Ready → Convert) without affecting other entity types.
- Respect AI feature gating where applicable; ensure legacy todo entity remains untouched.
- Persist project type and list type through APIs, storage, and rendering; keep markdown single source of truth.

## Phase 5 — Validation & QA
- Manual checks across desktop/mobile for list entry UX, markdown rendering, and project widgets.
- Data sanity: no schema regressions; tasks table untouched except for optional linkage display; markdown saved as intended.
- Regression spot-check: existing Task/Note markdown flows, AI suggestion panel, and tag suggestions remain stable.

# Prompt: P2-T1 — Today surface (Today card + Journal + Media + AI recap) with Unsorted collapse

Context: docs/.implementation/sprint2/phase2/phase2-task1-context.md
Plan refs: docs/.implementation/sprint2/plan.md (Phase 2), docs/.implementation/sprint2/tasks.md (P2-T1)

Goal
- Build Capture top surface: Today card (quick-add/streak), Journal card, Media card, AI Yesterday Recap; Unsorted below, collapsed until first capture.

Deliverables
- Today card with quick-add note/task/list + streak tag.
- Journal card (rich text + mood/emoji, optional image) saved within Capture context.
- Media card allowing one image/audio/video with caption.
- AI Yesterday Recap block (gated, non-blocking, retry/fail states).
- Unsorted list default collapsed; expands after first capture.
- QA notes for layout/flows.

Implementation steps (from tasks)
1) Implement Today card and quick-add/streak.
2) Add Journal card with save handling (not separate type).
3) Add Media card with upload + persistence.
4) Implement AI Recap block with gating and failure handling.
5) Position Unsorted below; default collapsed; expand after first item.
6) Responsive layout (stack mobile, columns desktop) and empty states.
7) Smoke create flows (quick-add, Journal, Media, Unsorted toggle); AI off/on.
8) Log QA outcomes/edge cases.

Acceptance criteria
- All surface elements render/work on mobile/desktop.
- New captures land in Unsorted and trigger expand.
- AI recap doesn’t block UI; handles disabled/error.

# Context: P2-T1 — Today surface (Today card + Journal + Media + AI recap) with Unsorted collapse

Purpose: Build new Capture top surface: Today card (quick-add/streak), Journal card, Media card, AI Yesterday Recap, with Unsorted beneath and initially collapsed until first capture.

Key decisions
- Today surface is primary; Unsorted is inbox below and collapses on load until first item.
- Journal lives here (not standalone type); Media card accepts one image/audio/video with caption.
- AI Recap is gated; non-blocking with retry/fail states.
- Layout: stacked on mobile; columns on desktop.

References
- Plan: docs/.implementation/sprint2/plan.md (Phase 2).
- Tasks: docs/.implementation/sprint2/tasks.md (P2-T1 steps).
- Upstream design: recent_claude_planning_session.md for intent; Sprint 3 parking for deferred promote concepts.

Implementation notes
- Quick-add for note/task/list should drop into Unsorted and expand when first item appears.
- Persist Journal content appropriately (likely as note subtype or dedicated field per existing patterns) but scope keeps it within Capture context.
- Media upload handling consistent with existing upload infra.

Testing/QA
- Create via Today quick-add, Journal save, Media upload; AI disabled/enabled paths.
- Unsorted toggle defaults collapsed; expands after first new item.

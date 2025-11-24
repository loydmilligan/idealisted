# Context: P6-T6 — Ntfy docs and planner milestones

Purpose: Update ntfy documentation and add planner milestone notifications (plan finalized, evening review complete, all tasks done).

Key decisions
- From plan: Document current ntfy configuration flow. Add milestone notifications for planner events.
- Milestone notifications are optional (setting toggle).
- Improve notification content with context (task counts, completion percentage).
- Leverages existing ntfy service patterns.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 6).
- Tasks: docs/.implementation/sprint3/tasks.md (P6-T6 steps).
- Notify service: lib/notify.ts (existing patterns, sendNotification, notifyPlanReady).
- Scheduler: lib/scheduler.ts.
- Settings page: app/settings/page.tsx (NTFY tab).
- Existing docs location: docs/ directory.

Implementation notes
- Create or update `docs/NTFY_SETUP.md` with current flow.
- Add milestone notification helpers to ntfyService.
- Wire milestone triggers into planner flows (P3 components when completed).
- Make milestones optional via new setting `milestone_notifications_enabled`.
- Improve notification bodies with rich context.

Testing/QA
- Documentation accurate for current setup flow.
- Milestone notifications fire on plan finalize.
- Milestone notifications fire on evening review complete.
- All tasks completed notification works.
- Milestone toggle in settings disables all milestone notifications.
- Notification content includes helpful details.

# Prompt: P6-T6 — Ntfy docs and planner milestones

Context: docs/.implementation/sprint3/phase6/phase6-task6-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 6), docs/.implementation/sprint3/tasks.md (P6-T6)

Goal
- Update ntfy documentation and implement optional planner milestone notifications.

Deliverables
- `docs/NTFY_SETUP.md` documentation file.
- New milestone notification methods in ntfyService.
- Settings toggle for milestone notifications.
- Enhanced notification content with context.

Implementation steps (from tasks)
1) Create or update `docs/NTFY_SETUP.md` with sections:
   - Overview (what ntfy is, why IdeaListed uses it)
   - Prerequisites (ntfy app installation, topic subscription)
   - Configuration (server URL, topic, optional auth)
   - Testing (how to send test notification)
   - Troubleshooting (common issues)
2) In `lib/notify.ts`, add new milestone notification methods:
   ```typescript
   async notifyPlanFinalized(date: string, taskCount: number) {
     return this.sendNotification(
       'Plan Finalized!',
       `Your plan for ${date} is set with ${taskCount} task${taskCount !== 1 ? 's' : ''}.`,
       [{ action: 'view', label: 'View Plan', url: `${baseURL}/planner` }],
       'default'
     )
   }

   async notifyEveningReviewComplete(date: string, completedCount: number, totalCount: number) {
     const pct = Math.round((completedCount / totalCount) * 100)
     return this.sendNotification(
       'Evening Review Complete!',
       `${date}: ${completedCount}/${totalCount} tasks done (${pct}%). Great job!`,
       [],
       'default'
     )
   }

   async notifyAllTasksCompleted(date: string) {
     return this.sendNotification(
       'All Tasks Completed!',
       `Congratulations! You've completed all tasks for ${date}.`,
       [],
       'high'
     )
   }
   ```
3) Add settings toggle: `milestone_notifications: { enabled: boolean }` in NTFY tab.
4) Add gating check in milestone methods: `if (!(await this.isMilestoneEnabled())) return { skipped: true }`.
5) Add `isMilestoneEnabled()` private method that loads and checks milestone setting.
6) Wire notification calls into planner components (can be placeholder/comment if P3 not complete yet):
   - `MorningFinalizeModal.tsx` on finalize success
   - `EveningReviewFlow.tsx` on complete
   - Task status change handler when last task completed
7) Test: enable milestone notifications, complete milestones, verify notifications sent with correct content.

Acceptance criteria
- `docs/NTFY_SETUP.md` provides clear setup instructions.
- Three milestone notification methods added.
- Milestone toggle in NTFY settings works.
- Notifications include helpful context (counts, percentages).
- Can be disabled independently from other notifications.
- Graceful handling when planner components not yet implemented.

# Context: P6-T5 — Daily reminder notification

Purpose: Add configurable daily review reminder that fires via ntfy or client-side fallback, with proper deduplication.

Key decisions
- From plan: Daily reminder toggle + time picker in settings.
- Server-side ntfy scheduling when enabled; client-side fallback when ntfy disabled.
- Dedupe logic: only one reminder per day.
- Leverages existing scheduler infrastructure (lib/scheduler.ts CRON patterns).

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 6).
- Tasks: docs/.implementation/sprint3/tasks.md (P6-T5 steps).
- Scheduler: lib/scheduler.ts (existing CRON patterns, checkAndSendDailyReview, checkAndNotifyReminders).
- Notify service: lib/notify.ts (ntfyService patterns, sendNotification).
- Settings page: app/settings/page.tsx.
- Settings API: app/api/settings/route.ts.
- Database: lib/db.ts settings table.

Implementation notes
- Add `reminder_config: { enabled: boolean, time: string (HH:MM) }` to settings.
- Scheduler already has daily review CRON; this adds separate reminder.
- Reminder is for "time to review" prompt, not the review content itself.
- Track `last_reminder_date` to dedupe (settings or separate table).
- Client-side fallback: store flag in settings, check on app load in page.tsx.

Testing/QA
- Settings UI shows toggle and time picker.
- CRON job fires at configured time when ntfy enabled.
- Client-side check works when ntfy disabled.
- Reminder only sent once per day.
- Different from daily review notification (this is a prompt, not content).

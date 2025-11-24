# Prompt: P6-T5 — Daily reminder notification

Context: docs/.implementation/sprint3/phase6/phase6-task5-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 6), docs/.implementation/sprint3/tasks.md (P6-T5)

Goal
- Add configurable daily reminder with ntfy notification and client-side fallback, plus deduplication.

Deliverables
- Settings UI for reminder toggle + time picker.
- Scheduler CRON job for checking reminder time.
- Ntfy notification when enabled.
- Client-side fallback flag mechanism.
- Deduplication to prevent multiple reminders per day.

Implementation steps (from tasks)
1) Add settings UI in NTFY tab: "Daily Review Reminder" section with:
   - Enable toggle checkbox
   - Time picker input (type="time", format HH:MM)
   - Store as `reminder_config: { enabled: boolean, time: string }`
2) Add `saveReminderSettings()` function following existing save patterns.
3) In `lib/scheduler.ts`, add new CRON job (or extend existing) for reminder check:
   - Run every minute (`'* * * * *'`)
   - Load `reminder_config` from settings
   - If not enabled, return early
   - Get current time as HH:MM, compare to configured time
   - If match: proceed to send notification
4) Add deduplication: track `last_reminder_date` in settings table.
   - Before sending, check if `last_reminder_date` matches today
   - If matches, skip (already sent)
   - After sending, update `last_reminder_date` to today
5) If ntfy enabled: call `ntfyService.sendNotification('Time for Daily Review', 'Take a moment to review your day...', [{action: 'view', label: 'Open Review', url: baseURL + '/review'}])`.
6) If ntfy disabled but reminder enabled: store flag `pending_reminder: true` in settings for client-side check.
7) In `app/page.tsx` client-side fallback check (modify existing checkDailyReview useEffect):
   - Load `reminder_config` and `pending_reminder` flag
   - If `pending_reminder` true: show in-app notification/toast
   - Clear `pending_reminder` flag after showing
8) Test: set reminder time, verify notification fires (check ntfy app or in-app toast).

Acceptance criteria
- Settings UI visible in NTFY tab.
- Reminder fires at configured time via ntfy when enabled.
- Only one reminder per day (deduplication works).
- Client-side fallback shows toast when ntfy disabled.
- Different reminder for different days.
- Can be disabled independently from daily review feature.

# IdeaListed

A retro Palm Pilot-styled idea capture and task management application with AI-powered suggestions.

## Features

- **Quick Idea Capture**: Rapid text input with AI-powered parsing and suggestions
- **Entity System**: Convert ideas into tasks, notes, projects, lists, and todos
- **AI Integration**: OpenRouter-powered idea analysis, rewriting, and daily summaries
- **Retro Design**: Nostalgic Palm Pilot aesthetic with modern functionality
- **Daily Review**: Automated activity tracking and insights

## Daily Review Feature

The Daily Review system automatically tracks your productivity and sends daily summaries via push notifications.

### Overview

Daily Review captures daily snapshots of your activity, aggregates them into weekly and monthly summaries, and delivers insights through ntfy.sh push notifications at a configured time each day.

### Components

**Snapshot System** (`lib/snapshot.ts`)
- Daily snapshots: Ideas created/sorted/converted, tasks completed, entity breakdown by type
- Weekly summaries: Aggregated stats for 7-day periods (Monday-Sunday)
- Monthly summaries: Aggregated stats from all weeks in a month
- Automatic cleanup: Retains 31 daily, 8 weekly, 12 monthly snapshots
- Project tracking: Per-project activity (tasks completed/added, notes added, status changes)

**Review Service** (`lib/review.ts`)
- Generates complete daily reviews from snapshots
- Identifies top active projects by task/note activity
- Optional AI-generated project summaries (OpenRouter API)
- Formats notification messages with activity highlights
- Tracks last-sent timestamp to prevent duplicates

**Scheduler** (`lib/scheduler.ts`)
- Server-side cron job checking every minute for configured review time
- Loads daily review settings and ntfy configuration from database
- Prevents concurrent executions and duplicate sends
- Generates review with optional AI summary
- Sends notification with "View Review" action button

**Client Fallback** (`app/page.tsx`)
- Runs on app mount to catch missed server-side reviews
- Checks if current time is past configured review time
- Verifies review hasn't already been sent today
- Silent background execution (fire-and-forget)

**Review Screen** (`app/review/page.tsx`)
- Visual dashboard with retro-styled stats cards
- Pie chart showing entity breakdown (recharts)
- AI project summary display
- Top projects and activity highlights
- Date selector to review any historical day
- Tab navigation (Today/Week/Month) with infrastructure for future enhancements
- Full accessibility support (ARIA labels, screen reader text)

### Setup

1. **Configure Notifications** (Settings → Notifications)
   - Enable ntfy.sh integration
   - Enter ntfy server URL (default: https://ntfy.sh)
   - Set topic name for notifications
   - Optional: Configure access token for private topics

2. **Enable Daily Review** (Settings → Notifications → Daily Review)
   - Toggle "Enable Daily Review"
   - Set review time (24-hour format, e.g., "19:00")
   - Optional: Enable AI-generated project summaries
   - Test with "Test Daily Review" button

### How It Works

**Automatic Scheduling:**
1. Server-side cron checks every minute for matching review time
2. Verifies daily review and ntfy are enabled in settings
3. Checks if review already sent today (prevents duplicates)
4. Generates daily snapshot with activity stats
5. Creates AI project summary if enabled
6. Sends ntfy notification with review highlights
7. Client-side fallback catches missed reviews on next app load

**Data Collection:**
- **Ideas Created**: New items added with type='idea'
- **Ideas Sorted**: Ideas marked as parsed (processed)
- **Ideas Converted**: Ideas transformed into tasks, notes, projects, lists, or todos
- **Entity Breakdown**: Count of each entity type created (includes both conversions and direct creations)
- **Tasks Completed**: Tasks marked complete during the day
- **Project Activity**: Per-project metrics (tasks/notes added, tasks completed)

**Data Persistence:**
- Daily snapshots saved to `data/snapshots/daily/YYYY-MM-DD.json`
- Weekly summaries saved to `data/snapshots/weekly/YYYY-Wnn.json`
- Monthly summaries saved to `data/snapshots/monthly/YYYY-MM.json`
- Test mode prevents snapshot persistence (use "Test Daily Review" button)

**Notification Format:**
```
Title: Daily Review - [Date]
Message:
• [X] ideas created, [Y] sorted, [Z] converted
• [N] tasks completed
• Top projects: [Project names]

[Action Button: View Review → /review/YYYY-MM-DD]
```

### API Endpoints

- `GET /api/review?date=YYYY-MM-DD&includeAI=true` - Fetch review for specific date
- `POST /api/review/trigger` - Manually trigger review notification
  - Body: `{ includeAI: boolean, test: boolean }`
  - `test: true` prevents snapshot persistence

### Architecture

**Snapshot Generation Flow:**
```
generateDailySnapshot(date, persist)
  ↓
Query database for day's activity
  ↓
Calculate stats (ideas, tasks, entities, projects)
  ↓
Create snapshot object
  ↓
If persist=true:
  - Save to data/snapshots/daily/
  - Update weekly summary
  - Update monthly summary
  - Cleanup old snapshots
```

**Scheduled Review Flow:**
```
Cron runs every minute
  ↓
Check settings (daily_review.enabled, daily_review.time)
  ↓
Check ntfy config (ntfy_config.enabled)
  ↓
Compare current time with configured time
  ↓
Check if already sent today (daily_review.lastSent)
  ↓
Generate review (with AI if enabled)
  ↓
Send ntfy notification
  ↓
Update lastSent timestamp
```

### Color Scheme

Entity colors use muted, desaturated tones matching the retro Palm Pilot aesthetic:
- Task: `#6B8B9E` (Muted teal-grey)
- Note: `#9E8B6B` (Muted tan-grey)
- Project: `#7B9E6B` (Muted sage-grey)
- List: `#8B6B9E` (Muted mauve-grey)
- Todo: `#8B9E8B` (Palm screen base)

### Troubleshooting

**Review not sending:**
- Verify server is running (scheduler initializes on startup)
- Check Settings → Notifications: Daily Review enabled, time set correctly
- Check Settings → Notifications: ntfy enabled, server/topic configured
- Review must not have been sent today already
- Server timezone must match expected review time

**Missing snapshots:**
- Snapshots only created when review is generated (not retroactive)
- Test button uses `test: true` to prevent snapshot creation
- Check `data/snapshots/` directory exists and is writable

**Build errors:**
- Run `npm install` to ensure recharts dependency is installed
- Webpack externals configured for better-sqlite3 in `next.config.js`

### Dependencies

- `node-cron`: Server-side scheduling
- `recharts`: Chart visualization
- `date-fns`: Date manipulation and formatting
- `better-sqlite3`: Database (with webpack externals)

## Development

```bash
# Install dependencies
npm install

# Run development server (horizontal-workflow uses ports 3300-3310)
PORT=3300 npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## License

MIT

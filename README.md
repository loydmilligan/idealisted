# IdeaListed

A retro Palm Pilot-styled idea capture and task management application with AI-powered suggestions.

## Features

- **Quick Capture first**: Primary capture box with entity quick-sort buttons; inline inbox (collapsed) auto-expands on new ideas.
- **Markdown entities**: Tasks, notes (generic/meeting/research/media/YouTube), lists (bulleted/numbered/tasklist/shopping), projects.
- **AI assist**: Inline suggestion panel under capture; accept/override creates entities directly into Files with color flash.
- **Planner tab**: Daily view with filters, week grid, color-coded cards, task checkboxes, and slide-in "Add" drawer for tasks/notes/lists.
- **Journal/Media streaks + recap**: Today surface for journal/media entries with streak indicators; recap/quote fallback.
- **Obsidian sync**: One-way export of notes and projects to Obsidian vault as markdown files with frontmatter. Supports local and network-mounted vaults.
- **Chrome extension**: Capture YouTube content and arbitrary URLs to IdeaListed (see Chrome extension README).
- **Retro design**: Palm Pilot aesthetic with muted entity colors and mobile-first layout.

## Current Flows (high level)
- **Capture → Ready → Files**: Capture box + quick-sort buttons (note/list subtypes inline). Inline inbox (collapsed) expands on new ideas; Ready tab holds typed ideas for conversion; Files holds final entities in markdown viewer.
- **AI path**: AI button under capture shows inline panel; Accept/override creates entity directly into Files (color flash).
- **Planner**: Daily view of assigned items (color-coded, task checkbox), week grid for a 7-day snapshot, slide-in Add drawer to place tasks/notes/lists into today. Draft/final flows to be expanded.
- **Journal/Media**: Today surface journal/media entries with streaks; daily recap/quote fallback card.
- **Chrome Extension**: Capture YouTube pages and arbitrary URLs from the browser into IdeaListed (see `chrome-extension/README.md` for install/use).

## Development

Local dev (direct):
```bash
npm run dev -- --hostname 0.0.0.0 --port 3300
```

PM2 (recommended for a stable dev instance on port 3300):
```bash
pm2 start ecosystem.config.js --only idealisted --update-env
pm2 reload idealisted --update-env
```

### Notifications / ntfy
- Configure ntfy in Settings → Notifications.
- Daily review runs server-side with a client fallback. Consider adjusting topics/times per your setup. (AI recap/quote fallback exists on the Capture screen; planner-specific notifications pending.)

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

## Obsidian Sync Feature

The Obsidian Sync system provides one-way export of notes and projects to an Obsidian vault as markdown files with frontmatter metadata.

### Overview

Obsidian Sync automatically exports your IdeaListed notes and projects to an Obsidian vault directory, allowing you to use Obsidian's powerful knowledge management features on your IdeaListed content. The sync is one-way (IdeaListed → Obsidian), meaning changes made in Obsidian won't sync back to IdeaListed.

### Components

**Sync Service** (`lib/obsidian-sync.ts`)
- Exports notes and projects as markdown files with Obsidian-compatible frontmatter
- MD5 hash-based change detection (only syncs new/updated items)
- Sanitized filenames: `{title}-{short-id}.md`
- File organization by note subtype and project folders
- Idempotent sync (no duplicates on re-run)

**File Organization:**
```
vault-path/
├── youtube/              # YouTube video notes
├── research/             # Research notes
├── meeting/              # Meeting notes
├── generic/              # General notes
├── media/                # Media notes
└── projects/
    ├── Project-Name/
    │   ├── _hub.md      # Project overview
    │   └── note.md      # Project notes
    └── Another-Project/
        └── _hub.md
```

**Frontmatter Format:**
```yaml
---
id: bb826e70-0d71-4fc7-8ece-e4949db2313b
created: 2025-11-26T08:06:35.485Z
updated: 2025-11-26T08:06:35.485Z
tags: [research, ai]
subtype: research
project: "[[Project Name]]"    # For project notes
status: active                 # For projects
source: IdeaListed
---
# Note Title

Note content here...
```

**Scheduler** (`lib/scheduler.ts`)
- Hourly CRON job runs at minute 0 (`0 * * * *`)
- Configurable frequency: manual, hourly, or daily
- Mutex locking prevents concurrent executions
- Checks if sync is enabled before running

**API Endpoints:**
- `POST /api/obsidian/sync` - Manually trigger sync
- `GET /api/obsidian/status` - Get sync statistics and configuration
- `POST /api/obsidian/test` - Validate vault path (exists, writable)

**Settings UI** (Settings → Obsidian)
- Enable/disable toggle
- Vault path configuration (absolute paths only)
- Sync frequency dropdown (manual, hourly, daily)
- Test path button (validates accessibility)
- Sync now button (manual trigger)
- Sync status display (total synced, last sync time)

### Setup

#### Local Vault (Same Machine)

1. **Create Obsidian vault directory**
   ```bash
   mkdir -p ~/Documents/Obsidian/IdeaListed
   ```

2. **Configure in IdeaListed Settings**
   - Open Settings → OBSIDIAN tab
   - Enable "Enable Obsidian sync"
   - Enter vault path: `/home/username/Documents/Obsidian/IdeaListed`
   - Click "Test Path" to verify it's writable
   - Set sync frequency to "Hourly" (recommended)
   - Click "Save"

3. **Open in Obsidian**
   - Launch Obsidian
   - "Open folder as vault"
   - Select `/home/username/Documents/Obsidian/IdeaListed`
   - Your notes and projects will appear organized by type

#### Remote Vault (Network Mount)

If your Obsidian vault lives on another device on your local network (e.g., NAS, server, another computer), you can mount it and sync to it.

**Option 1: SMB/CIFS Mount (Windows shares, NAS)**

1. **Create mount point**
   ```bash
   sudo mkdir -p /mnt/obsidian
   ```

2. **Create credentials file (optional, for authentication)**
   ```bash
   sudo nano /root/.smbcredentials
   ```
   Add:
   ```
   username=your_username
   password=your_password
   domain=WORKGROUP
   ```
   Secure the file:
   ```bash
   sudo chmod 600 /root/.smbcredentials
   ```

3. **Mount the share**
   ```bash
   # One-time mount
   sudo mount -t cifs //server-ip/share-name /mnt/obsidian -o credentials=/root/.smbcredentials,uid=1000,gid=1000

   # Or with username/password inline (less secure)
   sudo mount -t cifs //server-ip/share-name /mnt/obsidian -o username=user,password=pass,uid=1000,gid=1000
   ```

4. **Make mount permanent (optional)**

   Edit `/etc/fstab`:
   ```bash
   sudo nano /etc/fstab
   ```
   Add line:
   ```
   //server-ip/share-name /mnt/obsidian cifs credentials=/root/.smbcredentials,uid=1000,gid=1000,x-systemd.automount 0 0
   ```
   Test:
   ```bash
   sudo mount -a
   ```

5. **Configure IdeaListed**
   - Settings → OBSIDIAN
   - Vault path: `/mnt/obsidian/IdeaListed`
   - Test path → Save

**Option 2: NFS Mount (Linux/Unix servers)**

1. **Create mount point**
   ```bash
   sudo mkdir -p /mnt/obsidian
   ```

2. **Mount NFS share**
   ```bash
   # One-time mount
   sudo mount -t nfs server-ip:/export/path /mnt/obsidian

   # Or add to /etc/fstab for permanent mount
   sudo nano /etc/fstab
   ```
   Add:
   ```
   server-ip:/export/path /mnt/obsidian nfs defaults,x-systemd.automount 0 0
   ```

3. **Configure IdeaListed**
   - Settings → OBSIDIAN
   - Vault path: `/mnt/obsidian/IdeaListed`
   - Test path → Save

**Option 3: SSHFS Mount (Any SSH server)**

1. **Install SSHFS**
   ```bash
   sudo apt install sshfs  # Debian/Ubuntu
   ```

2. **Create mount point and mount**
   ```bash
   sudo mkdir -p /mnt/obsidian
   sshfs user@server-ip:/path/to/obsidian /mnt/obsidian
   ```

3. **Configure IdeaListed**
   - Settings → OBSIDIAN
   - Vault path: `/mnt/obsidian/IdeaListed`
   - Test path → Save

### Usage

**Manual Sync:**
- Settings → OBSIDIAN → "Sync Now" button
- Or via API: `curl -X POST http://localhost:3000/api/obsidian/sync`

**Automatic Sync:**
- Runs based on configured frequency (hourly/daily)
- Hourly: runs at minute 0 of every hour (1:00, 2:00, 3:00, etc.)
- Daily: runs once per day at midnight

**Check Sync Status:**
- Settings → OBSIDIAN shows:
  - Total items synced
  - Last sync time
  - Current status (active/disabled)

**View Logs:**
```bash
# PM2 logs
pm2 logs idealisted | grep Obsidian

# Look for:
# [Obsidian] Starting sync check...
# [Obsidian] ✓ Sync completed in 45ms (3 items synced)
```

### How It Works

**Sync Process:**
1. Query database for notes and projects not yet synced or updated since last sync
2. For each item:
   - Generate markdown with frontmatter
   - Calculate MD5 hash of content
   - Determine file path based on type (note subtype, project folder)
   - Create directory if needed
   - Write markdown file
   - Track sync in `obsidian_sync` table
3. Update last sync timestamp in settings

**Change Detection:**
- Items with `updated_at > lastSyncTimestamp` are re-synced
- Items not in `obsidian_sync` table are synced
- MD5 hash stored to detect content changes
- Idempotent: running sync twice without changes results in 0 items synced

**File Naming:**
- Titles are sanitized: lowercase, alphanumeric + hyphens, max 50 chars
- Short ID appended for uniqueness: `{sanitized-title}-{8-char-id}.md`
- Example: `research-nextjs-15-features-c4dba0c7.md`

### Troubleshooting

**Sync not running:**
- Check Settings → OBSIDIAN: sync enabled
- Verify vault path is correct and writable (use "Test Path" button)
- Check scheduler is running: `pm2 logs idealisted | grep Scheduler`
- For hourly sync, wait until the next hour starts (minute 0)

**Path test fails:**
- Ensure path is absolute (starts with `/`)
- Verify directory exists: `ls -la /path/to/vault`
- Check write permissions: `touch /path/to/vault/.test && rm /path/to/vault/.test`
- For network mounts: verify mount is active: `mount | grep obsidian`

**Network mount disconnected:**
- Check mount status: `mount | grep /mnt/obsidian`
- Remount if needed: `sudo mount -a` (if in fstab)
- Check network connectivity to server
- Verify credentials haven't expired

**Items not syncing:**
- Check if items are archived (archived items excluded)
- Verify item type is 'note' or 'project'
- Check logs for errors: `pm2 logs idealisted --lines 100 | grep Obsidian`

**Duplicate files:**
- Shouldn't happen with idempotent design
- If duplicates occur, check `obsidian_sync` table for tracking issues
- Clear sync history to force re-sync: `DELETE FROM obsidian_sync;`

### Limitations

- **One-way sync only**: Changes in Obsidian won't sync back to IdeaListed
- **No deletion sync**: Deleting notes in IdeaListed won't delete files in Obsidian
- **Network mount stability**: Sync will fail if network mount disconnects
- **No conflict resolution**: Manual changes in Obsidian may be overwritten on next sync

### Architecture

**Database Schema:**
```sql
CREATE TABLE obsidian_sync (
  item_id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  last_synced_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

**Sync Query:**
```sql
SELECT items.*, notes.subtype, projects.status
FROM items
LEFT JOIN notes ON items.id = notes.item_id
LEFT JOIN projects ON items.id = projects.item_id
WHERE items.type IN ('note', 'project')
  AND items.archived = 0
  AND (
    items.updated_at > ?
    OR NOT EXISTS (SELECT 1 FROM obsidian_sync WHERE item_id = items.id)
  )
```

### Dependencies

- `fs`: File system operations
- `path`: Path manipulation
- `crypto`: MD5 hashing for change detection

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

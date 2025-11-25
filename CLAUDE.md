# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IdeaListed is a Next.js-based idea capture and task management application with AI-powered suggestions and a retro-themed UI. It allows users to capture ideas and convert them into various entity types (todos, tasks, notes, projects, lists) with intelligent AI assistance.

**Current Status**: Beta MVP complete (Phases 1-5 implemented January 2025). See BETA_MVP_IMPLEMENTATION_PLAN.md for implementation details and UNUSED_CODE.md for deprecated features.

## Current Sprint: AI & Notification Features

**CURRENT WORKING PLAN**: `AI_AND_NTFY_PLAN.md` (high-level phase overview)
**CURRENT TASK BREAKDOWN**: `AI_AND_NTFY_TASKS.md` (detailed tasks for all phases)

**Reference Documents** (historical decisions):
- `reference-FOCUSED_IMPLEMENTATION_PLAN.md` - Original detailed feature designs
- `reference-IMPLEMENTATION_UPDATES.md` - User feedback and requirements
- `reference-IMPLEMENTATION_UPDATES_V2.md` - Final scope refinement

**Sprint Status**: Phase 1 Complete ✅, Phase 2 Complete ✅, Phase 3 Task 3.1 Complete ✅, Phase 4 Complete ✅, Phase 5 Tasks 5.1 ✅ and 5.3 ✅ Complete

**IMPORTANT**: When working on this sprint:
1. Use `AI_AND_NTFY_PLAN.md` for phase-level context
2. Use `AI_AND_NTFY_TASKS.md` for specific task details
3. Reference docs contain decision history but are NOT the current plan
4. Each phase follows the Implementation Workflow documented in AI_AND_NTFY_PLAN.md

## Development Principles

**IMPORTANT - Timeline Estimation:**
- **DO NOT estimate timeframes or create timeline predictions** when planning or implementing features
- Focus on priority and implementation order, not duration
- AI timeline estimates are consistently inaccurate (Beta MVP: estimated weeks, completed in one night)
- Think about what to do first, not how long it will take
- User velocity far exceeds typical AI timeline predictions

## Development Commands

```bash
# Development server
npm run dev           # Start Next.js dev server on http://localhost:3000

# IMPORTANT: Horizontal Workflow Port Range
# This worktree uses ports 3300-3310 to avoid conflicts with other parallel implementations
# Use: PORT=3300 npm run dev (or 3301, 3302, etc.)

# Production build
npm run build         # Build for production
npm run start         # Start production server

# Code quality
npm run lint          # Run ESLint
```

### tmux-cli Integration

**Claude Code can control tmux panes via `tmux-cli` tool** for running commands and capturing output:

```bash
# List available panes
tmux-cli status              # Show current window panes
tmux-cli list_panes          # JSON list of all panes

# Launch shell (ALWAYS do this first to prevent losing output on errors)
tmux-cli launch "zsh"        # Returns pane ID (e.g., "2" or "session:1.2")

# Send commands to panes
tmux-cli send "npm run dev" --pane=2
tmux-cli send "git status" --pane=2 --delay-enter=0.5

# Capture output
tmux-cli capture --pane=2

# Wait for command completion
tmux-cli wait_idle --pane=2 --idle-time=3.0

# Control flow
tmux-cli interrupt --pane=2  # Send Ctrl+C
tmux-cli escape --pane=2     # Send ESC key
tmux-cli kill --pane=2       # Kill pane
```

**Important tmux-cli patterns:**
- Always launch `zsh` first, then send commands to it (prevents losing output on errors)
- Use `wait_idle` instead of polling with repeated `capture` calls
- Pane IDs can be simple numbers (2, 3) for current window or full format (session:window.pane)
- Cannot kill your own pane (safety feature)

## Architecture

### Data Model

The application uses a unified entity model centered around `items` with specialized type-specific tables:

- **items**: Base table for all entities (ideas, todos, tasks, notes, lists, projects)
  - Each item has a `type` field that determines its specialized behavior
  - Common fields: id, type, text, metadata (JSON), tags (JSON array), created_at, updated_at, archived

- **Type-specific tables** (todos, tasks, notes, lists, projects):
  - Reference the base `items` table via `item_id` foreign key
  - Contain type-specific fields (e.g., `done` for todos, `status` for tasks)
  - Use ON DELETE CASCADE to maintain referential integrity

**Important**: The `todos` table is legacy/deprecated. Tasks have been unified with todos. The todos infrastructure is maintained for backward compatibility only. New development should use the `tasks` entity type.

### Database

- **SQLite with better-sqlite3**: Located at `data/idealisted.db`
- **WAL mode** enabled for better concurrency
- **Foreign keys** enforced
- **Migration strategy**: ⚠️ **AUTO-MIGRATION DISABLED** (as of 2025-01-24)
  - Previously: Dropped all tables on schema mismatch (caused data loss)
  - Now: Manual migrations required (preserves data)
  - See "Database Schema Changes" section below for workflow

### Tag System

- **Tags table**: Stores tag metadata (name, color, category, usage tracking)
- **Default tags**: 25 starter tags seeded across 4 categories (Work, Personal, Health, Finance, Other)
- **Usage tracking**: `usage_count` incremented on add, decremented on remove
- **Tag suggestions**: AI prioritizes top 50 existing tags by usage (confidence >= 70%)
- **Tag helpers**: `updateTagUsage(addedTags, removedTags)` in lib/db.ts
  - Input validation and sanitization (lowercase, alphanumeric + hyphens)
  - Transaction-based atomic operations
  - Auto-creates new tags when needed
  - Updates `last_used_at` timestamp
  - Never decrements `usage_count` below 0

### AI Integration

- Uses OpenRouter API for AI functionality (lib/ai.ts)
- **Master Toggle**: AI disabled by default (user configurable in Settings > AI)
- **Feature Flags**: Individual AI features can be toggled independently (ai_feature_settings table)
- All AI UI elements hidden when disabled (capture AI button, autofill, suggestions)
- Configurable models: free and paid options
- AI features (when enabled):
  - **AI Suggestion Panel** - Preview-first analysis before item creation (Phase 3)
    - User clicks AI button → analysis runs → preview panel shows
    - Displays: confidence score, suggested type, reasoning, extracted metadata
    - User can accept, override type, or dismiss
    - Metadata validation: date strings → timestamps, priority 1-5, status enum
    - Input validation: empty text check, field validation
    - Error handling: graceful fallback instead of browser alerts
  - **AI Tag Suggestions** - Smart tag recommendations prioritizing existing tags (Phase 4)
    - Analyzes entity text and suggests 3-5 tags
    - Prioritizes reusing top 50 existing tags (confidence >= 70%)
    - Shows confidence %, usage count, source indicator (existing/new)
  - **AI Daily Summary** - Generate daily plans and summaries (planned)
  - Convert ideas to appropriate entity types
  - Suggest rewrites and improvements
- Configuration: AIConfig.enabled boolean controls master toggle, ai_feature_settings controls individual features
- Feature flag checking: `aiService.isFeatureEnabled(featureName)` method provides two-tier protection

### API Layer

All API routes follow Next.js App Router conventions in `app/api/`:
- `/api/items` - CRUD operations for items
- `/api/items/[id]` - Single item operations
- `/api/ai` - AI processing endpoints
- `/api/ai/suggest` - AI suggestions for entity type and metadata
- `/api/ai/suggest-tags` - AI tag suggestions (prioritizes existing tags)
- `/api/ai-features` - AI feature settings management
- `/api/plans` - Daily plan management
- `/api/settings` - Application settings
- `/api/notify` - Ntfy.sh notification integration

### UI Architecture

**Retro Design System**:
- Custom retro-themed components in `components/ui/`
- Theme system with three presets: Classic Green, Monochrome, Dark Mode (lib/themes.ts)
- CSS variables for theming (--retro-* properties)
- Tailwind CSS for styling

**Key Components**:
- RetroDevice: Simulates a retro computer interface
- RetroTabs: Tab navigation with retro styling
- AISuggestionPanel: AI-powered suggestion interface
- ThemeSelector: Theme switching UI

### Type System

TypeScript types defined in `types/index.ts`:
- Core entities: Item, Todo, Task, Note, List, Project, Plan
- Relations: ItemWithRelations, PlanWithTodos
- API contracts: CreateItemRequest, UpdateItemRequest, AIRequest, AIResponse
- Configuration: AIConfig, NtfyConfig

## Important Implementation Details

### Entity Conversion

When converting between entity types (e.g., idea → todo):
1. Create new row in type-specific table (todos, tasks, etc.)
2. Update the base `items.type` field to match
3. Preserve the original item ID to maintain relationships

### Database Initialization

The database auto-initializes on first import of lib/db.ts. The migration logic at lib/db.ts:20-43 handles schema changes by attempting a test insert and dropping/recreating tables if it fails.

### AI Configuration

AI features require OpenRouter API key configuration via the settings page. Config is stored in the `settings` table with key='ai_config'. The AIService class (lib/ai.ts) loads config from the database on initialization.

### Notification System

Optional ntfy.sh integration for push notifications. Configuration stored in settings table with key='ntfy_config'.

**NtfyService** (lib/notify.ts):
- Singleton service: `ntfyService`
- Configuration: Loads from settings table (key='ntfy_config')
- Core method: `sendNotification(title, message, actions?, priority?)`
- Pre-built helpers:
  - `notifyTaskDue(taskText, dueTime)` - Task reminder notifications with action buttons
  - Event-aware methods that check if specific events are enabled
- Returns: `{ success: boolean, error?: string, skipped?: boolean }`

### CRON Scheduler System

The application has a CRON-based scheduler infrastructure (lib/scheduler.ts) that runs periodic background tasks.

**SchedulerService** (lib/scheduler.ts):
- Singleton service initialized on server startup (lib/init.ts)
- Uses `node-cron` dependency for scheduled tasks
- Global variable pattern for HMR compatibility (Next.js hot-reload)
- Mutex locks prevent concurrent executions

**Current CRON Jobs**:
1. **Daily Review** - Sends daily review notifications at configured time (default: 19:00)
2. **Task Reminders** (Phase 5.3) - Checks for due task reminders every minute

**Task Reminder CRON** (checkAndNotifyReminders):
- Schedule: Every minute (`'* * * * *'`)
- Query filters:
  - `reminder_datetime IS NOT NULL`
  - `reminder_datetime <= current time` (due now or overdue)
  - `status != 'completed'` (don't notify completed tasks)
  - `last_notified_at IS NULL OR > 1 hour ago` (prevents spam)
- Sends notifications via `ntfyService.notifyTaskDue(taskText, dueTime)`
- Updates `last_notified_at` timestamp after successful notification
- Performance: Database index on `tasks.reminder_datetime`
- Logging: Start, count, success, failure, completion

**Initialization**:
- Entry point: `app/layout.tsx` imports `lib/init.ts` (re-enabled in Phase 5.3)
- Server-side only (checks `typeof window !== 'undefined'`)
- Global flag `__scheduler_initialized` survives hot-reloads
- Calls `schedulerService.start()` to begin CRON loops

### Voice Input

Voice input uses the Web Speech API (browser-native, no dependencies):
- Triggered via microphone button in capture input
- Real-time speech-to-text conversion
- No API keys or external services required
- Graceful fallback if browser doesn't support speech recognition

### Entity Modal Fields

Each entity type has specific required fields in their modals:

**Task Modal**:
- Title (text input)
- Status (dropdown: not_started, in_progress, done, archived)
- Priority (dropdown: low, medium, high)
- Due Date (date picker)
- **Reminder** (Phase 5 feature):
  - Checkbox to enable reminder (disabled if no due date)
  - Quick presets: Morning of (9 AM), 1hr before (4 PM), 1 day before (9 AM), Custom
  - Custom datetime picker for precise time selection
  - Human-readable display with locale formatting
  - Past-time warning (red alert if reminder < current time)
  - Stored as reminder_datetime (Unix timestamp in tasks table)
- Project (dropdown, optional)
- Tags (tag input with AI suggestions)
- Notes (textarea)

**Note Modal**:
- Title (text input)
- Subtype (dropdown: general, meeting, research, reference - must persist selection)
- Project (dropdown, optional)
- Tags (tag input with AI suggestions)
- Content (textarea)

**Project Modal**:
- Name (text input)
- Status (dropdown: active, planning, on_hold, completed, archived)
- Description (textarea)
- Tags (tag input with AI suggestions)

**List Modal**:
- Name (text input)
- Tags (tag input with AI suggestions)
- Items (textarea or item list UI)

**AI Tag Suggestions** (Phase 4 feature):
- "🏷️ Suggest Tags" button in all entity modals
- Analyzes entity text/content for relevant tags
- Prioritizes existing tags (marked with ●) over new tags (marked with ○)
- Shows confidence % and usage count
- Individual ADD buttons + Accept All/Dismiss options
- Gated by AI master toggle + tag_suggestions feature flag

### Badge System

Tab badges update immediately on data changes with entity-specific flash animations:
- Flash animations defined in retro.css (`.flash-task`, `.flash-note`, `.flash-project`, `.flash-list`)
- Tabs flash with entity colors when items are processed (600ms duration)
- Entity colors: Task=Blue, Note=Orange, Project=Green, List=Purple
- Flash triggered via TabNavHandle ref pattern (forwardRef in BottomTabNav)
- Visual effects: Background color glow (30% opacity), box-shadow, scale (1.05x)
- Triggers: Capture, sort, and convert actions flash appropriate tab

### Modal UX Pattern

Entity modals follow a dual-save button pattern with slide animations:
- "Save" button: Saves and closes modal
- "Save & Go to Files" button: Saves, navigates to Files tab, and applies entity type filter
- Modal animations: framer-motion slide up/down with spring physics (600ms)
- AnimatePresence wrapper for smooth enter/exit transitions
- Entity-specific styling via retro-bottom-sheet-{type} classes

## Database Schema Changes

**CRITICAL**: Auto-migration is DISABLED to preserve data. Schema changes require manual migration scripts.

### Why Auto-Migration Was Disabled

**Date**: 2025-01-24 (Batch 7)
**Reason**: The previous auto-migration system dropped ALL tables whenever schema validation failed, causing complete data loss on every restart after any schema change. This happened during:
- Code changes with schema modifications
- Hot reloads during development
- PM2 restarts
- Build processes

**Decision**: Disabled destructive auto-migration to preserve user data. The app will now FAIL LOUDLY if schema mismatches are detected.

### How Schema Mismatch Detection Works

The system validates schema compatibility on startup (lib/db.ts:413-471):

1. **Test Insert**: Attempts to insert test records using the current schema
2. **Success**: Schema is compatible, app starts normally
3. **Failure**:
   - If tables don't exist: Creates them (first run)
   - If tables exist but schema doesn't match: **FAILS LOUDLY**

### When Schema Mismatch Occurs

You will see this error in the console:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DATABASE SCHEMA MISMATCH DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The database schema does not match the code expectations.
This typically means:
  1. Code was updated with schema changes
  2. Database needs to be migrated

⚠️  AUTO-MIGRATION IS DISABLED (to preserve data)

To fix this:
  1. See CLAUDE.md "Database Schema Changes" section
  2. Write a manual migration script
  3. Test on a backup first
  4. Run migration explicitly

OR if data loss is acceptable:
  rm -f data/idealisted.db*
```

**The app will NOT start** until this is resolved. This ensures you cannot accidentally miss a required migration.

### Workflow for Schema Changes

**IMPORTANT**: Follow this checklist every time you need to change the database schema:

#### Before Making Schema Changes

1. **Document Current Schema**
   ```bash
   sqlite3 data/idealisted.db ".schema" > schema-backup-$(date +%Y%m%d).sql
   ```

2. **Backup Database**
   ```bash
   cp data/idealisted.db data/idealisted.db.backup-$(date +%Y%m%d)
   cp data/idealisted.db-wal data/idealisted.db-wal.backup-$(date +%Y%m%d) 2>/dev/null || true
   ```

3. **Check for Existing Data**
   ```bash
   sqlite3 data/idealisted.db "SELECT COUNT(*) FROM items"
   ```
   - If count > 0: Migration required (preserve data)
   - If count = 0: Can delete and recreate (no data loss)

#### Making Schema Changes

4. **Write Migration Script**
   - Create `migrations/YYYYMMDD-description.sql`
   - Use `ALTER TABLE` to add/modify columns
   - Use transactions for safety
   - Include rollback instructions in comments

   Example migration:
   ```sql
   -- Migration: Add priority_v2 column to tasks
   -- Date: 2025-01-24
   -- Rollback: ALTER TABLE tasks DROP COLUMN priority_v2;

   BEGIN TRANSACTION;

   -- Add new column
   ALTER TABLE tasks ADD COLUMN priority_v2 INTEGER DEFAULT 1;

   -- Migrate data
   UPDATE tasks SET priority_v2 = priority WHERE priority IS NOT NULL;

   -- Verify migration
   -- SELECT COUNT(*) FROM tasks WHERE priority_v2 IS NULL;

   COMMIT;
   ```

5. **Update Schema Definition**
   - Modify the CREATE TABLE statements in lib/db.ts
   - Update the test insert in initializeDatabase() if needed
   - Document the change in comments

#### Testing Migration

6. **Test on Backup First**
   ```bash
   cp data/idealisted.db data/idealisted.db.test
   sqlite3 data/idealisted.db.test < migrations/YYYYMMDD-description.sql
   ```

7. **Verify Migration**
   ```bash
   sqlite3 data/idealisted.db.test ".schema tablename"
   sqlite3 data/idealisted.db.test "SELECT * FROM items LIMIT 5"
   ```

8. **Test App with Migrated DB**
   ```bash
   mv data/idealisted.db data/idealisted.db.original
   mv data/idealisted.db.test data/idealisted.db
   pm2 restart idealisted
   # Check logs: pm2 logs idealisted
   # Test app in browser
   ```

#### Applying Migration

9. **Run Migration on Production DB**
   ```bash
   sqlite3 data/idealisted.db < migrations/YYYYMMDD-description.sql
   ```

10. **Restart App**
    ```bash
    pm2 restart idealisted
    pm2 logs idealisted --lines 50
    ```

11. **Verify App Starts**
    - Check logs for schema mismatch errors
    - If no errors: Migration successful ✅
    - If errors: Restore backup and debug

#### If Migration Fails

12. **Restore Backup**
    ```bash
    pm2 stop idealisted
    cp data/idealisted.db.backup-$(date +%Y%m%d) data/idealisted.db
    cp data/idealisted.db-wal.backup-$(date +%Y%m%d) data/idealisted.db-wal 2>/dev/null || true
    pm2 start idealisted
    ```

13. **Debug and Retry**
    - Review migration script
    - Check error logs
    - Fix issues
    - Test on backup again

### Quick Reference: Common Schema Operations

**Add column:**
```sql
ALTER TABLE tablename ADD COLUMN columnname TYPE DEFAULT value;
```

**Rename column (SQLite 3.25.0+):**
```sql
ALTER TABLE tablename RENAME COLUMN oldname TO newname;
```

**Drop column (SQLite 3.35.0+):**
```sql
ALTER TABLE tablename DROP COLUMN columnname;
```

**Add index:**
```sql
CREATE INDEX idx_name ON tablename(columnname);
```

**For older SQLite or complex changes:**
```sql
-- 1. Create new table with desired schema
CREATE TABLE tablename_new (...);

-- 2. Copy data
INSERT INTO tablename_new SELECT ... FROM tablename;

-- 3. Drop old table
DROP TABLE tablename;

-- 4. Rename new table
ALTER TABLE tablename_new RENAME TO tablename;
```

### When Data Loss Is Acceptable

If you're in early development and don't need to preserve data:

```bash
pm2 stop idealisted
rm -f data/idealisted.db*
pm2 start idealisted
```

The app will create fresh tables with the new schema automatically.

### Checklist: Did I Follow the Workflow?

Before declaring a schema change complete:

- [ ] Backed up current database
- [ ] Documented current schema
- [ ] Wrote migration script with rollback instructions
- [ ] Updated lib/db.ts CREATE TABLE statements
- [ ] Tested migration on backup database
- [ ] Verified app starts with migrated database
- [ ] Checked that existing data is preserved
- [ ] Committed migration script to git
- [ ] Updated this section in CLAUDE.md if workflow changed

### For Claude Code: Automatic Reminders

**IMPORTANT**: When you (Claude Code) are asked to modify database schema:

1. **STOP** - Do not modify lib/db.ts schema definitions directly
2. **ASK** - Confirm with user if data preservation is needed
3. **FOLLOW** - Use the workflow above if data must be preserved
4. **TEST** - Always test migrations before applying to production DB
5. **DOCUMENT** - Update CLAUDE.md if workflow needs refinement

If you detect you're about to modify a CREATE TABLE statement:
- Pause and ask: "This requires a database migration. Do we have data to preserve?"
- If yes: Follow full migration workflow
- If no: User can delete database and recreate

## Code Patterns

### API Routes

```typescript
// Standard pattern for API routes
export async function GET(request: NextRequest) {
  try {
    const data = db.prepare('SELECT ...').all()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### Database Queries

- Use prepared statements for all queries
- JSON fields (metadata, tags) are stored as strings and must be parsed/stringified
- Always use transactions for multi-step operations

### Component Styling

- Use retro-themed components from `components/ui/` for consistency
- Apply theme-aware styling using CSS variables: `var(--retro-primary)`, etc.
- Use Tailwind utility classes alongside retro components

## Testing Approach

For comprehensive feature testing, use parallel testing agents:

1. **Parallel Agent Pattern**: Dispatch 16+ agents in batches of 4-5 to analyze different features
2. **Testing Report Format**: Use ✅ (working), ❌ (broken/missing), ❓ (unclear) sections
3. **File Citations**: Include specific file paths and line numbers in reports
4. **Comprehensive Analysis**: Test UI, API, database, and integration points for each feature
5. **Before Implementation**: Always test first to identify gaps before coding

Example testing agents:
- Layout & Branding
- Capture Input & Voice
- Ready Tab & Sorting
- Entity Modals (Task/Note/Project/List)
- Files Tab & Filtering
- Settings & Configuration
- AI Integration & Master Toggle
- Badge System & Animations
- Navigation & Tab State

## Beta MVP Features - Implementation Complete ✅

All Phases 1-5 implemented (January 2025). See BETA_MVP_IMPLEMENTATION_PLAN.md for detailed implementation history.

**Phase 1: Branding & Visual Identity** ✅
- FrondNut device branding (Palm/Blackberry style logo)
- IdeaListed app naming (browser title, metadata)
- Colored Files tab icon with outline when inactive
- Favicon system with colored entity grid

**Phase 2: Entity Modal Enhancements** ✅
- Task fields: priority (1-5), status dropdown, project selection, due date
- Note fields: subtype selector (general, research, video, link, file, contact, meeting)
- Project fields: status, description, tags
- Dual save buttons: "Save" and "Save & Go to Files"
- Modal slide animations with framer-motion
- API validation for all entity fields
- Note template to subtype mapping

**Phase 3: AI Master Toggle System** ✅
- Master toggle in Settings > AI tab
- AI disabled by default (user's top priority)
- All AI UI elements hidden when disabled
- Backend protection (enabled flag checked before processing)
- Graceful error messages when AI disabled

**Phase 4: Speech-to-Text Input** ✅
- Web Speech API integration (browser-native, no dependencies)
- Microphone button in capture textarea (🎤/🔴)
- Speech appends to existing text or replaces if empty
- Graceful degradation in unsupported browsers (Firefox)
- Error handling for permissions and no-speech

**Phase 5: Badge Flash Animations** ✅
- Tab badges flash with entity-specific colors (600ms)
- Entity colors: Task=Blue, Note=Orange, Project=Green, List=Purple
- Flash on capture, sort, and convert actions
- forwardRef pattern with TabNavHandle interface
- CSS keyframe animations with glow and scale effects

**Post-Beta Features - AI & Notification Sprint**:
- Phase 1: Database Foundation ✅
- Phase 2: AI Settings UI ✅
- Phase 3: AI Suggestion Flow (Task 3.1 ✅)
  - Preview-first capture flow with input validation
  - Metadata transformation with date string → timestamp conversion
  - Field validation (priority 1-5, status enum, positive estimated_time)
  - Error handling with graceful fallback (no browser alerts)
  - Removed redundant /api/tags/usage endpoint call
- Phase 4: AI Tag Suggestions ✅
  - AI-powered tag suggestions prioritizing existing tags
  - Tag usage tracking with atomic database operations
- Phase 5: Task Reminders (Tasks 5.1 ✅, 5.3 ✅)
  - Task modal reminder datetime picker with quick presets
  - CRON job for reminder checks (re-enabled scheduler)
  - NTFY push notifications for due tasks

**Deferred for Future**:
- Phase 3: Tasks 3.2-3.4 (AI Suggestion Panel UI enhancements)
- Phase 6: Scheduled Summary (daily activity digests)
- Phase 7: Onboarding Wizard (interactive tour)
- List entity enhancements
- Advanced filtering features
- Multi-language voice input

## Project Context

This is a personal productivity tool focusing on rapid idea capture with AI-assisted organization. The retro aesthetic is a deliberate design choice creating a nostalgic, focused environment.

**Branding**:
- **IdeaListed**: App name (browser title, metadata, user-facing)
- **FrondNut**: Device manufacturer branding (like "Palm" or "Blackberry")
- Logo: Palm frond with coconut design (retro device aesthetic)
- Design: Retro computer/PDA interface with nostalgic focused environment

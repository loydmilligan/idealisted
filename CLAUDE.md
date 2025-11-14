# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IdeaListed is a Next.js-based idea capture and task management application with AI-powered suggestions and a retro-themed UI. It allows users to capture ideas and convert them into various entity types (todos, tasks, notes, projects, lists) with intelligent AI assistance.

**Current Status**: Beta MVP in development. See BETA_MVP_IMPLEMENTATION_PLAN.md for feature roadmap and phased implementation plan.

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
- **Migration strategy**: lib/db.ts:20-43 contains auto-migration logic that drops and recreates tables when schema changes

### AI Integration

- Uses OpenRouter API for AI functionality (lib/ai.ts)
- Configurable models: free and paid options
- AI features:
  - Parse ideas and extract structured information
  - Convert ideas to appropriate entity types
  - Suggest tags and rewrites
  - Generate daily plans from todos

### API Layer

All API routes follow Next.js App Router conventions in `app/api/`:
- `/api/items` - CRUD operations for items
- `/api/items/[id]` - Single item operations
- `/api/ai` - AI processing endpoints
- `/api/ai/suggest` - AI suggestions
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
- Project (dropdown, optional)
- Tags (tag input)
- Notes (textarea)

**Note Modal**:
- Title (text input)
- Subtype (dropdown: general, meeting, research, reference - must persist selection)
- Project (dropdown, optional)
- Tags (tag input)
- Content (textarea)

**Project Modal**:
- Name (text input)
- Status (dropdown: active, planning, on_hold, completed, archived)
- Description (textarea)
- Tags (tag input)

**List Modal**:
- Name (text input)
- Tags (tag input)
- Items (textarea or item list UI)

### Badge System

Entity count badges update immediately on data changes with flash animations:
- Badge animations defined in globals.css (`.badge-flash`)
- Badges flash on increment/decrement
- Animation classes must be explicitly applied on update
- Entity type filters should apply entity colors to badges

### Modal UX Pattern

Entity modals follow a dual-save button pattern:
- "Save" button: Saves and closes modal
- "Save & Go to Files" button: Saves, navigates to Files tab, and applies entity type filter
- Modal animations require explicit class application (not automatic)

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

## Beta MVP Features

See BETA_MVP_IMPLEMENTATION_PLAN.md for complete feature inventory and phased implementation plan.

**Critical Missing Features**:
1. Speech-to-Text (Web Speech API integration)
2. AI Master Toggle (user's top priority)
3. Entity modal field completion (Task/Note/Project missing required fields)
4. Note subtype persistence
5. Modal animations not applied
6. "Save & Go to Files" navigation
7. Entity type filter color application

**Deferred for Post-Beta**:
- CRON system (dependencies not installed, disabled intentionally)
- List entity enhancements
- Advanced filtering features

## Project Context

This is a personal productivity tool focusing on rapid idea capture with AI-assisted organization. The retro aesthetic is a deliberate design choice creating a nostalgic, focused environment.

**Branding**: FrondNut with Palm/Blackberry-inspired logo and retro device UI.

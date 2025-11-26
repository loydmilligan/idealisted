import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'idealisted.db')

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

export const db = new Database(DB_PATH)

// Enable foreign keys
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Seed default starter tags
function seedDefaultTags() {
  // Check if tags already exist (idempotent)
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number }
  if (existingCount.count > 0) {
    return // Tags already seeded
  }

  const tags = [
    // Work & Productivity
    { name: 'work', category: 'Work' },
    { name: 'urgent', category: 'Work' },
    { name: 'meeting', category: 'Work' },
    { name: 'deadline', category: 'Work' },
    { name: 'focus', category: 'Work' },

    // Personal
    { name: 'home', category: 'Personal' },
    { name: 'health', category: 'Health' },
    { name: 'finance', category: 'Finance' },
    { name: 'shopping', category: 'Personal' },
    { name: 'family', category: 'Personal' },

    // Project Management
    { name: 'bug', category: 'Other' },
    { name: 'feature', category: 'Other' },
    { name: 'design', category: 'Other' },
    { name: 'planning', category: 'Other' },
    { name: 'review', category: 'Other' },

    // Categories
    { name: 'news', category: 'Other' },
    { name: 'politics', category: 'Other' },
    { name: 'tech', category: 'Other' },
    { name: 'entertainment', category: 'Personal' },
    { name: 'culture', category: 'Personal' },
    { name: 'web', category: 'Other' },
    { name: 'hobby', category: 'Personal' },
    { name: 'history', category: 'Personal' },
    { name: 'philosophy', category: 'Personal' },
    { name: 'science', category: 'Other' },
  ]

  try {
    const insert = db.prepare(`
      INSERT INTO tags (id, name, color, category, created_at, is_default)
      VALUES (?, ?, ?, ?, ?, 1)
    `)

    const now = Date.now()
    tags.forEach(tag => {
      const id = crypto.randomUUID()
      const color = '#999999' // Default gray for all starter tags
      insert.run(id, tag.name, color, tag.category, now)
    })

    console.log('Seeded 25 default tags')
  } catch (error) {
    console.warn('Failed to seed default tags:', error)
    // Don't throw - let app continue without defaults
  }
}

function seedAIFeatureSettings() {
  const features = [
    {
      name: 'suggestion_panel',
      enabled: 1,
      description: 'Preview AI analysis before creating items'
    },
    {
      name: 'tag_suggestions',
      enabled: 1,
      description: 'AI-powered tag recommendations'
    },
    {
      name: 'daily_summary',
      enabled: 0,
      description: 'AI summary in daily review notifications'
    },
    {
      name: 'list_append_ai',
      enabled: 1,
      description: 'AI-powered suggestions for adding items to lists'
    },
    {
      name: 'project_ai_add',
      enabled: 1,
      description: 'AI-powered task and note suggestions for projects'
    },
  ]

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO ai_feature_settings (feature_name, enabled, description)
      VALUES (?, ?, ?)
    `)

    features.forEach(feature => {
      insert.run(feature.name, feature.enabled, feature.description)
    })

    console.log('Seeded AI feature settings')
  } catch (error) {
    console.warn('Failed to seed AI feature settings:', error)
    // Don't throw - let app continue
  }
}

function seedTemplates() {
  const now = Date.now()

  // Template 1: Task
  const taskMarkdown = `# {title}

**Status**: Not Started
**Priority**: Medium
**Due Date**:
**Reminder**:

## Description


## Subtasks
- [ ]


## Notes
`

  const taskFieldConfig = JSON.stringify({
    fields: {
      Status: { type: "select", options: ["Not Started", "In Progress", "Completed"], required: true },
      Priority: { type: "select", options: ["Low", "Medium", "High", "Urgent"], required: true },
      "Due Date": { type: "date", required: false },
      "Reminder": { type: "datetime", required: false }
    },
    sections: {
      Description: { type: "textarea", required: false },
      Subtasks: { type: "checklist", required: false },
      Notes: { type: "textarea", required: false }
    }
  })

  // Template 2: Note-Generic
  const noteGenericMarkdown = `# {title}

## Content


## Tags
`

  const noteGenericFieldConfig = JSON.stringify({
    sections: {
      Content: { type: "textarea", required: true },
      Tags: { type: "taglist", required: false }
    }
  })

  // Template 3: Note-YouTube
  const noteYoutubeMarkdown = `# {title}

**URL**:
**Duration**:
**Status**: Not Watched

## Key Concepts


## Timestamps


## AI Summary


## My Notes
`

  const noteYoutubeFieldConfig = JSON.stringify({
    fields: {
      URL: { type: "url", required: true, validation: "youtube" },
      Duration: { type: "text", required: false },
      Status: { type: "select", options: ["Not Watched", "In Progress", "Completed"], required: true }
    },
    sections: {
      "Key Concepts": { type: "bulletlist", required: false },
      Timestamps: { type: "timestamplist", required: false },
      "AI Summary": { type: "textarea", readonly: true, required: false },
      "My Notes": { type: "textarea", required: false }
    }
  })

  // Template 4: Meeting Note
  const noteMeetingMarkdown = `# {title}

**Date**:
**Attendees**:
**Decisions**:

## Agenda
- 

## Notes


## Action Items
- [ ]`

  const noteMeetingFieldConfig = JSON.stringify({
    fields: {
      Date: { type: "date", required: false },
      Attendees: { type: "text", required: false },
      Decisions: { type: "textarea", required: false }
    },
    sections: {
      Agenda: { type: "bulletlist", required: false },
      Notes: { type: "textarea", required: false },
      "Action Items": { type: "checklist", required: false }
    }
  })

  // Template 5: Research Note
  const noteResearchMarkdown = `# {title}

**Question**:
**Status**: In Progress
**Source URL**:

## Findings
- 

## Next Actions
- [ ]

## Notes
`

  const noteResearchFieldConfig = JSON.stringify({
    fields: {
      Question: { type: "text", required: true },
      Status: { type: "select", options: ["In Progress", "Completed", "Blocked"], required: true },
      "Source URL": { type: "url", required: false }
    },
    sections: {
      Findings: { type: "bulletlist", required: false },
      "Next Actions": { type: "checklist", required: false },
      Notes: { type: "textarea", required: false }
    }
  })

  // Template 6: Media Note (attachment-first)
  const noteMediaMarkdown = `# {title}

**Media URL**:
**Type**: Image
**Caption**:

## Details
`

  const noteMediaFieldConfig = JSON.stringify({
    fields: {
      "Media URL": { type: "url", required: true },
      Type: { type: "select", options: ["Image", "Audio", "Video"], required: true },
      Caption: { type: "text", required: false }
    },
    sections: {
      Details: { type: "textarea", required: false }
    }
  })

  const listBulletedMarkdown = `# {title}

## Items
- 

## Notes
`

  const listBulletedFieldConfig = JSON.stringify({
    sections: {
      Items: { type: "bulletlist", required: true },
      Notes: { type: "textarea", required: false }
    }
  })

  const listNumberedMarkdown = `# {title}

## Items
1. 

## Notes
`

  const listNumberedFieldConfig = JSON.stringify({
    sections: {
      Items: { type: "orderedlist", required: true },
      Notes: { type: "textarea", required: false }
    }
  })

  const listTaskMarkdown = `# {title}

## Tasks
- [ ] First task

## Notes
`

  const listTaskFieldConfig = JSON.stringify({
    sections: {
      Tasks: { type: "checklist", required: false },
      Notes: { type: "textarea", required: false }
    }
  })

  const listShoppingMarkdown = `# {title}

## Shopping List
- [ ] Item

## Notes
`

  const listShoppingFieldConfig = JSON.stringify({
    sections: {
      "Shopping List": { type: "shoppinglist", required: true },
      Notes: { type: "textarea", required: false }
    }
  })

  const projectMarkdown = `# {title}

**Type**: 
**Status**: Planning
**Priority**: Medium
**Deadline**:

## Overview


## Goals
- 


## Checkpoints
- [ ]


## Notes
`

  const projectFieldConfig = JSON.stringify({
    fields: {
      Type: { type: "select", options: ["Personal", "Coding", "Smart Home", "Work", "Apartment"], required: true },
      Status: { type: "select", options: ["Planning", "Active", "Completed"], required: true },
      Priority: { type: "select", options: ["Low", "Medium", "High"], required: false },
      Deadline: { type: "date", required: false }
    },
    sections: {
      Overview: { type: "textarea", required: false },
      Goals: { type: "bulletlist", required: false },
      Checkpoints: { type: "checklist", required: false },
      Notes: { type: "textarea", required: false }
    }
  })

  try {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO templates (id, name, entity_type, subtype, markdown_template, field_config, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insert.run('task', 'Task', 'task', null, taskMarkdown, taskFieldConfig, 1, now, now)
    insert.run('note-generic', 'Generic Note', 'note', 'generic', noteGenericMarkdown, noteGenericFieldConfig, 1, now, now)
    insert.run('note-youtube', 'YouTube Learning Note', 'note', 'youtube', noteYoutubeMarkdown, noteYoutubeFieldConfig, 1, now, now)
    insert.run('note-meeting', 'Meeting Note', 'note', 'meeting', noteMeetingMarkdown, noteMeetingFieldConfig, 1, now, now)
    insert.run('note-research', 'Research Note', 'note', 'research', noteResearchMarkdown, noteResearchFieldConfig, 1, now, now)
    insert.run('note-media', 'Media Note', 'note', 'media', noteMediaMarkdown, noteMediaFieldConfig, 1, now, now)
    insert.run('list-bulleted', 'Bulleted List', 'list', 'bulleted', listBulletedMarkdown, listBulletedFieldConfig, 1, now, now)
    insert.run('list-numbered', 'Numbered List', 'list', 'numbered', listNumberedMarkdown, listNumberedFieldConfig, 1, now, now)
    insert.run('list-tasklist', 'TaskList', 'list', 'tasklist', listTaskMarkdown, listTaskFieldConfig, 1, now, now)
    insert.run('list-shopping', 'Shopping List', 'list', 'shopping', listShoppingMarkdown, listShoppingFieldConfig, 1, now, now)
    insert.run('project-standard', 'Project', 'project', 'standard', projectMarkdown, projectFieldConfig, 1, now, now)

    console.log('Seeded system templates')
  } catch (error) {
    console.warn('Failed to seed templates:', error)
    // Don't throw - let app continue
  }
}

// Initialize tables
export function initializeDatabase() {
  // ⚠️ AUTO-MIGRATION DISABLED (2025-01-24)
  // Previously, this function would drop all tables if schema changed.
  // This caused data loss on every restart after schema changes.
  // Now: Tables are only created if they don't exist (preserves data).
  //
  // IMPORTANT: If you need to change the schema:
  // 1. Write a manual migration script
  // 2. Test it on a backup of the database
  // 3. Run it explicitly (don't rely on auto-migration)
  // 4. See CLAUDE.md "Database Schema Changes" section for workflow
  //
  // Schema validation below will FAIL LOUDLY if schema is incompatible.

  // Validate schema compatibility (non-destructive check)
  try {
    // Test if current schema is compatible by trying a test insert
    db.prepare(`INSERT INTO items (id, type, text, parsed, entity_type, created_at, updated_at) VALUES ('test', 'idea', 'test', 0, NULL, 1, 1)`).run()
    db.prepare(`INSERT INTO notes (id, item_id, subtype, content, frontmatter) VALUES ('test-note', 'test', 'general', 'test', '{}')`).run()
    db.prepare(`DELETE FROM notes WHERE id = 'test-note'`).run()
    db.prepare(`DELETE FROM items WHERE id = 'test'`).run()
    // Schema is compatible
  } catch (e) {
    // Schema incompatibility detected
    // Check if tables don't exist yet (first run) vs. schema mismatch
    const tablesExist = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='items'`).get() as { count: number }

    if (tablesExist.count === 0) {
      // First run - tables don't exist yet, will be created below
      console.log('Database empty, creating initial schema...')
    } else {
      // Tables exist but schema doesn't match - FAIL LOUDLY
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ DATABASE SCHEMA MISMATCH DETECTED')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('')
      console.error('The database schema does not match the code expectations.')
      console.error('This typically means:')
      console.error('  1. Code was updated with schema changes')
      console.error('  2. Database needs to be migrated')
      console.error('')
      console.error('⚠️  AUTO-MIGRATION IS DISABLED (to preserve data)')
      console.error('')
      console.error('To fix this:')
      console.error('  1. See CLAUDE.md "Database Schema Changes" section')
      console.error('  2. Write a manual migration script')
      console.error('  3. Test on a backup first')
      console.error('  4. Run migration explicitly')
      console.error('')
      console.error('OR if data loss is acceptable:')
      console.error('  rm -f data/idealisted.db*')
      console.error('')
      console.error('Error details:', e)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Throw error to prevent app from starting with mismatched schema
      throw new Error('DATABASE SCHEMA MISMATCH - Manual migration required. See console output above.')
    }
  }

  // Items table - main entity
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('idea', 'todo', 'task', 'note', 'list', 'project')),
      text TEXT NOT NULL,
      metadata TEXT, -- JSON for additional data
      tags TEXT, -- JSON array of tags
      parsed INTEGER DEFAULT 0, -- Parse + Convert: has been categorized
      entity_type TEXT, -- Parse + Convert: suggested type (task|note|list|project)
      ai_suggestion TEXT, -- Parse + Convert: stored AI suggestion JSON
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived INTEGER DEFAULT 0
    )
  `)

  // Todos table
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      due_date INTEGER,
      priority INTEGER DEFAULT 0,
      recurring_rule TEXT,
      completed_at INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
      priority INTEGER DEFAULT 1,
      tags TEXT, -- JSON array of tags
      estimated_time INTEGER,
      project_id TEXT,
      due_date INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  // Add reminder columns to tasks table
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN reminder_datetime INTEGER`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add reminder_datetime column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN last_notified_at INTEGER`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add last_notified_at column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  // Add markdown entity support columns to items table
  try {
    db.exec(`ALTER TABLE items ADD COLUMN markdown_content TEXT`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add markdown_content column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  try {
    db.exec(`ALTER TABLE items ADD COLUMN template_id TEXT`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add template_id column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  // Notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      subtype TEXT DEFAULT 'general' CHECK (subtype IN ('general', 'research', 'video', 'link', 'file', 'contact', 'meeting')),
      project_id TEXT,
      content TEXT,
      url TEXT,
      media_type TEXT,
      frontmatter TEXT, -- JSON string of YAML frontmatter
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  try {
    db.exec(`ALTER TABLE notes ADD COLUMN project_id TEXT`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add project_id to notes:', e)
      throw e
    }
  }

  // Lists table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      name TEXT,
      list_type TEXT DEFAULT 'bulleted' CHECK (list_type IN ('bulleted', 'numbered', 'tasklist', 'shopping')),
      tags TEXT, -- JSON array of tags
      description TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  try {
    db.exec(`ALTER TABLE lists ADD COLUMN list_type TEXT DEFAULT 'bulleted'`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add list_type column:', e)
      throw e
    }
  }

  // List items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS list_items (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at INTEGER,
      FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
    )
  `)

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
      project_type TEXT DEFAULT 'personal' CHECK (project_type IN ('personal', 'coding', 'smart-home', 'work', 'apartment')),
      priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
      tags TEXT, -- JSON array of tags
      deadline INTEGER,
      description TEXT,
      progress INTEGER DEFAULT 0,
      start_date INTEGER,
      end_date INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'personal'`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add project_type column:', e)
      throw e
    }
  }

  try {
    db.exec(`ALTER TABLE projects ADD COLUMN priority INTEGER DEFAULT 2`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add project priority column:', e)
      throw e
    }
  }

  // Templates table - stores markdown templates for tasks and notes
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      subtype TEXT,
      markdown_template TEXT NOT NULL,
      field_config TEXT NOT NULL,
      is_system INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      todoIds TEXT, -- JSON array of todo IDs (legacy)
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'completed')),
      journal_entry TEXT,
      tasks_completed_count INTEGER DEFAULT 0,
      tasks_total_count INTEGER DEFAULT 0,
      completion_percentage REAL DEFAULT 0.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      finalized_at INTEGER,
      completed_at INTEGER
    )
  `)

  // Plan tasks table - Sprint 3: Many-to-many relationship between plans and tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_tasks (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(plan_id, task_id)
    )
  `)

  // Plan assignments table - Sprint 3 Phase 1: Links items to specific dates with ordering
  // Enables "Plan my day" feature where items can be assigned to calendar dates
  db.exec(`
    CREATE TABLE IF NOT EXISTS plan_assignments (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      assigned_date TEXT NOT NULL,  -- YYYY-MM-DD format
      position INTEGER DEFAULT 0,   -- For drag-drop reordering within a day
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      UNIQUE(item_id, assigned_date)
    )
  `)

  // AI suggestions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_suggestions (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      type TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      confidence REAL DEFAULT 0.0,
      applied INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // AI feature settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_feature_settings (
      feature_name TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      description TEXT NOT NULL
    )
  `)

  // Tags table - stores tag metadata (color, category)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      category TEXT DEFAULT 'Other' CHECK (category IN ('Work', 'Personal', 'Health', 'Finance', 'Other')),
      created_at INTEGER NOT NULL
    )
  `)

  // Add usage tracking columns to tags table
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN usage_count INTEGER DEFAULT 0`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add usage_count column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  try {
    db.exec(`ALTER TABLE tags ADD COLUMN is_default INTEGER DEFAULT 0`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add is_default column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  try {
    db.exec(`ALTER TABLE tags ADD COLUMN last_used_at INTEGER`)
  } catch (e) {
    if (!e.message?.includes('duplicate column name')) {
      console.error('Failed to add last_used_at column:', e)
      throw e
    }
    // Column already exists, safe to ignore
  }

  // Obsidian sync table - tracks exported files for one-way sync to Obsidian vault
  db.exec(`
    CREATE TABLE IF NOT EXISTS obsidian_sync (
      item_id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      last_synced_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_archived ON items(archived);
    CREATE INDEX IF NOT EXISTS idx_items_template_id ON items(template_id);
    CREATE INDEX IF NOT EXISTS idx_todos_item_id ON todos(item_id);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
    CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder_datetime);
    CREATE INDEX IF NOT EXISTS idx_templates_entity_type ON templates(entity_type);
    CREATE INDEX IF NOT EXISTS idx_plan_assignments_date ON plan_assignments(assigned_date);
    CREATE INDEX IF NOT EXISTS idx_plan_assignments_item ON plan_assignments(item_id);
    CREATE INDEX IF NOT EXISTS idx_obsidian_sync_item ON obsidian_sync(item_id);
  `)

  console.log('Database initialized successfully')

  // Seed default data
  seedDefaultTags()
  seedAIFeatureSettings()
  seedTemplates()
}

// Initialize the database
initializeDatabase()

export default db

// Phase 4: Tag Usage Tracking Helpers
/**
 * Updates tag usage counts when tags are added or removed from items
 * @param addedTags - Array of tag names that were added to an item
 * @param removedTags - Array of tag names that were removed from an item
 * @returns void
 *
 * Side effects:
 * - Creates new tag records for tags that don't exist
 * - Increments usage_count for added tags
 * - Decrements usage_count for removed tags (never below 0)
 * - Updates last_used_at timestamp for added tags
 * - All operations are atomic within a transaction
 */
export function updateTagUsage(addedTags: string[], removedTags: string[]) {
  const now = Date.now()

  // Import tag icon utilities
  const { generateTagIcon, loadUsedIconCombos, serializeTagIconForDB } = require('@/lib/tag-icons')

  // Validate and sanitize tag names
  const sanitizeTag = (tag: string): string | null => {
    if (!tag || typeof tag !== 'string') return null
    const cleaned = tag.toLowerCase().trim().replace(/\s+/g, '-')
    if (cleaned.length === 0 || cleaned.length > 50) return null
    if (!/^[a-z0-9-_]+$/.test(cleaned)) return null
    return cleaned
  }

  const validAddedTags = addedTags.map(sanitizeTag).filter(Boolean) as string[]
  const validRemovedTags = removedTags.map(sanitizeTag).filter(Boolean) as string[]

  // Use transaction for atomic updates
  const transaction = db.transaction(() => {
    // Check which tags already exist
    const checkStmt = db.prepare(`SELECT name FROM tags WHERE name = ?`)
    const updateExistingStmt = db.prepare(`
      UPDATE tags
      SET usage_count = usage_count + 1,
          last_used_at = ?
      WHERE name = ?
    `)

    const updateRemovedStmt = db.prepare(`
      UPDATE tags
      SET usage_count = MAX(0, usage_count - 1)
      WHERE name = ?
    `)

    // Load used icon combinations once
    const usedCombos = loadUsedIconCombos(db)

    // Process added tags
    for (const tag of validAddedTags) {
      const existing = checkStmt.get(tag)

      if (existing) {
        // Tag exists, just increment usage
        updateExistingStmt.run(now, tag)
      } else {
        // New tag, generate icon and insert
        const icon = generateTagIcon('other', usedCombos)
        const iconFields = serializeTagIconForDB(icon)
        const id = crypto.randomUUID()

        db.prepare(`
          INSERT INTO tags (id, name, color, category, usage_count, last_used_at, is_default, created_at,
                           icon_foreground_color, icon_background_color, icon_shape, icon_texture, icon_background_shape)
          VALUES (?, ?, ?, 'Other', 1, ?, 0, ?, ?, ?, ?, ?, ?)
        `).run(
          id, tag, null, now, now,
          iconFields.icon_foreground_color,
          iconFields.icon_background_color,
          iconFields.icon_shape,
          iconFields.icon_texture,
          iconFields.icon_background_shape
        )
      }
    }

    // Decrement for removed tags
    for (const tag of validRemovedTags) {
      updateRemovedStmt.run(tag)
    }
  })

  transaction()
}

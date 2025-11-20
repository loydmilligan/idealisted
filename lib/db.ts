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
  // Check if we need to migrate by dropping and recreating tables with new schema
  try {
    // Test if the new schema exists by trying to insert test records
    db.prepare(`INSERT INTO items (id, type, text, parsed, entity_type, created_at, updated_at) VALUES ('test', 'idea', 'test', 0, NULL, 1, 1)`).run()
    db.prepare(`INSERT INTO notes (id, item_id, subtype, content, frontmatter) VALUES ('test-note', 'test', 'general', 'test', '{}')`).run()
    db.prepare(`DELETE FROM notes WHERE id = 'test-note'`).run()
    db.prepare(`DELETE FROM items WHERE id = 'test'`).run()
  } catch (e) {
    // If it fails, we need to migrate - drop and recreate tables
    console.log('Database schema outdated, migrating...')

    // Drop existing tables
    db.exec(`DROP TABLE IF EXISTS list_items`)
    db.exec(`DROP TABLE IF EXISTS lists`)
    db.exec(`DROP TABLE IF EXISTS projects`)
    db.exec(`DROP TABLE IF EXISTS notes`)
    db.exec(`DROP TABLE IF EXISTS todos`)
    db.exec(`DROP TABLE IF EXISTS tasks`)
    db.exec(`DROP TABLE IF EXISTS plans`)
    db.exec(`DROP TABLE IF EXISTS ai_suggestions`)
    db.exec(`DROP TABLE IF EXISTS settings`)
    db.exec(`DROP TABLE IF EXISTS items`)

    console.log('Old tables dropped, recreating with new schema...')
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
      content TEXT,
      url TEXT,
      media_type TEXT,
      frontmatter TEXT, -- JSON string of YAML frontmatter
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

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
      todoIds TEXT, -- JSON array of todo IDs
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
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
    // Prepare statements outside loop for better performance
    const insertStmt = db.prepare(`
      INSERT INTO tags (id, name, color, category, usage_count, last_used_at, is_default, created_at)
      VALUES (?, ?, '#999999', 'Other', 1, ?, 0, ?)
      ON CONFLICT(name) DO UPDATE SET
        usage_count = usage_count + 1,
        last_used_at = ?
    `)

    const updateStmt = db.prepare(`
      UPDATE tags
      SET usage_count = MAX(0, usage_count - 1)
      WHERE name = ?
    `)

    // Increment for added tags
    for (const tag of validAddedTags) {
      const id = crypto.randomUUID()
      insertStmt.run(id, tag, now, now, now)
    }

    // Decrement for removed tags
    for (const tag of validRemovedTags) {
      updateStmt.run(tag)
    }
  })

  transaction()
}

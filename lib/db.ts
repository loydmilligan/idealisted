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
    db.exec(`DROP TABLE IF EXISTS plan_tasks`)
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
      tags TEXT, -- JSON array of tags
      description TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

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
      tags TEXT, -- JSON array of tags
      deadline INTEGER,
      description TEXT,
      progress INTEGER DEFAULT 0,
      start_date INTEGER,
      end_date INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  // Plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
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

  // Plan-Task junction table for many-to-many relationship
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

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_archived ON items(archived);
    CREATE INDEX IF NOT EXISTS idx_todos_item_id ON todos(item_id);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_item_id ON tasks(item_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_plans_date ON plans(date);
    CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_id ON plan_tasks(plan_id);
    CREATE INDEX IF NOT EXISTS idx_plan_tasks_task_id ON plan_tasks(task_id);
  `)

  console.log('Database initialized successfully')
}

// Initialize the database
initializeDatabase()

export default db

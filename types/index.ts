export interface Item {
  id: string
  type: 'idea' | 'note' | 'task' | 'project' | 'list'
  text: string
  created_at: number
  updated_at?: number
  archived?: boolean
  tags?: string[]
  markdown_content?: string | null  // Markdown content for new system
  template_id?: string | null        // Reference to template
  // Parse + Convert workflow fields
  parsed?: boolean  // Stage 2: Has been categorized
  entity_type?: 'task' | 'note' | 'list' | 'project'  // Suggested type after parsing
  ai_suggestion?: AISuggestion  // Stored AI suggestion for later conversion
  note?: {
    type?: 'general' | 'meeting' | 'research' | 'reference' | 'personal'
    title?: string
    description?: string
    attachment?: string
    tags?: string[]
    category?: string
  }
  task?: {
    status: 'pending' | 'in-progress' | 'completed'
    priority: number
    tags?: string[]
    estimated_time?: number
    project_id?: string
    due_date?: number
  }
  project?: {
    status: 'planning' | 'active' | 'completed'
    tags?: string[]
    deadline?: number
    description?: string
  }
  list?: {
    name: string
    tags?: string[]
    description?: string
  }
}

export interface Tag {
  id: string
  name: string
  color: string
  category: string
  created_at: number
  usage_count?: number      // Added in Task 1.1
  is_default?: number       // Added in Task 1.1 (0 or 1)
  last_used_at?: number     // Added in Task 1.1
}

export interface Template {
  id: string
  name: string
  entity_type: 'task' | 'note' | 'project' | 'list'
  subtype: string | null
  markdown_template: string
  field_config: string // JSON string in DB, parsed to FieldConfig
  is_system: number // SQLite boolean (0 or 1)
  created_at: number
  updated_at: number
}

export interface FieldDef {
  type: 'text' | 'date' | 'select' | 'url' | 'checkbox'
  options?: string[] // For select fields
  required: boolean
  validation?: string // e.g., 'youtube' for URL fields
  readonly?: boolean // For AI-generated fields
}

export interface SectionDef {
  type: 'textarea' | 'bulletlist' | 'checklist' | 'timestamplist' | 'taglist'
  required: boolean
  readonly?: boolean
}

export interface FieldConfig {
  fields?: Record<string, FieldDef>
  sections?: Record<string, SectionDef>
}

export interface ParsedEntity {
  title: string
  fields: Record<string, string> // Extracted field values
  sections: Record<string, string> // Extracted section content
  raw: string // Original markdown for debugging/reference
}

export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  suggested_template?: string  // e.g., 'note-youtube', 'note-generic'
  confidence: number
  processed_text: string
  tags: string[]
  additional_fields: {
    priority?: number
    due_date?: string
    category?: string
    estimated_time?: number
    deadline?: string
    status?: string
    list_name?: string
    list_items?: string[]
    markdown_sections?: Record<string, string>  // Pre-filled sections
  }
  reasoning: string
}

export interface Todo {
  id: string
  item_id: string
  done: boolean
  due_date?: number
  priority: number
  recurring_rule?: RecurringRule
  completed_at?: number
}

export interface Task {
  id: string
  item_id: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: number
  tags?: string[]
  estimated_time?: number
  project_id?: string
  due_date?: number
  reminder_datetime?: number    // Added in Task 1.3
  last_notified_at?: number     // Added in Task 1.3
}

export interface Note {
  id: string
  item_id: string
  subtype: 'general' | 'research' | 'video' | 'link' | 'file' | 'contact' | 'meeting'
  content?: string
  url?: string
  media_type?: string
  frontmatter?: string // YAML frontmatter as JSON string
}

export interface List {
  id: string
  item_id: string
  name: string
  tags?: string[]
  description?: string
}

export interface ListItem {
  id: string
  list_id: string
  text: string
  done: boolean
  position: number
  created_at: number
}

export interface Project {
  id: string
  item_id: string
  status: 'planning' | 'active' | 'completed'
  tags?: string[]
  deadline?: number
  description?: string
  progress: number
  start_date?: number
  end_date?: number
}

export interface Plan {
  id: string
  date: string // YYYY-MM-DD
  todoIds: string[] // JSON array in database
  created_at: number
  updated_at: number
}

export interface Setting {
  key: string
  value: string
  updated_at: number
}

export interface RecurringRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
  dayOfMonth?: number
  endDate?: number
}

export interface AIConfig {
  enabled: boolean
  openrouterApiKey: string
  freeModel: string
  paidModel: string
  usePaidModel: boolean
  systemPrompt: string
  temperature: number
  maxTokens: number
}

export interface AIFeatureSetting {
  feature_name: string
  enabled: number          // SQLite boolean (0 or 1)
  description: string
}

export interface NtfyConfig {
  enabled: boolean
  server: string
  topic: string
  username?: string
  password?: string
  priority: 'default' | 'low' | 'high' | 'urgent'
}

export interface AppearanceConfig {
  theme: 'classic-green' | 'dark-mode' | 'high-contrast'
  showTimestamps: boolean
  showEntityBadges: boolean
  animationsEnabled: boolean
}

export interface ReminderConfig {
  enabled: boolean
  quietHours: {
    enabled: boolean
    start: string  // HH:mm format (e.g., "22:00")
    end: string    // HH:mm format (e.g., "08:00")
  }
  defaultTiming: 'morning_of' | '1_hour_before' | '1_day_before' | 'custom'
  customMinutesBefore?: number  // Only used if defaultTiming is 'custom'
  priorityFilter: number[]  // Array of priority levels that trigger reminders (1-5)
}

export interface DailySummaryConfig {
  enabled: boolean
  times: string[]  // Array of HH:mm time strings (e.g., ['09:00', '12:00', '18:00'])
  includeMetrics: {
    ideasCaptured: boolean
    ideasConverted: boolean
    tasksCompleted: boolean
    tasksDueToday: boolean
    tasksDueSoon: boolean
  }
}

// Combined types for API responses
export interface ItemWithRelations extends Item {
  todo?: Todo
  task?: Task
  note?: Note & {
    type?: 'general' | 'meeting' | 'research' | 'reference' | 'personal'
    title?: string
    description?: string
    attachment?: string
    tags?: string[]
    category?: string
  }
  list?: List & { items: ListItem[] }
  project?: Project
  metadata?: Record<string, any>
}

export interface PlanWithTodos extends Plan {
  todos: (Todo & { item: Item })[]
}

// API request/response types
export interface CreateItemRequest {
  type: Item['type']
  text: string
  metadata?: Record<string, any>
  tags?: string[]
  note?: Omit<Note, 'id' | 'item_id'>
  task?: Omit<Task, 'id' | 'item_id'>
  todo?: Omit<Todo, 'id' | 'item_id'> // For backward compatibility
  list?: Omit<List, 'id' | 'item_id'> & { items?: Omit<ListItem, 'id' | 'list_id' | 'created_at'>[] }
  project?: Omit<Project, 'id' | 'item_id'>
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string
  archived?: boolean
  parsed?: boolean
  entity_type?: 'task' | 'note' | 'list' | 'project'
  todo?: Omit<Todo, 'id' | 'item_id'>
}

export interface AIRequest {
  type: 'suggest' | 'parse' | 'convert' | 'tag' | 'rewrite' | 'research'
  itemId?: string
  text?: string
  context?: Record<string, any>
}

export interface AIResponse {
  suggestion: string
  confidence: number
  actions?: Array<{
    type: 'convert' | 'tag' | 'rewrite' | 'schedule'
    data: any
  }>
}

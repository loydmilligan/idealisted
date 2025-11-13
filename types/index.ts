export interface Item {
  id: string
  type: 'idea' | 'note' | 'task' | 'project' | 'list'
  text: string
  created_at: number
  updated_at?: number
  archived?: boolean
  tags?: string[]
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

export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
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
  openrouterApiKey: string
  freeModel: string
  paidModel: string
  usePaidModel: boolean
  systemPrompt: string
  temperature: number
  maxTokens: number
}

export interface NtfyConfig {
  enabled: boolean
  server: string
  topic: string
  username?: string
  password?: string
  priority: 'default' | 'low' | 'high' | 'urgent'
}

// Combined types for API responses
export interface ItemWithRelations extends Item {
  todo?: Todo
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
  todo?: Omit<Todo, 'id' | 'item_id'>
}

export interface AIRequest {
  type: 'suggest'
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

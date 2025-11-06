'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Circle, Calendar, ChevronRight, Trash2, Edit2, Save, X, ChevronDown } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { Item, CreateItemRequest, Plan, AISuggestion } from '@/types'
import { timeAgo } from '@/utils'
import { RetroDevice } from '@/components/ui/RetroDevice'
import { RetroButton } from '@/components/ui/RetroButton'
import { RetroInput, RetroTextarea } from '@/components/ui/RetroInput'
import { RetroCard } from '@/components/ui/RetroCard'
import { RetroTabs } from '@/components/ui/RetroTabs'
import { RetroIcon } from '@/components/ui/RetroIcon'
import { AISuggestionPanel } from '@/components/ui/AISuggestionPanel'
import { getStoredTheme, getThemeById, applyTheme } from '@/lib/themes'
import { noteTemplates, type NoteSubtype } from '@/lib/note-templates'
import Link from 'next/link'

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [todos, setTodos] = useState<Item[]>([])
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [activeView, setActiveView] = useState<'inbox' | 'tasks' | 'notes' | 'lists' | 'projects' | 'plans'>('inbox')
  const [captureText, setCaptureText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [inboxTab, setInboxTab] = useState<'unparsed' | 'readyToConvert'>('unparsed')
  const [notesDropdownOpen, setNotesDropdownOpen] = useState(false)

  // Load data from API
  useEffect(() => {
    loadData()
    // Initialize theme
    const storedThemeId = getStoredTheme()
    const theme = getThemeById(storedThemeId)
    if (theme) {
      applyTheme(theme)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notesDropdownOpen) {
        setNotesDropdownOpen(false)
      }
    }

    if (notesDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [notesDropdownOpen])

  // Close dropdown when changing views
  useEffect(() => {
    setNotesDropdownOpen(false)
  }, [activeView])

  const loadData = async () => {
    try {
      const [itemsResponse, tasksResponse, plansResponse] = await Promise.all([
        apiClient.getItems({ limit: 50 }),
        apiClient.getItems({ type: 'task', limit: 50 }),
        apiClient.getPlans()
      ])
      
      setItems(itemsResponse.items)
      setTodos(tasksResponse.items)
      
      // Convert plans array to object
      const plansObj: Record<string, Plan> = {}
      plansResponse.plans?.forEach((plan: Plan) => {
        plansObj[plan.date] = plan
      })
      setPlans(plansObj)
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const addIdea = async () => {
    if (!captureText.trim()) return
    try {
      const newItem: CreateItemRequest = {
        type: 'idea',
        text: captureText.trim()
      }
      const response = await apiClient.createItem(newItem)
      setItems([response.item, ...items])
      setCaptureText('')
      setAiSuggestion(null) // Clear AI suggestion after adding
    } catch (error) {
      console.error('Failed to add idea:', error)
    }
  }

  const getAiSuggestion = async () => {
    if (!captureText.trim()) return
    
    setIsAiLoading(true)
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: captureText.trim() })
      })
      
      if (response.ok) {
        const suggestion: AISuggestion = await response.json()
        setAiSuggestion(suggestion)
      } else {
        // Fallback suggestion if API fails
        const fallback: AISuggestion = {
          suggested_type: 'task',
          confidence: 0.5,
          processed_text: captureText.trim(),
          tags: ['unprocessed'],
          additional_fields: {
            priority: 1
          },
          reasoning: 'AI unavailable - using default task type'
        }
        setAiSuggestion(fallback)
      }
    } catch (error) {
      console.error('Failed to get AI suggestion:', error)
      const fallback: AISuggestion = {
        suggested_type: 'task',
        confidence: 0.5,
        processed_text: captureText.trim(),
        tags: ['unprocessed'],
        additional_fields: {
          priority: 1
        },
        reasoning: 'AI unavailable - using default task type'
      }
      setAiSuggestion(fallback)
    } finally {
      setIsAiLoading(false)
    }
  }

  const applyAiSuggestion = (type: 'note' | 'task' | 'project' | 'list') => {
    if (!aiSuggestion) return
    
    const createRequest: CreateItemRequest = {
      type,
      text: aiSuggestion.processed_text,
      ...aiSuggestion.additional_fields
    }
    
    // Add tags based on type
    if (type === 'note') {
      createRequest.note = {
        tags: aiSuggestion.tags,
        category: aiSuggestion.additional_fields.category
      }
    } else if (type === 'task') {
      createRequest.task = {
        status: 'pending',
        priority: aiSuggestion.additional_fields.priority || 1,
        tags: aiSuggestion.tags,
        estimated_time: aiSuggestion.additional_fields.estimated_time
      }
    } else if (type === 'project') {
      createRequest.project = {
        status: 'planning',
        tags: aiSuggestion.tags,
        deadline: aiSuggestion.additional_fields.deadline ? 
          new Date(aiSuggestion.additional_fields.deadline).getTime() : undefined
      }
    } else if (type === 'list') {
      createRequest.list = {
        name: aiSuggestion.additional_fields.list_name || aiSuggestion.processed_text,
        tags: aiSuggestion.tags,
        items: aiSuggestion.additional_fields.list_items?.map((item, index) => ({
          text: item,
          done: false,
          position: index
        }))
      }
    }
    
    // Create the item
    apiClient.createItem(createRequest).then(response => {
      setItems([response.item, ...items])
      setCaptureText('')
      setAiSuggestion(null)
    }).catch(error => {
      console.error('Failed to create item:', error)
    })
  }

  const toggleTask = async (id: string) => {
    try {
      const item = items.find(i => i.id === id)
      if (!item || !item.task) return
      
      const newStatus = item.task.status === 'completed' ? 'pending' : 'completed'
      await apiClient.updateItem(id, {
        task: {
          ...item.task,
          status: newStatus
        }
      })
      
      // Update local state
      setItems(items.map(i => 
        i.id === id 
          ? { ...i, task: { ...i.task!, status: newStatus } }
          : i
      ))
    } catch (error) {
      console.error('Failed to toggle task:', error)
    }
  }

  const convertToTask = async (item: Item) => {
    try {
      const updateData: CreateItemRequest = {
        type: 'task',
        text: item.text,
        task: {
          status: 'pending',
          priority: 1,
          tags: item.tags
        }
      }
      const response = await apiClient.updateItem(item.id, updateData)
      setItems(items.map(i => i.id === item.id ? response.item : i))
      setCaptureText('')
    } catch (error) {
      console.error('Failed to convert to task:', error)
    }
  }

  const convertToList = async (item: Item) => {
    try {
      const updateData: CreateItemRequest = {
        type: 'list',
        text: item.text,
        list: {
          name: item.text,
          tags: item.tags
        }
      }
      const response = await apiClient.updateItem(item.id, updateData)
      setItems(items.map(i => i.id === item.id ? response.item : i))
      setCaptureText('')
    } catch (error) {
      console.error('Failed to convert to list:', error)
    }
  }

  const convertToProject = async (item: Item) => {
    try {
      const updateData: CreateItemRequest = {
        type: 'project',
        text: item.text,
        project: {
          status: 'planning',
          tags: item.tags
        }
      }
      const response = await apiClient.updateItem(item.id, updateData)
      setItems(items.map(i => i.id === item.id ? response.item : i))
      setCaptureText('')
    } catch (error) {
      console.error('Failed to convert to project:', error)
    }
  }

  const convertToNote = async (item: Item) => {
    try {
      await apiClient.updateItem(item.id, {
        type: 'note',
        note: {
          tags: item.tags
        }
      })

      const newItems = items.map(i =>
        i.id === item.id ? { ...i, type: 'note' as const } : i
      )
      setItems(newItems)
    } catch (error) {
      console.error('Failed to convert to note:', error)
    }
  }

  const parseIdea = async (itemId: string, entityType: 'task' | 'note' | 'list' | 'project', noteSubtype?: NoteSubtype) => {
    try {
      const requestBody: any = { itemId, entityType }

      // If it's a note with a subtype, include category in the AI suggestion
      if (entityType === 'note' && noteSubtype) {
        requestBody.ai_suggestion = {
          additional_fields: {
            category: noteSubtype
          }
        }
      }

      const response = await fetch('/api/items/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const { item } = await response.json()
        setItems(items.map(i => i.id === itemId ? item : i))
        return { success: true }
      } else {
        console.error('Failed to parse idea:', await response.text())
        return { success: false }
      }
    } catch (error) {
      console.error('Failed to parse idea:', error)
      return { success: false }
    }
  }

  const convertIdea = async (itemId: string) => {
    try {
      const response = await fetch('/api/items/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      })

      if (response.ok) {
        const { item } = await response.json()
        // Remove from items list (it's now converted and should appear in other views)
        setItems(items.filter(i => i.id !== itemId))
        // Reload data to show the newly converted item in its proper place
        loadData()
      } else {
        console.error('Failed to convert idea:', await response.text())
      }
    } catch (error) {
      console.error('Failed to convert idea:', error)
    }
  }

  const toggleTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id)
      if (!todo) return
      
      await apiClient.updateItem(id, {
        todo: {
          ...todo.todo,
          done: !todo.todo?.done,
          completed_at: !todo.todo?.done ? Date.now() : undefined
        }
      })
      
      const newTodos = todos.map(t => 
        t.id === id ? { ...t, todo: { ...t.todo, done: !t.todo?.done } } : t
      )
      setTodos(newTodos)
    } catch (error) {
      console.error('Failed to toggle todo:', error)
    }
  }

  const deleteItem = async (id: string) => {
    try {
      await apiClient.deleteItem(id)
      
      const newItems = items.filter(i => i.id !== id)
      setItems(newItems)
      const newTodos = todos.filter(t => t.id !== id)
      setTodos(newTodos)
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    setEditText(item.text)
  }

  const saveEdit = async () => {
    if (!editText.trim()) return
    
    try {
      await apiClient.updateItem(editingId!, { text: editText.trim() })
      
      const newItems = items.map(i => 
        i.id === editingId ? { ...i, text: editText.trim() } : i
      )
      const newTodos = todos.map(t => 
        t.id === editingId ? { ...t, text: editText.trim() } : t
      )
      
      setItems(newItems)
      setTodos(newTodos)
      setEditingId(null)
      setEditText('')
    } catch (error) {
      console.error('Failed to save edit:', error)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const getTodayPlan = () => {
    const today = new Date().toISOString().split('T')[0]
    return plans[today] || { date: today, todoIds: [] }
  }

  const addToPlan = async (todoId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const currentPlan = getTodayPlan()
      
      // Create or update plan
      if (plans[today]) {
        await apiClient.updatePlan(today, {
          todoIds: [...currentPlan.todoIds, todoId]
        })
      } else {
        await apiClient.createPlan({
          date: today,
          todoIds: [todoId]
        })
      }
      
      const newPlans = {
        ...plans,
        [today]: {
          ...currentPlan,
          todoIds: [...currentPlan.todoIds, todoId]
        }
      }
      setPlans(newPlans)
    } catch (error) {
      console.error('Failed to add to plan:', error)
    }
  }

  const rolloverDay = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      
      // Get incomplete todos from today
      const todayPlan = getTodayPlan()
      const incompleteTodos = todayPlan.todoIds
        .map(id => todos.find(t => t.id === id))
        .filter(t => t && !t.todo?.done) as Item[]
      
      // Get todos due tomorrow
      const dueTomorrow = todos.filter(t => 
        t.todo?.due_date && 
        new Date(t.todo.due_date).toISOString().split('T')[0] === tomorrow && 
        !t.todo?.done
      )
      
      // Create tomorrow's plan
      await apiClient.createPlan({
        date: tomorrow,
        todoIds: [...incompleteTodos, ...dueTomorrow].map(t => t.id)
      })
      
      const newPlans = {
        ...plans,
        [tomorrow]: {
          date: tomorrow,
          todoIds: [...incompleteTodos, ...dueTomorrow].map(t => t.id)
        }
      }
      
      setPlans(newPlans)
      alert(`Rollover complete! ${incompleteTodos.length + dueTomorrow.length} tasks moved to tomorrow.`)
    } catch (error) {
      console.error('Failed to rollover day:', error)
    }
  }

  const timeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const todayPlan = getTodayPlan()
  const planTodos = todayPlan.todoIds.map(id => todos.find(t => t.id === id)).filter(Boolean) as Item[]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const dueTomorrow = todos.filter(t => 
    t.todo?.due_date && 
    new Date(t.todo.due_date).toISOString().split('T')[0] === tomorrow && 
    !t.todo?.done
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <RetroDevice 
        className="w-full max-w-lg"
        activeTab={activeView}
        onTabChange={(tab) => setActiveView(tab as any)}
        rightAction={
          <Link href="/settings">
            <RetroButton size="sm" variant="default" title="Settings">
              <RetroIcon type="settings" size="sm" />
            </RetroButton>
          </Link>
        }
      >
        {/* Content Area */}
        <div className="p-4">
          {/* Inbox View - Combined with Capture */}
          {activeView === 'inbox' && (
            <div className="space-y-4">
              {/* Capture Section */}
              <RetroCard inset>
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wide">
                    Quick Capture
                  </label>
                  <div className="flex gap-2">
                    <RetroInput
                      type="text"
                      value={captureText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaptureText(e.target.value)}
                      placeholder="Capture idea..."
                      className="flex-1"
                      onKeyPress={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          addIdea()
                        }
                      }}
                    />
                    <RetroButton
                      onClick={addIdea}
                      variant="primary"
                      disabled={!captureText.trim()}
                    >
                      ✓
                    </RetroButton>
                    <RetroButton
                      onClick={getAiSuggestion}
                      variant="secondary"
                      disabled={!captureText.trim() || isAiLoading}
                      size="sm"
                      title="Get AI suggestion"
                    >
                      <RetroIcon type="ai" size="sm" />
                    </RetroButton>
                  </div>

                  {/* AI Suggestion Panel */}
                  <AISuggestionPanel
                    suggestion={aiSuggestion}
                    isLoading={isAiLoading}
                    onApplySuggestion={applyAiSuggestion}
                    onDismiss={() => setAiSuggestion(null)}
                  />
                </div>
              </RetroCard>

              {/* Quick Add Buttons */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide">Quick Add</h3>
                <div className="grid grid-cols-2 gap-2">
                  <RetroButton
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!captureText.trim()) return
                      try {
                        const newItem: CreateItemRequest = {
                          type: 'idea',
                          text: captureText.trim()
                        }
                        const response = await apiClient.createItem(newItem)
                        const parseResponse = await parseIdea(response.item.id, 'task')
                        if (parseResponse.success) {
                          loadData()
                        }
                        setCaptureText('')
                        setAiSuggestion(null)
                      } catch (error) {
                        console.error('Failed to quick add task:', error)
                      }
                    }}
                    className="text-xs"
                    title="Quick add task"
                    disabled={!captureText.trim()}
                  >
                    <RetroIcon type="task" size="sm" />
                    Task
                  </RetroButton>
                  <RetroButton
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!captureText.trim()) return
                      try {
                        const newItem: CreateItemRequest = {
                          type: 'idea',
                          text: captureText.trim()
                        }
                        const response = await apiClient.createItem(newItem)
                        const parseResponse = await parseIdea(response.item.id, 'project')
                        if (parseResponse.success) {
                          loadData()
                        }
                        setCaptureText('')
                        setAiSuggestion(null)
                      } catch (error) {
                        console.error('Failed to quick add project:', error)
                      }
                    }}
                    className="text-xs"
                    title="Quick add project"
                    disabled={!captureText.trim()}
                  >
                    <RetroIcon type="project" size="sm" />
                    Project
                  </RetroButton>
                  <RetroButton
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!captureText.trim()) return
                      try {
                        const newItem: CreateItemRequest = {
                          type: 'idea',
                          text: captureText.trim()
                        }
                        const response = await apiClient.createItem(newItem)
                        const parseResponse = await parseIdea(response.item.id, 'list')
                        if (parseResponse.success) {
                          loadData()
                        }
                        setCaptureText('')
                        setAiSuggestion(null)
                      } catch (error) {
                        console.error('Failed to quick add list:', error)
                      }
                    }}
                    className="text-xs"
                    title="Quick add list"
                    disabled={!captureText.trim()}
                  >
                    <RetroIcon type="list" size="sm" />
                    List
                  </RetroButton>

                  {/* Notes Dropdown Button */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <RetroButton
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setNotesDropdownOpen(!notesDropdownOpen)
                      }}
                      className="text-xs w-full"
                      title="Quick add note"
                      disabled={!captureText.trim()}
                    >
                      <RetroIcon type="note" size="sm" />
                      Notes
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </RetroButton>

                    {notesDropdownOpen && captureText.trim() && (
                      <div
                        className="absolute z-10 mt-1 w-48 bg-[var(--retro-background)] border-2 border-[var(--retro-primary)] rounded shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.values(noteTemplates).map((template) => (
                          <button
                            key={template.subtype}
                            onClick={async () => {
                              try {
                                const newItem: CreateItemRequest = {
                                  type: 'idea',
                                  text: captureText.trim()
                                }
                                const response = await apiClient.createItem(newItem)
                                const parseResponse = await parseIdea(response.item.id, 'note', template.subtype)
                                if (parseResponse.success) {
                                  loadData()
                                }
                                setCaptureText('')
                                setAiSuggestion(null)
                                setNotesDropdownOpen(false)
                              } catch (error) {
                                console.error('Failed to quick add note:', error)
                              }
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--retro-primary)] hover:bg-opacity-20 flex items-center gap-2 border-b border-[var(--retro-primary)] border-opacity-20 last:border-b-0"
                          >
                            <span>{template.emoji}</span>
                            <span>{template.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const allIdeas = items.filter(i => i.type === 'idea')
                const unparsedIdeas = allIdeas.filter(i => !i.parsed)
                const readyToConvertIdeas = allIdeas.filter(i => i.parsed)

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wide">Inbox</h3>
                      <div className="flex gap-2">
                        <RetroButton
                          onClick={() => {
                            const ideas = items.filter(i => i.type === 'idea')
                            ideas.forEach(item => deleteItem(item.id))
                          }}
                          variant="danger"
                          size="sm"
                        >
                          EMPTY
                        </RetroButton>
                      </div>
                    </div>
                    <p className="text-xs opacity-70">
                      Process ideas: categorize first, then convert to actionable items
                    </p>

                    {/* Two-tab system */}
                    <div className="flex gap-2 border-b border-primary pb-2">
                      <button
                        onClick={() => setInboxTab('unparsed')}
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded ${
                          inboxTab === 'unparsed'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-opacity-20 bg-primary opacity-70 hover:opacity-100'
                        }`}
                      >
                        Unparsed ({unparsedIdeas.length})
                      </button>
                      <button
                        onClick={() => setInboxTab('readyToConvert')}
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded ${
                          inboxTab === 'readyToConvert'
                            ? 'bg-red-500 text-white'
                            : 'bg-opacity-20 bg-primary opacity-70 hover:opacity-100'
                        }`}
                      >
                        Ready to Convert ({readyToConvertIdeas.length})
                      </button>
                    </div>

                    {/* Unparsed Tab */}
                    {inboxTab === 'unparsed' && (
                      <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                        {unparsedIdeas.map(item => (
                          <RetroCard key={item.id} className="palm-list-item">
                            <div className="flex items-start justify-between w-full">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">⚡</span>
                                  <p className="text-sm font-medium">{item.text}</p>
                                </div>
                                <p className="text-[10px] opacity-70 mt-1">
                                  {timeAgo(item.created_at)}
                                  {item.tags && item.tags.length > 0 && (
                                    <span className="ml-2">
                                      {item.tags.map(tag => (
                                        <span key={tag} className="text-[8px] px-1 py-0.5 bg-opacity-20 bg-primary rounded mr-1">
                                          {tag}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <RetroButton
                                  onClick={() => parseIdea(item.id, 'task')}
                                  variant="secondary"
                                  size="sm"
                                  title="Categorize as Task"
                                >
                                  Task
                                </RetroButton>
                                <RetroButton
                                  onClick={() => parseIdea(item.id, 'note')}
                                  variant="secondary"
                                  size="sm"
                                  title="Categorize as Note"
                                >
                                  Note
                                </RetroButton>
                                <RetroButton
                                  onClick={() => parseIdea(item.id, 'list')}
                                  variant="secondary"
                                  size="sm"
                                  title="Categorize as List"
                                >
                                  List
                                </RetroButton>
                                <RetroButton
                                  onClick={() => parseIdea(item.id, 'project')}
                                  variant="secondary"
                                  size="sm"
                                  title="Categorize as Project"
                                >
                                  Project
                                </RetroButton>
                                <RetroButton
                                  onClick={() => deleteItem(item.id)}
                                  variant="danger"
                                  size="sm"
                                >
                                  🗑
                                </RetroButton>
                              </div>
                            </div>
                          </RetroCard>
                        ))}
                        {unparsedIdeas.length === 0 && (
                          <div className="text-center py-8 text-sm opacity-70">
                            No unparsed ideas. Great job keeping up!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ready to Convert Tab */}
                    {inboxTab === 'readyToConvert' && (
                      <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                        {readyToConvertIdeas.map(item => {
                          const typeEmoji = {
                            'task': '⚡',
                            'note': '📝',
                            'list': '📋',
                            'project': '🚀'
                          }[item.entity_type || 'task']

                          return (
                            <RetroCard key={item.id} className="palm-list-item">
                              <div className="flex items-start justify-between w-full">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{typeEmoji}</span>
                                    <div>
                                      <p className="text-sm font-medium">{item.text}</p>
                                      <p className="text-[10px] opacity-70">
                                        Type: {item.entity_type || 'unknown'}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-[10px] opacity-70 mt-1">
                                    {timeAgo(item.created_at)}
                                    {item.tags && item.tags.length > 0 && (
                                      <span className="ml-2">
                                        {item.tags.map(tag => (
                                          <span key={tag} className="text-[8px] px-1 py-0.5 bg-opacity-20 bg-primary rounded mr-1">
                                            {tag}
                                          </span>
                                        ))}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <RetroButton
                                    onClick={() => convertIdea(item.id)}
                                    variant="primary"
                                    size="sm"
                                    title="Convert to full entity"
                                  >
                                    Convert
                                  </RetroButton>
                                  <RetroButton
                                    onClick={() => deleteItem(item.id)}
                                    variant="danger"
                                    size="sm"
                                  >
                                    🗑
                                  </RetroButton>
                                </div>
                              </div>
                            </RetroCard>
                          )
                        })}
                        {readyToConvertIdeas.length === 0 && (
                          <div className="text-center py-8 text-sm opacity-70">
                            No ideas ready to convert. Categorize some ideas first!
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Tasks View */}
          {activeView === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">All Tasks</h3>
                <RetroButton
                  onClick={() => {
                    const tasks = items.filter(i => i.type === 'task')
                    tasks.forEach(task => deleteItem(task.id))
                  }}
                  variant="danger"
                  size="sm"
                >
                  CLEAR ALL
                </RetroButton>
              </div>
              <p className="text-xs opacity-70">
                Manage all your tasks (todos are now tasks)
              </p>
              
              <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                {items.filter(i => i.type === 'task').map(task => (
                  <RetroCard key={task.id} className="palm-list-item">
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="checkbox"
                        checked={task.task?.status === 'completed'}
                        onChange={() => toggleTask(task.id)}
                        className="palm-checkbox"
                      />
                      <div className="flex-1">
                        <p className={`text-sm ${task.task?.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                          {task.text}
                        </p>
                        <p className="text-[10px] opacity-70 mt-1">
                          Status: {task.task?.status || 'pending'}
                          {task.task?.priority && ` • Priority: ${task.task.priority}`}
                          {task.task?.estimated_time && ` • Est: ${task.task.estimated_time}h`}
                          {task.task?.project_id && ` • Project ID: ${task.task.project_id}`}
                        </p>
                      </div>
                      <RetroButton
                        onClick={() => deleteItem(task.id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑
                      </RetroButton>
                    </div>
                  </RetroCard>
                ))}
                {items.filter(i => i.type === 'task').length === 0 && (
                  <div className="text-center py-8 text-sm opacity-70">
                    No tasks yet. Capture some ideas and convert them!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes View */}
          {activeView === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">All Notes</h3>
                <RetroButton
                  onClick={() => {
                    const notes = items.filter(i => i.type === 'note')
                    notes.forEach(item => deleteItem(item.id))
                  }}
                  variant="danger"
                  size="sm"
                >
                  CLEAR ALL
                </RetroButton>
              </div>
              <p className="text-xs opacity-70">
                Browse and manage all your notes
              </p>
              
              <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                {items.filter(i => i.type === 'note').map(item => (
                  <RetroCard key={item.id} className="palm-list-item">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {item.note?.title || item.text}
                        </p>
                        {item.note?.description && (
                          <p className="text-xs opacity-80 mt-1 italic">
                            {item.note.description}
                          </p>
                        )}
                        <p className="text-[10px] opacity-70 mt-2">
                          {timeAgo(item.created_at)}
                          {item.note?.type && ` • Type: ${item.note.type}`}
                          {item.note?.category && ` • Category: ${item.note.category}`}
                          {item.note?.attachment && ` • 📎 Attachment`}
                        </p>
                        {(item.tags || item.note?.tags) && (
                          <div className="flex gap-1 mt-1">
                            {(item.tags || []).concat(item.note?.tags || []).map(tag => (
                              <span key={tag} className="text-[8px] px-1 py-0.5 bg-opacity-20 bg-primary rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <RetroButton
                        onClick={() => deleteItem(item.id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑
                      </RetroButton>
                    </div>
                  </RetroCard>
                ))}
                {items.filter(i => i.type === 'note').length === 0 && (
                  <div className="text-center py-8 text-sm opacity-70">
                    No notes yet. Capture some ideas and convert them!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lists View */}
          {activeView === 'lists' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">All Lists</h3>
                <RetroButton
                  onClick={() => {
                    const lists = items.filter(i => i.type === 'list')
                    lists.forEach(list => deleteItem(list.id))
                  }}
                  variant="danger"
                  size="sm"
                >
                  CLEAR ALL
                </RetroButton>
              </div>
              <p className="text-xs opacity-70">
                Manage your shopping lists, checklists, and more
              </p>
              
              <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                {items.filter(i => i.type === 'list').map(list => (
                  <RetroCard key={list.id} className="palm-list-item">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          📋 {list.list?.name || list.text}
                        </p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {timeAgo(list.created_at)}
                          {list.list?.tags && list.list.tags.length > 0 && (
                            <span className="ml-2">
                              {list.list.tags.map(tag => (
                                <span key={tag} className="text-[8px] px-1 py-0.5 bg-opacity-20 bg-primary rounded mr-1">
                                  {tag}
                                </span>
                              ))}
                            </span>
                          )}
                        </p>
                      </div>
                      <RetroButton
                        onClick={() => deleteItem(list.id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑
                      </RetroButton>
                    </div>
                  </RetroCard>
                ))}
                {items.filter(i => i.type === 'list').length === 0 && (
                  <div className="text-center py-8 text-sm opacity-70">
                    No lists yet. Try capturing ideas with "list" or comma-separated items!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tasks View */}
          {activeView === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">All Tasks</h3>
                <RetroButton
                  onClick={() => {
                    const tasks = items.filter(i => i.type === 'task')
                    tasks.forEach(item => deleteItem(item.id))
                  }}
                  variant="danger"
                  size="sm"
                >
                  CLEAR ALL
                </RetroButton>
              </div>
              <p className="text-xs opacity-70">
                Track and manage all your tasks
              </p>
              
              <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                {items.filter(i => i.type === 'task').map(item => (
                  <RetroCard key={item.id} className="palm-list-item">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.text}</p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {timeAgo(item.created_at)}
                          {item.task?.status && ` • Status: ${item.task.status}`}
                          {item.task?.priority && ` • Priority: ${item.task.priority}`}
                          {item.task?.estimated_time && ` • Est: ${item.task.estimated_time}`}
                        </p>
                        {item.task?.tags && item.task.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.task.tags.map(tag => (
                              <span key={tag} className="text-[8px] px-1 py-0.5 bg-opacity-20 bg-primary rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <RetroButton
                        onClick={() => deleteItem(item.id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑
                      </RetroButton>
                    </div>
                  </RetroCard>
                ))}
                {items.filter(i => i.type === 'task').length === 0 && (
                  <div className="text-center py-8 text-sm opacity-70">
                    No tasks yet. Capture some ideas and convert them!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Projects View */}
          {activeView === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">All Projects</h3>
                <RetroButton
                  onClick={() => {
                    const projects = items.filter(i => i.type === 'project')
                    projects.forEach(item => deleteItem(item.id))
                  }}
                  variant="danger"
                  size="sm"
                >
                  CLEAR ALL
                </RetroButton>
              </div>
              <p className="text-xs opacity-70">
                Overview of all your projects
              </p>
              
              <div className="space-y-2 max-h-80 overflow-y-auto palm-scrollbar">
                {items.filter(i => i.type === 'project').map(item => (
                  <RetroCard key={item.id} className="palm-list-item">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.text}</p>
                        <p className="text-[10px] opacity-70 mt-1">
                          {timeAgo(item.created_at)}
                          {item.project?.status && ` • Status: ${item.project.status}`}
                          {item.project?.deadline && ` • Deadline: ${new Date(item.project.deadline).toLocaleDateString()}`}
                        </p>
                        {item.project?.tags && item.project.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.project.tags.map(tag => (
                              <span key={tag} className="text-[8px] px-1 py-0.5 bg-opacity-20 bg-primary rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <RetroButton
                        onClick={() => deleteItem(item.id)}
                        variant="danger"
                        size="sm"
                      >
                        🗑
                      </RetroButton>
                    </div>
                  </RetroCard>
                ))}
                {items.filter(i => i.type === 'project').length === 0 && (
                  <div className="text-center py-8 text-sm opacity-70">
                    No projects yet. Capture some ideas and convert them!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans View */}
          {activeView === 'plans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">Today's Plan</h3>
                <RetroButton
                  onClick={() => {
                    const todayTodos = todos.filter(t => 
                      t.todo?.due_date && 
                      new Date(t.todo.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                    )
                    todayTodos.forEach(todo => deleteItem(todo.id))
                  }}
                  variant="danger"
                  size="sm"
                >
                  CLEAR
                </RetroButton>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide">TODAY</span>
                  <span className="text-xs opacity-70">
                    {todos.filter(t => 
                      t.todo?.due_date && 
                      new Date(t.todo.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                    ).length} items
                  </span>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto palm-scrollbar">
                  {todos.filter(t => 
                    t.todo?.due_date && 
                    new Date(t.todo.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                  ).map(todo => (
                    <RetroCard key={todo.id} className="palm-list-item">
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="checkbox"
                          checked={todo.todo?.done || false}
                          onChange={() => toggleTodo(todo.id)}
                          className="palm-checkbox"
                        />
                        <span className={`text-sm flex-1 ${todo.todo?.done ? 'line-through opacity-50' : ''}`}>
                          {todo.text}
                        </span>
                        <RetroButton
                          onClick={() => deleteItem(todo.id)}
                          variant="danger"
                          size="sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </RetroButton>
                      </div>
                    </RetroCard>
                  ))}
                  {todos.filter(t => 
                    t.todo?.due_date && 
                    new Date(t.todo.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                  ).length === 0 && (
                    <div className="text-center py-8 text-sm opacity-70">
                      No todos for today. Add some from the inbox!
                    </div>
                  )}
                </div>
              </div>

              {dueTomorrow.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">DUE TOMORROW</span>
                    <span className="text-xs opacity-70">
                      {dueTomorrow.length} items
                    </span>
                  </div>
                  
                  <details className="space-y-2">
                    <summary className="text-xs cursor-pointer opacity-70 hover:opacity-100">
                      View tomorrow's items
                    </summary>
                    <div className="space-y-2 max-h-32 overflow-y-auto palm-scrollbar">
                      {dueTomorrow.map(todo => (
                        <RetroCard key={todo.id} className="palm-list-item">
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="checkbox"
                              checked={todo.todo?.done || false}
                              onChange={() => toggleTodo(todo.id)}
                              className="palm-checkbox"
                            />
                            <span className={`text-sm flex-1 ${todo.todo?.done ? 'line-through opacity-50' : ''}`}>
                              {todo.text}
                            </span>
                            <RetroButton
                              onClick={() => deleteItem(todo.id)}
                              variant="danger"
                              size="sm"
                            >
                              <Trash2 className="w-3 h-3" />
                            </RetroButton>
                          </div>
                        </RetroCard>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Plans View */}
          {activeView === 'plans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide">Today's Plan</h3>
                <RetroButton
                  onClick={() => {
                    const todayTasks = items.filter(i => 
                      i.type === 'task' && 
                      i.task?.due_date && 
                      new Date(i.task.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                    )
                    todayTasks.forEach(task => toggleTask(task.id))
                  }}
                  variant="secondary"
                  size="sm"
                >
                  COMPLETE ALL
                </RetroButton>
              </div>
              <p className="text-xs opacity-70">
                Today's tasks and related items
              </p>
              
              <div className="space-y-4">
                {/* Today's Tasks */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">TASKS</span>
                    <span className="text-xs opacity-70">
                      {items.filter(i => 
                        i.type === 'task' && 
                        i.task?.due_date && 
                        new Date(i.task.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                      ).length} items
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto palm-scrollbar">
                    {items.filter(i => 
                      i.type === 'task' && 
                      i.task?.due_date && 
                      new Date(i.task.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                    ).map(task => (
                      <RetroCard key={task.id} className="palm-list-item">
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="checkbox"
                            checked={task.task?.status === 'completed'}
                            onChange={() => toggleTask(task.id)}
                            className="palm-checkbox"
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${task.task?.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                              {task.text}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">
                              Priority: {task.task?.priority || 1}
                              {task.task?.estimated_time && ` • Est: ${task.task.estimated_time}h`}
                            </p>
                          </div>
                        </div>
                      </RetroCard>
                    ))}
                    {items.filter(i => 
                      i.type === 'task' && 
                      i.task?.due_date && 
                      new Date(i.task.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                    ).length === 0 && (
                      <div className="text-center py-4 text-sm opacity-70">
                        No tasks due today
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">RELATED NOTES</span>
                    <span className="text-xs opacity-70">
                      {items.filter(i => i.type === 'note').length} items
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto palm-scrollbar">
                    {items.filter(i => i.type === 'note').slice(0, 3).map(note => (
                      <RetroCard key={note.id} className="palm-list-item">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {note.note?.title || note.text}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {note.note?.type && `Type: ${note.note.type}`}
                              {note.note?.category && ` • Category: ${note.note.category}`}
                            </p>
                          </div>
                        </div>
                      </RetroCard>
                    ))}
                    {items.filter(i => i.type === 'note').length === 0 && (
                      <div className="text-center py-4 text-sm opacity-70">
                        No notes available
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Lists */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">RELATED LISTS</span>
                    <span className="text-xs opacity-70">
                      {items.filter(i => i.type === 'list').length} items
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto palm-scrollbar">
                    {items.filter(i => i.type === 'list').slice(0, 2).map(list => (
                      <RetroCard key={list.id} className="palm-list-item">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              📋 {list.list?.name || list.text}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {list.list?.description && `Description: ${list.list.description}`}
                            </p>
                          </div>
                        </div>
                      </RetroCard>
                    ))}
                    {items.filter(i => i.type === 'list').length === 0 && (
                      <div className="text-center py-4 text-sm opacity-70">
                        No lists available
                      </div>
                    )}
                  </div>
                </div>

                {/* Related Projects */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide">RELATED PROJECTS</span>
                    <span className="text-xs opacity-70">
                      {items.filter(i => i.type === 'project').length} items
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto palm-scrollbar">
                    {items.filter(i => i.type === 'project').slice(0, 2).map(project => (
                      <RetroCard key={project.id} className="palm-list-item">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              🚀 {project.text}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">
                              Status: {project.project?.status || 'planning'}
                              {project.project?.deadline && ` • Deadline: ${new Date(project.project.deadline).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                      </RetroCard>
                    ))}
                    {items.filter(i => i.type === 'project').length === 0 && (
                      <div className="text-center py-4 text-sm opacity-70">
                        No projects available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </RetroDevice>
    </div>
  )
}

/**
 * Main Application Page - Palm Pilot Modern UI
 *
 * 4-Tab Mobile-First Architecture:
 * - Capture: Quick idea input
 * - Unsorted: Uncategorized ideas
 * - Ready: Sorted ideas ready to convert
 * - Files: All converted entities with filters
 */

'use client'

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GlobalHeader } from '@/components/modern/GlobalHeader'
import { BottomTabNav, TabId, TabNavHandle } from '@/components/modern/BottomTabNav'
import { CaptureScreen } from '@/components/modern/screens/CaptureScreen'
import { UnsortedInboxScreen } from '@/components/modern/screens/UnsortedInboxScreen'
import { ReadyInboxScreen } from '@/components/modern/screens/ReadyInboxScreen'
import { PlannerScreen } from '@/components/modern/screens/PlannerScreen'
import { EntitiesScreen } from '@/components/modern/screens/EntitiesScreen'
import { EntityModal, FormField } from '@/components/modern/EntityModal'
import { SettingsModal } from '@/components/modern/SettingsModal'
import { WelcomeModal } from '@/components/modern/WelcomeModal'
import { MarkdownViewer } from '@/components/ui/MarkdownViewer'
import { MarkdownEntityEditor, PreFillData } from '@/components/modern/MarkdownEntityEditor'
import { TemplateSelector } from '@/components/modern/TemplateSelector'
import type { Template } from '@/types'
import { TourExample } from '@/components/ui/TourExample'
import { subDays } from 'date-fns'
import { TagInput } from '@/components/modern/TagInput'
import { EntityType } from '@/lib/entity-colors'
import { ItemWithRelations, AISuggestion } from '@/types'
import { FrondNutLogo } from '@/components/ui/FrondNutLogo'
import { getEntityColor, getEntityBackgroundColor } from '@/lib/entity-colors'
// DISABLED (causes build error - server-side only): import { ntfyService } from '@/lib/notify'

// Types
interface Item extends Omit<ItemWithRelations, 'created_at' | 'type' | 'entity_type'> {
  id: string
  text: string
  type: EntityType
  parsed: boolean
  entity_type?: string | null
  created_at: string
  tags?: string[]
  archived?: boolean
}

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Tab state from URL
  const [activeTab, setActiveTab] = useState<TabId>((searchParams?.get('tab') as TabId) || 'capture')

  // Ref for triggering tab flashes
  const tabNavRef = useRef<TabNavHandle>(null)

  // Data state
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Item[]>([])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntity, setModalEntity] = useState<{ id?: string; type: Exclude<EntityType, 'idea'> } | null>(null)
  const [modalData, setModalData] = useState<Record<string, any>>({})

  // Markdown entity modal state
  const [markdownViewerOpen, setMarkdownViewerOpen] = useState(false)
  const [markdownEditorOpen, setMarkdownEditorOpen] = useState(false)
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
  const [templateSelectorEntityType, setTemplateSelectorEntityType] = useState<'task' | 'note' | 'project' | 'list' | undefined>(undefined)
  const [projectContextId, setProjectContextId] = useState<string | null>(null)
  const [currentMarkdownItem, setCurrentMarkdownItem] = useState<ItemWithRelations | null>(null)
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null) // Track item being converted from Ready tab

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Welcome modal and tour state
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  // AI suggestion state (Phase 3: Preview-First)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [capturedText, setCapturedText] = useState('')
  const [isCreatingItem, setIsCreatingItem] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [currentAIItem, setCurrentAIItem] = useState<AISuggestion | null>(null) // Track AI suggestion for override flow

  // Convert All state (Task 3.2)
  const [isConvertingAll, setIsConvertingAll] = useState(false)

  // Task 4.3: Pre-fill data state for Accept & Edit flow
  const [preFillData, setPreFillData] = useState<PreFillData | null>(null)
  const getDateKey = (value: string | number | Date): string => {
    const d = typeof value === 'string' ? new Date(value) : new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const computeStreak = (dates: string[]): number => {
    const set = new Set(dates.filter(Boolean))
    let streak = 0
    let cursor = getDateKey(Date.now())
    while (set.has(cursor)) {
      streak += 1
      const d = new Date(cursor + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 1)
      cursor = d.toISOString().slice(0, 10)
    }
    return streak
  }

  // Load items on mount
  useEffect(() => {
    fetchItems()
    loadAndApplyTheme()

    // Check first launch and show welcome modal
    if (typeof window !== 'undefined') {
      const hasSeenWelcome = localStorage.getItem('idealisted-welcome-shown')
      if (!hasSeenWelcome) {
        // Small delay so app loads first
        setTimeout(() => setWelcomeOpen(true), 500)
      }
    }
  }, [])

  // Client-side fallback check for daily reviews
  useEffect(() => {
    const checkDailyReview = async () => {
      try {
        // Load daily review settings
        const response = await fetch('/api/settings')
        const data = await response.json()
        const reviewConfig = data.settings?.review_config

        // Check if daily review is enabled
        if (!reviewConfig?.enabled) {
          return
        }

        // Get configured review time (e.g., "19:00")
        const reviewTime = reviewConfig.time
        if (!reviewTime) {
          return
        }

        // Parse review time
        const [hours, minutes] = reviewTime.split(':').map(Number)
        const now = new Date()
        const reviewDateTime = new Date()
        reviewDateTime.setHours(hours, minutes, 0, 0)

        // Check if current time is past review time today
        if (now < reviewDateTime) {
          return
        }

        // Check if review was already sent today
        const lastSent = reviewConfig.lastSent
        if (lastSent) {
          const lastSentDate = new Date(lastSent)
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)

          // If lastSent is today, skip
          if (lastSentDate >= todayStart) {
            return
          }
        }

        // Review time has passed AND not sent today, trigger review
        console.log('Triggering missed daily review from client-side fallback')
        await fetch('/api/review', {
          method: 'POST',
        })
      } catch (error) {
        console.log('Client-side daily review check failed:', error)
      }
    }

    // Run check once on mount
    checkDailyReview()
  }, [])

  // Load and apply theme from settings
  const loadAndApplyTheme = async () => {
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()
      const theme = data.settings?.appearance_config?.theme || 'classic-green'
      document.documentElement.setAttribute('data-theme', theme)
    } catch (error) {
      console.error('Failed to load theme:', error)
      document.documentElement.setAttribute('data-theme', 'classic-green')
    }
  }

  // Update URL when tab changes and refresh data
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
    // Refresh items when switching tabs to ensure fresh data
    fetchItems()
  }

  // Fetch all items from API
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      const data = await response.json()
      // API returns { items: [...] }
      if (data.items) {
        setItems(data.items)
        // Extract projects for dropdown
        setProjects(data.items.filter((i: Item) => i.type === 'project'))
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter items by status
  const unsortedItems = items.filter(i => i.type === 'idea' && !i.parsed)
  const readyItems = items.filter(i => i.type === 'idea' && i.parsed && i.entity_type)
  const recentItems = [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Convert items to files for Files screen
  const files = items
    .filter(i => i.type !== 'idea')
    .map(i => ({
      id: i.id,
      title: i.text,
      entityType: i.type as Exclude<EntityType, 'idea'>,
      tags: Array.isArray(i.tags) ? i.tags : [],
      createdAt: i.created_at,
      metadata: {
        status: i.task?.status,
        dueDate: i.task?.due_date ? new Date(i.task.due_date).toISOString() : undefined,
        itemCount: i.list?.items?.length
      },
    }))

  // Planner state (local only)
  const todayKey = getDateKey(Date.now())
  const [plannerDate, setPlannerDate] = useState<string>(todayKey)
  const [plannerAssignments, setPlannerAssignments] = useState<Record<string, string[]>>({})
  const [plannerFilter, setPlannerFilter] = useState<'all' | 'task' | 'note' | 'list'>('all')
  const plannerSubheader = useMemo(() => {
    const label = `Planner`
    return `${label}`
  }, [])

  const plannerWeek = useMemo(() => {
    const base = new Date(plannerDate + 'T00:00:00')
    const day = base.getUTCDay()
    const start = new Date(base)
    start.setUTCDate(start.getUTCDate() - day)
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + idx)
      return getDateKey(d)
    })
  }, [plannerDate])

  const plannerCandidates = useMemo(() => {
    return items.filter(i => i.type !== 'idea' && (plannerFilter === 'all' || i.type === plannerFilter))
  }, [items, plannerFilter])

  const assignedIds = useMemo(() => {
    return new Set(Object.values(plannerAssignments).flat())
  }, [plannerAssignments])

  const plannerDrawerFilters = {
    task: ['current', 'past_due', 'all'] as const,
    note: ['all'] as const,
    list: ['all'] as const,
  }

  const [plannerDrawer, setPlannerDrawer] = useState<{ type: 'task' | 'note' | 'list' | null; filter: string }>({
    type: null,
    filter: 'current'
  })

  const filteredDrawerItems = useMemo(() => {
    if (!plannerDrawer.type) return []
    const now = new Date()
    const itemsByType = plannerCandidates.filter(i => i.type === plannerDrawer.type && !assignedIds.has(i.id))
    if (plannerDrawer.type !== 'task') return itemsByType
    return itemsByType.filter(i => {
      const due = i.metadata?.dueDate ? new Date(i.metadata.dueDate) : null
      const isCompleted = (i.metadata as any)?.status === 'completed'
      if (plannerDrawer.filter === 'past_due') {
        return !isCompleted && due && due < now
      }
      if (plannerDrawer.filter === 'current') {
        return !isCompleted && (!due || due >= now)
      }
      return true
    })
  }, [plannerDrawer, plannerCandidates, assignedIds])

  const assignmentsForDay = (dayKey: string) => plannerAssignments[dayKey] || []

  const assignToDay = (itemId: string, dayKey: string) => {
    setPlannerAssignments(prev => {
      const next = { ...prev }
      const list = new Set(next[dayKey] || [])
      list.add(itemId)
      next[dayKey] = Array.from(list)
      return next
    })
  }

  const removeFromDay = (itemId: string, dayKey: string) => {
    setPlannerAssignments(prev => {
      const next = { ...prev }
      const list = new Set(next[dayKey] || [])
      list.delete(itemId)
      next[dayKey] = Array.from(list)
      return next
    })
  }

  const goWeek = (delta: number) => {
    const base = new Date(plannerDate + 'T00:00:00')
    base.setUTCDate(base.getUTCDate() + delta * 7)
    setPlannerDate(getDateKey(base))
  }

  const toggleTaskStatus = async (itemId: string, nextStatus: 'pending' | 'completed') => {
    const ent = items.find(i => i.id === itemId)
    if (!ent || !ent.task) return
    try {
      await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: ent.type,
          text: ent.text,
          tags: ent.tags || [],
          archived: ent.archived || false,
          parsed: ent.parsed || false,
          entity_type: ent.entity_type,
          task: {
            status: nextStatus,
            priority: ent.task.priority || 1,
            tags: ent.task.tags || [],
            estimated_time: ent.task.estimated_time || null,
            due_date: ent.task.due_date || null,
            project_id: ent.task.project_id || null,
            reminder_datetime: ent.task.reminder_datetime || null
          }
        }),
      })
      await fetchItems()
    } catch (error) {
      console.error('Failed to toggle task status', error)
    }
  }

  const journalEntry = useMemo(() => {
    const notes = items.filter(i => i.type === 'note' && ((i.metadata as any)?.subtype === 'journal' || (i.note?.subtype as string) === 'journal'))
    if (!notes.length) return null
    const todayKey = getDateKey(Date.now())
    const today = notes.find(n => getDateKey(n.created_at) === todayKey)
    const dates = notes.map(n => getDateKey(n.created_at)).filter(Boolean)
    const streak = computeStreak(dates)
    if (!today) return null
    return {
      text: today.note?.content || today.text,
      date: todayKey,
      streak
    }
  }, [items])

  const mediaEntry = useMemo(() => {
    const notes = items.filter(i => i.type === 'note' && ((i.metadata as any)?.subtype === 'media' || (i.note?.subtype as string) === 'media'))
    if (!notes.length) return null
    const todayKey = getDateKey(Date.now())
    const today = notes.find(n => getDateKey(n.created_at) === todayKey)
    const dates = notes.map(n => getDateKey(n.created_at)).filter(Boolean)
    const streak = computeStreak(dates)
    if (!today) return null
    const rawType = (today.note?.media_type || 'image').toString()
    const normalizedType = (rawType.charAt(0).toUpperCase() + rawType.slice(1)) as 'Image' | 'Audio' | 'Video'
    return {
      url: today.note?.url || '',
      type: normalizedType,
      caption: today.note?.content || today.text,
      date: todayKey,
      streak
    }
  }, [items])

  // Recap is now fetched directly in CaptureScreen component via API

  // Badge counts
  const unsortedCount = unsortedItems.length
  const readyCount = readyItems.length

  // ===== Capture Handlers =====
  const handleCapture = async (text: string, entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => {
    // Quick sort buttons should create minimal entities (type='idea', parsed=true, entity_type=entityType)
    // They should NOT open modals or create full entities
    try {
      const metadata = entityType && subtype ? { subtype } : undefined

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: 'idea', // Always create as idea, even when entityType is specified
          parsed: !!entityType, // Mark as categorized if entity type provided
          entity_type: entityType, // Remember what it will become
          metadata,
        }),
      })

      if (response.ok) {
        await fetchItems()
        // Send notification after successful capture
        // ntfyService.notifyIdeaCaptured(text) // Disabled - server-side only

        // Flash Ready when quick-sorted
        if (entityType) {
          tabNavRef.current?.triggerFlash('ready', entityType)
        }
      }
    } catch (error) {
      console.error('Failed to capture item:', error)
    }
  }

  // Phase 3: Preview-First AI Capture
  const handleAICapture = async (text: string) => {
    // Validate input
    if (!text || text.trim().length === 0) {
      console.warn('[AI Capture] Empty text provided, ignoring')
      return
    }

    try {
      // Store text for later creation
      setCapturedText(text)
      setIsAnalyzing(true)
      setAiSuggestion(null)

      // Call AI suggestion endpoint (no item created yet)
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('AI analysis failed')
      }

      const data = await response.json()

      // Show suggestion panel with preview
      setAiSuggestion(data)
      setCurrentAIItem(data) // Store for override flow
      setIsAnalyzing(false)
    } catch (error) {
      console.error('[AI Capture] Error getting AI suggestion:', error)
      // Set error state for UI display (instead of alert)
      setAiSuggestion({
        suggested_type: 'task',
        confidence: 0.1, // Low confidence (valid range 0.0-1.0)
        processed_text: text,
        tags: [],
        additional_fields: {},
        reasoning: 'AI analysis failed. You can manually select the type below or try again.',
      })
      setIsAnalyzing(false)
    }
  }

  // Handle user accepting AI suggestion
  const handleAcceptSuggestion = async (overrideType?: Exclude<EntityType, 'idea'>) => {
    if (!aiSuggestion) {
      console.warn('[Accept Suggestion] No suggestion to accept')
      return
    }

    if (isCreatingItem) {
      console.warn('[Accept Suggestion] Already creating item, ignoring duplicate click')
      return
    }

    setIsCreatingItem(true)

    try {
      const entityType = overrideType || aiSuggestion.suggested_type

      // Transform AI metadata to match API schema
      const transformedMetadata: any = { ...aiSuggestion.additional_fields }

      // Convert date strings to Unix timestamps (with validation)
      if (transformedMetadata.due_date && typeof transformedMetadata.due_date === 'string') {
        const timestamp = new Date(transformedMetadata.due_date).getTime()
        transformedMetadata.due_date = isNaN(timestamp) ? null : timestamp
      }
      if (transformedMetadata.deadline && typeof transformedMetadata.deadline === 'string') {
        const timestamp = new Date(transformedMetadata.deadline).getTime()
        transformedMetadata.deadline = isNaN(timestamp) ? null : timestamp
      }

      // Build entity-specific data object based on type
      let entityData: any = {
        text: aiSuggestion.processed_text || capturedText,
        type: entityType,
        tags: aiSuggestion.tags || [],
        parsed: true,
        entity_type: entityType,
      }

      // Add type-specific fields
      if (entityType === 'task') {
        // Validate priority (1-5 range)
        const priority = Math.max(1, Math.min(5, Number(transformedMetadata.priority) || 1))

        // Validate status
        const validStatuses = ['pending', 'in-progress', 'completed']
        const status = validStatuses.includes(transformedMetadata.status)
          ? transformedMetadata.status
          : 'pending'

        // Validate estimated_time (must be positive or null)
        const estimatedTime = transformedMetadata.estimated_time > 0
          ? transformedMetadata.estimated_time
          : null

        entityData.task = {
          status,
          priority,
          tags: aiSuggestion.tags || [],
          estimated_time: estimatedTime,
          due_date: transformedMetadata.due_date || null,
          project_id: null,
        }
      }

      if (entityType === 'note') {
        entityData.note = {
          subtype: transformedMetadata.category || 'general',
          content: null,
        }
        // Store category in metadata for notes
        entityData.metadata = { category: transformedMetadata.category }
      }

      if (entityType === 'project') {
        entityData.project = {
          status: transformedMetadata.status || 'planning',
          tags: aiSuggestion.tags || [],
          deadline: transformedMetadata.deadline || null,
          description: null,
          progress: 0,
        }
      }

      if (entityType === 'list') {
        entityData.list = {
          name: transformedMetadata.list_name || 'Untitled List',
          tags: aiSuggestion.tags || [],
          description: null,
          items: (transformedMetadata.list_items || []).map((text: string, index: number) => ({
            text,
            done: false,
            position: index,
          })),
        }
      }

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityData),
      })

      if (response.ok) {
        await fetchItems()

        // Tag usage is automatically tracked by /api/items POST endpoint

        // Flash appropriate tab (AI creates final entities → Files)
        tabNavRef.current?.triggerFlash('files', entityType)

        // Show success feedback
        console.log(`[Accept Suggestion] ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} created successfully`)

        // Clear error state
        setCreationError(null)

        // Clear AI state
        setAiSuggestion(null)
        setCapturedText('')
      }
    } catch (error) {
      console.error('[Accept Suggestion] Error creating item:', error)

      // Set error message for in-UI display
      setCreationError('Failed to create item. Please try again or use manual entry.')

      // Keep suggestion panel open so user can retry
      // Don't clear aiSuggestion or capturedText
    } finally {
      setIsCreatingItem(false)
    }
  }

  // Handle user dismissing AI suggestion
  const handleDismissSuggestion = () => {
    setAiSuggestion(null)
    setCurrentAIItem(null)
    setCapturedText('')
    setIsAnalyzing(false)
  }

  // Handle Override & Edit action (Task 4.4)
  const handleOverrideAndEdit = () => {
    if (!currentAIItem) {
      console.warn('[Override & Edit] No AI suggestion available')
      return
    }

    // Store original text for editor
    setCapturedText(currentAIItem.processed_text)

    // Dismiss AI panel
    setAiSuggestion(null)

    // Open template selector
    setTemplateSelectorEntityType(undefined)
    setTemplateSelectorOpen(true)

    // Note: currentAIItem and capturedText will be used when template is selected
  }

  // Task 4.3: Build pre-fill data from AI suggestion
const buildPreFillData = (suggestion: AISuggestion, template: Template): PreFillData => {
  const fields: Record<string, string> = {}
  const sections: Record<string, any> = {}

  // Parse field_config from template
  const fieldConfig = JSON.parse(template.field_config)

  // Extract from markdown_sections if available
  if (suggestion.additional_fields.markdown_sections) {
    Object.assign(sections, suggestion.additional_fields.markdown_sections)
  }

  // Map metadata to fields based on entity type
  if (suggestion.suggested_type === 'task' && fieldConfig.fields) {
    // Map Status field
    if (fieldConfig.fields['Status'] && suggestion.additional_fields.status) {
      // Convert AI status to template format
      const statusMap: Record<string, string> = {
        'pending': 'Not Started',
        'in-progress': 'In Progress',
        'completed': 'Completed'
      }
      fields['Status'] = statusMap[suggestion.additional_fields.status] || 'Not Started'
    }

    // Map Priority field
    if (fieldConfig.fields['Priority'] && suggestion.additional_fields.priority) {
      // Convert priority number to label
      const priorityMap: Record<number, string> = {
        1: 'Low',
        2: 'Low',
        3: 'Medium',
        4: 'High',
        5: 'Urgent'
      }
      fields['Priority'] = priorityMap[suggestion.additional_fields.priority] || 'Medium'
    }

    // Map Due Date field
    if (fieldConfig.fields['Due Date'] && suggestion.additional_fields.due_date) {
      // Convert date string to YYYY-MM-DD format
      const date = new Date(suggestion.additional_fields.due_date)
      if (!isNaN(date.getTime())) {
        fields['Due Date'] = date.toISOString().split('T')[0]
      }
    }
  }

  if (suggestion.suggested_type === 'project' && fieldConfig.fields) {
    if (fieldConfig.fields['Status'] && suggestion.additional_fields.status) {
      const status = suggestion.additional_fields.status.toLowerCase()
      const statusMap: Record<string, string> = {
        'planning': 'Planning',
        'active': 'Active',
        'completed': 'Completed'
      }
      fields['Status'] = statusMap[status] || 'Planning'
    }

    if (fieldConfig.fields['Type'] && suggestion.additional_fields.category) {
      const rawType = suggestion.additional_fields.category.toLowerCase()
      const typeMap: Record<string, string> = {
        'personal': 'Personal',
        'coding': 'Coding',
        'smart-home': 'Smart Home',
        'smart home': 'Smart Home',
        'work': 'Work',
        'apartment': 'Apartment'
      }
      fields['Type'] = typeMap[rawType] || 'Personal'
    }

    if (fieldConfig.fields['Priority']) {
      const priorityRaw = (suggestion.additional_fields.priority as number | undefined) || 2
      const priorityMap: Record<number, string> = {
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'High',
        5: 'High'
      }
      fields['Priority'] = priorityMap[priorityRaw] || 'Medium'
    }

    if (fieldConfig.fields['Deadline'] && suggestion.additional_fields.deadline) {
      const date = new Date(suggestion.additional_fields.deadline)
      if (!isNaN(date.getTime())) {
        fields['Deadline'] = date.toISOString().split('T')[0]
      }
    }
  }

  if (suggestion.suggested_type === 'list' && fieldConfig.sections) {
    const listItems = suggestion.additional_fields.list_items
    if (Array.isArray(listItems) && listItems.length > 0) {
      const target = Object.entries(fieldConfig.sections).find(([, def]) =>
        ['bulletlist', 'orderedlist', 'checklist', 'shoppinglist'].includes((def as { type: string }).type)
      )
      if (target) {
        const [sectionName, def] = target
        if ((def as { type: string }).type === 'checklist') {
          sections[sectionName] = listItems.map(text => ({ text, checked: false }))
        } else {
          sections[sectionName] = listItems.map(text => text)
        }
      }
    }
  }

  // Initialize empty values for fields not provided by AI
  if (fieldConfig.fields) {
    for (const [fieldName, fieldDef] of Object.entries(fieldConfig.fields)) {
      if (!fields[fieldName]) {
        const def = fieldDef as any
        if (def.type === 'select' && def.options) {
          fields[fieldName] = def.options[0]
        } else {
          fields[fieldName] = ''
        }
      }
    }
  }

  // Initialize empty sections for those not provided
  if (fieldConfig.sections) {
    for (const [sectionName, sectionDef] of Object.entries(fieldConfig.sections)) {
      if (!sections[sectionName]) {
        const def = sectionDef as any
        switch (def.type) {
          case 'textarea':
            sections[sectionName] = ''
            break
          case 'bulletlist':
          case 'orderedlist':
          case 'timestamplist':
          case 'checklist':
          case 'taglist':
          case 'shoppinglist':
            sections[sectionName] = []
            break
          default:
            sections[sectionName] = ''
        }
      }
    }
  }

  return {
    title: suggestion.processed_text,
    fields,
    sections
  }
}

  // Task 4.3: Handle Accept & Edit action
  const handleAcceptAndEdit = async (suggestion: AISuggestion) => {
    if (!currentAIItem) {
      console.warn('[Accept & Edit] No AI suggestion available')
      return
    }

    try {
      const entityType = suggestion.suggested_type

      const templateId = getTemplateIdForEntityType(entityType, {
        subtype: suggestion.additional_fields.category || suggestion.additional_fields.list_name || null,
        listType: suggestion.additional_fields.list_type
      })

      if (!templateId) {
        console.warn('[Accept & Edit] No markdown template for type:', entityType)
        // Fall back to regular accept flow
        await handleAcceptSuggestion()
        return
      }

      // Load template
      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()

      if (!data.success || !data.data) {
        throw new Error('Failed to load template')
      }

      // Build pre-fill data from AI suggestions
      const preFill = buildPreFillData(suggestion, data.data)

      // Set up editor state
      setCurrentTemplate(data.data)
      setCurrentMarkdownItem(null) // Create mode
      setPreFillData(preFill) // Pre-filled data
      setCapturedText(suggestion.processed_text)
      setMarkdownEditorOpen(true)

      // Dismiss AI panel
      setAiSuggestion(null)

      console.log('[Accept & Edit] Opening editor with pre-filled data:', preFill)
    } catch (error) {
      console.error('[Accept & Edit] Failed:', error)
      setCreationError('Failed to open editor. Please try again.')
    }
  }

  // Handle template selection (Task 4.4)
  const handleTemplateSelected = (template: Template) => {
    setCurrentTemplate(template)
    setCurrentMarkdownItem(null) // Create mode
    setTemplateSelectorOpen(false)
    setTemplateSelectorEntityType(undefined)
    // If we were adding a note to a project, keep projectContextId set; otherwise clear
    if (template.entity_type !== 'note') {
      setProjectContextId(null)
    }
    setMarkdownEditorOpen(true)

    // capturedText and currentAIItem already set by handleOverrideAndEdit
    // The MarkdownEntityEditor will read capturedText for title pre-population
  }

  const handleTemplateSelectorCancel = () => {
    setTemplateSelectorOpen(false)
    setTemplateSelectorEntityType(undefined)
    setConvertingItemId(null)
    setProjectContextId(null)
    // Clear override flow state
    setCurrentAIItem(null)
    setCapturedText('')
  }

  // ===== Unsorted Handlers =====
  const handleSort = async (itemId: string, entityType: Exclude<EntityType, 'idea'>, subtype?: string) => {
    try {
      // Get current item
      const item = items.find(i => i.id === itemId)
      if (!item) return

      const metadata = entityType === 'note' && subtype ? { subtype } : item.metadata

      // Update with exact required fields
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          text: item.text,
          tags: item.tags || [],
          archived: item.archived || false,
          parsed: true,
          entity_type: entityType,
          metadata,
        }),
      })

      if (response.ok) {
        await fetchItems()
        // Send notification after successful sort
        // ntfyService.notifyIdeaSorted(item.text, entityType) // Disabled - server-side only

        // Flash Ready tab with entity color
        tabNavRef.current?.triggerFlash('ready', entityType)
      }
    } catch (error) {
      console.error('Failed to sort item:', error)
    }
  }

  const handleConvertFromUnsorted = async (itemId: string, entityType: Exclude<EntityType, 'idea'>) => {
    // Open modal for conversion
    const item = items.find(i => i.id === itemId)
    if (!item) return
    if (entityType === 'list') {
      setCapturedText(item.text)
      setConvertingItemId(itemId)
      setTemplateSelectorEntityType('list')
      setTemplateSelectorOpen(true)
      return
    }
    if (entityType === 'project') {
      try {
        const response = await fetch('/api/templates/project-standard')
        const data = await response.json()
        if (data.success && data.data) {
          setCapturedText(item.text)
          setCurrentTemplate(data.data)
          setCurrentMarkdownItem(null)
          setConvertingItemId(itemId)
          setMarkdownEditorOpen(true)
          return
        }
      } catch (err) {
        console.error('Failed to load project template:', err)
      }
    }

    setModalEntity({ type: entityType })
    setModalData({
      title: item.text,
      id: itemId,
      tags: item.tags || [],
      description: item.note?.content || item.project?.description || item.list?.description || ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchItems()
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleAIAction = async (itemId: string, action: string) => {
    try {
      const endpoint = action === 'sort' ? 'parse' : 'convert'
      const response = await fetch(`/api/items/${itemId}/${endpoint}`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchItems()
      }
    } catch (error) {
      console.error('Failed to AI action:', error)
    }
  }

  // ===== Ready Handlers =====
  const handleConvertFromReady = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item || !item.entity_type) return

    const entityType = item.entity_type as Exclude<EntityType, 'idea'>

    // Determine if this should use markdown editor
    let templateId: string | null = null

    if (entityType === 'task') {
      templateId = 'task'
    } else if (entityType === 'note') {
      // Check for note subtype in metadata or note object
      const subtype = item.metadata?.subtype || item.note?.subtype

      if (subtype === 'generic') {
        templateId = 'note-generic'
      } else if (subtype === 'youtube') {
        templateId = 'note-youtube'
      } else if (subtype === 'meeting') {
        templateId = 'note-meeting'
      } else if (subtype === 'research') {
        templateId = 'note-research'
      } else if (subtype === 'media') {
        templateId = 'note-media'
      }
    } else if (entityType === 'project') {
      templateId = 'project-standard'
    } else if (entityType === 'list') {
      // Open template selector filtered to lists
      setCapturedText(item.text)
      setTemplateSelectorEntityType('list')
      setTemplateSelectorOpen(true)
      setConvertingItemId(itemId)
      return
    }

    // If we have a template, open the MarkdownEntityEditor
    if (templateId) {
      try {
        const response = await fetch(`/api/templates/${templateId}`)
        const data = await response.json()

        if (data.success && data.data) {
          // Store the item text for the editor to use
          setCapturedText(item.text)
          setCurrentTemplate(data.data)
          setCurrentMarkdownItem(null) // null = create mode
          setConvertingItemId(itemId) // Track item to delete after conversion
          setMarkdownEditorOpen(true)
          return
        }
      } catch (error) {
        console.error('Failed to load template:', error)
        // Fall through to legacy modal if template loading fails
      }
    }

    // Legacy modal for projects, lists, and non-markdown notes
    setModalEntity({ type: entityType })
    setModalData({
      title: item.text,
      id: itemId,
      tags: item.tags || [],
      description: item.note?.content || item.project?.description || item.list?.description || ''
    })
    setModalOpen(true)
  }

  // Convert All Handler (Task 3.2)
  // Converts all ready items directly to entities without opening modals
  const handleConvertAll = async () => {
    if (readyItems.length === 0) {
      console.log('[Convert All] No items to convert')
      return
    }

    // Optional: Show confirmation dialog
    const confirmed = confirm(`Convert all ${readyItems.length} items to their final entity types?`)
    if (!confirmed) return

    setIsConvertingAll(true)

    let successCount = 0
    let failCount = 0
    const entityTypes: Set<Exclude<EntityType, 'idea'>> = new Set()

    try {
      // Process items sequentially to avoid race conditions
      for (const item of readyItems) {
        try {
          const entityType = item.entity_type as Exclude<EntityType, 'idea'>

          // Build entity data with sensible defaults
          const entityData: any = {
            type: entityType,
            text: item.text,
            tags: item.tags || [],
            parsed: true,
            entity_type: entityType,
          }

          // Add type-specific default fields
          if (entityType === 'task') {
            entityData.task = {
              status: 'pending',
              priority: 1,
              tags: item.tags || [],
              estimated_time: null,
              due_date: null,
              project_id: null,
            }
          } else if (entityType === 'note') {
            const subtype = item.metadata?.subtype || 'general'
            entityData.note = {
              subtype,
              content: '',
              url: null,
              media_type: null,
            }
          } else if (entityType === 'project') {
            entityData.project = {
              status: 'planning',
              tags: item.tags || [],
              deadline: null,
              description: '',
              progress: 0,
              start_date: null,
              end_date: null,
            }
          } else if (entityType === 'list') {
            entityData.list = {
              name: item.text,
              list_type: 'bulleted',
              tags: item.tags || [],
              description: '',
              items: [],
            }
          }

          // Update the item to convert it to the final entity type
          const response = await fetch(`/api/items/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entityData),
          })

          if (response.ok) {
            successCount++
            entityTypes.add(entityType)
          } else {
            throw new Error(`API returned ${response.status}`)
          }

          // Small delay between conversions for better UX
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error) {
          console.error(`[Convert All] Failed to convert item ${item.id}:`, error)
          failCount++
          // Continue with remaining items instead of stopping
        }
      }

      // Refresh the items list to update the Ready tab
      await fetchItems()

      // Log results
      console.log(`[Convert All] Completed: ${successCount} successful, ${failCount} failed`)

      // Flash the Files tab with the most common entity type
      if (successCount > 0 && entityTypes.size > 0) {
        const firstEntityType = Array.from(entityTypes)[0]
        tabNavRef.current?.triggerFlash('files', firstEntityType)
      }

    } catch (error) {
      console.error('[Convert All] Unexpected error:', error)
    } finally {
      setIsConvertingAll(false)
    }
  }

  // ===== Entity Handlers =====
  const handleEntityTap = async (entityId: string) => {
    const entity = items.find(i => i.id === entityId)
    if (!entity) return

    // Fetch full entity details including reminder data
    const response = await fetch(`/api/items/${entityId}`)
    const data = await response.json()
    const fullEntity = data.item

    // Check if this is a markdown entity
    if (fullEntity.markdown_content) {
      const inferTemplateId = () => {
        if (fullEntity.template_id) return fullEntity.template_id
        if (fullEntity.type === 'list') {
          const lt = (fullEntity.list?.list_type || 'bulleted').toLowerCase()
          if (lt === 'numbered') return 'list-numbered'
          if (lt === 'tasklist') return 'list-tasklist'
          if (lt === 'shopping') return 'list-shopping'
          return 'list-bulleted'
        }
        if (fullEntity.type === 'note') {
          const st = (fullEntity.note?.subtype || (fullEntity.metadata as any)?.subtype || 'generic').toLowerCase()
          if (st === 'youtube') return 'note-youtube'
          if (st === 'meeting') return 'note-meeting'
          if (st === 'research') return 'note-research'
          if (st === 'media') return 'note-media'
          return 'note-generic'
        }
        if (fullEntity.type === 'project') return 'project-standard'
        if (fullEntity.type === 'task') return 'task'
        return null
      }

      const templateId = inferTemplateId()
      if (templateId) {
        const templateResponse = await fetch(`/api/templates/${templateId}`)
        const templateData = await templateResponse.json()

        if (templateData.success) {
          setCurrentMarkdownItem(fullEntity)
          setCurrentTemplate(templateData.data)
          setMarkdownViewerOpen(true)
          return
        } else {
          console.error('Failed to fetch template:', templateData.error)
        }
      }
      // If we couldn't resolve a template, fall through to legacy modal
    }

    // Legacy entity - show traditional EntityModal
    // Prepare modal data
    const modalDataFields: Record<string, any> = {
      title: entity.text,
      id: entityId,
      tags: entity.tags || [],
      description: entity.note?.content || entity.project?.description || entity.list?.description || ''
    }

    // If task, populate task-specific fields including reminder
    if (entity.type === 'task' && fullEntity.task) {
      modalDataFields.status = fullEntity.task.status
      modalDataFields.priority = fullEntity.task.priority
      modalDataFields.project_id = fullEntity.task.project_id
      modalDataFields.estimatedTime = fullEntity.task.estimated_time

      // Populate due date
      if (fullEntity.task.due_date) {
        modalDataFields.dueDate = new Date(fullEntity.task.due_date).toISOString().split('T')[0]
      }

      // Populate reminder data
      if (fullEntity.task.reminder_datetime) {
        modalDataFields.reminderEnabled = true
        modalDataFields.reminder_datetime = fullEntity.task.reminder_datetime
        modalDataFields.reminderDatetime = new Date(fullEntity.task.reminder_datetime).toISOString().slice(0, 16)
        modalDataFields.reminderOption = 'custom' // Default to custom when loading existing
      }
    }

    setModalEntity({ id: entityId, type: entity.type as Exclude<EntityType, 'idea'> })
    setModalData(modalDataFields)
    setModalOpen(true)
  }

  const handleSwipeRightAction = async (entityId: string, entityType: Exclude<EntityType, 'idea'>) => {
    try {
      const entity = items.find(i => i.id === entityId)
      if (!entity) return

      // Handle task completion
      if (entityType === 'task') {
        const response = await fetch(`/api/items/${entityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: entity.type,
            text: entity.text,
            tags: entity.tags || [],
            archived: entity.archived || false,
            parsed: entity.parsed || false,
            entity_type: entity.entity_type,
            task: {
              status: 'completed',
              priority: 1,
              tags: [],
            },
          }),
        })

        if (response.ok) {
          await fetchItems()
          // Send notification after task completion
          // ntfyService.notifyTaskCompleted(entity.text) // Disabled - server-side only
        }
      }
      // TODO: Implement other entity type actions (archive note, activate project, etc.)
    } catch (error) {
      console.error('Failed to perform swipe right action:', error)
    }
  }

  // ===== Modal Handlers =====
  const handleModalSave = async (data: Record<string, any>) => {
    try {
      const itemId = modalEntity?.id || modalData.id
      if (!itemId) return

      // Get current item
      const item = items.find(i => i.id === itemId)
      if (!item) return

      // Build entity-specific data
      const entityData: any = {}

      if (modalEntity?.type === 'task') {
        entityData.task = {
          status: data.status || 'pending',
          priority: data.priority ? parseInt(data.priority) : 1,
          tags: modalData.tags || [],
          estimated_time: data.estimatedTime ? parseInt(data.estimatedTime) : null,
          due_date: data.dueDate ? new Date(data.dueDate).getTime() : null,
          project_id: data.project_id || null,
          reminder_datetime: modalData.reminder_datetime || null
        }
      } else if (modalEntity?.type === 'note') {
        entityData.note = {
          subtype: data.subtype || 'general',
          content: data.description || '',
          url: null,
          media_type: null,
        }
      } else if (modalEntity?.type === 'project') {
        entityData.project = {
          status: data.projectStatus || 'planning',
          tags: modalData.tags || [],
          deadline: data.deadline ? new Date(data.deadline).getTime() : null,
          description: data.description || '',
          progress: data.progress ? parseInt(data.progress) : 0,
          start_date: data.start_date ? new Date(data.start_date).getTime() : null,
          end_date: data.end_date ? new Date(data.end_date).getTime() : null,
        }
      } else if (modalEntity?.type === 'list') {
        entityData.list = {
          name: data.title || '',
          tags: modalData.tags || [],
          description: data.description || '',
          items: [],
        }
      }

      // Update item
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: modalEntity?.type || item.type,
          text: data.title || item.text,
          tags: modalData.tags || [],
          archived: item.archived || false,
          parsed: true,
          entity_type: modalEntity?.type,
          ...entityData,
        }),
      })

      if (response.ok) {
        const responseData = await response.json()
        await fetchItems()
        // Send notification after successful entity creation
        if (modalEntity?.type) {
          // ntfyService.notifyEntityCreated(data.title || item.text, modalEntity.type) // Disabled - server-side only
        }

        // Flash Files tab with entity color
        if (modalEntity?.type) {
          tabNavRef.current?.triggerFlash('files', modalEntity.type)
        }

        setModalOpen(false)
      }
    } catch (error) {
      console.error('Failed to save entity:', error)
    }
  }

  const handleModalSaveAndNavigate = async (data: Record<string, any>) => {
    await handleModalSave(data)
    setActiveTab('files')
    // TODO: Apply entity type filter in Files tab
  }

  const handleAIFill = async () => {
    if (!modalData.id) return

    try {
      const response = await fetch(`/api/ai/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: modalData.id,
          text: modalData.title,
          targetType: modalEntity?.type,
        }),
      })

      const data = await response.json()
      if (data.success && data.data) {
        setModalData(prev => ({ ...prev, ...data.data }))
      }
    } catch (error) {
      console.error('Failed to AI fill:', error)
    }
  }

  // ===== Markdown Entity Handlers =====
  const handleMarkdownEdit = () => {
    // Close viewer, open editor with same item/template
    setMarkdownViewerOpen(false)
    setMarkdownEditorOpen(true)
  }

  const handleMarkdownSave = async (payload: { markdown: string; fields: Record<string, string>; sections: Record<string, any>; rawSections?: Record<string, any>; tags: string[] }) => {
    if (!currentMarkdownItem || !currentTemplate) return

    const { markdown, fields, tags } = payload

    try {
      const response = await fetch(`/api/items/${currentMarkdownItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown_content: markdown,
          tags,
          project: currentTemplate.entity_type === 'project' ? normalizeProjectPayloadFromFields(fields) : undefined,
          list: currentTemplate.entity_type === 'list' ? normalizeListPayloadFromTemplate(currentTemplate, fields, markdown) : undefined
        })
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save')
      }

      // Refresh items list
      await fetchItems()

      // Close editor, reopen viewer with updated content
      setMarkdownEditorOpen(false)

      // Fetch updated item
      const updatedResponse = await fetch(`/api/items/${currentMarkdownItem.id}`)
      const updatedData = await updatedResponse.json()
      setCurrentMarkdownItem(updatedData.item)
      setMarkdownViewerOpen(true)

      // Clear to prevent stale data
      setCapturedText('')
    } catch (error) {
      console.error('Failed to save markdown entity:', error)
      alert(error instanceof Error ? error.message : 'Failed to save entity')
    }
  }

  const handleMarkdownCreate = async (payload: { markdown: string; fields: Record<string, string>; sections: Record<string, any>; rawSections?: Record<string, any>; tags: string[] }) => {
    if (!currentTemplate) return

    const { markdown, fields, tags } = payload

    try {
      const entityType = currentTemplate.entity_type
      const projectPayload = entityType === 'project' ? normalizeProjectPayloadFromFields(fields) : undefined
      const listPayload = entityType === 'list' ? normalizeListPayloadFromTemplate(currentTemplate, fields, markdown) : undefined
      const notePayload = entityType === 'note' && projectContextId ? { project_id: projectContextId } : undefined

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: entityType,
          text: markdown.split('\n')[0].replace(/^#\s+/, ''), // Extract title from first line
          markdown_content: markdown,
          template_id: currentTemplate.id,
          tags: tags || [],
          parsed: true,
          entity_type: entityType,
          project: projectPayload,
          list: listPayload,
          note: notePayload
        })
      })

      const data = await response.json()
      if (!data.item) {
        throw new Error(data.error || 'Failed to create entity')
      }

      // If converting from Ready tab, delete the original idea item
      if (convertingItemId) {
        try {
          await fetch(`/api/items/${convertingItemId}`, {
            method: 'DELETE',
          })
        } catch (deleteError) {
          console.error('Failed to delete original idea item:', deleteError)
          // Continue anyway - the entity was created successfully
        }
      }

      // Refresh items list
      await fetchItems()

      // Close editor
      setMarkdownEditorOpen(false)
      setCurrentTemplate(null)
      setConvertingItemId(null) // Clear converting item ID

      // Flash appropriate tab badge
      tabNavRef.current?.triggerFlash('files', entityType)

      // Clear capture input if we came from capture screen
      setCapturedText('')
    } catch (error) {
      console.error('Failed to create markdown entity:', error)
      alert(error instanceof Error ? error.message : 'Failed to create entity')
    }
  }

  // Journal quick-save (Capture Today surface)
  const handleJournalSave = async (text: string) => {
    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          text: text.slice(0, 64) || 'Journal Entry',
          markdown_content: `# Journal Entry\n\n${text}`,
          template_id: 'note-generic',
          tags: [],
          parsed: true,
          entity_type: 'note',
          metadata: { subtype: 'journal' },
          note: { subtype: 'journal', content: text }
        })
      })
      await fetchItems()
      setCapturedText('')
    } catch (error) {
      console.error('Failed to save journal', error)
      alert('Failed to save journal')
    }
  }

  // Media quick-save (Capture Today surface)
  const handleMediaSave = async (payload: { url: string; type: 'Image' | 'Audio' | 'Video'; caption: string }) => {
    const { url, type, caption } = payload
    const title = caption || 'Media Note'
    const markdown = `# ${title}\n\n**Media URL**: ${url}\n**Type**: ${type}\n\n## Details\n`
    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          text: title,
          markdown_content: markdown,
          template_id: 'note-media',
          tags: [],
          parsed: true,
          entity_type: 'note',
          metadata: { subtype: 'media' },
          note: { subtype: 'media', url, media_type: type.toLowerCase(), content: caption }
        })
      })
      await fetchItems()
      setCapturedText('')
    } catch (error) {
      console.error('Failed to save media note', error)
      alert('Failed to save media note')
    }
  }

  const handleMarkdownCancel = () => {
    setMarkdownEditorOpen(false)
    setMarkdownViewerOpen(currentMarkdownItem !== null) // Only reopen viewer if we were editing
    setCurrentMarkdownItem(null)
    setCurrentTemplate(null)
    setConvertingItemId(null) // Clear converting item ID
    setProjectContextId(null)
    setPreFillData(null) // Task 4.3: Clear pre-fill data
    setCapturedText('') // Clear to prevent stale data
  }

  const handleMarkdownViewerClose = () => {
    setMarkdownViewerOpen(false)
    setCurrentMarkdownItem(null)
    setCurrentTemplate(null)
  }

  const handleRelatedEntityOpen = (entityId: string) => {
    handleMarkdownViewerClose()
    setTimeout(() => handleEntityTap(entityId), 50)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="retro-device-frame">
      <div className="retro-device-branding flex items-center justify-center gap-2">
        <FrondNutLogo size={20} />
        <span>FrondNut</span>
      </div>
      <div className="retro-device-screen">
        <div className="h-screen overflow-hidden bg-[var(--bg-primary)] flex flex-col">
          {/* Global Header */}
          <GlobalHeader
            activeTab={activeTab}
            unsortedCount={unsortedCount}
            readyCount={readyCount}
            onSettingsClick={() => setSettingsOpen(true)}
            subHeaderText={activeTab === 'planner' ? plannerSubheader : undefined}
          />

          {/* Active Screen */}
          <div className="flex-1 overflow-y-auto">
        {activeTab === 'capture' && (
          <CaptureScreen
            onCapture={handleCapture}
            onAICapture={handleAICapture}
            recentItems={recentItems.map(i => ({
              id: i.id,
              text: i.text,
              entityType: i.type !== 'idea' ? (i.type as Exclude<EntityType, 'idea'>) : null,
              createdAt: i.created_at,
            }))}
            onRecentItemClick={(id) => handleEntityTap(id)}
            unsortedItems={unsortedItems.map(i => ({ id: i.id, text: i.text, createdAt: i.created_at }))}
            onUnsortedConvert={handleSort}
            onUnsortedDelete={handleDelete}
            onJournalSave={handleJournalSave}
            onMediaSave={handleMediaSave}
            journalEntry={journalEntry || undefined}
            mediaEntry={mediaEntry || undefined}
            aiSuggestion={aiSuggestion}
            isAnalyzing={isAnalyzing}
            isCreatingItem={isCreatingItem}
            creationError={creationError}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            onOverrideAndEdit={handleOverrideAndEdit}
            onAcceptAndEdit={handleAcceptAndEdit}
            onAcceptAndSave={async (suggestion) => await handleAcceptSuggestion(suggestion.suggested_type)}
          />
        )}

        {activeTab === 'ready' && (
          <ReadyInboxScreen
            items={readyItems.map(i => ({
              id: i.id,
              text: i.text,
              entityType: i.entity_type as Exclude<EntityType, 'idea'>,
              createdAt: i.created_at,
            }))}
            onConvert={handleConvertFromReady}
            onConvertAll={handleConvertAll}
            onDelete={handleDelete}
            onAIAction={handleAIAction}
            isConvertingAll={isConvertingAll}
          />
        )}

        {activeTab === 'files' && (
          <EntitiesScreen
            entities={files}
            onEntityTap={handleEntityTap}
            onDelete={handleDelete}
            onSwipeRightAction={handleSwipeRightAction}
            onTaskToggle={(id, status) => toggleTaskStatus(id, status)}
            tagsEnabled
          />
        )}

        {activeTab === 'planner' && (
          <PlannerScreen
            onItemTap={handleEntityTap}
            onTaskToggle={toggleTaskStatus}
            onRemoveAssignment={(assignmentId, date) => removeFromDay(assignmentId, date)}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomTabNav
        ref={tabNavRef}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        readyCount={readyCount}
      />

      {/* Entity Modal */}
      {modalEntity && (
        <EntityModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          entityType={modalEntity.type}
          initialData={modalData}
          onSave={handleModalSave}
          onSaveAndNavigate={handleModalSaveAndNavigate}
          onAIFill={handleAIFill}
        >
          <FormField
            label="Title"
            value={modalData.title || ''}
            onChange={(value) => setModalData(prev => ({ ...prev, title: value }))}
            type="text"
            placeholder="Enter title..."
            entityType={modalEntity.type}
          />

          <FormField
            label="Description"
            value={modalData.description || ''}
            onChange={(value) => setModalData(prev => ({ ...prev, description: value }))}
            type="textarea"
            placeholder="Add details..."
            entityType={modalEntity.type}
          />

          {modalEntity.type === 'note' && (
            <FormField
              label="Note Type"
              value={modalData.subtype || 'general'}
              onChange={(value) => setModalData(prev => ({ ...prev, subtype: value }))}
              type="select"
              options={[
                { value: 'general', label: 'General' },
                { value: 'research', label: 'Research' },
                { value: 'video', label: 'Video' },
                { value: 'link', label: 'Link' },
                { value: 'file', label: 'File' },
                { value: 'contact', label: 'Contact' },
                { value: 'meeting', label: 'Meeting' },
              ]}
              entityType={modalEntity.type}
            />
          )}

          <TagInput
            value={modalData.tags || []}
            onChange={(tags) => setModalData(prev => ({ ...prev, tags }))}
            entityType={modalEntity.type}
          />

          {modalEntity.type === 'task' && (
            <>
              <FormField
                label="Status"
                value={modalData.status || 'pending'}
                onChange={(value) => setModalData(prev => ({ ...prev, status: value }))}
                type="select"
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'in-progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]}
                entityType={modalEntity.type}
              />

              <FormField
                label="Priority"
                value={modalData.priority || '1'}
                onChange={(value) => setModalData(prev => ({ ...prev, priority: value }))}
                type="number"
                placeholder="1-5"
                min={1}
                max={5}
                entityType={modalEntity.type}
              />

              <FormField
                label="Project (Optional)"
                value={modalData.project_id || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, project_id: value }))}
                type="select"
                options={[
                  { value: '', label: 'None' },
                  ...projects.map(p => ({ value: p.id, label: p.text }))
                ]}
                entityType={modalEntity.type}
              />

              <FormField
                label="Due Date"
                value={modalData.dueDate || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, dueDate: value }))}
                type="date"
                entityType={modalEntity.type}
              />

              {/* Reminder Section */}
              <div className="mb-4">
                <label className="retro-checkbox-label">
                  <input
                    type="checkbox"
                    className="retro-checkbox"
                    checked={modalData.reminderEnabled || false}
                    onChange={(e) => {
                      const enabled = e.target.checked
                      setModalData(prev => ({
                        ...prev,
                        reminderEnabled: enabled,
                        // Clear reminder data if unchecking
                        ...(!enabled && {
                          reminderOption: null,
                          reminderDatetime: '',
                          reminder_datetime: null
                        })
                      }))
                    }}
                    disabled={!modalData.dueDate}
                  />
                  <span>Set Reminder</span>
                </label>
                {!modalData.dueDate && (
                  <p className="text-xs opacity-60 ml-6 -mt-2">Set a due date first</p>
                )}
              </div>

              {modalData.reminderEnabled && modalData.dueDate && (
                <div className="mb-4 ml-6">
                  {/* Quick Options */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    <button
                      type="button"
                      className={`retro-btn retro-btn-sm ${modalData.reminderOption === 'morning' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
                      onClick={() => {
                        const due = new Date(modalData.dueDate + 'T00:00:00')
                        due.setHours(9, 0, 0, 0)
                        const timestamp = due.getTime()
                        setModalData(prev => ({
                          ...prev,
                          reminderOption: 'morning',
                          reminder_datetime: timestamp,
                          reminderDatetime: due.toISOString().slice(0, 16)
                        }))
                      }}
                    >
                      Morning of
                    </button>
                    <button
                      type="button"
                      className={`retro-btn retro-btn-sm ${modalData.reminderOption === '1hr' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
                      onClick={() => {
                        const due = new Date(modalData.dueDate + 'T00:00:00')
                        due.setHours(17, 0, 0, 0) // Default to 5 PM on due date
                        const remind = new Date(due.getTime() - (60 * 60 * 1000)) // 4 PM on due date
                        const timestamp = remind.getTime()
                        setModalData(prev => ({
                          ...prev,
                          reminderOption: '1hr',
                          reminder_datetime: timestamp,
                          reminderDatetime: remind.toISOString().slice(0, 16)
                        }))
                      }}
                    >
                      1hr before
                    </button>
                    <button
                      type="button"
                      className={`retro-btn retro-btn-sm ${modalData.reminderOption === '1day' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
                      onClick={() => {
                        const due = new Date(modalData.dueDate + 'T00:00:00')
                        const remind = new Date(due.getTime() - (24 * 60 * 60 * 1000))
                        remind.setHours(9, 0, 0, 0)
                        const timestamp = remind.getTime()
                        setModalData(prev => ({
                          ...prev,
                          reminderOption: '1day',
                          reminder_datetime: timestamp,
                          reminderDatetime: remind.toISOString().slice(0, 16)
                        }))
                      }}
                    >
                      1 day before
                    </button>
                    <button
                      type="button"
                      className={`retro-btn retro-btn-sm ${modalData.reminderOption === 'custom' ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
                      onClick={() => setModalData(prev => ({ ...prev, reminderOption: 'custom' }))}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Custom Datetime Picker */}
                  {modalData.reminderOption === 'custom' && (
                    <div className="mb-3">
                      <label className="retro-label">Reminder Date & Time</label>
                      <input
                        type="datetime-local"
                        className="retro-input"
                        value={modalData.reminderDatetime || ''}
                        onChange={(e) => {
                          const timestamp = new Date(e.target.value).getTime()
                          setModalData(prev => ({
                            ...prev,
                            reminderDatetime: e.target.value,
                            reminder_datetime: timestamp
                          }))
                        }}
                      />
                    </div>
                  )}

                  {/* Display Reminder Info */}
                  {modalData.reminder_datetime && (
                    <div className="text-xs p-2" style={{
                      background: 'var(--retro-screen-light)',
                      border: '1px solid var(--retro-border)',
                      borderRadius: '4px'
                    }}>
                      <div className="font-semibold mb-1">⏰ Reminder set for:</div>
                      <div>{new Date(modalData.reminder_datetime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}</div>
                      {modalData.reminder_datetime < Date.now() && (
                        <div className="mt-1" style={{ color: 'var(--swipe-delete)' }}>⚠️ This reminder is in the past</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <FormField
                label="Estimated Time (hours)"
                value={modalData.estimatedTime || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, estimatedTime: value }))}
                type="number"
                placeholder="0"
                entityType={modalEntity.type}
              />
            </>
          )}

          {modalEntity.type === 'project' && (
            <>
              <FormField
                label="Status"
                value={modalData.projectStatus || 'planning'}
                onChange={(value) => setModalData(prev => ({ ...prev, projectStatus: value }))}
                type="select"
                options={[
                  { value: 'planning', label: 'Planning' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                ]}
                entityType={modalEntity.type}
              />

              <FormField
                label="Progress (%)"
                value={modalData.progress || '0'}
                onChange={(value) => setModalData(prev => ({ ...prev, progress: value }))}
                type="number"
                placeholder="0-100"
                min={0}
                max={100}
                entityType={modalEntity.type}
              />

              <FormField
                label="Start Date"
                value={modalData.start_date || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, start_date: value }))}
                type="date"
                entityType={modalEntity.type}
              />

              <FormField
                label="End Date"
                value={modalData.end_date || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, end_date: value }))}
                type="date"
                entityType={modalEntity.type}
              />

              <FormField
                label="Deadline"
                value={modalData.deadline || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, deadline: value }))}
                type="date"
                entityType={modalEntity.type}
              />
            </>
          )}
        </EntityModal>
      )}

      {/* Markdown Viewer Modal */}
      {currentMarkdownItem && currentTemplate && (
        <AnimatePresence>
          {markdownViewerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={handleMarkdownViewerClose}
                className="fixed inset-0 bg-black/60 z-[1002] flex items-center justify-center"
              />

              {/* Modal Content */}
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="retro-markdown-modal z-[1003]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full md:h-auto md:max-h-[80vh]" style={{
                  background: 'var(--palm-bg-primary)',
                  border: '3px solid var(--palm-border-dark)',
                  boxShadow: '4px 4px 0 var(--palm-border-dark)',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 0,
                }}>
                  {/* Header */}
                  <div className="retro-sheet-header" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--palm-screen-dark)',
                    color: 'var(--palm-bg-primary)',
                    borderBottom: '2px solid var(--palm-border-dark)',
                    flexShrink: 0,
                  }}>
                    <h2 style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      margin: 0,
                    }}>
                      {currentTemplate.name}
                    </h2>
                    <button
                      onClick={handleMarkdownViewerClose}
                      className="retro-close-btn"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--palm-bg-primary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="retro-scrollable" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                  }}>
                    {currentMarkdownItem.type === 'project' && (
                      <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                          <StatCard
                            label="Completion"
                            value={`${Math.round(((currentMarkdownItem.project_summary?.completion_rate || 0) * 100))}%`}
                            hint={`${currentMarkdownItem.project_summary?.completed_tasks || 0} of ${currentMarkdownItem.project_summary?.total_tasks || 0}`}
                          />
                          <StatCard
                            label="Staleness"
                            value={`${currentMarkdownItem.project_summary?.staleness_days ?? 0}d`}
                            hint="Since project creation"
                          />
                          <StatCard
                            label="Last Activity"
                            value={currentMarkdownItem.project_summary?.last_activity ? new Date(currentMarkdownItem.project_summary.last_activity).toLocaleDateString() : '—'}
                            hint="Latest task update"
                          />
            <StatCard
              label="Priority"
              value={(currentMarkdownItem.project?.priority || 'medium').toUpperCase()}
              hint={(currentMarkdownItem.project?.project_type || 'personal').replace('-', ' ')}
            />
          </div>
          {currentMarkdownItem.project_summary?.danger_zone?.active && (
            <div style={{
              padding: '10px 12px',
              border: '2px dashed var(--entity-project)',
              background: 'var(--palm-bg-secondary)',
              color: 'var(--entity-project)'
            }}>
              ⚠️ Almost there! Don&apos;t let this stall. {currentMarkdownItem.project_summary.danger_zone.reason || ''}
            </div>
          )}
                        <RelatedList
                          title="Tasks"
                          count={currentMarkdownItem.project_tasks?.length || 0}
                          items={(currentMarkdownItem.project_tasks || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            meta: t.status
                          }))}
                          onOpen={handleRelatedEntityOpen}
                        />
                        <RelatedList
                          title="Notes"
                          count={currentMarkdownItem.project_notes?.length || 0}
                          items={(currentMarkdownItem.project_notes || []).map(n => ({
                            id: n.id,
                            title: n.title
                          }))}
                          onOpen={handleRelatedEntityOpen}
                        />
                      </div>
                    )}
                    <MarkdownViewer content={currentMarkdownItem.markdown_content || ''} />
                  </div>

                  {/* Footer Actions */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--palm-border)',
                    background: 'var(--palm-screen-base)',
                    flexShrink: 0,
                  }}>
                    <button
                      onClick={handleMarkdownViewerClose}
                      className="retro-btn retro-btn-secondary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Close
                    </button>
                    {currentMarkdownItem.type === 'project' && (
                      <button
                        onClick={() => {
                          setProjectContextId(currentMarkdownItem.project?.id || null)
                          setTemplateSelectorEntityType('note')
                          setTemplateSelectorOpen(true)
                          setMarkdownViewerOpen(false)
                        }}
                        className="retro-btn retro-btn-secondary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Add Note
                      </button>
                    )}
                    <button
                      onClick={handleMarkdownEdit}
                      className="retro-btn retro-btn-primary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Markdown Entity Editor Modal */}
      {currentTemplate && (
        <MarkdownEntityEditor
          item={currentMarkdownItem}
          template={currentTemplate}
          onSave={currentMarkdownItem ? handleMarkdownSave : handleMarkdownCreate}
          onCancel={handleMarkdownCancel}
          isOpen={markdownEditorOpen}
          initialText={capturedText}
          preFillData={preFillData}
        />
      )}

      {/* Template Selector Modal (Task 4.4) */}
      <TemplateSelector
        isOpen={templateSelectorOpen}
        onSelect={handleTemplateSelected}
        onCancel={handleTemplateSelectorCancel}
        entityType={templateSelectorEntityType}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        onStartTour={() => {
          setWelcomeOpen(false)
          setTourOpen(true)
        }}
      />

      {/* Onboarding Tour */}
      <TourExample
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
        </div>
      </div>
      <div className="retro-device-button"></div>
    </div>
  )
}

// Planner Drawer (slide-in)
const PlannerDrawer = ({
  drawer,
  onClose,
  filters,
  setFilter,
  items,
  onAdd,
}: {
  drawer: { type: 'task' | 'note' | 'list' | null; filter: string }
  onClose: () => void
  filters: string[]
  setFilter: (f: string) => void
  items: Item[]
  onAdd: (id: string) => void
}) => {
  if (!drawer.type) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[1002]" onClick={onClose} />
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 z-[1003]"
      >
        <div className="h-full retro-card p-4 overflow-y-auto" style={{ background: 'var(--palm-bg-primary)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="retro-header retro-header-sm">Add {drawer.type}</h3>
            <button className="retro-btn retro-btn-secondary retro-btn-sm" onClick={onClose}>Close</button>
          </div>
          <div className="flex gap-2 mb-3">
            {filters.map(f => (
              <button
                key={f}
                className={`retro-btn retro-btn-sm ${drawer.filter === f ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {items.length === 0 && <p className="text-xs opacity-60">No items available.</p>}
            {items.map(ent => (
              <div
                key={ent.id}
                className="retro-card p-2 flex items-center justify-between"
                style={{
                  borderLeft: `4px solid ${getEntityColor(ent.type)}`,
                  background: getEntityBackgroundColor(ent.type, 'muted', 0.08),
                  opacity: ent.type === 'task' && ent.task?.status === 'completed' ? 0.6 : 1,
                  textDecoration: ent.type === 'task' && ent.task?.status === 'completed' ? 'line-through' : 'none',
                }}
              >
                <div>
                  <div className="text-sm font-semibold">{ent.text}</div>
                  <div className="text-[10px] opacity-60 uppercase">{ent.type}</div>
                  {ent.type === 'task' && <div className="text-[10px] mt-1">Status: {ent.task?.status || 'pending'}</div>}
                </div>
                <button className="retro-btn retro-btn-secondary retro-btn-sm" onClick={() => onAdd(ent.id)}>Add</button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  )
}

const listTypeToTemplateId = (listType?: string | null): string => {
  const normalized = (listType || '').toLowerCase()
  if (normalized === 'numbered') return 'list-numbered'
  if (normalized === 'tasklist') return 'list-tasklist'
  if (normalized === 'shopping') return 'list-shopping'
  return 'list-bulleted'
}

const getTemplateIdForEntityType = (
  entityType: AISuggestion['suggested_type'],
  opts?: { subtype?: string | null; listType?: string | null }
): string | null => {
  if (entityType === 'task') return 'task'
  if (entityType === 'project') return 'project-standard'
  if (entityType === 'note') {
    const subtype = opts?.subtype || 'generic'
    if (subtype === 'youtube') return 'note-youtube'
    if (subtype === 'meeting') return 'note-meeting'
    if (subtype === 'research') return 'note-research'
    if (subtype === 'media') return 'note-media'
    return 'note-generic'
  }
  if (entityType === 'list') {
    return listTypeToTemplateId(opts?.listType)
  }
  return null
}

const extractTitleFromMarkdown = (markdown: string): string => {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

const normalizeProjectPayloadFromFields = (fields: Record<string, string>) => {
  const rawStatus = (fields['Status'] || 'Planning').toLowerCase()
  const status = ['planning', 'active', 'completed'].includes(rawStatus) ? rawStatus : 'planning'
  const rawType = (fields['Type'] || 'personal').toLowerCase().replace(/\s+/g, '-')
  const project_type = ['personal', 'coding', 'smart-home', 'work', 'apartment'].includes(rawType) ? rawType : 'personal'
  const rawPriority = (fields['Priority'] || 'medium').toLowerCase()
  let priority: 'low' | 'medium' | 'high' = 'medium'
  if (rawPriority === 'high') priority = 'high'
  if (rawPriority === 'low') priority = 'low'
  const deadline = fields['Deadline'] ? new Date(fields['Deadline']).getTime() : null

  return {
    status,
    project_type,
    priority,
    deadline
  }
}

const normalizeListPayloadFromTemplate = (template: Template, fields: Record<string, string>, markdown: string) => {
  let list_type: 'bulleted' | 'numbered' | 'tasklist' | 'shopping' = 'bulleted'
  if (template.subtype === 'numbered') list_type = 'numbered'
  if (template.subtype === 'tasklist') list_type = 'tasklist'
  if (template.subtype === 'shopping') list_type = 'shopping'

  return {
    name: extractTitleFromMarkdown(markdown) || fields['Title'] || 'Untitled List',
    list_type
  }
}

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div style={{
    border: '2px inset var(--palm-border-light)',
    background: 'var(--palm-bg-secondary)',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  }}>
    <span style={{ fontSize: '12px', color: 'var(--palm-text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '18px', fontWeight: 700 }}>{value}</span>
  {hint && <span style={{ fontSize: '12px', color: 'var(--palm-text-secondary)' }}>{hint}</span>}
  </div>
)

const RelatedList = ({
  title,
  count,
  items,
  onOpen
}: {
  title: string
  count: number
  items: { id: string; title: string; meta?: string }[]
  onOpen: (id: string) => void
}) => (
  <div style={{ border: '2px inset var(--palm-border-light)', padding: '12px', background: 'var(--palm-bg-secondary)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <span style={{ fontSize: '12px', color: 'var(--palm-text-secondary)' }}>
        {count} linked
      </span>
    </div>
    {items.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onOpen(item.id)}
            className="retro-btn retro-btn-secondary"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <span>{item.title}</span>
            {item.meta && (
              <span style={{ fontSize: '12px', color: 'var(--palm-text-secondary)' }}>
                {item.meta}
              </span>
            )}
          </button>
        ))}
      </div>
    ) : (
      <div style={{ fontSize: '12px', color: 'var(--palm-text-secondary)' }}>No linked {title.toLowerCase()} yet.</div>
    )}
  </div>
)

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
      <div className="text-xl text-[var(--text-secondary)]">Loading...</div>
    </div>
  )
}

// Wrapper component with Suspense boundary
export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomePageContent />
    </Suspense>
  )
}

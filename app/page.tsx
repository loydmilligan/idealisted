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

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GlobalHeader } from '@/components/modern/GlobalHeader'
import { BottomTabNav, TabId, TabNavHandle } from '@/components/modern/BottomTabNav'
import { CaptureScreen } from '@/components/modern/screens/CaptureScreen'
import { UnsortedInboxScreen } from '@/components/modern/screens/UnsortedInboxScreen'
import { ReadyInboxScreen } from '@/components/modern/screens/ReadyInboxScreen'
import { EntitiesScreen } from '@/components/modern/screens/EntitiesScreen'
import { EntityModal, FormField } from '@/components/modern/EntityModal'
import { SettingsModal } from '@/components/modern/SettingsModal'
import { TagInput } from '@/components/modern/TagInput'
import { EntityType } from '@/lib/entity-colors'
import { ItemWithRelations, AISuggestion } from '@/types'
import { FrondNutLogo } from '@/components/ui/FrondNutLogo'
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

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // AI suggestion state (Phase 3: Preview-First)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [capturedText, setCapturedText] = useState('')
  const [isCreatingItem, setIsCreatingItem] = useState(false)

  // Load items on mount
  useEffect(() => {
    fetchItems()
    loadAndApplyTheme()
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
      tags: [],
      createdAt: i.created_at,
    }))

  // Badge counts
  const unsortedCount = unsortedItems.length
  const readyCount = readyItems.length

  // ===== Capture Handlers =====
  const handleCapture = async (text: string, entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => {
    try {
      const metadata = entityType && subtype ? { subtype } : undefined

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: entityType || 'idea',
          parsed: !!entityType,
          entity_type: entityType,
          metadata,
        }),
      })

      if (response.ok) {
        await fetchItems()
        // Send notification after successful capture
        // ntfyService.notifyIdeaCaptured(text) // Disabled - server-side only

        // Flash appropriate tab
        if (!entityType) {
          // Captured to Unsorted (Inbox) - no color flash
          tabNavRef.current?.triggerFlash('unsorted', null)
        } else {
          // Captured directly to Ready with entity type
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

        // Flash appropriate tab
        tabNavRef.current?.triggerFlash('ready', entityType)

        // Show success feedback
        console.log(`[Accept Suggestion] ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} created successfully`)

        // Clear AI state
        setAiSuggestion(null)
        setCapturedText('')
      }
    } catch (error) {
      console.error('[Accept Suggestion] Error creating item:', error)

      // Show error feedback to user
      alert('Failed to create item. Please try again or use manual entry.')

      // Keep suggestion panel open so user can retry
      // Don't clear aiSuggestion or capturedText
    } finally {
      setIsCreatingItem(false)
    }
  }

  // Handle user dismissing AI suggestion
  const handleDismissSuggestion = () => {
    setAiSuggestion(null)
    setCapturedText('')
    setIsAnalyzing(false)
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

    setModalEntity({ type: item.entity_type as Exclude<EntityType, 'idea'> })
    setModalData({
      title: item.text,
      id: itemId,
      tags: item.tags || [],
      description: item.note?.content || item.project?.description || item.list?.description || ''
    })
    setModalOpen(true)
  }

  // ===== Entity Handlers =====
  const handleEntityTap = async (entityId: string) => {
    const entity = items.find(i => i.id === entityId)
    if (!entity) return

    // Fetch full entity details including reminder data
    const response = await fetch(`/api/items/${entityId}`)
    const data = await response.json()
    const fullEntity = data.item

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
            aiSuggestion={aiSuggestion}
            isAnalyzing={isAnalyzing}
            isCreatingItem={isCreatingItem}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismissSuggestion={handleDismissSuggestion}
          />
        )}

        {activeTab === 'unsorted' && (
          <UnsortedInboxScreen
            items={unsortedItems.map(i => ({
              id: i.id,
              text: i.text,
              createdAt: i.created_at,
            }))}
            onSort={handleSort}
            onConvert={handleConvertFromUnsorted}
            onDelete={handleDelete}
            onAIAction={handleAIAction}
            defaultSwipeAction="task"
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
            onDelete={handleDelete}
            onAIAction={handleAIAction}
          />
        )}

        {activeTab === 'files' && (
          <EntitiesScreen
            entities={files}
            onEntityTap={handleEntityTap}
            onDelete={handleDelete}
            onSwipeRightAction={handleSwipeRightAction}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomTabNav
        ref={tabNavRef}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unsortedCount={unsortedCount}
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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
        </div>
      </div>
      <div className="retro-device-button"></div>
    </div>
  )
}

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

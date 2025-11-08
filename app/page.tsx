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

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { GlobalHeader } from '@/components/modern/GlobalHeader'
import { BottomTabNav, TabId } from '@/components/modern/BottomTabNav'
import { CaptureScreen } from '@/components/modern/screens/CaptureScreen'
import { UnsortedInboxScreen } from '@/components/modern/screens/UnsortedInboxScreen'
import { ReadyInboxScreen } from '@/components/modern/screens/ReadyInboxScreen'
import { EntitiesScreen } from '@/components/modern/screens/EntitiesScreen'
import { EntityModal, FormField } from '@/components/modern/EntityModal'
import { SettingsModal } from '@/components/modern/SettingsModal'
import { EntityType } from '@/lib/entity-colors'

// Types
interface Item {
  id: string
  text: string
  type: EntityType
  parsed: boolean
  entity_type?: string | null
  created_at: string
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Tab state from URL
  const [activeTab, setActiveTab] = useState<TabId>((searchParams?.get('tab') as TabId) || 'capture')

  // Data state
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntity, setModalEntity] = useState<{ id?: string; type: Exclude<EntityType, 'idea'> } | null>(null)
  const [modalData, setModalData] = useState<Record<string, string>>({})

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Load items on mount
  useEffect(() => {
    fetchItems()
  }, [])

  // Update URL when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', tab)
    router.push(`?${params.toString()}`)
  }

  // Fetch all items from API
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      const data = await response.json()
      // API returns { items: [...] }
      if (data.items) {
        setItems(data.items)
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
  const handleCapture = async (text: string, entityType?: Exclude<EntityType, 'idea'> | null) => {
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: entityType || 'idea',
          parsed: !!entityType,
          entity_type: entityType,
        }),
      })

      if (response.ok) {
        await fetchItems()
        // Flash appropriate tab
        if (!entityType) {
          // Flash Unsorted tab
        } else {
          // Flash Ready or Entities tab
        }
      }
    } catch (error) {
      console.error('Failed to capture item:', error)
    }
  }

  const handleAICapture = async (text: string, action: 'sort' | 'convert' | 'full') => {
    try {
      // Create item first
      const createResponse = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type: 'idea' }),
      })

      const createData = await createResponse.json()
      if (!createData.success) return

      const itemId = createData.data.id

      // Call AI action
      if (action === 'sort') {
        const aiResponse = await fetch(`/api/items/${itemId}/parse`, {
          method: 'POST',
        })
        const aiData = await aiResponse.json()
        if (aiData.success) {
          await fetchItems()
        }
      } else if (action === 'convert' || action === 'full') {
        const aiResponse = await fetch(`/api/items/${itemId}/convert`, {
          method: 'POST',
        })
        const aiData = await aiResponse.json()
        if (aiData.success) {
          await fetchItems()
        }
      }
    } catch (error) {
      console.error('Failed to AI capture:', error)
    }
  }

  // ===== Unsorted Handlers =====
  const handleSort = async (itemId: string, entityType: Exclude<EntityType, 'idea'>) => {
    try {
      // Get current item
      const item = items.find(i => i.id === itemId)
      if (!item) return

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
        }),
      })

      if (response.ok) {
        await fetchItems()
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
    setModalData({ title: item.text, id: itemId })
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
    setModalData({ title: item.text, id: itemId })
    setModalOpen(true)
  }

  // ===== Entity Handlers =====
  const handleEntityTap = async (entityId: string) => {
    const entity = items.find(i => i.id === entityId)
    if (!entity) return

    setModalEntity({ id: entityId, type: entity.type as Exclude<EntityType, 'idea'> })
    setModalData({ title: entity.text, id: entityId })
    setModalOpen(true)
  }

  const handleSwipeRightAction = async (entityId: string, entityType: Exclude<EntityType, 'idea'>) => {
    // Configurable per entity type (complete, archive, etc.)
    console.log('Swipe right action:', entityId, entityType)
    // TODO: Implement based on entity type
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
          status: 'pending',
          priority: 1,
          tags: [],
          estimated_time: data.estimatedTime ? parseInt(data.estimatedTime) : null,
          due_date: data.dueDate || null,
          project_id: null,
        }
      } else if (modalEntity?.type === 'note') {
        entityData.note = {
          subtype: 'general',
          content: data.description || '',
          url: null,
          media_type: null,
        }
      } else if (modalEntity?.type === 'project') {
        entityData.project = {
          status: 'planning',
          tags: [],
          deadline: data.deadline || null,
          description: data.description || '',
          progress: 0,
          start_date: null,
          end_date: null,
        }
      } else if (modalEntity?.type === 'list') {
        entityData.list = {
          name: data.title || '',
          tags: [],
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
          tags: item.tags || [],
          archived: item.archived || false,
          parsed: true,
          entity_type: modalEntity?.type,
          ...entityData,
        }),
      })

      if (response.ok) {
        await fetchItems()
        setModalOpen(false)
      }
    } catch (error) {
      console.error('Failed to save entity:', error)
    }
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

          {modalEntity.type === 'task' && (
            <>
              <FormField
                label="Due Date"
                value={modalData.dueDate || ''}
                onChange={(value) => setModalData(prev => ({ ...prev, dueDate: value }))}
                type="date"
                entityType={modalEntity.type}
              />

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
            <FormField
              label="Deadline"
              value={modalData.deadline || ''}
              onChange={(value) => setModalData(prev => ({ ...prev, deadline: value }))}
              type="date"
              entityType={modalEntity.type}
            />
          )}
        </EntityModal>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

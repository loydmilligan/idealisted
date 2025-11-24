import { Item, CreateItemRequest, UpdateItemRequest, Plan, AIRequest, AIResponse } from '@/types'

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `/api${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `Request failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Items
  async getItems(params?: {
    type?: string
    archived?: boolean
    limit?: number
    offset?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.set('type', params.type)
    if (params?.archived !== undefined) searchParams.set('archived', params.archived.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    return this.request<{ items: Item[] }>(`/items?${searchParams.toString()}`)
  }

  async getItem(id: string) {
    return this.request<{ item: Item }>(`/items/${id}`)
  }

  async createItem(item: CreateItemRequest) {
    return this.request<{ item: Item }>(`/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    })
  }

  async updateItem(id: string, updates: Partial<UpdateItemRequest>) {
    return this.request<{ item: Item }>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...updates }),
    })
  }

  async deleteItem(id: string) {
    return this.request<{ success: boolean }>(`/items/${id}`, {
      method: 'DELETE',
    })
  }

  // Parse + Convert workflow
  async parseItem(itemId: string, entityType: 'task' | 'note' | 'list' | 'project') {
    return this.request<{ success: boolean; item: Item }>(`/items/parse`, {
      method: 'POST',
      body: JSON.stringify({ itemId, entityType }),
    })
  }

  async parseAllItems() {
    return this.request<{ success: boolean; parsed: number; total: number }>(`/items/parse`, {
      method: 'PUT',
    })
  }

  async convertItem(itemId: string) {
    return this.request<{ success: boolean; item: Item; type: string }>(`/items/convert`, {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    })
  }

  // AI
  async processAI(request: AIRequest) {
    return this.request<AIResponse>(`/ai`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async getAIConfig() {
    return this.request<{ configured: boolean; config: any }>(`/ai`)
  }

  async updateAIConfig(config: any) {
    return this.request<{ success: boolean }>(`/ai/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  }

  // Notifications
  async sendNotification(title: string, message: string, actions?: any[], priority?: string) {
    return this.request<{ success: boolean; id?: string }>(`/notify`, {
      method: 'POST',
      body: JSON.stringify({ title, message, actions, priority }),
    })
  }

  async getNtfyConfig() {
    return this.request<{ configured: boolean; config: any }>(`/notify`)
  }

  async updateNtfyConfig(config: any) {
    return this.request<{ success: boolean; config: any }>(`/notify/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  }

  // Settings
  async getSettings() {
    return this.request<{ settings: Record<string, any> }>(`/settings`)
  }

  async updateSettings(settings: Record<string, any>) {
    return this.request<{ success: boolean; settings: Record<string, any> }>(`/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  }

  // Plans
  async getPlans() {
    return this.request<{ plans: Plan[] }>(`/plans`)
  }

  async getPlan(date: string) {
    return this.request<{ plan: Plan }>(`/plans/${date}`)
  }

  async createPlan(plan: Omit<Plan, 'id' | 'created_at' | 'updated_at'>) {
    return this.request<{ plan: Plan }>(`/plans`, {
      method: 'POST',
      body: JSON.stringify(plan),
    })
  }

  async updatePlan(id: string, updates: Partial<Plan>) {
    return this.request<{ plan: Plan }>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Task Management
  async rescheduleTask(taskId: string, _field: string, newDate?: string | number) {
    // Reschedule task by updating its due_date
    // Convert string date to timestamp if needed
    const dueDate = typeof newDate === 'string' ? new Date(newDate).getTime() : newDate
    return this.request<{ item: Item }>(`/items/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id: taskId,
        task: {
          due_date: dueDate
        }
      }),
    })
  }

  // Plan Management (Sprint 3)
  async autoPopulatePlan(_date: string) {
    // Stub: Auto-populate plan for a given date
    // This will be implemented in Sprint 3 Phase 2
    return { success: true }
  }

  async completePlan(planId: string) {
    // Mark a plan as completed
    return this.request<{ plan: Plan }>(`/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify({
        completed_at: Date.now()
      }),
    })
  }

  async finalizePlan(planId: string) {
    // Mark a plan as finalized (ready for execution)
    return this.request<{ plan: Plan }>(`/plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify({
        finalized_at: Date.now()
      }),
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient

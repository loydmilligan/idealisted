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

  async updatePlan(date: string, updates: Partial<Plan>) {
    return this.request<{ plan: Plan }>(`/plans/${date}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async finalizePlan(planId: string) {
    return this.request<{ plan: Plan }>(`/plans/finalize`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    })
  }

  async completePlan(planId: string) {
    return this.request<{ completedPlan: Plan; nextPlan: Plan }>(`/plans/complete`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    })
  }

  async autoPopulatePlan(date: string) {
    return this.request<{ plan: Plan; tasks: Item[] }>(`/plans/auto-populate`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    })
  }

  async rescheduleTask(taskId: string, action: 'tomorrow' | 'date' | 'backlog' | 'delete', targetDate?: string) {
    return this.request<{ task?: Item; deleted?: boolean }>(`/tasks/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ taskId, action, targetDate }),
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient

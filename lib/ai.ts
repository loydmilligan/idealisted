import OpenAI from 'openai'
import { AIRequest, AIResponse, AIConfig } from '@/types'

class AIService {
  private client: OpenAI | null = null
  private config: AIConfig | null = null

  constructor() {
    this.initializeFromSettings()
  }

  private async initializeFromSettings() {
    try {
      // Load settings from database
      const { db } = await import('@/lib/db')
      const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_config') as any
      
      if (setting) {
        this.config = JSON.parse(setting.value)
        this.client = new OpenAI({
          apiKey: this.config.openrouterApiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          dangerouslyAllowBrowser: true // Only for development
        })
      }
    } catch (error) {
      console.error('Failed to initialize AI from settings:', error)
    }
  }

  async updateConfig(config: AIConfig) {
    try {
      const { db } = await import('@/lib/db')
      
      // Save to database
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('ai_config', JSON.stringify(config), Date.now())

      this.config = config
      this.client = new OpenAI({
        apiKey: config.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        dangerouslyAllowBrowser: true
      })

      return true
    } catch (error) {
      console.error('Failed to update AI config:', error)
      return false
    }
  }

  private getConfig(): AIConfig {
    if (!this.config) {
      throw new Error('AI not configured. Please set up your OpenRouter API key.')
    }
    if (!this.config.enabled) {
      throw new Error('AI features are disabled. Enable AI in settings to use this feature.')
    }
    return this.config
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const config = this.getConfig()
    
    if (!this.client) {
      throw new Error('AI client not initialized')
    }

    // Choose model based on paid/free setting
    const model = config.usePaidModel ? config.paidModel : config.freeModel

    const systemPrompt = this.buildSystemPrompt(request.type)
    const userPrompt = this.buildUserPrompt(request)

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI')
      }

      return this.parseResponse(response, request.type)
    } catch (error) {
      console.error('AI processing error:', error)
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildSystemPrompt(type: string): string {
    const basePrompt = `You are an intelligent assistant for a task management app called IdeaListed. 
    Your goal is to help users capture, organize, and process their ideas efficiently.
    Always respond in JSON format with the following structure:
    {
      "suggestion": "Your main suggestion or analysis",
      "confidence": 0.8,
      "actions": [
        {
          "type": "convert|tag|rewrite|schedule",
          "data": { ... }
        }
      ]
    }`

    const typeSpecificPrompts = {
      parse: `${basePrompt}
      
      For parsing ideas, extract and categorize the core information. Look for:
      - Tasks/action items
      - Notes/research topics  
      - Links or media references
      - Project ideas
      - Questions or topics to research`,
      
      convert: `${basePrompt}
      
      For converting ideas, suggest the best type and format:
      - "todo" for actionable items
      - "note" for information storage
      - "list" for grouped items
      - "project" for complex initiatives`,
      
      tag: `${basePrompt}
      
      For tagging, suggest relevant tags that would help with organization and search.
      Consider categories like: work, personal, urgent, research, learning, etc.`,
      
      rewrite: `${basePrompt}
      
      For rewriting, improve clarity, add action verbs, and make items more specific and actionable.`,
      
      research: `${basePrompt}
      
      For research suggestions, provide next steps, resources to investigate, and questions to consider.`
    }

    return typeSpecificPrompts[type as keyof typeof typeSpecificPrompts] || basePrompt
  }

  private buildUserPrompt(request: AIRequest): string {
    let prompt = `Text: "${request.text}"\n`
    
    if (request.context) {
      prompt += `Context: ${JSON.stringify(request.context, null, 2)}\n`
    }

    prompt += `\nPlease analyze this and provide your suggestions.`

    return prompt
  }

  private parseResponse(response: string, type: string): AIResponse {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response)
      
      return {
        suggestion: parsed.suggestion || 'No suggestion provided',
        confidence: parsed.confidence || 0.5,
        actions: parsed.actions || []
      }
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        suggestion: response,
        confidence: 0.5,
        actions: []
      }
    }
  }

  async parseIdea(text: string): Promise<AIResponse> {
    return this.processRequest({
      type: 'parse',
      text,
      context: { operation: 'parse_idea' }
    })
  }

  async convertIdea(text: string): Promise<AIResponse> {
    return this.processRequest({
      type: 'convert',
      text,
      context: { operation: 'convert_idea' }
    })
  }

  async suggestTags(text: string): Promise<AIResponse> {
    return this.processRequest({
      type: 'tag',
      text,
      context: { operation: 'suggest_tags' }
    })
  }

  async rewriteText(text: string): Promise<AIResponse> {
    return this.processRequest({
      type: 'rewrite',
      text,
      context: { operation: 'rewrite_text' }
    })
  }

  async suggestResearch(text: string): Promise<AIResponse> {
    return this.processRequest({
      type: 'research',
      text,
      context: { operation: 'suggest_research' }
    })
  }

  async generatePlan(completedTodos: any[], incompleteTodos: any[], context: any = {}): Promise<AIResponse> {
    return this.processRequest({
      type: 'research',
      text: 'Generate daily plan',
      context: {
        operation: 'generate_plan',
        completedTodos,
        incompleteTodos,
        ...context
      }
    })
  }

  /**
   * Generic chat method for arbitrary prompts with custom system messages
   */
  async chat(prompt: string, systemMessage?: string): Promise<AIResponse> {
    return this.processRequest({
      type: 'research',
      text: prompt,
      context: {
        operation: 'chat',
        systemMessage: systemMessage || 'You are a helpful assistant.'
      }
    })
  }

  isConfigured(): boolean {
    return this.client !== null && this.config !== null && this.config.enabled === true
  }

  getConfigSummary(): Partial<AIConfig> | null {
    if (!this.config) return null

    return {
      enabled: this.config.enabled,
      freeModel: this.config.freeModel,
      paidModel: this.config.paidModel,
      usePaidModel: this.config.usePaidModel,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    }
  }

  /**
   * Check if a specific AI feature is enabled
   * @param featureName - Name of feature from ai_feature_settings table
   * @returns Promise<boolean> - True if master toggle AND feature flag are both enabled
   */
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    // Check master toggle first (fail fast)
    if (!this.config?.enabled) {
      return false
    }

    try {
      const { db } = await import('@/lib/db')
      const feature = db.prepare(`
        SELECT enabled FROM ai_feature_settings WHERE feature_name = ?
      `).get(featureName) as { enabled: number } | undefined

      // SQLite stores booleans as 0 or 1, must check === 1
      return feature?.enabled === 1
    } catch (error) {
      console.error(`Failed to check feature flag: ${featureName}`, error)
      // Fail closed - disable feature on error
      return false
    }
  }
}

export const aiService = new AIService()
export default aiService

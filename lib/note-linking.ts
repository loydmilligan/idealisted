/**
 * AI Note Linking Service
 *
 * Analyzes notes to suggest semantic relationships and insert wiki-style links
 * for Obsidian vault integration.
 */

import { db } from './db'
import { v4 as uuidv4 } from 'uuid'

export interface NoteLink {
  id: string
  source_note_id: string
  target_note_id: string
  link_type: 'related' | 'references' | 'builds-on' | 'contradicts' | 'similar'
  confidence: number
  ai_reason: string
  status: 'suggested' | 'approved' | 'rejected' | 'auto-applied'
  created_at: number
  updated_at?: number
}

export interface LinkSuggestion {
  target_note_id: string
  target_title: string
  link_type: 'related' | 'references' | 'builds-on' | 'contradicts' | 'similar'
  confidence: number
  reason: string
  snippet: string // Preview of related content
}

export interface NoteLinkingResult {
  suggested_links: LinkSuggestion[]
  auto_applied_links: LinkSuggestion[]
  total_candidates: number
  processing_time_ms: number
}

/**
 * AI service for note linking
 */
export class NoteLinkingService {
  private aiEnabled: boolean
  private apiKey: string | null
  private model: string

  constructor() {
    // Load AI config from database
    const config = this.loadAIConfig()
    this.aiEnabled = config?.enabled || false
    this.apiKey = config?.apiKey || null
    this.model = config?.model || 'x-ai/grok-beta'
  }

  /**
   * Load AI configuration from database
   */
  private loadAIConfig(): { enabled: boolean; apiKey: string | null; model: string } | null {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('ai_config') as any
      if (!row) return null
      const config = JSON.parse(row.value)
      return {
        enabled: config.enabled || false,
        apiKey: config.apiKey || null,
        model: config.model || 'x-ai/grok-beta'
      }
    } catch (error) {
      console.error('Failed to load AI config:', error)
      return null
    }
  }

  /**
   * Suggest links for a single note
   * @param noteId - ID of the note to analyze
   * @param options - Options for link suggestion
   */
  async suggestLinks(
    noteId: string,
    options: {
      maxSuggestions?: number
      minConfidence?: number
      autoApply?: boolean
    } = {}
  ): Promise<NoteLinkingResult> {
    const startTime = Date.now()
    const maxSuggestions = options.maxSuggestions || 5
    const minConfidence = options.minConfidence || 0.6
    const autoApply = options.autoApply || false

    if (!this.aiEnabled || !this.apiKey) {
      return {
        suggested_links: [],
        auto_applied_links: [],
        total_candidates: 0,
        processing_time_ms: Date.now() - startTime
      }
    }

    // Get the source note
    const sourceNote = this.getNote(noteId)
    if (!sourceNote) {
      throw new Error(`Note not found: ${noteId}`)
    }

    // Get candidate notes (other notes, excluding the source)
    const candidateNotes = this.getCandidateNotes(noteId)

    if (candidateNotes.length === 0) {
      return {
        suggested_links: [],
        auto_applied_links: [],
        total_candidates: 0,
        processing_time_ms: Date.now() - startTime
      }
    }

    // Call AI to analyze relationships
    const suggestions = await this.analyzeRelationships(sourceNote, candidateNotes, maxSuggestions)

    // Filter by confidence threshold
    const filteredSuggestions = suggestions.filter(s => s.confidence >= minConfidence)

    // Auto-apply high-confidence links if requested
    const autoAppliedLinks: LinkSuggestion[] = []
    const suggestedLinks: LinkSuggestion[] = []

    for (const suggestion of filteredSuggestions) {
      if (autoApply && suggestion.confidence >= 0.8) {
        // Auto-apply high-confidence links
        this.createLink(noteId, suggestion.target_note_id, {
          link_type: suggestion.link_type,
          confidence: suggestion.confidence,
          ai_reason: suggestion.reason,
          status: 'auto-applied'
        })
        autoAppliedLinks.push(suggestion)
      } else {
        // Store as suggestion for user review
        this.createLink(noteId, suggestion.target_note_id, {
          link_type: suggestion.link_type,
          confidence: suggestion.confidence,
          ai_reason: suggestion.reason,
          status: 'suggested'
        })
        suggestedLinks.push(suggestion)
      }
    }

    return {
      suggested_links: suggestedLinks,
      auto_applied_links: autoAppliedLinks,
      total_candidates: candidateNotes.length,
      processing_time_ms: Date.now() - startTime
    }
  }

  /**
   * Get a note by ID with its content
   */
  private getNote(noteId: string): { id: string; title: string; content: string; tags: string[] } | null {
    const row = db.prepare(`
      SELECT i.id, i.text as title, i.markdown_content, i.tags,
             n.content, n.subtype
      FROM items i
      LEFT JOIN notes n ON i.id = n.item_id
      WHERE i.id = ? AND i.type = 'note' AND i.archived = 0
    `).get(noteId) as any

    if (!row) return null

    const content = row.markdown_content || row.content || row.title
    const tags = row.tags ? JSON.parse(row.tags) : []

    return {
      id: row.id,
      title: row.title,
      content,
      tags
    }
  }

  /**
   * Get candidate notes for linking (all other notes except source)
   */
  private getCandidateNotes(excludeNoteId: string): Array<{ id: string; title: string; content: string; tags: string[] }> {
    const rows = db.prepare(`
      SELECT i.id, i.text as title, i.markdown_content, i.tags,
             n.content, n.subtype
      FROM items i
      LEFT JOIN notes n ON i.id = n.item_id
      WHERE i.id != ? AND i.type = 'note' AND i.archived = 0
      ORDER BY i.updated_at DESC
      LIMIT 50
    `).all(excludeNoteId) as any[]

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.markdown_content || row.content || row.title,
      tags: row.tags ? JSON.parse(row.tags) : []
    }))
  }

  /**
   * Analyze relationships using AI
   */
  private async analyzeRelationships(
    sourceNote: { id: string; title: string; content: string; tags: string[] },
    candidateNotes: Array<{ id: string; title: string; content: string; tags: string[] }>,
    maxSuggestions: number
  ): Promise<LinkSuggestion[]> {
    if (!this.apiKey) return []

    const prompt = this.buildLinkingPrompt(sourceNote, candidateNotes)

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://idealisted.mattmariani.com',
          'X-Title': 'IdeaListed Note Linking'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      })

      if (!response.ok) {
        console.error('OpenRouter API error:', await response.text())
        return []
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content || ''

      // Parse AI response
      return this.parseAILinkSuggestions(aiResponse, candidateNotes, maxSuggestions)
    } catch (error) {
      console.error('Error analyzing relationships:', error)
      return []
    }
  }

  /**
   * Build prompt for AI linking analysis
   */
  private buildLinkingPrompt(
    sourceNote: { title: string; content: string; tags: string[] },
    candidateNotes: Array<{ id: string; title: string; content: string; tags: string[] }>
  ): string {
    const candidateList = candidateNotes
      .map((note, idx) => `[${idx}] "${note.title}" (tags: ${note.tags.join(', ') || 'none'})\n${note.content.substring(0, 300)}...`)
      .join('\n\n')

    return `You are a knowledge graph expert. Analyze the SOURCE NOTE and identify which CANDIDATE NOTES are semantically related.

SOURCE NOTE:
Title: "${sourceNote.title}"
Tags: ${sourceNote.tags.join(', ') || 'none'}
Content:
${sourceNote.content.substring(0, 1000)}

CANDIDATE NOTES:
${candidateList}

For each related note, provide:
1. Note index [0-${candidateNotes.length - 1}]
2. Relationship type: related, references, builds-on, contradicts, or similar
3. Confidence score (0.0-1.0)
4. Brief reason (1 sentence)
5. Relevant snippet from candidate note

Respond in JSON format:
{
  "links": [
    {
      "note_index": 0,
      "link_type": "related",
      "confidence": 0.85,
      "reason": "Both discuss React hooks patterns",
      "snippet": "useState and useEffect are fundamental..."
    }
  ]
}

Only suggest strong relationships (confidence >= 0.6). Focus on topic overlap, shared concepts, or explicit references.`
  }

  /**
   * Parse AI response into link suggestions
   */
  private parseAILinkSuggestions(
    aiResponse: string,
    candidateNotes: Array<{ id: string; title: string; content: string }>,
    maxSuggestions: number
  ): LinkSuggestion[] {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0])
      const links = parsed.links || []

      return links
        .filter((link: any) => {
          const index = link.note_index
          return index >= 0 && index < candidateNotes.length && link.confidence >= 0.6
        })
        .slice(0, maxSuggestions)
        .map((link: any) => {
          const candidate = candidateNotes[link.note_index]
          return {
            target_note_id: candidate.id,
            target_title: candidate.title,
            link_type: link.link_type || 'related',
            confidence: link.confidence,
            reason: link.reason,
            snippet: link.snippet || candidate.content.substring(0, 150)
          }
        })
    } catch (error) {
      console.error('Error parsing AI link suggestions:', error)
      return []
    }
  }

  /**
   * Create a link in the database
   */
  private createLink(
    sourceNoteId: string,
    targetNoteId: string,
    options: {
      link_type: string
      confidence: number
      ai_reason: string
      status: 'suggested' | 'auto-applied'
    }
  ): void {
    const now = Date.now()

    // Check if link already exists
    const existing = db.prepare(`
      SELECT id FROM note_links
      WHERE source_note_id = ? AND target_note_id = ?
    `).get(sourceNoteId, targetNoteId) as any

    if (existing) {
      // Update existing link
      db.prepare(`
        UPDATE note_links
        SET link_type = ?, confidence = ?, ai_reason = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        options.link_type,
        options.confidence,
        options.ai_reason,
        options.status,
        now,
        existing.id
      )
    } else {
      // Create new link
      db.prepare(`
        INSERT INTO note_links (id, source_note_id, target_note_id, link_type, confidence, ai_reason, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        sourceNoteId,
        targetNoteId,
        options.link_type,
        options.confidence,
        options.ai_reason,
        options.status,
        now
      )
    }
  }

  /**
   * Get approved and auto-applied links for a note
   */
  getApprovedLinks(noteId: string): Array<{ target_note_id: string; target_title: string; link_type: string }> {
    const rows = db.prepare(`
      SELECT nl.target_note_id, i.text as target_title, nl.link_type
      FROM note_links nl
      JOIN items i ON nl.target_note_id = i.id
      WHERE nl.source_note_id = ?
        AND nl.status IN ('approved', 'auto-applied')
      ORDER BY nl.confidence DESC
    `).all(noteId) as any[]

    return rows.map(row => ({
      target_note_id: row.target_note_id,
      target_title: row.target_title,
      link_type: row.link_type
    }))
  }

  /**
   * Get suggested links pending user review
   */
  getSuggestedLinks(noteId: string): LinkSuggestion[] {
    const rows = db.prepare(`
      SELECT nl.target_note_id, i.text as target_title, nl.link_type, nl.confidence, nl.ai_reason
      FROM note_links nl
      JOIN items i ON nl.target_note_id = i.id
      WHERE nl.source_note_id = ?
        AND nl.status = 'suggested'
      ORDER BY nl.confidence DESC
    `).all(noteId) as any[]

    return rows.map(row => ({
      target_note_id: row.target_note_id,
      target_title: row.target_title,
      link_type: row.link_type,
      confidence: row.confidence,
      reason: row.ai_reason,
      snippet: '' // Don't need snippet for display
    }))
  }

  /**
   * Approve a suggested link
   */
  approveLink(sourceNoteId: string, targetNoteId: string): void {
    db.prepare(`
      UPDATE note_links
      SET status = 'approved', updated_at = ?
      WHERE source_note_id = ? AND target_note_id = ? AND status = 'suggested'
    `).run(Date.now(), sourceNoteId, targetNoteId)
  }

  /**
   * Reject a suggested link
   */
  rejectLink(sourceNoteId: string, targetNoteId: string): void {
    db.prepare(`
      UPDATE note_links
      SET status = 'rejected', updated_at = ?
      WHERE source_note_id = ? AND target_note_id = ? AND status = 'suggested'
    `).run(Date.now(), sourceNoteId, targetNoteId)
  }
}

/**
 * Singleton instance
 */
export const noteLinkingService = new NoteLinkingService()

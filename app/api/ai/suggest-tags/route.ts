import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiService } from '@/lib/ai'

interface TagSuggestion {
  name: string
  source: 'existing' | 'new'
  confidence: number
  usage_count?: number
}

export async function POST(request: NextRequest) {
  try {
    // Check if tag_suggestions feature is enabled
    const featureEnabled = await aiService.isFeatureEnabled('tag_suggestions')

    if (!featureEnabled) {
      return NextResponse.json(
        { success: false, error: 'AI tag suggestions feature is disabled' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { text, entityType } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    // Fetch top 50 existing tags ordered by usage
    const existingTags = db.prepare(`
      SELECT name, usage_count
      FROM tags
      WHERE usage_count > 0
      ORDER BY usage_count DESC
      LIMIT 50
    `).all() as Array<{ name: string; usage_count: number }>

    const existingTagNames = existingTags.map(t => t.name)

    // Build AI prompt
    const prompt = `Analyze this text and suggest 3-5 relevant tags for a ${entityType || 'item'}.

Text: "${text}"

Existing tags in the system (PRIORITIZE REUSING THESE):
${existingTagNames.join(', ')}

Rules:
1. STRONGLY prefer reusing existing tags when they match (confidence >= 70%)
2. Only create new tags if NO existing tag fits well
3. Return 3-5 tags total
4. For each tag, specify:
   - name: tag name (lowercase, no spaces)
   - source: "existing" if from the list above, "new" if created
   - confidence: 0.0-1.0 (how well it matches the text)

Return ONLY a JSON array of tag objects, no other text:
[
  { "name": "example", "source": "existing", "confidence": 0.95 },
  { "name": "newtag", "source": "new", "confidence": 0.75 }
]`

    // Get AI config from database
    const settingsResponse = await fetch(`${request.nextUrl.origin}/api/settings`)
    const settingsData = await settingsResponse.json()
    const config = settingsData.settings?.ai_config

    if (!config || !config.enabled || !config.apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI not configured' },
        { status: 500 }
      )
    }

    const model = config.usePaidModel ? config.paidModel : config.freeModel

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in AI response')
    }

    // Parse AI response
    let suggestedTags: TagSuggestion[]
    try {
      suggestedTags = JSON.parse(content)
    } catch (e) {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        suggestedTags = JSON.parse(jsonMatch[1])
      } else {
        throw new Error('Failed to parse AI response as JSON')
      }
    }

    // Validate and enrich suggestions
    const enrichedTags = suggestedTags
      .filter(tag => tag.confidence >= 0.60) // Filter low confidence
      .map(tag => {
        // Add usage_count for existing tags
        if (tag.source === 'existing') {
          const existing = existingTags.find(t => t.name === tag.name)
          return {
            ...tag,
            usage_count: existing?.usage_count || 0
          }
        }
        return tag
      })
      .sort((a, b) => {
        // Sort: existing tags first, then by confidence
        if (a.source === 'existing' && b.source === 'new') return -1
        if (a.source === 'new' && b.source === 'existing') return 1
        return b.confidence - a.confidence
      })
      .slice(0, 5) // Limit to 5 tags

    return NextResponse.json({
      success: true,
      tags: enrichedTags
    })

  } catch (error) {
    console.error('Error suggesting tags:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to suggest tags' },
      { status: 500 }
    )
  }
}

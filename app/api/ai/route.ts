import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { AIRequest, AISuggestion } from '@/types'

// POST /api/ai - Process AI request
export async function POST(request: NextRequest) {
  try {
    if (!aiService.isConfigured()) {
      return NextResponse.json({ 
        error: 'AI not configured. Please set up your OpenRouter API key in settings.' 
      }, { status: 400 })
    }

    const body: AIRequest = await request.json()
    
    // Validate request
    if (!body.type || !body.text) {
      return NextResponse.json({ 
        error: 'Missing required fields: type and text' 
      }, { status: 400 })
    }

    // Process with AI
    const aiResponse = await aiService.processRequest(body)

    // Save suggestion to database if it's related to an item
    let suggestionId: string | null = null
    if (body.itemId) {
      suggestionId = uuidv4()
      const insertSuggestion = db.prepare(`
        INSERT INTO ai_suggestions (id, item_id, type, suggestion, confidence, applied, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `)
      
      insertSuggestion.run(
        suggestionId,
        body.itemId,
        body.type,
        aiResponse.suggestion,
        aiResponse.confidence,
        Date.now()
      )
    }

    return NextResponse.json({
      ...aiResponse,
      suggestionId,
      applied: false
    })

  } catch (error) {
    console.error('AI processing error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'AI processing failed' 
    }, { status: 500 })
  }
}

// GET /api/ai/config - Get AI configuration status
export async function GET() {
  try {
    const config = aiService.getConfigSummary()
    const isConfigured = aiService.isConfigured()

    return NextResponse.json({
      configured: isConfigured,
      config
    })
  } catch (error) {
    console.error('Error getting AI config:', error)
    return NextResponse.json({ error: 'Failed to get AI config' }, { status: 500 })
  }
}

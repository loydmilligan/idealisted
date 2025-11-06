import { NextRequest, NextResponse } from 'next/server'
import { AISuggestion } from '@/types'

export async function POST(request: NextRequest) {
  let text: string = ''

  try {
    const body = await request.json()
    text = body.text

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Get AI configuration from environment
    const apiKey = process.env.OPENROUTER_API_KEY
    const model = process.env.DEFAULT_PAID_MODEL || 'x-ai/grok-code-fast-1'

    if (!apiKey) {
      // Return a smart fallback without AI
      return NextResponse.json(generateSmartFallback(text))
    }

    // Call AI API for intelligent suggestion
    const prompt = `Analyze this text and suggest the best way to process it in a productivity app. 

Text: "${text}"

Respond with a JSON object containing:
{
  "suggested_type": "note|task|project|list",
  "confidence": 0.0-1.0,
  "processed_text": "cleaned and improved version of the text",
  "tags": ["tag1", "tag2", "tag3"],
  "additional_fields": {
    "priority": 1-3,
    "due_date": "YYYY-MM-DD" if applicable,
    "category": "category name" for notes,
    "estimated_time": number in hours for tasks,
    "deadline": "YYYY-MM-DD" for projects,
    "status": "pending|in-progress|completed" for tasks/projects,
    "list_name": "name of list" for lists,
    "list_items": ["item1", "item2", "item3"] for lists
  },
  "reasoning": "brief explanation of why this type was chosen"
}

Rules:
- Use "task" for actionable items (todos are now tasks)
- Use "list" for shopping lists, checklists, or comma-separated items
- Use "note" for information storage, reference, or documentation
- Use "project" for multi-step endeavors with deadlines
- For lists: extract list name if "add X to Y list" format, otherwise create new list
- For lists: split comma-separated items into list_items array
- Extract relevant tags from context
- Set priority 3 for urgent, 2 for important, 1 for normal
- Include due dates/deadlines only if explicitly mentioned
- Make the processed text more actionable and clear`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      throw new Error('AI API request failed')
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // Parse the AI response
    try {
      const suggestion: AISuggestion = JSON.parse(aiResponse)
      return NextResponse.json(suggestion)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      return NextResponse.json(generateSmartFallback(text))
    }

  } catch (error) {
    console.error('AI suggestion error:', error)
    return NextResponse.json(generateSmartFallback(text || 'unknown'))
  }
}

function generateSmartFallback(text: string): AISuggestion {
  const lowerText = text.toLowerCase()
  
  // Smart type detection based on keywords
  let suggestedType: 'note' | 'task' | 'project' | 'list' = 'task'
  let tags: string[] = []
  let priority = 1
  let reasoning = 'Detected from keywords'
  let listName: string | undefined
  let listItems: string[] = []
  
  // List detection logic
  if (lowerText.includes('list') || lowerText.includes('shopping') || 
      lowerText.includes('checklist') || lowerText.includes('grocery')) {
    suggestedType = 'list'
    tags.push('list')
    
    // Check for "add X to Y list" pattern
    const addToListMatch = text.match(/add\s+(.+?)\s+to\s+(.+?)\s+list/i)
    if (addToListMatch) {
      listName = addToListMatch[2].trim()
      // Check if it's multiple items to add
      const itemsToAdd = addToListMatch[1].split(',').map(item => item.trim())
      if (itemsToAdd.length >= 3) {
        listItems = itemsToAdd
        reasoning = `Adding ${itemsToAdd.length} items to existing list: ${listName}`
      } else {
        reasoning = `Adding item to existing list: ${listName}`
      }
    } else {
      // Create new list from comma-separated items or single item
      const commaItems = text.split(',').map(item => item.trim())
      if (commaItems.length >= 3) {
        listName = text.split(',')[0].trim().replace(/list$/i, '').trim()
        listItems = commaItems
        reasoning = `Creating new list with ${commaItems.length} items`
      } else {
        listName = text.trim()
        reasoning = 'Creating new list'
      }
    }
  }
  // Project indicators
  else if (lowerText.includes('project') || lowerText.includes('launch') || 
      lowerText.includes('build') || lowerText.includes('create') ||
      lowerText.includes('develop') || lowerText.includes('initiative')) {
    suggestedType = 'project'
    tags.push('project')
    reasoning = 'Contains project-related keywords'
  }
  // Task indicators  
  else if (lowerText.includes('task') || lowerText.includes('complete') ||
           lowerText.includes('finish') || lowerText.includes('work on') ||
           lowerText.includes('implement')) {
    suggestedType = 'task'
    tags.push('task')
    reasoning = 'Contains task-related keywords'
  }
  // Note indicators
  else if (lowerText.includes('note') || lowerText.includes('remember') ||
           lowerText.includes('information') || lowerText.includes('reference') ||
           lowerText.includes('documentation') || lowerText.includes('meeting notes')) {
    suggestedType = 'note'
    tags.push('note')
    reasoning = 'Contains note-related keywords'
  }
  // Default to task (formerly todo)
  else {
    tags.push('task')
    reasoning = 'Default task type'
  }
  
  // Priority detection
  if (lowerText.includes('urgent') || lowerText.includes('asap') || 
      lowerText.includes('emergency') || lowerText.includes('critical')) {
    priority = 3
    tags.push('urgent')
  } else if (lowerText.includes('important') || lowerText.includes('priority') ||
             lowerText.includes('soon') || lowerText.includes('high')) {
    priority = 2
    tags.push('important')
  }
  
  // Date detection
  const dateRegex = /(\d{4}-\d{2}-\d{2}|tomorrow|today|next week|next month)/i
  const dateMatch = text.match(dateRegex)
  let dueDate: string | undefined
  if (dateMatch) {
    dueDate = dateMatch[1]
    tags.push('dated')
  }
  
  // Category detection for notes
  let category: string | undefined
  if (suggestedType === 'note') {
    if (lowerText.includes('meeting')) category = 'meeting'
    else if (lowerText.includes('idea')) category = 'idea'
    else if (lowerText.includes('research')) category = 'research'
    else if (lowerText.includes('reference')) category = 'reference'
  }
  
  // Time estimation for tasks
  let estimatedTime: number | undefined
  if (suggestedType === 'task') {
    const timeRegex = /(\d+)\s*(hour|hr|hours|minute|min|minutes)/i
    const timeMatch = text.match(timeRegex)
    if (timeMatch) {
      const value = parseInt(timeMatch[1])
      const unit = timeMatch[2].toLowerCase()
      estimatedTime = unit.includes('hour') ? value : value / 60
    }
  }
  
  return {
    suggested_type: suggestedType,
    confidence: 0.7,
    processed_text: text.trim(),
    tags: [...new Set(tags)], // Remove duplicates
    additional_fields: {
      priority,
      due_date: dueDate,
      category,
      estimated_time: estimatedTime,
      list_name: listName,
      list_items: listItems.length > 0 ? listItems : undefined,
    },
    reasoning
  }
}

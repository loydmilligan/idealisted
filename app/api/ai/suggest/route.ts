import { NextRequest, NextResponse } from 'next/server'
import { AISuggestion } from '@/types'
import { aiService } from '@/lib/ai'
import { db } from '@/lib/db'

/**
 * Sprint 2 - Phase 5: Search for existing lists and projects
 * Performs fuzzy matching to find entities that might match user input
 */
function searchExistingEntities(text: string): {
  lists: Array<{ id: string, name: string }>
  projects: Array<{ id: string, name: string }>
} {
  const lowerText = text.toLowerCase()

  // Search for existing lists
  const lists = db.prepare(`
    SELECT l.id, l.name, i.text
    FROM lists l
    JOIN items i ON i.id = l.item_id
    WHERE i.archived = 0
    ORDER BY l.name
  `).all() as Array<{ id: string, name: string, text: string }>

  // Search for existing projects
  const projects = db.prepare(`
    SELECT p.id, i.text
    FROM projects p
    JOIN items i ON i.id = p.item_id
    WHERE i.archived = 0
    ORDER BY i.text
  `).all() as Array<{ id: string, text: string }>

  // Fuzzy match function - checks if search text contains entity name or vice versa
  const fuzzyMatch = (searchText: string, entityName: string): boolean => {
    const search = searchText.toLowerCase().trim()
    const entity = entityName.toLowerCase().trim()

    // Direct substring match
    if (search.includes(entity) || entity.includes(search)) {
      return true
    }

    // Remove common words and check again
    const cleanSearch = search.replace(/\b(list|project|the|a|an|my)\b/g, '').trim()
    const cleanEntity = entity.replace(/\b(list|project|the|a|an|my)\b/g, '').trim()

    if (cleanSearch.length < 3 || cleanEntity.length < 3) {
      return false // Avoid false positives with very short strings
    }

    return cleanSearch.includes(cleanEntity) || cleanEntity.includes(cleanSearch)
  }

  // Find matching lists
  const matchingLists = lists.filter(l =>
    fuzzyMatch(lowerText, l.name) || fuzzyMatch(lowerText, l.text)
  ).map(l => ({ id: l.id, name: l.name }))

  // Find matching projects
  const matchingProjects = projects.map(p => ({
    id: p.id,
    name: p.text
  })).filter(p => fuzzyMatch(lowerText, p.name))

  return {
    lists: matchingLists,
    projects: matchingProjects
  }
}

/**
 * Sprint 2 - Phase 5: Enhance suggestion with entity search results
 * Checks if the suggestion should append to an existing entity instead of creating new
 */
function enhanceWithEntitySearch(suggestion: AISuggestion, originalText: string): AISuggestion {
  // Only check for lists and projects
  if (suggestion.suggested_type !== 'list' && suggestion.suggested_type !== 'project') {
    suggestion.suggested_action = 'create_new'
    return suggestion
  }

  // Search for matching entities
  const matches = searchExistingEntities(originalText)

  // Handle list suggestions
  if (suggestion.suggested_type === 'list' && matches.lists.length > 0) {
    const targetList = matches.lists[0] // Use the best match (first one)

    // Extract items to append from the original text
    const appendItems = extractItemsToAppend(originalText, suggestion)

    return {
      ...suggestion,
      suggested_action: 'append_to_list',
      target_entity_id: targetList.id,
      target_entity_name: targetList.name,
      append_items: appendItems.length > 0 ? appendItems : [originalText.trim()],
      reasoning: `Found existing list "${targetList.name}". ${appendItems.length > 0 ? `Adding ${appendItems.length} item(s)` : 'Adding item'} to it instead of creating a new list.`
    }
  }

  // Handle project suggestions
  if (suggestion.suggested_type === 'project' && matches.projects.length > 0) {
    const targetProject = matches.projects[0] // Use the best match (first one)

    return {
      ...suggestion,
      suggested_action: 'add_to_project',
      target_entity_id: targetProject.id,
      target_entity_name: targetProject.name,
      reasoning: `Found existing project "${targetProject.name}". This could be added as a task or note within that project.`
    }
  }

  // No matches found - create new entity
  suggestion.suggested_action = 'create_new'
  return suggestion
}

/**
 * Extract items to append from text input
 * Handles patterns like "add milk, eggs, bread to shopping list"
 */
function extractItemsToAppend(text: string, suggestion: AISuggestion): string[] {
  // Check for "add X to Y list" pattern
  const addToListMatch = text.match(/add\s+(.+?)\s+to\s+(?:.+?)\s*(?:list|project)/i)

  if (addToListMatch) {
    const itemsText = addToListMatch[1].trim()

    // Split by comma if multiple items
    const items = itemsText.split(',').map(item => item.trim()).filter(item => item.length > 0)

    if (items.length > 1) {
      return items
    }

    // Single item
    return [itemsText]
  }

  // Fallback: Use list_items from AI suggestion if available
  if (suggestion.additional_fields.list_items && suggestion.additional_fields.list_items.length > 0) {
    return suggestion.additional_fields.list_items
  }

  // Last resort: Return the whole text as a single item
  return []
}

export async function POST(request: NextRequest) {
  let text: string = ''

  try {
    const body = await request.json()
    text = body.text

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Check if suggestion_panel feature is enabled
    const featureEnabled = await aiService.isFeatureEnabled('suggestion_panel')
    if (!featureEnabled) {
      return NextResponse.json(
        { error: 'AI suggestion panel feature is disabled. Enable it in Settings > AI > Features.' },
        { status: 403 }
      )
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

Return a tight, human-friendly title (avoid echoing the whole input; prefer concise names like "Packing list", "Workshop notes", "Project kickoff"). Titles should be capitalized and 3-6 words max where possible.

Text: "${text}"

Respond with a JSON object containing:
{
  "suggested_type": "note|task|project|list",
  "confidence": 0.0-1.0,
  "processed_text": "cleaned and improved version of the text",
  "title": "concise, improved title for the entity",
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
- For lists/projects/notes: generate a concise title; if text says "add ... to packing list", title should be "Packing list"
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

      // Sprint 2 - Phase 5: Check for existing entities to append to
      const enhancedSuggestion = enhanceWithEntitySearch(suggestion, text)
      return NextResponse.json(enhancedSuggestion)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      const fallbackSuggestion = generateSmartFallback(text)
      const enhancedFallback = enhanceWithEntitySearch(fallbackSuggestion, text)
      return NextResponse.json(enhancedFallback)
    }

  } catch (error) {
    console.error('AI suggestion error:', error)
    const fallbackSuggestion = generateSmartFallback(text || 'unknown')
    const enhancedFallback = enhanceWithEntitySearch(fallbackSuggestion, text || 'unknown')
    return NextResponse.json(enhancedFallback)
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
    tags: Array.from(new Set(tags)), // Remove duplicates
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

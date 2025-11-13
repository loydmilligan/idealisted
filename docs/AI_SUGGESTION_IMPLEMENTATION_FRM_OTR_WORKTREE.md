# AI Suggestion System Implementation Guide

## Overview

This document provides a complete implementation guide for the AI-powered suggestion system that analyzes user input and intelligently suggests how to convert it into different entity types (tasks, notes, projects, lists) with confidence scores, reasoning, and override capabilities.

## System Architecture

```
User Input → API Call → AI Analysis → Suggestion Panel → User Choice → Entity Creation
```

### Key Features

1. **Intelligent Type Detection**: AI analyzes text and suggests the most appropriate entity type
2. **Confidence Score**: Shows percentage confidence in the suggestion (0-100%)
3. **Reasoning Display**: Explains why the AI chose that type
4. **Override Capability**: User can choose a different type than suggested
5. **Extracted Metadata**: Pulls out tags, priorities, dates, and other relevant fields
6. **Fallback Logic**: Works even without AI API (keyword-based detection)

## Type System

### Data Structures

```typescript
// Core suggestion type
interface AISuggestion {
  suggested_type: 'task' | 'note' | 'project' | 'list'
  confidence: number  // 0.0 to 1.0
  processed_text: string  // Cleaned/improved version of input
  tags: string[]  // Extracted tags
  additional_fields: {
    // Task-specific
    priority?: 1 | 2 | 3  // 1=normal, 2=important, 3=urgent
    due_date?: string  // YYYY-MM-DD format
    estimated_time?: number  // Hours
    status?: 'pending' | 'in-progress' | 'completed'

    // Note-specific
    category?: string  // e.g., "meeting", "idea", "research"

    // Project-specific
    deadline?: string  // YYYY-MM-DD format

    // List-specific
    list_name?: string
    list_items?: string[]
  }
  reasoning: string  // Explanation for the suggestion
}
```

## Backend Implementation

### API Endpoint: `/api/ai/suggest`

**File: `app/api/ai/suggest/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { AISuggestion } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Get AI credentials from environment
    const apiKey = process.env.OPENROUTER_API_KEY
    const model = process.env.DEFAULT_PAID_MODEL || 'x-ai/grok-code-fast-1'

    if (!apiKey) {
      // Return smart fallback if no AI available
      return NextResponse.json(generateSmartFallback(text))
    }

    // Prepare AI prompt
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
    "list_items": ["item1", "item2"] for lists
  },
  "reasoning": "brief explanation of why this type was chosen"
}

Rules:
- Use "task" for actionable items
- Use "list" for shopping lists, checklists, or comma-separated items
- Use "note" for information storage, reference, or documentation
- Use "project" for multi-step endeavors with deadlines
- Extract relevant tags from context
- Set priority 3 for urgent, 2 for important, 1 for normal
- Include due dates/deadlines only if explicitly mentioned
- Make the processed text more actionable and clear`

    // Call AI API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,  // Lower for more consistent results
      }),
    })

    if (!response.ok) {
      throw new Error('AI API request failed')
    }

    const data = await response.json()
    const aiResponse = data.choices[0].message.content

    // Parse AI response
    try {
      const suggestion: AISuggestion = JSON.parse(aiResponse)
      return NextResponse.json(suggestion)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      return NextResponse.json(generateSmartFallback(text))
    }

  } catch (error) {
    console.error('AI suggestion error:', error)
    return NextResponse.json(generateSmartFallback(text))
  }
}

// Fallback logic when AI is unavailable
function generateSmartFallback(text: string): AISuggestion {
  const lowerText = text.toLowerCase()

  let suggestedType: 'note' | 'task' | 'project' | 'list' = 'task'
  let tags: string[] = []
  let priority = 1
  let reasoning = 'Detected from keywords'

  // List detection
  if (lowerText.includes('list') || lowerText.includes('shopping') ||
      lowerText.includes('checklist') || lowerText.includes('grocery')) {
    suggestedType = 'list'
    tags.push('list')
    reasoning = 'Contains list-related keywords'
  }
  // Project detection
  else if (lowerText.includes('project') || lowerText.includes('launch') ||
      lowerText.includes('build') || lowerText.includes('create')) {
    suggestedType = 'project'
    tags.push('project')
    reasoning = 'Contains project-related keywords'
  }
  // Task detection
  else if (lowerText.includes('task') || lowerText.includes('complete') ||
           lowerText.includes('finish') || lowerText.includes('work on')) {
    suggestedType = 'task'
    tags.push('task')
    reasoning = 'Contains task-related keywords'
  }
  // Note detection
  else if (lowerText.includes('note') || lowerText.includes('remember') ||
           lowerText.includes('information') || lowerText.includes('reference')) {
    suggestedType = 'note'
    tags.push('note')
    reasoning = 'Contains note-related keywords'
  }
  // Default to task
  else {
    tags.push('task')
    reasoning = 'Default task type'
  }

  // Priority detection
  if (lowerText.includes('urgent') || lowerText.includes('asap') ||
      lowerText.includes('critical')) {
    priority = 3
    tags.push('urgent')
  } else if (lowerText.includes('important') || lowerText.includes('priority')) {
    priority = 2
    tags.push('important')
  }

  return {
    suggested_type: suggestedType,
    confidence: 0.7,  // Medium confidence for keyword matching
    processed_text: text.trim(),
    tags: Array.from(new Set(tags)),
    additional_fields: { priority },
    reasoning
  }
}
```

## Frontend Implementation

### UI Component: `AISuggestionPanel`

**File: `components/ui/AISuggestionPanel.tsx`**

```typescript
'use client'

import { AISuggestion } from '@/types'

interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  onApplySuggestion: (type: 'task' | 'note' | 'list' | 'project') => void
  onDismiss: () => void
}

export function AISuggestionPanel({
  suggestion,
  isLoading,
  onApplySuggestion,
  onDismiss
}: AISuggestionPanelProps) {

  // Loading state
  if (isLoading) {
    return (
      <div className="ai-suggestion-panel loading">
        <div className="text-center text-sm opacity-70">
          <p>🤖 AI is analyzing...</p>
        </div>
      </div>
    )
  }

  // No suggestion
  if (!suggestion) {
    return null
  }

  return (
    <div className="ai-suggestion-panel">
      {/* Header with confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase">
            AI SUGGESTION
          </span>
          <span className="text-xs opacity-70">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="btn-dismiss"
          title="Dismiss suggestion"
        >
          ✕
        </button>
      </div>

      {/* Processed Text */}
      <div className="mb-3">
        <p className="text-xs font-bold uppercase mb-1">Suggested Text:</p>
        <p className="text-sm bg-gray-100 p-2 rounded border">
          {suggestion.processed_text}
        </p>
      </div>

      {/* Tags */}
      {suggestion.tags.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold uppercase mb-1">Tags:</p>
          <div className="flex flex-wrap gap-1">
            {suggestion.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div className="mb-3">
        <p className="text-xs font-bold uppercase mb-1">Details:</p>
        <div className="text-xs space-y-1">
          {suggestion.additional_fields.priority && (
            <p>• Priority: {suggestion.additional_fields.priority}/3</p>
          )}
          {suggestion.additional_fields.due_date && (
            <p>• Due: {suggestion.additional_fields.due_date}</p>
          )}
          {suggestion.additional_fields.category && (
            <p>• Category: {suggestion.additional_fields.category}</p>
          )}
          {suggestion.additional_fields.estimated_time && (
            <p>• Est. Time: {suggestion.additional_fields.estimated_time}h</p>
          )}
          {suggestion.additional_fields.deadline && (
            <p>• Deadline: {suggestion.additional_fields.deadline}</p>
          )}
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-3">
        <p className="text-xs font-bold uppercase mb-1">Why:</p>
        <p className="text-xs opacity-80 italic">{suggestion.reasoning}</p>
      </div>

      {/* Action Buttons - Suggested type highlighted */}
      <div>
        <p className="text-xs font-bold uppercase mb-2">Convert to:</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Primary suggestion button */}
          <button
            onClick={() => onApplySuggestion(suggestion.suggested_type)}
            className="btn-primary"
          >
            ✓ {suggestion.suggested_type.toUpperCase()}
          </button>

          {/* Alternative options */}
          {(['task', 'note', 'project', 'list'] as const)
            .filter(type => type !== suggestion.suggested_type)
            .map(type => (
              <button
                key={type}
                onClick={() => onApplySuggestion(type)}
                className="btn-secondary"
              >
                {type.toUpperCase()}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
```

### Integration in Parent Component

**File: `app/page.tsx` (example)**

```typescript
'use client'

import { useState } from 'react'
import { AISuggestionPanel } from '@/components/ui/AISuggestionPanel'
import { AISuggestion } from '@/types'

export default function HomePage() {
  const [captureText, setCaptureText] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Trigger AI suggestion
  const handleAISuggestion = async () => {
    if (!captureText.trim()) return

    setIsLoadingAI(true)
    setAiSuggestion(null)

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: captureText }),
      })

      if (!response.ok) throw new Error('AI suggestion failed')

      const suggestion: AISuggestion = await response.json()
      setAiSuggestion(suggestion)
    } catch (error) {
      console.error('Failed to get AI suggestion:', error)
      alert('Failed to get AI suggestion')
    } finally {
      setIsLoadingAI(false)
    }
  }

  // Apply suggestion and create entity
  const handleApplySuggestion = async (type: 'task' | 'note' | 'project' | 'list') => {
    if (!aiSuggestion) return

    const itemData = {
      type,
      text: aiSuggestion.processed_text,
      tags: aiSuggestion.tags,
      ...aiSuggestion.additional_fields
    }

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      })

      if (!response.ok) throw new Error('Failed to create item')

      // Clear and refresh
      setCaptureText('')
      setAiSuggestion(null)
      // Reload items list...
    } catch (error) {
      console.error('Failed to create item:', error)
      alert('Failed to create item')
    }
  }

  return (
    <div className="app-container">
      {/* Capture Input */}
      <div className="capture-section">
        <textarea
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          placeholder="Capture your idea..."
          className="capture-input"
        />
        <button
          onClick={handleAISuggestion}
          disabled={!captureText.trim() || isLoadingAI}
          className="btn-ai-suggest"
        >
          {isLoadingAI ? 'Analyzing...' : '🤖 Get AI Suggestion'}
        </button>
      </div>

      {/* AI Suggestion Panel */}
      {(aiSuggestion || isLoadingAI) && (
        <AISuggestionPanel
          suggestion={aiSuggestion}
          isLoading={isLoadingAI}
          onApplySuggestion={handleApplySuggestion}
          onDismiss={() => setAiSuggestion(null)}
        />
      )}
    </div>
  )
}
```

## Styling

### Basic CSS (adapt to your design system)

```css
.ai-suggestion-panel {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slide-up 0.3s ease-out;
}

.ai-suggestion-panel.loading {
  border-color: #9ca3af;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn-primary {
  background: #3b82f6;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-dismiss {
  background: #ef4444;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
```

## Environment Variables

```env
# .env.local
OPENROUTER_API_KEY=your_api_key_here
DEFAULT_PAID_MODEL=x-ai/grok-code-fast-1
```

## Testing the Implementation

### Test Case 1: Task Detection
**Input:** "Finish the report by Friday"
**Expected Output:**
- Type: task
- Confidence: 85%+
- Tags: ["task", "deadline"]
- Priority: 2
- Due Date: (Friday's date)
- Reasoning: "Contains task keyword and deadline"

### Test Case 2: List Detection
**Input:** "Shopping list: milk, eggs, bread, butter"
**Expected Output:**
- Type: list
- Confidence: 90%+
- List Name: "Shopping list"
- List Items: ["milk", "eggs", "bread", "butter"]
- Reasoning: "Explicit list with comma-separated items"

### Test Case 3: Project Detection
**Input:** "Launch new website redesign project"
**Expected Output:**
- Type: project
- Confidence: 80%+
- Tags: ["project", "launch"]
- Reasoning: "Contains project and launch keywords"

### Test Case 4: Override Capability
**User Action:** AI suggests "note" but user clicks "task" button
**Expected:** Item created as task with all metadata from suggestion

## Key Implementation Tips

1. **Always include fallback logic** - Don't assume AI API is available
2. **Keep confidence scores realistic** - Keyword matching = 70%, AI = 85-95%
3. **Make override obvious** - All entity types should be equally clickable
4. **Parse AI responses safely** - Always try/catch JSON parsing
5. **Show reasoning** - Helps users understand and trust the suggestion
6. **Use low temperature** (0.2-0.4) for consistent AI responses
7. **Validate AI output** - Ensure suggested_type is one of the valid options

## Complete Flow Diagram

```
┌─────────────────┐
│  User Types     │
│  "Buy milk"     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click AI Button │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Call to     │
│ /api/ai/suggest │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│  AI   │ │ Fallback │
│ Model │ │ Keywords │
└───┬───┘ └────┬─────┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────────┐
│   AISuggestion      │
│   {                 │
│     type: "list"    │
│     confidence: 0.9 │
│     reasoning: "..."│
│   }                 │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Suggestion Panel    │
│ ┌─────────────────┐ │
│ │ 90% Confidence  │ │
│ │ Suggested: LIST │ │
│ │ Why: Shopping   │ │
│ │ item detected   │ │
│ ├─────────────────┤ │
│ │ [✓ LIST]  [TASK]│ │
│ │ [NOTE] [PROJECT]│ │
│ └─────────────────┘ │
└────────┬────────────┘
         │
    User Clicks
         │
         ▼
┌─────────────────┐
│ Create Item     │
│ with chosen     │
│ type + metadata │
└─────────────────┘
```

## Summary

This AI suggestion system provides an intelligent, user-friendly way to convert text into structured data. The key innovations are:

1. **Transparency**: Shows confidence and reasoning
2. **Flexibility**: User can always override
3. **Robustness**: Fallback when AI unavailable
4. **Rich metadata**: Extracts tags, priorities, dates automatically
5. **Clean UX**: Simple, clear interface

Copy this entire document to any AI assistant, and they should be able to implement this feature in any productivity application.

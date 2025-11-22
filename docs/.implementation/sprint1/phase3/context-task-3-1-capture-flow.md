# Phase 3 Task 3.1: Capture Flow Preview-First Pattern

## Context Bundle for Implementation

**Task Objective**: Update the capture flow so AI processes BEFORE item creation (preview-first pattern).

**Status**: Context gathering complete - Ready for implementation

---

## 1. Current Capture Flow Analysis

### Current User Flow (Create-First Pattern)

**Location**: `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx`

**Current Flow**:
1. User types text in textarea
2. User clicks "AI ▾" button (if AI enabled)
3. Dropdown shows: Sort, Convert, Full
4. User selects action → `handleAIAction()` is called
5. **Item is created FIRST** via `/api/items` POST
6. **Then AI processes** via `/api/items/${itemId}/parse` or `/api/items/${itemId}/convert`
7. UI refreshes to show the created item

**Code Location**: `app/page.tsx` lines 227-262

```typescript
const handleAICapture = async (text: string, action: 'sort' | 'convert' | 'full') => {
  try {
    // Create item first ← THIS IS THE PROBLEM
    const createResponse = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type: 'idea' }),
    })

    const createData = await createResponse.json()
    if (!createData.success) return

    const itemId = createData.data.id

    // Call AI action AFTER creation
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
```

### Current CaptureScreen Component

**Location**: `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx`

**Component State** (lines 41-45):
```typescript
const [inputText, setInputText] = useState('')
const [showNoteMenu, setShowNoteMenu] = useState(false)
const [showAIMenu, setShowAIMenu] = useState(false)
const [aiEnabled, setAiEnabled] = useState(false)
const textareaRef = useRef<HTMLTextAreaElement>(null)
```

**AI Button Rendering** (lines 174-183):
```typescript
{/* AI Button - only show if AI is enabled */}
{aiEnabled && (
  <button
    onClick={() => setShowAIMenu(!showAIMenu)}
    disabled={!inputText.trim()}
    className="retro-btn retro-btn-secondary whitespace-nowrap flex-shrink-0"
  >
    AI ▾
  </button>
)}
```

**AI Action Dropdown** (lines 230-265):
```typescript
{/* AI Action Dropdown */}
{showAIMenu && (
  <div className="relative mt-2">
    <div className="absolute z-10 w-40" style={{...}}>
      {['Sort', 'Convert', 'Full'].map((action, idx) => (
        <button
          key={action}
          onClick={() => {
            handleAIAction(action.toLowerCase() as 'sort' | 'convert' | 'full')
            setShowAIMenu(false)
          }}
          className="w-full px-4 text-left"
          {...}
        >
          {action}
        </button>
      ))}
    </div>
  </div>
)}
```

**Current Handler in CaptureScreen** (lines 79-87):
```typescript
const handleAIAction = (action: 'sort' | 'convert' | 'full') => {
  if (!inputText.trim()) return

  if (onAICapture) {
    onAICapture(inputText, action)
    setInputText('')
    textareaRef.current?.focus()
  }
}
```

### Problems with Current Flow

1. **Creates items immediately** - pollutes inbox with unprocessed ideas
2. **No preview** - user can't see AI suggestions before committing
3. **No cancel option** - once clicked, item is created
4. **Wasteful** - creates item even if AI fails
5. **Poor UX** - user has to go find the item in Unsorted tab

---

## 2. API Endpoint Documentation

### `/api/ai/suggest` Endpoint

**Location**: `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts`

**Purpose**: Analyze text and return AI suggestion WITHOUT creating an item

**Request Format**:
```typescript
POST /api/ai/suggest
Content-Type: application/json

{
  "text": string  // The idea text to analyze
}
```

**Response Format** (Success):
```typescript
{
  suggested_type: 'note' | 'task' | 'project' | 'list'
  confidence: number  // 0.0-1.0
  processed_text: string  // Cleaned/improved version
  tags: string[]  // Suggested tags
  additional_fields: {
    priority?: number  // 1-3
    due_date?: string  // "YYYY-MM-DD"
    category?: string  // For notes
    estimated_time?: number  // Hours for tasks
    deadline?: string  // "YYYY-MM-DD" for projects
    status?: string  // "pending|in-progress|completed"
    list_name?: string  // For lists
    list_items?: string[]  // For lists
  }
  reasoning: string  // Why this type was chosen
}
```

**Response Format** (Error - AI Disabled):
```typescript
{
  error: 'AI suggestion panel feature is disabled. Enable it in Settings > AI > Features.'
}
Status: 403
```

**Response Format** (Error - Missing Text):
```typescript
{
  error: 'Text is required'
}
Status: 400
```

**Response Format** (Fallback - No API Key):
```typescript
// Returns smart fallback using keyword detection
// Same structure as success response
// confidence: 0.7 (lower than AI)
```

### Implementation Details

**Feature Flag Check** (lines 16-23):
```typescript
const featureEnabled = await aiService.isFeatureEnabled('suggestion_panel')
if (!featureEnabled) {
  return NextResponse.json(
    { error: 'AI suggestion panel feature is disabled. Enable it in Settings > AI > Features.' },
    { status: 403 }
  )
}
```

**Smart Fallback** (lines 105-233):
- Detects entity type from keywords
- Extracts priority from "urgent", "asap", etc.
- Parses dates with regex
- Handles list patterns ("add X to Y list")
- Returns structured suggestion without AI

**Expected Processing Time**:
- With AI: 1-3 seconds (OpenRouter API call)
- Fallback: <100ms (local keyword detection)

**Error Handling**:
- Invalid JSON from AI → Falls back to smart fallback
- Network error → Falls back to smart fallback
- Missing API key → Uses smart fallback
- Feature disabled → Returns 403 error

---

## 3. Component Architecture

### Main App Component

**Location**: `/home/mmariani/Projects/idealisted/app/page.tsx`

**Props Passed to CaptureScreen** (lines 550-560):
```typescript
<CaptureScreen
  onCapture={handleCapture}
  onAICapture={handleAICapture}  // ← Current AI handler
  recentItems={recentItems.map(i => ({
    id: i.id,
    text: i.text,
    entityType: i.type !== 'idea' ? (i.type as Exclude<EntityType, 'idea'>) : null,
    createdAt: i.created_at,
  }))}
/>
```

### CaptureScreen Props Interface

**Location**: `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx` (lines 28-33)

```typescript
interface CaptureScreenProps {
  onCapture: (text: string, entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => void
  onAICapture?: (text: string, action: 'sort' | 'convert' | 'full') => void
  recentItems?: RecentItem[]
  className?: string
}
```

### State Management Pattern

**Current State Variables**:
- `inputText`: string - The textarea content
- `showNoteMenu`: boolean - Note template dropdown visibility
- `showAIMenu`: boolean - AI action dropdown visibility
- `aiEnabled`: boolean - Master AI toggle from settings
- `textareaRef`: React.RefObject - For focus management

**AI Config Fetch** (lines 55-61):
```typescript
useEffect(() => {
  fetch('/api/settings')
    .then(res => res.json())
    .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
    .catch(() => setAiEnabled(false))
}, [])
```

### Button Structure

**Location**: CaptureScreen.tsx lines 150-183

**Button Row**:
1. "✓ Unsorted" - Primary button (creates idea immediately)
2. "Task" - Secondary button (creates task immediately)
3. "Note ▾" - Secondary button with dropdown (creates note with subtype)
4. "Project" - Secondary button (creates project immediately)
5. "List" - Secondary button (creates list immediately)
6. "AI ▾" - Secondary button with dropdown (ONLY if AI enabled)

**Button Classes**:
- Primary: `retro-btn retro-btn-primary`
- Secondary: `retro-btn retro-btn-secondary`
- Entity accent: `retro-btn-accent-{type}` (adds entity color)
- Disabled: `disabled={!inputText.trim()}`

---

## 4. Preview-First Pattern

### New Flow Design

**User Journey**:
1. User types text in textarea
2. User clicks "AI ▾" button
3. **Loading state appears** (spinner/message)
4. **AI analyzes text** via `/api/ai/suggest` POST
5. **Preview panel appears** with AI suggestions
6. User reviews:
   - Suggested entity type (Task/Note/Project/List)
   - Processed text (cleaned/improved)
   - Tags
   - Additional fields (priority, due date, etc.)
   - Reasoning
7. User makes decision:
   - **Accept**: Click suggested type button → Create item with AI data
   - **Change**: Click different type button → Create item with that type
   - **Dismiss**: Close panel → No item created
8. Item is created ONLY when user clicks a type button in panel

### Key Differences from Old Flow

| Aspect | Old Flow (Create-First) | New Flow (Preview-First) |
|--------|-------------------------|--------------------------|
| Item Creation | Immediate | Deferred until user accepts |
| AI Timing | After creation | Before creation |
| User Feedback | None until complete | Loading state + preview |
| Cancel Option | No | Yes (dismiss panel) |
| Preview | No | Yes (full AI analysis) |
| Wasteful Creates | Yes | No |

### Benefits

1. **No pollution** - Inbox stays clean, no abandoned AI items
2. **User control** - See suggestions before committing
3. **Transparency** - Shows reasoning and confidence
4. **Flexibility** - Can pick different type than AI suggested
5. **Efficiency** - One API call instead of two
6. **Better UX** - Clear loading states and feedback

---

## 5. Loading State Patterns

### Existing Loading Patterns in Codebase

**Pattern 1: Simple Boolean State** (`app/page.tsx` lines 53, 163-166)
```typescript
const [loading, setLoading] = useState(true)

// In fetchItems
try {
  const response = await fetch('/api/items')
  const data = await response.json()
  if (data.items) {
    setItems(data.items)
  }
} catch (error) {
  console.error('Failed to fetch items:', error)
} finally {
  setLoading(false)  // ← Always set to false
}

// Render
if (loading) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl text-secondary">Loading...</div>
    </div>
  )
}
```

**Pattern 2: Loading with Disabled Buttons** (`components/EveningReviewFlow.tsx` line 39)
```typescript
const [isLoading, setIsLoading] = useState(false)

// In handler
const handleComplete = async () => {
  setIsLoading(true)
  try {
    // ... async work
  } catch (error) {
    // ... error handling
  } finally {
    setIsLoading(false)
  }
}

// Render
<button
  disabled={isLoading}
  onClick={handleComplete}
>
  {isLoading ? 'Completing...' : 'Complete Review'}
</button>
```

**Pattern 3: Loading with Panel** (`components/ui/AISuggestionPanel.tsx` lines 52-63)
```typescript
if (isLoading) {
  return (
    <RetroCard className="palm-ai-suggestion">
      <div className="flex items-center justify-center py-4">
        <div className="text-center text-xs opacity-70">
          <RetroIcon type="ai" size="md" />
          <p className="mt-2">🤖 AI is analyzing...</p>
        </div>
      </div>
    </RetroCard>
  )
}
```

### Recommended Pattern for Capture Flow

**State Variables Needed**:
```typescript
const [aiLoading, setAiLoading] = useState(false)
const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
const [showAIPanel, setShowAIPanel] = useState(false)
```

**Loading Flow**:
```typescript
const handleAIAnalyze = async () => {
  setAiLoading(true)
  setShowAIMenu(false)  // Close dropdown
  setShowAIPanel(true)  // Show panel

  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText }),
    })

    const data = await response.json()

    if (response.ok) {
      setAiSuggestion(data)
    } else {
      // Show error in panel
      setAiSuggestion(null)
    }
  } catch (error) {
    console.error('AI analysis failed:', error)
    setAiSuggestion(null)
  } finally {
    setAiLoading(false)
  }
}
```

### CSS Classes for Loading

**Available in Retro Design System**:
- `retro-card` - Panel container
- `flex items-center justify-center` - Center content
- `text-xs opacity-70` - Muted loading text
- Button disabled state: `disabled` attribute automatically styled

**No spinner component exists** - Use emoji or text:
- "🤖 AI is analyzing..."
- "⏳ Processing..."
- "💭 Thinking..."

---

## 6. Integration Points

### Point 1: Trigger AI Analysis

**Location**: CaptureScreen AI dropdown button click

**Current Code** (CaptureScreen.tsx lines 238-244):
```typescript
<button
  key={action}
  onClick={() => {
    handleAIAction(action.toLowerCase() as 'sort' | 'convert' | 'full')
    setShowAIMenu(false)
  }}
  {...}
>
  {action}
</button>
```

**New Approach**:
- Remove the dropdown menu (Sort/Convert/Full options)
- Single "AI" button triggers immediate analysis
- Shows loading state while analyzing
- Displays AISuggestionPanel with results

**Integration Change**:
```typescript
{/* AI Button - NEW BEHAVIOR */}
{aiEnabled && (
  <button
    onClick={handleAIAnalyze}  // ← New handler
    disabled={!inputText.trim() || aiLoading}
    className="retro-btn retro-btn-secondary whitespace-nowrap flex-shrink-0"
  >
    {aiLoading ? '⏳ AI...' : 'AI'}
  </button>
)}
```

### Point 2: Pass AI Results to AISuggestionPanel

**AISuggestionPanel Props** (from `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx`):
```typescript
interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
}
```

**Panel Location**: Should render in CaptureScreen below the button row

**Integration Code**:
```typescript
{/* AI Suggestion Panel */}
{showAIPanel && (
  <div className="px-4 mb-4">
    <AISuggestionPanel
      suggestion={aiSuggestion}
      isLoading={aiLoading}
      onApplySuggestion={handleApplySuggestion}
      onDismiss={handleDismissAI}
    />
  </div>
)}
```

### Point 3: Handle AI Analysis Completion

**When Loading Completes**:
1. `aiLoading` becomes `false`
2. `aiSuggestion` contains the data
3. Panel auto-switches from loading state to suggestion display
4. User sees suggestions and can interact

**No additional code needed** - AISuggestionPanel handles this internally

### Point 4: Handle User Decision

**Accept Suggestion** - User clicks type button in panel:
```typescript
const handleApplySuggestion = async (type: 'todo' | 'note' | 'task' | 'project' | 'list') => {
  // Map 'todo' to 'task' (todos are now tasks)
  const entityType = type === 'todo' ? 'task' : type

  // Extract data from AI suggestion
  const text = aiSuggestion?.processed_text || inputText
  const tags = aiSuggestion?.tags || []
  const metadata = aiSuggestion?.additional_fields || {}

  // Create item with AI-enhanced data
  await onCapture(text, entityType, metadata.category)

  // Clean up
  setInputText('')
  setAiSuggestion(null)
  setShowAIPanel(false)
  textareaRef.current?.focus()
}
```

**Dismiss** - User closes panel:
```typescript
const handleDismissAI = () => {
  setAiSuggestion(null)
  setShowAIPanel(false)
  // Keep inputText - user may want to manually capture
}
```

### Point 5: Error Handling

**AI Feature Disabled** (403 response):
```typescript
if (response.status === 403) {
  // Feature is disabled
  setShowAIPanel(false)
  setAiEnabled(false)  // Update local state
  // Optionally show toast/message
}
```

**Network Error**:
```typescript
catch (error) {
  console.error('AI analysis failed:', error)
  setAiSuggestion(null)  // Panel will show "No suggestion"
  // Keep panel open so user sees failure
}
```

**API Returns Smart Fallback** (no API key):
- Treated same as success
- Lower confidence score (0.7 instead of 0.9+)
- User can't tell the difference

---

## 7. Code Examples

### Example 1: Current handleAICapture (BEFORE)

**Location**: `app/page.tsx` lines 227-262

```typescript
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
```

### Example 2: New handleAIAnalyze (AFTER)

**Location**: CaptureScreen.tsx (new handler)

```typescript
const handleAIAnalyze = async () => {
  if (!inputText.trim()) return

  // Set loading state and show panel
  setAiLoading(true)
  setShowAIPanel(true)
  setShowAIMenu(false)  // Close dropdown if open

  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText }),
    })

    const data = await response.json()

    if (response.ok) {
      setAiSuggestion(data)
    } else if (response.status === 403) {
      // Feature disabled
      setAiEnabled(false)
      setShowAIPanel(false)
      console.log('AI feature disabled')
    } else {
      // Other error
      setAiSuggestion(null)
    }
  } catch (error) {
    console.error('AI analysis failed:', error)
    setAiSuggestion(null)
  } finally {
    setAiLoading(false)
  }
}
```

### Example 3: State Management Updates

**Location**: CaptureScreen.tsx (component state)

```typescript
// BEFORE
const [inputText, setInputText] = useState('')
const [showNoteMenu, setShowNoteMenu] = useState(false)
const [showAIMenu, setShowAIMenu] = useState(false)
const [aiEnabled, setAiEnabled] = useState(false)
const textareaRef = useRef<HTMLTextAreaElement>(null)

// AFTER - Add new state
const [inputText, setInputText] = useState('')
const [showNoteMenu, setShowNoteMenu] = useState(false)
const [showAIMenu, setShowAIMenu] = useState(false)  // Can be removed if single AI button
const [aiEnabled, setAiEnabled] = useState(false)
const [aiLoading, setAiLoading] = useState(false)  // ← NEW
const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)  // ← NEW
const [showAIPanel, setShowAIPanel] = useState(false)  // ← NEW
const textareaRef = useRef<HTMLTextAreaElement>(null)
```

### Example 4: Apply Suggestion Handler

**Location**: CaptureScreen.tsx (new handler)

```typescript
const handleApplySuggestion = async (type: 'todo' | 'note' | 'task' | 'project' | 'list') => {
  if (!aiSuggestion) return

  // Map todo to task (backward compatibility)
  const entityType = type === 'todo' ? 'task' : type

  // Use AI-processed text or fallback to original
  const text = aiSuggestion.processed_text || inputText

  // Handle note subtype from AI category
  let subtype: string | undefined
  if (entityType === 'note' && aiSuggestion.additional_fields.category) {
    subtype = aiSuggestion.additional_fields.category
  }

  // Create item with AI data via existing onCapture handler
  onCapture(text, entityType, subtype)

  // Clean up state
  setInputText('')
  setAiSuggestion(null)
  setShowAIPanel(false)
  textareaRef.current?.focus()

  // TODO: In Phase 3 Task 3.2, we'll save AI metadata to item
  // for pre-filling entity modals
}
```

### Example 5: Error Handling Example

**Location**: CaptureScreen.tsx (in handleAIAnalyze)

```typescript
try {
  const response = await fetch('/api/ai/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: inputText }),
  })

  const data = await response.json()

  if (response.ok) {
    // Success - show suggestion
    setAiSuggestion(data)
  } else if (response.status === 403) {
    // Feature disabled in settings
    console.log('AI suggestion panel feature is disabled')
    setAiEnabled(false)
    setShowAIPanel(false)
    // Could show toast: "AI is disabled. Enable in Settings > AI"
  } else if (response.status === 400) {
    // Bad request (shouldn't happen with validation)
    console.error('Invalid request to AI suggest')
    setShowAIPanel(false)
  } else {
    // Other error - show panel with null suggestion
    setAiSuggestion(null)
  }
} catch (error) {
  // Network error or JSON parse error
  console.error('AI analysis failed:', error)
  setAiSuggestion(null)
  // Keep panel open to show error state
} finally {
  setAiLoading(false)
}
```

---

## 8. Testing Scenarios

### Scenario 1: User Clicks AI Button → Loading Appears

**Setup**:
1. AI enabled in settings (`aiEnabled = true`)
2. User types text in textarea
3. Text is valid (not empty)

**Action**: User clicks "AI" button

**Expected Behavior**:
1. `aiLoading` becomes `true`
2. `showAIPanel` becomes `true`
3. AI button shows "⏳ AI..." or similar loading text
4. AI button is disabled (`disabled={!inputText.trim() || aiLoading}`)
5. AISuggestionPanel renders with loading state
6. Panel shows: "🤖 AI is analyzing..." message
7. Fetch request is sent to `/api/ai/suggest`

**Code to Test**:
```typescript
// Click AI button
handleAIAnalyze()

// Assertions
expect(aiLoading).toBe(true)
expect(showAIPanel).toBe(true)
expect(aiButton.disabled).toBe(true)
expect(screen.getByText('🤖 AI is analyzing...')).toBeInTheDocument()
```

### Scenario 2: AI Returns Success → Panel Shows

**Setup**:
1. Loading state active (`aiLoading = true`)
2. `/api/ai/suggest` returns 200 with valid AISuggestion

**Mock Response**:
```json
{
  "suggested_type": "task",
  "confidence": 0.85,
  "processed_text": "Fix login bug in production",
  "tags": ["bug", "urgent", "backend"],
  "additional_fields": {
    "priority": 3,
    "estimated_time": 2
  },
  "reasoning": "Contains action words and urgency indicators"
}
```

**Expected Behavior**:
1. `aiLoading` becomes `false`
2. `aiSuggestion` contains the response data
3. Panel switches from loading to suggestion display
4. User sees:
   - Suggested type: TASK (highlighted)
   - Processed text: "Fix login bug in production"
   - Tags: #bug #urgent #backend
   - Details: Priority 3/3, Est. Time 2h
   - Reasoning: "Contains action words and urgency indicators"
   - Confidence: 85%
   - Action buttons: TASK (primary), NOTE/PROJECT/LIST (secondary)
   - Dismiss button (✕)

**Code to Test**:
```typescript
// Mock API response
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({...mockSuggestion})
})

await handleAIAnalyze()

expect(aiLoading).toBe(false)
expect(aiSuggestion).toEqual(mockSuggestion)
expect(screen.getByText('Fix login bug in production')).toBeInTheDocument()
expect(screen.getByText('85% confidence')).toBeInTheDocument()
```

### Scenario 3: AI Returns Error → Fallback Behavior

**Setup**:
1. Loading state active
2. `/api/ai/suggest` returns 403 (feature disabled)

**Expected Behavior**:
1. `aiLoading` becomes `false`
2. `showAIPanel` becomes `false`
3. `aiEnabled` becomes `false` (updates local state)
4. AI button is hidden (conditional rendering)
5. Console logs: "AI suggestion panel feature is disabled"
6. User sees: AI button disappears

**Alternative**: Network error
1. `aiLoading` becomes `false`
2. `aiSuggestion` becomes `null`
3. `showAIPanel` stays `true`
4. Panel shows error state (handled by AISuggestionPanel internally)

**Code to Test**:
```typescript
// Mock 403 response
mockFetch.mockResolvedValueOnce({
  ok: false,
  status: 403,
  json: async () => ({ error: 'AI suggestion panel feature is disabled...' })
})

await handleAIAnalyze()

expect(aiLoading).toBe(false)
expect(showAIPanel).toBe(false)
expect(aiEnabled).toBe(false)
expect(screen.queryByRole('button', { name: /AI/i })).not.toBeInTheDocument()
```

### Scenario 4: User Cancels During Loading

**Setup**:
1. Loading state active (`aiLoading = true`)
2. Panel is visible with loading message
3. User wants to cancel

**Action**: User clicks dismiss button (✕) in panel

**Expected Behavior**:
1. `showAIPanel` becomes `false`
2. Panel disappears
3. `inputText` is preserved (user can try again)
4. `aiLoading` stays `true` until fetch completes (but panel is hidden)
5. When fetch completes, state is cleaned up but panel stays closed

**Note**: This requires adding dismiss functionality during loading state

**Code to Test**:
```typescript
// During loading
expect(aiLoading).toBe(true)

// User dismisses
handleDismissAI()

expect(showAIPanel).toBe(false)
expect(inputText).toBe('original text')  // Preserved
```

### Scenario 5: User Accepts Suggestion

**Setup**:
1. Panel showing suggestion
2. User sees suggested type: "task"

**Action**: User clicks "TASK" button in panel

**Expected Behavior**:
1. `handleApplySuggestion('task')` is called
2. `onCapture()` is called with:
   - text: "Fix login bug in production" (processed_text)
   - entityType: "task"
   - subtype: undefined (not a note)
3. Item is created via `/api/items` POST
4. State is cleaned up:
   - `inputText` becomes ""
   - `aiSuggestion` becomes `null`
   - `showAIPanel` becomes `false`
5. Textarea is focused
6. Panel disappears
7. Item appears in Ready tab (because it has entity_type)

**Code to Test**:
```typescript
await handleApplySuggestion('task')

expect(onCapture).toHaveBeenCalledWith(
  'Fix login bug in production',
  'task',
  undefined
)
expect(inputText).toBe('')
expect(aiSuggestion).toBeNull()
expect(showAIPanel).toBe(false)
expect(textareaRef.current).toHaveFocus()
```

### Scenario 6: User Changes Type

**Setup**:
1. Panel showing suggestion
2. AI suggested: "task"

**Action**: User clicks "NOTE" button instead

**Expected Behavior**:
1. `handleApplySuggestion('note')` is called
2. Item is created as NOTE type (user overrides AI)
3. Note subtype is taken from AI category field if available
4. Same cleanup flow as Scenario 5

**Code to Test**:
```typescript
await handleApplySuggestion('note')

expect(onCapture).toHaveBeenCalledWith(
  'Fix login bug in production',
  'note',
  'general'  // From AI additional_fields.category
)
```

### Scenario 7: User Dismisses Suggestion

**Setup**:
1. Panel showing suggestion

**Action**: User clicks dismiss button (✕)

**Expected Behavior**:
1. `handleDismissAI()` is called
2. `showAIPanel` becomes `false`
3. `aiSuggestion` becomes `null`
4. `inputText` is PRESERVED (user may want manual capture)
5. Panel disappears
6. User can:
   - Click "✓ Unsorted" to capture manually
   - Edit text and try AI again
   - Clear text and start over

**Code to Test**:
```typescript
const originalText = inputText

handleDismissAI()

expect(showAIPanel).toBe(false)
expect(aiSuggestion).toBeNull()
expect(inputText).toBe(originalText)  // Preserved
```

### Scenario 8: Smart Fallback Works

**Setup**:
1. AI API key not configured
2. User clicks AI button

**Action**: Same as Scenario 1

**Expected Behavior**:
1. Request to `/api/ai/suggest` succeeds
2. Backend uses `generateSmartFallback()` function
3. Returns suggestion based on keyword detection
4. Confidence is 0.7 (lower than AI)
5. Panel shows suggestion same as Scenario 2
6. User can't tell it's fallback (works transparently)

**Example Fallback**:
```json
{
  "suggested_type": "task",
  "confidence": 0.7,
  "processed_text": "buy milk",
  "tags": ["task"],
  "additional_fields": {
    "priority": 1
  },
  "reasoning": "Default task type"
}
```

---

## 9. Implementation Checklist

### Phase 3.1.1: Update CaptureScreen Component

- [ ] Add new state variables to CaptureScreen.tsx:
  - `aiLoading: boolean`
  - `aiSuggestion: AISuggestion | null`
  - `showAIPanel: boolean`
- [ ] Import AISuggestion type from `/types/index.ts`
- [ ] Create `handleAIAnalyze()` handler function
- [ ] Create `handleApplySuggestion()` handler function
- [ ] Create `handleDismissAI()` handler function
- [ ] Update AI button to:
  - Remove dropdown menu
  - Call `handleAIAnalyze()` on click
  - Show loading text when `aiLoading = true`
  - Disable when loading
- [ ] Add AISuggestionPanel render below button row
- [ ] Test all handlers work correctly

### Phase 3.1.2: Remove Old AI Capture Flow

- [ ] Remove `handleAICapture()` from `app/page.tsx`
- [ ] Remove `onAICapture` prop from CaptureScreen
- [ ] Remove AI dropdown menu from CaptureScreen
- [ ] Clean up unused state (`showAIMenu` if single button)
- [ ] Test that old flow is fully removed

### Phase 3.1.3: Integration Testing

- [ ] Test Scenario 1: Loading appears
- [ ] Test Scenario 2: Panel shows suggestion
- [ ] Test Scenario 3: Error handling (403, network)
- [ ] Test Scenario 4: Cancel during loading (if implemented)
- [ ] Test Scenario 5: Accept suggestion
- [ ] Test Scenario 6: Change type
- [ ] Test Scenario 7: Dismiss suggestion
- [ ] Test Scenario 8: Smart fallback works
- [ ] Test with AI enabled and disabled
- [ ] Test with valid and invalid API keys
- [ ] Test error states and edge cases

### Phase 3.1.4: UI/UX Polish

- [ ] Ensure loading state is clear and visible
- [ ] Verify panel animations work (framer-motion)
- [ ] Test panel dismiss button works
- [ ] Verify focus returns to textarea after actions
- [ ] Test on mobile viewport (320px+)
- [ ] Verify retro styling matches design system
- [ ] Test with long text and edge cases

---

## 10. Related Files Reference

**Core Implementation Files**:
- `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx` - Main component to modify
- `/home/mmariani/Projects/idealisted/app/page.tsx` - Parent component with handlers
- `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts` - API endpoint
- `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx` - Preview panel
- `/home/mmariani/Projects/idealisted/types/index.ts` - Type definitions

**Reference Files**:
- `/home/mmariani/Projects/idealisted/styles/retro.css` - Design system
- `/home/mmariani/Projects/idealisted/components/EveningReviewFlow.tsx` - Loading pattern example
- `/home/mmariani/Projects/idealisted/lib/useSpeechRecognition.ts` - Similar hook pattern

**Documentation**:
- `/home/mmariani/Projects/idealisted/CLAUDE.md` - Project overview
- `/home/mmariani/Projects/idealisted/docs/.implementation/phase3/` - Phase 3 docs

---

## 11. Success Criteria

Implementation is complete when:

1. ✅ AI button triggers analysis WITHOUT creating item
2. ✅ Loading state appears during API call
3. ✅ AISuggestionPanel shows preview with AI data
4. ✅ User can accept, change type, or dismiss
5. ✅ Item is created ONLY when user accepts
6. ✅ All 8 test scenarios pass
7. ✅ No items pollute inbox during preview
8. ✅ Error handling works for all cases
9. ✅ Smart fallback works without API key
10. ✅ UI matches retro design system

---

**Context Bundle Version**: 1.0
**Created**: 2025-01-14
**Status**: Ready for implementation
**Next Task**: Phase 3 Task 3.2 - Pre-fill entity modals with AI data

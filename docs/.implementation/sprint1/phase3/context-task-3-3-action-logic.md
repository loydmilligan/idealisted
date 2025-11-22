# Context Bundle: Phase 3 Task 3.3 - Accept/Override/Dismiss Logic

**Task**: Implement user action handlers for accepting, overriding, or dismissing AI suggestions.

**Last Updated**: 2025-11-14

---

## 1. Item Creation API Analysis

### POST /api/items Endpoint

**Location**: `/home/mmariani/Projects/idealisted/app/api/items/route.ts` (lines 156-297)

**Request Format**:
```typescript
interface CreateItemRequest {
  type: 'idea' | 'note' | 'task' | 'project' | 'list'
  text: string
  metadata?: Record<string, any>
  tags?: string[]
  note?: Omit<Note, 'id' | 'item_id'>
  task?: Omit<Task, 'id' | 'item_id'>
  todo?: Omit<Todo, 'id' | 'item_id'> // For backward compatibility
  list?: Omit<List, 'id' | 'item_id'> & { items?: Omit<ListItem, 'id' | 'list_id' | 'created_at'>[] }
  project?: Omit<Project, 'id' | 'item_id'>
}
```

**How It Works**:
1. Creates base `items` table entry with common fields
2. Creates type-specific entry in corresponding table (tasks, notes, projects, lists)
3. Both entries linked via `item_id` foreign key
4. Returns created item with 201 status

**Required Fields by Type**:

**Task** (`body.task`):
```typescript
{
  status: 'pending' | 'in-progress' | 'completed', // Default: 'pending'
  priority: number,                                // 1-5, Default: 1
  tags?: string[],                                 // JSON stringified
  estimated_time?: number | null,                  // hours
  project_id?: string | null,
  due_date?: number | null                         // Unix timestamp
}
```

**Note** (`body.note`):
```typescript
{
  subtype: 'general' | 'research' | 'video' | 'link' | 'file' | 'contact' | 'meeting',
  content?: string | null,
  url?: string | null,
  media_type?: string | null
}
```

**Project** (`body.project`):
```typescript
{
  status: 'planning' | 'active' | 'completed',  // Default: 'planning'
  tags?: string[],                              // JSON stringified
  deadline?: number | null,                     // Unix timestamp
  description?: string | null,
  progress: number,                             // 0-100, Default: 0
  start_date?: number | null,                   // Unix timestamp
  end_date?: number | null                      // Unix timestamp
}
```

**List** (`body.list`):
```typescript
{
  name: string,
  tags?: string[],          // JSON stringified
  description?: string | null,
  items?: Array<{
    text: string,
    done: boolean,
    position: number
  }>
}
```

**Example Request**:
```javascript
const response = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'task',
    text: 'Complete AI suggestion implementation',
    tags: ['ai', 'phase3'],
    task: {
      status: 'pending',
      priority: 3,
      tags: ['development'],
      estimated_time: 4,
      project_id: null,
      due_date: Date.now() + 86400000 // Tomorrow
    }
  })
})

const data = await response.json()
// Returns: { item: Item, status: 201 }
```

---

## 2. Accept Flow

**User Action**: Clicks the primary "Accept" button (e.g., "TASK" button when AI suggests task type)

**What Happens**:
1. Use AI-suggested type from `suggestion.suggested_type`
2. Extract all AI metadata from `suggestion.additional_fields`
3. Create item with suggested type and all extracted data
4. Clear capture textarea
5. Hide/close suggestion panel
6. Show success feedback
7. Trigger tab flash for Files tab with entity color

**Implementation Pattern**:
```typescript
const handleAccept = async () => {
  if (!suggestion) return

  try {
    setIsCreating(true)

    // Build request body based on suggested type
    const requestBody: CreateItemRequest = {
      type: suggestion.suggested_type,
      text: suggestion.processed_text,
      tags: suggestion.tags || []
    }

    // Add type-specific fields
    if (suggestion.suggested_type === 'task') {
      requestBody.task = {
        status: 'pending',
        priority: suggestion.additional_fields.priority || 1,
        tags: suggestion.tags || [],
        estimated_time: suggestion.additional_fields.estimated_time || null,
        project_id: null,
        due_date: suggestion.additional_fields.due_date
          ? parseDateToTimestamp(suggestion.additional_fields.due_date)
          : null
      }
    } else if (suggestion.suggested_type === 'note') {
      requestBody.note = {
        subtype: (suggestion.additional_fields.category as any) || 'general',
        content: suggestion.processed_text,
        url: null,
        media_type: null
      }
    } else if (suggestion.suggested_type === 'project') {
      requestBody.project = {
        status: (suggestion.additional_fields.status as any) || 'planning',
        tags: suggestion.tags || [],
        deadline: suggestion.additional_fields.deadline
          ? parseDateToTimestamp(suggestion.additional_fields.deadline)
          : null,
        description: suggestion.processed_text,
        progress: 0,
        start_date: null,
        end_date: null
      }
    } else if (suggestion.suggested_type === 'list') {
      requestBody.list = {
        name: suggestion.additional_fields.list_name || suggestion.processed_text,
        tags: suggestion.tags || [],
        description: suggestion.processed_text,
        items: (suggestion.additional_fields.list_items || []).map((text, index) => ({
          text,
          done: false,
          position: index
        }))
      }
    }

    // Create item
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Failed to create item')
    }

    const data = await response.json()

    // Success actions
    onClearInput()              // Clear textarea
    onDismissSuggestion()       // Hide panel
    onItemCreated(data.item)    // Notify parent, refresh data
    showSuccessToast(`${suggestion.suggested_type} created successfully!`)

    // Flash Files tab with entity color
    tabNavRef.current?.triggerFlash('files', suggestion.suggested_type)

  } catch (error) {
    console.error('Failed to accept suggestion:', error)
    showErrorToast('Failed to create item. Please try again.')
  } finally {
    setIsCreating(false)
  }
}
```

**Helper: Date Parsing**:
```typescript
function parseDateToTimestamp(dateString: string): number | null {
  if (!dateString) return null

  // Handle various date formats from AI
  // "2025-11-15", "tomorrow", "next week", etc.

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return null
    }
    return date.getTime()
  } catch {
    return null
  }
}
```

---

## 3. Override Flow

**User Action**: Clicks a secondary entity type button (e.g., "NOTE" when AI suggested "task")

**What Happens**:
1. Use clicked entity type instead of AI-suggested type
2. Adapt metadata to fit the new entity type
3. Create item with overridden type
4. Same cleanup and feedback as Accept flow

**Metadata Adaptation Rules**:

| Source Field | → Task | → Note | → Project | → List |
|-------------|--------|--------|-----------|--------|
| `priority` | ✅ Use as-is | ❌ Ignore | ❌ Ignore | ❌ Ignore |
| `due_date` | ✅ Use as-is | ❌ Ignore | ✅ → deadline | ❌ Ignore |
| `estimated_time` | ✅ Use as-is | ❌ Ignore | ❌ Ignore | ❌ Ignore |
| `category` | ❌ Ignore | ✅ → subtype | ❌ Ignore | ❌ Ignore |
| `deadline` | ✅ → due_date | ❌ Ignore | ✅ Use as-is | ❌ Ignore |
| `status` | ✅ Use if valid | ❌ Ignore | ✅ Use if valid | ❌ Ignore |
| `list_name` | ❌ Ignore | ❌ Ignore | ✅ → name (fallback) | ✅ Use as-is |
| `list_items` | ❌ Ignore | ❌ Ignore | ❌ Ignore | ✅ Use as-is |
| `tags` | ✅ Use as-is | ✅ Use as-is | ✅ Use as-is | ✅ Use as-is |
| `processed_text` | ✅ → text | ✅ → text, content | ✅ → text, description | ✅ → name |

**Implementation Pattern**:
```typescript
const handleOverride = async (overrideType: 'task' | 'note' | 'project' | 'list') => {
  if (!suggestion) return

  try {
    setIsCreating(true)

    // Build request with overridden type
    const requestBody: CreateItemRequest = {
      type: overrideType,
      text: suggestion.processed_text,
      tags: suggestion.tags || []
    }

    // Adapt metadata to new type
    if (overrideType === 'task') {
      requestBody.task = {
        status: validateTaskStatus(suggestion.additional_fields.status) || 'pending',
        priority: suggestion.additional_fields.priority || 1,
        tags: suggestion.tags || [],
        estimated_time: suggestion.additional_fields.estimated_time || null,
        project_id: null,
        due_date: suggestion.additional_fields.due_date || suggestion.additional_fields.deadline
          ? parseDateToTimestamp(suggestion.additional_fields.due_date || suggestion.additional_fields.deadline)
          : null
      }
    } else if (overrideType === 'note') {
      requestBody.note = {
        subtype: mapCategoryToSubtype(suggestion.additional_fields.category) || 'general',
        content: suggestion.processed_text,
        url: null,
        media_type: null
      }
    } else if (overrideType === 'project') {
      requestBody.project = {
        status: validateProjectStatus(suggestion.additional_fields.status) || 'planning',
        tags: suggestion.tags || [],
        deadline: suggestion.additional_fields.deadline || suggestion.additional_fields.due_date
          ? parseDateToTimestamp(suggestion.additional_fields.deadline || suggestion.additional_fields.due_date)
          : null,
        description: suggestion.processed_text,
        progress: 0,
        start_date: null,
        end_date: null
      }
    } else if (overrideType === 'list') {
      requestBody.list = {
        name: suggestion.additional_fields.list_name || suggestion.processed_text,
        tags: suggestion.tags || [],
        description: suggestion.processed_text,
        items: (suggestion.additional_fields.list_items || []).map((text, index) => ({
          text,
          done: false,
          position: index
        }))
      }
    }

    // Create item (same as accept flow)
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Failed to create item')
    }

    const data = await response.json()

    // Success actions
    onClearInput()
    onDismissSuggestion()
    onItemCreated(data.item)
    showSuccessToast(`${overrideType} created successfully!`)

    // Flash Files tab with overridden entity color
    tabNavRef.current?.triggerFlash('files', overrideType)

  } catch (error) {
    console.error('Failed to override suggestion:', error)
    showErrorToast('Failed to create item. Please try again.')
  } finally {
    setIsCreating(false)
  }
}

// Helper: Validate status values
function validateTaskStatus(status?: string): 'pending' | 'in-progress' | 'completed' | null {
  if (!status) return null
  if (['pending', 'in-progress', 'completed'].includes(status)) {
    return status as any
  }
  return null
}

function validateProjectStatus(status?: string): 'planning' | 'active' | 'completed' | null {
  if (!status) return null
  if (['planning', 'active', 'completed'].includes(status)) {
    return status as any
  }
  return null
}

// Helper: Map category to note subtype
function mapCategoryToSubtype(category?: string): Note['subtype'] {
  const validSubtypes = ['general', 'research', 'video', 'link', 'file', 'contact', 'meeting']
  if (category && validSubtypes.includes(category)) {
    return category as Note['subtype']
  }
  return 'general'
}
```

---

## 4. Dismiss Flow

**User Action**: Clicks "Dismiss" or "✕" button

**What Happens**:
1. Hide suggestion panel with slide-down animation
2. Re-enable capture textarea
3. Keep user's original input text (don't clear)
4. Reset AI suggestion state
5. No item created

**Implementation Pattern**:
```typescript
const handleDismiss = () => {
  // Animate panel out
  setPanelVisible(false)

  // Clear suggestion data
  setSuggestion(null)

  // Re-enable input (if disabled during AI processing)
  setInputDisabled(false)

  // Focus back to textarea
  textareaRef.current?.focus()

  // Keep original text - DO NOT clear input
  // User may want to edit and re-submit
}
```

**Key Difference from Accept/Override**: Dismiss does NOT clear the textarea. User's text remains for editing.

---

## 5. State Management

**Suggestion Panel State**:
```typescript
interface SuggestionPanelState {
  // AI suggestion data
  suggestion: AISuggestion | null

  // UI state
  isVisible: boolean
  isLoading: boolean      // AI is processing
  isCreating: boolean     // Item is being created

  // Error state
  error: string | null
}
```

**State Transitions**:
```
IDLE → LOADING → SUGGESTION_READY → CREATING → SUCCESS → IDLE
                        ↓
                    DISMISSED → IDLE
```

**State Flow Diagram**:
```
[User types text]
    ↓
[Clicks AI button]
    ↓
isVisible: true
isLoading: true
    ↓
[AI processes]
    ↓
isLoading: false
suggestion: {...}
    ↓
[User sees panel with buttons]
    ↓
┌─────────────┬─────────────┬─────────────┐
│   ACCEPT    │  OVERRIDE   │   DISMISS   │
└─────────────┴─────────────┴─────────────┘
       ↓              ↓              ↓
  isCreating     isCreating      isVisible: false
  = true         = true          suggestion: null
       ↓              ↓
  [POST /api/items]  [POST /api/items]
       ↓              ↓
  SUCCESS        SUCCESS
       ↓              ↓
  isVisible: false
  suggestion: null
  [Clear input]
```

**Implementation**:
```typescript
const [panelState, setPanelState] = useState<SuggestionPanelState>({
  suggestion: null,
  isVisible: false,
  isLoading: false,
  isCreating: false,
  error: null
})

// Helper to update state
const updatePanelState = (updates: Partial<SuggestionPanelState>) => {
  setPanelState(prev => ({ ...prev, ...updates }))
}

// Cleanup after success
const cleanupAfterSuccess = () => {
  updatePanelState({
    isVisible: false,
    suggestion: null,
    isCreating: false,
    error: null
  })
}

// Cleanup after dismiss
const cleanupAfterDismiss = () => {
  updatePanelState({
    isVisible: false,
    suggestion: null,
    error: null
  })
}
```

---

## 6. Error Handling

### Error Scenarios and Responses

**1. API Request Fails (Network Error)**
```typescript
try {
  const response = await fetch('/api/items', { ... })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || 'Failed to create item')
  }

} catch (error) {
  console.error('Create item error:', error)

  updatePanelState({
    isCreating: false,
    error: error instanceof Error ? error.message : 'Network error. Please try again.'
  })

  showErrorToast('Failed to create item. Check your connection.')

  // Keep panel open, allow user to retry
  return
}
```

**2. Validation Error (400 Response)**
```typescript
// API returns validation error
if (response.status === 400) {
  const errorData = await response.json()

  updatePanelState({
    isCreating: false,
    error: errorData.error
  })

  showErrorToast(`Validation error: ${errorData.error}`)

  // Panel stays open, show error message inline
  return
}
```

**3. Invalid Metadata (Sanitize and Continue)**
```typescript
// Sanitize AI-provided metadata before sending
const sanitizeMetadata = (suggestion: AISuggestion, targetType: string) => {
  const metadata: any = {}

  try {
    if (targetType === 'task') {
      // Validate priority
      const priority = suggestion.additional_fields.priority
      metadata.priority = (priority >= 1 && priority <= 5) ? priority : 1

      // Validate status
      const status = suggestion.additional_fields.status
      metadata.status = ['pending', 'in-progress', 'completed'].includes(status)
        ? status
        : 'pending'

      // Safe date parsing
      metadata.due_date = safeParseDateToTimestamp(suggestion.additional_fields.due_date)
      metadata.estimated_time = safeParseNumber(suggestion.additional_fields.estimated_time)
    }

    // ... similar for other types

  } catch (error) {
    console.warn('Metadata sanitization error:', error)
    // Return minimal safe defaults
    return getDefaultMetadata(targetType)
  }

  return metadata
}

function safeParseDateToTimestamp(dateString?: string): number | null {
  if (!dateString) return null

  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return null
    }
    return date.getTime()
  } catch {
    return null
  }
}

function safeParseNumber(value?: any): number | null {
  if (value === undefined || value === null) return null
  const num = Number(value)
  if (isNaN(num)) return null
  return num
}

function getDefaultMetadata(type: string) {
  switch (type) {
    case 'task':
      return { status: 'pending', priority: 1, tags: [], estimated_time: null, due_date: null }
    case 'note':
      return { subtype: 'general', content: '', url: null, media_type: null }
    case 'project':
      return { status: 'planning', tags: [], deadline: null, description: '', progress: 0 }
    case 'list':
      return { name: '', tags: [], description: '', items: [] }
    default:
      return {}
  }
}
```

**4. AI Service Timeout**
```typescript
const handleAITimeout = () => {
  updatePanelState({
    isLoading: false,
    error: 'AI processing timed out. Please try again.'
  })

  showErrorToast('AI request timed out')

  // Offer retry button in panel
}
```

**5. Retry Logic**
```typescript
const handleRetry = async () => {
  updatePanelState({
    error: null,
    isCreating: true
  })

  // Retry the last action (accept or override)
  // Store last attempted action in state
  if (lastAction === 'accept') {
    await handleAccept()
  } else if (lastAction && lastAction.type === 'override') {
    await handleOverride(lastAction.targetType)
  }
}
```

---

## 7. User Feedback

### Success Messages

**Toast/Notification Pattern** (if toast system exists):
```typescript
// Success toast after item creation
showSuccessToast(`${entityType.toUpperCase()} created successfully!`)

// Examples:
// "TASK created successfully!"
// "NOTE created successfully!"
// "PROJECT created successfully!"
```

**Visual Feedback**:
```typescript
// 1. Tab flash animation (already implemented)
tabNavRef.current?.triggerFlash('files', entityType)

// 2. Panel slide-out animation (framer-motion)
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Panel content */}
    </motion.div>
  )}
</AnimatePresence>

// 3. Button loading states
<button
  disabled={isCreating}
  className={`retro-btn ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  {isCreating ? 'Creating...' : 'Accept'}
</button>
```

### Error Messages

**Inline Error Display** (in panel):
```tsx
{error && (
  <div className="retro-error-banner" style={{
    background: 'var(--retro-error-bg)',
    border: '1px solid var(--retro-error-border)',
    padding: '8px 12px',
    marginTop: '8px',
    fontSize: '12px',
    color: 'var(--retro-error-text)'
  }}>
    ⚠️ {error}
    <button
      onClick={handleRetry}
      style={{ marginLeft: '8px', textDecoration: 'underline' }}
    >
      Retry
    </button>
  </div>
)}
```

**Error Toast Pattern**:
```typescript
// Network error
showErrorToast('Failed to create item. Check your connection.')

// Validation error
showErrorToast('Invalid data. Please check your input.')

// Timeout error
showErrorToast('Request timed out. Please try again.')
```

### Loading States

**During AI Processing**:
```tsx
{isLoading && (
  <div className="retro-loading" style={{
    textAlign: 'center',
    padding: '20px',
    fontSize: '12px',
    opacity: 0.7
  }}>
    <div className="retro-spinner" />
    <p style={{ marginTop: '8px' }}>🤖 AI is analyzing...</p>
  </div>
)}
```

**During Item Creation**:
```tsx
{isCreating && (
  <div className="retro-overlay" style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  }}>
    <div className="retro-spinner" />
  </div>
)}
```

### Smooth Transitions

**Panel Animations** (framer-motion):
```tsx
const panelVariants = {
  hidden: {
    y: 100,
    opacity: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: {
    y: 100,
    opacity: 0,
    transition: { duration: 0.3 }
  }
}

<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Panel content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Button Hover States** (retro style):
```css
.retro-btn-suggestion-accept {
  transition: all 0.15s ease;
}

.retro-btn-suggestion-accept:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 0 rgba(0,0,0,0.3);
}

.retro-btn-suggestion-accept:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.3);
}
```

---

## 8. Code Examples

### Complete Accept Handler (Production-Ready)

```typescript
/**
 * Accept AI suggestion and create item with suggested type
 * Handles all entity types, metadata extraction, and error cases
 */
const handleAccept = async () => {
  if (!suggestion) {
    console.warn('No suggestion available to accept')
    return
  }

  try {
    // Update UI state
    updatePanelState({
      isCreating: true,
      error: null
    })

    // Store action for potential retry
    setLastAction('accept')

    // Build base request
    const requestBody: CreateItemRequest = {
      type: suggestion.suggested_type,
      text: suggestion.processed_text,
      tags: suggestion.tags || [],
      metadata: {
        ai_generated: true,
        confidence: suggestion.confidence,
        original_text: inputText // Store original user input
      }
    }

    // Add type-specific fields with sanitization
    switch (suggestion.suggested_type) {
      case 'task':
        requestBody.task = {
          status: validateTaskStatus(suggestion.additional_fields.status) || 'pending',
          priority: clamp(suggestion.additional_fields.priority || 1, 1, 5),
          tags: suggestion.tags || [],
          estimated_time: safeParseNumber(suggestion.additional_fields.estimated_time),
          project_id: null, // TODO: Map from AI if available
          due_date: safeParseDateToTimestamp(suggestion.additional_fields.due_date)
        }
        break

      case 'note':
        requestBody.note = {
          subtype: mapCategoryToSubtype(suggestion.additional_fields.category),
          content: suggestion.processed_text,
          url: null,
          media_type: null
        }
        break

      case 'project':
        requestBody.project = {
          status: validateProjectStatus(suggestion.additional_fields.status) || 'planning',
          tags: suggestion.tags || [],
          deadline: safeParseDateToTimestamp(suggestion.additional_fields.deadline),
          description: suggestion.processed_text,
          progress: 0,
          start_date: null,
          end_date: null
        }
        break

      case 'list':
        const listItems = (suggestion.additional_fields.list_items || [])
          .map((text: string, index: number) => ({
            text: text.trim(),
            done: false,
            position: index
          }))
          .filter(item => item.text.length > 0) // Remove empty items

        requestBody.list = {
          name: suggestion.additional_fields.list_name || suggestion.processed_text,
          tags: suggestion.tags || [],
          description: suggestion.processed_text,
          items: listItems
        }
        break

      default:
        throw new Error(`Unsupported entity type: ${suggestion.suggested_type}`)
    }

    // Create item via API
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    // Parse response
    const data = await response.json()

    if (!data.item) {
      throw new Error('Invalid response: missing item data')
    }

    // Success! Clean up and notify
    cleanupAfterSuccess()
    onClearInput()
    onItemCreated(data.item)

    // User feedback
    showSuccessToast(`${suggestion.suggested_type.toUpperCase()} created successfully!`)

    // Flash Files tab with entity color
    if (tabNavRef.current) {
      tabNavRef.current.triggerFlash('files', suggestion.suggested_type)
    }

    // Optional: Navigate to Files tab
    if (autoNavigateToFiles) {
      navigateToTab('files')
    }

  } catch (error) {
    console.error('Failed to accept suggestion:', error)

    updatePanelState({
      isCreating: false,
      error: error instanceof Error ? error.message : 'Failed to create item. Please try again.'
    })

    showErrorToast('Failed to create item. Please try again.')
  }
}

// Helper functions
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
```

### Complete Override Handler (Production-Ready)

```typescript
/**
 * Override AI suggestion with user-selected entity type
 * Adapts metadata to fit target entity type
 */
const handleOverride = async (overrideType: 'task' | 'note' | 'project' | 'list') => {
  if (!suggestion) {
    console.warn('No suggestion available to override')
    return
  }

  try {
    // Update UI state
    updatePanelState({
      isCreating: true,
      error: null
    })

    // Store action for potential retry
    setLastAction({ type: 'override', targetType: overrideType })

    // Build base request
    const requestBody: CreateItemRequest = {
      type: overrideType,
      text: suggestion.processed_text,
      tags: suggestion.tags || [],
      metadata: {
        ai_generated: true,
        ai_suggested_type: suggestion.suggested_type, // Store what AI suggested
        user_overridden: true,
        confidence: suggestion.confidence,
        original_text: inputText
      }
    }

    // Adapt metadata to target type
    switch (overrideType) {
      case 'task':
        requestBody.task = {
          status: validateTaskStatus(suggestion.additional_fields.status) || 'pending',
          priority: clamp(suggestion.additional_fields.priority || 1, 1, 5),
          tags: suggestion.tags || [],
          estimated_time: safeParseNumber(suggestion.additional_fields.estimated_time),
          project_id: null,
          // Try due_date first, fallback to deadline
          due_date: safeParseDateToTimestamp(
            suggestion.additional_fields.due_date || suggestion.additional_fields.deadline
          )
        }
        break

      case 'note':
        requestBody.note = {
          subtype: mapCategoryToSubtype(suggestion.additional_fields.category),
          content: suggestion.processed_text,
          url: null,
          media_type: null
        }
        break

      case 'project':
        requestBody.project = {
          status: validateProjectStatus(suggestion.additional_fields.status) || 'planning',
          tags: suggestion.tags || [],
          // Try deadline first, fallback to due_date
          deadline: safeParseDateToTimestamp(
            suggestion.additional_fields.deadline || suggestion.additional_fields.due_date
          ),
          description: suggestion.processed_text,
          progress: 0,
          start_date: null,
          end_date: null
        }
        break

      case 'list':
        const listItems = (suggestion.additional_fields.list_items || [])
          .map((text: string, index: number) => ({
            text: text.trim(),
            done: false,
            position: index
          }))
          .filter(item => item.text.length > 0)

        requestBody.list = {
          name: suggestion.additional_fields.list_name
            || suggestion.processed_text.split('\n')[0] // Use first line as name
            || suggestion.processed_text,
          tags: suggestion.tags || [],
          description: suggestion.processed_text,
          items: listItems
        }
        break
    }

    // Create item via API (same as accept flow)
    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data.item) {
      throw new Error('Invalid response: missing item data')
    }

    // Success! Clean up and notify
    cleanupAfterSuccess()
    onClearInput()
    onItemCreated(data.item)

    // User feedback (mention override)
    showSuccessToast(
      `${overrideType.toUpperCase()} created (overridden from ${suggestion.suggested_type})!`
    )

    // Flash Files tab with OVERRIDDEN entity color
    if (tabNavRef.current) {
      tabNavRef.current.triggerFlash('files', overrideType)
    }

    // Optional: Navigate to Files tab
    if (autoNavigateToFiles) {
      navigateToTab('files')
    }

  } catch (error) {
    console.error('Failed to override suggestion:', error)

    updatePanelState({
      isCreating: false,
      error: error instanceof Error ? error.message : 'Failed to create item. Please try again.'
    })

    showErrorToast('Failed to create item. Please try again.')
  }
}
```

### Complete Dismiss Handler (Production-Ready)

```typescript
/**
 * Dismiss AI suggestion without creating item
 * Keeps user's original input text for editing
 */
const handleDismiss = () => {
  // Animate panel out
  updatePanelState({
    isVisible: false
  })

  // Clear suggestion data after animation completes
  setTimeout(() => {
    cleanupAfterDismiss()
  }, 300) // Match exit animation duration

  // Re-enable input (if it was disabled during AI processing)
  setInputDisabled(false)

  // Focus back to textarea for editing
  requestAnimationFrame(() => {
    textareaRef.current?.focus()

    // Position cursor at end of text
    if (textareaRef.current) {
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  })

  // IMPORTANT: Do NOT clear textarea
  // User may want to edit and re-submit

  console.log('AI suggestion dismissed')
}
```

### State Cleanup Helpers

```typescript
/**
 * Clean up state after successful item creation
 */
const cleanupAfterSuccess = () => {
  updatePanelState({
    isVisible: false,
    suggestion: null,
    isCreating: false,
    isLoading: false,
    error: null
  })

  setLastAction(null)
}

/**
 * Clean up state after user dismisses suggestion
 */
const cleanupAfterDismiss = () => {
  updatePanelState({
    suggestion: null,
    isCreating: false,
    isLoading: false,
    error: null
  })

  setLastAction(null)
}
```

---

## 9. Integration Points

### Parent Component (CaptureScreen)

**Required Props**:
```typescript
interface CaptureScreenProps {
  onCapture: (text: string, entityType?: EntityType) => void
  onItemCreated: (item: Item) => void           // NEW: Notify parent of creation
  tabNavRef: React.RefObject<TabNavHandle>      // For triggering tab flashes
  onNavigateToTab?: (tab: TabId) => void        // Optional: Auto-navigate
}
```

**Callback Handlers**:
```typescript
// In parent component (e.g., app/page.tsx)
const handleItemCreated = async (item: Item) => {
  // Refresh items list
  await fetchItems()

  // Optional: Show in-app notification
  setRecentItem(item)

  // Optional: Track analytics
  trackEvent('item_created', {
    type: item.type,
    from_ai: item.metadata?.ai_generated || false
  })
}
```

### AISuggestionPanel Component

**Props Interface**:
```typescript
interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  isVisible: boolean
  isCreating: boolean
  error: string | null
  inputText: string                              // Original user input
  onAccept: () => void
  onOverride: (type: 'task' | 'note' | 'project' | 'list') => void
  onDismiss: () => void
  onRetry?: () => void
}
```

### Tab Navigation Integration

**Trigger Flash After Creation**:
```typescript
// Already implemented in BottomTabNav component
// Reference: /home/mmariani/Projects/idealisted/components/modern/BottomTabNav.tsx

export interface TabNavHandle {
  triggerFlash: (tab: TabId, entityType: Exclude<EntityType, 'idea'> | null) => void
}

// Usage in handlers
tabNavRef.current?.triggerFlash('files', entityType)
```

---

## 10. Testing Checklist

### Accept Flow Tests

- [ ] Accept task suggestion with all metadata
- [ ] Accept note suggestion with category mapping
- [ ] Accept project suggestion with deadline
- [ ] Accept list suggestion with items
- [ ] Accept suggestion with tags
- [ ] Accept suggestion with missing optional fields
- [ ] Textarea clears after successful accept
- [ ] Panel closes after successful accept
- [ ] Files tab flashes with correct entity color
- [ ] Success toast displays

### Override Flow Tests

- [ ] Override task → note (category adapts to subtype)
- [ ] Override note → task (due_date adapts from deadline)
- [ ] Override project → task (deadline adapts to due_date)
- [ ] Override task → project (due_date adapts to deadline)
- [ ] Override list → note (list_name ignored)
- [ ] Override any → list (metadata ignored, items empty)
- [ ] Metadata adaptation preserves tags
- [ ] Metadata adaptation handles invalid values
- [ ] Success toast mentions override

### Dismiss Flow Tests

- [ ] Dismiss hides panel
- [ ] Dismiss keeps textarea text
- [ ] Dismiss re-enables input
- [ ] Dismiss focuses textarea
- [ ] Dismiss clears suggestion state
- [ ] User can edit text after dismiss
- [ ] User can re-submit after dismiss

### Error Handling Tests

- [ ] Network error shows toast
- [ ] Network error keeps panel open
- [ ] Retry button works after error
- [ ] Validation error (400) shows inline message
- [ ] Timeout error shows appropriate message
- [ ] Invalid metadata sanitized (doesn't crash)
- [ ] Missing required fields use defaults

### State Management Tests

- [ ] State transitions: IDLE → LOADING → READY → CREATING → SUCCESS
- [ ] State transitions: READY → DISMISSED → IDLE
- [ ] isCreating prevents double-clicks
- [ ] Error state clears on retry
- [ ] Success clears all state

### UI/UX Tests

- [ ] Panel slides in/out smoothly
- [ ] Buttons show loading state
- [ ] Buttons disabled during creation
- [ ] Error banner displays inline
- [ ] Success toast appears
- [ ] Tab flash animation triggers
- [ ] Focus returns to textarea after dismiss
- [ ] Cursor positioned at end after dismiss

---

## 11. References

### Key Files

- **Item Creation API**: `/home/mmariani/Projects/idealisted/app/api/items/route.ts` (lines 156-297)
- **Item Update API**: `/home/mmariani/Projects/idealisted/app/api/items/[id]/route.ts` (lines 134-382)
- **Type Definitions**: `/home/mmariani/Projects/idealisted/types/index.ts`
- **AI Suggestion Panel**: `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx`
- **Capture Screen**: `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx`
- **Main App Page**: `/home/mmariani/Projects/idealisted/app/page.tsx`
- **API Client**: `/home/mmariani/Projects/idealisted/lib/api-client.ts`

### Current Implementation Patterns

**Item Creation** (from app/page.tsx lines 192-225):
```typescript
const handleCapture = async (text: string, entityType?: Exclude<EntityType, 'idea'> | null, subtype?: string) => {
  try {
    const metadata = entityType && subtype ? { subtype } : undefined

    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        type: entityType || 'idea',
        parsed: !!entityType,
        entity_type: entityType,
        metadata,
      }),
    })

    if (response.ok) {
      await fetchItems()

      // Flash appropriate tab
      if (!entityType) {
        tabNavRef.current?.triggerFlash('unsorted', null)
      } else {
        tabNavRef.current?.triggerFlash('ready', entityType)
      }
    }
  } catch (error) {
    console.error('Failed to capture item:', error)
  }
}
```

**Tab Flash Pattern** (from app/page.tsx):
```typescript
tabNavRef.current?.triggerFlash('files', modalEntity.type)
```

### API Response Format

```typescript
// POST /api/items success response
{
  item: {
    id: string
    type: 'task' | 'note' | 'project' | 'list'
    text: string
    created_at: number
    updated_at: number
    metadata: Record<string, any> | null
    tags: string[]
    archived: boolean
  },
  status: 201
}

// Error response
{
  error: string,
  status: 400 | 404 | 500
}
```

---

## Success Criteria

✅ Accept button creates item with AI-suggested type and all metadata
✅ Override buttons create item with user-selected type and adapted metadata
✅ Dismiss button hides panel and keeps user's text
✅ All flows clear suggestion state appropriately
✅ Error handling prevents crashes and guides user
✅ Success feedback via toast and tab flash
✅ Loading states prevent double-submissions
✅ Smooth animations enhance UX

---

**End of Context Bundle**

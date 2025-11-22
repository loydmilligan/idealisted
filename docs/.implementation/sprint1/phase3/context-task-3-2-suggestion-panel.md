# Context Bundle: Phase 3 Task 3.2 - Enhance AISuggestionPanel Component

**Task Objective**: Display comprehensive AI analysis results with confidence score, reasoning, metadata, and action buttons.

**Document Status**: Complete Context Bundle
**Created**: 2025-01-14
**Target Component**: `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx`

---

## 1. Current AISuggestionPanel Analysis

### Location
- **File**: `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx`
- **Lines**: 1-197

### Current Props Interface
```typescript
interface AISuggestionPanelProps {
  suggestion: AISuggestion | null
  isLoading: boolean
  onApplySuggestion: (type: 'todo' | 'note' | 'task' | 'project' | 'list') => void
  onDismiss: () => void
}
```

### Current State Management
```typescript
const [featureEnabled, setFeatureEnabled] = useState(false)
const [featureCheckComplete, setFeatureCheckComplete] = useState(false)
```

### Feature Flag Check
- Component checks `/api/ai-features` endpoint on mount
- Only renders if `suggestion_panel` feature is enabled (lines 26-50)
- Returns `null` if feature is disabled or check is incomplete

### Current Display Elements

**Loading State** (lines 52-63):
- RetroCard wrapper with class `palm-ai-suggestion`
- Centered AI icon (RetroIcon type="ai")
- Text: "🤖 AI is analyzing..."

**Suggestion Display** (lines 84-195):
- **Header** (lines 87-105):
  - AI icon + "AI SUGGESTION" label
  - Confidence percentage: `{Math.round(suggestion.confidence * 100)}% confidence`
  - Dismiss button (✕) with variant="danger"

- **Processed Text** (lines 108-113):
  - Label: "Suggested Text:"
  - Display in retro-surface background with border

- **Tags** (lines 116-130):
  - Only shown if `suggestion.tags.length > 0`
  - Label: "Tags:"
  - Chips with `#` prefix, retro-primary background

- **Additional Fields** (lines 133-155):
  - Label: "Details:"
  - Conditional display of:
    - Priority (1-3 scale)
    - Due date
    - Category
    - Estimated time (hours)
    - Deadline
    - Status

- **Reasoning** (lines 158-161):
  - Label: "Why:"
  - Italic text with 80% opacity

- **Action Buttons** (lines 164-193):
  - Label: "Convert to:"
  - 2-column grid layout
  - Primary button for suggested type (with icon)
  - Secondary buttons for other entity types (todo, note, task, project)
  - Filters out suggested type from secondary options

### Current Styling Approach
- Uses RetroCard wrapper
- RetroButton components (primary/secondary variants, size="sm")
- RetroIcon for entity type icons
- Utility classes: `space-y-3`, `flex`, `grid grid-cols-2`
- Retro theme classes: `text-xs`, `uppercase`, `tracking-wide`
- Background: `bg-retro-surface`, `bg-retro-primary`
- Border: `border-retro-border`

### Helper Functions
```typescript
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'todo': return <RetroIcon type="task" size="sm" />
    case 'note': return <RetroIcon type="note" size="sm" />
    case 'task': return <RetroIcon type="task" size="sm" />
    case 'project': return <RetroIcon type="project" size="sm" />
    default: return <RetroIcon type="idea" size="sm" />
  }
}

const getTypeLabel = (type: string) => {
  return type.toUpperCase()
}
```

---

## 2. AI Response Structure

### AISuggestion Type Definition
**Location**: `/home/mmariani/Projects/idealisted/types/index.ts` (lines 53-69)

```typescript
export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  confidence: number
  processed_text: string
  tags: string[]
  additional_fields: {
    priority?: number
    due_date?: string
    category?: string
    estimated_time?: number
    deadline?: string
    status?: string
    list_name?: string
    list_items?: string[]
  }
  reasoning: string
}
```

### Data Source: /api/ai/suggest
**Location**: `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts`

**Endpoint**: `POST /api/ai/suggest`
**Request Body**: `{ text: string }`

**Response Flow**:
1. Checks if `suggestion_panel` feature is enabled
2. If OpenRouter API key exists, calls AI API with structured prompt
3. Falls back to `generateSmartFallback()` if no API key or parsing fails
4. Returns AISuggestion JSON object

**AI Prompt Structure** (lines 35-68):
- Asks for JSON with all AISuggestion fields
- Provides rules for type selection
- Guidance on priority (1-3 scale, where 3=urgent, 2=important, 1=normal)
- Tag extraction from context
- Due date/deadline extraction (YYYY-MM-DD format)
- List item extraction for comma-separated items

**Smart Fallback Logic** (lines 105-233):
- Keyword-based type detection
- Priority detection (urgent/asap → 3, important/priority → 2, default → 1)
- Date extraction via regex
- Category detection for notes
- Time estimation extraction
- List parsing logic (handles "add X to Y list" and comma-separated items)

### Confidence Score
- **Range**: 0.0 to 1.0 (float)
- **AI Response**: Variable based on model confidence
- **Fallback**: Always 0.7 (70%)
- **Display**: Multiply by 100 for percentage (e.g., `0.85 → 85%`)

### Reasoning Field
- **Purpose**: Brief explanation of why the suggested type was chosen
- **Length**: 1-2 sentences
- **AI Examples**: "Contains project-related keywords", "Detected from keywords"
- **Fallback Examples**:
  - "Creating new list with 5 items"
  - "Adding item to existing list: groceries"
  - "Contains task-related keywords"
  - "Default task type"

### Metadata Fields Breakdown

**priority** (number):
- Scale: 1-3 (1=normal, 2=important, 3=urgent)
- Detection: Keywords like "urgent", "asap", "important", "priority"
- Display: "Priority: 2/3"

**due_date** (string):
- Format: "YYYY-MM-DD" or natural language ("tomorrow", "next week")
- Detection: Date regex or explicit mentions
- Display: "Due: 2025-01-15"

**category** (string):
- For notes only
- Values: "meeting", "idea", "research", "reference", etc.
- Display: "Category: meeting"

**estimated_time** (number):
- For tasks only
- Unit: hours (float)
- Detection: "2 hours", "30 minutes" → 0.5
- Display: "Est. Time: 2h"

**deadline** (string):
- For projects only
- Format: "YYYY-MM-DD"
- Display: "Deadline: 2025-02-01"

**status** (string):
- For tasks/projects
- Values: "pending", "in-progress", "completed"
- Display: "Status: in-progress"

**list_name** (string):
- For lists only
- Extracted from "add X to Y list" or first item
- Display: Used as list title

**list_items** (string[]):
- For lists only
- Array of individual list items
- Display: Could show count or preview

---

## 3. UI Component Requirements

### Visual Hierarchy (Top to Bottom)

1. **Header Section**
   - AI icon (left)
   - "AI SUGGESTION" label (uppercase, bold, tracking-wide)
   - Confidence score badge (e.g., "85% CONFIDENT")
   - Dismiss button (right, red/danger)

2. **Confidence Visual Bar**
   - **NEW REQUIREMENT**: Progress bar showing confidence level
   - Width: Full container width
   - Height: 4-6px
   - Color: Green gradient based on confidence (low=yellow, mid=green, high=bright green)
   - Position: Below header, above content

3. **AI Reasoning Display**
   - **Emphasized section** with icon
   - Label: "WHY:" or "AI REASONING:"
   - Text: 1-2 sentences in italic
   - Background: Slightly darker retro surface
   - Border: Left accent bar

4. **Suggested Entity Type**
   - Large icon for suggested type
   - Entity type badge with color
   - Label: "RECOMMENDED AS [TYPE]"

5. **Processed Text Preview**
   - Label: "SUGGESTED TEXT:"
   - Display cleaned/improved text
   - Background: Inset retro surface

6. **Extracted Metadata Grid**
   - 2-column grid or flex layout
   - Icon + label for each field
   - Conditional display (only show if present)
   - Examples:
     - 📌 Priority: 3/3 (High)
     - 📅 Due: 2025-01-15
     - 🏷️ Tags: #work, #urgent
     - ⏱️ Est. Time: 2h
     - 📂 Category: meeting
     - 📊 Status: in-progress

7. **Action Buttons Section**
   - Label: "CONVERT TO:" or "CREATE AS:"
   - **Primary Action** (large button):
     - "Accept as [Suggested Type]" (green/primary variant)
     - Full width or prominent position
   - **Override Options** (smaller buttons):
     - Grid layout (2x2)
     - "Create as Task", "Create as Note", etc.
     - Secondary variant
     - Show all types except suggested type

8. **Dismiss Button**
   - Already exists in header (good)
   - Could add "Keep as Idea" option in actions

### Required UI Elements Detail

#### Confidence Score Visual Bar Component
```tsx
<div className="retro-confidence-bar-container">
  <div
    className="retro-confidence-bar-fill"
    style={{
      width: `${suggestion.confidence * 100}%`,
      background: getConfidenceColor(suggestion.confidence)
    }}
  />
</div>
```

**Color Scale**:
- 0-40%: Yellow/warning (`#F5A623`)
- 41-70%: Light green (`#8B9E8B`)
- 71-100%: Bright green (`#7ED321`)

#### AI Reasoning Section
```tsx
<div className="retro-ai-reasoning">
  <div className="flex items-center gap-2 mb-1">
    <RetroIcon type="ai" size="sm" />
    <span className="text-xs font-bold uppercase">Why This Type?</span>
  </div>
  <p className="text-sm italic opacity-80">{suggestion.reasoning}</p>
</div>
```

#### Suggested Type Badge
```tsx
<div className="retro-suggestion-type-badge">
  <div className="flex items-center gap-3">
    {getTypeIcon(suggestion.suggested_type, 'lg')}
    <div>
      <div className="text-xs opacity-70 uppercase">Recommended As</div>
      <div className="text-lg font-bold uppercase flex items-center gap-2">
        {suggestion.suggested_type}
        <span className={`retro-entity-badge retro-entity-badge-${suggestion.suggested_type}`}>
          {suggestion.suggested_type}
        </span>
      </div>
    </div>
  </div>
</div>
```

#### Metadata Display Pattern
```tsx
<div className="retro-metadata-grid grid grid-cols-2 gap-2">
  {suggestion.additional_fields.priority && (
    <div className="retro-metadata-item">
      <span className="retro-meta-icon">📌</span>
      <span className="retro-meta-label">Priority:</span>
      <span className="retro-meta-value">{suggestion.additional_fields.priority}/3</span>
    </div>
  )}
  {/* ... other fields ... */}
</div>
```

#### Action Button Design
```tsx
<div className="retro-suggestion-actions">
  <p className="text-xs font-bold uppercase mb-2">Create As:</p>

  {/* Primary Accept Button */}
  <RetroButton
    onClick={() => onApplySuggestion(suggestion.suggested_type)}
    variant="primary"
    className="w-full mb-3 flex items-center justify-center gap-2"
  >
    {getTypeIcon(suggestion.suggested_type)}
    <span>Accept as {getTypeLabel(suggestion.suggested_type)}</span>
    <span className="text-xs opacity-70">({Math.round(suggestion.confidence * 100)}%)</span>
  </RetroButton>

  {/* Override Options */}
  <p className="text-xs uppercase opacity-70 mb-2">Or Create As:</p>
  <div className="grid grid-cols-2 gap-2">
    {(['task', 'note', 'project', 'list'] as const)
      .filter(type => type !== suggestion.suggested_type)
      .map(type => (
        <RetroButton
          key={type}
          onClick={() => onApplySuggestion(type)}
          variant="secondary"
          size="sm"
          className="flex items-center gap-1"
        >
          {getTypeIcon(type)}
          {getTypeLabel(type)}
        </RetroButton>
      ))}
  </div>
</div>
```

---

## 4. Retro Styling Reference

### Available CSS Classes from retro.css

#### Card/Container Classes
- `.retro-card` - Base card with border and padding (lines 240-245)
- `.retro-card-task` - Task entity left border accent (line 248-250)
- `.retro-card-note` - Note entity left border accent (line 252-254)
- `.retro-card-project` - Project entity left border accent (line 256-258)
- `.retro-card-list` - List entity left border accent (line 260-262)

#### Typography Classes
- `.retro-header` - Monospace, uppercase, 14px (lines 100-106)
- `.retro-header-sm` - 12px header (lines 108-110)
- `.retro-label` - Uppercase label, 12px (lines 117-123)
- `.retro-timestamp` / `.retro-meta` - 12px metadata text (lines 126-130)
- `.retro-badge` - Badge text, 11px bold (lines 133-136)

#### Button Classes
- `.retro-btn-primary` - 3D beveled button (lines 177-194)
- `.retro-btn-secondary` - Flat button (lines 202-218)
- `.retro-btn-sm` - Small button variant (lines 221-224)

#### Entity Badge Classes
- `.retro-entity-badge` - Base badge style (lines 582-592)
- `.retro-entity-badge-task` - Blue task badge (lines 594-597)
- `.retro-entity-badge-note` - Orange note badge (lines 599-602)
- `.retro-entity-badge-project` - Green project badge (lines 604-607)
- `.retro-entity-badge-list` - Purple list badge (lines 609-612)

#### Entity Accent Button Classes
- `.retro-btn-accent-task` - Task color border/hover (lines 615-623)
- `.retro-btn-accent-note` - Note color border/hover (lines 625-633)
- `.retro-btn-accent-project` - Project color border/hover (lines 635-643)
- `.retro-btn-accent-list` - List color border/hover (lines 645-653)

#### CSS Custom Properties
```css
/* Entity colors (70% desaturated) */
--entity-task: #6B8B9E;      /* Muted teal-grey */
--entity-note: #9E8B6B;      /* Muted tan-grey */
--entity-project: #7B9E6B;   /* Muted sage-grey */
--entity-list: #8B6B9E;      /* Muted mauve-grey */

/* Backgrounds */
--palm-bg-primary: #C5D5C5;
--palm-bg-secondary: #B5C5B5;
--palm-screen-base: #8B9E8B;
--palm-screen-dark: #7A8A7A;

/* Borders */
--palm-border: #6B7B6B;
--palm-border-light: #8B9B8B;
--palm-border-dark: #5B6B5B;

/* Text */
--palm-text-dark: #2D3A2D;
--palm-text-secondary: #5B6B5B;
```

#### Progress Bar Pattern (Custom - Needs Creation)
Reference similar patterns in retro.css:
- Badge animations (lines 906-914)
- Flash animations (lines 1650-1750)

**Suggested CSS Addition**:
```css
.retro-confidence-bar-container {
  width: 100%;
  height: 4px;
  background: var(--palm-border-light);
  border: 1px solid var(--palm-border-dark);
  margin: 8px 0;
}

.retro-confidence-bar-fill {
  height: 100%;
  transition: width 300ms ease-out;
}
```

---

## 5. Entity Type Handling

### Entity Type to Icon Mapping
**Source**: RetroIcon component (`/home/mmariani/Projects/idealisted/components/ui/RetroIcon.tsx`)

```typescript
type IconType = 'idea' | 'note' | 'task' | 'project' | 'list' | 'delete' | 'archive' | 'ai' | 'settings' | 'back'

const getTypeIcon = (type: string, size: 'sm' | 'md' | 'lg' = 'sm') => {
  const iconMap: Record<string, IconType> = {
    'idea': 'idea',      // Lightbulb icon (lines 18-26)
    'note': 'note',      // Notepad icon (lines 29-38)
    'task': 'task',      // Checkbox icon (lines 41-48)
    'todo': 'task',      // Legacy: maps to task
    'project': 'project', // Folder icon (lines 51-58)
    'list': 'list',      // List icon (lines 61-69)
  }

  return <RetroIcon type={iconMap[type] || 'idea'} size={size} />
}
```

### Entity Type to Color Mapping
**Source**: Entity color CSS variables

```typescript
const entityColors: Record<string, string> = {
  'task': '#6B8B9E',      // Muted teal-grey (blue tint)
  'note': '#9E8B6B',      // Muted tan-grey (orange tint)
  'project': '#7B9E6B',   // Muted sage-grey (green tint)
  'list': '#8B6B9E',      // Muted mauve-grey (purple tint)
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.71) return '#7ED321' // Bright green
  if (confidence >= 0.41) return '#8B9E8B' // Light green
  return '#F5A623' // Yellow/warning
}
```

### Entity Type Display Labels
```typescript
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'task': 'TASK',
    'note': 'NOTE',
    'project': 'PROJECT',
    'list': 'LIST',
    'todo': 'TASK', // Legacy mapping
  }
  return labels[type] || type.toUpperCase()
}
```

### Entity-Specific Metadata Display
```typescript
const getEntityMetadata = (type: string, fields: AISuggestion['additional_fields']) => {
  switch(type) {
    case 'task':
      return {
        priority: fields.priority,
        due_date: fields.due_date,
        estimated_time: fields.estimated_time,
        status: fields.status,
      }
    case 'note':
      return {
        category: fields.category,
      }
    case 'project':
      return {
        status: fields.status,
        deadline: fields.deadline,
      }
    case 'list':
      return {
        list_name: fields.list_name,
        list_items: fields.list_items,
      }
    default:
      return {}
  }
}
```

---

## 6. Action Button Design Specification

### Button Layout Structure
```
┌─────────────────────────────────────────┐
│ CREATE AS:                              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Accept as TASK (85%)              │ │ <- Primary (full width)
│ └─────────────────────────────────────┘ │
│                                         │
│ Or create as:                           │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ 📝 NOTE     │  │ 📁 PROJECT  │       │ <- Secondary (2x2 grid)
│ └─────────────┘  └─────────────┘       │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ 📋 LIST     │  │             │       │
│ └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────┘
```

### Primary "Accept" Button
- **Text**: "Accept as [TYPE]" or "✓ Create as [TYPE]"
- **Variant**: `primary` (3D beveled, green highlight)
- **Size**: Full width, larger than secondary buttons
- **Icon**: Entity type icon (left)
- **Badge**: Confidence percentage (right, small, muted)
- **Color**: Use entity accent color for hover/active state

### Secondary "Override" Buttons
- **Text**: Entity type name (e.g., "NOTE", "TASK")
- **Variant**: `secondary` (flat, border only)
- **Size**: `sm`
- **Layout**: 2-column grid (`grid grid-cols-2 gap-2`)
- **Icon**: Entity type icon (left)
- **Filter**: Exclude suggested type from options

### Button States
```typescript
interface ButtonState {
  default: string    // Normal state
  hover: string      // Hover with entity color
  active: string     // Pressed/clicked state
  disabled: string   // Disabled (during processing)
  loading: string    // Loading spinner during conversion
}
```

### Action Button Handlers (Stubs)
```typescript
const handleAcceptSuggestion = () => {
  // Call parent callback with suggested type
  onApplySuggestion(suggestion.suggested_type)
}

const handleOverrideType = (type: 'task' | 'note' | 'project' | 'list') => {
  // Call parent callback with overridden type
  onApplySuggestion(type)
}

const handleDismiss = () => {
  // Close panel without converting
  onDismiss()
}
```

### Button Accessibility
- All buttons have clear labels
- Keyboard navigation support (Tab key)
- Enter/Space to activate
- Aria labels for screen readers
- Visual focus states

---

## 7. Metadata Display Patterns

### Tag Display (Chips/Badges)
**Current Implementation** (lines 116-130):
```tsx
{suggestion.tags.length > 0 && (
  <div className="space-y-1">
    <p className="text-xs font-bold uppercase tracking-wide">Tags:</p>
    <div className="flex flex-wrap gap-1">
      {suggestion.tags.map((tag, index) => (
        <span
          key={index}
          className="text-xs bg-retro-primary text-retro-status-text px-2 py-1 rounded border border-retro-border"
        >
          #{tag}
        </span>
      ))}
    </div>
  </div>
)}
```

**Enhanced Pattern**:
```tsx
<div className="retro-suggestion-tags">
  <div className="flex items-center gap-2 mb-1">
    <span className="retro-meta-icon">🏷️</span>
    <span className="text-xs font-bold uppercase">Tags</span>
    <span className="text-xs opacity-60">({suggestion.tags.length})</span>
  </div>
  <div className="flex flex-wrap gap-1">
    {suggestion.tags.slice(0, 5).map((tag, index) => (
      <span
        key={index}
        className="retro-tag-chip text-xs px-2 py-1"
        style={{ background: getTagColor(tag) }}
      >
        #{tag}
      </span>
    ))}
    {suggestion.tags.length > 5 && (
      <span className="text-xs opacity-70">+{suggestion.tags.length - 5} more</span>
    )}
  </div>
</div>
```

### Due Date Display
```tsx
{suggestion.additional_fields.due_date && (
  <div className="retro-metadata-item">
    <span className="retro-meta-icon">📅</span>
    <span className="retro-meta-label">Due:</span>
    <span className="retro-meta-value font-bold">
      {formatDate(suggestion.additional_fields.due_date)}
    </span>
  </div>
)}
```

**Date Formatting Helper**:
```typescript
const formatDate = (dateStr: string): string => {
  // Handle natural language
  if (dateStr === 'today') return 'Today'
  if (dateStr === 'tomorrow') return 'Tomorrow'
  if (dateStr.includes('next week')) return 'Next Week'

  // Parse YYYY-MM-DD
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}
```

### Priority Display
```tsx
{suggestion.additional_fields.priority && (
  <div className="retro-metadata-item">
    <span className="retro-meta-icon">📌</span>
    <span className="retro-meta-label">Priority:</span>
    <span className={`retro-meta-value font-bold ${getPriorityClass(suggestion.additional_fields.priority)}`}>
      {getPriorityLabel(suggestion.additional_fields.priority)}
    </span>
  </div>
)}
```

**Priority Helpers**:
```typescript
const getPriorityLabel = (priority: number): string => {
  const labels: Record<number, string> = {
    1: 'Low (1/3)',
    2: 'Medium (2/3)',
    3: 'High (3/3)',
  }
  return labels[priority] || `${priority}/3`
}

const getPriorityClass = (priority: number): string => {
  if (priority >= 3) return 'text-red-600'
  if (priority >= 2) return 'text-orange-500'
  return 'text-green-600'
}
```

### Project Assignment Display
```tsx
{suggestion.additional_fields.project && (
  <div className="retro-metadata-item">
    <span className="retro-meta-icon">📁</span>
    <span className="retro-meta-label">Project:</span>
    <span className="retro-meta-value">
      {suggestion.additional_fields.project}
    </span>
  </div>
)}
```

### Status Display
```tsx
{suggestion.additional_fields.status && (
  <div className="retro-metadata-item">
    <span className="retro-meta-icon">📊</span>
    <span className="retro-meta-label">Status:</span>
    <span className={`retro-status-badge status-${suggestion.additional_fields.status}`}>
      {suggestion.additional_fields.status.replace('-', ' ')}
    </span>
  </div>
)}
```

**Status Badge Classes** (from retro.css lines 1756-1797):
- `.status-pending` - Gray background
- `.status-in-progress` - Blue background
- `.status-completed` - Green background

### Estimated Time Display
```tsx
{suggestion.additional_fields.estimated_time && (
  <div className="retro-metadata-item">
    <span className="retro-meta-icon">⏱️</span>
    <span className="retro-meta-label">Est. Time:</span>
    <span className="retro-meta-value">
      {formatHours(suggestion.additional_fields.estimated_time)}
    </span>
  </div>
)}
```

**Time Formatting Helper**:
```typescript
const formatHours = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  if (hours % 1 === 0) {
    return `${hours}h`
  }
  return `${hours.toFixed(1)}h`
}
```

### List Items Display (Special Case)
```tsx
{suggestion.additional_fields.list_items && suggestion.additional_fields.list_items.length > 0 && (
  <div className="retro-metadata-item-full">
    <div className="flex items-center gap-2 mb-1">
      <span className="retro-meta-icon">📋</span>
      <span className="text-xs font-bold uppercase">List Items</span>
      <span className="text-xs opacity-60">({suggestion.additional_fields.list_items.length})</span>
    </div>
    <ul className="text-xs space-y-1 ml-4">
      {suggestion.additional_fields.list_items.slice(0, 5).map((item, idx) => (
        <li key={idx}>• {item}</li>
      ))}
      {suggestion.additional_fields.list_items.length > 5 && (
        <li className="opacity-70">... and {suggestion.additional_fields.list_items.length - 5} more</li>
      )}
    </ul>
  </div>
)}
```

---

## 8. Code Examples

### Current Component Structure (Simplified)
```tsx
export function AISuggestionPanel({
  suggestion,
  isLoading,
  onApplySuggestion,
  onDismiss
}: AISuggestionPanelProps) {
  // Feature flag check
  const [featureEnabled, setFeatureEnabled] = useState(false)

  useEffect(() => {
    // Check /api/ai-features
  }, [])

  if (!featureEnabled) return null
  if (isLoading) return <LoadingState />
  if (!suggestion) return null

  return (
    <RetroCard className="palm-ai-suggestion">
      <Header />
      <ProcessedText />
      <Tags />
      <AdditionalFields />
      <Reasoning />
      <ActionButtons />
    </RetroCard>
  )
}
```

### Proposed Enhanced Component Structure
```tsx
export function AISuggestionPanel({
  suggestion,
  isLoading,
  onApplySuggestion,
  onDismiss
}: AISuggestionPanelProps) {
  const [featureEnabled, setFeatureEnabled] = useState(false)
  const [featureCheckComplete, setFeatureCheckComplete] = useState(false)

  // Feature flag check (keep existing)
  useEffect(() => {
    fetch('/api/ai-features')
      .then(res => res.json())
      .then(data => {
        const feature = data.features?.find((f: any) => f.feature_name === 'suggestion_panel')
        setFeatureEnabled(feature?.enabled === 1)
        setFeatureCheckComplete(true)
      })
      .catch(() => {
        setFeatureEnabled(false)
        setFeatureCheckComplete(true)
      })
  }, [])

  if (!featureCheckComplete) return null
  if (!featureEnabled) return null
  if (isLoading) return <LoadingState />
  if (!suggestion) return null

  return (
    <RetroCard className={`palm-ai-suggestion retro-card-${suggestion.suggested_type}`}>
      <div className="space-y-4">
        {/* Header with confidence */}
        <HeaderSection
          confidence={suggestion.confidence}
          onDismiss={onDismiss}
        />

        {/* Confidence visual bar */}
        <ConfidenceBar confidence={suggestion.confidence} />

        {/* AI Reasoning (emphasized) */}
        <ReasoningSection reasoning={suggestion.reasoning} />

        {/* Suggested type badge */}
        <SuggestedTypeBadge
          type={suggestion.suggested_type}
          confidence={suggestion.confidence}
        />

        {/* Processed text preview */}
        <ProcessedTextSection text={suggestion.processed_text} />

        {/* Metadata grid */}
        <MetadataGrid
          type={suggestion.suggested_type}
          fields={suggestion.additional_fields}
          tags={suggestion.tags}
        />

        {/* Action buttons */}
        <ActionButtonsSection
          suggestedType={suggestion.suggested_type}
          confidence={suggestion.confidence}
          onApplySuggestion={onApplySuggestion}
        />
      </div>
    </RetroCard>
  )
}
```

### Confidence Bar Implementation
```tsx
interface ConfidenceBarProps {
  confidence: number
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ confidence }) => {
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 0.71) return '#7ED321' // Bright green
    if (conf >= 0.41) return '#8B9E8B' // Light green
    return '#F5A623' // Yellow
  }

  const getConfidenceLabel = (conf: number): string => {
    if (conf >= 0.71) return 'High Confidence'
    if (conf >= 0.41) return 'Medium Confidence'
    return 'Low Confidence'
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase opacity-70">
          {getConfidenceLabel(confidence)}
        </span>
        <span className="text-xs font-bold">
          {Math.round(confidence * 100)}%
        </span>
      </div>
      <div className="retro-confidence-bar-container">
        <div
          className="retro-confidence-bar-fill"
          style={{
            width: `${confidence * 100}%`,
            background: getConfidenceColor(confidence),
            transition: 'width 300ms ease-out'
          }}
        />
      </div>
    </div>
  )
}
```

### Action Button Handlers (Implementation Stubs)
```tsx
interface ActionButtonsSectionProps {
  suggestedType: 'task' | 'note' | 'project' | 'list'
  confidence: number
  onApplySuggestion: (type: 'task' | 'note' | 'project' | 'list') => void
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  suggestedType,
  confidence,
  onApplySuggestion
}) => {
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await onApplySuggestion(suggestedType)
    } finally {
      setLoading(false)
    }
  }

  const handleOverride = async (type: 'task' | 'note' | 'project' | 'list') => {
    setLoading(true)
    try {
      await onApplySuggestion(type)
    } finally {
      setLoading(false)
    }
  }

  const otherTypes = (['task', 'note', 'project', 'list'] as const)
    .filter(type => type !== suggestedType)

  return (
    <div className="retro-suggestion-actions space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide">Create As:</p>

      {/* Primary Accept Button */}
      <RetroButton
        onClick={handleAccept}
        disabled={loading}
        variant="primary"
        className={`w-full flex items-center justify-center gap-2 retro-btn-accent-${suggestedType}`}
      >
        {loading ? (
          <span className="retro-loading-dots">...</span>
        ) : (
          <>
            {getTypeIcon(suggestedType, 'sm')}
            <span>Accept as {getTypeLabel(suggestedType)}</span>
            <span className="text-xs opacity-70">
              ({Math.round(confidence * 100)}%)
            </span>
          </>
        )}
      </RetroButton>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-retro-border" />
        <span className="text-xs uppercase opacity-50">Or</span>
        <div className="flex-1 h-px bg-retro-border" />
      </div>

      {/* Override Options */}
      <div className="grid grid-cols-2 gap-2">
        {otherTypes.map(type => (
          <RetroButton
            key={type}
            onClick={() => handleOverride(type)}
            disabled={loading}
            variant="secondary"
            size="sm"
            className={`flex items-center gap-1 retro-btn-accent-${type}`}
          >
            {getTypeIcon(type, 'sm')}
            {getTypeLabel(type)}
          </RetroButton>
        ))}
      </div>
    </div>
  )
}
```

### Helper Functions (Complete)
```typescript
// Icon mapping
const getTypeIcon = (type: string, size: 'sm' | 'md' | 'lg' = 'sm') => {
  const iconMap: Record<string, any> = {
    'task': 'task',
    'todo': 'task',
    'note': 'note',
    'project': 'project',
    'list': 'list',
  }
  return <RetroIcon type={iconMap[type] || 'idea'} size={size} />
}

// Label formatting
const getTypeLabel = (type: string): string => {
  return type.toUpperCase()
}

// Date formatting
const formatDate = (dateStr: string): string => {
  if (dateStr === 'today') return 'Today'
  if (dateStr === 'tomorrow') return 'Tomorrow'
  if (dateStr.includes('next week')) return 'Next Week'

  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

// Time formatting
const formatHours = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  return `${hours.toFixed(1)}h`
}

// Priority helpers
const getPriorityLabel = (priority: number): string => {
  const labels: Record<number, string> = {
    1: 'Low (1/3)',
    2: 'Medium (2/3)',
    3: 'High (3/3)',
  }
  return labels[priority] || `${priority}/3`
}

const getPriorityClass = (priority: number): string => {
  if (priority >= 3) return 'text-red-600'
  if (priority >= 2) return 'text-orange-500'
  return 'text-green-600'
}

// Confidence helpers
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.71) return '#7ED321'
  if (confidence >= 0.41) return '#8B9E8B'
  return '#F5A623'
}

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.71) return 'High Confidence'
  if (confidence >= 0.41) return 'Medium Confidence'
  return 'Low Confidence'
}
```

---

## Implementation Checklist

### Phase 1: Visual Enhancements
- [ ] Add confidence score visual bar component
- [ ] Enhance AI reasoning section with prominent styling
- [ ] Add suggested type badge with large icon
- [ ] Improve metadata grid layout (2-column responsive)
- [ ] Add icons to all metadata fields

### Phase 2: Action Buttons
- [ ] Redesign primary "Accept" button (full width, prominent)
- [ ] Add confidence percentage to accept button
- [ ] Create 2x2 grid for override options
- [ ] Add loading states to buttons
- [ ] Implement disabled states during processing

### Phase 3: Data Display
- [ ] Format dates properly (natural language + formatted)
- [ ] Add priority visual indicators (colors)
- [ ] Display list items with count
- [ ] Add tag limit (5 max visible, "+X more")
- [ ] Show status badges with colors

### Phase 4: UX Polish
- [ ] Add divider between accept and override options
- [ ] Implement hover states with entity colors
- [ ] Add keyboard navigation support
- [ ] Ensure mobile responsiveness
- [ ] Test with all entity types

### Phase 5: CSS Additions
- [ ] Create `.retro-confidence-bar-container` class
- [ ] Create `.retro-confidence-bar-fill` class
- [ ] Add `.retro-ai-reasoning` section styling
- [ ] Create `.retro-metadata-grid` layout
- [ ] Add `.retro-metadata-item` styling

---

## Files to Reference During Implementation

1. **Current Component**: `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx`
2. **Type Definitions**: `/home/mmariani/Projects/idealisted/types/index.ts`
3. **Retro Styling**: `/home/mmariani/Projects/idealisted/styles/retro.css`
4. **RetroButton**: `/home/mmariani/Projects/idealisted/components/ui/RetroButton.tsx`
5. **RetroCard**: `/home/mmariani/Projects/idealisted/components/ui/RetroCard.tsx`
6. **RetroIcon**: `/home/mmariani/Projects/idealisted/components/ui/RetroIcon.tsx`
7. **API Route**: `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts`

---

## Success Criteria

### Visual Requirements Met
- ✅ Confidence score displayed as percentage AND visual bar
- ✅ AI reasoning prominently displayed with icon
- ✅ Suggested type shown with large icon and badge
- ✅ All metadata fields have icons and proper formatting
- ✅ Layout is clean, organized, and mobile-friendly

### Functional Requirements Met
- ✅ Primary "Accept" button is prominent and clear
- ✅ Override options are available but secondary
- ✅ Buttons show loading states during processing
- ✅ All entity types are supported
- ✅ Confidence level affects visual presentation

### UX Requirements Met
- ✅ Information hierarchy is clear (reasoning → type → metadata → actions)
- ✅ Entity colors are used consistently
- ✅ Retro aesthetic is maintained throughout
- ✅ Component is fully accessible
- ✅ Responsive on all screen sizes

---

**End of Context Bundle**

This document provides complete context for implementing the enhanced AISuggestionPanel component. All necessary information about data structures, styling patterns, UI requirements, and code examples has been included.

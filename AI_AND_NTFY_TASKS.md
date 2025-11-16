# AI and Notification Features - Task Breakdown

**Master Plan**: See `AI_AND_NTFY_PLAN.md` for high-level phase overview
**Reference**: See `reference-IMPLEMENTATION_UPDATES_V2.md` for scope decisions

---

## Phase 1: Database Foundation ✅ COMPLETE

**Status**: Complete (2025-01-14)
**Documentation**: `docs/.implementation/phase1/`

### Task 1.1: Add Usage Tracking Columns to Tags Table ✅
- Add usage_count (INTEGER DEFAULT 0)
- Add is_default (INTEGER DEFAULT 0)
- Add last_used_at (INTEGER)
- Add index on usage_count DESC
- **Implementation**: lib/db.ts:193-222, 233

### Task 1.2: Seed Default Starter Tags ✅
- Create seedDefaultTags() function
- Seed 25 tags across 4 categories
- All tags with is_default=1, color=#999999
- **Implementation**: lib/db.ts:19-80, 302

### Task 1.3: Add Reminder Columns to Tasks Table ✅
- Add reminder_datetime (INTEGER)
- Add last_notified_at (INTEGER)
- **Implementation**: lib/db.ts:156-175

### Task 1.4: Create AI Feature Settings Table ✅
- Create ai_feature_settings table
- Create seedAIFeatureSettings() function
- Seed 3 features (suggestion_panel, tag_suggestions, daily_summary)
- **Implementation**: lib/db.ts:82-116, 266-273, 369

### Task 1.5: Update TypeScript Type Definitions ✅
- Add Tag interface (8 fields)
- Add AIFeatureSetting interface (3 fields)
- Update Task interface with reminder fields
- **Implementation**: types/index.ts:42-51, 81-92, 166-170

---

## Phase 2: AI Settings UI ✅ COMPLETE

**Status**: Complete (2025-11-14)
**Dependencies**: Phase 1 complete ✅
**Documentation**: `docs/.implementation/phase2/`

### Task 2.1: Create AI Feature Settings API ✅
**Objective**: REST endpoints for managing ai_feature_settings table

**Deliverables**:
- GET `/api/ai-features` - Fetch all feature settings
- PUT `/api/ai-features` - Update specific feature(s)
- Return format: `{ feature_name, enabled, description }[]`

**Files Created**:
- `app/api/ai-features/route.ts` (95 lines)

**Success Criteria**: ✅ 11/11 passed
- ✅ GET returns all 3 features with correct state
- ✅ PUT updates database successfully
- ✅ Changes persist across server restarts
- ✅ Proper error handling
- ✅ Validation and proper HTTP status codes

**Dependencies**: None

---

### Task 2.2: Update AISettingsTab with Feature Toggles ✅
**Objective**: Add UI section for individual AI feature toggles

**Deliverables**:
- "AI Features" section below master toggle
- 3 feature toggles with descriptions:
  - ☑ AI Suggestion Panel
  - ☑ AI Tag Suggestions
  - ☐ AI Daily Summary
- Toggles disabled when master AI toggle is off
- Load/save via `/api/ai-features` endpoint

**Files Modified**:
- `components/modern/settings/AISettingsTab.tsx` (408 lines)

**UI Layout**:
```
Master Toggle: ☑ Enable AI features
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEATURES

☑ AI Suggestion Panel
  Preview AI analysis before creating items.
  Shows confidence score and metadata.

☑ AI Tag Suggestions
  AI-powered tag recommendations when creating
  or editing entities. Prioritizes existing tags.

☐ AI Daily Summary
  AI-generated summary in daily review notification.
  Requires notifications enabled.
```

**Success Criteria**: ✅ 11/11 passed
- ✅ Feature toggles render correctly with proper labels
- ✅ Descriptions match spec exactly
- ✅ Toggles disabled when master off
- ✅ Settings save and reload correctly
- ✅ UI matches retro theme
- ✅ Loading states and error handling

**Dependencies**: Task 2.1 (API endpoint) ✅

---

### Task 2.3: Implement Feature Flag Checking Logic ✅
**Objective**: Add feature flag checks in AI processing flow

**Deliverables**:
- Update AIService with `isFeatureEnabled(featureName)` method
- Load ai_feature_settings from database
- Gate AI operations by feature flag:
  - suggestion_panel: Check before showing AISuggestionPanel
  - tag_suggestions: Check before calling suggestTags()
  - daily_summary: Check before generating summaries

**Files Modified**:
- `lib/ai.ts` - Added isFeatureEnabled() method (296 lines)
- `components/ui/AISuggestionPanel.tsx` - Feature flag check (198 lines)
- `components/modern/EntityModal.tsx` - Tag suggestions gating (278 lines)
- `lib/review.ts` - Daily summary check (259 lines)
- `app/api/ai/suggest/route.ts` - Route-level protection (234 lines)

**Implementation Approach**:
```typescript
// lib/ai.ts
async isFeatureEnabled(featureName: string): Promise<boolean> {
  if (!this.config.enabled) return false // Master toggle check

  const feature = db.prepare(`
    SELECT enabled FROM ai_feature_settings WHERE feature_name = ?
  `).get(featureName)

  return feature?.enabled === 1
}
```

**Success Criteria**: ✅ 9/9 passed
- ✅ isFeatureEnabled() method works correctly
- ✅ Two-tier checking (master + individual)
- ✅ Disabling suggestion_panel hides AISuggestionPanel
- ✅ Tag suggestions prepared for Phase 4
- ✅ Daily summary gated correctly
- ✅ Clear error messages when feature disabled
- ✅ Defense-in-depth (route + component level)
- ✅ Fail-closed error handling

**Dependencies**: Task 2.1 (API endpoint) ✅

---

### Task 2.4: Enhanced Test Connection ✅
**Objective**: Improve test connection to show feature status

**Deliverables**:
- Test shows which features are enabled
- Verify API key works with selected model
- Better error messages (401, 429, 500)
- Display feature availability in test results

**Files Modified**:
- `components/modern/settings/AISettingsTab.tsx` - Enhanced handleTest() method
- `styles/retro.css` - Multi-line message support confirmed

**Enhanced Test Output**:
```
✓ API Key Valid
✓ Model: anthropic/claude-3-haiku
✓ Features Enabled: 2/3
  - AI Suggestion Panel: ✓
  - AI Tag Suggestions: ✓
  - AI Daily Summary: ✗ (disabled)
```

**Success Criteria**: ✅ 5/5 passed
- ✅ Test verifies API key works
- ✅ Shows enabled/disabled feature status
- ✅ Better error messages for common failures (401, 429, 500)
- ✅ Test results formatted clearly with multi-line support
- ✅ Parallel API requests for efficiency

**Dependencies**: Task 2.2 (feature toggle UI) ✅

---

## Phase 3: AI Suggestion Flow

**Status**: In Progress (Tasks 3.1 ✅ and 3.2 ✅ Complete)
**Dependencies**: Phase 2 complete ✅

---

## Context Manifest

### How The Current Capture Flow Works: From Idea to Item Creation

When a user wants to capture an idea in IdeaListed, they interact with the **CaptureScreen** component which is the primary entry point for all new content. Understanding this flow deeply is critical because Phase 3 fundamentally changes WHEN the AI analysis happens - moving it from post-creation to pre-creation (preview-first).

**Current Architecture - Direct Capture Flow**:

The user opens the app and lands on the Capture tab (the default tab, see `app/page.tsx` line 45). The screen displays a retro-styled textarea with the placeholder "Type your idea..." (CaptureScreen.tsx line 125). Below the textarea are 5 action buttons arranged horizontally:

1. **"✓ Unsorted"** (primary button, beveled style) - Captures as an idea without categorization
2. **"Task"** - Captures directly as a task entity
3. **"Note ▾"** - Opens dropdown with note subtypes (general, research, video, link, file, meeting)
4. **"Project"** - Captures as a project entity
5. **"List"** - Captures as a list entity

If AI is enabled (checked via `/api/settings` on component mount, line 68-72), a 6th button appears:
6. **"AI ▾"** - Opens dropdown with AI actions (Sort, Convert, Full)

**The Direct Capture Path (Current Behavior)**:

When the user clicks one of the entity type buttons (Task, Project, List, or a Note subtype), here's what happens:

1. **Frontend Handler** (`CaptureScreen.tsx` lines 82-88):
   - The `handleCapture` function is called with the text and optional entity type/subtype
   - Validation: If `inputText.trim()` is empty, the function returns early (no-op)
   - The function calls the parent's `onCapture` prop handler
   - Locally: `setInputText('')` clears the textarea and refocuses it

2. **Parent Handler** (`app/page.tsx` lines 196-229):
   - The `handleCapture` function constructs a POST request to `/api/items`
   - Body contains: `text`, `type` (entity type or 'idea'), `parsed` (boolean - true if entity type provided), `entity_type`, `metadata` (contains subtype for notes)
   - On success: Calls `fetchItems()` to reload all items from the database
   - Tab flash: If no entity type → flashes 'unsorted' tab, else flashes 'ready' tab with entity color animation

3. **API Route** (`app/api/items/route.ts`):
   - Receives POST request with item data
   - Generates UUID for the item
   - Inserts into `items` table with all fields
   - If entity type is provided AND it's not 'idea', also creates a row in the entity-specific table (tasks, notes, projects, lists)
   - Returns success response with created item

4. **Database State**:
   - New row in `items` table with `type='idea'` or `type='task'|'note'|'project'|'list'`
   - If not an idea: `parsed=1` and `entity_type` set to match `type`
   - If entity type: Corresponding row created in tasks/notes/projects/lists table

5. **UI Update**:
   - Items list refreshes (all tabs re-render with new data)
   - Appropriate tab badge flashes with entity color (600ms animation)
   - Textarea is cleared and ready for next input
   - User can immediately capture another idea

**The AI Capture Path (Current Behavior - Post-Creation)**:

When the user clicks the "AI ▾" dropdown and selects "Sort", "Convert", or "Full", the current flow is:

1. **Frontend Handler** (`CaptureScreen.tsx` lines 90-98):
   - The `handleAIAction` function is called with text and action type
   - Calls parent's `onAICapture` prop handler
   - Clears textarea and refocuses

2. **Parent Handler** (`app/page.tsx` lines 232-263):
   - The `handleAICapture` function is invoked
   - **CRITICAL CHANGE IN PHASE 3**: Currently this handler stores the text in `capturedText` state and sets `isAnalyzing=true`
   - Makes POST request to `/api/ai/suggest` with just the text (NO item created yet)
   - On success: Sets `aiSuggestion` state with the AI response
   - On failure: Shows alert and allows manual sorting

This is the **preview-first** pattern that Phase 3 needs to fully implement. The code structure exists but isn't fully wired up yet.

**AI Suggestion API Endpoint** (`app/api/ai/suggest/route.ts`):

This endpoint is the heart of AI analysis. When called with text, it:

1. **Validation** (lines 12-14): Checks that text is a non-empty string
2. **Feature Flag Check** (lines 16-23): Verifies `suggestion_panel` feature is enabled via `aiService.isFeatureEnabled('suggestion_panel')`
3. **API Key Check** (lines 26-32): If no OpenRouter API key, returns smart fallback suggestion
4. **AI Processing** (lines 35-97):
   - Constructs prompt with text and detailed instructions for response format
   - Requests JSON object with fields: `suggested_type`, `confidence`, `processed_text`, `tags`, `additional_fields`, `reasoning`
   - Additional fields vary by entity type:
     - Tasks: `priority` (1-3), `due_date` (YYYY-MM-DD), `estimated_time` (hours), `status`
     - Notes: `category` (string)
     - Projects: `deadline` (YYYY-MM-DD), `status`
     - Lists: `list_name`, `list_items` (array of strings)
   - Sends request to OpenRouter API with model specified in environment
   - Parses JSON response (handles markdown code block wrapping)
5. **Smart Fallback** (lines 105-233):
   - If AI fails or no API key, uses keyword-based heuristics
   - Detects lists by "list", "shopping", "checklist", "grocery" keywords
   - Detects projects by "project", "launch", "build", "create" keywords
   - Detects tasks by "task", "complete", "finish" keywords
   - Detects notes by "note", "remember", "information" keywords
   - Extracts priority from "urgent", "asap", "important" keywords
   - Extracts dates from YYYY-MM-DD pattern or "tomorrow"/"today" keywords
   - Returns same JSON structure as AI with 0.7 confidence

**AISuggestionPanel Component** (`components/ui/AISuggestionPanel.tsx`):

This is the preview UI that shows AI analysis results. Currently it has:

1. **Feature Flag Loading** (lines 26-39): Fetches `/api/ai-features` to check if `suggestion_panel` is enabled
2. **Loading State** (lines 52-63): Shows "🤖 AI is analyzing..." with spinner
3. **Suggestion Display** (lines 83-195):
   - Header: "AI SUGGESTION" with confidence percentage and dismiss button
   - Processed Text: Shows `suggestion.processed_text` in a bordered box
   - Tags: Displays `suggestion.tags` array as pill badges with # prefix
   - Details: Shows `additional_fields` (priority, due date, category, estimated time, status)
   - Reasoning: Shows `suggestion.reasoning` in italic text
   - Action Buttons: Grid of entity type buttons
     - Primary button: Suggested type (highlighted)
     - Secondary buttons: Other entity types (task, note, project) - allows override

4. **Button Handlers**:
   - Each button calls `onApplySuggestion(type)` with the selected entity type
   - The parent component receives this and creates the item with that type
   - Dismiss button calls `onDismiss()` to hide panel and clear state

**Data Flow Summary**:

```
User types text
  ↓
Clicks "AI ▾" → "Sort" (or other AI action)
  ↓
handleAIAction() in CaptureScreen
  ↓
onAICapture() in app/page.tsx
  ↓
POST /api/ai/suggest with { text }
  ↓
AI analysis (or smart fallback)
  ↓
Returns AISuggestion object
  ↓
setAiSuggestion(data) in app/page.tsx
  ↓
AISuggestionPanel renders with suggestion
  ↓
User clicks entity type button
  ↓
onApplySuggestion(type) in AISuggestionPanel
  ↓
handleAcceptSuggestion(type) in app/page.tsx
  ↓
POST /api/items with AI-extracted metadata
  ↓
Item created in database
  ↓
fetchItems() refreshes UI
  ↓
Tab flash animation
  ↓
Clear suggestion state
```

### What's Already Built (Phase 1 & 2 Foundation)

**Database Schema** (Phase 1):
- `items` table has all necessary fields: `id`, `type`, `text`, `tags`, `metadata`, `parsed`, `entity_type`, `created_at`, `updated_at`, `archived`
- Entity-specific tables: `tasks`, `notes`, `projects`, `lists` with foreign keys to `items.id`
- `ai_feature_settings` table with 3 rows: `suggestion_panel`, `tag_suggestions`, `daily_summary`
- All tables have proper indexes and constraints

**AI Configuration** (Phase 2):
- `AIService.isFeatureEnabled(featureName)` method in `lib/ai.ts` (lines 140-149)
- Two-tier checking: Master AI toggle + individual feature flag
- Feature flags stored in database, loaded on each check
- Returns `false` if master toggle off OR feature disabled
- Defense-in-depth: Both route-level and component-level checks

**Feature Flag UI** (Phase 2):
- Settings > AI tab has master toggle at top
- Below: "AI Features" section with 3 toggles
- Each toggle shows description explaining what it does
- Toggles disabled (grayed out) when master AI toggle is off
- Changes save immediately to database via `/api/ai-features` PUT endpoint

**API Endpoints**:
- `GET /api/ai-features` - Returns all 3 feature settings with `feature_name`, `enabled`, `description`
- `PUT /api/ai-features` - Updates one or more features (array of `{ feature_name, enabled }`)
- `POST /api/ai/suggest` - AI suggestion endpoint (already exists, feature-flag protected)

**UI Components**:
- `AISuggestionPanel` component exists and displays all AI data
- `CaptureScreen` already has props for `aiSuggestion`, `isAnalyzing`, `onAcceptSuggestion`, `onDismissSuggestion`
- Parent component (`app/page.tsx`) already has state: `aiSuggestion`, `isAnalyzing`, `capturedText`

### What Needs To Be Implemented For Phase 3

**Current State Analysis**:

The preview-first infrastructure is **90% complete**. The code exists but has rough edges that need polishing. Here's what's missing or needs improvement:

### Task 3.1: Modify Capture Flow for Preview-First ✅ COMPLETE

**Status**: Completed 2025-11-15

**Implementation** (`app/page.tsx`):
- ✅ Input validation before API call (lines 234-238: empty text check with trim())
- ✅ Better error handling (lines 263-273: graceful fallback instead of browser alert)
- ✅ Metadata transformation with validation (lines 284-330):
  - Date strings converted to timestamps with isNaN validation
  - Task fields validated: priority 1-5, status enum, positive estimated_time
  - All additional_fields properly mapped to database schema
- ✅ Removed redundant API call (lines 354-358: removed non-existent /api/tags/usage endpoint)
- ✅ Tag usage tracking already handled by POST /api/items endpoint

**Code Review Fixes**:
1. Critical: Removed non-existent /api/tags/usage endpoint call
2. Warning: Error state uses valid confidence (0.1 instead of 0)
3. Warning: Date conversion validates timestamp with isNaN check
4. Suggestion: Task field validation (priority 1-5, status enum, positive estimated_time)
5. Suggestion: Input validation pattern (trim before checking empty)

**Success Criteria**: ✅ All met
- ✅ AI button triggers analysis without creating item
- ✅ Empty input validated before API call
- ✅ Error handling shows user-friendly message (no browser alerts)
- ✅ Metadata correctly mapped to database schema (date strings → timestamps)
- ✅ Field validation prevents invalid data (priority 1-5, status enum, etc.)
- ✅ Tag usage already handled by existing POST /api/items endpoint

---

### Task 3.2: Enhance AISuggestionPanel Component ✅
**Objective**: Display comprehensive AI analysis results with visual improvements

**Status**: Complete (2025-11-15)

**Deliverables**:
- ✅ Visual confidence bar (color-coded progress bar)
- ✅ Better formatting for additional fields (icons, labels, proper spacing)
- ✅ Icons for entity type buttons (✓, 📝, 📁, 📋)
- ✅ Empty state handling for tags ("No tags suggested" message)
- ✅ Visual hierarchy improvements

**Files Modified**:
- `components/ui/AISuggestionPanel.tsx` (lines 104-304)

**Implementation Details**:
- **Confidence Bar** (lines 104-131):
  - Visual progress bar with color coding
  - Green: confidence >= 70%
  - Amber (#F59E0B): confidence >= 50%
  - Red (#EF4444): confidence < 50%
  - Low confidence warning shown for < 50%
- **Tags Section** (lines 141-164):
  - Always visible (not conditionally hidden)
  - Empty state: "No tags suggested" italic message
  - Tag pills with retro theme styling
- **Additional Fields** (lines 166-263):
  - Enhanced formatting with icons (⭐, 📅, ⏱️, 📂, 📝)
  - Priority displayed as stars (⭐ repeated)
  - Dates formatted with toLocaleDateString()
  - Status icons (⏳ pending, ▶️ in-progress, ✅ completed)
  - Consistent label width (w-24) for alignment
- **Entity Type Buttons** (lines 272-304):
  - Icons added: ✓ Task, 📝 Note, 📁 Project, 📋 List
  - Flex container with centered icon + text
  - Proper spacing with gap-1

**Code Review Fixes**:
1. Fixed CSS class: `retro-panel` → `retro-card` (line 171)
2. Added defensive date parsing with isNaN validation (lines 188-197, 206-215)
3. All 2 code review warnings resolved

**Success Criteria**: ✅ All 7 met
- ✅ Confidence score displayed as visual progress bar
- ✅ Color-coded confidence (green >= 70%, amber >= 50%, red < 50%)
- ✅ Low confidence warning shown for < 50%
- ✅ Additional fields formatted with labels, icons, and proper spacing
- ✅ Entity type buttons have icons (✓, 📝, 📁, 📋)
- ✅ Empty tags state handled with "No tags suggested" message
- ✅ Visual hierarchy improved (headers, spacing, emphasis)

**Task 3.3: Implement Accept/Override/Dismiss Logic** ✅ MOSTLY DONE

Current state:
- Accept suggestion: `handleAcceptSuggestion` in `app/page.tsx` (lines 266-299) ✅
- Override type: `onApplySuggestion` accepts type parameter ✅
- Dismiss: `handleDismissSuggestion` in `app/page.tsx` (lines 302-307) ✅
- Creates item with AI metadata ✅
- Clears textarea after success ✅
- Tab flash animation ✅

**What's missing**:
- Error handling if item creation fails (currently just logs to console)
- Success feedback (currently silent - maybe show toast notification?)
- Metadata mapping needs validation (ensure AI fields map to database schema correctly)
- Tag integration with tag usage tracking (should call `updateTagUsage` from Phase 4)

**Task 3.4: Add Loading States and Error Handling** ⚠️ PARTIALLY DONE

Current state:
- Loading state shows in AISuggestionPanel ✅ (lines 52-63)
- "Analyzing with AI..." message ✅
- Spinner/loading icon ✅
- Error handling in `handleAICapture` shows alert ❌ (not ideal UX)

**What's missing**:
- Disable ALL buttons during analysis (not just AI button)
- Spinner overlay on textarea (visual feedback where user typed)
- Error messages displayed in UI (not browser alert)
- Retry button on error (allow user to retry without re-typing)
- Fallback to manual sorting on error (already in code but UX is poor)
- Loading progress indicator if AI takes > 2 seconds

### Technical Implementation Details

#### File Locations

**Files to Modify**:
1. `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx` - Enhance UI display
2. `/home/mmariani/Projects/idealisted/app/page.tsx` - Improve handlers and error handling
3. `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx` - Add loading state UI

**Files to Reference (Don't Modify)**:
- `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts` - AI endpoint (already complete)
- `/home/mmariani/Projects/idealisted/types/index.ts` - AISuggestion interface (lines 52-68)
- `/home/mmariani/Projects/idealisted/lib/ai.ts` - AIService with isFeatureEnabled() method

#### Component Props & State Management

**CaptureScreen Props** (lines 30-40):
```typescript
interface CaptureScreenProps {
  onCapture: (text: string, entityType?, subtype?) => void
  onAICapture?: (text: string, action: 'sort' | 'convert' | 'full') => void
  recentItems?: RecentItem[]
  className?: string
  aiSuggestion?: AISuggestion | null      // AI analysis result
  isAnalyzing?: boolean                    // Loading state
  onAcceptSuggestion?: (overrideType?) => void  // User accepts
  onDismissSuggestion?: () => void         // User dismisses
}
```

**Parent State** (`app/page.tsx` lines 63-66):
```typescript
const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)
const [capturedText, setCapturedText] = useState('')
```

**State Transitions**:
1. Initial: `isAnalyzing=false`, `aiSuggestion=null`, `capturedText=''`
2. User clicks AI button: `isAnalyzing=true`, `capturedText=inputText`, `aiSuggestion=null`
3. AI returns: `isAnalyzing=false`, `aiSuggestion=data`, `capturedText` unchanged
4. User accepts: Create item, then reset all to initial state
5. User dismisses: Reset all to initial state without creating item

#### AISuggestion Interface

From `types/index.ts` lines 52-68:
```typescript
export interface AISuggestion {
  suggested_type: 'note' | 'task' | 'project' | 'list'
  confidence: number  // 0.0 to 1.0
  processed_text: string  // Cleaned/improved version of user's text
  tags: string[]  // Suggested tags (lowercase, no # prefix)
  additional_fields: {
    priority?: number  // 1-3 (tasks)
    due_date?: string  // YYYY-MM-DD (tasks)
    category?: string  // (notes)
    estimated_time?: number  // hours (tasks)
    deadline?: string  // YYYY-MM-DD (projects)
    status?: string  // pending|in-progress|completed (tasks/projects)
    list_name?: string  // (lists)
    list_items?: string[]  // (lists)
  }
  reasoning: string  // 1-2 sentences explaining why this type
}
```

#### Metadata Mapping Pattern

When creating item from AI suggestion (`app/page.tsx` lines 273-283):

```typescript
const response = await fetch('/api/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: aiSuggestion.processed_text || capturedText,
    type: entityType,  // Override or suggested_type
    tags: aiSuggestion.tags || [],
    metadata: aiSuggestion.additional_fields || {},
    parsed: true,
    entity_type: entityType,
  }),
})
```

**Critical Mapping Issue**:

The current implementation passes `additional_fields` as `metadata` directly to the API. However, the API expects entity-specific objects (task, note, project, list) with specific field names. There's a mismatch:

- AI returns: `due_date` (string "YYYY-MM-DD")
- API expects: `due_date` (number - Unix timestamp)

- AI returns: `priority` (1-3)
- API expects: `priority` (1-5 for tasks table)

**Required Fix**: In `handleAcceptSuggestion`, transform `additional_fields` into proper entity-specific format before sending to API.

#### UI Enhancement Specifications

**Confidence Bar Visualization**:
```tsx
{/* Instead of just text */}
<div className="confidence-bar">
  <div
    className="confidence-fill"
    style={{ width: `${suggestion.confidence * 100}%` }}
  />
  <span className="confidence-text">{Math.round(suggestion.confidence * 100)}%</span>
</div>
```

**Loading Overlay Pattern**:
```tsx
{isAnalyzing && (
  <div className="absolute inset-0 bg-retro-surface/80 flex items-center justify-center z-10">
    <div className="text-center">
      <RetroIcon type="ai" size="md" className="animate-pulse" />
      <p className="mt-2 text-xs">Analyzing with AI...</p>
    </div>
  </div>
)}
```

**Error Display Pattern**:
```tsx
{errorMessage && (
  <div className="retro-alert retro-alert-danger mb-4">
    <p className="retro-alert-title">AI Analysis Failed</p>
    <p className="retro-alert-message">{errorMessage}</p>
    <div className="retro-alert-actions">
      <button onClick={retryAnalysis} className="retro-btn retro-btn-sm">
        Retry
      </button>
      <button onClick={fallbackToManual} className="retro-btn retro-btn-sm retro-btn-secondary">
        Sort Manually
      </button>
    </div>
  </div>
)}
```

#### Integration Points

**Where AI Suggestion Flow Connects**:

1. **User Input**: CaptureScreen textarea → text input
2. **Trigger**: AI button click → `handleAIAction` → `onAICapture` prop
3. **Analysis**: `handleAICapture` → POST `/api/ai/suggest` → AI processing
4. **Preview**: Response → `setAiSuggestion` → AISuggestionPanel renders
5. **Decision**: User clicks entity button → `onApplySuggestion` → `handleAcceptSuggestion`
6. **Creation**: POST `/api/items` → Database insert → UI refresh
7. **Cleanup**: `setAiSuggestion(null)` → Panel hidden → Ready for next capture

**Feature Flag Chain**:

1. **Frontend Check**: AISuggestionPanel `useEffect` → GET `/api/ai-features` → Check `suggestion_panel` enabled
2. **Backend Check**: `/api/ai/suggest` route → `aiService.isFeatureEnabled('suggestion_panel')` → 403 if disabled
3. **UI Gating**: If frontend check fails, panel doesn't render (returns null)
4. **API Protection**: If backend check fails, returns 403 error with clear message

**Error Handling Chain**:

1. **Network Error**: fetch() throws → catch block → setErrorMessage → Show retry UI
2. **API Error**: response.ok=false → throw error → catch block → Same as network error
3. **AI Parsing Error**: JSON.parse() fails → Backend returns smart fallback → Success path (always succeeds)
4. **Feature Disabled**: 403 response → catch block → Show "feature disabled, enable in settings" message

### Success Criteria for Phase 3 Completion

**Task 3.1 Success Criteria**:
- [ ] AI button triggers analysis without creating item
- [ ] Loading state shows immediately on button click
- [ ] Textarea becomes read-only during analysis (user can't edit)
- [ ] All buttons disabled during analysis (prevent multiple requests)
- [ ] Error handling shows user-friendly message (no browser alerts)
- [ ] Textarea remains visible with original text until user accepts/dismisses

**Task 3.2 Success Criteria**: ✅ All met
- [x] Confidence score displayed as visual bar (not just text percentage)
- [x] AI reasoning shown prominently (larger font, distinct styling)
- [x] Suggested entity type highlighted with icon
- [x] Extracted metadata formatted clearly (labels, values, proper spacing)
- [x] Tags displayed as pill badges (retro theme)
- [x] Empty states handled (no "Tags:" header if tags array empty)

**Task 3.3 Success Criteria**:
- [ ] Accept button creates item with exact AI-suggested type and metadata
- [ ] Override buttons allow changing type while preserving metadata
- [ ] Metadata correctly mapped to database schema (date strings → timestamps, etc.)
- [ ] Dismiss button clears panel and re-enables textarea for editing
- [ ] Textarea cleared only after successful item creation
- [ ] Tag usage tracking integrated (calls `updateTagUsage` for AI-suggested tags)
- [ ] Success feedback shown (toast notification or flash animation)

**Task 3.4 Success Criteria**:
- [ ] Loading state shows immediately (no delay)
- [ ] User knows AI is processing (clear visual feedback)
- [ ] Errors displayed in UI (not console or alert)
- [ ] Retry button available on error
- [ ] Graceful fallback to manual sorting if AI fails
- [ ] Loading progress indicator if processing > 2 seconds
- [ ] All UI elements responsive during loading (no frozen interface)

**Overall Phase 3 Success**:
- [ ] Users can preview AI analysis before creating item
- [ ] Users can accept, override, or reject AI suggestions
- [ ] Loading and error states provide clear feedback
- [ ] Feature flag protection works at both frontend and backend
- [ ] No breaking changes to existing capture flow
- [ ] Manual capture buttons still work if user wants to skip AI
- [ ] AI button only visible when AI master toggle enabled

### Edge Cases & Error Scenarios

**Edge Case 1: User modifies text while AI is analyzing**
- Current: Text cleared immediately on AI button click
- Fix: Keep textarea read-only but visible with original text
- Reasoning: User might want to copy text or compare with AI's processed version

**Edge Case 2: AI suggests entity type user didn't expect**
- Current: Override buttons allow changing type
- Verify: Override preserves all AI-extracted metadata (tags, priority, etc.)
- UX: Make override buttons equal size/prominence (not hidden as "secondary")

**Edge Case 3: AI returns confidence < 50%**
- Current: Panel shows regardless of confidence
- Consider: Add warning banner if confidence < 0.6 ("Low confidence - review carefully")
- UX: Encourage user to override or dismiss if AI isn't confident

**Edge Case 4: Network timeout during AI call**
- Current: fetch() waits indefinitely (browser default ~2 minutes)
- Fix: Add timeout to fetch (AbortController with 30-second limit)
- UX: Show specific "request timed out" message, offer retry

**Edge Case 5: User clicks AI button, then immediately clicks manual button**
- Current: Both requests fire (race condition)
- Fix: Disable ALL buttons during AI analysis
- State: isAnalyzing flag should gate all button handlers

**Edge Case 6: AI feature disabled mid-session**
- Current: Frontend checks on mount only
- Consider: Re-check feature flag on each AI button click (fresh validation)
- UX: Show clear message "AI features were disabled by admin"

**Edge Case 7: Empty or whitespace-only input**
- Current: API returns 400 error
- Fix: Frontend validation before API call (check `text.trim().length > 0`)
- UX: Disable AI button if textarea is empty (same as entity buttons)

**Edge Case 8: AI returns malformed JSON**
- Current: Backend has fallback to smart heuristics
- Verify: Fallback always returns valid AISuggestion object
- Logging: Log parse errors for debugging but don't expose to user

---

### Task 3.1: Modify Capture Flow for Preview-First
**Objective**: AI processes BEFORE item creation

**Deliverables**:
- Update handleAICapture in capture screen
- Add loading states
- Call /api/ai/suggest BEFORE creating item
- Show AISuggestionPanel with results

**Files to Modify**:
- `app/page.tsx` or capture screen component
- `components/modern/screens/CaptureScreen.tsx`

**Success Criteria**:
- AI button triggers analysis without creating item
- Loading state shows during processing
- Textarea becomes read-only during analysis
- Falls back gracefully on error

---

### Task 3.2: Enhance AISuggestionPanel Component
**Objective**: Display comprehensive AI analysis results

**Deliverables**:
- Show confidence score (visual bar)
- Display AI reasoning (1-2 sentences)
- Show suggested entity type with icon
- Display extracted metadata (tags, due date, priority)
- Action buttons for each entity type
- Dismiss button

**Files to Modify**:
- `components/ui/AISuggestionPanel.tsx`

**Success Criteria**:
- All AI analysis data displayed clearly
- Confidence bar visual and accurate
- Reasoning shown in readable format
- Metadata displayed appropriately

---

### Task 3.3: Implement Accept/Override/Dismiss Logic
**Objective**: User can review and act on AI suggestions

**Deliverables**:
- Accept button creates item with suggested type + metadata
- Override buttons allow changing entity type
- Dismiss button returns to normal capture flow
- Clear textarea after successful creation

**Files to Modify**:
- Capture screen component
- AISuggestionPanel

**Success Criteria**:
- Accept creates item correctly
- Override changes type but keeps metadata
- Dismiss clears panel and re-enables input
- Textarea cleared on success

---

### Task 3.4: Add Loading States and Error Handling
**Objective**: Clear feedback during AI processing

**Deliverables**:
- Spinner overlay on textarea
- "Analyzing with AI..." message
- Disable all buttons during processing
- Error messages for failed analysis
- Fallback to manual sorting on error

**Success Criteria**:
- Loading state shows immediately on AI click
- User knows processing is happening
- Errors displayed clearly
- Graceful fallback on failure

---

## Phase 4: AI Tag Suggestions ✅ COMPLETE

**Status**: Complete (2025-11-15)
**Dependencies**: Phase 2 complete (feature flags) ✅, Phase 1 complete (tags table) ✅
**Documentation**: Code review passed with comprehensive improvements

### Task 4.1: Create /api/ai/suggest-tags Endpoint ✅
**Objective**: AI-powered tag suggestions with existing tag reuse

**Deliverables**:
- POST endpoint accepting entity text and type
- Fetch top 50 existing tags by usage
- Include existing tags in AI prompt
- Parse AI response
- Return tags with source indicator (existing vs new)

**Files Created**:
- `app/api/ai/suggest-tags/route.ts` (182 lines)

**AI Prompt Strategy**:
- Request 3-5 tags total
- Instruction: Include 1-3 from existing pool if confidence >= 70%
- Return JSON with tag, source, confidence, reason

**Implementation Details**:
- Feature flag protected (`tag_suggestions`)
- Validates entityType parameter (task, note, project, list)
- Validates text input (non-empty, proper type)
- Fetches top 50 existing tags ordered by usage_count DESC
- AI prompt emphasizes reusing existing tags (confidence >= 70%)
- Parses JSON response with fallback for markdown code blocks
- Uses Map for O(1) tag lookups (performance optimization)
- Filters suggestions by confidence >= 60%
- Sorts: existing tags first, then by confidence
- Returns enriched tags with usage_count for existing tags
- Comprehensive error handling with specific status codes

**Success Criteria**: ✅ All met
- ✅ Endpoint returns 3-5 tag suggestions
- ✅ Existing tags prioritized when relevant
- ✅ Source field indicates existing vs new
- ✅ Confidence scores included
- ✅ Input validation and sanitization
- ✅ Transaction-based atomic operations
- ✅ Proper error messages

---

### Task 4.2: Implement Existing Tag Reuse Logic ✅
**Objective**: Prioritize tags user already has

**Deliverables**:
- Query top 50 tags by usage_count
- Include in AI prompt context
- AI returns mix of existing and new tags
- Track which suggestions are accepted

**Files Modified**:
- `app/api/ai/suggest-tags/route.ts`

**Implementation Details**:
- Top 50 tags query: `SELECT name, usage_count FROM tags WHERE usage_count > 0 ORDER BY usage_count DESC LIMIT 50`
- Existing tags listed in AI prompt with emphasis on reuse
- AI confidence threshold: >= 70% for existing tags
- Frontend threshold: >= 60% for all displayed suggestions
- Visual indicators: ● for existing, ○ for new tags
- Sorting priority: existing tags first, then by confidence

**Success Criteria**: ✅ All met
- ✅ Existing tags appear in suggestions when relevant
- ✅ New tags only when existing don't fit
- ✅ Confidence threshold (70%) enforced in AI prompt
- ✅ Usage count displayed for existing tags

---

### Task 4.3: Update EntityModal UI with Tag Suggestions ✅
**Objective**: UI for requesting and applying tag suggestions

**Deliverables**:
- "Suggest Tags" button below tag input
- Loading state while fetching suggestions
- Display suggested tags with confidence %
- Visual indicator: existing (●) vs new (○)
- Individual click-to-add buttons
- "Accept All" button

**Files Modified**:
- `components/modern/EntityModal.tsx`

**UI Implementation**:
- Button: "🏷️ Suggest Tags" (uses emoji for visual appeal)
- Loading state: "Analyzing..." message while processing
- Suggested tags display: confidence %, usage count, source indicator
- Individual ADD buttons for each tag
- "Accept All" and "Dismiss" action buttons
- Gated by: AI master toggle + tag_suggestions feature flag
- Works for all entity types (task, note, project, list)

**Success Criteria**: ✅ All met
- ✅ Button triggers tag suggestion API
- ✅ Suggestions display with all metadata
- ✅ Click individual tag to add
- ✅ "Accept All" adds all suggestions
- ✅ Duplicates not added
- ✅ Works for all entity types
- ✅ Proper loading and error states

---

### Task 4.4: Tag Usage Tracking ✅
**Objective**: Track tag usage for intelligent suggestions

**Deliverables**:
- updateTagUsage() helper function
- Increment usage_count when tags added
- Decrement usage_count when tags removed
- Update last_used_at timestamp
- Integration in item creation/update APIs

**Files Modified**:
- `lib/db.ts` - Added updateTagUsage() function (lines 391-436)
- `app/api/items/route.ts` (POST) - Integrated tag tracking
- `app/api/items/[id]/route.ts` (PUT) - Integrated tag tracking

**Implementation Details**:
- Input validation and sanitization (lowercase, alphanumeric + hyphens)
- Tag name length: 1-50 characters
- Regex validation: `/^[a-z0-9-_]+$/`
- Transaction-based atomic updates
- Auto-creates tags if they don't exist
- Increments usage_count on add
- Decrements usage_count on remove (never below 0)
- Updates last_used_at timestamp
- Prepared statements for performance
- JSDoc documentation

**Success Criteria**: ✅ All met
- ✅ Individual tag add works
- ✅ Accept All adds all tags
- ✅ No duplicate tags
- ✅ UI updates immediately
- ✅ Usage tracking integrated in all item operations
- ✅ Atomic database operations
- ✅ Input validation prevents invalid tags

---

## Phase 5: Task Reminders

**Status**: In Progress (Tasks 5.1 ✅, 5.3 ✅ Complete)
**Dependencies**: Phase 1 complete (reminder_datetime column) ✅

### Task 5.1: Add Reminder DateTime UI to Task Modal ✅
**Objective**: User can set when to be reminded

**Status**: Complete (2025-11-15)

**Deliverables**:
- ✅ Reminder checkbox in task modal (disabled if no due date)
- ✅ Quick reminder presets: Morning of (9 AM), 1hr before (4 PM), 1 day before (9 AM)
- ✅ Custom datetime picker option
- ✅ Human-readable display with locale formatting
- ✅ Past-time warning ("This reminder is in the past")
- ✅ API integration (GET/POST/PUT) with reminder_datetime field

**Files Modified**:
- `app/page.tsx` (lines 790-917) - Reminder UI section in Task modal
- `app/api/items/route.ts` (lines 20, 89, 208, 220) - Added reminder_datetime to GET/POST
- `app/api/items/[id]/route.ts` (lines 16, 70, 245, 255, 260, 272) - Added reminder_datetime to GET/PUT

**Implementation Details**:
- Checkbox requires due date to be set first (UX improvement)
- Four quick preset buttons: Morning of, 1hr before, 1 day before, Custom
- Active preset highlighted with retro-btn-primary styling
- Custom option reveals datetime-local input
- Reminder data persisted in modalData.reminder_datetime (Unix timestamp)
- Display box shows formatted time with month/day/year/hour/minute
- Past-time validation with red warning message
- State management: reminderEnabled, reminderOption, reminderDatetime, reminder_datetime

**Success Criteria**: ✅ All met
- ✅ Checkbox enables reminder picker
- ✅ Quick options set datetime correctly (Morning: 9 AM, 1hr: 4 PM, 1 day: 9 AM day before)
- ✅ Custom picker allows any datetime
- ✅ Relative time displayed clearly with locale formatting
- ✅ Past-time warning shows when reminder < current time
- ✅ Reminder data saves/loads from database
- ✅ UX improvement: Checkbox disabled without due date

---

### Task 5.2: Implement Quick Reminder Options
**Objective**: Fast reminder time selection

**Deliverables**:
- "Morning of" - Due date at 9:00 AM
- "1 hour before" - Due date minus 1 hour
- "1 day before" - Due date minus 24 hours at 9:00 AM
- "Custom" - Full datetime picker

**Success Criteria**:
- Each option calculates datetime correctly
- UI updates to show selected time
- Saves reminder_datetime to database

---

### Task 5.3: Create CRON Job for Reminder Checks ✅
**Objective**: Periodic check for upcoming task reminders

**Status**: Complete (2025-11-15)

**Deliverables**:
- ✅ CRON job runs every minute (better UX than 15-minute interval)
- ✅ Query tasks with reminder_datetime <= now
- ✅ Filter by status (not completed)
- ✅ Check last_notified_at to prevent duplicates (1-hour minimum)
- ✅ Send notification via existing ntfyService.notifyTaskDue()
- ✅ Update last_notified_at timestamp after successful notification

**Files Modified**:
- `lib/db.ts` - Added index on tasks.reminder_datetime (line 363)
- `lib/scheduler.ts` - Added global declarations, cron job setup, checkAndNotifyReminders() method
- `app/layout.tsx` - Re-enabled scheduler by uncommenting import

**Implementation Details**:
- Extended SchedulerService with checkAndNotifyReminders() method
- Cron schedule: `'* * * * *'` (every minute for timely notifications)
- Query filters:
  - reminder_datetime IS NOT NULL
  - reminder_datetime <= current time (due now or overdue)
  - status != 'completed' (don't notify completed tasks)
  - last_notified_at IS NULL OR > 1 hour ago (prevents spam)
- Sends notifications via ntfyService.notifyTaskDue(taskText, dueTime)
- Updates last_notified_at timestamp on successful notification
- Database index added for performance: `idx_tasks_reminder ON tasks(reminder_datetime)`
- Mutex lock (`__reminder_check_is_running`) prevents concurrent executions
- Global variable pattern (`__reminder_check_cron_task`) for HMR compatibility
- Comprehensive logging (start, count, success, failure, completion)

**Code Review**: ✅ 0 critical issues, 4 warnings fixed
1. ✅ Removed unused columns from query (priority, due_date not needed)
2. ✅ Removed redundant comment about notification format
3. ✅ Added NTFY disabled detection (early return if NTFY not configured)
4. ✅ Moved index to consolidated index section (line 363)

**Success Criteria**: ✅ All met
- ✅ CRON runs reliably every minute
- ✅ Only tasks with due reminders notified
- ✅ No duplicate notifications (1-hour minimum between notifications)
- ✅ last_notified_at updated correctly after each notification
- ✅ Performance optimized with database index
- ✅ Graceful handling when NTFY disabled
- ✅ Scheduler re-enabled in production (app/layout.tsx)

## Context Manifest

### How The Existing CRON System Works

The application already has a CRON-based scheduler infrastructure that was built for daily review notifications, but it's currently **disabled in Beta MVP** due to console warnings. Understanding this existing system is critical because we'll be extending it (not building from scratch) to add task reminder checking.

**Current State - Daily Review CRON**:

When the application starts on the server side, the initialization flow goes like this:

1. **Entry Point (Disabled)**: `app/layout.tsx` line 4 has a commented import: `// import '@/lib/init'`. This import is disabled because it was causing console warnings every minute: `[NODE-CRON] [WARN] missed execution` (documented in `UNUSED_CODE.md` lines 108-135).

2. **Initialization Module**: `lib/init.ts` contains the `initializeServices()` function that:
   - Checks a global flag `__scheduler_initialized` to survive hot-reloads during development
   - Only runs server-side (checks `typeof window !== 'undefined'`)
   - Calls `schedulerService.start()` to begin the CRON loop
   - Sets a global flag to prevent duplicate initialization

3. **Scheduler Service**: `lib/scheduler.ts` implements the `SchedulerService` class with this architecture:
   - Uses `node-cron` dependency (already installed - see `package.json` lines with `"node-cron": "^4.2.1"`)
   - Maintains a global cron task reference: `global.__daily_review_cron_task`
   - Runs every minute: `cron.schedule('* * * * *', async () => { ... })`
   - Has a mutex lock `__daily_review_is_running` to prevent concurrent executions
   - Inside the cron callback (lines 47-136):
     - Loads daily review settings from database (`SELECT value FROM settings WHERE key = 'daily_review'`)
     - Checks if review is enabled and ntfy is configured
     - Compares current time `HH:mm` against configured time (e.g., "19:00")
     - Checks if review was already sent today via `reviewService.hasReviewBeenSentToday()`
     - If all conditions pass, generates review and sends notification via `ntfyService.sendNotification()`
     - Updates settings to mark review as sent

**Why This Pattern Exists**:

The global variables pattern (`global.__daily_review_cron_task`, `global.__scheduler_initialized`) is essential for Next.js development because:
- Next.js has hot-module-replacement (HMR) during development
- Without globals, each hot-reload would create duplicate cron jobs
- Globals persist across module reloads, allowing cleanup of old tasks before creating new ones
- The scheduler checks if a task exists and calls `.stop()` before creating a new one (lines 19-23)

**Database Schema for Scheduled Tasks**:

The tasks table (created in Phase 1, see `lib/db.ts` lines 178-211) has the exact columns we need:
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  priority INTEGER DEFAULT 1,
  tags TEXT,
  estimated_time INTEGER,
  project_id TEXT,
  due_date INTEGER,
  reminder_datetime INTEGER,      -- Unix timestamp (milliseconds) - when to notify
  last_notified_at INTEGER,       -- Unix timestamp (milliseconds) - last notification sent
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
)
```

The `reminder_datetime` column stores when the user wants to be reminded (set via Task 5.1's UI). The `last_notified_at` column tracks when we last sent a notification for this task, which prevents spam (requirement: don't notify more than once per hour).

**Data Flow for Finding Due Reminders**:

To find tasks that need notifications, we need to query:
```sql
SELECT task.*, i.text, i.type
FROM tasks task
JOIN items i ON i.id = task.item_id
WHERE task.reminder_datetime IS NOT NULL
  AND task.reminder_datetime <= ?  -- Current time (or window end)
  AND task.status != 'completed'   -- Don't notify for completed tasks
  AND (
    task.last_notified_at IS NULL
    OR task.last_notified_at < ?   -- More than 1 hour ago (3600000 ms)
  )
ORDER BY task.reminder_datetime ASC
```

The API routes (`app/api/items/[id]/route.ts` lines 245, 255 and `app/api/items/route.ts` lines 208, 220) already handle reading and writing `reminder_datetime` - we just need to query and update `last_notified_at`.

### How The Notification System Works

The notification infrastructure is fully built and operational via the `NtfyService` class in `lib/notify.ts`. Understanding how to send notifications is straightforward because the service is already battle-tested for daily reviews.

**NtfyService Architecture**:

The service is a singleton (`export const ntfyService = new NtfyService()`) that:

1. **Configuration Loading** (lines 16-31):
   - Loads config from database: `SELECT value FROM settings WHERE key = 'ntfy_config'`
   - Config structure (see `types/index.ts` lines 172-179):
     ```typescript
     interface NtfyConfig {
       enabled: boolean
       server: string        // e.g., "https://ntfy.sh"
       topic: string         // User's channel/topic
       username?: string     // Optional auth
       password?: string     // Optional auth
       priority: 'default' | 'low' | 'high' | 'urgent'
     }
     ```
   - Config is stored as JSON string in the settings table
   - Also loads `notification_events` config which controls which events trigger notifications

2. **Sending Notifications** (lines 65-125):
   The `sendNotification()` method is the core interface:
   ```typescript
   async sendNotification(
     title: string,           // e.g., "⏰ Task Due Soon"
     message: string,         // e.g., "Buy groceries is due at 5:00 PM"
     actions?: Array<{        // Optional clickable actions
       action: string,        // Action ID
       label: string,         // Button text
       url?: string,          // Where clicking goes
       clear?: boolean        // Dismiss notification after click
     }>,
     priority: 'default' | 'low' | 'high' | 'urgent' = 'default'
   ): Promise<{ success: boolean, id?: string, error?: string }>
   ```

   Under the hood it:
   - Validates config is enabled
   - Sanitizes header values (removes newlines, limits length)
   - Uses axios to POST to `${config.server}/${config.topic}`
   - Message goes in body as plain text
   - Metadata (title, priority, tags, actions) go in headers
   - Handles basic auth if configured
   - Returns success/failure result

3. **Pre-Built Task Notification Method** (lines 174-193):
   There's already a `notifyTaskDue()` helper:
   ```typescript
   async notifyTaskDue(taskText: string, dueTime: string) {
     return this.sendNotification(
       '⏰ Task Due Soon',
       `"${taskText}" is due at ${dueTime}`,
       [
         {
           action: 'complete',
           label: 'Mark Complete',
           url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/todos/complete`,
           clear: true
         },
         {
           action: 'snooze',
           label: 'Snooze',
           clear: true
         }
       ],
       'urgent'
     )
   }
   ```

   This method is EXACTLY what we need - we just need to call it with the task text and a human-readable due time string. The action buttons provide nice UX but won't work until we implement the action handlers (which can be a follow-up task).

**Event-Based Notification Control**:

The service has event-aware methods (lines 210-257) that check if specific events are enabled before sending. For task reminders, we should follow this pattern by checking `isEventEnabled('taskDueSoon')` - though we'll need to add this event to the `notification_events` configuration in the database.

**Error Handling**:

All notification methods return `{ success: boolean, error?: string, skipped?: boolean }`. The CRON job should:
- Log successful notifications
- Log failures with error messages
- Continue processing other reminders if one fails (don't let one error break the whole batch)

### What Needs To Be Implemented For Task Reminders

Now that we understand the existing infrastructure, implementing task reminder checking involves **extending** the scheduler service, not building from scratch.

**1. Modify lib/scheduler.ts to Add Reminder Checking**:

The file already has the structure we need - we just add a second cron job:

```typescript
class SchedulerService {
  // Existing daily review task...

  // NEW: Add reminder check task
  start() {
    // ... existing daily review cron setup ...

    // Add reminder check cron (runs every minute)
    if (global.__reminder_check_cron_task) {
      global.__reminder_check_cron_task.stop()
      global.__reminder_check_cron_task = undefined
    }

    global.__reminder_check_cron_task = cron.schedule('* * * * *', async () => {
      await this.checkAndNotifyReminders()
    })
  }

  private async checkAndNotifyReminders() {
    if (global.__reminder_check_is_running) return

    try {
      global.__reminder_check_is_running = true

      // 1. Query tasks with due reminders
      // 2. Filter by last_notified_at (1 hour minimum)
      // 3. Send notifications via ntfyService
      // 4. Update last_notified_at timestamps
      // 5. Log results
    } finally {
      global.__reminder_check_is_running = false
    }
  }
}
```

**2. Database Query Logic**:

The query needs to find tasks where:
- `reminder_datetime` is not null
- `reminder_datetime` is <= current time (task is due now or overdue)
- `status` is not 'completed' (don't notify for done tasks)
- `last_notified_at` is null OR more than 1 hour ago (prevent spam)

Implementation:
```typescript
const now = Date.now()
const oneHourAgo = now - (60 * 60 * 1000)  // 3600000 milliseconds

const dueTasks = db.prepare(`
  SELECT task.id, task.reminder_datetime, task.last_notified_at,
         i.text, task.due_date, task.priority
  FROM tasks task
  JOIN items i ON i.id = task.item_id
  WHERE task.reminder_datetime IS NOT NULL
    AND task.reminder_datetime <= ?
    AND task.status != 'completed'
    AND (task.last_notified_at IS NULL OR task.last_notified_at < ?)
  ORDER BY task.reminder_datetime ASC
`).all(now, oneHourAgo)
```

**3. Notification Sending Pattern**:

For each due task:
```typescript
for (const task of dueTasks) {
  try {
    // Format due time as human-readable
    const dueTime = task.due_date
      ? new Date(task.due_date).toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : 'soon'

    // Send notification using existing helper
    const result = await ntfyService.notifyTaskDue(task.text, dueTime)

    if (result.success) {
      // Update last_notified_at
      db.prepare(`
        UPDATE tasks SET last_notified_at = ? WHERE id = ?
      `).run(now, task.id)

      console.log(`[Reminder] Sent notification for task: ${task.text}`)
    } else {
      console.error(`[Reminder] Failed to notify task ${task.id}:`, result.error)
    }
  } catch (error) {
    console.error(`[Reminder] Error processing task ${task.id}:`, error)
    // Continue with next task
  }
}
```

**4. Re-Enable CRON System**:

Once implemented, we need to re-enable the scheduler by uncommenting the import in `app/layout.tsx`:
```typescript
// Change this:
// import '@/lib/init'

// To this:
import '@/lib/init'
```

However, we should first verify that the console warnings are resolved. The warnings (`[NODE-CRON] [WARN] missed execution`) occur when the system is under load or the callback takes longer than the cron interval. With two cron jobs running every minute, we need to ensure:
- Both callbacks are protected with mutex locks (done)
- Both callbacks are fast (queries should be indexed)
- Callbacks don't overlap (mutex prevents this)

**5. Logging Strategy**:

For debugging and monitoring, we should log:
- When the cron job runs: `[Reminder Check] Running at ${new Date().toISOString()}`
- How many tasks were found: `[Reminder Check] Found ${dueTasks.length} tasks needing notification`
- Each successful notification: `[Reminder] Sent notification for task: ${taskText}`
- Each failure: `[Reminder] Failed to notify task ${taskId}: ${error}`
- When the check completes: `[Reminder Check] Completed in ${elapsedMs}ms`

Logs should go to console.log/console.error (standard for Next.js server logs). No need for a separate log file or database table unless the user requests it later.

**6. Performance Considerations**:

The query should be fast because:
- We already have an index on tasks table: `CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)` (though this is on the legacy todos table)
- We should add an index on `reminder_datetime` to speed up our query:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder_datetime)
  ```
- The query filters on indexed columns first (reminder_datetime, status)
- Expected volume: most users will have < 100 tasks with reminders
- Query should execute in < 10ms

**7. Edge Cases to Handle**:

- **Task deleted after reminder set**: The FOREIGN KEY ON DELETE CASCADE handles this - deleted items auto-delete task records
- **Task completed after reminder set**: The status check in the query filters these out
- **Reminder time in the past**: The query includes overdue reminders (reminder_datetime <= now), so they'll be caught on next run
- **Multiple reminders for same task**: The last_notified_at check prevents re-notification within 1 hour
- **NTFY not configured**: The ntfyService checks config.enabled and returns early if disabled
- **Database locked**: SQLite WAL mode (enabled in lib/db.ts line 16) prevents this
- **Server restart**: Cron jobs restart when server restarts, picks up where it left off

### Technical Reference Details

#### File Locations

**Existing Files to Modify**:
- `/home/mmariani/Projects/idealisted/lib/scheduler.ts` - Add `checkAndNotifyReminders()` method
- `/home/mmariani/Projects/idealisted/lib/init.ts` - Already calls scheduler.start(), no changes needed
- `/home/mmariani/Projects/idealisted/app/layout.tsx` - Uncomment line 4 to re-enable scheduler

**Files to Reference (Don't Modify)**:
- `/home/mmariani/Projects/idealisted/lib/notify.ts` - Use existing ntfyService.notifyTaskDue()
- `/home/mmariani/Projects/idealisted/lib/db.ts` - Use existing db instance for queries
- `/home/mmariani/Projects/idealisted/types/index.ts` - Reference Task interface (lines 81-92)

#### Database Operations

**Query Pattern** (read-only):
```typescript
import { db } from './db'

const now = Date.now()
const oneHourAgo = now - 3600000

const tasks = db.prepare(`...`).all(now, oneHourAgo)
```

**Update Pattern** (write):
```typescript
db.prepare(`
  UPDATE tasks SET last_notified_at = ? WHERE id = ?
`).run(Date.now(), taskId)
```

**Recommended Index** (add to lib/db.ts initializeDatabase function):
```typescript
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder_datetime);
`)
```

#### Cron Schedule Syntax

The `node-cron` package uses standard cron syntax:
- `'* * * * *'` = every minute
- `'*/15 * * * *'` = every 15 minutes
- `'0 * * * *'` = every hour on the hour
- `'0 9,12,18 * * *'` = at 9am, 12pm, and 6pm

For task reminders, we want frequent checking (every minute) to ensure timely notifications, even though the requirement says "every 15 minutes". Checking every minute has negligible performance impact and provides better UX.

#### Global Variables for Next.js HMR

Required globals (add to scheduler.ts):
```typescript
declare global {
  var __reminder_check_cron_task: any | undefined
  var __reminder_check_is_running: boolean | undefined
}
```

#### Environment Considerations

**Development vs Production**:
- Development: Hot-reload causes frequent restarts, globals prevent duplicates
- Production: Single initialization on server start, runs continuously
- No environment-specific code needed - the pattern works for both

**Server-Side Only**:
- CRON jobs only run server-side (Next.js server component)
- The `lib/init.ts` already has server-side check: `if (typeof window !== 'undefined') return`
- No browser compatibility concerns

#### Error Handling Pattern

```typescript
try {
  const result = await ntfyService.notifyTaskDue(text, time)
  if (result.success) {
    // Update database
    // Log success
  } else {
    // Log failure but continue
    console.error('[Reminder] Notification failed:', result.error)
  }
} catch (error) {
  // Catch any unexpected errors
  console.error('[Reminder] Unexpected error:', error)
  // Continue with next task
}
```

#### Integration Points

**Where CRON Job Connects**:
1. Database: Reads tasks table, updates last_notified_at
2. Notification Service: Calls ntfyService.notifyTaskDue()
3. Initialization: Started by lib/init.ts on server startup
4. Configuration: Respects ntfy_config.enabled from settings table

**What This Task Does NOT Include**:
- Creating UI for reminder settings (that's a separate task)
- Implementing action button handlers (Mark Complete, Snooze)
- Adding quiet hours support (can be added later)
- Email/SMS notifications (only NTFY)

---

**Implementation Checklist**:

- [ ] Add reminder check cron job to SchedulerService.start()
- [ ] Implement checkAndNotifyReminders() private method
- [ ] Add global variables for HMR support
- [ ] Query due tasks with proper filters
- [ ] Send notifications using ntfyService.notifyTaskDue()
- [ ] Update last_notified_at after successful notification
- [ ] Add index on tasks.reminder_datetime for performance
- [ ] Log all notification attempts (success/failure)
- [ ] Test with various edge cases (completed tasks, past reminders, etc.)
- [ ] Uncomment import in app/layout.tsx to enable scheduler
- [ ] Verify no console warnings during operation
- [ ] Document any configuration needed in settings table

---

### Task 5.4: Notification Integration
**Objective**: Send task reminders via NTFY

**Deliverables**:
- Format: "⏰ Task Due Soon: {task text}"
- Include due time in message
- Action buttons: Mark Complete, Snooze, View
- Respect quiet hours setting

**Files to Modify**:
- `lib/notify.ts`

**Success Criteria**:
- Notifications sent successfully
- Message format clear
- Action buttons work (if implemented)
- Quiet hours respected

---

## Phase 6: Scheduled Summary

**Status**: Not Started
**Dependencies**: Phase 1 complete (ai_feature_settings), Phase 2 complete (feature flags)

### Task 6.1: Create Summary Aggregation Service
**Objective**: Collect daily activity metrics

**Deliverables**:
- Count ideas captured today
- Count ideas converted today
- Count tasks completed today
- Count tasks due today
- Optional: AI-generated insights

**Files to Create**:
- `lib/summary-service.ts`

**Success Criteria**:
- All metrics calculated correctly
- Efficient database queries
- Returns structured summary object

---

### Task 6.2: Implement CRON Jobs for Scheduled Times
**Objective**: Send summaries at configured times

**Deliverables**:
- CRON jobs for 9am, 12pm, 6pm
- Check if user enabled that time slot
- Generate summary
- Send via NTFY if activity exists

**Files to Modify**:
- `lib/scheduler.ts`

**Success Criteria**:
- Jobs run at correct times
- Only send if user opted in
- Don't send empty summaries

---

### Task 6.3: Design Notification Format
**Objective**: Clear, actionable summary notifications

**Deliverables**:
- Title: "📊 {Time} Summary - {Date}"
- Message with metrics
- Action buttons: View Inbox, Start Planning

**Files to Modify**:
- `lib/notify.ts`

**Success Criteria**:
- Format readable and useful
- Metrics accurate
- Actions functional

---

### Task 6.4: Create Settings UI for Summary Preferences
**Objective**: User controls when to receive summaries

**Deliverables**:
- Enable/disable activity summaries
- Choose which times (9am/12pm/6pm)
- Select which metrics to include

**Files to Create/Modify**:
- `components/modern/settings/NotificationsTab.tsx`

**Success Criteria**:
- UI clear and intuitive
- Settings save correctly
- CRON jobs respect preferences

---

## Phase 7: Onboarding Wizard

**Status**: Not Started
**Dependencies**: All features complete

### Task 7.1: Create Spotlight/Tooltip System
**Objective**: Interactive tour overlay system

**Deliverables**:
- TourSpotlight component (SVG overlay with cutout)
- TourTooltip component (step content display)
- Animated pulsing border around target
- Prevents interaction with non-highlighted elements

**Files to Create**:
- `components/ui/TourSpotlight.tsx`
- `components/ui/TourTooltip.tsx`

**Success Criteria**:
- Spotlight highlights correct elements
- Tooltip positions correctly
- Animations smooth
- Blocks interaction appropriately

---

### Task 7.2: Create Welcome Modal
**Objective**: First launch greeting

**Deliverables**:
- Welcome modal on first app launch
- "Take Tour" button
- "Skip for now" button
- "Don't show again" checkbox

**Files to Create**:
- `components/modern/WelcomeModal.tsx`

**Success Criteria**:
- Shows on first launch only
- Buttons work correctly
- Preference saves

---

### Task 7.3: Define Tour Steps
**Objective**: Content for each tour step

**Deliverables**:
- 7-8 tour steps with content
- Step 1: Capture screen
- Step 2: Buttons
- Step 3: AI Suggestions (conditional)
- Step 4: Unsorted tab
- Step 5: Ready tab
- Step 6: Files tab
- Step 7: Settings
- Step 8: Complete

**Files to Create**:
- `lib/tour-steps.tsx`

**Success Criteria**:
- All steps defined
- Content clear and helpful
- AI step conditional on enabled

---

### Task 7.4: Add Settings Integration for "Restart Tour"
**Objective**: User can replay tour anytime

**Deliverables**:
- "Help" section in settings
- "Restart Tour" button
- Tour state management (localStorage + database)

**Files to Modify**:
- Settings component
- `lib/tour-state.ts` (new)

**Success Criteria**:
- Button restarts tour from beginning
- State tracked correctly
- Can skip or complete tour

---

## Task Dependencies Summary

**Phase 2**:
- 2.1 → 2.2 (API needed for UI)
- 2.2 → 2.3 (UI first, then logic)
- 2.2 → 2.4 (test enhancement needs UI)

**Phase 3**:
- 3.1 → 3.2 → 3.3 (sequential flow)
- 3.4 can be done alongside 3.1-3.3

**Phase 4**:
- 4.1 → 4.2 → 4.3 → 4.4 (sequential)

**Phase 5**:
- 5.1 → 5.2 (UI first)
- 5.3 independent
- 5.4 depends on 5.3

**Phase 6**:
- 6.1 → 6.2 → 6.3 (sequential)
- 6.4 independent

**Phase 7**:
- 7.1 → 7.2 → 7.3 → 7.4 (sequential)

---

**Last Updated**: 2025-11-15
**Current Status**: Phase 3 Tasks 3.1 ✅ and 3.2 ✅ Complete, Phase 4 Complete ✅ (Tasks 4.1-4.4), Phase 5 Tasks 5.1 ✅ and 5.3 ✅ Complete
**Next Tasks**: Phase 3 Tasks 3.3-3.4 (Accept/Override/Dismiss logic, Loading states) or Phase 5 Task 5.4 (Notification Integration)

# Task 2.3: Feature Flag Checking Logic - Context Manifest

## Context Manifest

### How This Currently Works: AI Master Toggle System

IdeaListed has a **two-tier AI system**: a master toggle that controls all AI functionality, and soon-to-be-implemented granular feature flags. Currently, the master toggle works as follows:

#### Current Master Toggle Flow

**Storage and Configuration:**
The AI master toggle is stored in the `settings` table with key `ai_config`. This setting contains a JSON object with the shape:

```typescript
interface AIConfig {
  enabled: boolean              // MASTER TOGGLE - controls all AI
  openrouterApiKey: string
  freeModel: string
  paidModel: string
  usePaidModel: boolean
  systemPrompt: string
  temperature: number
  maxTokens: number
}
```

When a user first loads the app, if no `ai_config` exists, the system creates a default one with `enabled: false` (see `app/api/settings/route.ts:20-39`). This was a top priority requirement: AI disabled by default.

**How Components Check AI Status:**

Components check AI status in two ways:

1. **Frontend component-level checks** - Components fetch the settings API and check `ai_config.enabled`:
   ```typescript
   // Example from CaptureScreen.tsx:55-61
   useEffect(() => {
     fetch('/api/settings')
       .then(res => res.json())
       .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
       .catch(() => setAiEnabled(false))
   }, [])
   ```

2. **Backend AIService checks** - The `AIService` class has a private `getConfig()` method that throws errors if AI is disabled:
   ```typescript
   // lib/ai.ts:55-63
   private getConfig(): AIConfig {
     if (!this.config) {
       throw new Error('AI not configured. Please set up your OpenRouter API key.')
     }
     if (!this.config.enabled) {
       throw new Error('AI features are disabled. Enable AI in settings to use this feature.')
     }
     return this.config
   }
   ```

This `getConfig()` method is called at the beginning of every AI operation (`processRequest()` at line 66), ensuring the master toggle is respected before any API calls are made.

**UI Conditional Rendering:**

When AI is disabled, UI elements are hidden:

- **CaptureScreen** (lines 174-183): AI dropdown button only renders if `aiEnabled === true`
- **EntityModal** (lines 142-159): "AI AUTOFILL" button only renders if `aiEnabled === true` AND `onAIFill` prop is provided
- **AISettingsTab** (lines 138-169): Form inputs are disabled when master toggle is off

**Database Schema for Feature Flags:**

The database already has an `ai_feature_settings` table (created in Task 1.4):

```sql
CREATE TABLE IF NOT EXISTS ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  description TEXT NOT NULL
)
```

This table is seeded with three features (lib/db.ts:82-116):
1. `suggestion_panel` - enabled by default (1)
2. `tag_suggestions` - enabled by default (1)
3. `daily_summary` - disabled by default (0)

**Current Limitation:**

Right now, the AIService class does NOT check individual feature flags. It only checks the master toggle via `getConfig()`. All AI operations are gated by the same master switch. Task 2.3 will add granular feature-level checking.

---

### For New Feature Implementation: Feature Flag Checking

The current system needs to be extended to support **granular feature flags** that work in conjunction with the master toggle. Here's what needs to connect:

#### Master Toggle + Feature Flag Hierarchy

The new system will have two levels of control:
1. **Master Toggle** (`ai_config.enabled`) - If false, ALL AI features disabled regardless of individual flags
2. **Feature Flags** (`ai_feature_settings.enabled`) - If master is true, individual features can be toggled

This creates a logical AND condition:
```
Feature Active = (Master Toggle ON) AND (Feature Flag ON)
```

#### AIService Enhancement Pattern

The `AIService` class (lib/ai.ts) needs a new public method `isFeatureEnabled(featureName: string)` that:

1. **First checks master toggle** - Call `this.getConfig()` which will throw if disabled
2. **Then queries feature flag** - Look up feature in `ai_feature_settings` table
3. **Returns boolean** - True only if both master AND feature are enabled

This method will be async because it needs to:
- Dynamically import the database (`const { db } = await import('@/lib/db')`)
- Execute a SQL query to fetch the feature setting
- Parse the result (SQLite stores booleans as 0/1 integers)

**Why async is necessary:** The AIService is instantiated at module load time, but the database isn't available until first import. Following the existing pattern (see `initializeFromSettings()` at line 12-29), we use dynamic imports to avoid circular dependencies.

#### Component Integration Points

Three main integration points need feature flag checks:

**1. AISuggestionPanel Component** (`components/ui/AISuggestionPanel.tsx`)
- **Current behavior:** Renders if `suggestion` prop is provided
- **New behavior:** Should NOT render if `suggestion_panel` feature is disabled
- **Implementation approach:** Add a wrapper in parent component (CaptureScreen or page.tsx) that checks feature flag before passing `suggestion` prop

**2. Tag Suggestions in EntityModal** (`components/modern/EntityModal.tsx`)
- **Current behavior:** No AI tag suggestions implemented yet (Task 4.3)
- **New behavior:** When implementing tag suggestions in Phase 4, check `tag_suggestions` flag before showing "Suggest Tags" button
- **Implementation approach:** Fetch feature status via API endpoint created in Task 2.1

**3. Daily Summary in Review Service** (`lib/review.ts`)
- **Current behavior:** Line 62 checks `if (includeAI && activeProjects.length > 0)`
- **New behavior:** Add feature flag check before calling `generateAIProjectSummary()`
- **Implementation approach:** Call `aiService.isFeatureEnabled('daily_summary')` before generating summary

#### Database Query Pattern

The feature flag check will use this query pattern (as suggested in AI_AND_NTFY_TASKS.md:139-144):

```typescript
async isFeatureEnabled(featureName: string): Promise<boolean> {
  if (!this.config?.enabled) return false // Master toggle check

  const { db } = await import('@/lib/db')
  const feature = db.prepare(`
    SELECT enabled FROM ai_feature_settings WHERE feature_name = ?
  `).get(featureName) as { enabled: number } | undefined

  return feature?.enabled === 1 // SQLite boolean check
}
```

**Critical SQLite detail:** SQLite stores booleans as integers (0 or 1), so we must check `=== 1`, not just truthiness (0 is falsy in JS).

#### Error Handling Strategy

When a feature is disabled, the behavior should be:

1. **Silent graceful degradation** - Don't throw errors, just skip the AI feature
2. **Log for debugging** - Console.log when features are skipped due to flags
3. **User-facing messages** - Only show error messages if user explicitly triggered AI action

For example, if user clicks an AI button but the feature is disabled:
- Show a toast/message: "This AI feature is currently disabled. Enable it in Settings > AI."
- Don't show suggestion panel
- Don't make API calls

If AI is disabled silently in the background (like daily summary):
- Just skip the AI generation
- Log: `console.log('Daily summary skipped: feature disabled')`
- Continue with non-AI summary

#### API Endpoint Integration (from Task 2.1)

Task 2.1 will create `/api/ai-features` endpoint with:
- GET: Returns all feature flags `[{ feature_name, enabled, description }]`
- PUT: Updates feature flags

Components can use this endpoint to check feature status on mount:

```typescript
useEffect(() => {
  fetch('/api/ai-features')
    .then(res => res.json())
    .then(data => {
      const suggestionPanel = data.find(f => f.feature_name === 'suggestion_panel')
      setFeatureEnabled(suggestionPanel?.enabled === 1)
    })
}, [])
```

---

### Technical Reference Details

#### AIService Class Methods

**Existing Methods:**
```typescript
// lib/ai.ts
class AIService {
  private client: OpenAI | null
  private config: AIConfig | null
  
  // Private initialization (async, dynamic import)
  private async initializeFromSettings(): Promise<void>
  
  // Private config getter with master toggle enforcement
  private getConfig(): AIConfig  // Throws if disabled
  
  // Public configuration methods
  async updateConfig(config: AIConfig): Promise<boolean>
  isConfigured(): boolean
  getConfigSummary(): Partial<AIConfig> | null
  
  // Public AI operation methods
  async processRequest(request: AIRequest): Promise<AIResponse>
  async parseIdea(text: string): Promise<AIResponse>
  async convertIdea(text: string): Promise<AIResponse>
  async suggestTags(text: string): Promise<AIResponse>
  async rewriteText(text: string): Promise<AIResponse>
  async suggestResearch(text: string): Promise<AIResponse>
  async generatePlan(completed: any[], incomplete: any[], ctx: any): Promise<AIResponse>
  async chat(prompt: string, systemMessage?: string): Promise<AIResponse>
}

export const aiService = new AIService()
```

**New Method to Add:**
```typescript
/**
 * Check if a specific AI feature is enabled
 * @param featureName - Name of feature from ai_feature_settings table
 * @returns Promise<boolean> - True if master toggle AND feature flag are both enabled
 */
async isFeatureEnabled(featureName: string): Promise<boolean> {
  // Check master toggle first
  if (!this.config?.enabled) {
    return false
  }
  
  try {
    const { db } = await import('@/lib/db')
    const feature = db.prepare(`
      SELECT enabled FROM ai_feature_settings WHERE feature_name = ?
    `).get(featureName) as { enabled: number } | undefined
    
    return feature?.enabled === 1
  } catch (error) {
    console.error(`Failed to check feature flag: ${featureName}`, error)
    return false // Fail closed - disable feature on error
  }
}
```

#### Component Patterns

**Pattern 1: Frontend Feature Flag Check (for UI rendering)**
```typescript
// In component
const [featureEnabled, setFeatureEnabled] = useState(false)

useEffect(() => {
  // Load via API endpoint (Task 2.1)
  fetch('/api/ai-features')
    .then(res => res.json())
    .then(features => {
      const feature = features.find(f => f.feature_name === 'suggestion_panel')
      setFeatureEnabled(feature?.enabled === 1)
    })
    .catch(() => setFeatureEnabled(false))
}, [])

// Conditional rendering
{featureEnabled && <AISuggestionPanel ... />}
```

**Pattern 2: Backend Feature Flag Check (for API routes)**
```typescript
// In API route
import { aiService } from '@/lib/ai'

export async function POST(request: NextRequest) {
  // Check feature before processing
  const featureEnabled = await aiService.isFeatureEnabled('tag_suggestions')
  
  if (!featureEnabled) {
    return NextResponse.json(
      { error: 'Tag suggestions feature is disabled' },
      { status: 403 }
    )
  }
  
  // Proceed with AI processing...
}
```

**Pattern 3: Service-Level Feature Check (in lib/ code)**
```typescript
// In lib/review.ts
import { aiService } from './ai'

async generateReview(date: Date, includeAI: boolean): Promise<ReviewData> {
  // Existing includeAI check
  if (!includeAI) {
    return { /* no AI summary */ }
  }
  
  // NEW: Check daily_summary feature flag
  const dailySummaryEnabled = await aiService.isFeatureEnabled('daily_summary')
  if (!dailySummaryEnabled) {
    console.log('Daily summary skipped: feature disabled')
    return { /* no AI summary */ }
  }
  
  // Proceed with AI summary generation...
}
```

#### Database Schema Details

**Table: ai_feature_settings**
```sql
CREATE TABLE IF NOT EXISTS ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,      -- SQLite boolean: 0=false, 1=true
  description TEXT NOT NULL
)
```

**Seed Data (lib/db.ts:82-116):**
```javascript
const features = [
  {
    name: 'suggestion_panel',
    enabled: 1,  // ON by default
    description: 'Preview AI analysis before creating items'
  },
  {
    name: 'tag_suggestions',
    enabled: 1,  // ON by default
    description: 'AI-powered tag recommendations'
  },
  {
    name: 'daily_summary',
    enabled: 0,  // OFF by default
    description: 'AI summary in daily review notifications'
  },
]
```

**Query to fetch single feature:**
```sql
SELECT enabled FROM ai_feature_settings WHERE feature_name = ?
```

**Query to fetch all features (for UI):**
```sql
SELECT feature_name, enabled, description FROM ai_feature_settings
```

**Update feature:**
```sql
UPDATE ai_feature_settings SET enabled = ? WHERE feature_name = ?
```

#### TypeScript Types

**Existing Types (types/index.ts:166-170):**
```typescript
export interface AIFeatureSetting {
  feature_name: string
  enabled: number          // SQLite boolean (0 or 1)
  description: string
}
```

**API Response Type (for Task 2.1):**
```typescript
// GET /api/ai-features response
{
  features: AIFeatureSetting[]
}

// PUT /api/ai-features request body
{
  feature_name: string
  enabled: number  // 0 or 1
}
```

#### Error Messages

**When feature disabled (user-triggered action):**
```
"This AI feature is currently disabled. Enable it in Settings > AI > Features."
```

**When master toggle disabled:**
```
"AI features are disabled. Enable AI in settings to use this feature."
```

**When API key missing:**
```
"AI not configured. Please set up your OpenRouter API key in settings."
```

---

### File Locations

**Implementation files:**
- `lib/ai.ts` - Add `isFeatureEnabled()` method to AIService class
- `components/ui/AISuggestionPanel.tsx` - Add conditional rendering based on feature flag
- `components/modern/EntityModal.tsx` - Add tag suggestions feature flag check (Phase 4)
- `lib/review.ts` - Add daily_summary feature flag check before AI generation
- `app/api/ai/suggest/route.ts` - Add feature flag check in suggestion endpoint

**Database:**
- `lib/db.ts` - Feature settings table already created (lines 302-309) and seeded (lines 82-116)

**Testing:**
- Test with SQLite CLI: `sqlite3 data/idealisted.db "SELECT * FROM ai_feature_settings"`
- Test API: `curl http://localhost:3000/api/ai-features` (after Task 2.1)

**Configuration:**
- Master toggle: `data/idealisted.db` -> settings table -> key='ai_config'
- Feature flags: `data/idealisted.db` -> ai_feature_settings table

---

### Implementation Checklist

**Step 1: Add isFeatureEnabled() to AIService**
- [ ] Add async method to lib/ai.ts
- [ ] Check master toggle first (fail fast)
- [ ] Query ai_feature_settings table
- [ ] Handle errors gracefully (fail closed)
- [ ] Return boolean (true only if both enabled)

**Step 2: Gate AI Suggestion Panel**
- [ ] Check `suggestion_panel` flag before rendering AISuggestionPanel
- [ ] Add flag check in parent component (CaptureScreen or page.tsx)
- [ ] Hide panel if feature disabled
- [ ] Log when feature is skipped

**Step 3: Gate Daily Summary**
- [ ] Add flag check in lib/review.ts:generateReview()
- [ ] Check `daily_summary` before calling generateAIProjectSummary()
- [ ] Log when skipped
- [ ] Continue with non-AI summary

**Step 4: Prepare for Tag Suggestions (Phase 4)**
- [ ] Document pattern for tag_suggestions flag
- [ ] Note: Implementation happens in Task 4.3
- [ ] Pattern: Check flag before showing "Suggest Tags" button

**Step 5: Add Backend API Protection**
- [ ] Add flag check in /api/ai/suggest route
- [ ] Return 403 if feature disabled
- [ ] Clear error message to user

**Step 6: Testing**
- [ ] Test with master toggle ON, feature flag OFF
- [ ] Test with master toggle OFF, feature flag ON
- [ ] Test with both ON
- [ ] Test with both OFF
- [ ] Verify error messages are clear
- [ ] Verify no API calls made when disabled

---

### Dependencies

**Task 2.1 (AI Feature Settings API):**
- Needed for frontend components to fetch feature states
- Not required for backend AIService.isFeatureEnabled() method
- Can implement AIService method first, then integrate with UI after Task 2.1 completes

**Phase 1 Complete:**
- ai_feature_settings table exists (Task 1.4)
- Table is seeded with 3 features
- Database schema is ready

**Existing Infrastructure:**
- Master toggle system in place
- AIService.getConfig() enforces master toggle
- Components already check AI enabled state
- Error handling patterns established

---

### Testing Approach

**Manual Testing:**
1. Open Settings > AI, ensure master toggle is ON
2. Open database: `sqlite3 data/idealisted.db`
3. Check feature flags: `SELECT * FROM ai_feature_settings;`
4. Disable suggestion_panel: `UPDATE ai_feature_settings SET enabled = 0 WHERE feature_name = 'suggestion_panel';`
5. Try to use AI suggestion in capture screen
6. Verify AISuggestionPanel does NOT render
7. Re-enable feature and verify it works again

**Automated Testing (if implemented):**
```typescript
describe('AIService.isFeatureEnabled()', () => {
  it('returns false when master toggle is off', async () => {
    // Disable master toggle
    await aiService.updateConfig({ ...config, enabled: false })
    
    // Even if feature flag is on, should return false
    const result = await aiService.isFeatureEnabled('suggestion_panel')
    expect(result).toBe(false)
  })
  
  it('returns false when feature flag is off', async () => {
    // Master toggle on, feature flag off
    await aiService.updateConfig({ ...config, enabled: true })
    // Update DB to disable feature
    
    const result = await aiService.isFeatureEnabled('suggestion_panel')
    expect(result).toBe(false)
  })
  
  it('returns true when both master and feature are on', async () => {
    // Both enabled
    const result = await aiService.isFeatureEnabled('suggestion_panel')
    expect(result).toBe(true)
  })
})
```

---

### Common Pitfalls to Avoid

1. **SQLite Boolean Check** - Use `=== 1`, not just truthiness (0 is falsy in JS)
2. **Async Pattern** - Must await `isFeatureEnabled()` calls
3. **Dynamic Imports** - Must use `await import('@/lib/db')` to avoid circular deps
4. **Master Toggle Precedence** - Always check master first, short-circuit if off
5. **Error Handling** - Fail closed (return false on error, don't crash)
6. **Null Checks** - Feature might not exist in DB, handle undefined gracefully
7. **Client vs Server** - Frontend needs API calls, backend can use AIService directly

---

## Summary

This task extends the existing master toggle system with granular feature flags. The architecture follows a two-tier hierarchy: master toggle controls all AI, feature flags control individual features. The implementation focuses on adding `isFeatureEnabled()` to AIService and integrating it into three main areas: suggestion panel, tag suggestions (Phase 4), and daily summary. The system fails closed (disables features on error) and provides clear user feedback when features are disabled.

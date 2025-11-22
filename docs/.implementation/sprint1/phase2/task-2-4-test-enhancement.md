# Task 2.4: Enhanced Test Connection

## Objective
Improve the "Test AI" connection button in AISettingsTab to show comprehensive feature status and better error messages.

## Current Behavior
- Test button sends test text to `/api/ai/suggest`
- Shows basic success/failure messages
- Error messages: 401, 429, 500 detection
- Limited information about what's working

## Enhanced Behavior
The test should provide comprehensive feedback:

### Success Output Format
```
✓ API Key Valid
✓ Model: anthropic/claude-3-haiku
✓ Features Enabled: 2/3
  - AI Suggestion Panel: ✓
  - AI Tag Suggestions: ✓
  - AI Daily Summary: ✗ (disabled)
```

### Error Output Enhancement
- **401/403**: "✗ API Key Invalid: [error message]"
- **429**: "✗ Rate Limited: [error message]"
- **500**: "✗ Server Error: [error message]"
- **Network**: "✗ Connection failed: [error message]"

## Dependencies
- Task 2.2 complete (feature toggle UI exists)
- Task 2.1 complete (AI features API endpoint exists)

## Files to Modify
- `components/modern/settings/AISettingsTab.tsx` - Test button handler

## Success Criteria
- [ ] Test verifies API key works with selected model
- [ ] Shows which features are enabled/disabled
- [ ] Clear error messages for common failures
- [ ] Test results formatted clearly with checkmarks/crosses
- [ ] Shows feature count (e.g., "2/3 enabled")

## Implementation Notes
- Fetch feature settings from `/api/ai-features` during test
- Display model being used (free vs paid)
- Keep existing error handling patterns
- Error messages visible for 8 seconds
- Success messages visible for shorter duration

---

## Context Manifest

### How the Current Test Connection Flow Works

When a user clicks the "TEST AI" button in the AI Settings tab (`components/modern/settings/AISettingsTab.tsx`), the application executes a multi-step validation process to verify that the AI integration is properly configured and functional.

**Current Test Flow (lines 83-127 in AISettingsTab.tsx):**

The test begins when the user clicks the "TEST AI" button (line 266), which is disabled if `testing` is true, AI is not enabled (`!config.enabled`), or no API key is provided (`!config.openrouterApiKey`). When clicked, it triggers the `handleTest` async function.

The handler sets `testing` state to true and clears any previous messages. It then constructs a POST request to `/api/ai/suggest` with a test payload:

```typescript
{
  text: 'Hello, this is a test to verify AI is working correctly',
  targetType: 'task'
}
```

This endpoint is chosen because it exercises the full AI processing pipeline: API key validation, model selection, OpenRouter API communication, and response parsing.

**Backend Processing (`app/api/ai/suggest/route.ts`):**

The `/api/ai/suggest` endpoint receives the test text and processes it through a sophisticated AI suggestion pipeline. Here's the critical flow:

1. **Request Validation** (lines 8-13): Validates that text is present and is a string type
2. **API Key Retrieval** (lines 16-17): Loads `OPENROUTER_API_KEY` from environment variables and selects the model (defaulting to `x-ai/grok-code-fast-1` if no paid model is specified)
3. **Fallback Check** (lines 19-22): If no API key is configured, returns a smart fallback using keyword-based heuristics instead of calling the AI
4. **AI Prompt Construction** (lines 25-58): Builds a detailed prompt asking the AI to analyze the text and return a structured JSON response with fields like `suggested_type`, `confidence`, `processed_text`, `tags`, `additional_fields`, and `reasoning`
5. **OpenRouter API Call** (lines 60-76): Makes a POST request to `https://openrouter.ai/api/v1/chat/completions` with the selected model and temperature of 0.3
6. **Response Handling** (lines 78-87): Parses the AI response as JSON and returns an `AISuggestion` object
7. **Error Handling** (lines 89-92): If anything fails, catches the error and returns the smart fallback

**Critical Error Response Patterns:**

The OpenRouter API returns specific HTTP status codes that the test needs to handle:

- **401 Unauthorized**: Invalid API key or missing authentication
- **403 Forbidden**: API key doesn't have access to the requested model
- **429 Too Many Requests**: Rate limit exceeded (common with free tier)
- **500 Internal Server Error**: OpenRouter service issue or model error
- **Network errors**: Connection timeout, DNS failure, etc.

**Current Frontend Error Handling (lines 98-126):**

The handler checks `response.ok` and inspects the status code. If the response is successful and contains `processed_text`, it shows a truncated success message. If the response fails, it categorizes errors by status code:

- Lines 105-106: 401/403 errors show "API Key Invalid"
- Lines 107-108: 429 errors show "Rate Limited"
- Lines 109-110: 500 errors show "Server Error"
- Lines 111-113: Other errors show generic "AI Error"
- Lines 119-121: Network/parse errors show "Connection failed"

The message is displayed for 8 seconds (line 125) to give users time to read error details.

**What's Missing:**

The current test provides binary feedback (works/doesn't work) but doesn't show:

1. **Which model is being tested**: Users don't know if the free or paid model is being used
2. **Which features are enabled**: No visibility into which AI features will actually work
3. **Feature availability count**: No summary like "2 of 3 features enabled"
4. **Individual feature status**: Users can't see if specific features like suggestion_panel, tag_suggestions, or daily_summary are enabled

This creates a gap where the test might succeed, but users don't understand what AI functionality is actually available to them based on their feature toggle settings.

### For Enhanced Test Implementation: What Needs to Connect

Since we're enhancing the test connection to show feature status alongside API key validation, we need to integrate with the new AI feature settings system created in Tasks 2.1 and 2.2.

**Integration Points:**

**1. Feature Settings API Integration:**

The enhanced test needs to fetch the current state of AI feature toggles from the `/api/ai-features` endpoint (created in Task 2.1). This endpoint returns an array of feature settings:

```typescript
// Expected response from GET /api/ai-features
[
  {
    feature_name: 'suggestion_panel',
    enabled: 1,
    description: 'Preview AI analysis before creating items'
  },
  {
    feature_name: 'tag_suggestions',
    enabled: 1,
    description: 'AI-powered tag recommendations'
  },
  {
    feature_name: 'daily_summary',
    enabled: 0,
    description: 'AI summary in daily review notifications'
  }
]
```

The test handler should make a parallel request to this endpoint while also testing the AI suggestion endpoint. This allows displaying both API connectivity AND feature availability in a single test operation.

**2. Model Selection Display:**

The test needs to display which model is being used. This information is already available in the component's `config` state (lines 27-36 in AISettingsTab.tsx):

- `config.freeModel`: Currently selected free model (e.g., 'z-ai/glm-4.5-air:free')
- `config.paidModel`: Currently selected paid model (e.g., 'x-ai/grok-code-fast-1')
- `config.usePaidModel`: Boolean flag indicating which model tier is active

The test should construct a display string showing the active model:

```typescript
const activeModel = config.usePaidModel ? config.paidModel : config.freeModel
```

**3. Enhanced Message Formatting:**

The current message state (line 40) is a simple string. The enhanced test needs to build a multi-line formatted message that includes:

- API key validation status (✓ or ✗)
- Active model name
- Feature count summary
- Individual feature status with visual indicators

The message should use Unicode checkmarks (✓) and crosses (✗) for visual clarity, matching the format specified in the task requirements.

**4. Error Handling Preservation:**

The existing error categorization logic (lines 102-116) should be preserved and enhanced. The current pattern uses:

```typescript
if (response.status === 401 || response.status === 403) {
  setMessage(`✗ API Key Invalid: ${errorMsg}`)
}
```

This pattern works well and should be kept. For the enhanced version, when an error occurs, we still want to show feature status even if the API test failed. This helps users understand that their feature configuration is correct even if their API key isn't working yet.

**5. Async Coordination:**

The enhanced test will need to coordinate two parallel async operations:

1. Testing the AI suggestion endpoint (existing)
2. Fetching AI feature settings (new)

These should be executed in parallel using `Promise.all()` or similar to avoid sequential delays. However, if either request fails, we should still display partial results rather than failing completely.

**6. State Management Considerations:**

The test runs while the component is in "testing" mode (`testing` state = true). During this time:

- The "TEST AI" button shows "TESTING..." and is disabled (line 268)
- All form inputs remain enabled (they're only disabled if `!config.enabled`)
- Previous messages are cleared (line 85)

The enhanced test should maintain this UX pattern while displaying richer information upon completion.

### Technical Reference Details

#### Component Interfaces & Signatures

**AISettingsTab Component State:**

```typescript
const [config, setConfig] = useState<AIConfig>({
  enabled: boolean,
  openrouterApiKey: string,
  freeModel: string,
  paidModel: string,
  usePaidModel: boolean,
  systemPrompt: string,
  temperature: number,
  maxTokens: number,
})
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [testing, setTesting] = useState(false)
const [message, setMessage] = useState('')
```

**Test Handler Signature:**

```typescript
const handleTest = async () => {
  setTesting(true)
  setMessage('')
  try {
    // Test logic here
  } catch (error) {
    // Error handling
  } finally {
    setTesting(false)
    setTimeout(() => setMessage(''), 8000)
  }
}
```

#### API Endpoint Contracts

**POST /api/ai/suggest**

Request:
```typescript
{
  text: string,
  targetType?: 'task' | 'note' | 'project' | 'list'
}
```

Response (success):
```typescript
{
  suggested_type: 'note' | 'task' | 'project' | 'list',
  confidence: number, // 0.0 to 1.0
  processed_text: string,
  tags: string[],
  additional_fields: {
    priority?: number,
    due_date?: string,
    category?: string,
    estimated_time?: number,
    deadline?: string,
    status?: string,
    list_name?: string,
    list_items?: string[]
  },
  reasoning: string
}
```

Response (error):
```typescript
{
  error: string,
  message?: string
}
```

**GET /api/ai-features** (from Task 2.1)

Response:
```typescript
{
  success: true,
  features: [
    {
      feature_name: string,
      enabled: number, // 0 or 1 (SQLite boolean)
      description: string
    }
  ]
}
```

#### Data Structures

**AIConfig Interface** (from `types/index.ts`):

```typescript
export interface AIConfig {
  enabled: boolean
  openrouterApiKey: string
  freeModel: string
  paidModel: string
  usePaidModel: boolean
  systemPrompt: string
  temperature: number
  maxTokens: number
}
```

**AIFeatureSetting Interface** (from `types/index.ts` lines 166-170):

```typescript
export interface AIFeatureSetting {
  feature_name: string
  enabled: number // SQLite boolean (0 or 1)
  description: string
}
```

**Feature Name Constants** (from database seed in `lib/db.ts` lines 82-99):

- `suggestion_panel` - "Preview AI analysis before creating items"
- `tag_suggestions` - "AI-powered tag recommendations"
- `daily_summary` - "AI summary in daily review notifications"

#### Configuration Requirements

**Environment Variables:**

The `/api/ai/suggest` endpoint loads from environment:
- `OPENROUTER_API_KEY`: API key for OpenRouter (optional, falls back to smart heuristics)
- `DEFAULT_PAID_MODEL`: Default paid model if not specified in config

**Database Tables:**

```sql
-- ai_feature_settings table (created in Phase 1)
CREATE TABLE IF NOT EXISTS ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  description TEXT NOT NULL
)

-- settings table (existing)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON string
  updated_at INTEGER NOT NULL
)
```

#### File Locations

**Implementation goes here:**
- `/home/mmariani/Projects/idealisted/components/modern/settings/AISettingsTab.tsx` (lines 83-127, `handleTest` function)

**Related API endpoints:**
- `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts` (test target)
- `/home/mmariani/Projects/idealisted/app/api/ai-features/route.ts` (feature settings, created in Task 2.1)

**Type definitions:**
- `/home/mmariani/Projects/idealisted/types/index.ts` (AIConfig, AIFeatureSetting, AISuggestion)

**Database initialization:**
- `/home/mmariani/Projects/idealisted/lib/db.ts` (lines 302-309 for ai_feature_settings table, lines 82-116 for seed data)

#### Code Examples for Implementation

**Enhanced Test Handler Pattern:**

```typescript
const handleTest = async () => {
  setTesting(true)
  setMessage('')

  try {
    // Parallel requests: test AI + fetch feature settings
    const [aiResponse, featuresResponse] = await Promise.all([
      fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello, this is a test to verify AI is working correctly',
          targetType: 'task',
        }),
      }),
      fetch('/api/ai-features')
    ])

    // Parse feature settings (even if AI test fails)
    let features: AIFeatureSetting[] = []
    if (featuresResponse.ok) {
      const featuresData = await featuresResponse.json()
      features = featuresData.features || []
    }

    // Build feature status display
    const enabledCount = features.filter(f => f.enabled === 1).length
    const totalCount = features.length
    const featureLines = features.map(f => {
      const status = f.enabled === 1 ? '✓' : '✗'
      const label = f.description
      return `  - ${label}: ${status}`
    }).join('\n')

    // Check AI response
    const aiData = await aiResponse.json()

    if (aiResponse.ok && aiData.processed_text) {
      // Success: show comprehensive status
      const activeModel = config.usePaidModel ? config.paidModel : config.freeModel
      const successMsg = [
        '✓ API Key Valid',
        `✓ Model: ${activeModel}`,
        `✓ Features Enabled: ${enabledCount}/${totalCount}`,
        featureLines
      ].join('\n')

      setMessage(successMsg)
    } else if (!aiResponse.ok) {
      // Error: show error but still include feature status
      const errorMsg = aiData.error || aiData.message || `HTTP ${aiResponse.status}`

      let errorPrefix = ''
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        errorPrefix = '✗ API Key Invalid'
      } else if (aiResponse.status === 429) {
        errorPrefix = '✗ Rate Limited'
      } else if (aiResponse.status === 500) {
        errorPrefix = '✗ Server Error'
      } else {
        errorPrefix = '✗ AI Error'
      }

      setMessage(`${errorPrefix}: ${errorMsg}\n\nFeature Status:\n${featureLines}`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    setMessage(`✗ Connection failed: ${errorMsg}`)
  } finally {
    setTesting(false)
    setTimeout(() => setMessage(''), 8000)
  }
}
```

**Message Display Component:**

The current message display (lines 256-260) uses a simple div:

```typescript
{message && (
  <div className="retro-message">
    {message}
  </div>
)}
```

For multi-line messages, ensure the CSS preserves whitespace:

```css
.retro-message {
  white-space: pre-line; /* Preserves line breaks */
  font-family: monospace;
  padding: 12px;
  border: 1px solid var(--retro-border);
  background: var(--retro-surface);
}
```

#### Testing Approach

**Manual Testing Steps:**

1. **Test with AI disabled:**
   - Disable master AI toggle
   - Verify "TEST AI" button is disabled

2. **Test with no API key:**
   - Enable AI, leave API key empty
   - Verify "TEST AI" button is disabled

3. **Test with invalid API key:**
   - Enter invalid key like "sk-invalid-123"
   - Click "TEST AI"
   - Verify shows "✗ API Key Invalid" with 401 error
   - Verify still shows feature status

4. **Test with valid API key:**
   - Enter valid OpenRouter API key
   - Click "TEST AI"
   - Verify shows "✓ API Key Valid"
   - Verify shows active model name
   - Verify shows feature count (e.g., "2/3")
   - Verify shows individual feature statuses

5. **Test feature toggle integration:**
   - Toggle individual features on/off in UI (from Task 2.2)
   - Run test after each toggle
   - Verify feature status updates correctly

6. **Test error scenarios:**
   - Simulate rate limiting (make many rapid requests)
   - Verify shows "✗ Rate Limited" message
   - Disconnect network and test
   - Verify shows "✗ Connection failed" message

7. **Test message timeout:**
   - Run test successfully
   - Wait 8 seconds
   - Verify message disappears
   - Run test again
   - Verify old message clears before new one appears

**Expected Behaviors:**

- Success message shows checkmarks (✓) in green/primary color
- Error message shows crosses (✗) in red/danger color
- Multi-line messages preserve formatting with line breaks
- Feature status displayed even when API test fails
- Model name matches current config (free vs paid)
- Feature count accurate (enabled/total)
- Messages clear after 8 seconds
- Button disabled during test (shows "TESTING...")

**Edge Cases to Test:**

- What if `/api/ai-features` endpoint fails but AI test succeeds?
  - Should still show API success, but skip feature status or show "Feature status unavailable"
- What if response contains unusual characters in error message?
  - Should escape/sanitize to prevent XSS
- What if user changes model during test?
  - State should be snapshot at test start (config is captured in closure)
- What if feature count is 0/0?
  - Should handle gracefully, show "0/0" or "No features configured"


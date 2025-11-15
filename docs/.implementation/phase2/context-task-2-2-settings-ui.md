# Context Pack: Task 2.2 - Update AISettingsTab with Feature Toggles

## Task Summary
**Goal**: Add a "Features" section to the AISettingsTab component with 3 individual AI feature toggles (suggestion_panel, tag_suggestions, daily_summary), each with descriptive text. The toggles should be disabled when the master AI toggle is off, and settings should persist via the new `/api/ai-features` endpoint.

**Current State**: AISettingsTab has master toggle and API configuration only
**Target State**: AISettingsTab displays both master toggle AND individual feature toggles with descriptions

---

## How This Currently Works: AISettingsTab Component

### Component Architecture & State Management

The AISettingsTab component (`/components/modern/settings/AISettingsTab.tsx`) is a client-side React component that manages AI configuration settings. Here's how it currently operates:

**Component Structure (lines 26-280)**:
```typescript
'use client'

export const AISettingsTab: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>({
    enabled: true,        // Master AI toggle
    openrouterApiKey: '',
    freeModel: 'z-ai/glm-4.5-air:free',
    paidModel: 'x-ai/grok-code-fast-1',
    usePaidModel: false,
    systemPrompt: 'You are an intelligent assistant...',
    temperature: 0.7,
    maxTokens: 2000,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  // ...
}
```

**State Loading Pattern (lines 42-58)**:
When the component mounts, it fetches settings from the backend:

```typescript
useEffect(() => {
  loadSettings()
}, [])

const loadSettings = async () => {
  try {
    const response = await fetch('/api/settings')
    const data = await response.json()
    if (data.settings?.ai_config) {
      setConfig(data.settings.ai_config)  // Load AI config from database
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  } finally {
    setLoading(false)
  }
}
```

This fetch hits `/api/settings` (GET), which returns ALL settings as a nested object:
```json
{
  "settings": {
    "ai_config": { "enabled": false, "openrouterApiKey": "sk-...", ... },
    "ntfy_config": { ... },
    "appearance_config": { ... }
  }
}
```

**State Saving Pattern (lines 60-81)**:
When the user clicks "SAVE", the component sends updated config to the backend:

```typescript
const handleSave = async () => {
  setSaving(true)
  setMessage('')
  try {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_config: config }),  // Only send ai_config
    })

    if (response.ok) {
      setMessage('✓ Settings saved successfully')
    } else {
      setMessage('✗ Failed to save settings')
    }
  } catch (error) {
    setMessage('✗ Error saving settings')
  } finally {
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)  // Clear message after 3s
  }
}
```

The PUT endpoint (`/api/settings/route.ts:62-82`) expects a key-value object where each key is a settings category. It iterates over the object and saves each entry:

```typescript
// PUT /api/settings
export async function PUT(request: NextRequest) {
  const body = await request.json()  // e.g., { ai_config: {...}, ntfy_config: {...} }
  const now = Date.now()

  const updateSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `)

  // Update each setting
  for (const [key, value] of Object.entries(body)) {
    updateSetting.run(key, JSON.stringify(value), now)
  }

  return NextResponse.json({ success: true, settings: body })
}
```

So when we save `{ ai_config: {...} }`, it inserts/updates the row `('ai_config', '{"enabled":true,...}', 1234567890)` in the `settings` table.

---

### Current UI Layout & Styling

The AISettingsTab renders the following sections (lines 133-278):

**1. Master Toggle (lines 138-156)**:
```typescript
<div className="retro-form-group">
  <label className="retro-checkbox-label" style={{ fontSize: '14px', fontWeight: 'bold' }}>
    <input
      type="checkbox"
      className="retro-checkbox"
      checked={config.enabled}
      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
    />
    Enable AI Features
  </label>
  <p style={{
    fontSize: '11px',
    color: 'var(--retro-text-secondary)',
    marginTop: '4px',
    marginLeft: '24px'
  }}>
    Toggle to enable/disable all AI functionality app-wide
  </p>
</div>
```

This uses:
- `.retro-form-group` - 16px bottom margin (retro.css:1180-1182)
- `.retro-checkbox-label` - Flex container for checkbox + label (retro.css:1219-1227)
- `.retro-checkbox` - 16x16px checkbox with 8px right margin (retro.css:1213-1217)
- Inline description with secondary color

**2. API Key Input (lines 158-169)**:
```typescript
<div className="retro-form-group">
  <label className="retro-form-label">OpenRouter API Key</label>
  <input
    type="password"
    className="retro-input"
    value={config.openrouterApiKey}
    onChange={(e) => setConfig({ ...config, openrouterApiKey: e.target.value })}
    placeholder="sk-or-v1-..."
    disabled={!config.enabled}
    style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
  />
</div>
```

This uses:
- `.retro-form-label` - Monospace, uppercase, 11px label (retro.css:1184-1192)
- `.retro-input` - Full-width input with inset border effect (retro.css:1194-1205)
- `disabled` prop disables input when master toggle is off
- Inline style reduces opacity when disabled

**3. Model Dropdowns (lines 171-203)**:
Two dropdown selects for free and paid models, each following the same pattern:
```typescript
<div className="retro-form-group">
  <label className="retro-form-label">Free Model</label>
  <select
    className="retro-select"
    value={config.freeModel}
    onChange={(e) => setConfig({ ...config, freeModel: e.target.value })}
    disabled={!config.enabled}
    style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
  >
    {FREE_MODELS.map(model => (
      <option key={model.value} value={model.value}>
        {model.label}
      </option>
    ))}
  </select>
</div>
```

**4. Checkbox for Paid Model Toggle (lines 205-216)**:
```typescript
<div className="retro-form-group">
  <label className="retro-checkbox-label" style={!config.enabled ? { opacity: 0.5 } : {}}>
    <input
      type="checkbox"
      className="retro-checkbox"
      checked={config.usePaidModel}
      onChange={(e) => setConfig({ ...config, usePaidModel: e.target.checked })}
      disabled={!config.enabled}
    />
    Use Paid Model (Default)
  </label>
</div>
```

**5. Temperature Slider (lines 218-230)**:
```typescript
<div className="retro-form-group">
  <label className="retro-form-label">Temperature: {config.temperature}</label>
  <input
    type="range"
    min="0"
    max="2"
    step="0.1"
    value={config.temperature}
    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
    style={{ width: '100%', opacity: !config.enabled ? 0.5 : 1 }}
    disabled={!config.enabled}
  />
</div>
```

**6. Max Tokens Input (lines 232-242)**:
Another number input following the same disabled pattern.

**7. System Prompt Textarea (lines 244-254)**:
```typescript
<div className="retro-form-group">
  <label className="retro-form-label">System Prompt</label>
  <textarea
    className="retro-textarea"
    rows={4}
    value={config.systemPrompt}
    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
    disabled={!config.enabled}
    style={!config.enabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
  />
</div>
```

**8. Message Display (lines 256-260)**:
Shows save/test success or error messages:
```typescript
{message && (
  <div className="retro-message">
    {message}
  </div>
)}
```

The `.retro-message` class (retro.css:1229-1237) provides:
- Monospace font
- 12px text
- Padding 8px 12px
- Light background with border

**9. Action Buttons (lines 262-277)**:
```typescript
<div className="retro-button-row">
  <button
    className="retro-btn retro-btn-secondary"
    onClick={handleTest}
    disabled={testing || !config.enabled || !config.openrouterApiKey}
  >
    {testing ? 'TESTING...' : 'TEST AI'}
  </button>
  <button
    className="retro-btn retro-btn-primary"
    onClick={handleSave}
    disabled={saving}
  >
    {saving ? 'SAVING...' : 'SAVE'}
  </button>
</div>
```

The `.retro-button-row` class (retro.css:1239-1247) provides:
- Flex layout with 12px gap
- 16px top margin
- Buttons take equal flex width

---

### Retro Styling System Reference

All retro components use CSS custom properties defined in `/styles/retro.css`. Here are the key classes we'll use for the feature toggles:

**Section Headers** (retro.css:1162-1171):
```css
.retro-section-title {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--palm-text-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--palm-border-light);
}
```

**Dividers** (retro.css:1271-1275):
```css
.retro-divider {
  border: none;
  border-top: 1px solid var(--palm-border-light);
  margin: 24px 0;
}
```

**Form Groups** (retro.css:1180-1182):
```css
.retro-form-group {
  margin-bottom: 16px;
}
```

**Checkbox Labels** (retro.css:1219-1227):
```css
.retro-checkbox-label {
  display: flex;
  align-items: center;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--palm-text-primary);
  margin-bottom: 8px;
  cursor: pointer;
}
```

**Secondary Text** (retro.css:1173-1178):
```css
.retro-text-secondary {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--palm-text-secondary);
  margin: 8px 0;
}
```

---

### Test Connection Feature

The component includes a test connection feature (lines 83-127) that validates the AI configuration:

```typescript
const handleTest = async () => {
  setTesting(true)
  setMessage('')
  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello, this is a test to verify AI is working correctly',
        targetType: 'task',
      }),
    })

    const data = await response.json()

    if (response.ok && data.processed_text) {
      // Show success with a snippet of the AI response
      const snippet = data.processed_text.substring(0, 60) || 'Response received'
      setMessage(`✓ AI is working! Type: ${data.suggested_type}, Text: "${snippet}${data.processed_text.length > 60 ? '...' : ''}"`)
    } else if (!response.ok) {
      // HTTP error - show status and message
      const errorMsg = data.error || data.message || `HTTP ${response.status}`
      if (response.status === 401 || response.status === 403) {
        setMessage(`✗ API Key Invalid: ${errorMsg}`)
      } else if (response.status === 429) {
        setMessage(`✗ Rate Limited: ${errorMsg}`)
      } else if (response.status === 500) {
        setMessage(`✗ Server Error: ${errorMsg}`)
      } else {
        setMessage(`✗ AI Error: ${errorMsg}`)
      }
    } else {
      // Response OK but no valid suggestion
      setMessage('✗ AI returned invalid response. Check model configuration.')
    }
  } catch (error) {
    // Network or parse error
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    setMessage(`✗ Connection failed: ${errorMsg}`)
  } finally {
    setTesting(false)
    // Keep error messages visible longer
    setTimeout(() => setMessage(''), 8000)
  }
}
```

This test:
1. Calls the actual AI suggestion endpoint with a test string
2. Parses the response and shows a snippet
3. Handles various error cases (401, 429, 500) with specific messages
4. Keeps error messages visible for 8 seconds (vs. 3 seconds for success)

---

## What Needs to Connect: Feature Toggles Integration

### Database Schema: ai_feature_settings Table

From Phase 1, we now have the `ai_feature_settings` table (lib/db.ts:302-309):

```sql
CREATE TABLE IF NOT EXISTS ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  description TEXT NOT NULL
)
```

Seeded with 3 features (lib/db.ts:82-116):
```typescript
const features = [
  {
    name: 'suggestion_panel',
    enabled: 1,
    description: 'Preview AI analysis before creating items'
  },
  {
    name: 'tag_suggestions',
    enabled: 1,
    description: 'AI-powered tag recommendations'
  },
  {
    name: 'daily_summary',
    enabled: 0,
    description: 'AI summary in daily review notifications'
  },
]
```

### New API Endpoint: /api/ai-features

Task 2.1 creates this endpoint (to be created in `app/api/ai-features/route.ts`):

**GET /api/ai-features** - Returns all feature settings:
```json
{
  "success": true,
  "features": [
    { "feature_name": "suggestion_panel", "enabled": 1, "description": "Preview AI analysis before creating items" },
    { "feature_name": "tag_suggestions", "enabled": 1, "description": "AI-powered tag recommendations" },
    { "feature_name": "daily_summary", "enabled": 0, "description": "AI summary in daily review notifications" }
  ]
}
```

**PUT /api/ai-features** - Updates one or more features:
```json
{
  "features": [
    { "feature_name": "suggestion_panel", "enabled": 0 }
  ]
}
```

Returns:
```json
{
  "success": true,
  "updated": 1
}
```

### UI Requirements from Spec

From `AI_AND_NTFY_TASKS.md` (lines 72-104), the UI should look like:

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

**Key Requirements**:
1. **Divider** after master toggle (use `<hr className="retro-divider" />`)
2. **Section header** "FEATURES" (use `<h3 className="retro-section-title">`)
3. **Three checkboxes** with labels and descriptions
4. **Disable all feature toggles** when master AI toggle is off
5. **Load feature settings** from `/api/ai-features` on mount
6. **Save feature settings** to `/api/ai-features` when user clicks SAVE
7. **Descriptions** should match the spec (2-3 lines each)

---

### State Management Pattern for Feature Toggles

We'll add a new state variable for feature settings:

```typescript
interface AIFeatureSetting {
  feature_name: string
  enabled: number  // 0 or 1 (SQLite boolean)
  description: string
}

const [featureSettings, setFeatureSettings] = useState<AIFeatureSetting[]>([])
```

**Loading Pattern**:
```typescript
const loadSettings = async () => {
  try {
    // Load AI config (existing)
    const settingsResponse = await fetch('/api/settings')
    const settingsData = await settingsResponse.json()
    if (settingsData.settings?.ai_config) {
      setConfig(settingsData.settings.ai_config)
    }

    // Load feature settings (NEW)
    const featuresResponse = await fetch('/api/ai-features')
    const featuresData = await featuresResponse.json()
    if (featuresData.success && featuresData.features) {
      setFeatureSettings(featuresData.features)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  } finally {
    setLoading(false)
  }
}
```

**Saving Pattern**:
```typescript
const handleSave = async () => {
  setSaving(true)
  setMessage('')
  try {
    // Save AI config (existing)
    const configResponse = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_config: config }),
    })

    // Save feature settings (NEW)
    const featuresResponse = await fetch('/api/ai-features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: featureSettings }),
    })

    if (configResponse.ok && featuresResponse.ok) {
      setMessage('✓ Settings saved successfully')
    } else {
      setMessage('✗ Failed to save settings')
    }
  } catch (error) {
    setMessage('✗ Error saving settings')
  } finally {
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }
}
```

**Toggle Handler**:
```typescript
const handleFeatureToggle = (featureName: string, enabled: boolean) => {
  setFeatureSettings(prev =>
    prev.map(feature =>
      feature.feature_name === featureName
        ? { ...feature, enabled: enabled ? 1 : 0 }
        : feature
    )
  )
}
```

---

### UI Component Structure

**After the existing System Prompt field, add** (around line 254):

```tsx
{/* Divider */}
<hr className="retro-divider" />

{/* Features Section */}
<h3 className="retro-section-title">FEATURES</h3>

{/* Feature Toggles */}
{featureSettings.map((feature) => (
  <div key={feature.feature_name} className="retro-form-group">
    <label
      className="retro-checkbox-label"
      style={!config.enabled ? { opacity: 0.5 } : {}}
    >
      <input
        type="checkbox"
        className="retro-checkbox"
        checked={feature.enabled === 1}
        onChange={(e) => handleFeatureToggle(feature.feature_name, e.target.checked)}
        disabled={!config.enabled}
      />
      {getFeatureLabel(feature.feature_name)}
    </label>
    <p
      style={{
        fontSize: '11px',
        color: 'var(--retro-text-secondary)',
        marginTop: '4px',
        marginLeft: '24px',
        lineHeight: '1.4',
      }}
    >
      {getFeatureDescription(feature.feature_name)}
    </p>
  </div>
))}
```

**Helper functions** (add before return statement):

```typescript
const getFeatureLabel = (featureName: string): string => {
  switch (featureName) {
    case 'suggestion_panel':
      return 'AI Suggestion Panel'
    case 'tag_suggestions':
      return 'AI Tag Suggestions'
    case 'daily_summary':
      return 'AI Daily Summary'
    default:
      return featureName
  }
}

const getFeatureDescription = (featureName: string): string => {
  switch (featureName) {
    case 'suggestion_panel':
      return 'Preview AI analysis before creating items. Shows confidence score and metadata.'
    case 'tag_suggestions':
      return 'AI-powered tag recommendations when creating or editing entities. Prioritizes existing tags.'
    case 'daily_summary':
      return 'AI-generated summary in daily review notification. Requires notifications enabled.'
    default:
      return ''
  }
}
```

**Why not use feature.description from database?**
The database descriptions are brief (e.g., "Preview AI analysis before creating items"). The UI spec requires more detailed descriptions (2-3 lines). We could:
1. Use the brief DB descriptions (simple, but less helpful)
2. **Use hardcoded descriptions in the component** (matches spec exactly, recommended)
3. Update DB descriptions to be longer (changes Phase 1 work)

**Recommendation**: Use hardcoded descriptions in helper function (option 2) to match the spec precisely.

---

### Disabled State Pattern

When `config.enabled` is false (master AI toggle off), all feature toggles should be disabled:

```tsx
<input
  type="checkbox"
  className="retro-checkbox"
  checked={feature.enabled === 1}
  onChange={(e) => handleFeatureToggle(feature.feature_name, e.target.checked)}
  disabled={!config.enabled}  // ← Disable when master toggle is off
/>
```

Additionally, apply opacity to the label:
```tsx
<label
  className="retro-checkbox-label"
  style={!config.enabled ? { opacity: 0.5 } : {}}  // ← Visual disabled state
>
```

This matches the existing pattern used for other inputs (see lines 166-167, 177-178).

---

## Technical Reference Details

### TypeScript Type Definitions

**AIFeatureSetting Interface** (types/index.ts:166-170):
```typescript
export interface AIFeatureSetting {
  feature_name: string
  enabled: number          // SQLite boolean (0 or 1)
  description: string
}
```

**Note**: The `enabled` field is a number (0 or 1), not a boolean. This is because SQLite doesn't have a native boolean type. When checking/setting:
```typescript
// Checking if enabled
if (feature.enabled === 1) { /* enabled */ }

// Setting enabled state
{ ...feature, enabled: enabled ? 1 : 0 }
```

### API Endpoint Contracts

**GET /api/ai-features**:
- Method: GET
- Response:
  ```typescript
  {
    success: boolean
    features: AIFeatureSetting[]
  }
  ```

**PUT /api/ai-features**:
- Method: PUT
- Request Body:
  ```typescript
  {
    features: Array<{
      feature_name: string
      enabled: number
    }>
  }
  ```
- Response:
  ```typescript
  {
    success: boolean
    updated: number  // Count of updated features
  }
  ```

### React Hooks Used

**useState** for component state:
```typescript
const [config, setConfig] = useState<AIConfig>({ ... })
const [featureSettings, setFeatureSettings] = useState<AIFeatureSetting[]>([])
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)
const [message, setMessage] = useState('')
```

**useEffect** for data loading on mount:
```typescript
useEffect(() => {
  loadSettings()
}, [])
```

**Async fetch pattern**:
```typescript
const response = await fetch('/api/endpoint', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
})
const result = await response.json()
```

---

## Reference: Similar Component Pattern (NotificationsTab)

The NotificationsTab component (`/components/modern/settings/NotificationsTab.tsx`) provides a similar pattern we can follow:

**Loading multiple settings** (lines 45-64):
```typescript
const loadSettings = async () => {
  try {
    const response = await fetch('/api/settings')
    const data = await response.json()

    if (data.settings?.ntfy_config) {
      setConfig(data.settings.ntfy_config)
    }
    if (data.settings?.notification_events) {
      setEvents(data.settings.notification_events)
    }
    if (data.settings?.daily_review) {
      setDailyReview(data.settings.daily_review)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  } finally {
    setLoading(false)
  }
}
```

**Saving multiple settings** (lines 80-130):
```typescript
const handleSave = async () => {
  setSaving(true)
  setMessage('')

  // ... validation ...

  try {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ntfy_config: config,
        notification_events: events,
        daily_review: dailyReview,
      }),
    })

    if (response.ok) {
      setMessage('✓ Settings saved successfully')
    } else {
      setMessage('✗ Failed to save settings')
    }
  } catch (error) {
    setMessage('✗ Error saving settings')
  } finally {
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }
}
```

**Using dividers and section titles** (lines 300, 302, 354, 356):
```tsx
<hr className="retro-divider" />

<h3 className="retro-section-title">EVENT NOTIFICATIONS</h3>

{/* ... checkboxes ... */}

<hr className="retro-divider" />

<h3 className="retro-section-title">DAILY REVIEW REMINDER</h3>
```

This pattern matches what we need to implement for feature toggles.

---

## File Locations

**Primary Implementation File**:
- `/home/mmariani/Projects/idealisted/components/modern/settings/AISettingsTab.tsx`
  - Lines to modify: Add new state (around line 40), update loadSettings (around line 46), update handleSave (around line 60), add feature toggles UI (around line 254)

**Related Files**:
- `/home/mmariani/Projects/idealisted/app/api/ai-features/route.ts` (NEW - created in Task 2.1)
- `/home/mmariani/Projects/idealisted/types/index.ts` (AIFeatureSetting interface exists)
- `/home/mmariani/Projects/idealisted/styles/retro.css` (styling reference)

**Reference Files**:
- `/home/mmariani/Projects/idealisted/components/modern/settings/NotificationsTab.tsx` (similar pattern)
- `/home/mmariani/Projects/idealisted/components/modern/settings/AppearanceTab.tsx` (simpler example)

---

## Implementation Checklist

- [ ] Add `featureSettings` state variable with AIFeatureSetting[] type
- [ ] Update `loadSettings()` to fetch from `/api/ai-features`
- [ ] Update `handleSave()` to save to `/api/ai-features`
- [ ] Add `handleFeatureToggle()` function
- [ ] Add `getFeatureLabel()` helper function
- [ ] Add `getFeatureDescription()` helper function
- [ ] Add `<hr className="retro-divider" />` after system prompt field
- [ ] Add `<h3 className="retro-section-title">FEATURES</h3>`
- [ ] Map over `featureSettings` to render checkboxes
- [ ] Apply disabled state when `!config.enabled`
- [ ] Test loading settings from database
- [ ] Test saving settings to database
- [ ] Test master toggle disables feature toggles
- [ ] Verify descriptions match spec

---

## Testing Strategy

### Manual Testing Steps

1. **Fresh Load**:
   - Open Settings > AI tab
   - Verify 3 feature toggles appear below master toggle
   - Verify descriptions match spec
   - Verify default states: suggestion_panel ☑, tag_suggestions ☑, daily_summary ☐

2. **Master Toggle Interaction**:
   - Uncheck "Enable AI Features" master toggle
   - Verify all feature toggles become disabled (greyed out)
   - Verify feature checkboxes cannot be clicked
   - Re-enable master toggle
   - Verify feature toggles become clickable again

3. **Feature Toggle Interaction**:
   - Click each feature toggle
   - Verify checkbox state updates immediately
   - Click SAVE button
   - Refresh page
   - Verify toggle states persist

4. **Save Operation**:
   - Change multiple feature toggles
   - Click SAVE
   - Verify success message appears
   - Check database: `SELECT * FROM ai_feature_settings;`
   - Verify enabled values updated

5. **Error Handling**:
   - Stop the Next.js server
   - Try to save settings
   - Verify error message appears
   - Restart server
   - Verify settings still load correctly

### Database Verification

```bash
# Check feature settings in database
sqlite3 /home/mmariani/Projects/idealisted/data/idealisted.db

SELECT * FROM ai_feature_settings;

# Expected output:
# feature_name|enabled|description
# daily_summary|0|AI summary in daily review notifications
# suggestion_panel|1|Preview AI analysis before creating items
# tag_suggestions|1|AI-powered tag recommendations
```

### Console Verification

```bash
# In browser DevTools Console
# Verify fetch calls work
fetch('/api/ai-features')
  .then(r => r.json())
  .then(console.log)

# Expected output:
# {
#   success: true,
#   features: [
#     { feature_name: "suggestion_panel", enabled: 1, description: "..." },
#     { feature_name: "tag_suggestions", enabled: 1, description: "..." },
#     { feature_name: "daily_summary", enabled: 0, description: "..." }
#   ]
# }
```

---

## Success Criteria

From AI_AND_NTFY_TASKS.md (lines 106-112):

- [ ] Feature toggles render correctly
- [ ] Descriptions match spec
- [ ] Toggles disabled when master off
- [ ] Settings save and reload correctly
- [ ] UI matches retro theme

**Additional Criteria**:
- [ ] No console errors on load
- [ ] No console errors on save
- [ ] Loading state shows briefly on mount
- [ ] Saving state shows during save operation
- [ ] Success/error messages display correctly
- [ ] All 3 features appear in correct order
- [ ] Descriptions are readable and formatted correctly

---

## Code Example: Complete Implementation

**State additions** (add around line 40):
```typescript
interface AIFeatureSetting {
  feature_name: string
  enabled: number
  description: string
}

const [featureSettings, setFeatureSettings] = useState<AIFeatureSetting[]>([])
```

**Updated loadSettings** (replace existing function around line 46):
```typescript
const loadSettings = async () => {
  try {
    // Load AI config
    const settingsResponse = await fetch('/api/settings')
    const settingsData = await settingsResponse.json()
    if (settingsData.settings?.ai_config) {
      setConfig(settingsData.settings.ai_config)
    }

    // Load feature settings
    const featuresResponse = await fetch('/api/ai-features')
    const featuresData = await featuresResponse.json()
    if (featuresData.success && featuresData.features) {
      setFeatureSettings(featuresData.features)
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  } finally {
    setLoading(false)
  }
}
```

**Updated handleSave** (replace existing function around line 60):
```typescript
const handleSave = async () => {
  setSaving(true)
  setMessage('')
  try {
    // Save AI config
    const configResponse = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_config: config }),
    })

    // Save feature settings
    const featuresResponse = await fetch('/api/ai-features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: featureSettings }),
    })

    if (configResponse.ok && featuresResponse.ok) {
      setMessage('✓ Settings saved successfully')
    } else {
      setMessage('✗ Failed to save settings')
    }
  } catch (error) {
    setMessage('✗ Error saving settings')
  } finally {
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }
}
```

**Helper functions** (add before return statement):
```typescript
const handleFeatureToggle = (featureName: string, enabled: boolean) => {
  setFeatureSettings(prev =>
    prev.map(feature =>
      feature.feature_name === featureName
        ? { ...feature, enabled: enabled ? 1 : 0 }
        : feature
    )
  )
}

const getFeatureLabel = (featureName: string): string => {
  switch (featureName) {
    case 'suggestion_panel':
      return 'AI Suggestion Panel'
    case 'tag_suggestions':
      return 'AI Tag Suggestions'
    case 'daily_summary':
      return 'AI Daily Summary'
    default:
      return featureName
  }
}

const getFeatureDescription = (featureName: string): string => {
  switch (featureName) {
    case 'suggestion_panel':
      return 'Preview AI analysis before creating items. Shows confidence score and metadata.'
    case 'tag_suggestions':
      return 'AI-powered tag recommendations when creating or editing entities. Prioritizes existing tags.'
    case 'daily_summary':
      return 'AI-generated summary in daily review notification. Requires notifications enabled.'
    default:
      return ''
  }
}
```

**UI addition** (add after line 254, after system prompt field):
```tsx
{/* Features Section */}
<hr className="retro-divider" />

<h3 className="retro-section-title">FEATURES</h3>

{featureSettings.map((feature) => (
  <div key={feature.feature_name} className="retro-form-group">
    <label
      className="retro-checkbox-label"
      style={!config.enabled ? { opacity: 0.5 } : {}}
    >
      <input
        type="checkbox"
        className="retro-checkbox"
        checked={feature.enabled === 1}
        onChange={(e) => handleFeatureToggle(feature.feature_name, e.target.checked)}
        disabled={!config.enabled}
      />
      {getFeatureLabel(feature.feature_name)}
    </label>
    <p
      style={{
        fontSize: '11px',
        color: 'var(--retro-text-secondary)',
        marginTop: '4px',
        marginLeft: '24px',
        lineHeight: '1.4',
      }}
    >
      {getFeatureDescription(feature.feature_name)}
    </p>
  </div>
))}
```

---

## Important Notes

1. **enabled is a number (0 or 1), not boolean** - Always use `feature.enabled === 1` for checking, and `enabled ? 1 : 0` for setting
2. **Load features separately from settings** - They're in different tables/endpoints
3. **Save both config and features** - Both need to persist
4. **Disable when master toggle is off** - Use `disabled={!config.enabled}` prop
5. **Match existing patterns** - Follow the same structure as NotificationsTab
6. **Use retro classes** - All styling via retro.css classes
7. **Order matters** - Features should appear below all AI config fields
8. **Descriptions are hardcoded** - Match the spec exactly, don't use database descriptions

---

*Context pack generated for Task 2.2: Update AISettingsTab with Feature Toggles. This provides complete context for implementing the feature toggle UI with proper state management, API integration, and retro styling.*

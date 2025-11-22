# Context Bundle: Phase 3 Task 3.4 - Loading States and Error Handling

## Task Summary
**Goal**: Implement comprehensive loading states and error handling for the AI suggestion flow in the Capture screen.

**Current State**: AI suggestion flow exists but lacks visual feedback during processing and robust error handling.

**Target State**:
- Visual loading overlay on textarea during AI processing
- All buttons disabled during loading
- User-friendly error messages for all failure scenarios
- Graceful fallback to manual sorting on AI errors
- Timeout handling for long-running AI requests

---

## 1. Loading State Requirements

### Visual Feedback During AI Processing

**What Users Should See**:
1. **Spinner overlay** on the textarea (semi-transparent, doesn't hide text)
2. **"Analyzing with AI..."** message below or inside textarea
3. **All action buttons disabled** (greyed out, not clickable)
4. **AI dropdown menu closed** during processing
5. **Voice input disabled** during AI processing

**Expected Duration**:
- Typical AI response: 2-5 seconds
- Show "This is taking longer than usual..." after 5 seconds
- Timeout after 30 seconds

**Loading State Lifecycle**:
```
User clicks "AI ▾" → Sort/Convert/Full
  ↓
1. setAiLoading(true)
2. Show spinner overlay on textarea
3. Disable all buttons (capture, AI, voice)
4. Display "Analyzing with AI..." message
5. API call to /api/ai/suggest (or similar)
  ↓
SUCCESS: setAiLoading(false), show results
ERROR: setAiLoading(false), show error message, enable fallback
```

---

## 2. Current Loading Patterns in Codebase

### Existing Loading State Implementations

#### Pattern 1: MorningFinalizeModal (components/MorningFinalizeModal.tsx)
```tsx
const [isLoading, setIsLoading] = useState(false)

// Button with loading state
<RetroButton
  onClick={handleFinalize}
  variant="primary"
  disabled={isLoading || planTasks.length === 0}
>
  {isLoading ? 'Finalizing...' : 'Finalize Plan'}
</RetroButton>
```

#### Pattern 2: EveningReviewFlow (components/EveningReviewFlow.tsx)
```tsx
const [isLoading, setIsLoading] = useState(false)

<RetroButton
  onClick={handleComplete}
  variant="primary"
  disabled={isLoading}
>
  {isLoading ? 'Completing...' : 'Complete Review'}
</RetroButton>
```

#### Pattern 3: AISuggestionPanel (components/ui/AISuggestionPanel.tsx:52-63)
```tsx
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

### Available CSS Classes for Loading States

#### Retro Loading Styles (styles/retro.css)
```css
.retro-loading {
  font-family: var(--font-mono);
  font-size: 14px;
  text-align: center;
  padding: var(--space-xl);
  color: var(--palm-border-dark);
}

.retro-loading-dots {
  display: inline-block;
  animation: retro-pulse 1.4s infinite;
}

@keyframes retro-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
```

#### Overlay Styles (styles/retro.css:374-379)
```css
.retro-overlay {
  position: fixed;
  inset: 0;
  background: var(--palm-overlay);  /* rgba(45, 58, 45, 0.85) */
  z-index: 900;
}
```

### Button Disabled State
```css
.retro-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## 3. Error Scenarios

### Scenario 1: AI API Error (500/503)
**Trigger**: OpenRouter API returns error response
**User Message**: "AI service temporarily unavailable. You can still sort manually."
**Fallback**: Show original capture buttons, allow manual sorting

### Scenario 2: Rate Limit (429)
**Trigger**: Too many API requests
**User Message**: "AI rate limit reached. Try again in a moment or sort manually."
**Fallback**: Show manual sorting buttons

### Scenario 3: Authentication Error (401)
**Trigger**: Invalid API key
**User Message**: "AI configuration error. Check Settings > AI."
**Fallback**: Show manual sorting buttons, suggest settings check

### Scenario 4: Network Timeout
**Trigger**: Request exceeds 30 seconds
**User Message**: "AI request timed out. Please try again or sort manually."
**Fallback**: Show manual sorting buttons

### Scenario 5: Invalid Response Format
**Trigger**: AI returns malformed JSON
**User Message**: "AI returned unexpected data. Using smart fallback."
**Fallback**: Use `generateSmartFallback()` function (app/api/ai/suggest/route.ts:105-233)

### Scenario 6: AI Disabled (Feature Flag)
**Trigger**: `ai_config.enabled = false` in settings
**User Message**: "AI is disabled. Enable it in Settings > AI."
**Fallback**: Don't show AI button at all (already handled in CaptureScreen.tsx:175)

### Scenario 7: Empty/Invalid Input
**Trigger**: User submits empty text or whitespace only
**User Message**: "Please enter some text to analyze."
**Fallback**: Re-enable input, no API call made

### Scenario 8: Missing API Key
**Trigger**: No OpenRouter API key configured
**User Message**: "AI not configured. Using smart fallback suggestion."
**Fallback**: Use `generateSmartFallback()` (already handled in route.ts:31)

---

## 4. Error Messages

### Error Message Display Strategy

**Location Options**:
1. **Inline below textarea** (RECOMMENDED) - Non-intrusive, contextual
2. **Toast notification** (currently not implemented in app)
3. **Replace AI dropdown with error** - Temporary error state

**Message Format**:
```tsx
<div className="retro-error-message">
  <span className="retro-error-icon">⚠️</span>
  <span className="retro-error-text">{errorMessage}</span>
  <button className="retro-error-dismiss" onClick={clearError}>✕</button>
</div>
```

### User-Friendly vs Technical Messages

| Scenario | User-Facing Message | Technical Log |
|----------|-------------------|--------------|
| API 500 | "AI service temporarily unavailable" | `AI API error: ${response.status}` |
| Network timeout | "Request timed out" | `Fetch timeout after 30000ms` |
| Parse error | "AI returned unexpected data" | `JSON parse error: ${error.message}` |
| Missing key | "AI not configured" | `Missing OPENROUTER_API_KEY` |

### Auto-Dismiss Timing
- **Success messages**: 3 seconds
- **Info messages**: 5 seconds
- **Error messages**: 10 seconds (user can dismiss manually)
- **Critical errors**: Manual dismiss only

### Retry Options
```tsx
<div className="retro-error-actions">
  <button className="retro-btn retro-btn-secondary" onClick={retryAI}>
    Try Again
  </button>
  <button className="retro-btn retro-btn-primary" onClick={sortManually}>
    Sort Manually
  </button>
</div>
```

---

## 5. Fallback Behavior

### On AI Error → Manual Sorting Flow

**Current State**: CaptureScreen.tsx already has manual sorting buttons
**Fallback Flow**:
1. AI request fails
2. `setAiLoading(false)` - Hide spinner
3. Show error message (inline, 5-second auto-dismiss)
4. User sees original buttons: "✓ Unsorted", "Task", "Note ▾", etc.
5. User can still capture with manual type selection

### Show "Create Anyway" Button

**Pattern**: Don't block workflow, offer alternatives
```tsx
{aiError && (
  <div className="retro-fallback-actions">
    <p className="retro-error-message">{aiError}</p>
    <div className="flex gap-2">
      <button
        onClick={() => handleCapture(null)}
        className="retro-btn retro-btn-primary"
      >
        ✓ Create Anyway (Unsorted)
      </button>
      <button
        onClick={clearError}
        className="retro-btn retro-btn-secondary"
      >
        Cancel
      </button>
    </div>
  </div>
)}
```

### Preserve User's Original Text

**Critical**: Never lose user input on error
```tsx
const handleAIAction = async (action: 'sort' | 'convert' | 'full') => {
  if (!inputText.trim()) return

  // SAVE original text in case of error
  const originalText = inputText

  try {
    setAiLoading(true)
    setAiError(null)

    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: originalText, action }),
    })

    if (!response.ok) {
      throw new Error('AI request failed')
    }

    const data = await response.json()
    // Process suggestion...

  } catch (error) {
    // RESTORE original text
    setInputText(originalText)
    setAiError(getErrorMessage(error))
  } finally {
    setAiLoading(false)
  }
}
```

### Graceful Degradation to Non-AI Flow

**Philosophy**: AI is enhancement, not requirement
- If AI fails → user can still capture ideas manually
- If AI disabled → hide AI button entirely
- If smart fallback available → use it silently

---

## 6. Loading UI Components

### Spinner Overlay Implementation

**Option 1: Textarea Wrapper with Absolute Positioning**
```tsx
<div style={{ position: 'relative' }}>
  <textarea
    ref={textareaRef}
    value={inputText}
    onChange={(e) => setInputText(e.target.value)}
    disabled={aiLoading}
    className="retro-textarea"
    style={{
      minHeight: '96px',
      maxHeight: '40vh',
      paddingRight: isSupported ? '48px' : undefined,
    }}
  />

  {/* Loading Overlay */}
  {aiLoading && (
    <div className="retro-textarea-loading-overlay">
      <div className="retro-loading-spinner">
        <div className="retro-loading-dots">●●●</div>
      </div>
      <p className="retro-loading-message">Analyzing with AI...</p>
    </div>
  )}

  {/* Voice Input Button */}
  {isSupported && !aiLoading && (
    <button /* ... */ />
  )}
</div>
```

**CSS for Overlay**:
```css
.retro-textarea-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(165, 181, 165, 0.8); /* --palm-screen-light with opacity */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none; /* Allow clicking through if needed */
}

.retro-loading-spinner {
  font-family: var(--font-mono);
  font-size: 24px;
  color: var(--palm-text-dark);
}

.retro-loading-message {
  font-family: var(--font-mono);
  font-size: 12px;
  text-transform: uppercase;
  color: var(--palm-text-dark);
  margin-top: 8px;
  letter-spacing: 0.05em;
}
```

### Loading Message Component

**Dynamic Messages Based on Duration**:
```tsx
const [loadingMessage, setLoadingMessage] = useState('Analyzing with AI...')

useEffect(() => {
  if (!aiLoading) {
    setLoadingMessage('Analyzing with AI...')
    return
  }

  const timer1 = setTimeout(() => {
    setLoadingMessage('AI is thinking...')
  }, 3000)

  const timer2 = setTimeout(() => {
    setLoadingMessage('This is taking longer than usual...')
  }, 5000)

  return () => {
    clearTimeout(timer1)
    clearTimeout(timer2)
  }
}, [aiLoading])
```

### Button Disabled States

**All Buttons During Loading**:
```tsx
<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
  {entityButtons.map((btn, index) => (
    <button
      key={btn.label}
      onClick={/* ... */}
      disabled={!inputText.trim() || aiLoading} // ADD aiLoading check
      className={`retro-btn ${index === 0 ? 'retro-btn-primary' : 'retro-btn-secondary'}`}
    >
      {btn.label}
    </button>
  ))}

  {/* AI Button */}
  {aiEnabled && (
    <button
      onClick={() => setShowAIMenu(!showAIMenu)}
      disabled={!inputText.trim() || aiLoading} // ADD aiLoading check
      className="retro-btn retro-btn-secondary"
    >
      {aiLoading ? 'Processing...' : 'AI ▾'}
    </button>
  )}
</div>
```

### Textarea Read-Only During Loading

```tsx
<textarea
  ref={textareaRef}
  value={inputText}
  onChange={(e) => setInputText(e.target.value)}
  placeholder="Type your idea..."
  readOnly={aiLoading} // Prevent editing during AI processing
  className={`retro-textarea ${aiLoading ? 'retro-textarea-readonly' : ''}`}
  style={{
    minHeight: '96px',
    maxHeight: '40vh',
    cursor: aiLoading ? 'wait' : 'text',
  }}
/>
```

**CSS for Read-Only State**:
```css
.retro-textarea-readonly {
  background: var(--palm-screen-base);
  opacity: 0.8;
  cursor: wait !important;
}
```

### Progress Indication (Optional)

**For very long operations** (not needed for AI suggestions, but pattern available):
```tsx
<div className="retro-progress-bar">
  <div
    className="retro-progress-fill"
    style={{ width: `${progress}%` }}
  />
</div>
```

---

## 7. Timeout Handling

### AI Request Timeout Configuration

**Recommended Timeout**: 30 seconds
**Rationale**:
- Typical AI response: 2-5 seconds
- Network delays: +5 seconds
- API queue time: +10 seconds
- Buffer: +10 seconds

### Implementation Pattern

**Option 1: Fetch with AbortController** (RECOMMENDED)
```tsx
const handleAIAction = async (action: 'sort' | 'convert' | 'full') => {
  if (!inputText.trim()) return

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    setAiLoading(true)
    setAiError(null)

    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText, action }),
      signal: controller.signal, // Pass abort signal
    })

    clearTimeout(timeoutId) // Clear timeout on success

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    // Process suggestion...

  } catch (error: any) {
    if (error.name === 'AbortError') {
      setAiError('AI request timed out. Please try again or sort manually.')
    } else {
      setAiError(getErrorMessage(error))
    }
  } finally {
    clearTimeout(timeoutId)
    setAiLoading(false)
  }
}
```

**Option 2: Promise.race with Timeout** (Alternative)
```tsx
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ])
}

// Usage
const response = await fetchWithTimeout('/api/ai/suggest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: inputText, action }),
}, 30000)
```

### What Happens on Timeout

1. **AbortController aborts the fetch** - Cancels in-flight request
2. **Error caught in catch block** - `error.name === 'AbortError'`
3. **Loading state cleared** - `setAiLoading(false)`
4. **Error message shown** - "Request timed out. Try again or sort manually."
5. **User can retry or sort manually** - Buttons re-enabled

### User Notification on Timeout

```tsx
{aiError && (
  <div className="retro-error-inline">
    <span className="retro-error-icon">⏱️</span>
    <span className="retro-error-text">{aiError}</span>
    <button
      onClick={() => setAiError(null)}
      className="retro-error-dismiss"
    >
      ✕
    </button>
  </div>
)}
```

### Cancellation Option (Advanced)

**User-initiated cancellation**:
```tsx
const [abortController, setAbortController] = useState<AbortController | null>(null)

const handleAIAction = async (action: 'sort' | 'convert' | 'full') => {
  const controller = new AbortController()
  setAbortController(controller)

  // ... fetch with controller.signal ...
}

const cancelAIRequest = () => {
  if (abortController) {
    abortController.abort()
    setAiLoading(false)
    setAiError('AI request cancelled.')
    setAbortController(null)
  }
}

// UI
{aiLoading && (
  <button onClick={cancelAIRequest} className="retro-btn retro-btn-secondary">
    Cancel AI Processing
  </button>
)}
```

---

## 8. Code Examples

### Complete Implementation Example

**File**: `components/modern/screens/CaptureScreen.tsx`

**State Management**:
```tsx
const [inputText, setInputText] = useState('')
const [aiLoading, setAiLoading] = useState(false)
const [aiError, setAiError] = useState<string | null>(null)
const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
```

**AI Action Handler with Full Error Handling**:
```tsx
const handleAIAction = async (action: 'sort' | 'convert' | 'full') => {
  if (!inputText.trim()) {
    setAiError('Please enter some text to analyze.')
    return
  }

  const originalText = inputText
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    setAiLoading(true)
    setAiError(null)
    setShowAIMenu(false) // Close dropdown

    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: originalText, action }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      // Handle specific error codes
      if (response.status === 429) {
        throw new Error('rate_limit')
      } else if (response.status === 401) {
        throw new Error('auth_error')
      } else if (response.status >= 500) {
        throw new Error('server_error')
      } else {
        throw new Error(errorData.error || 'AI request failed')
      }
    }

    const data = await response.json()

    // Validate response format
    if (!data.suggested_type || !data.processed_text) {
      throw new Error('invalid_response')
    }

    setAiSuggestion(data)
    // Auto-apply suggestion or show suggestion panel based on action

  } catch (error: any) {
    // Restore original text
    setInputText(originalText)

    // Map errors to user-friendly messages
    if (error.name === 'AbortError') {
      setAiError('AI request timed out. Please try again or sort manually.')
    } else if (error.message === 'rate_limit') {
      setAiError('AI rate limit reached. Try again in a moment or sort manually.')
    } else if (error.message === 'auth_error') {
      setAiError('AI configuration error. Check Settings > AI.')
    } else if (error.message === 'server_error') {
      setAiError('AI service temporarily unavailable. You can still sort manually.')
    } else if (error.message === 'invalid_response') {
      setAiError('AI returned unexpected data. Using smart fallback.')
      // Could trigger smart fallback here
    } else {
      setAiError('AI processing failed. Try again or sort manually.')
    }

    console.error('AI processing error:', error)
  } finally {
    clearTimeout(timeoutId)
    setAiLoading(false)
  }
}
```

**Loading Overlay UI**:
```tsx
<div className="px-4 mb-4" style={{ paddingTop: '16px' }}>
  <div style={{ position: 'relative' }}>
    <textarea
      ref={textareaRef}
      value={inputText}
      onChange={(e) => setInputText(e.target.value)}
      placeholder="Type your idea..."
      readOnly={aiLoading}
      className={`retro-textarea ${aiLoading ? 'retro-textarea-readonly' : ''}`}
      style={{
        minHeight: '96px',
        maxHeight: '40vh',
        paddingRight: isSupported ? '48px' : undefined,
        cursor: aiLoading ? 'wait' : 'text',
      }}
    />

    {/* Loading Overlay */}
    {aiLoading && (
      <div className="retro-textarea-loading-overlay">
        <div className="retro-loading-spinner">
          <div className="retro-loading-dots">●●●</div>
        </div>
        <p className="retro-loading-message">Analyzing with AI...</p>
      </div>
    )}

    {/* Voice Input Button - only show when not loading */}
    {isSupported && !aiLoading && (
      <button
        onClick={handleVoiceInput}
        disabled={isListening}
        className="retro-btn retro-btn-secondary"
        style={{
          position: 'absolute',
          right: '8px',
          top: '8px',
          width: '32px',
          height: '32px',
          padding: '4px',
          fontSize: '16px',
          minWidth: 'unset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isListening ? '🔴' : '🎤'}
      </button>
    )}
  </div>

  {/* Error Message */}
  {aiError && (
    <div className="retro-error-inline" style={{ marginTop: '8px' }}>
      <span className="retro-error-icon">⚠️</span>
      <span className="retro-error-text">{aiError}</span>
      <button
        onClick={() => setAiError(null)}
        className="retro-error-dismiss"
      >
        ✕
      </button>
    </div>
  )}
</div>
```

**Button Disabled States**:
```tsx
<div className="px-4 mb-6">
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
    {entityButtons.map((btn, index) => (
      <button
        key={btn.label}
        onClick={() => {
          if (btn.hasDropdown) {
            setShowNoteMenu(!showNoteMenu)
          } else {
            handleCapture(btn.type)
          }
        }}
        disabled={!inputText.trim() || aiLoading}
        className={`retro-btn ${index === 0 ? 'retro-btn-primary' : 'retro-btn-secondary'} ${accentClass} whitespace-nowrap flex-shrink-0`}
      >
        {btn.label}
      </button>
    ))}

    {/* AI Button */}
    {aiEnabled && (
      <button
        onClick={() => setShowAIMenu(!showAIMenu)}
        disabled={!inputText.trim() || aiLoading}
        className="retro-btn retro-btn-secondary whitespace-nowrap flex-shrink-0"
      >
        {aiLoading ? 'Processing...' : 'AI ▾'}
      </button>
    )}
  </div>
</div>
```

**Error Message Styling (Add to styles/retro.css)**:
```css
/* Error inline display */
.retro-error-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(139, 107, 107, 0.3); /* --swipe-delete with opacity */
  border: 1px solid var(--palm-border-dark);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--palm-text-dark);
}

.retro-error-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.retro-error-text {
  flex: 1;
  line-height: 1.4;
}

.retro-error-dismiss {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  color: var(--palm-text-dark);
  opacity: 0.7;
}

.retro-error-dismiss:hover {
  opacity: 1;
}

/* Textarea loading overlay */
.retro-textarea-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(165, 181, 165, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border: 2px solid var(--palm-border);
}

.retro-textarea-readonly {
  opacity: 0.8;
  cursor: wait !important;
}
```

---

## 9. API Error Handling Reference

### Current API Route Error Handling

**File**: `app/api/ai/suggest/route.ts`

**Existing Error Responses**:
```typescript
// Missing text (400)
if (!text || typeof text !== 'string') {
  return NextResponse.json({ error: 'Text is required' }, { status: 400 })
}

// Feature disabled (403)
if (!featureEnabled) {
  return NextResponse.json(
    { error: 'AI suggestion panel feature is disabled. Enable it in Settings > AI > Features.' },
    { status: 403 }
  )
}

// AI API failure (falls back to smart fallback)
if (!response.ok) {
  throw new Error('AI API request failed')
}

// Parse error (falls back to smart fallback)
catch (parseError) {
  console.error('Failed to parse AI response:', aiResponse)
  return NextResponse.json(generateSmartFallback(text))
}

// General error (falls back to smart fallback)
catch (error) {
  console.error('AI suggestion error:', error)
  return NextResponse.json(generateSmartFallback(text || 'unknown'))
}
```

**Smart Fallback Always Returns 200 OK**: The API never returns 500 errors because it has a smart fallback. Frontend should check if `confidence < 0.8` to detect fallback usage.

---

## 10. Testing Checklist

### Manual Testing Scenarios

**Loading States**:
- [ ] Spinner appears immediately when AI action clicked
- [ ] "Analyzing with AI..." message displays
- [ ] All buttons disabled during loading
- [ ] Textarea becomes read-only during loading
- [ ] Voice button hides during loading
- [ ] AI dropdown closes when processing starts

**Success Flow**:
- [ ] Loading clears after successful AI response
- [ ] Suggestion panel appears with AI results
- [ ] Buttons re-enable after completion
- [ ] Textarea becomes editable again

**Error Handling**:
- [ ] Network timeout shows appropriate error message
- [ ] Rate limit error shows correct message
- [ ] Invalid API key shows config error
- [ ] Server error (500) shows service unavailable
- [ ] Parse error falls back to smart suggestion
- [ ] Empty input shows validation message

**Fallback Behavior**:
- [ ] Manual sorting buttons still work after AI error
- [ ] User text preserved in textarea after error
- [ ] Error message auto-dismisses after 10 seconds
- [ ] Manual dismiss works (✕ button)

**Edge Cases**:
- [ ] Multiple rapid AI clicks don't cause duplicate requests
- [ ] Switching tabs during AI loading cancels request (optional)
- [ ] AI disabled hides AI button entirely
- [ ] Voice input disabled during AI loading

---

## Implementation Notes

### Key Files to Modify
1. **components/modern/screens/CaptureScreen.tsx** - Add loading states, error handling
2. **styles/retro.css** - Add loading overlay, error message styles
3. **types/index.ts** - Already has `AISuggestion` type defined

### State to Add
```tsx
const [aiLoading, setAiLoading] = useState(false)
const [aiError, setAiError] = useState<string | null>(null)
const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
```

### Dependencies
- No new dependencies needed
- Use browser's `AbortController` for timeouts
- Use existing `retro-loading` and `retro-overlay` CSS classes

### Backend Changes
- **No changes needed** - API already handles errors gracefully
- Smart fallback at `app/api/ai/suggest/route.ts:105-233`

---

## Success Criteria

**Task is complete when**:
1. ✅ Spinner overlay appears on textarea during AI processing
2. ✅ All buttons disabled during loading with visual feedback
3. ✅ User-friendly error messages for all failure scenarios
4. ✅ 30-second timeout implemented with AbortController
5. ✅ User text preserved on error (never lost)
6. ✅ Fallback to manual sorting always available
7. ✅ Error messages auto-dismiss after 10 seconds
8. ✅ Loading states tested with network throttling
9. ✅ Error handling tested by killing API mid-request

---

## References

- **API Route**: `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts`
- **Capture Screen**: `/home/mmariani/Projects/idealisted/components/modern/screens/CaptureScreen.tsx`
- **Retro CSS**: `/home/mmariani/Projects/idealisted/styles/retro.css`
- **Types**: `/home/mmariani/Projects/idealisted/types/index.ts`
- **API Client**: `/home/mmariani/Projects/idealisted/lib/api-client.ts` (error handling pattern at line 15-18)
- **Existing Loading Patterns**: MorningFinalizeModal, EveningReviewFlow, AISuggestionPanel

---

**Last Updated**: 2025-01-14
**Task Owner**: Phase 3 Implementation
**Priority**: High (Required for MVP AI flow)

# Task 2.3: Feature Flag Checking - Testing Guide

## Implementation Summary

Feature flag checking has been implemented with the following changes:

### 1. AIService Enhancement
**File**: `/home/mmariani/Projects/idealisted/lib/ai.ts`

Added `isFeatureEnabled(featureName: string): Promise<boolean>` method:
- Checks master toggle first (fail fast)
- Queries `ai_feature_settings` table
- Returns `true` only if both master toggle AND feature flag are enabled
- Fails closed (returns `false` on error)

### 2. Component Updates

#### AISuggestionPanel
**File**: `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx`

- Added feature flag check on mount via `/api/ai-features` endpoint
- Checks `suggestion_panel` feature before rendering
- Hides panel if feature is disabled
- Logs when feature is skipped for debugging

#### EntityModal
**File**: `/home/mmariani/Projects/idealisted/components/modern/EntityModal.tsx`

- Added state for `tagSuggestionsEnabled`
- Checks `tag_suggestions` feature flag on mount
- Added TODO comment for Phase 4 Task 4.3 implementation pattern
- Ready for tag suggestions implementation

### 3. Backend Integration

#### Review Service
**File**: `/home/mmariani/Projects/idealisted/lib/review.ts`

- Added `daily_summary` feature check before generating AI summary
- Logs when summary is skipped due to disabled feature
- Gracefully continues with non-AI summary

#### AI Suggest API
**File**: `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts`

- Added feature flag check at route entry point
- Returns 403 with clear error message if feature disabled
- Prevents API calls when feature is off

## Testing Checklist

### Build Verification
- [x] Project builds successfully without TypeScript errors
- [x] No lint errors introduced

### Database State Verification
Current feature flag states:
```
daily_summary     | 0 | AI summary in daily review notifications
suggestion_panel  | 1 | Preview AI analysis before creating items
tag_suggestions   | 1 | AI-powered tag recommendations
```

### Manual Testing Steps

#### Test 1: Master Toggle OFF, Feature Flag ON
**Expected**: Feature should be disabled (master toggle takes precedence)

1. Start dev server: `PORT=3300 npm run dev`
2. Go to Settings > AI
3. Disable master AI toggle
4. In terminal, verify feature flag is ON:
   ```bash
   sqlite3 data/idealisted.db "SELECT * FROM ai_feature_settings WHERE feature_name = 'suggestion_panel';"
   ```
5. Try to use AI suggestion panel
6. **Expected**: Panel should NOT render (hidden)
7. Check browser console for log: "AI suggestion panel hidden: feature disabled"

#### Test 2: Master Toggle ON, Feature Flag OFF
**Expected**: Feature should be disabled (feature flag controls individual feature)

1. Go to Settings > AI
2. Enable master AI toggle
3. Disable suggestion_panel feature flag:
   ```bash
   sqlite3 data/idealisted.db "UPDATE ai_feature_settings SET enabled = 0 WHERE feature_name = 'suggestion_panel';"
   ```
4. Try to use AI suggestion panel
5. **Expected**: Panel should NOT render (hidden)
6. Check browser console for log: "AI suggestion panel hidden: feature disabled"

#### Test 3: Both Master and Feature Flag ON
**Expected**: Feature should work normally

1. Enable master AI toggle in Settings > AI
2. Enable suggestion_panel feature flag:
   ```bash
   sqlite3 data/idealisted.db "UPDATE ai_feature_settings SET enabled = 1 WHERE feature_name = 'suggestion_panel';"
   ```
3. Try to use AI suggestion panel
4. **Expected**: Panel should render and function normally

#### Test 4: Both Master and Feature Flag OFF
**Expected**: Feature should be disabled

1. Disable master AI toggle in Settings > AI
2. Disable suggestion_panel feature flag:
   ```bash
   sqlite3 data/idealisted.db "UPDATE ai_feature_settings SET enabled = 0 WHERE feature_name = 'suggestion_panel';"
   ```
3. Try to use AI suggestion panel
4. **Expected**: Panel should NOT render

#### Test 5: API Endpoint Protection
**Expected**: API returns 403 when feature disabled

1. Disable suggestion_panel:
   ```bash
   sqlite3 data/idealisted.db "UPDATE ai_feature_settings SET enabled = 0 WHERE feature_name = 'suggestion_panel';"
   ```
2. Make API call:
   ```bash
   curl -X POST http://localhost:3300/api/ai/suggest \
     -H "Content-Type: application/json" \
     -d '{"text":"test idea"}'
   ```
3. **Expected**: Response with status 403 and error message:
   ```json
   {
     "error": "AI suggestion panel feature is disabled. Enable it in Settings > AI > Features."
   }
   ```

#### Test 6: Daily Summary Feature Flag
**Expected**: Daily summary skipped when disabled

1. Disable daily_summary:
   ```bash
   sqlite3 data/idealisted.db "UPDATE ai_feature_settings SET enabled = 0 WHERE feature_name = 'daily_summary';"
   ```
2. Trigger daily review:
   ```bash
   curl -X POST http://localhost:3300/api/review
   ```
3. Check server console for log: "Daily summary skipped: feature disabled"
4. **Expected**: Review completes without AI summary

#### Test 7: Feature Flag Changes Reflect Immediately
**Expected**: Feature state updates without server restart

1. Start with feature enabled
2. Use feature to verify it works
3. Disable feature via SQL
4. Refresh page
5. **Expected**: Feature should now be hidden/disabled
6. Re-enable feature via SQL
7. Refresh page
8. **Expected**: Feature should work again

### Error Handling Tests

#### Test 8: Database Query Failure
**Expected**: Graceful degradation (feature disabled)

1. Temporarily rename database file to simulate failure
2. Try to check feature flag
3. **Expected**: Console error logged, feature disabled (fail closed)
4. Restore database file

#### Test 9: Malformed Feature Name
**Expected**: Returns false for non-existent feature

1. Call `aiService.isFeatureEnabled('non_existent_feature')`
2. **Expected**: Returns `false` (feature not found)

### Integration Tests

#### Test 10: EntityModal Tag Suggestions (Phase 4 Prep)
**Current State**: Not implemented yet (Phase 4 Task 4.3)

Verify setup is ready:
1. Check EntityModal has `tagSuggestionsEnabled` state
2. Verify feature flag check runs on mount
3. Confirm TODO comment exists with implementation pattern
4. **Expected**: Infrastructure ready for Phase 4 implementation

## Success Criteria Verification

### AIService
- [x] `isFeatureEnabled()` method implemented
- [x] Returns false if master toggle off
- [x] Returns false if feature disabled
- [x] Returns true only if both enabled
- [x] Uses dynamic import to avoid circular deps
- [x] Fails closed on error

### Component Gating
- [x] AISuggestionPanel hidden when `suggestion_panel` disabled
- [x] EntityModal ready for tag suggestions with `tag_suggestions` check
- [x] Daily summary skipped when `daily_summary` disabled

### API Protection
- [x] `/api/ai/suggest` protected with feature flag check
- [x] Returns 403 with clear error message when disabled
- [x] No API calls made when feature is off

### Error Handling
- [x] Clear console logs when features are skipped
- [x] Graceful degradation (fail closed)
- [x] No crashes if database query fails

### Database Integration
- [x] SQLite boolean check uses `=== 1` (not just truthiness)
- [x] Feature flags query from `ai_feature_settings` table
- [x] Master toggle checked before feature flag
- [x] Dynamic imports used for database access

## Rollback Instructions

If issues are found, revert with:

```bash
git checkout HEAD -- lib/ai.ts
git checkout HEAD -- components/ui/AISuggestionPanel.tsx
git checkout HEAD -- components/modern/EntityModal.tsx
git checkout HEAD -- lib/review.ts
git checkout HEAD -- app/api/ai/suggest/route.ts
```

## Next Steps

After testing is complete:
1. Verify all 4 state combinations work correctly
2. Confirm no performance issues with feature flag checks
3. Proceed to Task 2.4: Settings UI for feature toggles
4. Document any edge cases discovered during testing

## Implementation Files

### Modified Files
1. `/home/mmariani/Projects/idealisted/lib/ai.ts` - AIService.isFeatureEnabled()
2. `/home/mmariani/Projects/idealisted/components/ui/AISuggestionPanel.tsx` - Feature flag check
3. `/home/mmariani/Projects/idealisted/components/modern/EntityModal.tsx` - Tag suggestions prep
4. `/home/mmariani/Projects/idealisted/lib/review.ts` - Daily summary feature check
5. `/home/mmariani/Projects/idealisted/app/api/ai/suggest/route.ts` - API protection

### Database Schema
Table: `ai_feature_settings`
- `feature_name` TEXT PRIMARY KEY
- `enabled` INTEGER DEFAULT 0 (0=false, 1=true)
- `description` TEXT NOT NULL

### API Dependencies
- Requires `/api/ai-features` endpoint (Task 2.1)
- Components use GET `/api/ai-features` to check feature state
- Backend uses `aiService.isFeatureEnabled()` directly

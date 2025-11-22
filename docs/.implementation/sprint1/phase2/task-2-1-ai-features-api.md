# Task 2.1: Create AI Feature Settings API

## Context Bundle
**Read**: `docs/.implementation/phase2/context-task-2-1-ai-features-api.md` (comprehensive implementation guide)

## Task Summary
Create REST API endpoints to manage the ai_feature_settings table from Phase 1.

## Deliverables

### 1. Create API Route File
**File**: `app/api/ai-features/route.ts`

**Endpoints**:
- GET `/api/ai-features` - Fetch all 3 feature settings
- PUT `/api/ai-features` - Update feature enabled status

### 2. Implementation Requirements

**GET Endpoint**:
- Return all features from ai_feature_settings table
- Order by feature_name for consistent UI display
- Response format: `{ success: true, features: AIFeatureSetting[] }`

**PUT Endpoint**:
- Accept single feature or bulk updates
- Validate feature_name and enabled (0 or 1)
- Check feature exists (404 if not found)
- Return updated features after save

## Success Criteria

**Functional**:
- [ ] GET returns all 3 features correctly
- [ ] PUT updates single feature successfully
- [ ] PUT updates multiple features successfully
- [ ] Database changes persist across restarts

**Validation**:
- [ ] Returns 400 for invalid enabled values
- [ ] Returns 404 for non-existent features
- [ ] Returns 500 with message on database errors

**Code Quality**:
- [ ] Uses TypeScript AIFeatureSetting type
- [ ] Follows existing API patterns (settings, tags)
- [ ] Uses better-sqlite3 prepared statements
- [ ] Proper error logging

## Testing
Use curl commands from context bundle to verify all scenarios.

## Dependencies
None - ai_feature_settings table exists from Phase 1.

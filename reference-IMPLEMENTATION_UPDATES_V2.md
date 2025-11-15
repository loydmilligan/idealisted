# Implementation Plan Updates V2 - Refined Scope

**Date**: 2025-01-14
**Changes**: Focused AI features, updated starter tags, removed timeline estimates

---

## Update 1: Refined AI Feature Set

### Core AI Features (Settings)

**Settings > AI Tab - Final Feature List:**

```
┌─────────────────────────────────────────────────────────────┐
│ AI SETTINGS                                                  │
│                                                              │
│ Master Toggle:                                               │
│ ☑ Enable AI features                                        │
│                                                              │
│ OpenRouter API Key: [••••••••••••••] [Test Connection]      │
│ Model: [anthropic/claude-3-haiku] (Free)                    │
│                                                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ FEATURES                                                     │
│                                                              │
│ ☑ AI Suggestion Panel                                       │
│   When you click the AI button, show a preview of what      │
│   the AI thinks your idea is (task, note, project, etc.)    │
│   with confidence score and extracted metadata before        │
│   creating the item. You can accept, override, or dismiss.  │
│                                                              │
│ ☑ AI Tag Suggestions                                        │
│   Get AI-powered tag suggestions when creating or editing   │
│   entities. AI analyzes your content and suggests 3-5       │
│   relevant tags, prioritizing tags you already use.         │
│   Click individual tags to add, or "Accept All" button.     │
│                                                              │
│ ☐ AI Daily Summary                                          │
│   Include an AI-generated summary in your daily review      │
│   notification. AI analyzes your day's activity and         │
│   highlights achievements, patterns, and insights.          │
│   (Requires notifications enabled)                          │
│                                                              │
│ [Save Settings]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Removed Features** (not user-facing):
- ~~Smart Quick Add~~ (may implement later, not advertised)
- ~~AI Entity Recommendations~~ (may implement later, not advertised)

**Database Schema:**
```sql
CREATE TABLE ai_feature_settings (
  feature_name TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  description TEXT
);

-- Only 3 user-facing features
INSERT INTO ai_feature_settings VALUES
  ('suggestion_panel', true, 'Preview AI analysis before creating items'),
  ('tag_suggestions', true, 'AI-powered tag recommendations'),
  ('daily_summary', false, 'AI summary in daily review notifications');
```

---

## Update 2: Refined Starter Tags

### Updated Tag Groups

**Work & Productivity** (5 tags):
- #work
- #urgent
- #meeting
- #deadline
- #focus

**Personal** (5 tags):
- #home
- #health
- #finance
- #shopping
- #family

**Project Management** (5 tags):
- #bug
- #feature
- #design
- #planning
- #review

**Categories** (10 tags - NEW):
- #news
- #politics
- #tech
- #entertainment
- #culture
- #web
- #hobby
- #history
- #philosophy
- #science

**Removed Groups:**
- ~~Learning~~ (removed: #learning, #reading, #idea, #research)

**Total**: 25 default starter tags

### Database Seeding

```sql
INSERT INTO tags (id, tag_name, is_default, created_at) VALUES
  -- Work & Productivity
  (uuid(), 'work', true, unixepoch()),
  (uuid(), 'urgent', true, unixepoch()),
  (uuid(), 'meeting', true, unixepoch()),
  (uuid(), 'deadline', true, unixepoch()),
  (uuid(), 'focus', true, unixepoch()),

  -- Personal
  (uuid(), 'home', true, unixepoch()),
  (uuid(), 'health', true, unixepoch()),
  (uuid(), 'finance', true, unixepoch()),
  (uuid(), 'shopping', true, unixepoch()),
  (uuid(), 'family', true, unixepoch()),

  -- Project Management
  (uuid(), 'bug', true, unixepoch()),
  (uuid(), 'feature', true, unixepoch()),
  (uuid(), 'design', true, unixepoch()),
  (uuid(), 'planning', true, unixepoch()),
  (uuid(), 'review', true, unixepoch()),

  -- Categories
  (uuid(), 'news', true, unixepoch()),
  (uuid(), 'politics', true, unixepoch()),
  (uuid(), 'tech', true, unixepoch()),
  (uuid(), 'entertainment', true, unixepoch()),
  (uuid(), 'culture', true, unixepoch()),
  (uuid(), 'web', true, unixepoch()),
  (uuid(), 'hobby', true, unixepoch()),
  (uuid(), 'history', true, unixepoch()),
  (uuid(), 'philosophy', true, unixepoch()),
  (uuid(), 'science', true, unixepoch());
```

---

## Implementation Priority Order

### Phase 1: Database Foundation
1. Create tags table
2. Seed 25 default starter tags
3. Add reminder_datetime to tasks table
4. Add ai_feature_settings table

### Phase 2: AI Settings UI
1. Update AISettingsTab component
2. Add feature toggles (3 features only)
3. Feature flag checking logic
4. Test connection functionality

### Phase 3: AI Suggestion Flow
1. Modify capture flow (handleAICapture)
2. Enhance AISuggestionPanel component
3. Add loading states
4. Implement accept/override/dismiss logic

### Phase 4: AI Tag Suggestions
1. Create /api/ai/suggest-tags endpoint
2. Implement existing tag reuse logic
3. Update EntityModal UI with tag suggestions
4. "Accept All" + individual click-to-add

### Phase 5: Task Reminders
1. Add reminder datetime UI to task modal
2. Quick options (Morning of, 1hr before, etc.)
3. CRON job for reminder checks
4. Notification integration

### Phase 6: Scheduled Summary
1. Summary aggregation service
2. CRON jobs for scheduled times
3. Notification format
4. Settings UI for summary preferences

### Phase 7: Onboarding Wizard
1. Spotlight/tooltip system
2. Welcome modal
3. Tour steps (including AI explanation)
4. Settings integration for restart tour

---

## No Timeline Estimates

**Important**: Per user directive, this plan does not include timeline estimates. Implementation will proceed based on priority order above, completing features as efficiently as possible without artificial time constraints.

---

## Summary of Changes from V1

### What Changed:
1. ✅ Removed 2 AI features from user-facing settings (Smart Quick Add, Entity Recommendations)
2. ✅ Kept 3 core AI features (Suggestion Panel, Tag Suggestions, Daily Summary)
3. ✅ Updated starter tags: 25 tags across 4 groups
4. ✅ Renamed "Categories" to "Project Management"
5. ✅ Added new "Categories" group with topic tags
6. ✅ Removed "Learning" group entirely
7. ✅ Removed all timeline estimates from planning

### What Stayed Same:
- AI suggestion flow design (preview-first)
- Tag suggestion logic (reuse existing, "Accept All")
- Task reminder schema (reminder_datetime)
- Onboarding wizard approach (spotlight tour)
- Database architecture
- UI designs

---

## Ready for Implementation

**Database migrations ready:**
- tags table with 25 defaults
- reminder_datetime column
- ai_feature_settings table

**Components ready to update:**
- AISettingsTab (3 features only)
- AISuggestionPanel (enhanced)
- EntityModal (tag suggestions UI)
- Task modal (reminder datetime picker)

**New components to create:**
- OnboardingWizard system
- TourSpotlight/TourTooltip
- Tag management UI

---

## Questions Before Starting

None - specifications are clear. Ready to begin implementation starting with Phase 1 (Database Foundation).

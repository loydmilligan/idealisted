# Final Features Design - Competition Winning Release
**Date:** January 7, 2025
**Status:** Approved
**Goal:** Complete the retro Palm Pilot UI with tags, settings, AI integration, and notifications

## Overview

This design adds the final features to make IdeaListed the best of the three implementations:
1. Tags system with filtering
2. Comprehensive settings page (AI, Notifications, Tags, Appearance)
3. AI model toggle (hybrid: settings default + per-action override)
4. Entity color accents throughout app
5. Animated feedback (Ready badge + grid logo)
6. Task status system (pending/in-progress/completed)
7. Global header with dynamic subheader

## 1. Tags System

### Tag Storage
- Tags stored in `items.tags` JSON array (already exists)
- All entity tables (tasks, notes, projects, lists) have tags field
- Tag filtering: `WHERE tags LIKE '%"tagname"%'` for JSON array search

### Tag Input in Modals
```
Tags
[work] [urgent] [×]  [+ Add tag ▼]
└─ Dropdown: autocomplete from existing tags
```

Features:
- Autocomplete from existing tags
- Click X to remove tag
- Type new tag to create
- Tag colors shown if assigned in settings

### Tag Filtering
- Tag filter chips at top of Files screen
- Click tag to filter entities
- Multiple tags = AND logic
- Clear button to reset filters

## 2. Entity Color Accents

### Color Palette (Retro Muted)
Already defined in retro.css:
- Task: `#6B8B9E` (muted teal-grey)
- Note: `#9E8B6B` (muted tan-grey)
- Project: `#7B9E6B` (muted sage-grey)
- List: `#8B6B9E` (muted mauve-grey)

### Color Usage
1. **Entity badges** - `.retro-entity-badge-{type}` classes
2. **Entity cards** - Subtle left border with entity color
3. **Button accents** - When converting, show entity color tint
4. **Modal headers** - `.retro-bottom-sheet-{type}` colored borders
5. **Ready badge** - Flashes entity color when item added
6. **Grid logo** - Corner flashes matching entity color

### Animated Ready Badge
When item sorted to Ready:
- Badge flashes the entity color
- CSS animation: `@keyframes flash-entity-color`
- Duration: 600ms, ease-in-out

### Grid Logo Animation
2x2 grid in header (top-right):
- Top-left: Capture (inbox icon)
- Top-right: Unsorted (lightning icon)
- Bottom-left: Ready (checkmark icon)
- Bottom-right: Files (folder icon)

**Standard Sort Animation** (600ms):
- Single corner flashes entity color
- Subtle pulse effect

**AI Process Animation** (1200ms):
- All 4 corners pulse in sequence
- ✨ Sparkle particle effect
- Entity color + white highlight
- Slight bounce

## 3. Global Header

### Structure
```
┌─────────────────────────────────────────────────┐
│ IDEALISTED V1.0              🕐 2:34p  [⚙][▪▪] │
│ CAPTURE • SORT • TRACK • LEARN                  │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │  CAPTURE                                  │   │ <- Tab subheader
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Components
- **Logo**: "IDEALISTED V1.0" (monospace, retro green)
- **Tagline**: "CAPTURE • SORT • TRACK • LEARN" (smaller, subtle)
- **Clock**: Real-time HH:MM AM/PM (updates every minute)
- **Date**: MMM DD format (e.g., "JAN 07")
- **Grid**: 2x2 colored squares (flashes on activity)
- **Settings cog**: Opens settings modal

### Dynamic Subheader
Content changes per tab:
- Capture: "CAPTURE"
- Unsorted: "UNSORTED (2)"
- Ready: "READY (3)"
- Files: "FILES"

Styling:
- Darker background (`--palm-screen-dark`)
- White text
- Matches active tab indicator style

## 4. Settings Page

### Access
- Settings cog icon in top-right header
- Opens as full-screen retro modal
- Tabs: AI • Notifications • Tags • Appearance

### AI Settings Tab
```
AI CONFIGURATION

OpenRouter API Key
[sk-or-v1-************************]

Free Model
[meta-llama/llama-3.1-8b-instruct]

Paid Model
[anthropic/claude-3.5-sonnet]

[ ] Use Paid Model (Default)

Temperature: [0.7] ────────○──────
Max Tokens:  [2000]

System Prompt
[You are an intelligent assistant for IdeaListed...]
(textarea, 4 rows)

[TEST AI]  [SAVE]
```

### Notifications Tab
```
NOTIFICATION SETTINGS

Ntfy Configuration
Server URL  [https://ntfy.sh]
Topic       [idealisted-abc123]
Username    [optional]
Password    [••••••••]
Priority    [○ Low ● Default ○ High]

[TEST NOTIFICATION]

─────────────────────────────
Event Notifications
[✓] Task completed
[✓] Task due soon (1hr)
[✓] New idea captured
[✓] Idea sorted to Ready
[✓] Entity created

Daily Review Reminder
[✓] Enable daily review
Time: [06:00 PM] ▼
Include AI summary: [✓]

[SAVE]
```

**Daily Review Notification Content**:
- Title: "Time for Daily Review"
- Body shows:
  - X ideas unsorted → [link to Unsorted]
  - X ideas ready → [link to Ready]
  - X tasks remaining from today's plan → [link to Today]
  - AI-generated summary of today's work and ideas
- Sent at configured time daily

### Tags Tab
```
TAG MANAGEMENT

All Tags (12)

┌────────────────────────────────────┐
│ work (8 items)          [Edit][×] │
│ urgent (3 items)        [Edit][×] │
│ personal (5 items)      [Edit][×] │
│ research (2 items)      [Edit][×] │
└────────────────────────────────────┘

[+ ADD TAG]

Edit Tag: "work"
Name:     [work]
Color:    [●] ○ ○ ○ ○
Category: [Work ▼]

[RENAME ALL] [DELETE]
```

Features:
- View all tags with usage counts
- Assign colors to tags
- Set tag categories (work, personal, etc.)
- Rename tags globally (updates all items)
- Delete unused tags

### Appearance Tab
```
APPEARANCE

Theme
○ Classic Green (Palm Pilot)
○ Dark Mode
○ High Contrast

Display Options
[✓] Show timestamps
[✓] Show entity badges
[✓] Animations enabled

[SAVE]
```

## 5. AI Model Toggle (Hybrid)

### Settings Default
- Global toggle in AI Settings tab
- "Use Paid Model (Default)" checkbox
- Affects all AI operations when no override

### Per-Action Override
AI dropdown menu on each screen:
```
┌──────────────────────────┐
│ AI Actions               │
├──────────────────────────┤
│ [💰] Use Paid Model      │ <- Toggle checkbox
│ ─────────────────────    │
│ ✨ Auto-Sort             │
│ 🔄 Auto-Convert          │
│ 📝 Suggest Rewrite       │
│ 🏷️  Suggest Tags          │
└──────────────────────────┘
```

Indicators:
- 💰 = Paid model enabled
- 🆓 = Free model
- Checkbox state syncs with settings default
- Override applies only to current action

## 6. Task Status System

### Three States
- `pending` - Not started (default, grey)
- `in-progress` - Currently working on (blue outline)
- `completed` - Done (green checkmark)

### UI Controls
- Tap task card to cycle: pending → in-progress → completed
- Swipe right to mark complete directly
- Visual indicators:
  - Pending: Grey text, no decoration
  - In-progress: Blue left border, darker background
  - Completed: Green checkmark, strikethrough text

### Database
Status already exists in tasks table as:
```sql
status TEXT CHECK(status IN ('pending', 'in-progress', 'completed'))
```

## 7. Implementation Strategy

### Phase 1: Global Header & Infrastructure
1. Create global header component
2. Add clock/date functionality
3. Create grid logo component
4. Add settings cog and routing

### Phase 2: Settings Page
1. Create settings modal with tabs
2. Implement AI settings tab (connects to existing `/api/settings`)
3. Implement notifications tab
4. Implement tags tab
5. Implement appearance tab

### Phase 3: Tags System
1. Add tag input to entity modals
2. Add tag filtering to Files screen
3. Implement tag management (rename, delete, color)

### Phase 4: Color Accents & Animations
1. Add entity color accents to all components
2. Implement Ready badge flash animation
3. Implement grid logo animations (standard + AI)

### Phase 5: Task Status
1. Update task cards to show status
2. Add tap-to-cycle functionality
3. Update swipe actions

### Phase 6: AI Integration
1. Add model toggle to AI dropdowns
2. Connect to existing AI service
3. Implement per-action override
4. Test AI flows

### Phase 7: Notifications
1. Connect ntfy service (already exists at `/lib/notify`)
2. Add event triggers (task complete, idea captured, etc.)
3. Implement daily review notification
4. Add AI summary generation for daily review

## Success Metrics

✅ Tags working on all entity types
✅ Tag filtering in Files screen
✅ Settings page with all tabs functional
✅ AI model toggle working (settings + override)
✅ Entity colors visible throughout app
✅ Ready badge flashes entity color
✅ Grid logo flashes on activity
✅ Task status cycling works
✅ Notifications sending correctly
✅ Daily review notification working

## Technical Notes

### Existing Infrastructure
- `/api/settings` - GET/PUT for settings
- `/lib/ai.ts` - AIService with config management
- `/lib/notify.ts` - Ntfy service (needs import fix)
- `types/index.ts` - AIConfig, NtfyConfig interfaces
- Tags already in database schema

### New Components Needed
- `GlobalHeader.tsx`
- `GridLogo.tsx`
- `SettingsModal.tsx`
- `TagInput.tsx`
- `TagFilter.tsx`
- `AIDropdown.tsx` (enhance existing)

### Animation Libraries
- Use Framer Motion (already installed)
- CSS keyframe animations for simple effects

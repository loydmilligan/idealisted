# Idealist UI/UX Design Document

**Version:** 1.0  
**Date:** November 6, 2025  
**Author:** Claude (with Matt)

---

## Table of Contents

1. [Design Philosophy & Aesthetic](#1-design-philosophy--aesthetic)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Layout Grid & Spacing](#4-layout-grid--spacing)
5. [Bottom Tab Navigation](#5-bottom-tab-navigation)
6. [Capture Screen](#6-capture-screen)
7. [AI Dropdown Menus](#7-ai-dropdown-menus)
8. [Inbox Screens (Unsorted + Sorted)](#8-inbox-screens-unsorted--sorted)
9. [Entity Modal](#9-entity-modal)
10. [Entity Tabs Screen](#10-entity-tabs-screen)
11. [Animation Specifications](#11-animation-specifications)
12. [Interaction States](#12-interaction-states)
13. [Accessibility](#13-accessibility)
14. [Empty States](#14-empty-states)
15. [Settings Configuration](#15-settings-configuration)
16. [Technical Implementation Notes](#16-technical-implementation-notes)
17. [Responsive Considerations](#17-responsive-considerations)
18. [Future Considerations](#18-future-considerations)

---

## 1. Design Philosophy & Aesthetic

### Core Principles

**Palm Pilot Modern** - A mobile-first interface that honors 90s PDA design language while remaining functional for 2025:

- **Functional minimalism**: Every element serves a purpose
- **Button-driven interactions**: Direct manipulation over hidden gestures
- **List-based views**: Linear, scannable information hierarchy
- **Economy of space**: One primary task per screen
- **Tactile feedback**: Clear visual confirmation of every action
- **Color as information**: Color coding for entity types, not decoration

### Visual Characteristics

- Clean, high-contrast interfaces
- Restrained color palette with strategic pops
- Sans-serif typography (system fonts)
- Generous tap targets (minimum 44x44pt)
- Minimal shadows and gradients
- Strategic use of inversion for selection states

---

## 2. Color System

### Entity Colors (Primary)

```
Tasks:     #4A90E2 (Blue)
Notes:     #F5A623 (Yellow/Orange)
Projects:  #7ED321 (Green)
Lists:     #BD10E0 (Purple)
```

### State Colors

```
Muted/In-Progress: Entity color at 40% opacity
AI Tinge:          #6EC5FF (Bright blue) at 30% overlay
Delete Red:        #E74C3C
Background:        #FFFFFF (White)
Surface:           #F8F9FA (Light gray)
Text Primary:      #212529 (Near black)
Text Secondary:    #6C757D (Medium gray)
Borders:           #DEE2E6 (Light gray)
```

### Badge Colors

```
Count badges: #DC3545 (Red) with white text
```

---

## 3. Typography

### System

- **iOS**: SF Pro (system default)
- **Android**: Roboto (system default)

### Scale

```
Screen Titles:     24pt, Bold
Card Headers:      18pt, Semibold
Body Text:         16pt, Regular
Button Labels:     16pt, Semibold
Secondary Text:    14pt, Regular
Badge Text:        12pt, Bold
Tab Labels:        10pt, Medium
```

---

## 4. Layout Grid & Spacing

### Base Unit: 8pt

All spacing uses multiples of 8pt for consistency.

### Screen Margins

```
Horizontal:  16pt (sides)
Vertical:    16pt (top), 0pt (bottom - tabs touch edge)
```

### Component Spacing

```
Between cards:           12pt
Card padding:            16pt
Button height:           44pt
Tab bar height:          56pt
Input field height:      48pt
Icon size (tabs):        24x24pt
Icon size (buttons):     20x20pt
```

---

## 5. Bottom Tab Navigation

### Specifications

**Height**: 56pt + safe area inset  
**Background**: White with top border (1pt, #DEE2E6)  
**Active state**: Icon color changes to entity color, subtle label underline

### Tab Configuration

```
[📥 Capture] [⚡ Unsorted] [✓ Sorted] [⊞ Entities]
    Icon         Icon         Icon        Icon
  (16pt text) (16pt text)  (16pt text) (16pt text)
```

**Tab 1 - Capture:**
- Icon: Inbox/Input tray (📥) - 24x24pt
- Label: "Capture"
- No badge

**Tab 2 - Unsorted:**
- Icon: Lightning bolt (⚡) - 24x24pt
- Label: "Unsorted"
- Badge: Red circle with white count, 18pt diameter, positioned top-right of icon

**Tab 3 - Sorted:**
- Icon: Checkmark (✓) - 24x24pt  
- Label: "Sorted"
- Badge: Red circle with white count, 18pt diameter, positioned top-right of icon

**Tab 4 - Entities:**
- Icon: 2x2 grid of colored squares - 24x24pt total
  ```
  ┌──┬──┐
  │ T│ N│  Top-left: Blue, Top-right: Yellow
  ├──┼──┤
  │ P│ L│  Bottom-left: Green, Bottom-right: Purple
  └──┴──┘
  ```
  - Each square: 10x10pt with 2pt gap between
- Label: "Entities"
- No badge

### Flash Animation

**Invert Pulse (200-300ms):**

```
State 1 (0ms):     Normal colors
State 2 (100ms):   Inverted (black↔white, color↔background)
State 3 (300ms):   Back to normal
```

**AI Tinge Addition:**
- Add 30% opacity #6EC5FF overlay during flash
- Small sparkle particle (4pt star) appears and fades near icon
- Total duration: 300ms

---

## 6. Capture Screen

### Layout

```
┌─────────────────────────┐
│   Idealist              │ ← Screen title (24pt, centered)
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │                     │ │ ← Input field (multiline)
│ │ Type your idea...   │ │   Min height: 96pt
│ │                     │ │   Max height: 40% screen
│ └─────────────────────┘ │
│                         │
│ [✓]  Action Buttons Row │ ← See Action Buttons below
│                         │
│ ─────────────────────── │ ← Divider (1pt)
│                         │
│ Recently Captured       │ ← Section header (14pt, gray)
│                         │
│ ┌─────────────────────┐ │
│ │█ Meeting with Sarah │ │ ← List items (see below)
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │█ Buy groceries      │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

### Input Field

- **Border**: 1pt solid #DEE2E6, 8pt corner radius
- **Padding**: 12pt all sides
- **Placeholder**: "Type your idea..." (gray)
- **Auto-focus**: Yes, when screen loads
- **Behavior**: Expands vertically as user types

### Action Buttons Row

**Layout**: Horizontal scroll if needed, 8pt gaps between buttons

```
[✓ Unsorted] [Task] [Note ▾] [Project] [List] [AI ▾]
```

**Button Specs:**
- Height: 44pt
- Padding: 12pt horizontal
- Border: 1pt solid (entity color or gray for unsorted)
- Background: White
- Border radius: 8pt
- Label: 16pt, Semibold

**Entity Buttons:**
- Border color matches entity color
- Label has entity color
- Icon (if used): 20x20pt, left of label

**Dropdown Buttons (Note ▾, AI ▾):**
- Down arrow (▾) 12x12pt, right of label, gray

**Behavior on Press:**
1. Button inverts (200ms)
2. Target tab/corner flashes
3. Badge increments (if applicable)
4. Item appears in Recently Captured
5. Input field clears and refocuses

### Recently Captured Section

**List Item Specs:**

```
┌─────────────────────────┐
│█ Meeting with Sarah     │ ← 4pt colored stripe on left
│  2 min ago             │ ← Timestamp, 12pt gray
└─────────────────────────┘
```

- Height: 56pt
- Background: #F8F9FA (light gray surface)
- Border radius: 8pt
- Stripe: 4pt wide, full height, entity color (or gray if unsorted)
- Text: 16pt, truncates with ellipsis
- Timestamp: Right-aligned, 12pt, gray
- Tap: Navigates to item location (inbox or entity)
- Shows last 5 items only

---

## 7. AI Dropdown Menus

### Capture + Unsorted Screens

**Menu appears below button, overlays content:**

```
┌─────────────┐
│ Sort        │ ← 44pt rows
│ Convert     │
│ Full        │
└─────────────┘
```

**Menu Specs:**
- Width: 160pt
- Background: White
- Shadow: 0 4pt 12pt rgba(0,0,0,0.15)
- Border radius: 8pt
- Each option: 44pt height, 16pt text

### Sorted Screen

**Menu (2 options only):**

```
┌─────────────┐
│ Convert     │
│ Full        │
└─────────────┘
```

### Note Dropdown

**Template options:**

```
┌─────────────┐
│ Note        │ ← Default
│ Research    │
│ Video       │
│ Link        │
│ File        │
│ Meeting     │
└─────────────┘
```

- Same styling as AI menu
- Width: 140pt

### AI Sort Inline Confirmation

**Appears on card in list:**

```
┌─────────────────────────────┐
│ Buy groceries tomorrow      │
│ ✨ AI suggests: Task [✓][Change] │ ← 14pt, blue text, inline buttons
└─────────────────────────────┘
```

- Sparkle icon (✨) 16x16pt
- [✓] button: 32x32pt, green border, checkmark icon
- [Change] button: 32x32pt, gray border, pencil icon
- Pressing Change shows entity dropdown inline

---

## 8. Inbox Screens (Unsorted + Sorted)

### Layout

```
┌─────────────────────────┐
│   Unsorted (10)         │ ← Screen title + count
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │ Idea card           │ │ ← List of cards
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Idea card           │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Idea card           │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

### Unsorted Inbox Cards

```
┌─────────────────────────────────┐
│ Meeting with Sarah tomorrow     │ ← Idea text, 16pt
│ 2 min ago                       │ ← Timestamp, 12pt gray
│                                 │
│ [Task] [Note▾] [Project] [List] [AI▾] │ ← Action buttons
└─────────────────────────────────┘
```

**Card Specs:**
- Background: White
- Border: 1pt solid #DEE2E6
- Border radius: 12pt
- Padding: 16pt
- Margin bottom: 12pt
- No color stripe (not sorted yet)

**Action Buttons:**
- Same as Capture screen specs
- Horizontal layout, wrap if needed
- 8pt gaps between

### Sorted Inbox Cards

```
┌─────────────────────────────────┐
│█ Meeting with Sarah tomorrow    │ ← 4pt colored stripe, muted
│  Task                           │ ← Entity type label, entity color
│  5 min ago                      │ ← Timestamp, 12pt gray
│                                 │
│             [Convert] [AI▾]     │ ← Action buttons, right-aligned
└─────────────────────────────────┘
```

**Card Specs:**
- Background: Entity color at 10% opacity (very subtle tint)
- Border: 1pt solid entity color at 40% opacity
- Border radius: 12pt  
- Padding: 16pt
- Margin bottom: 12pt
- Stripe: 4pt wide, left edge, entity color at 40% opacity

**Entity Label:**
- 14pt, Semibold, entity color at 70% opacity
- Positioned below idea text

**Convert Button:**
- 44pt height, entity color border
- Background: White
- Label: entity color
- 120pt wide

### Swipe Gestures

**Swipe Left (Delete):**

```
Normal state → Reveal red background → Item slides left → Disappears
```

- Reveal distance: 80pt
- Red background: #E74C3C
- Trash icon: White, 24x24pt, centered in revealed area
- Completion threshold: 50% of card width
- Animation: 200ms ease-out

**Swipe Right (Configurable):**

```
Normal state → Reveal action background → Item slides right → Action executes
```

- Reveal distance: 80pt
- Background: Entity color (if "Sort to Task") or #6EC5FF (if AI action)
- Action icon: White, 24x24pt, centered
- Completion threshold: 50% of card width
- Animation: 200ms ease-out

---

## 9. Entity Modal

### Trigger

- Slides up from bottom
- Animation: 300ms ease-out
- Overlay: Black at 40% opacity behind modal

### Modal Specs

```
┌─────────────────────────┐
│  ─                      │ ← Drag handle (48pt wide, 4pt tall, gray)
│                         │
│  Task                   │ ← Entity type header, 24pt
│                         │
│  Title                  │ ← Field label, 14pt gray
│  ┌───────────────────┐  │
│  │ Meeting with...   │  │ ← Input field
│  └───────────────────┘  │
│                         │
│  Description            │
│  ┌───────────────────┐  │
│  │                   │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Due Date               │
│  ┌───────────────────┐  │
│  │ Select date...    │  │
│  └───────────────────┘  │
│                         │
│  Tags                   │
│  ┌───────────────────┐  │
│  │ + Add tag         │  │
│  └───────────────────┘  │
│                         │
│           [AI]          │ ← AI autofill button
│                         │
│        [Convert]        │ ← Primary action button
└─────────────────────────┘
```

**Modal Container:**
- Height: 85% of screen or content height (whichever is smaller)
- Background: White
- Border radius: 20pt (top corners only)
- Padding: 24pt horizontal, 16pt vertical
- Safe area inset: Respects bottom safe area

**Drag Handle:**
- Width: 48pt, Height: 4pt
- Background: #DEE2E6
- Border radius: 2pt
- Centered horizontally, 12pt from top

**Header:**
- 24pt Bold, entity color
- 8pt margin below handle

**Fields:**
- Label: 14pt Medium, #6C757D, 8pt above field
- Input: 48pt height, 16pt text, 12pt padding
- Border: 1pt solid #DEE2E6, 8pt radius
- Focus state: Border becomes entity color
- 16pt spacing between fields

**AI Button:**
- 44pt height, 160pt wide
- Centered
- Border: 1pt solid #6EC5FF
- Background: White
- Label: #6EC5FF, 16pt Semibold
- Sparkle icon (✨) 20x20pt left of label
- 24pt above Convert button

**Convert/Save Button:**
- 52pt height, full width minus padding
- Background: Entity color
- Label: White, 18pt Bold
- Border radius: 12pt
- Fixed to bottom (16pt from safe area)

---

## 10. Entity Tabs Screen

### Layout

```
┌─────────────────────────┐
│   Entities              │ ← Screen title
├─────────────────────────┤
│ [All][Tasks][Notes][Projects][Lists] │ ← Filter chips
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │
│ │█ Entity item        │ │ ← List view
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │█ Entity item        │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘
```

### Filter Chips

**Layout**: Horizontal scroll, 8pt gaps

```
[All] [Tasks] [Notes] [Projects] [Lists]
```

**Chip Specs:**
- Height: 36pt
- Padding: 12pt horizontal
- Border radius: 18pt (fully rounded)
- Inactive: Gray border, gray text
- Active: Entity color background, white text
- First chip (All): Always gray when active

### Entity List Items

```
┌─────────────────────────────────┐
│█ Meeting with Sarah tomorrow    │ ← Entity title, 16pt
│  Task • Due: Nov 10             │ ← Metadata, 14pt gray
│  #work #urgent                  │ ← Tags, 12pt, entity color
└─────────────────────────────────┘
```

**Item Specs:**
- Same card styling as Sorted inbox
- Stripe: Full entity color (not muted)
- Background: White
- Tap: Opens entity in edit modal
- Swipe left: Delete with confirmation
- Swipe right: (Configure per entity type - e.g., complete task)

---

## 11. Animation Specifications

### Tab Flash (Standard)

```
Frame 1 (0ms):    Normal state
Frame 2 (100ms):  Invert colors
Frame 3 (300ms):  Return to normal
Easing: ease-in-out
```

### Tab Flash (AI Tinge)

```
Frame 1 (0ms):    Normal state
Frame 2 (100ms):  Invert + #6EC5FF overlay (30%)
Frame 3 (150ms):  Sparkle particle appears (4pt star, fades in)
Frame 4 (300ms):  Return to normal, sparkle fades out
Easing: ease-in-out
```

### Entity Corner Flash

**Just the relevant square in 2x2 grid:**

```
Frame 1 (0ms):    Normal color
Frame 2 (100ms):  Inverted (white/black)
Frame 3 (300ms):  Return to normal
Scale: 1.0 → 1.1 → 1.0
Easing: ease-in-out
```

### Badge Increment

```
Frame 1 (0ms):    Current count
Frame 2 (100ms):  Scale 1.0 → 1.3
Frame 3 (200ms):  New count appears, scale 1.3 → 1.0
Easing: ease-out
```

### Modal Slide Up

```
Frame 1 (0ms):    Y position: 100% (off-screen bottom)
Frame 2 (300ms):  Y position: 0% (final position)
Overlay: Fades in 0% → 40% opacity simultaneously
Easing: ease-out
```

### Button Press

```
Frame 1 (0ms):    Normal state
Frame 2 (100ms):  Invert colors
Frame 3 (200ms):  Return to normal
Easing: ease-in-out
```

### Card Swipe Delete

```
X translation: 0 → -100%
Red background reveals behind card
Duration: 200ms after threshold
Easing: ease-out
```

### Recently Captured Item Appear

```
Frame 1 (0ms):    Opacity 0%, Y: -20pt
Frame 2 (200ms):  Opacity 100%, Y: 0pt
Easing: ease-out
```

---

## 12. Interaction States

### Buttons

- **Default**: As specified in component sections
- **Hover** (web): 5% darker background/border
- **Pressed**: Invert animation (200ms)
- **Disabled**: 40% opacity, no interaction

### Cards

- **Default**: As specified
- **Pressed**: 5% darker background (100ms)
- **Swiping**: X translation follows finger, reveals action background
- **Focus** (accessibility): 2pt blue outline

### Input Fields

- **Default**: Gray border
- **Focus**: Entity color border, no shadow
- **Error**: Red border, shake animation (3 frames, 100ms)
- **Disabled**: 40% opacity, gray background

### Tabs

- **Inactive**: Gray icon and label
- **Active**: Entity color icon, label has subtle underline (2pt)
- **Pressed**: Flash animation on selection

---

## 13. Accessibility

### Touch Targets

- Minimum size: 44x44pt for all interactive elements
- Spacing: Minimum 8pt between adjacent targets

### Color Contrast

- Text on white: Minimum 4.5:1 ratio (WCAG AA)
- Entity colors chosen for adequate contrast
- Muted colors at 40% still meet minimum contrast

### Screen Reader Labels

- All icons have descriptive labels
- Badge counts announced (e.g., "10 unsorted items")
- Action buttons describe outcome (e.g., "Sort as Task")
- Cards announce entity type and content

### Reduce Motion

- When enabled: Remove all transform/translate animations
- Keep opacity changes and color transitions
- Flash animations become simple border highlights

---

## 14. Empty States

### Capture Screen - No Recent Items

```
┌─────────────────────────┐
│ Recently Captured       │
│                         │
│   (Inbox icon, 48x48pt) │
│   Nothing here yet      │
│   Start capturing ideas!│
└─────────────────────────┘
```

### Inbox - No Items

```
┌─────────────────────────┐
│                         │
│   (Checkmark, 64x64pt)  │
│                         │
│   All caught up!        │
│   No items to process   │
│                         │
└─────────────────────────┘
```

### Entities - No Items (Filtered)

```
┌─────────────────────────┐
│                         │
│   (Entity icon, 64x64pt)│
│                         │
│   No Tasks yet          │
│   Capture your first one│
│                         │
└─────────────────────────┘
```

**Empty State Specs:**
- Icon: Gray (#6C757D), centered
- Title: 18pt Semibold, gray
- Subtitle: 14pt Regular, light gray
- Vertical spacing: 16pt between elements

---

## 15. Settings Configuration

### Configurable Options

**AI Behavior (Capture Screen):**
- Radio buttons: "Suggest category" vs "Auto-sort to category"
- Default: Suggest category

**Swipe Right Action (Unsorted Inbox):**
- Dropdown: "Sort to..." [Task/Note/Project/List]
- Default: Sort to Task

**Swipe Right Action (Sorted Inbox):**
- Dropdown: "Convert to..." [Keep Type/Change Type]
- Default: Convert (keep type)

**Swipe Right Action (Entity Tabs):**
- Per-entity configuration
- Task: "Mark complete"
- Note: "Archive"
- Project: "Mark active"
- List: "Duplicate"

---

## 16. Technical Implementation Notes

### State Management

- Recent captures: Store last 5, timestamp each
- Badge counts: Real-time from database query
- Flash animations: CSS animations or spring animations
- Modal state: Manages keyboard, prevents background scroll

### Performance

- List virtualization for >20 items
- Debounce AI suggestions (300ms after text stops)
- Lazy load entity details in modals
- Optimize badge count queries (cache for 1s)

### Data Flow

```
Capture → Unsorted DB → Sorted DB → Entity DB
                ↓            ↓           ↓
           Unsorted UI  Sorted UI   Entity UI
```

### API Calls

- AI Sort: `POST /ai/sort {text, context}`
- AI Convert: `POST /ai/convert {id, type, text}`
- AI Full: `POST /ai/full {id, type, text}`
- AI Fill Fields: `POST /ai/fill {entity_id, type}`

---

## 17. Responsive Considerations

### Screen Sizes

**Small (iPhone SE):**
- Reduce card padding to 12pt
- Stack buttons vertically if needed
- Modal at 90% screen height

**Medium (iPhone 15):**
- Standard specs as documented

**Large (iPhone 15 Pro Max):**
- Max content width: 480pt, centered
- Maintain spacing proportions

### Landscape Mode

- Two-column layout for entity lists (if width > 600pt)
- Modal becomes centered overlay (max width 400pt)
- Tabs remain at bottom

---

## 18. Future Considerations

### Phase 2 Features (Not in initial build)

- Voice-to-text capture button
- Bulk edit mode (select multiple)
- Search/filter within entities
- Dark mode support
- Widget for quick capture

### Design Tokens

Document all colors, spacing, typography in a central design token file for easy theming.

---

## Conclusion

This design system prioritizes clarity, speed, and tactile feedback. Every interaction provides immediate visual confirmation. The Palm Pilot aesthetic grounds the interface in functional simplicity while modern mobile UX patterns (swipe, modal slides) keep it feeling current. 

The color-coding system creates a strong mental model where entity types are instantly recognizable throughout the app. The key innovation is the 4-square entity icon that serves as both navigation and a dynamic feedback mechanism - users learn through repeated use that flashing squares mean their ideas are moving through the system.

---

## Appendix: Quick Reference

### Entity Colors
- Tasks: `#4A90E2` (Blue)
- Notes: `#F5A623` (Yellow)
- Projects: `#7ED321` (Green)
- Lists: `#BD10E0` (Purple)

### AI Actions Summary
- **Sort**: Suggests category with inline confirmation
- **Convert**: Opens modal pre-filled by AI, user reviews
- **Full**: AI completes everything invisibly (sparks only)

### Swipe Actions
- **Left**: Always delete
- **Right**: Configurable per screen in settings

### Animation Timings
- Button press: 200ms
- Tab flash: 300ms
- Modal slide: 300ms
- Badge increment: 200ms
- Swipe delete: 200ms

### Tab Icons
1. 📥 Capture (Inbox)
2. ⚡ Unsorted (Lightning)
3. ✓ Sorted (Checkmark)
4. ⊞ Entities (4-color grid)

---

**End of Document**

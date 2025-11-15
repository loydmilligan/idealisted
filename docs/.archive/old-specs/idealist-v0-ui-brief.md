# Idealist - UI Design Brief for V0

## App Overview
Idealist is a mobile-first idea capture and project management app designed for frictionless daily productivity. Users quickly capture any thought, task, link, or note throughout the day, then organize and convert them into actionable items during dedicated review sessions. The app centers around a daily planning workflow: morning plan finalization → execution → evening review and next-day prep.

---

## Design Aesthetic: Nostalgic Device Interface

### Core Concept
The UI is a deliberate throwback to late 1990s **Palm Pilot** and early 2000s **BlackBerry** devices, evoking the tactile, focused productivity tools of the pre-smartphone era. The interface should feel like a physical device sitting on a surface.

### Key Visual Principles
- Physical device frame/bezel surrounding the screen
- Monochromatic LCD-inspired screen aesthetic (no high-contrast whites)
- Chunky, finger-friendly buttons and touch targets
- Minimal gradients, flat design within the screen area
- System/pixel-style fonts or clean sans-serif fonts
- Tab bar navigation at bottom (like Palm OS applications)
- Subtle textures that suggest plastic/metal materials

---

## Color Palette

### Primary Colors
```
Device Frame: 
  - Metallic gray/silver (#858585, #A8A8A8, #C0C0C0)
  - Subtle gradient for 3D effect

Screen Background:
  - Warm beige/tan (#D4C4A8, #E5DCC8)
  - Slightly yellowish, like aged LCD screens

Outer Background:
  - Deep forest green gradient (#2D4A2C to #3A5F39)
  - Suggests the device sitting on a surface
```

### UI Colors
```
Headers:
  - Deep blue (#1E4D7B, #2C5F8F)
  - Gold/yellow text (#F4C430, #FFD700)

Buttons:
  - Primary blue (#4A90E2, #5B9BD5)
  - Success green (#6B8E23)
  - Destructive red (#D64545, #E74C3C)
  - Secondary gray (#8B8B8B)

Text:
  - Primary black (#1A1A1A)
  - Secondary dark gray (#4A4A4A)
  - Disabled gray (#999999)

Accents:
  - Warning orange (#E67E22)
  - Info teal (#16A085)
```

### Badge Colors
```
🟡 Yellow (#FDB813): Informational counts (Unparsed inbox)
🔴 Red (#D64545): Action needed (Ready to convert)
🟢 Green (#6B8E23): Success/completed
```

---

## Screen Specifications

### Universal Layout Structure
```
┌─────────────────────────────────────┐
│ 🍃 APP NAME       TIME    [icon]    │ ← Status bar (gray)
├─────────────────────────────────────┤
│ SCREEN TITLE               [action] │ ← Header (blue, gold text)
├─────────────────────────────────────┤
│                                     │
│                                     │
│        Main Content Area            │
│        (beige background)           │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [ICON] [ICON] [ICON] [ICON] [ICON] │ ← Tab bar navigation
│ Label  Label  Label  Label  Label   │
└─────────────────────────────────────┘
```

---

## Navigation: Bottom Tab Bar

### Tab Bar Structure
5 tabs, always visible at bottom of screen:

1. **CAPTURE** 
   - Icon: 📷 or ✏️ 
   - Primary screen for quick capture

2. **INBOX**
   - Icon: 📬 or 📨
   - Badge showing unparsed count
   - Combines unparsed ideas and ready-to-convert

3. **TASKS**
   - Icon: ✓ or 📋
   - Shows all tasks, filterable by Today/Backlog

4. **NOTES**
   - Icon: 📝 or 📄
   - Library of all notes

5. **LISTS** or **PROJECTS**
   - Icon: 📑 or 📁
   - Access to projects and lists

**Visual Style:**
- Gray background bar
- Inactive icons: dark gray
- Active icon: blue with underline or highlight
- Label text below icons (8-10pt font)

---

## Core Screens

### 1. Capture Screen (Primary/Home)

**Purpose:** Frictionless idea capture with optional immediate categorization

**Layout:**
```
┌─────────────────────────────────────┐
│ CAPTURE                  [AI▾]      │
├─────────────────────────────────────┤
│ QUICK CAPTURE                       │
│ ┌─────────────────────────────────┐ │
│ │ Type your idea...        [✓][📎]│ │ ← Input field + buttons
│ └─────────────────────────────────┘ │
│                                     │
│ QUICK ADD                           │
│ [Task] [Note▾] [List] [Project]    │ ← Chunky buttons
│                                     │
│ ──────────────────────────────────  │
│                                     │
│ INBOX (12 unparsed) (5 ready)      │ ← Section header with badges
│                                     │
│ ⚡ call Sarah about Q4              │ ← Unparsed item
│    [Task][Note][List][Project]      │    Category buttons
│                                     │
│ 📋 Document API endpoints           │ ← Parsed item (task emoji)
│    [Convert] [Edit Category]        │    Action buttons
│                                     │
│ 🔬 Python async patterns            │ ← Parsed item (research emoji)
│    [Convert] [Edit Category]        │
│                                     │
│ [View All Parsed] [Empty Inbox]     │ ← Bottom actions
└─────────────────────────────────────┘
```

**UI Elements:**
- **Input field:** Single-line text input with rounded corners
- **Checkmark button (✓):** Submit captured idea
- **Attachment button (📎):** Add files/images
- **Quick Add buttons:** Medium-sized, blue, pill-shaped
- **Note button (▾):** Split button with dropdown arrow
- **Idea cards:** Rounded rectangles with slight shadow
- **Category buttons:** Small, inline, secondary style
- **Convert button:** Blue, pill-shaped
- **Badges:** Circular, colored (yellow/red), with count

---

### 2. Projects Screen

**Purpose:** View all projects with progress indicators

**Layout:**
```
┌─────────────────────────────────────┐
│ PROJECTS                   [+]      │
├─────────────────────────────────────┤
│ ALL PROJECTS         [CLEAR ALL]    │
│ Overview of all your projects       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Project: ChatterAI v2.0    [⋮]  │ │ ← Project card
│ │ ▓▓▓▓▓▓▓▓░░░░  73%              │ │ ← Progress bar
│ │ 11 of 15 tasks • Updated 2d ago │ │ ← Status line
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Project: Home Office Setup [⋮]  │ │
│ │ ▓▓▓░░░░░░░░░  25%              │ │
│ │ 3 of 12 tasks • Updated 5d ago  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [+ New Project]                     │
└─────────────────────────────────────┘
```

**UI Elements:**
- **Project cards:** Rounded rectangle containers with padding
- **Progress bar:** Horizontal filled bar (blocky, pixel-style)
- **[⋮] menu:** Kebab menu for edit/delete
- **Status line:** Small gray text with metadata
- **[CLEAR ALL] button:** Red, top-right, destructive action

---

### 3. Project Dashboard (Slide-Up Panel)

**Purpose:** Detailed project view with dashboard metrics

**Trigger:** Tap any project card from Projects screen

**Layout:**
```
┌─────────────────────────────────────┐
│ ← PROJECT: ChatterAI v2.0           │ ← Header with back
├─────────────────────────────────────┤
│        ╭───────────╮                │
│        │   73%     │                │ ← Circular progress
│        │  ██████   │                │   (Palm Pilot style)
│        │  11 / 15  │                │
│        ╰───────────╯                │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 🔥 CURRENT TASK               │   │ ← Highlighted card
│ │ Implement SSE transport       │   │
│ │ ⚡ Medium  │  📅 Nov 8         │   │
│ └───────────────────────────────┘   │
│                                     │
│ 🚧 FINISHING POWER: ▓▓▓░░ (3/5)    │ ← Progress meter
│                                     │
│ REMAINING TASKS                     │
│ ⚠️  Write tests (ugh)               │ ← Task with "ugh" tag
│ ⚡ Deploy to staging                │
│ ✓ Final review                      │
│                                     │
│ [+Task] [Timeline] [Notes]          │ ← Action buttons
└─────────────────────────────────────┘
```

**UI Elements:**
- **Slide-up panel:** Covers ~70% of screen from bottom
- **Circular progress:** Large, centered, circular meter
- **Current task card:** Bordered, highlighted section
- **Finishing Power meter:** Horizontal blocky progress bar
- **Task list:** Simple rows with checkboxes and icons
- **Action buttons:** Bottom-aligned, inline, blue

---

### 4. Tasks Screen

**Purpose:** View and manage all tasks

**Layout:**
```
┌─────────────────────────────────────┐
│ TASKS                      [+]      │
├─────────────────────────────────────┤
│ [Today's Plan] [Backlog] [All]      │ ← Filter tabs
│                                     │
│ ⚠️  HIGH PRIORITY                   │ ← Section header
│ □ Write comprehensive tests        │ ← Task with checkbox
│   Due: Nov 8 • ChatterAI           │ ← Metadata
│                                     │
│ ⚡ MEDIUM PRIORITY                  │
│ □ Implement SSE transport          │
│   Due: Nov 8 • ChatterAI           │
│                                     │
│ ✓ LOW PRIORITY                     │
│ ☑ Deploy to staging                │ ← Completed task
│   Completed: Nov 6 • ChatterAI     │
│                                     │
│ [Add to Today's Plan]               │ ← Bottom action
└─────────────────────────────────────┘
```

**UI Elements:**
- **Filter tabs:** Pill-shaped buttons, blue when active
- **Section headers:** All caps, with emoji icons
- **Checkboxes:** Large, square, easy to tap
- **Task rows:** Tappable, show metadata below title
- **Priority badges:** Colored emoji indicators
- **Metadata text:** Small, gray, below task name

---

### 5. Notes Screen

**Purpose:** Library of all notes organized by type

**Layout:**
```
┌─────────────────────────────────────┐
│ NOTES                      [+]      │
├─────────────────────────────────────┤
│ [All] [Research] [Video] [Meeting]  │ ← Type filters
│                                     │
│ 🔬 RESEARCH                         │
│ ┌─────────────────────────────────┐ │
│ │ Python async patterns           │ │ ← Note card
│ │ Updated 3 days ago              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🤝 MEETINGS                         │
│ ┌─────────────────────────────────┐ │
│ │ Q4 Planning Session             │ │
│ │ Nov 3 • 3 action items          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 🎥 VIDEOS                           │
│ ┌─────────────────────────────────┐ │
│ │ FastAPI Tutorial Series         │ │
│ │ Saved 1 week ago • Unread       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**UI Elements:**
- **Type filter tabs:** Horizontal scroll, pill-shaped
- **Section headers:** Emoji + all caps label
- **Note cards:** Rounded rectangles with subtle border
- **Status badges:** "Unread", "To-watch", etc.

---

## User Flow: Capture → Parse → Convert

### Flow Diagram
```
1. CAPTURE SCREEN
   ↓ Type idea + tap ✓
   
2. Idea lands in INBOX (unparsed) ⚡
   ↓ Tap category button OR use Quick Add
   
3. Idea becomes "parsed" 📋
   Shows [Convert] button
   ↓ Tap [Convert]
   
4. CONVERSION MODAL
   Pre-filled form with smart defaults
   ↓ Review & Save
   
5. Full entity created
   Appears in Tasks/Notes/Projects/Lists
```

---

## Key Interaction Patterns

### Split Button (Note Quick Add)
```
┌────────────────┬──┐
│  📝 NOTE       │▼ │ ← Main button + arrow
└────────────────┴──┘

Tap arrow → Dropdown appears:
┌────────────────┬──┐
│  📝 NOTE       │▲ │
├────────────────────┤
│ 🔬 Research       │
│ 🎥 Video          │
│ 🔗 Link           │
│ 📁 File           │
│ 👤 Person         │
│ 🤝 Meeting        │
└───────────────────┘
```

### Slide-Up Panel
- Triggered by tapping entities (projects, tasks, notes)
- Slides up from bottom covering 70% of screen
- Background dims slightly
- Swipe down or tap dimmed area to dismiss
- Shows detailed view + edit controls

### Inline Category Buttons
- Small buttons below unparsed ideas
- Tap to parse (categorize) the idea
- Replace with [Convert] button after parsing

---

## Typography

### Font Recommendations
**Option 1 (Nostalgic):**
- Headers: "Courier New" or "Consolas" (monospace)
- Body: "Verdana" or "Tahoma" (clean, readable)

**Option 2 (Modern retro):**
- Headers: "Space Mono" or "IBM Plex Mono"
- Body: "Inter" or "Open Sans"

### Font Sizes
- Screen titles: 18-20px, bold
- Section headers: 14-16px, all caps, bold
- Body text: 14-16px, regular
- Metadata/timestamps: 12-14px, gray
- Button text: 14-16px, medium weight
- Tab bar labels: 10-12px

---

## Spacing & Layout

### Grid System
- Base unit: 8px
- Padding (screen edges): 16px
- Padding (card interior): 12-16px
- Gap between cards: 12px
- Gap between sections: 24px

### Touch Targets
- Minimum button size: 44x44px
- Tab bar icons: 48x48px touch area
- Checkboxes: 32x32px
- Text input height: 48-56px

---

## Animation & Motion

### Keep It Subtle
- Slide-up panel: 300ms ease-out
- Button press: Scale down slightly (0.95) for tactile feedback
- Tab switching: Crossfade 200ms
- List item deletion: Slide left 250ms
- Badge number updates: Subtle pulse

### No Animations For:
- Simple taps/selections
- Text changes
- Status updates
All instantaneous for snappy, old-device feel

---

## Special UI Components

### Procrastination Alert (Dashboard)
```
⚠️  PROCRASTINATION ALERT
┌─────────────────────────────────┐
│ Project is 73% done but stalled │
│ 4 tasks left, 2 marked "dreaded"│
│ Last task: 4 days ago           │
│ [Power Through] [Break It Down] │
└─────────────────────────────────┘
```
- Orange/red border
- Warning icon
- Two action buttons inline

### Momentum Indicator
```
Status badge in project cards:
🟢 Hot! (completed within 2 days)
🟡 Cooling (3-7 days)
🔴 Stalled (8+ days)
```

### Badges with Counts
```
Circular badge: (12)
- 12px padding
- Bold number
- Colored background (yellow/red/green)
- Positioned top-right of button/tab
```

---

## Mobile-First Considerations

### Thumb-Friendly Design
- Primary actions in bottom 1/3 of screen
- Tab bar always accessible
- Large tap targets (44px minimum)
- Swipe gestures for dismissing panels

### Single-Column Layout
- No complex multi-column layouts
- Stack content vertically
- Horizontal scrolling only for filters/tabs

### Responsive Text
- Scale slightly larger for readability
- Line height: 1.4-1.6 for body text
- Avoid walls of text, break into sections

---

## Implementation Notes for V0

### Priority Elements to Mock
1. Capture screen with inbox (most important)
2. Project card with progress bar
3. Project dashboard slide-up panel
4. Tab bar navigation structure
5. Split button dropdown (Note quick add)

### Design System Tokens
```css
--color-device-frame: #A8A8A8;
--color-screen-bg: #E5DCC8;
--color-header-bg: #2C5F8F;
--color-header-text: #FFD700;
--color-button-primary: #5B9BD5;
--color-button-destructive: #E74C3C;
--color-text-primary: #1A1A1A;
--color-text-secondary: #4A4A4A;
--color-badge-warning: #FDB813;
--color-badge-danger: #D64545;

--border-radius-card: 8px;
--border-radius-button: 6px;
--spacing-unit: 8px;
--font-size-base: 14px;
```

---

## Planned UI Enhancement: Visual Flow System (In Progress)

### Overview
We're redesigning the inbox experience to transform from horizontal tab navigation to a **vertical flow visualization** that shows the journey of ideas through the system. This creates a more intuitive, visual representation of the capture → sort → convert workflow.

### Core Concept: Flow-Based Layout

**Current State:**
- Horizontal tabs: "Unparsed" | "Ready to Convert"
- Static, segmented view
- No visual connection between stages

**New Design:**
- **Vertical flow sections** stacked top to bottom
- **Visual flow lines** connecting stages
- **Dual path system** (manual vs Quick Add bypass)
- **Animated indicators** for item movement

---

### Layout Structure

```
┌─────────────────────────────────────┐
│ CAPTURE AREA                        │
│ ┌─────────────────────────────────┐ │
│ │ Type your idea...        [✓][📎]│ │
│ └─────────────────────────────────┘ │
│         │                           │
│         │ Flow Line (Left Path)     │
│         ↓                           │
├─────────────────────────────────────┤
│ QUICK ADD BUTTONS     ──┐           │  ← Right bypass path
│ [Task] [Project] [List] [Notes]  │  │     starts here
│         │               │           │
│         │               └──→─┐      │
│         ↓                   │      │
├─────────────────────────────────────┤
│ UNSORTED IDEAS (12)         │      │
│ ⚡ call Sarah about Q4       │      │  ← Grey-blue colored
│ ⚡ Python async patterns     │      │     (unsorted state)
│         │                   │      │
│         │ Flow Line         │      │
│         ↓                   ↓      │
├─────────────────────────────────────┤
│ SORTED IDEAS (5)                    │
│ 📋 Document API endpoints           │  ← Pastel colored
│ 🔬 Research async patterns          │     (sorted state)
│         │                           │
│         │ Flow Line                 │
│         ↓                           │
├─────────────────────────────────────┤
│ CONVERT TO ENTITY                   │
│         │                           │
│         │ Flow to Tabs              │
│         ↓                           │
├─────────────────────────────────────┤
│ [Tasks] [Projects] [Lists] [Notes] │  ← Flash/pulse on add
└─────────────────────────────────────┘
```

---

### Entity-Specific Color System

#### Color Palette
**Tasks:** Purple/Violet
- Bright (converted): `#845ef7`
- Pastel (sorted): `#d0bfff`

**Projects:** Blue
- Bright: `#4dabf7`
- Pastel: `#a5d8ff`

**Lists:** Green
- Bright: `#51cf66`
- Pastel: `#b2f2bb`

**Notes:** Yellow/Gold
- Bright: `#ffd43b`
- Pastel: `#ffec99`

**Ideas (Unsorted):** Grey-blue
- `#868e96`

#### Color State Logic
1. **Unsorted ideas:** Grey-blue (#868e96) - neutral, waiting
2. **Sorted ideas:** Pastel colors - categorized but not converted
3. **Converted entities:** Bright colors - full entities in system
4. **Quick Add buttons:** Bright colors with subtle tint/border

#### Application Points
- **Item cards:** Background tint based on state
- **Quick Add buttons:** Border and text color
- **Flow lines:** Match entity color when animating
- **Bottom tabs:** Flash with entity color on conversion
- **Entity badges/icons:** Bright color for type indicator

---

### Flow Lines & Visual Connections

#### Flow Line Types

**1. Left Path (Manual Flow)**
```
Capture Input
    ↓ (solid line)
Unsorted Inbox
    ↓ (solid line)
Sorted Inbox
    ↓ (solid line)
Convert Action
    ↓ (solid line)
Entity Tabs (bottom)
```

**2. Right Path (Quick Add Bypass)**
```
Quick Add Buttons
    ↓ (dashed/dotted line, going around right side)
    → Bypasses Unsorted
    ↓
Sorted Inbox
    ↓
Convert Action
    ↓
Entity Tabs (bottom)
```

#### Visual Design Specs

**SVG Flow Lines:**
- Stroke width: 2-3px
- Colors: Match entity type or use theme primary
- Style: Solid for main path, dashed for bypass
- Glow effect: `drop-shadow(0 0 4px color)` for retro CRT feel
- Bezier curves: Smooth S-curves for natural flow

**Connection Points:**
- Small circular nodes (8-10px diameter)
- Positioned at section edges
- Pulse subtly when active
- Match line color

**Responsive Behavior:**
- Desktop: Show both paths clearly
- Mobile: Simplify to single left path, hide bypass visually
- Lines recalculate positions on resize

---

### Animation System

#### 1. Normal Flow Animation
**Trigger:** When user captures idea, sorts it, or converts it

**Effect:**
- Colored pulse travels down flow line
- Entity-specific color (purple for task, blue for project, etc.)
- Duration: 800-1200ms
- Easing: ease-out
- Implementation: SVG `stroke-dashoffset` animation

**Visual:**
```
┌─────────┐
│ Capture │
└────┬────┘
     │ ████░░░░░  ← Color pulse moving down
     ↓
┌─────────┐
│ Unsorted│
└─────────┘
```

#### 2. AI Flow Animation (Special Effect)
**Trigger:** When AI suggests category, batch processes, or auto-categorizes

**Effect:**
- Electric/spark particle effect
- Small particles (2-4px) travel along path
- Pulsing glow with electric blue tint overlay
- Optional: Slight brightness flicker
- Duration: 1000-1500ms
- Implementation: Canvas API with particle system

**Visual Characteristics:**
- Particle count: 5-10 particles per trigger
- Color: Electric blue (#00D9FF) with white core
- Trail effect: Slight motion blur
- Sound: Optional subtle beep (retro computer sound)

**Distinguishing Features:**
- Faster movement than normal flow
- Scattered/jittery path (not perfectly straight)
- Leaves brief glow trail
- Multiple particles vs single pulse

#### 3. Bottom Tab Flash
**Trigger:** When item is converted to entity (idea → task/project/note/list)

**Effect:**
- Brief pulse animation on corresponding bottom tab
- Color: Entity-specific bright color
- Badge number increments with scale bounce
- Glow effect radiates outward
- Duration: 500-700ms

**Visual:**
```
Before:  [📋 Tasks]
During:  [📋 Tasks] ← Glowing purple, scaled 1.1x
         (3) → (4)  ← Badge animates
After:   [📋 Tasks]
```

---

### Terminology Changes

**Old → New:**
- "Parsing" → "Sorting"
- "Unparsed Ideas" → "Unsorted Ideas"
- "Parse this idea" → "Sort this idea"
- "Ready to Convert" → "Sorted" (or keep as-is)

**Rationale:**
- "Parsing" is developer jargon
- "Sorting" is more intuitive for users
- Aligns with mental model of organizing/categorizing

---

### Design Questions for Figma/Vercel

#### Flow Line Styling
1. Should flow lines be **solid** or **dashed**?
2. Should they have **animated dashes** (marching ants) or static?
3. How thick should they be on mobile vs desktop?
4. Should connection nodes pulse continuously or only when active?

#### Color Application
1. Should Quick Add buttons have:
   - Full colored background with subtle opacity?
   - Colored border only with transparent background?
   - Colored text with grey background?
2. Should sorted idea cards have:
   - Pastel background fill?
   - Pastel left border accent?
   - Pastel icon/badge only?

#### Animation Style
1. For normal flow animation:
   - Smooth continuous pulse?
   - Stepped/choppy (retro digital feel)?
   - Glow intensity: subtle or prominent?
2. For AI flow animation:
   - Particle count: 5, 10, or 20?
   - Particle shape: squares (retro) or circles (smooth)?
   - Should particles bounce/scatter or move linearly?

#### Layout & Spacing
1. Vertical spacing between sections (Capture → Unsorted → Sorted)?
2. Should flow lines go **inside** section containers or **between** them?
3. Mobile layout: Stack sections tighter or maintain desktop spacing?
4. Should Quick Add buttons stay at top or move to floating position?

#### Accessibility & Performance
1. Reduced motion alternative: No animations or instant/simple fades?
2. Should flow lines disappear entirely in reduced motion mode?
3. Color contrast: Are pastel colors readable on beige background?
4. Should we add subtle borders to low-contrast pastel items?

---

### Technical Implementation Notes

**CSS Variables to Add:**
```css
/* Entity Colors - Bright */
--entity-task-bright: #845ef7;
--entity-project-bright: #4dabf7;
--entity-list-bright: #51cf66;
--entity-note-bright: #ffd43b;
--entity-idea-grey: #868e96;

/* Entity Colors - Pastel */
--entity-task-pastel: #d0bfff;
--entity-project-pastel: #a5d8ff;
--entity-list-pastel: #b2f2bb;
--entity-note-pastel: #ffec99;

/* Flow Animation */
--flow-line-color: var(--retro-primary);
--flow-line-width: 2px;
--flow-animation-duration: 1000ms;
--ai-flow-color: #00D9FF;
```

**Component Structure:**
- `<FlowLine>` - SVG path component for connections
- `<FlowLineContainer>` - Wrapper managing all flow lines
- `<AnimatedPulse>` - Traveling pulse effect
- `<ParticleSystem>` - Canvas-based particle effect for AI
- `<EntityBadge>` - Colored badges for entity types
- `<EntityButton>` - Quick Add buttons with color system

---

### User Experience Goals

1. **Visual Clarity:** User instantly understands the flow from capture → entity
2. **Progress Indication:** Color changes show advancement through stages
3. **Delight Factor:** Animations provide satisfying feedback without slowing down
4. **Retro Authenticity:** Maintain Palm Pilot aesthetic with modern UX enhancements
5. **Accessibility:** All features work without animations (reduced motion support)

---

### Success Metrics

**Phase 1 (Color System):**
- ✓ Entity colors applied consistently
- ✓ Unsorted = grey, Sorted = pastel, Converted = bright
- ✓ Quick Add buttons visually distinct with colors

**Phase 2 (Flow Lines):**
- ✓ Vertical layout replaces tabs
- ✓ Flow paths clearly visible
- ✓ Responsive at different screen sizes

**Phase 3 (Animations):**
- ✓ Smooth 60fps animations
- ✓ AI operations visually distinguished
- ✓ Tab flash on conversion
- ✓ Reduced motion support working


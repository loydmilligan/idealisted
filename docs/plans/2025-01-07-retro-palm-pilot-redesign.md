# Retro Palm Pilot UI Redesign

**Date:** 2025-01-07
**Status:** Approved
**Goal:** Transform the modern Palm Pilot UI into an authentic retro aesthetic while maintaining the successful horizontal workflow and mobile-first UX

## Overview

Keep the proven 4-tab architecture (Capture → Unsorted → Ready → Files) and all functionality intact. Apply authentic Palm Pilot era styling: green-tinted monochrome aesthetic, monospace UI chrome, clean sans-serif content, and classic button treatments.

## Design Principles

1. **Nostalgia First, Usability Always** - Retro vibe never sacrifices mobile usability
2. **Modern Touches Welcome** - Keep smooth animations and bottom sheets where they enhance UX
3. **Desktop Gets the Frame** - Palm device bezel on desktop only, edge-to-edge on mobile
4. **Entity Colors Stay Subtle** - Muted accent colors visible through green-tinted aesthetic

---

## 1. Color System

### Base Palette - "Palm Pilot Green Monochrome"

```css
/* Primary green tints */
--palm-screen-light: #A5B5A5;    /* Background, lightest */
--palm-screen-base: #8B9E8B;      /* Base screen tint */
--palm-screen-dark: #7A8A7A;      /* Darker surfaces */

/* Text colors */
--palm-text-dark: #2D3A2D;        /* Dark green-black on light */
--palm-text-light: #E8EFE8;       /* Off-white on dark */

/* Borders & accents */
--palm-border: #6B7B6B;           /* Medium green-grey */
--palm-border-light: #8B9B8B;
--palm-border-dark: #5B6B5B;
```

### Entity Accent Colors (70% Desaturated)

Subtle hints of color "through the green screen":

```css
/* Entity accents - barely visible colors */
--entity-task: #6B8B9E;     /* Muted teal-grey (barely blue) */
--entity-note: #9E8B6B;     /* Muted tan-grey (barely orange) */
--entity-project: #7B9E6B;  /* Muted sage-grey (barely green) */
--entity-list: #8B6B9E;     /* Muted mauve-grey (barely purple) */
```

### Overlays

```css
/* Modal overlays - HIGH opacity for readability */
--palm-overlay: rgba(45, 58, 45, 0.85);  /* Dark green tint, very opaque */
```

---

## 2. Typography

### Font Families

```css
/* Monospace for UI chrome */
--font-mono: 'Courier New', 'Monaco', 'Consolas', monospace;

/* Sans-serif for content */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

### Typography Hierarchy

| Element | Font | Size | Transform | Weight |
|---------|------|------|-----------|--------|
| Screen headers | Mono | 14px | UPPERCASE | Regular |
| Section labels | Mono | 12px | UPPERCASE | Regular |
| Button labels | Mono | 13px | UPPERCASE | Regular |
| Timestamps/meta | Mono | 12px | none | Regular |
| Badge counts | Mono | 11px | none | Bold |
| Item titles | Sans | 16px | none | Medium |
| Descriptions | Sans | 14px | none | Regular |
| Form inputs | Sans | 15px | none | Regular |

### Usage Rules

- **Monospace for:** Headers, buttons, labels, timestamps, numbers, badges, navigation
- **Sans-serif for:** Item text, descriptions, form input values, longer content
- **Letter-spacing:** 0.05em on monospace buttons for retro computer feel
- **Bold used sparingly:** Only for active states and badge counts

---

## 3. Buttons & Interactive Elements

### Primary Action Buttons (Beveled)

Used for main CTAs: SAVE, CONVERT, ✓ UNSORTED

```css
border: 2px solid;
border-top-color: #A5B5A5;    /* Light top */
border-left-color: #A5B5A5;   /* Light left */
border-bottom-color: #6B7B6B; /* Dark bottom */
border-right-color: #6B7B6B;  /* Dark right */
padding: 8px 12px;
background: var(--palm-screen-base);

/* Pressed state */
&:active {
  border-top-color: #6B7B6B;    /* Invert borders */
  border-left-color: #6B7B6B;
  border-bottom-color: #A5B5A5;
  border-right-color: #A5B5A5;
  background: var(--palm-screen-dark);
}
```

### Secondary Actions (Flat)

Used for filters, chips, minor actions

```css
border: 1px solid var(--palm-border);
padding: 6px 10px;
background: transparent;

/* Active/selected state */
&.active {
  background: var(--palm-screen-dark);
  color: var(--palm-text-light);
  border-color: var(--palm-border-dark);
}
```

### Form Inputs (Inset)

Textareas, text inputs - "pressed into screen" look

```css
border: 1px solid;
border-top-color: #6B7B6B;    /* Dark top */
border-left-color: #6B7B6B;   /* Dark left */
border-bottom-color: #A5B5A5; /* Light bottom */
border-right-color: #A5B5A5;  /* Light right */
background: var(--palm-screen-dark);
padding: 8px;
```

### Cards

```css
border: 1px solid var(--palm-border);
background: var(--palm-screen-base);
padding: 12px;

/* With entity accent */
border-left: 2px solid var(--entity-task); /* or note/project/list */
```

---

## 4. Navigation Structure

### Bottom Tab Bar (4 Tabs)

```
┌──────────┬──────────┬──────────┬──────────┐
│ CAPTURE  │ UNSORTED │  READY   │  FILES   │
│    +     │   📥(3)  │   ✓(5)   │   📁     │
└──────────┴──────────┴──────────┴──────────┘
```

- Tab 1: **CAPTURE** - Idea input screen
- Tab 2: **UNSORTED** - Uncategorized ideas with badge count
- Tab 3: **READY** - Sorted ideas ready to convert, with badge
- Tab 4: **FILES** - Opens drawer to access entity types

Styling:
- Flat rectangular tabs, 1px separators
- Active: Filled background, white icon/label
- Inactive: Transparent, dark text
- Monospace uppercase labels

### Files Drawer (Bottom Sheet Menu)

Triggered by tapping FILES tab:

```
┌─────────────────────────────┐
│  SELECT FILE TYPE           │ ← 12px mono header
├─────────────────────────────┤
│  [📋] TASKS                 │
│  [📝] NOTES                 │ ← Beveled buttons
│  [📦] PROJECTS              │   stacked vertically
│  [📑] LISTS                 │
│  [📁] ALL FILES             │
├─────────────────────────────┤
│         [CANCEL]            │ ← Flat cancel button
└─────────────────────────────┘
```

- Slides up from bottom: 250ms ease-out
- Overlay: `rgba(45, 58, 45, 0.85)` behind
- Tap overlay or button to dismiss

---

## 5. Screen Layouts

### Capture Screen

```
┌─────────────────────────────────┐
│      IDEALIST v1.0              │ ← 14px mono centered
│ IDEAS • INSTANT SORT • ORGANIZE │ ← 11px mono
├─────────────────────────────────┤
│                                 │
│  [Type your idea...]            │ ← Large textarea
│                                 │   Inset border
│                                 │   40% screen height
│                                 │
├─────────────────────────────────┤
│  [✓ UNSORTED]    [   TASK   ]  │ ← Quick action grid
│  [ NOTE ▾   ]    [ PROJECT  ]  │   2x3 layout
│  [  LIST    ]    [   AI ▾   ]  │
├─────────────────────────────────┤
│ RECENTLY CAPTURED               │ ← 12px mono header
│ ┌─────────────────────────────┐ │
│ │ Build horizontal workflow   │ │ ← Card list
│ │ 5m ago                      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Unsorted/Ready Screens

```
┌─────────────────────────────────┐
│ UNSORTED (3)              [OPTS]│ ← 14px mono
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🗑️              Build UI    │ │ ← Swipeable cards
│ │                             │ │   Delete left (🗑️)
│ │ Fix the navigation bug      │ │   Action right
│ │ 2h ago                      │ │
│ │                             │ │
│ │ [TASK] [NOTE▾] [PROJ] [LIST]│ │ ← Action buttons
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ ...more cards...            │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Entity Type Screens (Tasks/Notes/Projects/Lists)

```
┌─────────────────────────────────┐
│ ← FILES         TASKS            │ ← Back nav + title
├─────────────────────────────────┤
│ [All] [Complete] [In Progress]  │ ← Filter chips
│ [Incomplete] [Tags ▾]            │   Contextual per type
├─────────────────────────────────┐
│ ┌─────────────────────────────┐ │
│ │▌Build horizontal workflow   │ │ ← Colored left border
│ │ Task • 2h ago               │ │   Entity badge + meta
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │▌Fix navigation bug          │ │
│ │ Task • 5h ago               │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

Contextual filters per screen:
- **Tasks:** [All] [Complete] [In Progress] [Incomplete] + [Tags ▾]
- **Notes:** [All] [Research] [Meeting] [General] + [Tags ▾]
- **Projects:** [All] [Active] [Planning] [Complete] + [Tags ▾]
- **Lists:** [All] + list type filters + [Tags ▾]

---

## 6. Bottom Sheet Modals (Entity Edit Forms)

### Structure

Modern bottom sheet interaction with retro styling:

```css
/* Bottom sheet container */
border-top: 3px solid var(--entity-accent); /* Entity color */
background: var(--palm-screen-light);
border-left: 1px solid var(--palm-border);
border-right: 1px solid var(--palm-border);
border-radius: 0; /* Square corners */
```

### Handle

Simple horizontal line instead of modern pill:

```css
width: 40px;
height: 2px;
background: var(--palm-border);
margin: 8px auto;
```

### Form Layout

```
┌─────────────────────────────────┐
│          ──                     │ ← Simple handle
│          TASK                   │ ← Mono header
├─────────────────────────────────┤
│ Title                           │ ← 12px mono label
│ ┌─────────────────────────────┐ │
│ │ Build horizontal workflow   │ │ ← Inset input
│ └─────────────────────────────┘ │
│                                 │
│ Description                     │
│ ┌─────────────────────────────┐ │
│ │ Add details...              │ │
│ └─────────────────────────────┘ │
│                                 │
│ Due Date                        │
│ ┌─────────────────────────────┐ │
│ │ [date picker]               │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [✨ AI AUTOFILL] [SAVE CHANGES] │ ← Action bar
└─────────────────────────────────┘
```

- Slides up: 300ms ease-out
- Overlay: `rgba(45, 58, 45, 0.85)` - very opaque for readability
- Content spacing: 16px between fields

---

## 7. Desktop Palm Device Frame

### Responsive Breakpoint

```css
@media (min-width: 768px) {
  /* Show device frame */
}
```

### Desktop Layout (>768px)

```
     ┌─────────────────────┐
     │   "IdeaListed"      │ ← Top bezel
     ├─────────────────────┤
     │                     │
     │   [APP CONTENT]     │ ← 480px max-width
     │                     │   Full app inside
     │                     │
     ├─────────────────────┤
     │         ⚫          │ ← Bottom bezel w/ button
     └─────────────────────┘
```

Frame styling:
- Max-width: 480px (Palm Pilot proportions)
- Bezel: Rounded rectangle with greenish-grey gradient (#7A8A7A → #6B7B6B)
- Subtle texture/noise overlay for plastic feel
- Drop shadow to lift off background
- Background outside: Dark neutral (#2A2A2A)

### Mobile Layout (<768px)

- Edge-to-edge, no frame
- Full screen real estate
- Native status bar (don't fake Palm OS status)

---

## 8. Animations & Transitions

### Philosophy

Smooth but purposeful - modern polish with retro restraint. No bouncy physics, just clean transitions.

### Timing Constants

```css
--transition-instant: 0ms;
--transition-fast: 150ms;
--transition-normal: 250ms;
--transition-smooth: 300ms;
```

### Animation Specifications

| Element | Duration | Easing | Behavior |
|---------|----------|--------|----------|
| Tab switch | 200ms | linear | Crossfade, no slide |
| Files drawer open | 250ms | ease-out | Slide up from bottom |
| Files drawer close | 250ms | ease-out | Slide down |
| Bottom sheet modal | 300ms | ease-out | Slide up |
| Button press | 0ms | - | Instant border invert |
| Button hover (desktop) | 150ms | ease | Color transition |
| Badge increment | 150ms | linear | Quick scale pulse |
| Card swipe | physics | - | Framer Motion default |
| Overlay fade | 200ms | linear | With drawer/sheet |

### Loading States

No spinners - keep it retro minimal:

```
Loading...
```

Simple 3-dot pulse:
- Monospace dots
- Opacity pulses: 0.3 → 1.0 → 0.3
- 600ms loop

---

## 9. Swipe Gestures

### Keep Current Behavior

Framer Motion swipe implementation stays intact - modern UX, retro colors.

### Swipe Actions

**Left swipe (Delete):**
- Reveal background: Dark red-tinted green (#8B6B6B)
- Icon: 🗑️ trash can
- Threshold: 50% card width
- Snap to delete or snap back

**Right swipe (Entity-specific action):**
- Unsorted cards: Reveal entity accent colors for sorting options
- Ready cards: Reveal entity accent color for conversion
- Entity cards: Reveal completion/archive actions
- Threshold: 50% card width

---

## 10. Implementation Strategy

### Phase 1: Core Retro Styling (4-6 hours)

1. Create new `styles/retro.css` with complete design system
2. Update color variables throughout
3. Apply typography changes (mono for UI, sans for content)
4. Restyle all buttons (beveled vs flat)
5. Update card styles with borders and entity accents
6. Test on mobile viewport

### Phase 2: Navigation Updates (2-3 hours)

7. Rename "Entities" tab to "FILES"
8. Create FILES drawer bottom sheet component
9. Split entity views into separate screens (Tasks/Notes/Projects/Lists)
10. Add contextual filters to each entity screen
11. Implement drawer open/close animations

### Phase 3: Desktop Frame (2 hours)

12. Create Palm device frame component
13. Add responsive wrapper with media queries
14. Add bezel graphics and drop shadow
15. Test on desktop viewports

### Phase 4: Modal & Form Updates (2 hours)

16. Restyle bottom sheets with square corners
17. Update handle to simple line
18. Apply form input inset styling
19. Test overlay opacity for readability

### Phase 5: Polish & Testing (2-3 hours)

20. Update all animations to match spec
21. Test swipe gestures with new colors
22. Cross-browser testing (Safari, Chrome, Firefox)
23. Mobile device testing (iOS, Android)
24. Accessibility audit (contrast ratios, touch targets)

---

## 11. Success Metrics

### Visual Goals
- [ ] Authentic Palm Pilot green aesthetic achieved
- [ ] Monospace UI chrome vs sans-serif content clearly distinguished
- [ ] Entity colors visible but subtle through green tint
- [ ] Desktop frame adds nostalgia without cluttering
- [ ] Mobile stays edge-to-edge and usable

### Functional Goals
- [ ] All existing features continue to work
- [ ] Navigation flow is clearer with FILES drawer
- [ ] Filter chips are contextual to each entity type
- [ ] Forms remain readable with high-opacity overlays
- [ ] Animations feel purposeful, not janky

### User Experience Goals
- [ ] Nostalgic but not frustrating
- [ ] Mobile-first usability maintained
- [ ] Touch targets remain 44x44pt minimum
- [ ] Text remains readable at all sizes
- [ ] Modern conveniences (swipes, bottom sheets) preserved

---

## 12. Future Enhancements (Post-MVP)

- Theme toggle to switch between Retro Green / Monochrome / Amber modes
- Sound effects (optional Palm OS beeps and clicks)
- Haptic feedback on button presses (mobile)
- Additional desktop frames (different Palm models)
- Screen transition effects (fade patterns)

---

## Approval

**Design validated:** 2025-01-07
**Approved by:** User
**Ready for implementation:** Yes

All design sections reviewed and approved. Proceed with Phase 1 implementation.

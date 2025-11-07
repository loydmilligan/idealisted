# Inbox UI Redesign - Implementation Plan

## Overview
Transform the inbox from horizontal tabs to a vertical flow visualization with color-coded entities, animated flow lines, and AI indicators.

## Design Goals
1. Replace "parsing" terminology with "sorting"
2. Implement entity-specific color system
3. Create vertical layout with visual flow paths
4. Add animated flow lines (normal and AI-enhanced)
5. Implement bottom tab flash notifications

---

## Phase 1: Terminology & Color System Foundation

### Objectives
- Update all terminology (parsing → sorting)
- Define and apply entity color palette
- Create color utility functions/constants

### High-Level Tasks
1. **Terminology Updates**
   - Update all UI labels and text
   - Rename variables and functions
   - Update API endpoint references
   - Update database field names if needed

2. **Color System Implementation**
   - Define color constants for entities:
     - Tasks: Purple/Violet (#845ef7 bright, #d0bfff pastel)
     - Projects: Blue (#4dabf7 bright, #a5d8ff pastel)
     - Lists: Green (#51cf66 bright, #b2f2bb pastel)
     - Notes: Yellow/Gold (#ffd43b bright, #ffec99 pastel)
     - Ideas: Grey-blue (#868e96)
   - Create utility functions for color states (bright/pastel/grey)
   - Apply colors to entity type indicators

3. **Item Card Styling**
   - Apply grey-blue to unsorted ideas
   - Apply pastel colors to sorted ideas
   - Apply bright colors to converted entities
   - Update Quick Add buttons with color tints

---

## Phase 2: Vertical Layout with Flow Lines

### Objectives
- Restructure inbox from tabs to vertical sections
- Add visual flow line connections
- Implement dual flow paths (manual vs Quick Add)

### High-Level Tasks
1. **Layout Restructuring**
   - Convert horizontal tabs to vertical sections
   - Stack: Capture → Unsorted → Sorted
   - Add spacing and visual hierarchy
   - Ensure responsive design

2. **Flow Line Implementation**
   - Create SVG flow line components
   - Left path: Capture → Unsorted → Sorted
   - Right path: Quick Add → Sorted (bypass)
   - Bottom path: Sorted → Convert → Entity tabs
   - Make lines responsive to container size

3. **Visual Connections**
   - Connect capture input to unsorted inbox
   - Connect Quick Add buttons around unsorted (right side)
   - Connect sorted inbox to conversion
   - Connect conversion to bottom entity tabs

---

## Phase 3: Animation System

### Objectives
- Create smooth flow animations for item movement
- Implement special AI animations
- Add bottom tab flash notifications
- Ensure performant animations

### High-Level Tasks
1. **Normal Flow Animations**
   - Color flow down lines when items move
   - Smooth fade/travel effect
   - Entity-colored based on type
   - Trigger on: capture, sort, convert actions

2. **AI Flow Animations**
   - Electric/spark particle effect
   - Pulsing glow animation
   - Electric blue tint overlay
   - Trigger on: AI suggest, AI parse, batch operations

3. **Bottom Tab Flash**
   - Pulse animation with entity color
   - Badge number increment animation
   - Brief glow effect
   - Scale bounce feedback
   - Trigger on: item conversion to entity

4. **Animation Infrastructure**
   - Create animation hook/utility
   - Event system for triggering animations
   - Performance optimization (requestAnimationFrame)
   - Cleanup and state management

---

## Technical Considerations

### Performance
- Use CSS animations where possible
- Implement requestAnimationFrame for complex animations
- Debounce rapid triggers
- Cleanup animation timers on unmount

### State Management
- Track animation states
- Queue animations if multiple trigger
- Coordinate between flow line and tab flash

### Accessibility
- Ensure animations respect prefers-reduced-motion
- Maintain functionality without animations
- Provide visual alternatives if needed

### Browser Compatibility
- Test SVG flow lines across browsers
- Ensure CSS animations work in target browsers
- Provide fallbacks where needed

---

## Success Criteria

### Phase 1
- [ ] All "parsing" references changed to "sorting"
- [ ] Entity colors applied consistently
- [ ] Unsorted = grey, Sorted = pastel, Converted = bright
- [ ] Quick Add buttons show color tints

### Phase 2
- [ ] Vertical layout replaces horizontal tabs
- [ ] Flow lines visible and positioned correctly
- [ ] Dual paths clearly distinguished
- [ ] Responsive at different screen sizes

### Phase 3
- [ ] Items animate through flow when moving
- [ ] AI operations show special effect
- [ ] Bottom tabs flash on conversion
- [ ] Animations are smooth and performant
- [ ] Works with reduced motion preference

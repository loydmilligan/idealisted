# Documentation Update Plan
Generated: 2025-01-14

## Summary

After comprehensive review by documentation-updater and code-reviewer agents, **no documentation updates are required**.

### Decision: Archive Instead of Update

**Idealist-UI-UX-Design-Document.md** was marked for potential update but has been **archived instead** for the following reasons:

1. **Historical Artifact**: Document dated November 2024 (pre-implementation design specification)
2. **Significant Divergence**: Beta MVP implementation (January 2025) diverged substantially from original spec
3. **Misleading if Updated**: Would require rewriting 90%+ of content
4. **Better Alternative**: CLAUDE.md serves as authoritative current documentation

### Key Divergences Found (20+ major discrepancies)

**Branding:**
- Spec: "Idealist"
- Actual: "IdeaListed" with FrondNut device branding

**Color System:**
- Spec: Modern white (#FFFFFF) with bright entity colors
- Actual: Retro Palm Pilot green (#8B9E8B) with muted entity colors

**Tab Structure:**
- Spec: Capture, Unsorted, **Sorted**, **Entities**
- Actual: Capture, Unsorted, **Ready**, **Files**

**Typography:**
- Spec: San-serif system fonts (SF Pro, Roboto)
- Actual: Monospace-first design (Courier New, Monaco)

**Features Not in Spec:**
- Theme system (3 presets)
- AI master toggle
- Voice input (implemented, marked as "future" in spec)
- Dual save buttons (Save / Save & Go to Files)
- Badge flash animations (600ms with entity colors)

**Features in Spec Not Implemented:**
- Swipe gestures
- Complex AI dropdown menus

### Archive Location

`/home/mmariani/Projects/idealisted/docs/.archive/old-specs/Idealist-UI-UX-Design-Document.md`

### Current Documentation Status

All remaining active documentation is **current and accurate**:

✅ **README.md** - Up-to-date project overview and Daily Review docs
✅ **CLAUDE.md** - Current AI agent memory (canonical reference)
✅ **BETA_MVP_IMPLEMENTATION_PLAN.md** - Accurate phase-by-phase history
✅ **UNUSED_CODE.md** - Current deprecated features list
✅ **TRASH-FILES.md** - Current housekeeping reference
✅ **TESTING_GUIDE.md** - Current testing procedures
✅ **PLANNING_NEEDED.md** - Current forward-looking features

---

## Future Considerations

If a design system document is needed in the future, create a **new document** based on actual implementation:

**Recommended sections:**
1. Retro Palm Pilot aesthetic and color tokens
2. Theme system (Classic Green, Monochrome, Dark Mode)
3. Entity color system (muted palette)
4. Typography system (monospace-first)
5. Component patterns (modals, badges, tabs)
6. Animation system (600ms flash, spring physics)
7. AI integration patterns (master toggle)
8. Voice input integration

**Source files for new spec:**
- CLAUDE.md (implementation patterns)
- styles/retro.css (design tokens)
- lib/themes.ts (theme system)
- components/ui/* (retro components)
- BETA_MVP_IMPLEMENTATION_PLAN.md (feature history)

---

## No Updates Required

This plan documents the decision to archive rather than update. No documentation update work is needed.

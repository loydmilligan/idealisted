# Unused/Deprecated Code Documentation

This document tracks code that has been deprecated, removed, or is maintained only for backward compatibility. This helps future developers understand the codebase history and make informed decisions about cleanup.

---

## 1. Todos System (LEGACY - Backward Compatibility Only)

**Status**: 🟡 Deprecated but maintained for backward compatibility
**Removed**: Not removed, unified with tasks
**Date**: Multiple refactors throughout 2024

### What It Was
The original todo system with a dedicated `todos` table separate from the unified entity system.

### Why It Was Deprecated
- Tasks and todos were essentially the same concept with different implementations
- Maintaining two parallel systems created confusion and duplication
- Unified entity model (items + type-specific tables) provides cleaner architecture

### Current State
- **Database**: `todos` table still exists (lib/db.ts lines ~65-76)
- **Types**: `Todo` interface still defined (types/index.ts lines ~60-68)
- **API**: `/api/todos` routes may still exist
- **Usage**: New development should use `tasks` entity type instead

### Files Affected
- `lib/db.ts`: Lines 65-76 (todos table schema)
- `types/index.ts`: Lines 60-68 (Todo interface)
- `app/api/todos/`: Entire directory (if exists)

### Migration Notes
- Existing todos in database remain functional
- No data migration required (todos continue working)
- New features should target `tasks` instead of `todos`

### Future Action
- **Keep for now**: Maintains backward compatibility for existing data
- **Eventual cleanup**: Could merge todos into tasks in a future major version
- **Data migration**: Would require migrating all todo records to task records

---

## 2. Plan-Tasks Junction Table (REMOVED)

**Status**: 🔴 Removed
**Removed**: Horizontal workflow refactor
**Date**: December 2024

### What It Was
A many-to-many junction table linking plans to tasks: `plan_tasks(plan_id, task_id)`

### Why It Was Removed
- Overly complex for the use case
- Simple JSON array `todoIds` in plans table provides same functionality
- Reduced number of database queries required

### What Replaced It
- Plans now store task references as JSON array: `plans.todoIds: string[]`
- Direct foreign key references simpler than junction table
- Easier to query and maintain

### Files Affected
- `lib/db.ts`: Removed junction table schema
- `types/index.ts`: Plan type uses `todoIds` array instead
- `app/api/plans/`: Simplified queries (no joins needed)

### Migration
- Completed during horizontal workflow refactor
- No backward compatibility needed (clean break)

---

## 3. Deprecated Workflow API Routes (REMOVED)

**Status**: 🔴 Removed
**Removed**: Workflow simplification
**Date**: 2024

### Routes Removed
- `/api/plans/auto-populate` - Auto-populate plan from todos
- `/api/plans/complete` - Mark plan as complete
- `/api/plans/finalize` - Finalize plan for the day
- `/api/plans/reschedule` - Reschedule incomplete tasks

### Why They Were Removed
- CRON-based workflow was over-engineered for MVP
- User wanted simpler manual workflow
- Dependencies (node-cron) causing warnings and complexity

### What Replaced Them
- Manual plan management via UI
- Simple CRUD operations on `/api/plans`
- No automated scheduling/population

### Current State
- Routes completely removed
- CRON system disabled (commented out in app/layout.tsx line 4)
- Scheduler code exists in `lib/scheduler.ts` but unused

### Future Action
- Keep scheduler code for potential future re-enablement
- Document in CRON_SYSTEM.md if re-implementing

---

## 4. CRON Scheduling System (DISABLED)

**Status**: 🟡 Disabled but code remains
**Disabled**: Phase 2 of Beta MVP
**Date**: January 2025

### What It Is
Automatic task scheduling and plan management using node-cron.

### Why It Was Disabled
- Causing console warnings every minute: `[NODE-CRON] [WARN] missed execution`
- Over-engineered for Beta MVP
- User prioritized simpler manual workflows

### Current State
- Code exists in `lib/scheduler.ts`
- Import disabled in `app/layout.tsx` line 4: `// import '@/lib/init'`
- Database schema supports it (plans, schedules tables)

### Files Affected
- `lib/scheduler.ts`: Full CRON implementation (unused)
- `lib/init.ts`: Initialization disabled
- `app/layout.tsx`: Import commented out

### Future Action
- Can be re-enabled post-Beta by uncommenting import
- Requires node-cron dependency to be properly installed
- Warning issues need to be resolved before re-enabling

---

## 5. Old useTabFlash Hook (REMOVED)

**Status**: 🔴 Removed
**Removed**: Phase 5 (Badge flash animations)
**Date**: January 2025

### What It Was
A React hook exported from `BottomTabNav.tsx` for triggering tab flashes.

### Why It Was Removed
- Replaced with forwardRef pattern (more React-idiomatic)
- Imperative handle provides cleaner API
- Old hook was lines ~124-139 in BottomTabNav.tsx

### What Replaced It
- `TabNavHandle` interface with `triggerFlash` method
- Parent components use `useRef<TabNavHandle>` instead
- More explicit and type-safe

### Files Affected
- `components/modern/BottomTabNav.tsx`: Hook removed
- `components/modern/index.ts`: Export removed

---

## 6. Pre-Phase 2 Entity Modal (REPLACED)

**Status**: 🟢 Replaced
**Replaced**: Phase 2 (Entity modal enhancements)
**Date**: January 2025

### What Changed
Entity modals were basic with minimal fields.

### Enhancements Added
- Task: priority, status, project dropdown, due date
- Note: subtype selector (general, research, video, etc.)
- Project: status, progress tracking, dates
- Dual save buttons (Save / Save & Go to Files)
- Modal slide animations (framer-motion)

### Files Affected
- `components/modern/EntityModal.tsx`: Major enhancements
- `app/page.tsx`: Handler updates
- `app/api/items/[id]/route.ts`: Validation added

---

## 7. Pre-Phase 3 AI System (ENHANCED)

**Status**: 🟢 Enhanced
**Enhanced**: Phase 3 (AI master toggle)
**Date**: January 2025

### What Changed
AI was always-on with no way to disable globally.

### Enhancement
- Added `AIConfig.enabled` boolean field
- Default: AI disabled (user's top priority)
- Master toggle in Settings > AI
- All AI UI elements hidden when disabled
- Backend checks enabled flag before processing

### Files Affected
- `types/index.ts`: AIConfig interface
- `lib/ai.ts`: Enabled checks
- `components/modern/settings/AISettingsTab.tsx`: Toggle UI
- All AI-dependent components: Conditional rendering

---

## 8. Pre-Phase 4 Capture (ENHANCED)

**Status**: 🟢 Enhanced
**Enhanced**: Phase 4 (Speech-to-Text)
**Date**: January 2025

### What Changed
Capture was text-input only.

### Enhancement
- Added Web Speech API integration
- Microphone button in textarea (🎤/🔴)
- Browser-native speech recognition (no dependencies)
- Graceful degradation in unsupported browsers

### Files Affected
- `lib/useSpeechRecognition.ts`: New custom hook
- `components/modern/screens/CaptureScreen.tsx`: Voice button

---

## Summary Table

| Feature | Status | Action Needed | Priority |
|---------|--------|---------------|----------|
| Todos system | 🟡 Deprecated | Keep for backward compat | Low |
| Plan-Tasks junction | 🔴 Removed | None (clean) | - |
| Workflow API routes | 🔴 Removed | None (clean) | - |
| CRON system | 🟡 Disabled | Fix warnings if re-enabling | Medium |
| useTabFlash hook | 🔴 Removed | None (replaced) | - |
| Basic entity modals | 🟢 Replaced | None (enhanced) | - |
| Always-on AI | 🟢 Enhanced | None (toggle added) | - |
| Text-only capture | 🟢 Enhanced | None (voice added) | - |

---

## Legend

- 🔴 **Removed**: Code deleted, no backward compatibility
- 🟡 **Deprecated**: Code exists but not recommended for new development
- 🟢 **Enhanced**: Feature improved, old version replaced

---

## Maintenance Guidelines

1. **Before deleting deprecated code**: Check for database dependencies
2. **Backward compatibility**: Keep todos system until major version bump
3. **CRON re-enablement**: Fix warnings before uncommenting import
4. **Documentation**: Update this file when deprecating features

---

**Last Updated**: January 2025
**Beta MVP Status**: All core features implemented (Phases 1-5 complete)

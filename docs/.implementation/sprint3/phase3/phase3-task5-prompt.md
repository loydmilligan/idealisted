# Prompt: P3-T5 — Settings for morning/evening windows

Context: `docs/.implementation/sprint3/phase3/phase3-task5-context.md`
Plan refs: `docs/.implementation/sprint3/plan.md` (Phase 3), `docs/.implementation/sprint3/tasks.md` (P3-T5)

## Goal

Add user-configurable time windows for morning finalize and evening review auto-triggers in Settings, and update PlannerScreen to use the configuration.

## Prerequisites

- P3-T2 complete (morning modal uses isInMorningWindow)
- P3-T3 complete (evening modal uses isInEveningWindow)

## Deliverables

- `lib/planner-schedule.ts` helper library with types and functions
- "Planner Schedule" section in Settings UI
- Time pickers for all four window boundaries
- Toggle for auto-popup enable/disable
- Updated PlannerScreen to load and use config

## Implementation steps (from tasks)

1. Create `lib/planner-schedule.ts`:
   ```typescript
   export interface PlannerScheduleConfig {
     morning_start: string  // HH:MM
     morning_end: string
     evening_start: string
     evening_end: string
     auto_popup_enabled: boolean
   }

   export const DEFAULT_SCHEDULE: PlannerScheduleConfig = {
     morning_start: '07:00',
     morning_end: '09:00',
     evening_start: '19:00',
     evening_end: '21:00',
     auto_popup_enabled: true
   }

   export function parseTimeToMinutes(time: string): number {
     const [hours, minutes] = time.split(':').map(Number)
     return hours * 60 + minutes
   }

   export function isInTimeWindow(start: string, end: string): boolean {
     const now = new Date()
     const currentMinutes = now.getHours() * 60 + now.getMinutes()
     const startMinutes = parseTimeToMinutes(start)
     const endMinutes = parseTimeToMinutes(end)
     return currentMinutes >= startMinutes && currentMinutes <= endMinutes
   }

   export function isInMorningWindow(config: PlannerScheduleConfig = DEFAULT_SCHEDULE): boolean {
     if (!config.auto_popup_enabled) return false
     return isInTimeWindow(config.morning_start, config.morning_end)
   }

   export function isInEveningWindow(config: PlannerScheduleConfig = DEFAULT_SCHEDULE): boolean {
     if (!config.auto_popup_enabled) return false
     return isInTimeWindow(config.evening_start, config.evening_end)
   }

   export function validateScheduleConfig(config: PlannerScheduleConfig): string[] {
     const errors: string[] = []

     const morningStart = parseTimeToMinutes(config.morning_start)
     const morningEnd = parseTimeToMinutes(config.morning_end)
     const eveningStart = parseTimeToMinutes(config.evening_start)
     const eveningEnd = parseTimeToMinutes(config.evening_end)

     if (morningStart >= morningEnd) {
       errors.push('Morning start must be before morning end')
     }
     if (eveningStart >= eveningEnd) {
       errors.push('Evening start must be before evening end')
     }
     if (morningEnd > eveningStart) {
       errors.push('Morning and evening windows cannot overlap')
     }

     return errors
   }
   ```

2. Add `PlannerScheduleConfig` type to `types/index.ts`:
   ```typescript
   export interface PlannerScheduleConfig {
     morning_start: string
     morning_end: string
     evening_start: string
     evening_end: string
     auto_popup_enabled: boolean
   }
   ```

3. Add "Planner Schedule" section to Settings page:
   ```typescript
   // In settings component
   const [scheduleConfig, setScheduleConfig] = useState<PlannerScheduleConfig>(DEFAULT_SCHEDULE)

   // Load on mount
   useEffect(() => {
     async function loadConfig() {
       const { settings } = await apiClient.getSettings()
       if (settings.planner_schedule_config) {
         setScheduleConfig(JSON.parse(settings.planner_schedule_config))
       }
     }
     loadConfig()
   }, [])

   // Save handler
   const saveScheduleConfig = async () => {
     const errors = validateScheduleConfig(scheduleConfig)
     if (errors.length > 0) {
       // Show validation errors
       return
     }
     await apiClient.updateSettings({
       planner_schedule_config: JSON.stringify(scheduleConfig)
     })
   }
   ```

4. Render time pickers with retro styling:
   ```typescript
   <div className="space-y-4">
     <h3 className="text-sm font-bold uppercase tracking-wide">
       Planner Schedule
     </h3>

     {/* Auto-popup toggle */}
     <div className="flex items-center justify-between">
       <label className="text-sm">Auto-show planning modals</label>
       <input
         type="checkbox"
         checked={scheduleConfig.auto_popup_enabled}
         onChange={(e) => setScheduleConfig({
           ...scheduleConfig,
           auto_popup_enabled: e.target.checked
         })}
         className="palm-checkbox"
       />
     </div>

     {/* Morning window */}
     <div className="space-y-2">
       <label className="text-xs uppercase tracking-wide opacity-70">
         Morning Finalize Window
       </label>
       <div className="flex items-center gap-2">
         <input
           type="time"
           value={scheduleConfig.morning_start}
           onChange={(e) => setScheduleConfig({
             ...scheduleConfig,
             morning_start: e.target.value
           })}
           className="retro-input"
         />
         <span>to</span>
         <input
           type="time"
           value={scheduleConfig.morning_end}
           onChange={(e) => setScheduleConfig({
             ...scheduleConfig,
             morning_end: e.target.value
           })}
           className="retro-input"
         />
       </div>
     </div>

     {/* Evening window */}
     <div className="space-y-2">
       <label className="text-xs uppercase tracking-wide opacity-70">
         Evening Review Window
       </label>
       <div className="flex items-center gap-2">
         <input
           type="time"
           value={scheduleConfig.evening_start}
           onChange={(e) => setScheduleConfig({
             ...scheduleConfig,
             evening_start: e.target.value
           })}
           className="retro-input"
         />
         <span>to</span>
         <input
           type="time"
           value={scheduleConfig.evening_end}
           onChange={(e) => setScheduleConfig({
             ...scheduleConfig,
             evening_end: e.target.value
           })}
           className="retro-input"
         />
       </div>
     </div>

     <RetroButton onClick={saveScheduleConfig} variant="primary">
       Save Schedule
     </RetroButton>
   </div>
   ```

5. Update PlannerScreen to load and use config:
   ```typescript
   import {
     PlannerScheduleConfig,
     DEFAULT_SCHEDULE,
     isInMorningWindow,
     isInEveningWindow
   } from '@/lib/planner-schedule'

   // In component
   const [scheduleConfig, setScheduleConfig] = useState<PlannerScheduleConfig>(DEFAULT_SCHEDULE)

   useEffect(() => {
     async function loadConfig() {
       const { settings } = await apiClient.getSettings()
       if (settings.planner_schedule_config) {
         setScheduleConfig(JSON.parse(settings.planner_schedule_config))
       }
     }
     loadConfig()
   }, [])

   // Update morning/evening checks to use config
   if (isInMorningWindow(scheduleConfig)) {
     // Check for draft plan...
   }

   if (isInEveningWindow(scheduleConfig)) {
     // Check for finalized plan...
   }
   ```

6. Add validation feedback for overlapping windows.

7. Test the complete settings flow.

## Acceptance criteria

- Settings shows Planner Schedule section
- Time pickers work for all four boundaries
- Auto-popup toggle enables/disables window checks
- Validation prevents invalid ranges (start >= end)
- Validation warns about overlapping windows
- Config persists across page reloads
- PlannerScreen respects configured windows
- Manual buttons still work when auto-popup disabled

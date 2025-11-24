# Context: P3-T5 — Settings for morning/evening windows

Purpose: Add user-configurable time windows for the morning finalize and evening review auto-triggers in the Settings page.

## Key decisions

- From plan: Configurable morning and evening windows instead of hardcoded defaults
- Default values: morning 7:00-9:00 AM, evening 7:00-9:00 PM
- Include toggle to disable auto-popups entirely (user prefers manual buttons only)
- Store configuration in settings table as JSON

## Scope

- Add "Planner Schedule" section to Settings page
- Time pickers for morning_start, morning_end, evening_start, evening_end
- Toggle for auto-popup enable/disable
- Persist to settings table
- Create helper library for reading config

## References

- Plan: `docs/.implementation/sprint3/plan.md` (Phase 3)
- Tasks: `docs/.implementation/sprint3/tasks.md` (P3-T5 steps)
- Settings API: `app/api/settings/route.ts`
- Settings types: `types/index.ts` (Setting interface)
- API client: `lib/api-client.ts` (getSettings, updateSettings)
- PlannerScreen: Uses isInMorningWindow/isInEveningWindow helpers (P3-T2, P3-T3)

## Configuration Schema

```typescript
interface PlannerScheduleConfig {
  morning_start: string  // HH:MM format, e.g., "07:00"
  morning_end: string    // HH:MM format, e.g., "09:00"
  evening_start: string  // HH:MM format, e.g., "19:00"
  evening_end: string    // HH:MM format, e.g., "21:00"
  auto_popup_enabled: boolean  // true by default
}

// Stored in settings table as:
// key: 'planner_schedule_config'
// value: JSON.stringify(config)
```

## Existing Settings Patterns

The app uses settings stored in SQLite with JSON values:

```typescript
// Fetching settings
const settings = await apiClient.getSettings()
const config = JSON.parse(settings['planner_schedule_config'] || '{}')

// Saving settings
await apiClient.updateSettings({
  planner_schedule_config: JSON.stringify(newConfig)
})
```

## Settings UI Patterns

Look at existing settings sections for UI patterns:
- Theme selector
- AI configuration
- Ntfy configuration
- Reminder settings

Time picker options:
1. Native `<input type="time">` - simplest, works cross-browser
2. Hour:minute dropdowns - more control, retro-compatible
3. Custom styled time picker - matches retro theme

Recommended: Use `<input type="time">` styled with retro classes.

## Helper Library Design

Create `lib/planner-schedule.ts`:

```typescript
export interface PlannerScheduleConfig {
  morning_start: string
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
  return currentMinutes >= parseTimeToMinutes(start) &&
         currentMinutes <= parseTimeToMinutes(end)
}

export function isInMorningWindow(config: PlannerScheduleConfig = DEFAULT_SCHEDULE): boolean {
  if (!config.auto_popup_enabled) return false
  return isInTimeWindow(config.morning_start, config.morning_end)
}

export function isInEveningWindow(config: PlannerScheduleConfig = DEFAULT_SCHEDULE): boolean {
  if (!config.auto_popup_enabled) return false
  return isInTimeWindow(config.evening_start, config.evening_end)
}
```

## Implementation notes

- Settings page already has tab structure; add "Planner" tab or section
- Validate time ranges (start < end)
- Show validation error if morning/evening windows overlap
- Consider timezone implications (use local time)
- PlannerScreen needs to fetch config on mount and pass to window checks

## Testing/QA

- Open Settings, locate Planner Schedule section
- Set custom morning window (e.g., 8:00-10:00)
- Navigate to planner during new window with draft plan
- Verify modal appears at correct time
- Toggle auto-popup off
- Verify modal no longer auto-appears
- Manual buttons should still work
- Change evening window, verify evening modal respects new times

# Project Dashboard - Visual-First Design (Dashboard 2)
## Standalone Prompt Section - Copy This

Implement a project dashboard using a slide-up detail panel (slides from bottom, covers 70% of screen) with the following Visual-First layout. This dashboard should appear when a user taps on a project from the Projects list.

**Dashboard Layout Structure:**

```
┌─────────────────────────────────────┐
│ ← PROJECT: ChatterAI v2.0           │  <- Header with back button, project name
├─────────────────────────────────────┤
│        ╭───────────╮                │
│        │   73%     │                │  <- Circular progress indicator (Palm Pilot style)
│        │  ██████   │                │     Shows percentage and fraction (11 of 15)
│        │  11 / 15  │                │     Center-aligned, prominent
│        ╰───────────╯                │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 🔥 CURRENT TASK               │   │  <- Highlighted card for active/next task
│ │ Implement SSE transport       │   │     Shows task name, priority, due date
│ │ ⚡ Medium  │  📅 Due: Nov 8   │   │     Bordered/emphasized section
│ └───────────────────────────────┘   │
│                                     │
│ ⚠️  PROCRASTINATION ALERT           │  <- Conditional alert (see trigger rules below)
│ ┌─────────────────────────────────┐ │
│ │ Project is 73% done but stalled │ │     Shows when project near completion but inactive
│ │ 4 tasks left, 2 marked "dreaded"│ │     Displays context about remaining work
│ │ Last task: 4 days ago           │ │     Days since last completion
│ │ [Power Through Mode] [Adjust]   │ │     Action buttons for user
│ └─────────────────────────────────┘ │
│                                     │
│ REMAINING TASKS                     │  <- List of incomplete tasks
│ ⚠️  Write tests (ugh)               │     "dreaded" tasks marked with ⚠️ and (ugh)
│ ⚠️  Update documentation (ugh)      │     Priority badges visible
│ ⚡ Deploy to staging                │     Tappable to view/edit
│ ✓ Final review                      │
│                                     │
│ [+Task] [Timeline] [Notes]          │  <- Action buttons at bottom
└─────────────────────────────────────┘
```

**Component Specifications:**

1. **Circular Progress Indicator**
   - Styled as circular meter (Palm Pilot aesthetic)
   - Shows percentage (large, centered number)
   - Shows fraction: "X of Y tasks complete"
   - Color: fills clockwise, blue/teal primary color

2. **Current Task Card**
   - Bordered container with slight elevation
   - 🔥 emoji prefix indicates "current focus"
   - Task name in bold
   - Priority badge (⚠️ High, ⚡ Medium, ✓ Low)
   - Due date with calendar emoji if set
   - Tappable to edit task

3. **Procrastination Alert** (Conditional Display)
   - **Triggers when ALL of:**
     - Project completion >70% AND
     - >50% of remaining tasks marked "dreaded" AND  
     - No tasks completed in 5+ days
   - Red/orange alert styling
   - Shows contextual message with metrics
   - **Action Buttons:**
     - "Power Through Mode": Pins project to top, enables daily reminders, shows dedicated view
     - "Adjust": Opens modal to break down dreaded tasks into smaller tasks

4. **Finishing Power Meter** (Alternative to alert)
   ```
   🚧 FINISHING POWER: ▓▓▓░░ (3/5)
   ```
   - Visual meter: filled blocks represent tasks that aren't dreaded
   - Score = total remaining - dreaded count
   - Color-coded: Green (4+), Yellow (2-3), Red (<2)

5. **Momentum Indicator** (Include as badge/text)
   ```
   🟢 Hot Streak! (task within 2 days)
   🟡 Cooling... (3-7 days since last)
   🔴 Stalled! (8+ days since last)
   ```

6. **Remaining Tasks List**
   - Each task shows:
     - Checkbox (for completion)
     - Task name
     - ⚠️ indicator if task.dreaded === true
     - "(ugh)" suffix for dreaded tasks
     - Priority badge
     - Due date badge (if applicable)
   - Tappable to open task detail editor
   - List should scroll if >5 tasks

7. **Task Breakdown by Priority** (Optional Addition)
   ```
   📊 TASK BREAKDOWN
   ⚠️  High: 2  │  ⚡ Med: 1  │ ✓ Low: 1
   ```

8. **Bottom Action Buttons**
   - **+Task**: Add new task to this project
   - **Timeline**: View phase progress (if project from template)
   - **Notes**: View/edit project notes

**Additional Feature: Phase Progress** (for template-based projects)
If project was created from template (Software, Home, Work, etc.), add phase section:

```
│ PHASES                              │
│ ✅ Brainstorm           (3/3)       │  <- Completed phase
│ ✅ Design docs          (2/2)       │  <- Completed phase  
│ ⚙️  Implementation      (4/8)  ←    │  <- Active phase (gear icon, arrow)
│ ⬜ Testing              (0/4)       │  <- Not started (empty box)
│ ⬜ Documentation        (0/2)       │  <- Not started
```

**Data Requirements:**
```javascript
{
  project: {
    id: UUID,
    name: string,
    template: string | null,  // 'software', 'home', etc.
    tasks_total: number,
    tasks_completed: number,
    completion_percentage: number,
    last_task_completed: datetime,
    current_task: {
      name: string,
      priority: 'high' | 'medium' | 'low',
      due_date: datetime | null,
      dreaded: boolean
    },
    remaining_tasks: [
      {
        id: UUID,
        name: string,
        priority: 'high' | 'medium' | 'low',
        due_date: datetime | null,
        dreaded: boolean,
        completed: boolean
      }
    ],
    dreaded_count: number,
    phases: [  // Only if template project
      {
        name: string,
        completed: boolean,
        active: boolean,
        tasks_in_phase: number,
        completed_in_phase: number
      }
    ]
  }
}
```

**Interaction Behaviors:**
- Slide-up panel with swipe-down to dismiss
- Tapping dimmed background dismisses panel
- All buttons and tasks are tappable
- "Power Through Mode" should persist project pin and show banner on main screen
- Checking task checkbox immediately updates all progress metrics
- "Dreaded task" toggle available in task editor (not shown in dashboard mockup)

**Styling Notes:**
- Maintain nostalgic Palm Pilot / early BlackBerry aesthetic
- Use system fonts or pixelated fonts for retro feel
- Beige/tan background with dark borders
- Blue accents for primary actions
- Red/orange for alerts
- Subtle shadows for depth
- Rounded corners on cards (subtle, not excessive)

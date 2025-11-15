# Idealist App - Implementation Guide
**Version**: 1.0  
**Date**: November 5, 2025

## Table of Contents
1. [App Overview & Philosophy](#app-overview--philosophy)
2. [Unified Capture/Inbox Screen](#unified-captureinbox-screen)
3. [Parse + Convert Workflow](#parse--convert-workflow)
4. [Quick Add Buttons](#quick-add-buttons)
5. [Note Types & Templates](#note-types--templates)
6. [Project Dashboards](#project-dashboards)
7. [Project Templates](#project-templates)
8. [Task Syncing System](#task-syncing-system)
9. [Plans & Daily Workflow](#plans--daily-workflow)
10. [UI/UX Components](#uiux-components)

---

## App Overview & Philosophy

### Core Purpose
Idealist is a mobile-first, frictionless capture and project management app designed to solve the problem of scattered thoughts, tasks, and ideas throughout the day. The app prioritizes **quick capture above all else**, with organization and conversion happening later.

### Design Aesthetic
- Nostalgic throwback to Palm Pilot / early BlackBerry era
- Physical device feel with tactile interactions
- Mobile-first design with desktop support
- Minimalist but functional interface

### Key Principles
1. **Capture first, organize later** - No friction in the capture moment
2. **AI-assisted, not AI-dependent** - Smart defaults but user control
3. **Shallow hierarchy** - Tasks can belong to Projects OR Lists, but that's as deep as it goes
4. **Batch processing** - Review and convert ideas in batches during dedicated times

---

## Unified Capture/Inbox Screen

### Concept
Combine the Capture and Inbox screens into a single unified interface where users can:
- Quickly capture any idea, task, link, or note
- See unparsed ideas immediately below the capture field
- View parsed (categorized) ideas ready for conversion
- Access Quick Add buttons for immediate categorization

### Screen Layout
```
┌─────────────────────────────────────┐
│ CAPTURE                     [AI]    │ 
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Capture idea...          [✓][📎]│ │ 
│ └─────────────────────────────────┘ │
│                                     │
│ QUICK ADD                           │
│ [Task] [Note▾] [List] [Project]    │ 
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ INBOX                               │
│ [Unparsed (12)] [Ready to Convert (5)]│
│                                     │
│ ⚡ call Sarah back Q4 proposal      │ 
│    [Task][Note][List][Project]      │
│                                     │
│ 📋 Make Inbox feel more like email  │ 
│    [Convert] [Edit Category]        │
│                                     │
│ 🔬 Python async patterns            │ 
│    [Convert] [Edit Category]        │
│                                     │
│ [View All Parsed] [Empty Inbox]     │
└─────────────────────────────────────┘
```

### Components

#### Capture Input Field
- Single text input at the top
- Checkmark (✓) button to submit
- Attachment (📎) button for files/images
- On submit: Creates idea entity, adds to unparsed inbox below

#### Quick Add Buttons
- **Task**: Pre-parse idea as Task type
- **Note**: Split button with submenu (see Note Types section)
- **List**: Pre-parse idea as List type
- **Project**: Pre-parse idea as Project type

#### AI Button
- Located in top-right corner
- Dropdown options:
  - Parse All Unparsed
  - Convert All Parsed
  - Parse & Convert (full workflow)

#### Inbox Views (Tabs)
- **Unparsed (count)**: Ideas with ⚡ icon, shows category buttons
- **Ready to Convert (count)**: Ideas with type emoji badge, shows Convert button

#### Badge Colors
- 🟡 Yellow badge: Unparsed count (informational)
- 🔴 Red badge: Ready to Convert count (action needed!)

---

## Parse + Convert Workflow

### Key Insight
**Parsing** (categorization) and **Converting** (full entity creation) are separate steps, and this separation is beneficial.

### Three-Stage Process

#### Stage 1: Capture (Unparsed)
- User types anything and hits checkmark
- Idea created with `parsed: false` status
- Appears in Inbox with ⚡ (unparsed) icon
- Shows category buttons: [Task][Note][List][Project]

#### Stage 2: Parsing (Categorized)
Three ways to parse:
1. **Manual**: Tap category button on unparsed idea
2. **Quick Add**: Use Quick Add button during capture (pre-parses immediately)
3. **AI Assisted**: AI button parses automatically

Once parsed:
- Idea gets `parsed: true` and `entity_type: "task"` (or note/list/project)
- Icon changes to type-specific emoji (📋 for task, 🔬 for research note, etc.)
- Category buttons replaced with [Convert] and [Edit Category] buttons
- Moves to "Ready to Convert" tab

#### Stage 3: Converting (Full Entity)
- User taps [Convert] button
- Opens pre-filled form with AI-suggested details:
  - For tasks: suggested due date, priority, project assignment
  - For notes: populated template with relevant fields
  - For projects: selected template with auto-created tasks
- User reviews/adjusts
- On save: Full entity created, idea archived or deleted

### Benefits
- Frictionless capture (don't need to know entity type immediately)
- Batching possible (parse 10 ideas at once)
- AI can suggest intelligent defaults at conversion time
- Clear visual progression through workflow

---

## Quick Add Buttons

### Behavior
Quick Add buttons do NOT immediately create full entities. Instead, they:
1. Pre-parse the captured idea with the selected type
2. Move it to "Ready to Convert" status
3. Allow conversion with smart defaults later

### Why Not Auto-Convert?
- Maintains frictionless capture (no forms during capture moment)
- Allows AI to fill in intelligent defaults when user is ready
- Enables batch operations
- Preserves the parse → convert separation

### Note Quick Add Submenu

#### Implementation: Split Button Pattern
```
┌────────────────┬──┐
│  📝 NOTE       │▼ │  
└────────────────┴──┘

When arrow tapped:
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

#### Why Split Button?
- Most predictable UX pattern
- Works on mobile (no hover required) and desktop
- Space efficient
- Easy to implement with standard UI libraries
- Tapping main area: creates generic note
- Tapping arrow: shows template submenu

---

## Note Types & Templates

### Template Structure
All note templates use YAML frontmatter + structured markdown sections:
- Frontmatter: metadata (mostly auto-populated, some editable)
- Headers: organized sections for content
- Some templates have special behaviors (e.g., Meeting action items)

### Implementation Notes
- Frontmatter fields can map to existing entity properties
- Users should NOT manually edit raw frontmatter
- Editable fields should have UI controls in the note editor
- Some frontmatter can be displayed as read-only badges/metadata

---

### Research Note Template
```yaml
---
type: research
created: {{timestamp}}
modified: {{timestamp}}
project: 
status: active
tags: []
---

# {{topic}}

## Purpose
Why am I researching this?

## Key Questions
- 

## Starting Points
- 

## Quick Facts
- 

## Sources & References
- 

## Related Topics
- 

## Next Steps
- 

## Wikipedia
[Search Wikipedia](https://en.wikipedia.org/wiki/{{topic}})
```

---

### YouTube/Video Note Template
```yaml
---
type: video
created: {{timestamp}}
modified: {{timestamp}}
project:
url: 
channel: 
duration: 
status: to-watch
tags: []
---

# {{title}}

## Video Info
**Channel**: 
**URL**: 
**Duration**: 
**Published**: 

## Why I Saved This
Brief context on why this is relevant

## Key Timestamps
- 0:00 - 
- 

## Main Takeaways
- 

## Action Items
- 

## Related Content
- 
```

---

### Link Note Template
```yaml
---
type: link
created: {{timestamp}}
modified: {{timestamp}}
project:
url: 
domain: 
status: unread
tags: []
---

# {{title}}

**URL**: {{url}}
**Source**: {{domain}}

## Why I Saved This
Context and relevance

## Summary
Key points after reading

## Quotes
> Important excerpts

## Related Links
- 

## Follow-up Actions
- 
```

---

### File Note Template
```yaml
---
type: file
created: {{timestamp}}
modified: {{timestamp}}
project:
filename: 
filepath: 
filetype: 
filesize: 
status: stored
tags: []
---

# {{filename}}

## File Details
**Type**: {{filetype}}
**Size**: {{filesize}}
**Location**: {{filepath}}
**Uploaded**: {{timestamp}}

## Description
What is this file and why is it important?

## Contents Overview
Brief summary of what's in the file

## Usage Notes
How/when to use this

## Related Files
- 

## Tags for Search
#
```

---

### Contact/Person Note Template
```yaml
---
type: contact
created: {{timestamp}}
modified: {{timestamp}}
project:
name: 
role: 
company: 
status: active
tags: []
---

# {{name}}

## Contact Info
**Email**: 
**Phone**: 
**LinkedIn**: 
**Company**: 
**Role**: 

## Context
How we know each other / why they're important

## Meeting Notes

### {{date}}
- 

## Topics of Interest
- 

## Related Projects
- 

## Follow-ups
- [ ] 
```

---

### Meeting Note Template
```yaml
---
type: meeting
created: {{timestamp}}
modified: {{timestamp}}
project: 
meeting_date: {{date}}
attendees: []
duration: 
status: scheduled
tags: []
---

# {{meeting_title}}

## Meeting Details
**Date**: {{meeting_date}}
**Duration**: {{duration}}
**Attendees**: 
- 
**Location/Link**: 

## Agenda
- 

## Discussion Notes

### Topic 1
- 

### Topic 2
- 

## Decisions Made
- 

## Action Items
- [ ] {{task}} - {{owner}} - {{due_date}}
- [ ] 

## Transcript
{{auto_populated_if_available}}

## Follow-up
Next meeting: 
Topics to revisit: 

## Related
**Previous Meeting**: 
**Project**: {{project}}
**Participants**: {{link_to_person_notes}}
```

**Special Feature**: See Task Syncing System section for how Action Items convert to tasks

---

## Project Dashboards

### Overview
Projects use a slide-up detail panel (from bottom, covering ~70% of screen) with a dashboard-style layout showing progress, status, and actionable information.

### Design Philosophy
- Visual, scannable information
- Actionable insights (not just data display)
- Procrastination detection and motivation
- Phase-based progress for templated projects

---

### Dashboard Layout: Visual-First (Selected Design)

```
┌─────────────────────────────────────┐
│ ← PROJECT: ChatterAI v2.0           │
├─────────────────────────────────────┤
│        ╭───────────╮                │
│        │   73%     │                │
│        │  ██████   │                │
│        │  11 / 15  │                │
│        ╰───────────╯                │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 🔥 CURRENT TASK               │   │
│ │ Implement SSE transport       │   │
│ │ ⚡ Medium  │  📅 Due: Nov 8   │   │
│ └───────────────────────────────┘   │
│                                     │
│ ⚠️  PROCRASTINATION ALERT           │
│ ┌─────────────────────────────────┐ │
│ │ Project is 73% done but stalled │ │
│ │ 4 tasks left, 2 marked "dreaded"│ │
│ │ Last task: 4 days ago           │ │
│ │ [Power Through Mode] [Adjust]   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ REMAINING TASKS                     │
│ ⚠️  Write tests (ugh)               │
│ ⚠️  Update documentation (ugh)      │
│ ⚡ Deploy to staging                │
│ ✓ Final review                      │
│                                     │
│ [+Task] [Timeline] [Notes]          │
└─────────────────────────────────────┘
```

---

### Dashboard Components

#### 1. Circular Progress Indicator
- Center-aligned, prominent
- Shows percentage complete
- Shows "X of Y tasks complete"
- Visual style: circular meter (Palm Pilot aesthetic)

#### 2. Current Task Card
- Highlighted/bordered section
- Shows the active or next task
- Displays: task name, priority badge, due date
- 🔥 emoji indicates "current focus"

#### 3. Procrastination Alert
**This is a key feature for addressing near-finish project abandonment.**

Triggers when:
- Project is >70% complete AND
- More than 50% of remaining tasks are marked "dreaded" AND
- No tasks completed in last 5+ days

Displays:
- Clear alert message with context
- Number of remaining tasks
- Number of "dreaded" tasks
- Days since last completion
- Action buttons:
  - **Power Through Mode**: Moves project to top, daily reminders, focused view
  - **Adjust**: Opens modal to break down dreaded tasks

#### 4. Finishing Power Meter
```
🚧 FINISHING POWER: ▓▓▓░░ (3/5)
```
- Visual meter showing "push to completion" strength
- Calculation: Total remaining tasks minus dreaded tasks
- Lower score = higher procrastination risk
- Color-coded: Green (>4), Yellow (2-3), Red (<2)

#### 5. Momentum Indicator
Shows project activity level:
```
🟢 Hot Streak! (completed task within 2 days)
🟡 Cooling... (3-7 days since last task)
🔴 Stalled! (8+ days since last task)
```

#### 6. Task Breakdown by Priority
```
📊 TASK BREAKDOWN
⚠️  High: 2  │  ⚡ Med: 1  │ ✓ Low: 1
```

#### 7. Remaining Tasks List
- Shows incomplete tasks
- Visual indicators:
  - ⚠️ for "dreaded" tasks (marked by user as unpleasant)
  - Priority badges
  - Due date badges if applicable
- Tappable to view/edit task

#### 8. Action Buttons
- **+Task**: Add new task to project
- **Timeline**: View project timeline and phase progress
- **Notes**: View/edit project notes

---

### Dashboard for Template-Based Projects

For projects created from templates (Software, Home, etc.), add phase progress:

```
│ PHASES                              │
│ ✅ Brainstorm           (3/3)       │
│ ✅ Design docs          (2/2)       │
│ ⚙️  Implementation      (4/8)  ←    │  <- Current phase
│ ⬜ Testing              (0/4)       │
│ ⬜ Documentation        (0/2)       │
```

- Checkmark: Phase complete
- Gear: Phase in progress
- Empty box: Phase not started
- Arrow indicates current phase

---

### "Dreaded Task" Feature

#### How It Works
1. When creating or editing a task, user can toggle "This task is going to suck"
2. Task gets `dreaded: true` property
3. Displays with ⚠️ indicator and "(ugh)" suffix in lists
4. Factors into Finishing Power and Procrastination Alert calculations

#### Power Through Mode
When activated:
- Project pinned to top of project list
- Dedicated "Power Through" view shows only this project's tasks
- Optional: Daily push notification reminder
- Optional: Completion streak tracker
- Mode automatically deactivates when project reaches 100%

#### Break It Down Feature
Opens modal for dreaded task:
- Prompt: "What's the smallest first step?"
- Allows splitting task into subtasks
- Original task becomes a parent task
- Subtasks inherit project assignment

---

## Project Templates

### Purpose
Auto-create common task structures when project is created from a template. This helps:
- Ensure nothing is forgotten
- Provide structure for unfamiliar project types
- Speed up project setup

### Template Selection
- Dropdown/selector during project creation
- Templates: Software, Home, Work, 3D Printing, Smart Home, Custom (blank)

---

### Software Project Template

```yaml
---
type: project
template: software
created: {{timestamp}}
status: active
architecture: 
backend: 
frontend: 
tech_stack: []
---

# {{project_name}}

## Auto-Created Tasks

### Planning Phase
- [ ] Brainstorm features and requirements
- [ ] Generate design docs
- [ ] Define jobs to be done
- [ ] Break down into tasks

### Implementation Phase  
- [ ] Set up project structure
- [ ] Implement core functionality
- [ ] Implement UI/UX

### Quality Phase
- [ ] Write tests
- [ ] Testing and bug remediation
- [ ] Code review

### Launch Phase
- [ ] Write documentation
- [ ] Deployment setup
- [ ] Deploy to production

## Architecture Notes
**Backend**: {{backend}}
**Frontend**: {{frontend}}
**Stack**: {{tech_stack}}

## Resources & Links
- Design docs: 
- Repository: 
- Deployment: 
```

#### Custom Fields
- Architecture (text)
- Backend (text)
- Frontend (text)
- Tech Stack (array/tags)

---

### Home Project Template

```yaml
---
type: project
template: home
created: {{timestamp}}
status: active
budget: 
location: 
---

# {{project_name}}

## Auto-Created Tasks
- [ ] Plan and set budget
- [ ] Purchase materials
- [ ] Implementation/work
- [ ] Cleanup and organize
- [ ] Final inspection

## Budget & Resources
**Budget**: {{budget}}
**Location**: {{location}}

## Notes
```

---

### Work Project Template

```yaml
---
type: project
template: work
created: {{timestamp}}
status: active
stakeholders: []
deadline: 
---

# {{project_name}}

## Auto-Created Tasks
- [ ] Define objectives
- [ ] Stakeholder alignment
- [ ] Execution
- [ ] Review and iterate
- [ ] Final delivery

## Project Details
**Stakeholders**: {{stakeholders}}
**Deadline**: {{deadline}}

## Notes
```

---

### 3D Printing Template

```yaml
---
type: project
template: 3d_printing
created: {{timestamp}}
status: active
printer: 
material: 
---

# {{project_name}}

## Auto-Created Tasks
- [ ] Find or design model
- [ ] Slice and configure settings
- [ ] Test print
- [ ] Final print
- [ ] Post-processing

## Print Details
**Printer**: {{printer}}
**Material**: {{material}}

## Settings & Notes
```

---

### Smart Home Template

```yaml
---
type: project
template: smart_home
created: {{timestamp}}
status: active
platform: 
devices: []
---

# {{project_name}}

## Auto-Created Tasks
- [ ] Research devices and compatibility
- [ ] Purchase and inventory
- [ ] Physical installation
- [ ] Configuration and automation setup
- [ ] Testing

## System Details
**Platform**: {{platform}} (e.g., Home Assistant, HomeKit)
**Devices**: {{devices}}

## Automations & Notes
```

---

## Task Syncing System

### Problem
Meeting notes and Project notes can contain action items as checkboxes. These should become actual Task entities without duplication.

### Solution: UUID-Based Bidirectional Sync

#### How It Works

##### Phase 1: Initial Conversion
1. User creates meeting/project note with action items:
```markdown
## Action Items
- [ ] Follow up with Sarah by Friday
- [ ] Send proposal doc
- [ ] Schedule next meeting
```

2. User clicks **"Convert Action Items to Tasks"** button

3. System:
   - Parses each `- [ ]` checkbox line
   - Checks if a UUID comment exists
   - If NO UUID: Creates new Task entity, generates UUID, inserts into note
   - If UUID exists: Updates existing task instead

4. Result in note:
```markdown
## Action Items
- [ ] Follow up with Sarah by Friday <!-- task_uuid: abc123 -->
- [ ] Send proposal doc <!-- task_uuid: def456 -->
- [ ] Schedule next meeting <!-- task_uuid: ghi789 -->
```

5. Created tasks have metadata:
```yaml
source: meeting
source_id: {{meeting_note_id}}
line_number: 1
original_text: "Follow up with Sarah by Friday"
```

##### Phase 2: Bidirectional Sync
- Checking box in note → marks task as complete
- Marking task complete → checks box in note
- Editing task text → updates note (with last_synced timestamp)
- Editing note text → updates task (conflict detection needed)

##### Conflict Detection
If note text and task text differ:
- Compare `last_synced` timestamps
- If note modified more recently: Update task
- If task modified more recently: Show merge dialog
- User chooses: Keep note version, Keep task version, or Manual merge

#### Implementation Details

##### Database Schema Additions
```sql
-- Add to tasks table
source VARCHAR(50),          -- 'meeting', 'project', 'manual'
source_id VARCHAR(255),      -- UUID of source note
line_number INTEGER,         -- Line in source note
original_text TEXT,          -- Original checkbox text
last_synced TIMESTAMP        -- Last sync with source

-- Add sync_log table (optional, for debugging)
CREATE TABLE task_sync_log (
  id UUID PRIMARY KEY,
  task_id UUID,
  source_id UUID,
  action VARCHAR(50),        -- 'created', 'updated', 'completed', 'deleted'
  timestamp TIMESTAMP
);
```

##### API Endpoints
```
POST /api/notes/{note_id}/convert-action-items
  - Parses note for checkboxes
  - Creates/updates tasks
  - Returns array of created/updated task UUIDs

PATCH /api/tasks/{task_id}/complete
  - Marks task complete
  - Updates source note if source_id exists
  - Returns success status

PATCH /api/notes/{note_id}/check-item/{line_number}
  - Checks/unchecks checkbox at line
  - Updates linked task if UUID exists
  - Returns success status
```

##### UI Components
1. **Button in Note Editor**: "Convert Action Items to Tasks"
   - Appears when checkboxes detected in note
   - Shows count: "Convert 3 action items"

2. **Checkbox Behavior**: 
   - Checkboxes with UUIDs show sync indicator (tiny ↻ icon)
   - Clicking checkbox triggers sync

3. **Task Source Indicator**:
   - Tasks created from notes show badge: "From: Project XYZ"
   - Tappable to jump to source note

---

## UI/UX Components

### Slide-Up Detail Panel
Used for viewing/editing entities (tasks, notes, projects)

**Behavior**:
- Tap entity → panel slides up from bottom
- Covers ~70% of screen height
- Original list slightly dimmed behind panel
- Swipe down or tap dimmed area to dismiss
- "Full View" button opens full-screen editor for complex edits

**Use Cases**:
- Quick task edits (change due date, mark complete)
- View note content
- Project dashboard view (as described above)
- List previews

### Entity Detail Viewers
For each entity type, the slide-up panel shows:

#### Task Detail
- Task name (editable)
- Priority selector
- Due date picker
- Project assignment dropdown
- List assignment dropdown (if not in project)
- "Dreaded task" toggle
- Notes/description field
- [Save] [Cancel] [Delete] buttons

#### Note Detail
- Note type badge
- Title/heading
- Scrollable content (markdown rendered)
- [Edit] [View Source] buttons
- For meetings: "Convert Action Items" button if checkboxes present

#### List Detail
- List name
- Items (checkboxes)
- Progress indicator (X of Y complete)
- [Add Item] button

#### Project Detail
- **Uses Dashboard Layout** (see Project Dashboards section)

### Badge System

#### Entity Type Badges
- 📋 Task
- 📝 Note (generic)
- 🔬 Research Note
- 🎥 Video Note
- 🔗 Link Note
- 📁 File Note
- 👤 Person Note
- 🤝 Meeting Note
- 📑 List
- 📁 Project

#### Status Badges
- ⚡ Unparsed
- 🔴 Priority: High
- 🟡 Priority: Medium  
- 🟢 Priority: Low
- ✅ Complete
- ⚠️ Dreaded (for tasks)
- 🟢🟡🔴 Momentum indicators

#### Count Badges
- Circular badges on tabs/buttons
- Colors:
  - 🟡 Yellow: Informational counts
  - 🔴 Red: Action needed counts
  - 🟢 Green: Success/completed counts

---

## Plans & Daily Workflow

### Overview
Plans are the daily organizing structure that ties together all captured ideas, tasks, projects, and notes into actionable daily work. Each day has a Plan that contains the tasks, lists, notes, and projects relevant for that day.

### Core Concept
A Plan is a daily container entity that includes:
- **Tasks**: All tasks due that day + manually added tasks
- **Lists**: Any lists needed for the day's work
- **Notes**: Reference notes relevant to today's tasks
- **Projects**: Projects being actively worked on today

### Daily Workflow Loop

#### Morning Routine: Finalize Today's Plan
1. Review drafted plan from previous evening
2. Adjust as needed based on:
   - New overnight thoughts/priorities
   - Calendar commitments
   - Energy level/capacity
3. **Finalize** plan to begin working

#### During the Day: Execute Plan
- Work from the plan
- Complete tasks
- Can add items to plan as needed throughout day
- Capture new ideas in Capture/Inbox (doesn't interrupt plan)

#### Evening Routine: Review & Draft Tomorrow
1. **Review Today**
   - Mark completed tasks as complete
   - Update projects worked on (progress, status changes)
   - Optional: Journaling step (reflections, wins, lessons)

2. **Process Inbox**
   - Parse unparsed ideas
   - Convert ready-to-convert items

3. **Handle Unfinished Tasks**
   - Move incomplete tasks (options):
     - Reschedule to tomorrow
     - Reschedule to specific future date
     - Return to backlog/project
     - Delete if no longer relevant

4. **Draft Tomorrow's Plan**
   - Auto-populate with tasks due tomorrow
   - Add additional tasks from projects
   - Add relevant lists
   - Link relevant notes for context
   - Select active projects

5. **Future Planning** (optional)
   - Can work on plans for any future date
   - Calendar view ("Planner") for visualizing week/month

---

### Plan Data Model

```yaml
Plan:
  id: UUID
  date: DATE                    # The day this plan is for
  status: draft|finalized|completed
  finalized_at: TIMESTAMP       # When morning finalization happened
  completed_at: TIMESTAMP       # When evening review completed
  
  # Linked entities
  tasks: [Task]                 # Tasks for this day
  lists: [List]                 # Lists needed
  notes: [Note]                 # Reference notes
  projects: [Project]           # Active projects
  
  # Review data
  journal_entry: TEXT           # Optional evening reflection
  tasks_completed_count: INT    # Stats
  tasks_total_count: INT        # Stats
  completion_percentage: FLOAT  # Stats
  
  # Metadata
  created_at: TIMESTAMP
  modified_at: TIMESTAMP
```

### Key Behaviors

#### Auto-Population Rules
When creating tomorrow's plan:
- **Auto-add**: All tasks with `due_date = tomorrow`
- **Suggest**: Tasks from active projects with no due date
- **Carry-over**: Optionally include tasks from today that weren't completed

#### Task Rescheduling
When moving unfinished tasks during evening review:
```
Options:
1. Move to Tomorrow (adds to tomorrow's plan)
2. Reschedule (pick date, adds to that plan)
3. Back to Backlog (removes due date, back to project/list)
4. Delete (if no longer relevant)
```

#### Project Updates
During evening review, for each project worked on today:
- Update progress percentage
- Mark tasks completed
- Add notes about what was accomplished
- Set status (e.g., "in progress", "blocked", "completed")

#### Journaling Step
Optional end-of-day reflection:
- **Wins**: What went well?
- **Challenges**: What was difficult?
- **Lessons**: What did I learn?
- **Tomorrow's Focus**: What's most important?

Stored as `journal_entry` on the Plan entity.

---

### Planner (Calendar View)

#### Purpose
Visual calendar interface for managing plans across days/weeks/months.

#### Features (Future Implementation)
- Week view: See plans for each day
- Month view: High-level overview
- Drag-and-drop tasks between days
- Quick-add tasks to specific dates
- Color-coding by project
- Completion indicators per day

**Note**: UI design for Plans and Planner is deferred to future implementation. Focus is on data model and workflow logic first.

---

### Integration with Existing Features

#### Capture/Inbox Workflow
- Ideas captured throughout the day go to Inbox (doesn't interrupt Plan)
- During evening review: Parse and convert inbox items
- Converted items can be added to future plans

#### Projects Dashboard
- Dashboard shows if project is in today's plan
- Quick action: "Add to Today" button
- Projects in today's plan highlighted in project list

#### Tasks Screen
- Filter: "Today's Plan" shows only tasks in today's plan
- Filter: "Backlog" shows tasks not in any plan
- Quick action: "Add to Plan" with date picker

---

### Workflow State Machine

```
Plan Status Flow:
draft → finalized → completed → (next day's draft)

Morning:
  IF plan.status == 'draft' THEN
    User reviews → clicks "Finalize Plan"
    plan.status = 'finalized'
    plan.finalized_at = NOW()

Evening:
  IF plan.status == 'finalized' THEN
    User reviews day → completes evening checklist
    plan.status = 'completed'
    plan.completed_at = NOW()
    CREATE new Plan(date = tomorrow, status = 'draft')
```

---

### Evening Review Checklist

System presents a guided workflow:

```
✓ Step 1: Mark Completed Tasks
  [ ] Review each task, check off completed ones
  
✓ Step 2: Update Projects
  For each project in today's plan:
  [ ] Update progress
  [ ] Add notes
  
✓ Step 3: Journal (Optional)
  [ ] Reflect on today
  
✓ Step 4: Process Inbox
  [ ] Parse unparsed ideas (X items)
  [ ] Convert ready items (Y items)
  
✓ Step 5: Reschedule Unfinished Tasks
  For each incomplete task:
  [ ] Move to tomorrow / Pick date / Back to backlog / Delete
  
✓ Step 6: Draft Tomorrow's Plan
  [ ] Review auto-populated tasks
  [ ] Add additional tasks
  [ ] Add relevant lists/notes
  [ ] Select active projects
  
[Complete Review & Finalize Tomorrow's Draft]
```

---

### Future Enhancements

#### Smart Suggestions
- AI suggests which projects should be in tomorrow's plan based on:
  - Recent momentum
  - Approaching deadlines
  - Projects marked "high priority"

#### Plan Analytics
- Track completion rates over time
- Identify patterns (best days, common over-commitments)
- Suggest optimal task load based on history

#### Habit Tracking
- Daily habits as special tasks in plan
- Streak tracking
- Visual indicators in planner view

#### Time Blocking
- Assign time estimates to tasks
- Visual timeline in plan view
- Alerts when over-scheduled

---

## Implementation Priority

### Phase 1: Core Capture & Convert (MVP)
1. Unified Capture/Inbox screen
2. Parse + Convert workflow
3. Quick Add buttons (basic)
4. Unparsed/Ready to Convert tabs
5. Basic entity creation (task, note, list, project)

### Phase 2: Note Templates & Organization
1. Note type templates (all 6 types)
2. Split button submenu for Note types
3. Template population on creation
4. YAML frontmatter handling

### Phase 3: Project Dashboards
1. Slide-up panel for projects
2. Visual-First dashboard layout
3. Progress indicators
4. Current task card
5. Remaining tasks list

### Phase 4: Plans & Daily Workflow (Core Loop)
1. Plan data model and CRUD operations
2. Auto-population of plans (tasks due today)
3. Morning finalize workflow
4. Evening review workflow (guided checklist)
5. Task rescheduling functionality
6. Basic "Today's Plan" view

### Phase 5: Advanced Features
1. Project templates with auto-task creation
2. Task syncing system (meeting/project → tasks)
3. Procrastination Alert
4. Finishing Power meter
5. Momentum tracking
6. Power Through Mode
7. Journaling step in evening review

### Phase 6: Planner & Analytics
1. Calendar view (Planner) for future plans
2. Week/month views
3. Drag-and-drop task rescheduling
4. Plan analytics and completion tracking
5. Smart AI suggestions for daily plans

### Phase 7: Polish & AI
1. AI parsing improvements
2. AI conversion with smart defaults
3. Batch operations
4. Advanced filtering/search
5. Theme system refinements
6. Time blocking features

---

## Technical Considerations

### Data Model Relationships
```
Idea (unparsed)
  ├─ parsed: boolean
  ├─ entity_type: string (task|note|list|project)
  └─ [converts to] → Entity

Task
  ├─ belongs_to: Project (optional)
  ├─ belongs_to: List (optional)
  ├─ in_plans: [Plan] (many-to-many)
  ├─ due_date: date (optional)
  ├─ source: string (meeting|project|manual)
  ├─ source_id: UUID (if from meeting/project)
  └─ dreaded: boolean

Note
  ├─ note_type: string (research|video|link|file|person|meeting)
  ├─ frontmatter: JSON
  ├─ content: text (markdown)
  ├─ belongs_to: Project (optional)
  └─ in_plans: [Plan] (many-to-many)

Project
  ├─ template: string (software|home|work|3d_printing|smart_home|custom)
  ├─ tasks: [Task]
  ├─ notes: [Note]
  └─ in_plans: [Plan] (many-to-many)

List
  ├─ items: JSON array
  ├─ tasks: [Task] (optional, if list is task-based)
  └─ in_plans: [Plan] (many-to-many)

Plan (NEW)
  ├─ date: date (unique per day)
  ├─ status: enum (draft|finalized|completed)
  ├─ tasks: [Task] (many-to-many)
  ├─ lists: [List] (many-to-many)
  ├─ notes: [Note] (many-to-many)
  ├─ projects: [Project] (many-to-many)
  ├─ journal_entry: text (optional)
  └─ completion_stats: JSON
```

### API Considerations
- RESTful endpoints for CRUD operations
- Batch endpoints for parse/convert operations
- WebSocket or SSE for real-time sync updates
- Efficient queries for dashboard calculations

### Performance
- Dashboard metrics should be cached/computed on task changes
- Avoid recalculating on every view
- Consider database triggers or event listeners for cache invalidation

---

## Open Questions & Future Enhancements

### Questions for Clarification
1. Should project templates be fully customizable by users?
2. What happens when a task is deleted from Tasks screen but exists in a meeting note?
3. Should there be a maximum number of "dreaded" tasks per project?
4. Export functionality for completed projects?
5. **Plans**: Should unfinished tasks from today auto-add to tomorrow's draft, or require manual selection?
6. **Plans**: Can a task be in multiple plans (e.g., planned for Monday but also tentatively in Tuesday)?
7. **Plans**: Should there be a "capacity" setting per day (max X tasks) with warnings when over-scheduling?
8. **Plans**: How far in advance can users create plans? Unlimited or cap at 30/90 days?

### Future Ideas
- Recurring tasks (with intelligent plan integration)
- Task dependencies (blocking relationships)
- Shared projects (collaboration)
- Archive functionality for completed items
- Export/backup functionality
- **Plan Templates**: Save and reuse daily plans (e.g., "Monday Routine", "Sprint Planning Day")
- **Plan Comparison**: Compare planned vs actual completion across weeks/months
- **Energy Tracking**: Rate energy level at start/end of day, correlate with completion rates
- **Focus Sessions**: Pomodoro-style timer integrated with today's plan
- **Weekly Review**: Aggregate daily journals into weekly insights

---

## Conclusion

This implementation guide provides a comprehensive roadmap for building Idealist with a focus on frictionless capture, intelligent organization, and procrastination-aware project management. The key innovations are:

1. **Parse + Convert separation** for flexible idea processing
2. **Unified Capture/Inbox** for single-screen workflow
3. **Daily Plans & Workflow Loop** for structured execution and reflection
4. **Project Dashboards with Procrastination Detection** for motivation
5. **UUID-based Task Syncing** for seamless note-to-task conversion
6. **Template system** for structured projects and consistent workflows

The app balances simplicity in capture with power in organization, creating a daily rhythm of plan → execute → review → prepare that maintains momentum while respecting the reality of incomplete work and procrastination patterns. All wrapped in a nostalgic, tactile interface that evokes the golden age of mobile productivity devices.

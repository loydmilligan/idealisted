> Yes - pleae use superpowers skills to design our next sprint - which should be to add project
markdown and list markdown. each list shoudl only contain 1 list of items - and hte editor shoudl be
 an iput box for each item in the list and a plus to add naother item. user shoudl be able when
entering items in the list, to enter an item, press enter, enter the next item, press enter adn so
on. List types - Bulleted, Numbered, Todo, Shopping.  Be careful with todo as we used to ahve a tpye
 of entity called todo - maek sure that this new todo concept does not collide with the odl one.
Projects, shoudl ahve the usual project fields, the shoudl also have the ability to add tasks that
are associatedd with the project (tasks can currently be assigned a project so it makes sense for a
project to be able to have tasks added to it. Tasks shoudl also be enabled to add notes (in both
these cases, what i mean is that the task and note entities can be attached ot a proecjt so that we
can see and navigate to them from teh project detail - perhaps a pop up modal to view the task or
note. Projects shoudl have a type property - personal, coding, smart home, work, Apartment. Prohect
markdown view shoudl ahve a few addiitonal "wdigets" a x of x tasks complete. a staleness indicator
based on creation date.  stuff like that.  Projects are meant as a managemnt tool for
larger/multistep tasks. Lets get these last two markdown feautres working, then we can move to the
plan cocnept

● I'm using the brainstorming skill to refine this into a fully-formed design before we create an
  implementation plan.

> The "brainstorming" skill is loading

● Perfect! Let me help you design the List and Project markdown features through collaborative
  refinement.

  First, let me understand the current project state:

● Bash(git log --oneline -5)
  ⎿  a8126f9 fix: Update CaptureScreen note dropdown to show Note and YouTube only
     9103091 fix: Complete markdown entity creation and viewing fixes
     1451b02 fix: Save markdown_content and template_id when updating items
     … +2 lines (ctrl+o to expand)

● Bash(sqlite3 data/idealisted.db "SELECT id, name FROM templates WHERE entity_type IN ('list',
      'project') LIMIT 5")
  ⎿  (No content)

● Good! No existing markdown templates for lists or projects yet. Now let me explore your
  requirements.

  Understanding Lists

  You mentioned 4 list types: Bulleted, Numbered, Todo, Shopping

  For the legacy "todo" entity collision, I see a few options:

  A) Rename list type to "Checklist" instead of "Todo"
  - Avoids confusion with legacy todo entity
  - Clear and descriptive
  - List types: Bulleted, Numbered, Checklist, Shopping

  B) Keep "Todo List" with full name
  - More explicit than just "todo"
  - Less likely to confuse with entity type
  - List types: Bulleted, Numbered, Todo List, Shopping

  C) Make Shopping a special checklist
  - Shopping is really just a checklist with different context
  - Reduce to 3 types: Bulleted, Numbered, Checklist
  - User adds "shopping" tag or category

  My recommendation: Option A (use "Checklist")
  - Clearest distinction from legacy todos
  - Shopping and checklist are different use cases (shopping has quantity/aisle context)
  - 4 types gives good coverage without overcomplicating

  What do you think - should we go with "Checklist" to avoid the todo collision?

> lets call it tasklist

● Perfect! TaskList it is - clear, descriptive, and avoids all collision issues.

  So we have 4 list types: Bulleted, Numbered, TaskList, Shopping

  List Item Entry Flow

  You described: "enter an item, press enter, enter the next item, press enter and so on"

  I see a few implementation options:

  A) Auto-focus next field on Enter
  - Press Enter → automatically adds new empty field below and focuses it
  - Keep typing → seamless flow
  - Delete key on empty field removes it
  - Simple, fast workflow

  B) Single textarea with line-per-item
  - One big textarea, each line = one item
  - Enter creates new line naturally
  - Simpler UI, familiar pattern
  - Can't have per-item actions (reorder, delete individual)

  C) Hybrid: Textarea for bulk entry, then converts to individual fields
  - Start with textarea for quick entry
  - Converts to item fields for editing/reordering
  - Best of both worlds but more complex

  My recommendation: Option A (Auto-focus next field)
  - Matches your description most closely
  - Allows per-item controls (reorder buttons, delete)
  - Clean UX once implemented
  - Works well for all 4 list types

  Does auto-focus next field on Enter sound right for the list item entry experience?

> yes option a is what i envisioned

● Excellent! Auto-focus next field it is.

  List Data Storage

  For storing list items in the markdown content, I see a few approaches:

  A) Store as actual markdown lists
  - Bulleted: - Item text
  - Numbered: 1. Item text
  - TaskList: - [ ] Item text (unchecked) or - [x] Item text (checked)
  - Shopping: - [ ] Item text with quantities in the text
  - Pro: Standard markdown, portable, human-readable
  - Con: Need to parse markdown to extract items for editing

  B) Store as JSON in markdown frontmatter
  - YAML frontmatter with items array: items: [{text: "...", checked: false}, ...]
  - Markdown body for display only
  - Pro: Easy to parse and edit programmatically
  - Con: Not standard markdown, less portable

  C) Hybrid: JSON in database + markdown for display
  - Store items array in a separate database field
  - Generate markdown from items for display
  - Pro: Best of both - easy to edit, nice display
  - Con: Two sources of truth to keep in sync

  My recommendation: Option A (Actual markdown lists)
  - Keeps markdown as single source of truth
  - Works with any markdown viewer
  - We already have markdown parsing infrastructure
  - TaskList items naturally support checkbox state - [x]

  Should we store lists as actual markdown (bullets, numbers, checkboxes) in the markdown_content
  field?

> I agree with A - something I am concerend with, and have been since we added teh subtasks to the
tasks markdown.  if we want to create a task based ui - will we be able to cleanly retrieve all
tasks for display (for our planner ui that we are desinging in our heads currently), if some are a
fill markdown document and others are within lists (multiple tasks in one takslist), and projects
and such. I jsut want to make sure we can keep our tasks organized if we have mutliple types

● Excellent point - this is a critical architectural question that affects the whole system.

  Let me clarify what I understand:

  Current situation:
  - Task markdown templates have a "Subtasks" section (markdown checklist within the task)
  - These subtasks are just markdown text, NOT separate task entities
  - Real tasks = rows in tasks table + items table

  Your concern:
  - Will we confuse markdown checklists (subtasks in tasks, items in TaskLists) with actual Task
  entities?
  - When building the planner UI, can we cleanly query "all my actual tasks"?

  I see three interpretations of what you want:

  A) Keep them completely separate
  - TaskList items are ONLY markdown text (not task entities)
  - Task subtasks are ONLY markdown text (not task entities)
  - Planner UI queries tasks table only
  - Pro: Clean separation, simple queries
  - Con: Can't promote a TaskList item to a real task easily

  B) TaskList items ARE task entities (with relationships)
  - Each TaskList item creates a real row in tasks table
  - Linked via project_id or new list_id field
  - Planner can show "all tasks" OR "standalone tasks only"
  - Pro: TaskList items become first-class tasks
  - Con: More complex, changes data model significantly

  C) Hybrid: TaskLists stay text, but with "promote to task" action
  - TaskList items start as markdown
  - User can click "promote" to convert item → real task entity
  - Best of both worlds
  - Pro: Simple by default, powerful when needed
  - Con: Two-step process for creating tasks from lists

  My recommendation: Option A for now (keep separate)
  - Planner queries tasks table only - clean and simple
  - TaskList items and task subtasks are just markdown helpers
  - We can always add "promote to task" later if needed
  - YAGNI: Don't complicate until we need it

  Does keeping TaskList items as markdown text (not task entities) work for your planner vision?

> I like teh cut of your jib - lets go with A - keeping the Promote concept in our back pocker for
when we need it. I also like this, beacuse we can acutally use this promote concept as a feature -
so lets say we ahve a coding project template later - and it contains sets of taskslists for phases
of development - for examle phase 1- brainstorm and plan. 1 define problem you are solving 2.
research current solutions 3. define difffernetiators with proposed solution 4. state key features
adn phase 2 is artifact genearation 1. define user stories 2. defines feature set that flows forem
stories 3. create mvp feature set 4. create plan doc 5 create tasks.md. Now when we creat ea new
software proejct in idealisted - we select coidng template - then fill out the basic details. it
genreates a set of task lists in the rpoehjct. we can use the promote as a sort of "whats next" Ya
dig. I really like it. in fact, please cpature this concept in a roadmap document if we ahve one. I
dont want to forget this idea.  anyway - yes letes go with A lol

● I love this vision! The "coding project template with phase-based TaskLists → promote items as you
   work" is brilliant. Let me capture this:

● Bash(ls docs/ 2>/dev/null | grep -i roadmap)
  ⎿  No matches found

● Write(docs/ROADMAP.md)
  ⎿  Wrote 44 lines to docs/ROADMAP.md
     # IdeaListed Roadmap
     ## Future Features
     ### Promote TaskList Items to Tasks (Phase: Future)
     **Concept**: Convert TaskList items into full Task entities on-demand
     **Use Case**: Project templates with phase-based workflows
     - Example: Coding project template with multiple phases
     … +34 lines (ctrl+o to expand)

● ✅ Captured! That concept is gold - I totally dig it. The "what's next" framing is perfect.

  Project Types

  You mentioned project types: Personal, Coding, Smart Home, Work, Apartment

  Quick clarification on how these should work:

  A) Fixed dropdown (those 5 only)
  - Hardcoded options
  - Simple, fast to implement
  - User can't add custom types

  B) User-definable project types
  - User can add their own in settings
  - More flexible
  - Adds complexity

  C) Use tags instead of dedicated "type" field
  - Project types are just tags (coding, personal, etc.)
  - Leverages existing tag system
  - Can have multiple "types" per project

  My recommendation: Option A for now (fixed dropdown)
  - Those 5 cover your use cases
  - Simple to implement
  - Can always make it configurable later (YAGNI)

  Sound good to start with those 5 hardcoded project types?

> agreed - fixed drop down when entering project details

● Perfect! Fixed dropdown for project types.

  Project Widgets & Metadata

  You mentioned a few specific widgets for projects:
  - "X of X tasks complete" - Shows task completion progress
  - Staleness indicator - Based on creation date
  - Other "stuff like that"

  Let me propose a few more project widgets that might be useful:

  A) Minimal set (just what you mentioned)
  - Task completion (X of X complete)
  - Staleness indicator (days since created)
  - That's it - keep it simple

  B) Medium set (add a few practical ones)
  - Task completion (X of X complete)
  - Staleness indicator (days since created)
  - Recent activity (last task updated date)
  - Priority indicator (high/medium/low)

  C) Rich dashboard approach
  - Task completion with progress bar
  - Staleness + last activity timestamps
  - Priority indicator
  - Task breakdown by status (not started, in progress, done)
  - Associated notes count
  - Timeline view

  My recommendation: Option B (Medium set)
  - Gives useful context without overwhelming
  - "Recent activity" is super useful for staleness context
  - Priority helps with project triage
  - Still clean and focused

  Does the medium set (completion, staleness, recent activity, priority) feel about right for
  project widgets?

> agree with B iwth one specific concept added - a section that "battles procrastination" ins ome
way. I tend to get projects to teh 20 yard line then they stall - so perhaps some way of indicating
that that is in danger of happeneing or has happened. use ryour judgemtn ont hat idea i trust you

● I love this! Fighting procrastination at the 20-yard line is such a real problem. Let me propose
  some options:

  A) Momentum indicator
  - Tracks task completion velocity (tasks done per week)
  - Shows "Momentum: Strong 📈" / "Momentum: Slowing ⚠️ " / "Momentum: Stalled 📉"
  - Goes yellow when no tasks completed in 7 days, red after 14 days
  - Pro: Forward-looking, actionable
  - Con: Requires time-series data

  B) "Danger Zone" alert
  - Triggers when: 70%+ tasks complete BUT no activity in 7+ days
  - Shows: "⚠️  Almost there! Don't let this stall now."
  - Pro: Catches the exact 20-yard-line scenario
  - Con: Binary (either shows or doesn't)

  C) Project health score
  - Combines: completion %, recent activity, staleness
  - Shows color-coded health: Green (active) / Yellow (at risk) / Red (stalled)
  - Formula: High completion + low activity = Yellow/Red
  - Pro: Holistic view, catches multiple stall patterns
  - Con: More complex to calculate

  My recommendation: Option B (Danger Zone alert)
  - Laser-focused on YOUR specific problem (20-yard line stalls)
  - Clear, actionable message
  - Simple logic: if (completion >= 70% && daysSinceActivity >= 7) → show alert
  - Motivating without being naggy

  Should we add a "⚠️  Almost there! Don't let this stall now" alert for high-completion +
  low-activity projects?

> i like it

● Excellent! Danger Zone alert it is - that'll be a great procrastination-fighting feature.

  Project-Task-Note Relationships

  You mentioned projects should show associated tasks and notes with "pop up modal to view the task
  or note."

  Let me clarify the interaction flow:

  A) Inline list with modal preview
  - Project shows lists: "Tasks (5)" and "Notes (3)"
  - Click task/note → modal pops up showing full detail
  - Modal has "Edit" button → opens full editor
  - Pro: Quick preview without leaving project view
  - Con: Two-click to edit (modal, then edit button)

  B) Direct links to entities
  - Project shows clickable task/note names
  - Click → navigates to Files tab with that entity selected
  - Opens appropriate editor directly
  - Pro: Fewer clicks to edit, cleaner flow
  - Con: Leaves project view

  C) Hybrid: Inline editable cards
  - Tasks/notes show as expandable cards in project
  - Click to expand → shows full detail inline
  - Edit button opens full editor in modal
  - Pro: Everything accessible without navigation
  - Con: Project view gets long with many items

  My recommendation: Option A (List with modal preview)
  - Matches your "pop up modal" description
  - Keeps project view clean
  - Quick preview for context
  - Can still edit if needed

  Does showing task/note lists with click-to-preview modals sound right for the project view?
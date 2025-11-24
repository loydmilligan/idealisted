# Sprint 3 Parallelization Strategy

This document defines how to execute Sprint 3 tasks in parallel using subagents, with code review, testing, and commit cycles.

## Dependency Analysis

### Phase 1: Planner Persistence
```
P1-T1 (DB schema) ─────┐
                       ├─► P1-T2 (API) ─► P1-T3 (localStorage) ─► P1-T4 (Screen) ─► P1-T5 (Wire)
```

### Phase 2: Drag/Drop & Week View
```
P1-T4 ─► P2-T1 (dnd-kit) ─┬─► P2-T2 (Draggable) ─► P2-T3 (Reorder)
                          └─► P2-T4 (Mini calendar) [parallel with P2-T2/T3]
```

### Phase 3: Draft/Final Flow
```
P1-T2 ─► P3-T1 (Status) ─┬─► P3-T2 (Morning modal)
                         └─► P3-T3 (Evening flow) ─► P3-T4 (Auto-forward)

P3-T5 (Settings) ─── [independent, can start early]
```

### Phase 4: Global Tasks Drawer
```
P1-T4 ─► P4-T1 (Drawer) ─┬─► P4-T2 (Indicators) ─┐
                         └─► P4-T3 (Search)      ├─► P4-T4 (Wire)
                                                 │
P1-T5 ──────────────────────────────────────────┘
```

### Phase 5: AI Append Flows (Independent Track)
```
P5-T1 (Endpoint) ─┬─► P5-T2 (Preview UI) ─► P5-T3 (Persist)
                  └─► P5-T4 (Projects) [parallel after P5-T1]
```

### Phase 6: Recap & Notifications (Independent Track)
```
P6-T1 (Settings) ─┬─► P6-T3 (AI recap) ─► P6-T4 (Display)
P6-T2 (Quotes)   ─┘

P6-T5 (Reminder) ─► P6-T6 (Ntfy docs) [independent subtrack]
```

### Phase 7: Polish & QA
```
P6-T4 ─► P7-T1 (Wire recap)
P7-T2 (Unsorted) ─── [independent]
P7-T3 (Mobile) ───── [independent]
P2-T4 + P4-T4 ─► P7-T4 (Responsive audit)
ALL ─► P7-T5 (Regression) ─► P7-T6 (Docs)
```

---

## Execution Batches (Max 4 Parallel Agents)

### Batch 1: Foundation Layer
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P1-T1 | DB schema for plan_assignments | None |
| A2 | P5-T1 | AI append to lists endpoint | None |
| A3 | P6-T1 | Recap mode settings | None |
| A4 | P6-T2 | Quote fallback database | None |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: verify DB migration, API endpoint responds, settings save
4. Commit: "feat(sprint3): batch 1 - foundation layer"

---

### Batch 2: Core APIs & Independent Features
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P1-T2 | Plan assignments API endpoints | P1-T1 |
| A2 | P6-T5 | Daily reminder notification | None |
| A3 | P3-T5 | Settings for morning/evening windows | None |
| A4 | P5-T4 | AI add to projects | P5-T1 pattern |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: CRUD on assignments API, reminder CRON, settings UI
4. Commit: "feat(sprint3): batch 2 - core APIs"

---

### Batch 3: Storage Layer & AI Features
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P1-T3 | LocalStorage sync layer | P1-T2 |
| A2 | P6-T3 | AI recap generation endpoint | P6-T1, P6-T2 |
| A3 | P5-T2 | AI append preview UI | P5-T1 |
| A4 | P7-T2 | Unsorted auto-expand behavior | None |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: localStorage persistence, recap API, append UI flow
4. Commit: "feat(sprint3): batch 3 - storage and AI preview"

---

### Batch 4: UI Components
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P1-T4 | PlannerScreen component | P1-T2, P1-T3 |
| A2 | P6-T4 | Recap display in Capture tab | P6-T3 |
| A3 | P5-T3 | Persist appended items | P5-T2 |
| A4 | P7-T3 | Mobile spacing and tap targets | None |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: Planner tab renders, recap card shows, list append works, mobile viewport
4. Commit: "feat(sprint3): batch 4 - UI components"

---

### Batch 5: Wiring & Integration
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P1-T5 | Wire assignToDay to persistence | P1-T4 |
| A2 | P3-T1 | Plan status tracking | P1-T2 |
| A3 | P4-T1 | Create PlannerDrawer component | P1-T4 |
| A4 | P6-T6 | Ntfy docs and planner milestones | P6-T5 |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: assignments persist refresh, plan status updates, drawer opens
4. Commit: "feat(sprint3): batch 5 - wiring and integration"

---

### Batch 6: Drag/Drop & Modals
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P2-T1 | Add dnd-kit and week grid | P1-T4 |
| A2 | P3-T2 | Integrate MorningFinalizeModal | P1-T4, P3-T1 |
| A3 | P4-T2 | Visual indicators for planned items | P4-T1 |
| A4 | P4-T3 | Search and sorting in drawer | P4-T1 |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: week grid renders, morning modal triggers, drawer indicators/search work
4. Commit: "feat(sprint3): batch 6 - drag-drop and modals"

---

### Batch 7: Advanced Features
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P2-T2 | Implement draggable items and drop zones | P2-T1 |
| A2 | P2-T4 | Mini calendar with task counts | P2-T1 |
| A3 | P3-T3 | Integrate EveningReviewFlow | P1-T4, P3-T1 |
| A4 | P4-T4 | Wire drawer to planner | P4-T2, P4-T3, P1-T5 |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: drag between days, calendar navigation, evening flow, drawer add items
4. Commit: "feat(sprint3): batch 7 - advanced features"

---

### Batch 8: Completion Features
**Parallel agents: 4**

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P2-T3 | Reorder within same day | P2-T2 |
| A2 | P3-T4 | Auto-forward incomplete tasks | P3-T3 |
| A3 | P7-T1 | Wire AI recap to actual service | P6-T4 |
| A4 | P7-T4 | Planner responsive audit | P2-T4, P4-T4 |

**Post-batch workflow:**
1. Code review each implementation
2. Fix any issues found
3. Playwright test: same-day reorder, task forwarding, live recap, responsive breakpoints
4. Commit: "feat(sprint3): batch 8 - completion features"

---

### Batch 9: Final QA & Documentation
**Parallel agents: 2** (sequential dependency)

| Agent | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| A1 | P7-T5 | Regression testing | ALL |
| A2 | P7-T6 | Documentation updates | P7-T5 |

**Post-batch workflow:**
1. Full regression pass with Playwright
2. Fix any regressions found
3. Final code review on docs
4. Commit: "docs(sprint3): final QA and documentation"

---

## Subagent Calling Pattern

### For Each Batch:

```
┌─────────────────────────────────────────────────────────────────┐
│                         BATCH N                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │ Agent 4  │       │
│   │ Task X   │  │ Task Y   │  │ Task Z   │  │ Task W   │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│        │             │             │             │              │
│        └──────────┬──┴─────────────┴──┬──────────┘              │
│                   ▼                   ▼                          │
│   ┌───────────────────────────────────────────────────┐         │
│   │            WAIT FOR ALL TO COMPLETE               │         │
│   └───────────────────────────────────────────────────┘         │
│                           │                                      │
│                           ▼                                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Review 1 │  │ Review 2 │  │ Review 3 │  │ Review 4 │       │
│   │ (code)   │  │ (code)   │  │ (code)   │  │ (code)   │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│        │             │             │             │              │
│        ▼             ▼             ▼             ▼              │
│   ┌─────────────────────────────────────────────────┐           │
│   │  IF issues found: Call implementer to fix       │           │
│   │  REPEAT until code review passes                │           │
│   └─────────────────────────────────────────────────┘           │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Playwright MCP: Manual testing of batch        │           │
│   └─────────────────────────────────────────────────┘           │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Doc review agent (if needed)                   │           │
│   └─────────────────────────────────────────────────┘           │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────────────────────────────────────────┐           │
│   │  Git commit for batch                           │           │
│   └─────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Agent Prompt Template:

```markdown
## Task: [TASK_ID] — [TASK_NAME]

**Context file:** docs/.implementation/sprint3/phase#/phase#-task#-context.md
**Prompt file:** docs/.implementation/sprint3/phase#/phase#-task#-prompt.md

Read the context and prompt files above, then implement the task following these guidelines:

1. Read all referenced files first
2. Implement according to the prompt's step-by-step instructions
3. Follow existing code patterns in the codebase
4. Write clean, typed TypeScript code
5. Add comments only where logic isn't self-evident
6. Do NOT over-engineer or add unrequested features

Report back with:
- Files created/modified (with line counts)
- Any blockers or decisions made
- Suggested test scenarios
```

### Code Review Agent Prompt Template:

```markdown
## Code Review: [TASK_ID] — [TASK_NAME]

Review the implementation for:

**Files to review:**
[List of files modified by implementation agent]

**Checklist:**
1. [ ] Follows TypeScript best practices (proper typing, no `any`)
2. [ ] Matches existing codebase patterns
3. [ ] No security vulnerabilities (SQL injection, XSS, etc.)
4. [ ] Error handling is appropriate
5. [ ] No over-engineering or scope creep
6. [ ] Code is DRY and follows YAGNI
7. [ ] API responses match expected types
8. [ ] UI components are accessible

**Report format:**
- PASS: No issues found
- ISSUES: List specific problems with file:line references
- SUGGESTIONS: Optional improvements (non-blocking)
```

### Doc Review Agent Prompt Template:

```markdown
## Documentation Review: [TASK_ID]

Check that:
1. New files have appropriate header comments
2. Complex functions have JSDoc
3. API changes reflected in types/index.ts
4. README/CHANGELOG updated if user-facing change
5. CLAUDE.md updated if new patterns introduced

Report: PASS or list specific gaps.
```

---

## Playwright MCP Testing Plan

### Per-Batch Test Scenarios:

**Batch 1 Tests:**
- Navigate to app, verify no console errors
- Check settings page loads
- Verify `/api/ai/append-list` returns 403 when AI disabled

**Batch 2 Tests:**
- POST to `/api/plan-assignments` with valid data
- GET assignments for a date
- Check settings > Planner Schedule section exists

**Batch 3 Tests:**
- Assign item via API, refresh page, verify still assigned
- Call `/api/ai/recap` and verify response structure
- Open list, click "Append with AI" button appears (if AI enabled)

**Batch 4 Tests:**
- Click Planner tab, verify screen renders
- Check Capture tab shows recap card (when enabled)
- Verify mobile viewport (375px) has no layout breaks

**Batch 5 Tests:**
- Add item to planner via UI, refresh, verify persists
- Create plan, check status is 'draft'
- Click "Add to Plan" button, verify drawer opens

**Batch 6 Tests:**
- Toggle to week view, verify 7 columns
- Visit planner during morning window with draft plan, check modal
- Search in drawer, verify filtering works

**Batch 7 Tests:**
- Drag item from one day to another
- Click mini calendar date, verify view changes
- Complete evening review flow end-to-end

**Batch 8 Tests:**
- Reorder items within same day via drag
- Complete evening review, verify tasks forwarded
- Check recap displays real AI content

**Batch 9 Tests:**
- Full regression: capture → sort → convert → planner → review
- Build succeeds: `npm run build`
- Lint passes: `npm run lint`

---

## Success Declaration Template

After each batch completes successfully:

```markdown
## Batch N Complete ✓

**Tasks completed:**
- [TASK_ID]: [Brief description]
- [TASK_ID]: [Brief description]
- ...

**Code review issues found and fixed:**
- [Issue 1]: [Fix applied]
- [Issue 2]: [Fix applied]
- (or "None")

**Playwright test results:**
- [Test 1]: ✓ Pass
- [Test 2]: ✓ Pass
- [Test 3]: ✗ Fail → Fixed by [action]
- ...

**Commit:** `[commit hash]` - "[commit message]"

**Next batch:** Batch N+1 with tasks [list]
```

---

## Estimated Batch Execution

| Batch | Tasks | Est. Complexity | Notes |
|-------|-------|-----------------|-------|
| 1 | 4 | Low | Foundation, no deps |
| 2 | 4 | Medium | APIs, some integration |
| 3 | 4 | Medium | Storage + AI |
| 4 | 4 | High | UI components |
| 5 | 4 | Medium | Wiring |
| 6 | 4 | High | Drag-drop, modals |
| 7 | 4 | High | Advanced features |
| 8 | 4 | Medium | Polish |
| 9 | 2 | Low | QA + docs |

**Total: 34 tasks in 9 batches**

---

## Error Recovery

If a task fails repeatedly:

1. **Isolate**: Skip task, continue batch with remaining tasks
2. **Document**: Log failure reason in status.md
3. **Defer**: Move to next batch or create follow-up task
4. **Review**: Check if dependencies are actually met
5. **Escalate**: If blocker affects multiple tasks, pause and investigate

---

## Quick Reference: Task → Batch Mapping

| Task | Batch | Track |
|------|-------|-------|
| P1-T1 | 1 | Core |
| P1-T2 | 2 | Core |
| P1-T3 | 3 | Core |
| P1-T4 | 4 | Core |
| P1-T5 | 5 | Core |
| P2-T1 | 6 | Drag |
| P2-T2 | 7 | Drag |
| P2-T3 | 8 | Drag |
| P2-T4 | 7 | Drag |
| P3-T1 | 5 | Flow |
| P3-T2 | 6 | Flow |
| P3-T3 | 7 | Flow |
| P3-T4 | 8 | Flow |
| P3-T5 | 2 | Settings |
| P4-T1 | 5 | Drawer |
| P4-T2 | 6 | Drawer |
| P4-T3 | 6 | Drawer |
| P4-T4 | 7 | Drawer |
| P5-T1 | 1 | AI |
| P5-T2 | 3 | AI |
| P5-T3 | 4 | AI |
| P5-T4 | 2 | AI |
| P6-T1 | 1 | Recap |
| P6-T2 | 1 | Recap |
| P6-T3 | 3 | Recap |
| P6-T4 | 4 | Recap |
| P6-T5 | 2 | Notify |
| P6-T6 | 5 | Notify |
| P7-T1 | 8 | Polish |
| P7-T2 | 3 | Polish |
| P7-T3 | 4 | Polish |
| P7-T4 | 8 | Polish |
| P7-T5 | 9 | QA |
| P7-T6 | 9 | Docs |

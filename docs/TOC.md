# Documentation Table of Contents

**Last Updated:** 2025-01-14

This document provides a comprehensive overview of all active documentation in the IdeaListed repository.

## Core Project Documentation

### Essential Reading
- **[README.md](../README.md)** - Project overview, Daily Review feature documentation, setup instructions
- **[CLAUDE.md](../CLAUDE.md)** - AI agent memory and development guidance (canonical reference for Claude Code)
- **[BETA_MVP_IMPLEMENTATION_PLAN.md](../BETA_MVP_IMPLEMENTATION_PLAN.md)** - Phase-by-phase Beta MVP implementation history (Phases 1-6 complete, Jan 2025)

### Reference Documentation
- **[UNUSED_CODE.md](../UNUSED_CODE.md)** - Deprecated features and disabled code (CRON system, old entity types)
- **[TRASH-FILES.md](../TRASH-FILES.md)** - Housekeeping reference for files to remove/clean up
- **[TESTING_GUIDE.md](../TESTING_GUIDE.md)** - Testing procedures for entity restructure and core features

### Planning & Future Work
- **[PLANNING_NEEDED.md](../PLANNING_NEEDED.md)** - Forward-looking feature ideas (AI redesign, markdown notes, list sub-entities)

### Design Documentation
- **[Idealist-UI-UX-Design-Document.md](../Idealist-UI-UX-Design-Document.md)** - Comprehensive design system and UI/UX patterns
  - **Status:** May need update to reflect current implementation post-Beta MVP
  - **Priority:** Low

## AI Agent Documentation

Located in `.claude/agents/` (15 specialized agents):

### Development Agents
- **ai-engineer.md** - LLM application and RAG system specialist
- **frontend-developer.md** - Frontend development specialist for React
- **backend-architect.md** - Backend system architecture and API design
- **python-pro.md** - Idiomatic Python development
- **database-optimization.md** - Database performance and query tuning

### Documentation & Analysis
- **doc-classifier.md** - Document classification and archiving
- **documentation-updater.md** - Documentation maintenance and updates
- **service-documentation.md** - CLAUDE.md and module documentation updates

### Code Quality
- **code-review.md** - Security, bugs, performance, pattern adherence
- **uiux-researcher.md** - UX inspiration and CLI design references

### Context & Planning
- **context-gathering.md** - Task context manifest creation
- **context-refinement.md** - Context manifest updates from discoveries
- **task-decomposition-expert.md** - Complex goal breakdown
- **report-generator.md** - Research findings to comprehensive reports
- **logging.md** - Work log consolidation during context compaction

## Skills Documentation

Located in `.claude/skills/` (organized by category):

### Using Skills
- **using-skills/SKILL.md** - Introduction to using skills system

### Collaboration
- **collaboration/brainstorming/SKILL.md** - Design refinement before coding
- **collaboration/requesting-code-review/SKILL.md** - Request code reviews
- **collaboration/receiving-code-review/SKILL.md** - Respond to code review feedback
- **collaboration/writing-plans/SKILL.md** - Create detailed implementation plans
- **collaboration/executing-plans/SKILL.md** - Execute plans in batches with review
- **collaboration/dispatching-parallel-agents/SKILL.md** - Launch concurrent agents
- **collaboration/subagent-driven-development/SKILL.md** - Fresh agent per task with reviews
- **collaboration/using-git-worktrees/SKILL.md** - Isolated git worktree creation
- **collaboration/finishing-a-development-branch/SKILL.md** - Complete and integrate work
- **collaboration/remembering-conversations/SKILL.md** - Conversation memory and indexing

### Debugging
- **debugging/systematic-debugging/SKILL.md** - Four-phase debugging framework
- **debugging/root-cause-tracing/SKILL.md** - Trace errors to source
- **debugging/defense-in-depth/SKILL.md** - Multi-layer validation
- **debugging/verification-before-completion/SKILL.md** - Verify before claiming success

### Testing
- **testing/test-driven-development/SKILL.md** - TDD with RED-GREEN-REFACTOR
- **testing/testing-anti-patterns/SKILL.md** - Avoid common testing mistakes
- **testing/condition-based-waiting/SKILL.md** - Replace timeouts with condition polling

### Problem Solving
- **problem-solving/when-stuck/SKILL.md** - Getting unstuck strategies
- **problem-solving/collision-zone-thinking/SKILL.md** - Explore constraint intersections
- **problem-solving/meta-pattern-recognition/SKILL.md** - Identify cross-domain patterns
- **problem-solving/scale-game/SKILL.md** - Explore scale extremes
- **problem-solving/inversion-exercise/SKILL.md** - Invert problems to find solutions
- **problem-solving/simplification-cascades/SKILL.md** - Progressive simplification

### Architecture
- **architecture/preserving-productive-tensions/SKILL.md** - Balance competing concerns

### Research
- **research/tracing-knowledge-lineages/SKILL.md** - Track knowledge provenance

### Meta (Skills about Skills)
- **meta/writing-skills/SKILL.md** - Create new skills with TDD
- **meta/testing-skills-with-subagents/SKILL.md** - Test skills before deployment
- **meta/sharing-skills/SKILL.md** - Contribute skills upstream via PR
- **meta/pulling-updates-from-skills-repository/SKILL.md** - Update skills from upstream
- **meta/gardening-skills-wiki/SKILL.md** - Maintain skills documentation

## Command Documentation

Located in `.claude/commands/` (custom slash commands):

- **containerize-application.md** - Docker configuration with optimization
- **context-prime.md** - Load project context from README and files
- **create-jtbd.md** - Create Jobs-to-be-Done analysis
- **debug-error.md** - Debug error investigation workflow
- **housekeeping.md** - Repository cleanup and organization (this command!)
- **maintain-docs.md** - Routine documentation maintenance
- **prime.md** - Initialize Claude Code with project context
- **resume.md** - Resume previous session work
- **session-learning-capture.md** - Capture session learnings to memory
- **sessions.md** - Session management utilities
- **ultra-think.md** - Deep multi-dimensional analysis

## Archive

**Location:** `docs/.archive/`

All archived documentation is preserved in git history and organized by category:

- **2024-q4/** - Q4 2024 implementation logs (10 files)
- **2025-q1/** - Q1 2025 implementation logs and plans (17 files)
- **old-specs/** - Superseded UI briefs and guides (4 files)
- **research-runs/** - Unimplemented AI research (research-001/)
- **prototypes/** - ui_inspiration prototype directory (101 files)

See [ARCHIVE_LOG.md](./.archive/ARCHIVE_LOG.md) for complete archive manifest and recovery instructions.

---

## Documentation Categories

### By Audience

**For Developers:**
- README.md - Quick start and Daily Review
- CLAUDE.md - Development patterns and architecture
- BETA_MVP_IMPLEMENTATION_PLAN.md - Implementation history
- TESTING_GUIDE.md - Testing procedures

**For AI Agents:**
- CLAUDE.md - Primary context and memory
- .claude/agents/* - Specialized agent definitions
- .claude/skills/* - Process documentation and workflows

**For Contributors:**
- README.md - Project overview
- Idealist-UI-UX-Design-Document.md - Design system
- PLANNING_NEEDED.md - Future work ideas

**For Maintenance:**
- UNUSED_CODE.md - What's disabled and why
- TRASH-FILES.md - Cleanup targets
- docs/.archive/ARCHIVE_LOG.md - Archive history

### By Purpose

**Active Development:**
- CLAUDE.md
- BETA_MVP_IMPLEMENTATION_PLAN.md
- PLANNING_NEEDED.md

**Reference:**
- UNUSED_CODE.md
- TRASH-FILES.md
- Idealist-UI-UX-Design-Document.md

**Testing:**
- TESTING_GUIDE.md

**User-Facing:**
- README.md (Daily Review documentation)

---

## Updating This TOC

When adding new documentation:
1. Add entry to appropriate section
2. Include brief description
3. Update "Last Updated" date
4. Link to actual file location

When archiving documentation:
1. Remove from active sections
2. Add to archive reference
3. Update ARCHIVE_LOG.md

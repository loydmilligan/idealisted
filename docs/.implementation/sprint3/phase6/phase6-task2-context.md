# Context: P6-T2 — Quote fallback database

Purpose: Create a curated database of productivity/motivation quotes for fallback when insufficient daily activity for AI summary generation.

Key decisions
- From plan: 15-20 curated quotes across categories (motivation, reflection, productivity).
- Quotes shown when daily activity is below threshold (P6-T1 setting).
- Deterministic selection: same quote for same day to ensure consistency.
- No external API; quotes stored in code as static array.

References
- Plan: docs/.implementation/sprint3/plan.md (Phase 6).
- Tasks: docs/.implementation/sprint3/tasks.md (P6-T2 steps).
- Will be consumed by: P6-T3 (AI recap generation) and P6-T4 (Capture tab display).

Implementation notes
- Create `lib/quotes.ts` as standalone module with no external dependencies.
- Each quote has: text, optional author, category.
- Deterministic selection uses date hash for consistency.
- Export both random and category-filtered selection functions.
- Format helper for display: "text" — author.

Testing/QA
- `getRandomQuote()` returns valid quote object.
- `getQuoteForDay(date)` returns same quote for same date across multiple calls.
- `getQuoteByCategory(category)` filters correctly.
- All quotes properly attributed with authors where applicable.

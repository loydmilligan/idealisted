# Prompt: P6-T2 — Quote fallback database

Context: docs/.implementation/sprint3/phase6/phase6-task2-context.md
Plan refs: docs/.implementation/sprint3/plan.md (Phase 6), docs/.implementation/sprint3/tasks.md (P6-T2)

Goal
- Create curated quote database with selection functions for fallback when AI recap cannot be generated.

Deliverables
- `lib/quotes.ts` with 15-20 curated quotes.
- Selection functions: random, deterministic by date, filtered by category.
- Format helper for display rendering.
- TypeScript types for Quote interface.

Implementation steps (from tasks)
1) Create `lib/quotes.ts` with Quote interface: `{ text: string, author?: string, category: 'motivation' | 'reflection' | 'productivity' }`.
2) Define `QUOTES` array with 15-20 curated productivity/motivation quotes. Include mix of categories:
   - Motivation (5-7 quotes): inspiring action, overcoming obstacles
   - Reflection (5-7 quotes): mindfulness, self-awareness, learning from experience
   - Productivity (5-6 quotes): efficiency, focus, time management
3) Implement `getRandomQuote()`: returns random quote from array.
4) Implement `getQuoteForDay(date: string)`: uses date string hash to select deterministic quote. Formula: convert date to number, mod by array length.
5) Implement `getQuoteByCategory(category: 'motivation' | 'reflection' | 'productivity')`: filters array, returns random from filtered set.
6) Implement `formatQuote(quote: Quote)`: returns formatted string `"${quote.text}" — ${quote.author || 'Unknown'}`.
7) Export all functions and types for use in recap components.

Acceptance criteria
- At least 15 quotes in database across all three categories.
- `getQuoteForDay('2024-01-15')` returns same quote on every call.
- Different dates return different quotes (high probability).
- Category filtering works correctly.
- Format function produces readable output.

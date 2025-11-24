/**
 * Quote Fallback Database
 *
 * Curated productivity/motivation quotes for display when insufficient
 * daily activity for AI summary generation.
 */

export type QuoteCategory = 'motivation' | 'reflection' | 'productivity';

export interface Quote {
  text: string;
  author?: string;
  category: QuoteCategory;
}

/**
 * Curated quotes database - 18 quotes across 3 categories
 */
export const QUOTES: Quote[] = [
  // Motivation (6 quotes) - inspiring action, overcoming obstacles
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    category: 'motivation'
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: 'motivation'
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    category: 'motivation'
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: 'motivation'
  },
  {
    text: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe",
    category: 'motivation'
  },
  {
    text: "The future depends on what you do today.",
    author: "Mahatma Gandhi",
    category: 'motivation'
  },

  // Reflection (6 quotes) - mindfulness, self-awareness, learning
  {
    text: "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
    category: 'reflection'
  },
  {
    text: "The only true wisdom is in knowing you know nothing.",
    author: "Socrates",
    category: 'reflection'
  },
  {
    text: "We do not learn from experience... we learn from reflecting on experience.",
    author: "John Dewey",
    category: 'reflection'
  },
  {
    text: "Life can only be understood backwards; but it must be lived forwards.",
    author: "Soren Kierkegaard",
    category: 'reflection'
  },
  {
    text: "In the middle of difficulty lies opportunity.",
    author: "Albert Einstein",
    category: 'reflection'
  },
  {
    text: "The mind is everything. What you think you become.",
    author: "Buddha",
    category: 'reflection'
  },

  // Productivity (6 quotes) - efficiency, focus, time management
  {
    text: "Focus on being productive instead of busy.",
    author: "Tim Ferriss",
    category: 'productivity'
  },
  {
    text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.",
    author: "Stephen King",
    category: 'productivity'
  },
  {
    text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
    author: "Stephen Covey",
    category: 'productivity'
  },
  {
    text: "Action is the foundational key to all success.",
    author: "Pablo Picasso",
    category: 'productivity'
  },
  {
    text: "You don't have to see the whole staircase, just take the first step.",
    author: "Martin Luther King Jr.",
    category: 'productivity'
  },
  {
    text: "Done is better than perfect.",
    author: "Sheryl Sandberg",
    category: 'productivity'
  }
];

/**
 * Returns a random quote from the database
 */
export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * QUOTES.length);
  return QUOTES[index];
}

/**
 * Returns a deterministic quote based on date string.
 * Same date always returns the same quote.
 *
 * @param date - Date string in any format (e.g., '2024-01-15')
 * @returns Quote for that day
 */
export function getQuoteForDay(date: string): Quote {
  // Simple hash: sum of character codes
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash += date.charCodeAt(i);
  }
  // Use modulo to select index
  const index = hash % QUOTES.length;
  return QUOTES[index];
}

/**
 * Returns a random quote from the specified category
 *
 * @param category - Category to filter by
 * @returns Random quote from that category, or null if category is empty
 */
export function getQuoteByCategory(category: QuoteCategory): Quote | null {
  const filtered = QUOTES.filter(q => q.category === category);
  if (filtered.length === 0) return null;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
}

/**
 * Formats a quote for display
 *
 * @param quote - Quote object to format
 * @returns Formatted string: "text" - author
 */
export function formatQuote(quote: Quote): string {
  const author = quote.author || 'Unknown';
  return `"${quote.text}" — ${author}`;
}

/**
 * Returns count of quotes per category
 */
export function getQuoteCounts(): Record<QuoteCategory, number> {
  return {
    motivation: QUOTES.filter(q => q.category === 'motivation').length,
    reflection: QUOTES.filter(q => q.category === 'reflection').length,
    productivity: QUOTES.filter(q => q.category === 'productivity').length
  };
}

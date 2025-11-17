'use client'

import { MarkdownViewer } from '@/components/ui/MarkdownViewer'

const sampleMarkdown = `# Task: Implement MarkdownViewer

**Status**: Completed
**Priority**: High
**Due Date**: 2025-11-17

## Description
Build a beautiful markdown viewer component with retro styling.

## Notes
- Use react-markdown library ✓
- Add custom renderers for timestamps ✓
- Follow existing retro design patterns ✓

## Checklist
- [x] Install dependencies
- [x] Create component file
- [x] Implement custom renderers
- [x] Add retro styling
- [x] Test with sample data

## Code Example

\`\`\`typescript
const viewer = <MarkdownViewer content={markdown} />
\`\`\`

Inline code: \`npm install react-markdown\`

## YouTube Learning: React Hooks

- [00:45] Introduction to hooks
- [05:30] useState hook basics
- [12:15] useEffect for side effects
- [25:00] Custom hooks pattern

## Blockquote

> "The best way to predict the future is to invent it."
> — Alan Kay

## Table Example

| Feature | Status |
|---------|--------|
| Headers | ✅ |
| Lists | ✅ |
| Code | ✅ |
| Tables | ✅ |

---

## Links

Visit [React Docs](https://react.dev) for more info.

~~Deprecated feature~~
`

export default function TestMarkdownViewer() {
  const handleTimestampClick = (time: string) => {
    console.log('Timestamp clicked:', time)
    alert(`Timestamp clicked: ${time}`)
  }

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      background: 'var(--palm-bg-primary)'
    }}>
      <h1 style={{
        fontFamily: 'var(--font-mono)',
        marginBottom: '20px',
        color: 'var(--palm-text-primary)'
      }}>
        MarkdownViewer Test
      </h1>

      <div style={{
        marginBottom: '40px',
        padding: '20px',
        background: 'var(--palm-screen-light)',
        border: '2px solid var(--palm-border)'
      }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
          Normal Mode
        </h2>
        <MarkdownViewer
          content={sampleMarkdown}
          onTimestampClick={handleTimestampClick}
        />
      </div>

      <div style={{
        padding: '20px',
        background: 'var(--palm-screen-light)',
        border: '2px solid var(--palm-border)'
      }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
          Compact Mode
        </h2>
        <MarkdownViewer
          content={sampleMarkdown}
          onTimestampClick={handleTimestampClick}
          compact={true}
        />
      </div>
    </div>
  )
}

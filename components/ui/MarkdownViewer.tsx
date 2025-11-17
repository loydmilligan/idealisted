/**
 * MarkdownViewer Component
 *
 * Beautiful read-only markdown rendering for viewing Tasks and Notes
 * with retro styling and custom timestamp link support.
 *
 * Features:
 * - GitHub Flavored Markdown support (tables, task lists, strikethrough)
 * - Clickable YouTube timestamps [HH:MM] or [MM:SS]
 * - Retro theme integration with CSS variables
 * - Compact mode for list views
 * - Custom renderers for code blocks and task lists
 */

'use client'

import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface MarkdownViewerProps {
  content: string
  className?: string
  onTimestampClick?: (time: string) => void
  compact?: boolean
}

export function MarkdownViewer({
  content,
  className = '',
  onTimestampClick,
  compact = false
}: MarkdownViewerProps) {
  // Custom component renderers (memoized for performance)
  const components: Partial<Components> = useMemo(() => ({
    // Paragraph renderer with timestamp link detection
    p: ({ children }: any) => {
      if (!onTimestampClick) {
        return <p>{children}</p>
      }

      // Convert children to string to search for timestamps
      const childrenArray = React.Children.toArray(children)
      const processedChildren = childrenArray.map((child, index) => {
        if (typeof child !== 'string') {
          return child
        }

        // Regex to match [HH:MM] or [MM:SS] patterns with valid time ranges
        const timestampRegex = /\[([0-5]?\d):([0-5]\d)\]/g
        const parts: (string | JSX.Element)[] = []
        let lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = timestampRegex.exec(child)) !== null) {
          // Add text before the timestamp
          if (match.index > lastIndex) {
            parts.push(child.slice(lastIndex, match.index))
          }

          // Add clickable timestamp
          const timestamp = match[0]
          parts.push(
            <span
              key={`timestamp-${index}-${match.index}`}
              className="timestamp-link"
              onClick={() => onTimestampClick(timestamp)}
            >
              {timestamp}
            </span>
          )

          lastIndex = match.index + match[0].length
        }

        // Add remaining text after last timestamp
        if (lastIndex < child.length) {
          parts.push(child.slice(lastIndex))
        }

        return parts.length > 0 ? parts : child
      })

      return <p>{processedChildren}</p>
    },

    // Code block renderer
    code: ({ inline, children }: any) => {
      if (inline) {
        return <code className="inline-code">{children}</code>
      }

      return (
        <pre className="code-block">
          <code>{children}</code>
        </pre>
      )
    },

    // Task list checkbox renderer (read-only)
    input: ({ checked, disabled, type }: any) => {
      if (type !== 'checkbox') {
        return <input type={type} checked={checked} disabled={disabled} />
      }

      return (
        <input
          type="checkbox"
          checked={checked}
          disabled={true}
          className="retro-checkbox"
        />
      )
    }
  }), [onTimestampClick])

  return (
    <div className={`markdown-viewer ${compact ? 'compact' : ''} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

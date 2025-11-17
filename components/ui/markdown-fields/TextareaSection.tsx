/**
 * TextareaSection Component
 *
 * Multi-line textarea field for markdown entity sections.
 * Used for task description, note content, task notes, etc.
 */

'use client'

import React from 'react'

interface TextareaSectionProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  readonly?: boolean
  rows?: number
  placeholder?: string
}

export function TextareaSection({
  label,
  value,
  onChange,
  required = false,
  readonly = false,
  rows = 6,
  placeholder = ''
}: TextareaSectionProps) {
  return (
    <div className="retro-form-group" style={{ marginTop: 'var(--space-lg)' }}>
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
      </label>
      <textarea
        className="retro-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={readonly}
        style={readonly ? {
          opacity: 0.6,
          cursor: 'not-allowed',
          background: 'var(--palm-screen-light)'
        } : undefined}
      />
    </div>
  )
}

/**
 * TextField Component
 *
 * Simple text input field with retro styling for markdown entity forms.
 * Used for single-line text fields like task priority, note duration, etc.
 */

'use client'

import React from 'react'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  readonly?: boolean
  placeholder?: string
}

export function TextField({
  label,
  value,
  onChange,
  required = false,
  readonly = false,
  placeholder = ''
}: TextFieldProps) {
  return (
    <div className="retro-form-group">
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
      </label>
      <input
        type="text"
        className="retro-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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

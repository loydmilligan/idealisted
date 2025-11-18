/**
 * DateTimeField Component
 *
 * DateTime picker input field with retro styling for markdown entity forms.
 * Used for task reminders, event times, etc.
 */

'use client'

import React from 'react'

interface DateTimeFieldProps {
  label: string
  value: string // ISO datetime string (YYYY-MM-DDTHH:MM) or empty
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

export function DateTimeField({
  label,
  value,
  onChange,
  required = false,
  placeholder = 'YYYY-MM-DDTHH:MM'
}: DateTimeFieldProps) {
  return (
    <div className="retro-form-group">
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
      </label>
      <input
        type="datetime-local"
        className="retro-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

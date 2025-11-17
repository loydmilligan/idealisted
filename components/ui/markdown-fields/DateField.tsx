/**
 * DateField Component
 *
 * Date picker input field with retro styling for markdown entity forms.
 * Used for task due dates, event dates, etc.
 */

'use client'

import React from 'react'

interface DateFieldProps {
  label: string
  value: string // ISO date string (YYYY-MM-DD) or empty
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}

export function DateField({
  label,
  value,
  onChange,
  required = false,
  placeholder = 'YYYY-MM-DD'
}: DateFieldProps) {
  return (
    <div className="retro-form-group">
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
      </label>
      <input
        type="date"
        className="retro-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

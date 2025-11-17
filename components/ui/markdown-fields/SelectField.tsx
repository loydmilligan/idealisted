/**
 * SelectField Component
 *
 * Dropdown select field with retro styling for markdown entity forms.
 * Used for task status, priority, YouTube note status, etc.
 */

'use client'

import React from 'react'

interface SelectFieldProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  required = false
}: SelectFieldProps) {
  return (
    <div className="retro-form-group">
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
      </label>
      <select
        className="retro-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * URLField Component
 *
 * URL input field with validation for markdown entity forms.
 * Supports YouTube-specific validation for YouTube learning notes.
 */

'use client'

import React, { useState, useEffect } from 'react'

interface URLFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  validation?: 'youtube' | 'generic'
  placeholder?: string
}

export function URLField({
  label,
  value,
  onChange,
  required = false,
  validation = 'generic',
  placeholder = 'https://...'
}: URLFieldProps) {
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!value) {
      setError('')
      return
    }

    if (validation === 'youtube') {
      // YouTube URL validation
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/
      if (!youtubeRegex.test(value)) {
        setError('Must be a valid YouTube URL')
      } else {
        setError('')
      }
    } else {
      // Generic URL validation
      try {
        new URL(value)
        setError('')
      } catch {
        setError('Must be a valid URL')
      }
    }
  }, [value, validation])

  return (
    <div className="retro-form-group">
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
        {validation === 'youtube' && ' 🎥'}
      </label>
      <input
        type="url"
        className="retro-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={error ? {
          borderColor: 'var(--swipe-delete)',
          borderWidth: '2px'
        } : undefined}
      />
      {error && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--swipe-delete)',
          marginTop: 'var(--space-xs)'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

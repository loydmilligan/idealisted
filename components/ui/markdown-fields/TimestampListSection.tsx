/**
 * TimestampListSection Component
 *
 * Dynamic timestamp list for markdown entity sections.
 * Allows adding/removing timestamp + text pairs for YouTube notes.
 * Used for YouTube learning note timestamps section.
 */

'use client'

import React from 'react'
import { X, Plus } from 'lucide-react'

export interface TimestampItem {
  timestamp: string // [HH:MM] or [MM:SS]
  text: string
}

interface TimestampListSectionProps {
  label: string
  items: TimestampItem[]
  onChange: (items: TimestampItem[]) => void
  required?: boolean
  placeholder?: string
}

export function TimestampListSection({
  label,
  items,
  onChange,
  required = false,
  placeholder = 'Enter note...'
}: TimestampListSectionProps) {
  const handleItemChange = (index: number, field: 'timestamp' | 'text', value: string) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      [field]: value
    }
    onChange(newItems)
  }

  const handleAddItem = () => {
    onChange([...items, { timestamp: '', text: '' }])
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
  }

  // Validate timestamp format [HH:MM] or [MM:SS]
  const isValidTimestamp = (timestamp: string): boolean => {
    if (!timestamp) return true // Empty is okay (user still typing)
    return /^([0-5]?\d):([0-5]\d)$/.test(timestamp)
  }

  return (
    <div className="retro-form-group" style={{ marginTop: 'var(--space-lg)' }}>
      <label className="retro-form-label">
        {label}
        {required && <span style={{ color: 'var(--palm-text-secondary)' }}> *</span>}
      </label>

      <div style={{
        border: '2px inset var(--palm-border-light)',
        background: 'var(--palm-bg-secondary)',
        padding: 'var(--space-sm)'
      }}>
        {items.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--palm-text-secondary)',
            padding: 'var(--space-sm)',
            textAlign: 'center'
          }}>
            No timestamps yet. Click "Add Item" to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {items.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)'
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  color: 'var(--palm-text-primary)'
                }}>
                  [
                </span>
                <input
                  type="text"
                  className="retro-input"
                  value={item.timestamp}
                  onChange={(e) => handleItemChange(index, 'timestamp', e.target.value)}
                  placeholder="MM:SS"
                  style={{
                    width: '80px',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                    borderColor: !isValidTimestamp(item.timestamp) ? 'var(--swipe-delete)' : undefined
                  }}
                />
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  color: 'var(--palm-text-primary)'
                }}>
                  ]
                </span>
                <input
                  type="text"
                  className="retro-input"
                  value={item.text}
                  onChange={(e) => handleItemChange(index, 'text', e.target.value)}
                  placeholder={placeholder}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="retro-btn-icon"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--palm-text-secondary)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove item"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddItem}
          className="retro-btn retro-btn-secondary"
          style={{
            marginTop: 'var(--space-sm)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-xs)'
          }}
        >
          <Plus size={14} />
          Add Timestamp
        </button>
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--palm-text-secondary)',
        marginTop: 'var(--space-xs)'
      }}>
        Format: MM:SS or HH:MM (e.g., 05:30 or 1:25:45)
      </div>
    </div>
  )
}

/**
 * BulletListSection Component
 *
 * Dynamic bullet list for markdown entity sections.
 * Allows adding/removing bullet items with individual text inputs.
 * Used for YouTube "Key Concepts" section, etc.
 */

'use client'

import React from 'react'
import { X, Plus } from 'lucide-react'

interface BulletListSectionProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  required?: boolean
  placeholder?: string
}

export function BulletListSection({
  label,
  items,
  onChange,
  required = false,
  placeholder = 'Enter item...'
}: BulletListSectionProps) {
  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    onChange(newItems)
  }

  const handleAddItem = () => {
    onChange([...items, ''])
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
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
            No items yet. Click "Add Item" to get started.
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
                  color: 'var(--palm-text-primary)',
                  minWidth: '20px'
                }}>
                  •
                </span>
                <input
                  type="text"
                  className="retro-input"
                  value={item}
                  onChange={(e) => handleItemChange(index, e.target.value)}
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
          Add Item
        </button>
      </div>
    </div>
  )
}

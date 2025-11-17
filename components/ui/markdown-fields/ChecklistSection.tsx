/**
 * ChecklistSection Component
 *
 * Dynamic checklist for markdown entity sections.
 * Allows adding/removing checklist items with checkbox + text input.
 * Used for task subtasks, etc.
 */

'use client'

import React from 'react'
import { X, Plus } from 'lucide-react'

export interface ChecklistItem {
  text: string
  checked: boolean
}

interface ChecklistSectionProps {
  label: string
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  required?: boolean
  placeholder?: string
}

export function ChecklistSection({
  label,
  items,
  onChange,
  required = false,
  placeholder = 'Enter subtask...'
}: ChecklistSectionProps) {
  const handleItemChange = (index: number, field: 'text' | 'checked', value: string | boolean) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      [field]: value
    }
    onChange(newItems)
  }

  const handleAddItem = () => {
    onChange([...items, { text: '', checked: false }])
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
                <input
                  type="checkbox"
                  className="retro-checkbox"
                  checked={item.checked}
                  onChange={(e) => handleItemChange(index, 'checked', e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  className="retro-input"
                  value={item.text}
                  onChange={(e) => handleItemChange(index, 'text', e.target.value)}
                  placeholder={placeholder}
                  style={{
                    flex: 1,
                    textDecoration: item.checked ? 'line-through' : 'none',
                    opacity: item.checked ? 0.6 : 1
                  }}
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

/**
 * BulletListSection Component
 *
 * Dynamic bullet list for markdown entity sections.
 * Allows adding/removing bullet items with individual text inputs.
 * Used for YouTube "Key Concepts" section, etc.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'

interface BulletListSectionProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  required?: boolean
  placeholder?: string
  variant?: 'bullet' | 'ordered' | 'shopping'
}

export function BulletListSection({
  label,
  items,
  onChange,
  required = false,
  placeholder,
  variant = 'bullet'
}: BulletListSectionProps) {
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null)
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const resolvedPlaceholder = placeholder || (variant === 'shopping' ? 'Add item (e.g., eggs - 1 dozen)' : 'Enter item...')

  useEffect(() => {
    if (pendingFocusIndex === null) return
    const ref = inputRefs.current[pendingFocusIndex]
    if (ref) {
      ref.focus()
    }
    setPendingFocusIndex(null)
  }, [items, pendingFocusIndex])

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    onChange(newItems)
  }

  const addItemAfter = (index: number | null) => {
    const insertionIndex = index === null ? items.length : index + 1
    const newItems = [...items]
    newItems.splice(insertionIndex, 0, '')
    onChange(newItems)
    setPendingFocusIndex(insertionIndex)
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
    const nextIndex = Math.max(0, index - 1)
    if (newItems.length > 0) {
      setPendingFocusIndex(nextIndex)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItemAfter(index)
    } else if (e.key === 'Backspace' && items[index].trim() === '' && items.length > 1) {
      e.preventDefault()
      handleRemoveItem(index)
    }
  }

  const renderPrefix = (index: number) => {
    if (variant === 'ordered') {
      return `${index + 1}.`
    }
    if (variant === 'shopping') {
      return '◦'
    }
    return '•'
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
                  {renderPrefix(index)}
                </span>
                <input
                  type="text"
                  className="retro-input"
                  value={item}
                  ref={(el) => { inputRefs.current[index] = el }}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder={resolvedPlaceholder}
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
          onClick={() => addItemAfter(items.length - 1)}
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

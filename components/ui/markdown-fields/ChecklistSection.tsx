/**
 * ChecklistSection Component
 *
 * Dynamic checklist for markdown entity sections.
 * Allows adding/removing checklist items with checkbox + text input.
 * Used for task subtasks, etc.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, Plus, ArrowUp, ArrowDown } from 'lucide-react'

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
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null)
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    if (pendingFocusIndex === null) return
    const ref = inputRefs.current[pendingFocusIndex]
    if (ref) {
      ref.focus()
    }
    setPendingFocusIndex(null)
  }, [items, pendingFocusIndex])

  const handleItemChange = (index: number, field: 'text' | 'checked', value: string | boolean) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      [field]: value
    }
    onChange(newItems)
  }

  const addItemAfter = (index: number | null) => {
    const insertionIndex = index === null ? items.length : index + 1
    const newItems = [...items]
    newItems.splice(insertionIndex, 0, { text: '', checked: false })
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

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    const newItems = [...items]
    const [moved] = newItems.splice(index, 1)
    newItems.splice(targetIndex, 0, moved)
    onChange(newItems)
    setPendingFocusIndex(targetIndex)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItemAfter(index)
    } else if (e.key === 'Backspace' && items[index].text.trim() === '' && items.length > 1) {
      e.preventDefault()
      handleRemoveItem(index)
    }
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
                  ref={(el) => { inputRefs.current[index] = el }}
                  onChange={(e) => handleItemChange(index, 'text', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  placeholder={placeholder}
                  style={{
                    flex: 1,
                    textDecoration: item.checked ? 'line-through' : 'none',
                    opacity: item.checked ? 0.6 : 1
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, -1)}
                    className="retro-btn-icon"
                    disabled={index === 0}
                    title="Move up"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      color: 'var(--palm-text-secondary)',
                      padding: '4px',
                      opacity: index === 0 ? 0.4 : 1
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveItem(index, 1)}
                    className="retro-btn-icon"
                    disabled={index === items.length - 1}
                    title="Move down"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                      color: 'var(--palm-text-secondary)',
                      padding: '4px',
                      opacity: index === items.length - 1 ? 0.4 : 1
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
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

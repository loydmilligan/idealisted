/**
 * BulletListSection Component
 *
 * Dynamic bullet list for markdown entity sections.
 * Allows adding/removing bullet items with individual text inputs.
 * Used for YouTube "Key Concepts" section, etc.
 *
 * Phase 5 Task 2: AI Append feature for lists
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { X, Plus, ArrowUp, ArrowDown, Sparkles, Loader2, RefreshCw, Check, XCircle } from 'lucide-react'

// AI Append suggestion type
interface AISuggestion {
  text: string
  confidence: number
  selected: boolean
}

interface BulletListSectionProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  required?: boolean
  placeholder?: string
  variant?: 'bullet' | 'ordered' | 'shopping'
  // P5-T2: AI Append props
  listId?: string  // Required for AI suggestions (existing lists only)
  aiEnabled?: boolean
  listAppendAIEnabled?: boolean
}

export function BulletListSection({
  label,
  items,
  onChange,
  required = false,
  placeholder,
  variant = 'bullet',
  // P5-T2: AI Append props
  listId,
  aiEnabled = false,
  listAppendAIEnabled = false
}: BulletListSectionProps) {
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null)
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  // P5-T2: AI Append state
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState('')

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

  // P5-T2: AI Append handlers
  const canUseAI = aiEnabled && listAppendAIEnabled && listId

  const fetchAISuggestions = async () => {
    if (!listId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/append-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: listId,
          hint: hint.trim() || undefined,
          count: 5
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to get suggestions')
        setSuggestions([])
        return
      }

      if (data.success && data.suggestions) {
        // Convert to our format with selected state (all selected by default)
        setSuggestions(
          data.suggestions.map((s: { text: string; confidence: number }) => ({
            text: s.text,
            confidence: s.confidence,
            selected: true
          }))
        )
        setError(null)
      } else {
        setError(data.error || 'No suggestions returned')
        setSuggestions([])
      }
    } catch (err) {
      setError('Failed to connect to AI service')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAIPanel = () => {
    setShowAIPanel(true)
    setError(null)
    setSuggestions([])
    setHint('')
    fetchAISuggestions()
  }

  const handleCloseAIPanel = () => {
    setShowAIPanel(false)
    setSuggestions([])
    setError(null)
    setHint('')
  }

  const handleToggleSuggestion = (index: number) => {
    setSuggestions(prev =>
      prev.map((s, i) =>
        i === index ? { ...s, selected: !s.selected } : s
      )
    )
  }

  const handleAcceptSelected = () => {
    const selectedItems = suggestions
      .filter(s => s.selected)
      .map(s => s.text)

    if (selectedItems.length > 0) {
      onChange([...items, ...selectedItems])
    }

    handleCloseAIPanel()
  }

  const handleRegenerate = () => {
    setSuggestions([])
    setError(null)
    fetchAISuggestions()
  }

  const selectedCount = suggestions.filter(s => s.selected).length

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
            No items yet. Click &quot;Add Item&quot; to get started.
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

        {/* Action buttons row */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)'
        }}>
          <button
            type="button"
            onClick={() => addItemAfter(items.length - 1)}
            className="retro-btn retro-btn-secondary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)'
            }}
          >
            <Plus size={14} />
            Add Item
          </button>

          {/* P5-T2: AI Append Button */}
          {canUseAI && (
            <button
              type="button"
              onClick={handleOpenAIPanel}
              className="retro-btn retro-btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-xs)',
                minWidth: '120px'
              }}
              title="Get AI suggestions for items to add"
            >
              <Sparkles size={14} />
              AI Suggest
            </button>
          )}
        </div>

        {/* P5-T2: AI Suggestion Preview Panel */}
        {showAIPanel && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              background: 'var(--palm-screen-light, #e8f5e9)',
              border: '2px solid var(--palm-border-dark)',
              borderRadius: '4px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-sm)'
            }}>
              <h4 style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={14} />
                AI Suggestions
              </h4>
              <button
                type="button"
                onClick={handleCloseAIPanel}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Close"
              >
                <XCircle size={16} />
              </button>
            </div>

            {/* Optional hint input */}
            <div style={{ marginBottom: 'var(--space-sm)' }}>
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Optional: guide AI (e.g., 'focus on healthy options')"
                className="retro-input"
                style={{
                  width: '100%',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Loading state */}
            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: 'var(--space-md)',
                color: 'var(--palm-text-secondary)'
              }}>
                <Loader2 size={16} className="animate-spin" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  Analyzing list...
                </span>
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div style={{
                padding: 'var(--space-sm)',
                background: 'rgba(220, 53, 69, 0.1)',
                border: '1px solid rgba(220, 53, 69, 0.3)',
                borderRadius: '4px',
                color: '#dc3545',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                marginBottom: 'var(--space-sm)'
              }}>
                {error}
              </div>
            )}

            {/* Suggestions list */}
            {!isLoading && suggestions.length > 0 && (
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                {suggestions.map((suggestion, index) => (
                  <label
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      marginBottom: '4px',
                      background: suggestion.selected
                        ? 'rgba(0, 128, 0, 0.1)'
                        : 'transparent',
                      border: '1px solid var(--palm-border-light)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={suggestion.selected}
                      onChange={() => handleToggleSuggestion(index)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px'
                    }}>
                      {suggestion.text}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      opacity: 0.6,
                      whiteSpace: 'nowrap'
                    }}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* No suggestions state */}
            {!isLoading && !error && suggestions.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-md)',
                color: 'var(--palm-text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px'
              }}>
                No suggestions available. Try adding a hint above.
              </div>
            )}

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-sm)'
            }}>
              <button
                type="button"
                onClick={handleAcceptSelected}
                disabled={selectedCount === 0 || isLoading}
                className="retro-btn retro-btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: selectedCount === 0 || isLoading ? 0.5 : 1,
                  cursor: selectedCount === 0 || isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <Check size={14} />
                Accept{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isLoading}
                className="retro-btn retro-btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={14} />
                Regenerate
              </button>
              <button
                type="button"
                onClick={handleCloseAIPanel}
                className="retro-btn retro-btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

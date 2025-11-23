/**
 * Tag Input Component
 *
 * Features:
 * - Display existing tags as chips with X button to remove
 * - Input field with autocomplete dropdown showing existing tags from database
 * - Click tag from dropdown to add it
 * - Type new tag name and press Enter to create and add
 * - Show tag colors from the tags table
 * - Keyboard shortcuts: Enter to add, Backspace to remove last tag
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { EntityType } from '@/lib/entity-colors'

interface TagInfo {
  name: string
  count: number
  color: string
  category: string
}

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  entityType?: EntityType
  className?: string
}

export const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  entityType,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('')
  const [allTags, setAllTags] = useState<TagInfo[]>([])
  const [filteredTags, setFilteredTags] = useState<TagInfo[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all tags from API
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags')
        const data = await response.json()
        if (data.success) {
          setAllTags(data.tags || [])
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error)
      }
    }
    fetchTags()
  }, [])

  // Filter tags based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredTags([])
      setShowDropdown(false)
      return
    }

    const input = inputValue.toLowerCase().trim()
    const filtered = allTags
      .filter(tag => {
        // Don't show tags that are already added
        if (value.includes(tag.name)) return false
        // Match tags that start with or contain the input
        return tag.name.toLowerCase().includes(input)
      })
      .slice(0, 5) // Limit to 5 suggestions

    setFilteredTags(filtered)
    setShowDropdown(filtered.length > 0)
    setFocusedIndex(-1)
  }, [inputValue, allTags, value])

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Add a tag
  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) return

    onChange([...value, trimmed])
    setInputValue('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
    inputRef.current?.focus()
  }

  // Get tag color from allTags or use default
  const getTagColor = (tagName: string): string => {
    const tag = allTags.find(t => t.name === tagName)
    return tag?.color || '#868e96'
  }

  // Handle keyboard navigation (and mobile enter-as-tab behavior)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < filteredTags.length) {
        addTag(filteredTags[focusedIndex].name)
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
      return
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      e.preventDefault()
      removeTag(value[value.length - 1])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev => prev < filteredTags.length - 1 ? prev + 1 : prev)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => prev > 0 ? prev - 1 : -1)
      return
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
      setFocusedIndex(-1)
      return
    }
    // Mobile keyboards often send Enter as Tab/navigation. Treat Tab like Enter to add tag.
    if (e.key === 'Tab') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < filteredTags.length) {
        addTag(filteredTags[focusedIndex].name)
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    }
  }

  return (
    <div className={`retro-tag-input-container ${className}`}>
      <label className="retro-label">TAGS</label>

      {/* Tag chips display */}
      <div className="retro-tag-chips">
        {value.map((tag) => (
          <div
            key={tag}
            className="retro-tag-chip"
            style={{
              backgroundColor: getTagColor(tag),
            }}
          >
            <span className="retro-tag-chip-text">{tag}</span>
            <button
              type="button"
              className="retro-tag-chip-remove"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          className="retro-tag-input"
          placeholder={value.length === 0 ? "Add tags..." : ""}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && filteredTags.length > 0) {
              setShowDropdown(true)
            }
          }}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && filteredTags.length > 0 && (
        <div ref={dropdownRef} className="retro-tag-dropdown">
          {filteredTags.map((tag, index) => (
            <div
              key={tag.name}
              className={`retro-tag-dropdown-item ${focusedIndex === index ? 'focused' : ''}`}
              onClick={() => addTag(tag.name)}
              onMouseEnter={() => setFocusedIndex(index)}
            >
              <div
                className="retro-tag-dropdown-color"
                style={{ backgroundColor: tag.color }}
              />
              <span className="retro-tag-dropdown-name">{tag.name}</span>
              <span className="retro-tag-dropdown-count">({tag.count})</span>
            </div>
          ))}
        </div>
      )}

      {/* Helper text */}
      <p className="retro-tag-hint">
        Press Enter to add • Backspace to remove last
      </p>
    </div>
  )
}

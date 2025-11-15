/**
 * Entity Modal Component
 *
 * Retro Palm Pilot styled bottom sheet modal for creating/editing entities:
 * - Retro overlay with green tint
 * - Entity-colored top border (3px)
 * - Square corners, no rounded edges
 * - Retro form styling with inset inputs
 * - Monospace uppercase labels
 * - Beveled primary button
 * - Respects safe areas
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EntityType } from '@/lib/entity-colors'

interface EntityModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: Exclude<EntityType, 'idea'>
  initialData?: Record<string, any>
  onSave: (data: Record<string, any>) => void | Promise<void>
  onSaveAndNavigate?: (data: Record<string, any>) => void | Promise<void>
  onAIFill?: () => void | Promise<void>
  children: React.ReactNode
  className?: string
}

export const EntityModal: React.FC<EntityModalProps> = ({
  isOpen,
  onClose,
  entityType,
  initialData = {},
  onSave,
  onSaveAndNavigate,
  onAIFill,
  children,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [tagSuggestionsEnabled, setTagSuggestionsEnabled] = useState(false)

  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  // Get entity-specific class for bottom sheet
  const getEntityClass = () => {
    switch (entityType) {
      case 'task':
        return 'retro-bottom-sheet-task'
      case 'note':
        return 'retro-bottom-sheet-note'
      case 'project':
        return 'retro-bottom-sheet-project'
      case 'list':
        return 'retro-bottom-sheet-list'
      default:
        return ''
    }
  }

  // Fetch AI config on mount to check if AI is enabled
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
      .catch(() => setAiEnabled(false))
  }, [])

  // Check if tag_suggestions feature is enabled
  useEffect(() => {
    fetch('/api/ai-features')
      .then(res => res.json())
      .then(data => {
        const feature = data.features?.find((f: any) => f.feature_name === 'tag_suggestions')
        setTagSuggestionsEnabled(feature?.enabled === 1)
      })
      .catch(() => {
        console.log('Failed to check tag_suggestions feature flag')
        setTagSuggestionsEnabled(false)
      })
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent background scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="retro-overlay"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`retro-bottom-sheet ${getEntityClass()} ${className}`}
            style={{
              maxHeight: '85vh',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="retro-sheet-handle" />
        </div>

        {/* Header */}
        <div className="retro-sheet-header">
          {entityLabel}
        </div>

        {/* Scrollable Content */}
        <div className="px-6 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {children}
        </div>

        {/* Fixed Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6"
          style={{
            paddingBottom: 'max(24px, calc(24px + env(safe-area-inset-bottom)))',
            backgroundColor: 'var(--retro-bg)',
            borderTop: '1px solid var(--retro-border)',
          }}
        >
          {/* AI Autofill Button (if provided and AI is enabled) */}
          {onAIFill && aiEnabled && (
            <button
              onClick={onAIFill}
              className="retro-btn retro-btn-secondary"
              style={{
                width: '160px',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span className="text-lg">✨</span>
              AI AUTOFILL
            </button>
          )}

          {/*
            TODO Phase 4 Task 4.3: Add Tag Suggestions Button
            When implementing tag suggestions, check tagSuggestionsEnabled state:

            {aiEnabled && tagSuggestionsEnabled && (
              <button
                onClick={handleTagSuggestions}
                className="retro-btn retro-btn-secondary"
              >
                🏷️ SUGGEST TAGS
              </button>
            )}
          */}

          {/* Convert/Save Button */}
          <div className="flex gap-3">
            <button
              onClick={() => onSave(initialData)}
              className="retro-btn retro-btn-primary flex-1"
            >
              {initialData?.id ? 'SAVE' : 'CONVERT'}
            </button>
            {onSaveAndNavigate && (
              <button
                onClick={() => onSaveAndNavigate(initialData)}
                className="retro-btn retro-btn-secondary flex-1"
              >
                SAVE & GO TO FILES
              </button>
            )}
          </div>
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Form field components for use inside EntityModal
interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea' | 'date' | 'number' | 'select'
  placeholder?: string
  entityType?: Exclude<EntityType, 'idea'>
  className?: string
  options?: Array<{ value: string; label: string }>
  min?: number
  max?: number
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = '',
  options = [],
  min,
  max,
}) => {
  return (
    <div className="mb-4">
      <label className="retro-label">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`retro-textarea ${className}`}
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`retro-input ${className}`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`retro-input ${className}`}
          min={min}
          max={max}
        />
      )}
    </div>
  )
}

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

import React, { useEffect, useRef } from 'react'
import { EntityType } from '@/lib/entity-colors'

interface EntityModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: Exclude<EntityType, 'idea'>
  initialData?: Record<string, any>
  onSave: (data: Record<string, any>) => void | Promise<void>
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
  onAIFill,
  children,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null)

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

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="retro-overlay"
      />

      {/* Modal */}
      <div
        ref={modalRef}
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
          {/* AI Autofill Button (if provided) */}
          {onAIFill && (
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

          {/* Convert/Save Button */}
          <button
            onClick={() => onSave(initialData)}
            className="retro-btn retro-btn-primary w-full"
          >
            {initialData?.id ? 'SAVE CHANGES' : 'CONVERT'}
          </button>
        </div>
      </div>
    </>
  )
}

// Form field components for use inside EntityModal
interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'textarea' | 'date' | 'number'
  placeholder?: string
  entityType?: Exclude<EntityType, 'idea'>
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className = '',
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
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`retro-input ${className}`}
        />
      )}
    </div>
  )
}

/**
 * Entity Modal Component
 *
 * Bottom sheet modal for creating/editing entities:
 * - Slides up from bottom (300ms)
 * - Drag handle for dismissal
 * - Dynamic form fields based on entity type
 * - AI autofill button
 * - Full-width Convert/Save button
 * - Overlay dims background (40% opacity)
 * - Respects safe areas
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { EntityType, getEntityColor } from '@/lib/entity-colors'

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
  const [dragOffset, setDragOffset] = React.useState(0)

  const entityColor = getEntityColor(entityType, 'bright')
  const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1)

  // Handle drag to dismiss
  const handleDrag = (_event: any, info: PanInfo) => {
    if (info.offset.y > 0) {
      setDragOffset(info.offset.y)
    }
  }

  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose()
    }
    setDragOffset(0)
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: dragOffset }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-[#2a2a2a] rounded-t-3xl shadow-2xl z-50 ${className}`}
            style={{
              maxHeight: '85vh',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4">
              <h2
                className="text-2xl font-bold"
                style={{ color: entityColor }}
              >
                {entityLabel}
              </h2>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
              {children}
            </div>

            {/* Fixed Bottom Actions */}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 bg-white dark:bg-[#2a2a2a] border-t border-[var(--border-color)]"
              style={{
                paddingBottom: 'max(24px, calc(24px + env(safe-area-inset-bottom)))',
              }}
            >
              {/* AI Autofill Button (if provided) */}
              {onAIFill && (
                <button
                  onClick={onAIFill}
                  className="w-40 h-11 mx-auto mb-4 flex items-center justify-center gap-2 border border-[#6EC5FF] text-[#6EC5FF] bg-white dark:bg-[#2a2a2a] rounded-xl font-semibold text-sm transition-all hover:bg-blue-50"
                  style={{ display: 'flex', margin: '0 auto 16px' }}
                >
                  <span className="text-lg">✨</span>
                  AI Autofill
                </button>
              )}

              {/* Convert/Save Button */}
              <button
                onClick={() => onSave(initialData)}
                className="w-full h-13 rounded-xl text-white text-lg font-bold transition-all hover:opacity-90 active:scale-98"
                style={{
                  backgroundColor: entityColor,
                }}
              >
                {initialData?.id ? 'Save Changes' : 'Convert'}
              </button>
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
  entityType = 'task',
  className = '',
}) => {
  const entityColor = getEntityColor(entityType, 'bright')

  const inputClassName = `w-full px-3 border border-[var(--border-color)] rounded-lg bg-white dark:bg-[#2a2a2a] text-[var(--text-primary)] transition-colors focus:outline-none ${className}`

  const focusStyle = {
    '--focus-color': entityColor,
  } as React.CSSProperties

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClassName} min-h-[96px] py-3 resize-vertical`}
          style={focusStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClassName} h-12`}
          style={focusStyle}
        />
      )}
    </div>
  )
}

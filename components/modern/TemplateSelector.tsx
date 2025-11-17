/**
 * Template Selector Component
 *
 * Modal that allows users to choose a template when creating a new markdown entity.
 *
 * Features:
 * - Fetches templates from /api/templates
 * - Groups templates by entity type (task, note, project, list)
 * - Optional entityType filter to show only specific entity templates
 * - Clickable cards with hover effects
 * - Retro-styled modal with fade-in animation
 * - Loading and error states
 * - Entity type icons and descriptions
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Template } from '@/types'

interface TemplateSelectorProps {
  isOpen: boolean
  onSelect: (template: Template) => void
  onCancel: () => void
  entityType?: 'task' | 'note' | 'project' | 'list' // Optional filter
}

// Entity type metadata
const ENTITY_META = {
  task: { icon: '📋', label: 'Tasks', color: 'var(--entity-task)' },
  note: { icon: '📝', label: 'Notes', color: 'var(--entity-note)' },
  project: { icon: '📁', label: 'Projects', color: 'var(--entity-project)' },
  list: { icon: '📑', label: 'Lists', color: 'var(--entity-list)' },
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  isOpen,
  onSelect,
  onCancel,
  entityType,
}) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch templates on mount
  useEffect(() => {
    if (!isOpen) return

    const fetchTemplates = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/templates')
        const data = await res.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch templates')
        }

        setTemplates(data.data)
      } catch (err) {
        console.error('Error fetching templates:', err)
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  // Filter templates by entity type if specified
  const filteredTemplates = entityType
    ? templates.filter(t => t.entity_type === entityType)
    : templates

  // Group templates by entity_type
  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    const type = template.entity_type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(template)
    return acc
  }, {} as Record<string, Template[]>)

  // Sort entity types for consistent rendering
  const entityTypes = Object.keys(groupedTemplates).sort() as Array<'task' | 'note' | 'project' | 'list'>

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 z-[1002] flex items-center justify-center"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px] max-h-[80vh] z-[1003]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="retro-card" style={{
              background: 'var(--palm-bg-primary)',
              border: '3px solid var(--palm-border-dark)',
              boxShadow: '4px 4px 0 var(--palm-border-dark)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80vh',
            }}>
              {/* Header */}
              <div className="retro-sheet-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--palm-screen-dark)',
                color: 'var(--palm-bg-primary)',
                borderBottom: '2px solid var(--palm-border-dark)',
                flexShrink: 0,
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0,
                }}>
                  Select Template
                </h2>
                <button
                  onClick={onCancel}
                  className="retro-close-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--palm-bg-primary)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="retro-scrollable" style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
              }}>
                {loading && (
                  <div className="retro-loading">
                    <p style={{ margin: 0 }}>Loading templates...</p>
                  </div>
                )}

                {error && (
                  <div className="retro-message" style={{
                    background: 'rgba(139, 107, 107, 0.2)',
                    borderColor: 'var(--swipe-delete)',
                    color: 'var(--palm-text-primary)',
                  }}>
                    <p style={{ margin: 0 }}>{error}</p>
                  </div>
                )}

                {!loading && !error && filteredTemplates.length === 0 && (
                  <div className="retro-empty">
                    <div className="retro-empty-icon">📋</div>
                    <p className="retro-empty-title">No Templates Found</p>
                    <p className="retro-empty-message">
                      No templates available for this entity type.
                    </p>
                  </div>
                )}

                {!loading && !error && entityTypes.map((type) => {
                  const meta = ENTITY_META[type]
                  const typeTemplates = groupedTemplates[type]

                  return (
                    <div key={type} style={{ marginBottom: '24px' }}>
                      {/* Entity Type Header */}
                      <h3 style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--palm-text-primary)',
                        marginBottom: '12px',
                        paddingBottom: '6px',
                        borderBottom: `2px solid ${meta.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span style={{ fontSize: '16px' }}>{meta.icon}</span>
                        {meta.label}
                      </h3>

                      {/* Template Cards */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        {typeTemplates.map((template) => {
                          // Parse field_config to extract description if available
                          let description = 'Template for creating ' + type + 's'
                          try {
                            const config = JSON.parse(template.field_config)
                            if (config.description) {
                              description = config.description
                            }
                          } catch (e) {
                            // Use default description
                          }

                          return (
                            <button
                              key={template.id}
                              onClick={() => onSelect(template)}
                              className="retro-card"
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'var(--palm-screen-base)',
                                border: '1px solid var(--palm-border)',
                                borderLeft: `3px solid ${meta.color}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                textAlign: 'left',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--palm-screen-light)'
                                e.currentTarget.style.transform = 'translateX(4px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--palm-screen-base)'
                                e.currentTarget.style.transform = 'translateX(0)'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                              }}>
                                <span style={{
                                  fontSize: '24px',
                                  flexShrink: 0,
                                }}>
                                  {meta.icon}
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: 'var(--palm-text-primary)',
                                    marginBottom: '4px',
                                  }}>
                                    {template.name}
                                  </div>
                                  <div style={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '12px',
                                    lineHeight: '1.5',
                                    color: 'var(--palm-text-secondary)',
                                  }}>
                                    {description}
                                  </div>
                                  {template.is_system === 1 && (
                                    <div style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '10px',
                                      color: 'var(--palm-border-dark)',
                                      marginTop: '4px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.05em',
                                    }}>
                                      System Template
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '12px 16px',
                borderTop: '1px solid var(--palm-border)',
                background: 'var(--palm-screen-base)',
                flexShrink: 0,
              }}>
                <button
                  onClick={onCancel}
                  className="retro-btn retro-btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

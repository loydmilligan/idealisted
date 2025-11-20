/**
 * MarkdownEntityEditor Component
 *
 * Dynamic form editor for markdown-based entities (tasks, notes, projects, lists).
 * Renders forms based on template field_config with validation and markdown serialization.
 *
 * Phase 7 Task 7.2: Main editor component
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Item, Template, FieldConfig, FieldDef, SectionDef } from '@/types'
import { parseMarkdown, renderMarkdown } from '@/lib/markdown-parser'

// Import field components
import { TextField } from '@/components/ui/markdown-fields/TextField'
import { DateField } from '@/components/ui/markdown-fields/DateField'
import { DateTimeField } from '@/components/ui/markdown-fields/DateTimeField'
import { SelectField } from '@/components/ui/markdown-fields/SelectField'
import { URLField } from '@/components/ui/markdown-fields/URLField'

// Import section components
import { TextareaSection } from '@/components/ui/markdown-fields/TextareaSection'
import { BulletListSection } from '@/components/ui/markdown-fields/BulletListSection'
import { ChecklistSection } from '@/components/ui/markdown-fields/ChecklistSection'
import { TimestampListSection } from '@/components/ui/markdown-fields/TimestampListSection'

// Task 4.3: Pre-fill data from AI suggestions
export interface PreFillData {
  title: string
  fields: Record<string, string>
  sections: Record<string, any>
}


interface MarkdownEntityEditorProps {
  item: Item | null // null for new entities
  template: Template
  onSave: (markdown: string) => Promise<void>
  onCancel: () => void
  isOpen: boolean
  /**
   * Pre-populate the title field with captured idea text.
   * Only applies when creating new entities (item === null).
   * Will not overwrite existing titles when editing.
   */
  initialText?: string
  /**
   * Pre-fill form data from AI suggestions (Task 4.3).
   * Only applies when creating new entities (item === null).
   */
  preFillData?: PreFillData | null
}

interface FormState {
  title: string
  fields: Record<string, string>
  sections: Record<string, any>
}

export function MarkdownEntityEditor({
  item,
  template,
  onSave,
  onCancel,
  isOpen,
  initialText,
  preFillData
}: MarkdownEntityEditorProps) {
  const [formState, setFormState] = useState<FormState>({
    title: '',
    fields: {},
    sections: {}
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Parse field_config from template
  const fieldConfig: FieldConfig = React.useMemo(() => {
    try {
      return JSON.parse(template.field_config)
    } catch (error) {
      console.error('Failed to parse field_config:', error)
      return { fields: {}, sections: {} }
    }
  }, [template.field_config])

  // Initialize form state when modal opens or item changes
  useEffect(() => {
    if (!isOpen) return

    // If editing existing item with markdown content
    if (item && item.markdown_content) {
      try {
        const parsed = parseMarkdown(item.markdown_content, template)

        // Convert parsed sections to proper data types
        const typedSections: Record<string, any> = {}
        if (fieldConfig.sections) {
          for (const [sectionName, sectionDef] of Object.entries(fieldConfig.sections)) {
            const rawContent = parsed.sections[sectionName] || ''
            typedSections[sectionName] = parseSectionContent(rawContent, sectionDef.type)
          }
        }

        setFormState({
          title: parsed.title,
          fields: parsed.fields,
          sections: typedSections
        })
      } catch (error) {
        console.error('Failed to parse markdown:', error)
        initializeEmptyForm()
      }
    } else if (preFillData) {
      // Task 4.3: Initialize from AI pre-fill data
      console.log('[MarkdownEntityEditor] Initializing with pre-fill data:', preFillData)
      setFormState({
        title: preFillData.title,
        fields: preFillData.fields,
        sections: preFillData.sections
      })
    } else {
      // New item - initialize with empty values
      initializeEmptyForm()
    }

    // Clear errors when modal opens
    setErrors([])
  }, [isOpen, item, template.id, fieldConfig, preFillData])

  // Pre-populate fields from initial text if provided
  useEffect(() => {
    if (initialText && initialText.trim() && !formState.title) {
      const text = initialText.trim()

      // Detect if initialText is a URL
      const isURL = /^https?:\/\//.test(text)

      if (isURL && template.id === 'note-youtube') {
        // For YouTube notes, populate URL field instead of title
        setFormState(prev => ({
          ...prev,
          fields: {
            ...prev.fields,
            URL: text
          },
          // Keep title empty so user can enter meaningful title
          title: ''
        }))
      } else {
        // For all other cases, populate title
        setFormState(prev => ({
          ...prev,
          title: text
        }))
      }
    }
  }, [initialText, formState.title, template.id])

  // Initialize empty form with default values
  const initializeEmptyForm = () => {
    const emptyFields: Record<string, string> = {}
    const emptySections: Record<string, any> = {}

    // Initialize fields
    if (fieldConfig.fields) {
      for (const fieldName of Object.keys(fieldConfig.fields)) {
        emptyFields[fieldName] = ''
      }
    }

    // Initialize sections with proper data types
    if (fieldConfig.sections) {
      for (const [sectionName, sectionDef] of Object.entries(fieldConfig.sections)) {
        emptySections[sectionName] = getEmptySectionValue(sectionDef.type)
      }
    }

    setFormState({
      title: '',
      fields: emptyFields,
      sections: emptySections
    })
  }

  // Get empty value for section type
  const getEmptySectionValue = (sectionType: SectionDef['type']): any => {
    switch (sectionType) {
      case 'textarea':
        return ''
      case 'bulletlist':
      case 'orderedlist':
      case 'timestamplist':
        return []
      case 'checklist':
        return []
      case 'taglist':
        return []
      case 'shoppinglist':
        return []
      default:
        return ''
    }
  }

  // Parse section content from markdown string to typed data
  const parseSectionContent = (content: string, sectionType: SectionDef['type']): any => {
    if (!content.trim()) {
      return getEmptySectionValue(sectionType)
    }

    switch (sectionType) {
      case 'textarea':
        return content

      case 'bulletlist':
      case 'shoppinglist':
        // Parse lines starting with - or *
        return content
          .split('\n')
          .filter(line => line.trim().match(/^[-*]\s+/))
          .map(line => line.replace(/^[-*]\s+/, '').trim())

      case 'orderedlist':
        return content
          .split('\n')
          .filter(line => line.trim().match(/^\d+[\.\)]\s+/))
          .map(line => line.replace(/^\d+[\.\)]\s+/, '').trim())

      case 'checklist':
        // Parse lines with - [ ] or - [x]
        return content
          .split('\n')
          .filter(line => line.trim().match(/^[-*]\s+\[([ x])\]\s+/))
          .map(line => {
            const match = line.match(/^[-*]\s+\[([ x])\]\s+(.+)$/)
            if (match) {
              return {
                text: match[2].trim(),
                checked: match[1] === 'x'
              }
            }
            return { text: '', checked: false }
          })

      case 'timestamplist':
        // Parse lines with **HH:MM** text format
        return content
          .split('\n')
          .filter(line => line.trim().match(/^\*\*\d{2}:\d{2}\*\*\s+/))
          .map(line => {
            const match = line.match(/^\*\*(\d{2}:\d{2})\*\*\s+(.+)$/)
            if (match) {
              return {
                timestamp: match[1],
                text: match[2].trim()
              }
            }
            return { timestamp: '00:00', text: '' }
          })

      case 'taglist':
        // Parse comma-separated tags
        return content
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)

      default:
        return content
    }
  }

  // Serialize section data back to markdown string
  const serializeSectionContent = (data: any, sectionType: SectionDef['type']): string => {
    switch (sectionType) {
      case 'textarea':
        return data || ''

      case 'bulletlist':
        return (data as string[])
          .filter(item => item.trim())
          .map(item => `- ${item}`)
          .join('\n')

      case 'orderedlist':
        return (data as string[])
          .filter(item => item.trim())
          .map((item, index) => `${index + 1}. ${item}`)
          .join('\n')

      case 'checklist':
        return (data as Array<{ text: string; checked: boolean }>)
          .filter(item => item.text.trim())
          .map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`)
          .join('\n')

      case 'timestamplist':
        return (data as Array<{ timestamp: string; text: string }>)
          .filter(item => item.text.trim())
          .map(item => `**${item.timestamp}** ${item.text}`)
          .join('\n')

      case 'taglist':
        return (data as string[])
          .filter(tag => tag.trim())
          .join(', ')

      case 'shoppinglist':
        return (data as string[])
          .filter(item => item.trim())
          .map(item => `- ${item}`)
          .join('\n')

      default:
        return String(data || '')
    }
  }

  // Validate form before submission
  const validateForm = (): boolean => {
    const validationErrors: string[] = []

    // Validate title
    if (!formState.title.trim()) {
      validationErrors.push('Title is required')
    }

    // Validate required fields
    if (fieldConfig.fields) {
      for (const [fieldName, fieldDef] of Object.entries(fieldConfig.fields)) {
        if (fieldDef.required && !formState.fields[fieldName]?.trim()) {
          validationErrors.push(`${fieldName} is required`)
        }
      }
    }

    // Validate required sections
    if (fieldConfig.sections) {
      for (const [sectionName, sectionDef] of Object.entries(fieldConfig.sections)) {
        if (sectionDef.required) {
          const sectionData = formState.sections[sectionName]
          const isEmpty =
            !sectionData ||
            (typeof sectionData === 'string' && !sectionData.trim()) ||
            (Array.isArray(sectionData) && sectionData.length === 0)

          if (isEmpty) {
            validationErrors.push(`${sectionName} is required`)
          }
        }
      }
    }

    setErrors(validationErrors)
    return validationErrors.length === 0
  }

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSaving(true)
    try {
      // Convert sections to markdown strings
      const serializedSections: Record<string, string> = {}
      if (fieldConfig.sections) {
        for (const [sectionName, sectionDef] of Object.entries(fieldConfig.sections)) {
          serializedSections[sectionName] = serializeSectionContent(
            formState.sections[sectionName],
            sectionDef.type
          )
        }
      }

      // Render markdown
      const markdown = renderMarkdown(
        {
          title: formState.title,
          fields: formState.fields,
          sections: serializedSections,
          raw: ''
        },
        template
      )

      await onSave(markdown)
    } catch (error) {
      console.error('Failed to save:', error)
      setErrors([error instanceof Error ? error.message : 'Failed to save entity'])
    } finally {
      setIsSaving(false)
    }
  }

  // Update field value
  const updateField = (fieldName: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: value
      }
    }))
  }

  // Update section value
  const updateSection = (sectionName: string, value: any) => {
    setFormState(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionName]: value
      }
    }))
  }

  // Render field component based on type
  const renderField = (fieldName: string, fieldDef: FieldDef) => {
    const value = formState.fields[fieldName] || ''

    switch (fieldDef.type) {
      case 'text':
        return (
          <TextField
            key={fieldName}
            label={fieldName}
            value={value}
            onChange={(val) => updateField(fieldName, val)}
            required={fieldDef.required}
            readonly={fieldDef.readonly}
          />
        )

      case 'date':
        return (
          <DateField
            key={fieldName}
            label={fieldName}
            value={value}
            onChange={(val) => updateField(fieldName, val)}
            required={fieldDef.required}
          />
        )

      case 'datetime':
        return (
          <DateTimeField
            key={fieldName}
            label={fieldName}
            value={value}
            onChange={(val) => updateField(fieldName, val)}
            required={fieldDef.required}
          />
        )

      case 'select':
        return (
          <SelectField
            key={fieldName}
            label={fieldName}
            value={value}
            onChange={(val) => updateField(fieldName, val)}
            options={fieldDef.options || []}
            required={fieldDef.required}
          />
        )

      case 'url':
        return (
          <URLField
            key={fieldName}
            label={fieldName}
            value={value}
            onChange={(val) => updateField(fieldName, val)}
            required={fieldDef.required}
            validation={fieldDef.validation as 'youtube' | 'generic'}
          />
        )

      default:
        return null
    }
  }

  // Render section component based on type
  const renderSection = (sectionName: string, sectionDef: SectionDef) => {
    const value = formState.sections[sectionName]

    switch (sectionDef.type) {
      case 'textarea':
        return (
          <TextareaSection
            key={sectionName}
            label={sectionName}
            value={value || ''}
            onChange={(val) => updateSection(sectionName, val)}
            required={sectionDef.required}
            readonly={sectionDef.readonly}
          />
        )

      case 'bulletlist':
        return (
          <BulletListSection
            key={sectionName}
            label={sectionName}
            items={value || []}
            onChange={(val) => updateSection(sectionName, val)}
            required={sectionDef.required}
          />
        )

      case 'orderedlist':
        return (
          <BulletListSection
            key={sectionName}
            label={sectionName}
            items={value || []}
            onChange={(val) => updateSection(sectionName, val)}
            required={sectionDef.required}
            variant="ordered"
          />
        )

      case 'checklist':
        return (
          <ChecklistSection
            key={sectionName}
            label={sectionName}
            items={value || []}
            onChange={(val) => updateSection(sectionName, val)}
            required={sectionDef.required}
          />
        )

      case 'timestamplist':
        return (
          <TimestampListSection
            key={sectionName}
            label={sectionName}
            items={value || []}
            onChange={(val) => updateSection(sectionName, val)}
            required={sectionDef.required}
          />
        )

      case 'shoppinglist':
        return (
          <BulletListSection
            key={sectionName}
            label={sectionName}
            items={value || []}
            onChange={(val) => updateSection(sectionName, val)}
            required={sectionDef.required}
            variant="shopping"
          />
        )

      default:
        return null
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="retro-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            className={`retro-bottom-sheet retro-bottom-sheet-${template.entity_type}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="retro-sheet-header">
              <h2 className="retro-sheet-title">
                {item ? `Edit ${template.name}` : `New ${template.name}`}
              </h2>
              <button
                className="retro-close-button"
                onClick={onCancel}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="retro-sheet-content">
              {/* Validation Errors */}
              {errors.length > 0 && (
                <div className="retro-validation-errors">
                  <div className="retro-error-header">Please fix the following errors:</div>
                  <ul className="retro-error-list">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Title Field */}
              <div className="retro-form-group">
                <label className="retro-form-label">
                  Title <span style={{ color: 'var(--palm-text-secondary)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="retro-input"
                  value={formState.title}
                  onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter title..."
                />
              </div>

              {/* Dynamic Fields */}
              {fieldConfig.fields && Object.entries(fieldConfig.fields).map(([fieldName, fieldDef]) => (
                renderField(fieldName, fieldDef)
              ))}

              {/* Dynamic Sections */}
              {fieldConfig.sections && Object.entries(fieldConfig.sections).map(([sectionName, sectionDef]) => (
                renderSection(sectionName, sectionDef)
              ))}
            </div>

            {/* Footer Actions */}
            <div className="retro-sheet-actions">
              <button
                className="retro-button retro-button-secondary"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="retro-button retro-button-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

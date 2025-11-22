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
import { TagInput } from '@/components/modern/TagInput'
import { BadgeCheck, Loader2 } from 'lucide-react'

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
  onSave: (payload: { markdown: string; fields: Record<string, string>; sections: Record<string, any>; rawSections?: Record<string, any>; tags: string[] }) => Promise<void>
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
  const [tags, setTags] = useState<string[]>([])
  const [aiEnabled, setAiEnabled] = useState(false)
  const [tagSuggestionsEnabled, setTagSuggestionsEnabled] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<Array<{ name: string; confidence: number; source?: string; usage_count?: number }>>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Parse field_config from template
  const fieldConfig: FieldConfig = React.useMemo(() => {
    try {
      return JSON.parse(template.field_config)
    } catch (error) {
      console.error('Failed to parse field_config:', error)
      return { fields: {}, sections: {} }
    }
  }, [template.field_config])

  // AI/tag feature flags
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setAiEnabled(data.settings?.ai_config?.enabled ?? false))
      .catch(() => setAiEnabled(false))
  }, [])

  useEffect(() => {
    fetch('/api/ai-features')
      .then(res => res.json())
      .then(data => {
        const feature = data.features?.find((f: any) => f.feature_name === 'tag_suggestions')
        setTagSuggestionsEnabled(feature?.enabled === 1)
      })
      .catch(() => setTagSuggestionsEnabled(false))
  }, [])

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
        setTags(Array.isArray(item.tags) ? item.tags : [])
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
      setTags([])
    } else {
      // New item - initialize with empty values
      initializeEmptyForm()
      setTags([])
    }

    // Clear errors when modal opens
    setErrors([])
  }, [isOpen, item, template.id, fieldConfig, preFillData])

  const handleSuggestTags = async () => {
    if (!aiEnabled || !tagSuggestionsEnabled || !formState.title.trim()) return
    setLoadingSuggestions(true)
    setTagSuggestions([])

    try {
      const response = await fetch('/api/ai/suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formState.title,
          entityType: template.entity_type
        })
      })
      const data = await response.json()
      if (data.success && data.tags) {
        setTagSuggestions(data.tags)
      }
    } catch (error) {
      console.error('Failed to suggest tags:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleAddSuggestedTag = (name: string) => {
    setTags(prev => prev.includes(name) ? prev : [...prev, name])
    setTagSuggestions(prev => prev.filter(t => t.name !== name))
  }

  const handleAcceptAllSuggested = () => {
    const names = tagSuggestions.map(t => t.name)
    setTags(prev => [...prev, ...names.filter(n => !prev.includes(n))])
    setTagSuggestions([])
  }

  const handleDismissSuggestions = () => setTagSuggestions([])

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
    const sanitizeTag = (tag: string) =>
      tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
    const sanitizedTags = Array.from(
      new Set(
        (tags || [])
          .map(t => sanitizeTag(t))
          .filter(t => t.length > 0 && t.length <= 50)
      )
    )
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

      await onSave({
        markdown,
        fields: formState.fields,
        sections: serializedSections,
        rawSections: formState.sections,
        tags: sanitizedTags
      } as any)
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

              {/* Tags + AI tag suggestions */}
              <div className="retro-form-group">
                <TagInput value={tags} onChange={setTags} entityType={template.entity_type} />
                {aiEnabled && tagSuggestionsEnabled && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="retro-btn retro-btn-secondary"
                      onClick={handleSuggestTags}
                      disabled={loadingSuggestions || !formState.title.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {loadingSuggestions ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                      {loadingSuggestions ? 'Analyzing...' : 'Suggest Tags'}
                    </button>
                    {tagSuggestions.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="retro-btn retro-btn-secondary"
                          onClick={handleAcceptAllSuggested}
                        >
                          Accept All
                        </button>
                        <button
                          type="button"
                          className="retro-btn retro-btn-secondary"
                          onClick={handleDismissSuggestions}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                )}
                {tagSuggestions.length > 0 && (
                  <div className="mt-2" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag.name}
                        type="button"
                        className="retro-tag-chip"
                        onClick={() => handleAddSuggestedTag(tag.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <span>{tag.name}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{Math.round(tag.confidence * 100)}%</span>
                      </button>
                    ))}
                  </div>
                )}
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

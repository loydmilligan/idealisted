import { db } from './db'
import type { Template, FieldConfig, ParsedEntity } from '@/types'

/**
 * Validation result returned by validateMarkdown
 */
export interface ValidationResult {
  /** True if markdown passes all template validation rules */
  valid: boolean
  /** Array of error messages describing validation failures (empty if valid) */
  errors: string[]
}

/**
 * Get a template by ID from the database
 * @param templateId - Template ID (e.g., 'task', 'note-generic', 'note-youtube')
 * @returns Template with field_config as JSON string, or null if not found
 * @throws Error if field_config JSON is invalid
 */
export function getTemplate(templateId: string): Template | null {
  try {
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(templateId)

    if (!row) {
      return null
    }

    // Cast to Template type
    const template = row as Template

    // Validate that field_config can be parsed (keep as string per Template type)
    try {
      JSON.parse(template.field_config)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Template '${templateId}' has invalid field_config JSON: ${errorMessage}`)
    }

    return template
  } catch (error) {
    // If it's our custom field_config validation error, re-throw as-is
    if (error instanceof Error && error.message.includes('invalid field_config')) {
      throw error
    }
    // Otherwise, wrap database errors with context
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load template '${templateId}': ${errorMessage}`)
  }
}

/**
 * Parse markdown content into structured fields and sections
 *
 * This function will:
 * - Extract the title from the first H1 heading
 * - Parse field values (lines with **Field Name**: value)
 * - Extract section content (## Section Name blocks)
 * - Validate against the template's field_config
 * - Return a ParsedEntity with title, fields, sections, and raw markdown
 *
 * @param content - Raw markdown string
 * @param templateId - Template ID to use for parsing
 * @returns Parsed entity with title, fields, sections, and raw markdown
 * @throws Error when called (not yet implemented)
 */
export function parseMarkdown(content: string, templateId: string): ParsedEntity {
  throw new Error('Not yet implemented - Task 2.2')
}

/**
 * Render a ParsedEntity back into markdown format
 *
 * This function will:
 * - Load the template by templateId
 * - Reconstruct the markdown from the template structure
 * - Insert the title into the {title} placeholder
 * - Insert field values after their bold labels
 * - Insert section content under ## headings
 * - Return properly formatted markdown string
 *
 * @param parsed - Parsed entity object
 * @param templateId - Template ID to use for rendering
 * @returns Markdown string
 * @throws Error when called (not yet implemented)
 */
export function renderMarkdown(parsed: ParsedEntity, templateId: string): string {
  throw new Error('Not yet implemented - Task 2.4')
}

/**
 * Validate markdown content against template requirements
 *
 * This function will:
 * - Parse the markdown content
 * - Check that all required fields are present and non-empty
 * - Check that all required sections are present and non-empty
 * - Validate field types (e.g., date format, URL format)
 * - Validate select field values are from allowed options
 * - Return ValidationResult with list of errors if invalid
 *
 * @param content - Raw markdown string
 * @param templateId - Template ID to validate against
 * @returns Validation result with errors if invalid
 * @throws Error when called (not yet implemented)
 */
export function validateMarkdown(content: string, templateId: string): ValidationResult {
  throw new Error('Not yet implemented - Task 2.5')
}

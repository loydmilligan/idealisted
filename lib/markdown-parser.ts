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
 * NOTE: getTemplate and validateMarkdown have been removed because they require database access
 * and cannot be used in client components. The MarkdownEntityEditor receives the template
 * as a prop from the server, so these functions are not needed on the client side.
 *
 * If server-side validation is needed, these functions should be moved to a separate
 * server-only file (e.g., lib/markdown-parser-server.ts with 'use server' directive).
 */

/*
// Commented out - requires database access
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
*/

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
 * @param template - Template object with field_config
 * @returns Parsed entity with title, fields, sections, and raw markdown
 * @throws Error if field_config is invalid JSON
 */
export function parseMarkdown(content: string, template: Template): ParsedEntity {
  // Step 1: Parse field_config JSON
  let fieldConfig: FieldConfig
  try {
    fieldConfig = JSON.parse(template.field_config)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Template '${template.id}' has invalid field_config JSON: ${errorMessage}`)
  }

  // Step 3: Initialize ParsedEntity
  const parsed: ParsedEntity = {
    title: '',
    fields: {},
    sections: {},
    raw: content
  }

  // Step 4: Extract title from first H1 heading (# Title)
  const titleMatch = content.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    parsed.title = titleMatch[1].trim()
  }

  // Step 5: Extract field values
  // Pattern: **Field Name**: value
  // Handle templates with no fields (e.g., note-generic)
  if (fieldConfig.fields) {
    for (const fieldName in fieldConfig.fields) {
      // Escape special regex characters in field name
      const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match pattern: **Field Name**: value (capturing the value part)
      const fieldRegex = new RegExp(`\\*\\*${escapedFieldName}\\*\\*:\\s*(.*)`, 'm')
      const match = content.match(fieldRegex)

      if (match) {
        // Store the captured value (trimmed)
        parsed.fields[fieldName] = match[1].trim()
      } else {
        // Field not found in markdown - store empty string
        parsed.fields[fieldName] = ''
      }
    }
  }

  // Step 6: Extract sections
  // Pattern: ## Section Name followed by content until next ## or end of file
  // Handle templates with no sections (e.g., some custom templates)
  if (fieldConfig.sections) {
    for (const sectionName in fieldConfig.sections) {
      // Escape special regex characters in section name
      const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match pattern: ## Section Name (on its own line)
      // Then capture everything until we hit another ## at the start of a line, or EOF
      // Split approach: find the section header, then extract content until next header
      const headerPattern = new RegExp(`^##\\s+${escapedSectionName}[ \\t]*$`, 'gm')
      const headerMatch = headerPattern.exec(content)

      if (headerMatch) {
        // Found the section header - now extract content after it until next section or EOF
        const sectionStart = headerMatch.index + headerMatch[0].length + 1 // +1 for the newline
        const remainingContent = content.substring(sectionStart)

        // Find the next section header (## at start of line)
        const nextSectionMatch = /^##\s/gm.exec(remainingContent)

        let sectionContent: string
        if (nextSectionMatch) {
          // Extract from current position to next section header
          sectionContent = remainingContent.substring(0, nextSectionMatch.index)
        } else {
          // Extract from current position to end of string
          sectionContent = remainingContent
        }

        parsed.sections[sectionName] = sectionContent.trim()
      } else {
        // Section not found in markdown - store empty string
        parsed.sections[sectionName] = ''
      }
    }
  }

  return parsed
}

/**
 * Render a ParsedEntity back into markdown format
 *
 * This function will:
 * - Reconstruct the markdown from the template structure
 * - Insert the title into the {title} placeholder
 * - Insert field values after their bold labels
 * - Insert section content under ## headings
 * - Return properly formatted markdown string
 *
 * @param parsed - Parsed entity object
 * @param template - Template object to use for rendering
 * @returns Markdown string
 * @throws Error if field_config is invalid JSON
 */
export function renderMarkdown(parsed: ParsedEntity, template: Template): string {
  // Step 1: Parse field_config JSON (for validation/reference)
  let fieldConfig: FieldConfig
  try {
    fieldConfig = JSON.parse(template.field_config)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Template '${template.id}' has invalid field_config JSON: ${errorMessage}`)
  }

  // Step 3: Start with the template's markdown_template
  let markdown = template.markdown_template

  // Step 4: Replace {title} placeholder with parsed.title
  markdown = markdown.replace('{title}', parsed.title || '')

  // Step 5: Replace field values
  // Pattern: **Field Name**: (empty or old value) → **Field Name**: new value
  if (fieldConfig.fields) {
    for (const fieldName in fieldConfig.fields) {
      // Escape special regex characters in field name
      const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match pattern: **Field Name**: (value on same line only)
      // Use [ \t]* instead of \s* to avoid matching newlines
      // This prevents accidentally matching content on following lines
      const fieldRegex = new RegExp(`(\\*\\*${escapedFieldName}\\*\\*:)[ \\t]*(.*)$`, 'm')
      const fieldValue = parsed.fields[fieldName] || ''

      markdown = markdown.replace(fieldRegex, `$1 ${fieldValue}`)
    }
  }

  // Step 6: Replace section content
  // Pattern: ## Section Name\n(old content) → ## Section Name\nnew content
  // Process sections in a single pass to avoid position shifts
  if (fieldConfig.sections) {
    // Build a list of all section positions first
    const sectionPositions: Array<{
      name: string
      headerStart: number
      headerEnd: number
      contentStart: number
    }> = []

    for (const sectionName in fieldConfig.sections) {
      const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const headerPattern = new RegExp(`^##\\s+${escapedSectionName}[ \\t]*$`, 'gm')
      const headerMatch = headerPattern.exec(markdown)

      if (headerMatch) {
        sectionPositions.push({
          name: sectionName,
          headerStart: headerMatch.index,
          headerEnd: headerMatch.index + headerMatch[0].length,
          contentStart: headerMatch.index + headerMatch[0].length + 1 // +1 for newline
        })
      }
    }

    // Sort by position (should already be in order, but just to be safe)
    sectionPositions.sort((a, b) => a.headerStart - b.headerStart)

    // Build new markdown by processing sections in order
    if (sectionPositions.length > 0) {
      let result = ''
      let currentPos = 0

      for (let i = 0; i < sectionPositions.length; i++) {
        const section = sectionPositions[i]
        const nextSection = sectionPositions[i + 1]

        // Add everything before this section header
        result += markdown.substring(currentPos, section.headerEnd)

        // Add newline after header
        result += '\n'

        // Add section content (or just a blank line if empty)
        let sectionContent = parsed.sections[section.name] || ''

        // Normalize whitespace for textarea sections
        // This prevents cluttered markdown from preserving all textarea line breaks
        const sectionConfig = fieldConfig.sections?.[section.name]
        if (sectionConfig?.type === 'textarea' && sectionContent.trim()) {
          // Replace 3+ consecutive newlines with exactly 2 newlines (paragraph break)
          // Replace 1-2 newlines with single newline (normalize line breaks)
          sectionContent = sectionContent
            .trim()
            .replace(/\n{3,}/g, '\n\n')  // 3+ newlines → 2 newlines (paragraph)
            .replace(/\n{1,2}/g, '\n')    // 1-2 newlines → 1 newline
        }

        if (sectionContent) {
          result += sectionContent + '\n'
        } else {
          result += '\n'
        }

        // Add blank line before next section (for spacing)
        if (nextSection) {
          result += '\n'
          currentPos = nextSection.headerStart
        } else {
          // Last section - add everything after this section's content area
          // Skip the old content by finding the next section or EOF
          const afterHeader = markdown.substring(section.contentStart)
          const nextHeaderMatch = /^##\s/gm.exec(afterHeader)
          if (nextHeaderMatch) {
            currentPos = section.contentStart + nextHeaderMatch.index
            result += markdown.substring(currentPos)
          } else {
            // No more sections, we're at EOF
            // Don't add anything more (we already added the content)
          }
          break
        }
      }

      markdown = result
    }
  }

  return markdown
}

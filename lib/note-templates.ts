// Note template definitions with YAML frontmatter
// Based on implementation guide specifications

export type NoteSubtype = 'general' | 'research' | 'video' | 'link' | 'file' | 'contact' | 'meeting'

export interface NoteTemplate {
  subtype: NoteSubtype
  emoji: string
  label: string
  generateContent: (title: string, additionalData?: Record<string, any>) => {
    frontmatter: Record<string, any>
    markdown: string
  }
}

const formatDate = (timestamp?: number) => {
  const date = timestamp ? new Date(timestamp) : new Date()
  return date.toISOString().split('T')[0] // YYYY-MM-DD
}

export const noteTemplates: Record<NoteSubtype, NoteTemplate> = {
  general: {
    subtype: 'general',
    emoji: '📝',
    label: 'General Note',
    generateContent: (title) => ({
      frontmatter: {
        type: 'general',
        created: Date.now(),
        modified: Date.now(),
        tags: []
      },
      markdown: `# ${title}\n\n`
    })
  },

  research: {
    subtype: 'research',
    emoji: '🔬',
    label: 'Research',
    generateContent: (title) => ({
      frontmatter: {
        type: 'research',
        created: Date.now(),
        modified: Date.now(),
        project: '',
        status: 'active',
        tags: []
      },
      markdown: `# ${title}

## Purpose
Why am I researching this?

## Key Questions
-

## Starting Points
-

## Quick Facts
-

## Sources & References
-

## Related Topics
-

## Next Steps
-

## Wikipedia
[Search Wikipedia](https://en.wikipedia.org/wiki/${encodeURIComponent(title)})`
    })
  },

  video: {
    subtype: 'video',
    emoji: '🎥',
    label: 'Video',
    generateContent: (title, data = {}) => ({
      frontmatter: {
        type: 'video',
        created: Date.now(),
        modified: Date.now(),
        project: '',
        url: data.url || '',
        channel: data.channel || '',
        duration: data.duration || '',
        status: 'to-watch',
        tags: []
      },
      markdown: `# ${title}

## Video Info
**Channel**: ${data.channel || ''}
**URL**: ${data.url || ''}
**Duration**: ${data.duration || ''}
**Published**: ${data.published || ''}

## Why I Saved This
Brief context on why this is relevant

## Key Timestamps
- 0:00 -
-

## Main Takeaways
-

## Action Items
-

## Related Content
- `
    })
  },

  link: {
    subtype: 'link',
    emoji: '🔗',
    label: 'Link',
    generateContent: (title, data = {}) => ({
      frontmatter: {
        type: 'link',
        created: Date.now(),
        modified: Date.now(),
        project: '',
        url: data.url || '',
        domain: data.domain || '',
        status: 'unread',
        tags: []
      },
      markdown: `# ${title}

**URL**: ${data.url || ''}
**Source**: ${data.domain || ''}

## Why I Saved This
Context and relevance

## Summary
Key points after reading

## Quotes
> Important excerpts

## Related Links
-

## Follow-up Actions
- `
    })
  },

  file: {
    subtype: 'file',
    emoji: '📁',
    label: 'File',
    generateContent: (title, data = {}) => ({
      frontmatter: {
        type: 'file',
        created: Date.now(),
        modified: Date.now(),
        project: '',
        filename: data.filename || title,
        filepath: data.filepath || '',
        filetype: data.filetype || '',
        filesize: data.filesize || '',
        status: 'stored',
        tags: []
      },
      markdown: `# ${data.filename || title}

## File Details
**Type**: ${data.filetype || ''}
**Size**: ${data.filesize || ''}
**Location**: ${data.filepath || ''}
**Uploaded**: ${formatDate()}

## Description
What is this file and why is it important?

## Contents Overview
Brief summary of what's in the file

## Usage Notes
How/when to use this

## Related Files
-

## Tags for Search
#`
    })
  },

  contact: {
    subtype: 'contact',
    emoji: '👤',
    label: 'Person/Contact',
    generateContent: (title, data = {}) => ({
      frontmatter: {
        type: 'contact',
        created: Date.now(),
        modified: Date.now(),
        project: '',
        name: title,
        role: data.role || '',
        company: data.company || '',
        status: 'active',
        tags: []
      },
      markdown: `# ${title}

## Contact Info
**Email**: ${data.email || ''}
**Phone**: ${data.phone || ''}
**LinkedIn**: ${data.linkedin || ''}
**Company**: ${data.company || ''}
**Role**: ${data.role || ''}

## Context
How we know each other / why they're important

## Meeting Notes

### ${formatDate()}
-

## Topics of Interest
-

## Related Projects
-

## Follow-ups
- [ ] `
    })
  },

  meeting: {
    subtype: 'meeting',
    emoji: '🤝',
    label: 'Meeting',
    generateContent: (title, data = {}) => ({
      frontmatter: {
        type: 'meeting',
        created: Date.now(),
        modified: Date.now(),
        project: '',
        meeting_date: data.meeting_date || formatDate(),
        attendees: data.attendees || [],
        duration: data.duration || '',
        status: 'scheduled',
        tags: []
      },
      markdown: `# ${title}

## Meeting Details
**Date**: ${data.meeting_date || formatDate()}
**Duration**: ${data.duration || ''}
**Attendees**:
-
**Location/Link**: ${data.location || ''}

## Agenda
-

## Discussion Notes

### Topic 1
-

### Topic 2
-

## Decisions Made
-

## Action Items
- [ ] {{task}} - {{owner}} - {{due_date}}
- [ ]

## Transcript
${data.transcript || ''}

## Follow-up
Next meeting:
Topics to revisit:

## Related
**Previous Meeting**:
**Project**:
**Participants**: `
    })
  }
}

export function generateNoteContent(
  subtype: NoteSubtype,
  title: string,
  additionalData?: Record<string, any>
): { frontmatter: string; content: string } {
  const template = noteTemplates[subtype]
  const { frontmatter, markdown } = template.generateContent(title, additionalData)

  return {
    frontmatter: JSON.stringify(frontmatter),
    content: markdown
  }
}

export function getNoteTemplate(subtype: NoteSubtype): NoteTemplate {
  return noteTemplates[subtype]
}

export function getAllNoteTypes(): NoteTemplate[] {
  return Object.values(noteTemplates)
}

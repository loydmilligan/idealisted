# MarkdownEntityEditor - Implementation Plan

**Task**: Phase 7 Task 7.2
**Date**: 2025-11-17
**Component**: MarkdownEntityEditor Modal

---

## Overview

The MarkdownEntityEditor is a smart form-based modal that allows users to edit markdown entities through a structured form interface instead of raw markdown. It dynamically renders field components based on the template's `field_config` JSON.

**Key Concept**: Users edit via forms, not raw markdown. The editor reads markdown → converts to form fields → user edits → converts back to markdown.

---

## Component Architecture

### Main Component
**File**: `components/modern/MarkdownEntityEditor.tsx`

```typescript
interface MarkdownEntityEditorProps {
  item: Item | null // null for new entities
  template: Template
  onSave: (markdown: string) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}
```

**Responsibilities**:
1. Parse existing markdown (if editing) using `parseMarkdown()`
2. Render field components dynamically based on template.field_config
3. Collect form values from all field components
4. Validate form data
5. Reconstruct markdown using `renderMarkdown()`
6. Call onSave with final markdown string

---

## Field Components

### 1. TextField Component
**File**: `components/ui/markdown-fields/TextField.tsx`

```typescript
interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  readonly?: boolean
}
```

**Renders**: Simple text input with retro styling
**Use Cases**: Task priority, note duration, generic text fields

---

### 2. DateField Component
**File**: `components/ui/markdown-fields/DateField.tsx`

```typescript
interface DateFieldProps {
  label: string
  value: string // ISO date string or empty
  onChange: (value: string) => void
  required?: boolean
}
```

**Renders**: Date picker input (HTML5 date input with retro styling)
**Use Cases**: Task due date, event dates

---

### 3. SelectField Component
**File**: `components/ui/markdown-fields/SelectField.tsx`

```typescript
interface SelectFieldProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  required?: boolean
}
```

**Renders**: Dropdown select with retro styling
**Use Cases**: Task status (Not Started/In Progress/Completed), Priority (Low/Medium/High)

---

### 4. URLField Component
**File**: `components/ui/markdown-fields/URLField.tsx`

```typescript
interface URLFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  validation?: 'youtube' | 'generic'
}
```

**Renders**: Text input with URL validation
**Special**: If validation='youtube', shows YouTube icon and validates format
**Use Cases**: YouTube learning note URL

---

## Section Components

### 1. TextareaSection Component
**File**: `components/ui/markdown-fields/TextareaSection.tsx`

```typescript
interface TextareaSectionProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  readonly?: boolean
  rows?: number
}
```

**Renders**: Multi-line textarea with retro styling
**Use Cases**: Task description, note content, task notes

---

### 2. BulletListSection Component
**File**: `components/ui/markdown-fields/BulletListSection.tsx`

```typescript
interface BulletListSectionProps {
  label: string
  items: string[] // Array of bullet items
  onChange: (items: string[]) => void
  required?: boolean
}
```

**Renders**:
- List of text inputs (one per bullet item)
- "Add Item" button to append new item
- Remove button (X) for each item

**Markdown Conversion**:
- Input: `['Item 1', 'Item 2']`
- Output markdown:
  ```markdown
  ## Section Name
  - Item 1
  - Item 2
  ```

**Use Cases**: YouTube "Key Concepts" section

---

### 3. ChecklistSection Component
**File**: `components/ui/markdown-fields/ChecklistSection.tsx`

```typescript
interface ChecklistSectionProps {
  label: string
  items: Array<{ text: string; checked: boolean }>
  onChange: (items: Array<{ text: string; checked: boolean }>) => void
  required?: boolean
}
```

**Renders**:
- List of checkbox + text input pairs
- Checkboxes are interactive
- "Add Item" button
- Remove button (X) for each item

**Markdown Conversion**:
- Input: `[{text: 'Do this', checked: true}, {text: 'Do that', checked: false}]`
- Output markdown:
  ```markdown
  ## Subtasks
  - [x] Do this
  - [ ] Do that
  ```

**Use Cases**: Task subtasks

---

### 4. TimestampListSection Component
**File**: `components/ui/markdown-fields/TimestampListSection.tsx`

```typescript
interface TimestampListSectionProps {
  label: string
  items: Array<{ timestamp: string; text: string }>
  onChange: (items: Array<{ timestamp: string; text: string }>) => void
  required?: boolean
}
```

**Renders**:
- List of timestamp input + text input pairs
- Timestamp input: `[HH:MM]` format
- "Add Item" button
- Remove button (X) for each item

**Markdown Conversion**:
- Input: `[{timestamp: '05:30', text: 'useState basics'}, {timestamp: '12:15', text: 'useEffect'}]`
- Output markdown:
  ```markdown
  ## Timestamps
  - [05:30] useState basics
  - [12:15] useEffect
  ```

**Use Cases**: YouTube learning note timestamps

---

### 5. TagListSection Component
**File**: `components/ui/markdown-fields/TagListSection.tsx`

```typescript
interface TagListSectionProps {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  required?: boolean
}
```

**Renders**: Tag input component (similar to existing TagInput)
**Use Cases**: Generic note tags

---

## Form State Management

The main MarkdownEntityEditor component manages form state using React hooks:

```typescript
const [formData, setFormData] = useState({
  title: '',
  fields: {} as Record<string, string>,
  sections: {} as Record<string, any>
})
```

**Initialization Flow**:
1. If `item` is provided (editing existing entity):
   - Call `parseMarkdown(item.markdown_content, template.id)`
   - Populate formData with parsed values

2. If `item` is null (creating new entity):
   - Set empty default values
   - Pre-fill required fields with sensible defaults

---

## Validation

Validation happens before saving:

```typescript
function validateForm(): string[] {
  const errors: string[] = []
  const fieldConfig: FieldConfig = JSON.parse(template.field_config)

  // Validate required fields
  if (fieldConfig.fields) {
    for (const [fieldName, fieldDef] of Object.entries(fieldConfig.fields)) {
      if (fieldDef.required && !formData.fields[fieldName]) {
        errors.push(`${fieldName} is required`)
      }
    }
  }

  // Validate required sections
  if (fieldConfig.sections) {
    for (const [sectionName, sectionDef] of Object.entries(fieldConfig.sections)) {
      if (sectionDef.required && !formData.sections[sectionName]) {
        errors.push(`${sectionName} is required`)
      }
    }
  }

  return errors
}
```

---

## Save Flow

When user clicks "Save":

1. **Validate form**:
   ```typescript
   const errors = validateForm()
   if (errors.length > 0) {
     alert(errors.join('\n'))
     return
   }
   ```

2. **Reconstruct markdown**:
   ```typescript
   const reconstructed = renderMarkdown(
     formData.title,
     formData.fields,
     formData.sections,
     template.id
   )
   ```

3. **Call onSave callback**:
   ```typescript
   await onSave(reconstructed)
   ```

---

## Modal UI Structure

```typescript
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div className="retro-overlay" onClick={onCancel} />

      <motion.div className="retro-bottom-sheet">
        <div className="retro-sheet-header">
          <h2>{item ? 'Edit' : 'Create'} {template.name}</h2>
          <button onClick={onCancel}>×</button>
        </div>

        <div className="retro-sheet-content">
          {/* Title Input */}
          <TextField
            label="Title"
            value={formData.title}
            onChange={(value) => setFormData({...formData, title: value})}
            required={true}
          />

          {/* Dynamic Fields */}
          {fieldConfig.fields && Object.entries(fieldConfig.fields).map(([name, def]) => (
            <FieldComponent
              key={name}
              label={name}
              value={formData.fields[name]}
              onChange={(value) => updateField(name, value)}
              {...def}
            />
          ))}

          {/* Dynamic Sections */}
          {fieldConfig.sections && Object.entries(fieldConfig.sections).map(([name, def]) => (
            <SectionComponent
              key={name}
              label={name}
              value={formData.sections[name]}
              onChange={(value) => updateSection(name, value)}
              {...def}
            />
          ))}
        </div>

        <div className="retro-sheet-actions">
          <button className="retro-btn retro-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="retro-btn retro-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

---

## Styling Guidelines

**Retro Theme Integration**:
- Use existing `.retro-input`, `.retro-textarea`, `.retro-select` classes
- Modal uses `.retro-bottom-sheet` with slide-up animation
- Field labels use `.retro-label` (monospace, uppercase)
- Buttons use `.retro-btn-primary` and `.retro-btn-secondary`

**Spacing**:
- Form fields: `margin-bottom: var(--space-md)`
- Section spacing: `margin-top: var(--space-lg)`
- List items: `margin-bottom: var(--space-sm)`

---

## Component Mapping Logic

The main editor dynamically chooses which component to render:

```typescript
function renderField(fieldName: string, fieldDef: FieldDef) {
  switch (fieldDef.type) {
    case 'text':
      return <TextField {...props} />
    case 'date':
      return <DateField {...props} />
    case 'select':
      return <SelectField {...props} options={fieldDef.options} />
    case 'url':
      return <URLField {...props} validation={fieldDef.validation} />
    case 'checkbox':
      return <CheckboxField {...props} />
    default:
      console.warn(`Unknown field type: ${fieldDef.type}`)
      return null
  }
}

function renderSection(sectionName: string, sectionDef: SectionDef) {
  switch (sectionDef.type) {
    case 'textarea':
      return <TextareaSection {...props} />
    case 'bulletlist':
      return <BulletListSection {...props} />
    case 'checklist':
      return <ChecklistSection {...props} />
    case 'timestamplist':
      return <TimestampListSection {...props} />
    case 'taglist':
      return <TagListSection {...props} />
    default:
      console.warn(`Unknown section type: ${sectionDef.type}`)
      return null
  }
}
```

---

## Implementation Order

1. **Main MarkdownEntityEditor Component** - Shell with state management
2. **Simple Field Components** (TextField, DateField, SelectField)
3. **URLField Component** (with YouTube validation)
4. **TextareaSection** (simplest section)
5. **BulletListSection** (dynamic list logic)
6. **ChecklistSection** (checkboxes + list logic)
7. **TimestampListSection** (timestamp validation)
8. **TagListSection** (reuse existing tag input patterns)
9. **Integration Testing** with all 3 templates

---

## Testing Strategy

### Test with Task Template:
- Create new task
- Edit existing task
- Verify Status/Priority select fields work
- Verify Due Date picker works
- Verify Description textarea works
- Verify Subtasks checklist works
- Save and verify markdown reconstruction

### Test with Generic Note Template:
- Create new note
- Edit existing note
- Verify Content textarea works
- Verify Tags taglist works
- Save and verify markdown reconstruction

### Test with YouTube Note Template:
- Create new YouTube note
- Edit existing YouTube note
- Verify URL field with YouTube validation
- Verify Duration text field
- Verify Status select field
- Verify Key Concepts bulletlist
- Verify Timestamps timestamplist
- Verify My Notes textarea
- Save and verify markdown reconstruction

---

## Edge Cases

1. **Empty Sections**: Allow sections to be empty if not required
2. **Readonly Fields**: Render as disabled inputs with grey background
3. **Invalid Field Types**: Log warning, skip rendering
4. **Markdown Parse Failures**: Show error message, don't crash
5. **Validation Failures**: Show error list, don't close modal
6. **Long Lists**: Add scrolling to section containers

---

## Success Criteria

- ✅ Works with all 3 system templates (task, note-generic, note-youtube)
- ✅ Fields render correctly based on field_config
- ✅ Validation prevents saving incomplete required fields
- ✅ Save reconstructs markdown correctly
- ✅ Retro modal styling matches existing modals
- ✅ Form is mobile-responsive
- ✅ No console errors
- ✅ Smooth animations (slide-up/slide-down)

---

## Files to Create

1. `components/modern/MarkdownEntityEditor.tsx` (~300 lines)
2. `components/ui/markdown-fields/TextField.tsx` (~50 lines)
3. `components/ui/markdown-fields/DateField.tsx` (~50 lines)
4. `components/ui/markdown-fields/SelectField.tsx` (~60 lines)
5. `components/ui/markdown-fields/URLField.tsx` (~80 lines)
6. `components/ui/markdown-fields/TextareaSection.tsx` (~60 lines)
7. `components/ui/markdown-fields/BulletListSection.tsx` (~120 lines)
8. `components/ui/markdown-fields/ChecklistSection.tsx` (~150 lines)
9. `components/ui/markdown-fields/TimestampListSection.tsx` (~150 lines)
10. `components/ui/markdown-fields/TagListSection.tsx` (~100 lines)

**Total**: ~1,120 lines of code

---

## Dependencies

**Existing**:
- `lib/markdown-parser.ts` - parseMarkdown(), renderMarkdown()
- `types/index.ts` - Template, FieldConfig types
- `styles/retro.css` - Retro styling classes

**New**:
- None (uses existing dependencies)

---

## Next Steps After Task 7.2

**Task 7.3**: Template Selector - Allow user to choose which template to use
**Task 7.4**: Files Screen Integration - Connect viewer + editor to Files tab

---

**Plan Status**: Ready for Implementation
**Estimated Complexity**: High (10+ components, complex state management)
**Dependencies Met**: ✅ markdown-parser exists, templates seeded

/**
 * Entity Color System - Palm Pilot Modern Design
 *
 * Provides consistent color utilities for entity types with state-based coloring:
 * - Unsorted ideas: Grey
 * - Ready to convert (sorted): Muted entity color (40% opacity)
 * - Converted entities: Bright entity color
 */

export type EntityType = 'task' | 'project' | 'list' | 'note' | 'idea'
export type ColorState = 'bright' | 'muted' | 'grey'

// Palm Pilot Modern Color Palette
const ENTITY_COLORS: Record<Exclude<EntityType, 'idea'>, string> = {
  task: '#4A90E2',     // Blue
  note: '#F5A623',     // Yellow/Orange
  project: '#7ED321',  // Green
  list: '#BD10E0',     // Purple
}

const IDEA_GREY = '#868e96'
export const AI_TINGE_COLOR = '#6EC5FF'
export const AI_TINGE_OPACITY = 0.3
export const MUTED_OPACITY = 0.4

// Design System Colors
export const COLORS = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  delete: '#E74C3C',
  badge: '#DC3545',
  aiTinge: AI_TINGE_COLOR,
}

/**
 * Get the color for an entity type based on its state
 * @param entityType - The type of entity
 * @param state - The color state (bright for converted, muted for ready, grey for unsorted)
 * @returns Hex or RGBA color string
 */
export function getEntityColor(
  entityType: EntityType | null | undefined,
  state: ColorState = 'bright'
): string {
  if (!entityType || entityType === 'idea') {
    return IDEA_GREY
  }

  if (state === 'grey') {
    return IDEA_GREY
  }

  const color = ENTITY_COLORS[entityType]
  if (!color) return IDEA_GREY

  if (state === 'muted') {
    return hexToRgba(color, MUTED_OPACITY)
  }

  return color
}

/**
 * Get background color with opacity for an entity
 * @param entityType - The type of entity
 * @param state - The color state
 * @param opacity - Opacity value (0-1), defaults to 0.1
 * @returns RGBA color string
 */
export function getEntityBackgroundColor(
  entityType: EntityType | null | undefined,
  state: ColorState = 'bright',
  opacity: number = 0.1
): string {
  const color = getEntityColor(entityType, state)
  return hexToRgba(color, opacity)
}

/**
 * Get border color for an entity
 * @param entityType - The type of entity
 * @param state - The color state
 * @returns Hex color string
 */
export function getEntityBorderColor(
  entityType: EntityType | null | undefined,
  state: ColorState = 'bright'
): string {
  return getEntityColor(entityType, state)
}

/**
 * Get tint color for Quick Add buttons
 * @param entityType - The type of entity
 * @returns Hex color string (always uses bright variant)
 */
export function getQuickAddButtonColor(entityType: EntityType): string {
  if (entityType === 'idea') {
    return IDEA_GREY
  }
  const color = ENTITY_COLORS[entityType]
  return color || IDEA_GREY
}

/**
 * Convert hex color to RGBA
 * @param hex - Hex color string (e.g., '#845ef7')
 * @param alpha - Alpha value (0-1)
 * @returns RGBA color string
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Get color state based on item properties
 * @param sorted - Whether the item has been sorted/ready to convert
 * @param converted - Whether the item has been converted to an entity
 * @returns The appropriate color state
 */
export function getItemColorState(sorted: boolean, converted: boolean): ColorState {
  if (converted) return 'bright'
  if (sorted) return 'muted'
  return 'grey'
}

/**
 * Get entity color with custom opacity
 * @param entityType - The type of entity
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export function getEntityColorWithOpacity(
  entityType: EntityType,
  opacity: number
): string {
  if (entityType === 'idea') {
    return hexToRgba(IDEA_GREY, opacity)
  }

  const color = ENTITY_COLORS[entityType]
  return color ? hexToRgba(color, opacity) : hexToRgba(IDEA_GREY, opacity)
}

/**
 * Get muted entity color (40% opacity)
 * @param entityType - The type of entity
 * @returns RGBA color string
 */
export function getMutedEntityColor(entityType: EntityType): string {
  return getEntityColorWithOpacity(entityType, MUTED_OPACITY)
}

/**
 * Default tag colors palette
 * Used for tag management UI
 */
export const DEFAULT_TAG_COLORS = [
  '#4A90E2', // Blue (task)
  '#F5A623', // Yellow/Orange (note)
  '#7ED321', // Green (project)
  '#BD10E0', // Purple (list)
  '#868e96', // Grey (idea)
  '#E74C3C', // Red
  '#3498DB', // Light Blue
  '#2ECC71', // Emerald
  '#F39C12', // Orange
  '#9B59B6', // Violet
]

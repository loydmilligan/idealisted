/**
 * Entity Color System
 *
 * Provides consistent color utilities for entity types with state-based coloring:
 * - Unsorted ideas: Grey-blue
 * - Sorted ideas: Pastel colors
 * - Converted entities: Bright colors
 */

export type EntityType = 'task' | 'project' | 'list' | 'note' | 'idea'
export type ColorState = 'bright' | 'pastel' | 'grey'

interface EntityColors {
  bright: string
  pastel: string
}

const ENTITY_COLORS: Record<Exclude<EntityType, 'idea'>, EntityColors> = {
  task: {
    bright: '#845ef7',  // Purple/Violet
    pastel: '#d0bfff'
  },
  project: {
    bright: '#4dabf7',  // Blue
    pastel: '#a5d8ff'
  },
  list: {
    bright: '#51cf66',  // Green
    pastel: '#b2f2bb'
  },
  note: {
    bright: '#ffd43b',  // Yellow/Gold
    pastel: '#ffec99'
  }
}

const IDEA_GREY = '#868e96'

/**
 * Get the color for an entity type based on its state
 * @param entityType - The type of entity
 * @param state - The color state (bright for converted, pastel for sorted, grey for unsorted)
 * @returns Hex color string
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

  const colors = ENTITY_COLORS[entityType]
  return colors ? colors[state] : IDEA_GREY
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
  const colors = ENTITY_COLORS[entityType]
  return colors ? colors.bright : IDEA_GREY
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
 * @param sorted - Whether the item has been sorted
 * @param converted - Whether the item has been converted to an entity
 * @returns The appropriate color state
 */
export function getItemColorState(sorted: boolean, converted: boolean): ColorState {
  if (converted) return 'bright'
  if (sorted) return 'pastel'
  return 'grey'
}

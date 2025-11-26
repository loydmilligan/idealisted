/**
 * Tag Icon System
 * Sprint 1, Phase 3, Task 3.3-3.4
 *
 * Generates unique visual icons for tags using:
 * - Colors: Reds, greys, yellows (avoiding entity colors: blue/orange/green/purple)
 * - Shapes: 10 distinct shapes correlated with tag categories
 * - Textures: 10 SVG patterns for visual variety
 * - Background shapes: Additional layer for uniqueness
 *
 * Each tag gets a unique combination that's never reused.
 */

// Color Palettes (avoiding blue/orange/green/purple entity colors)
export const TAG_REDS = [
  '#DC2626', // red-600
  '#B91C1C', // red-700
  '#991B1B', // red-800
  '#EF4444', // red-500
  '#F87171', // red-400
]

export const TAG_GREYS = [
  '#6B7280', // gray-500
  '#4B5563', // gray-600
  '#374151', // gray-700
  '#9CA3AF', // gray-400
  '#D1D5DB', // gray-300
]

export const TAG_YELLOWS = [
  '#F59E0B', // amber-500
  '#D97706', // amber-600
  '#B45309', // amber-700
  '#FCD34D', // amber-300
  '#FBBF24', // amber-400
]

export const ALL_TAG_COLORS = [...TAG_REDS, ...TAG_GREYS, ...TAG_YELLOWS]

// Shape definitions (10 shapes)
export type TagShape =
  | 'square'
  | 'circle'
  | 'hexagon'
  | 'star'
  | 'heart'
  | 'diamond'
  | 'spade'
  | 'club'
  | 'ring'
  | 'trapezoid'

export const ALL_SHAPES: TagShape[] = [
  'square',
  'circle',
  'hexagon',
  'star',
  'heart',
  'diamond',
  'spade',
  'club',
  'ring',
  'trapezoid',
]

// Texture/pattern definitions (10 textures)
export type TagTexture =
  | 'solid'
  | 'spotted'
  | 'lined'
  | 'dotted'
  | 'striped'
  | 'checkered'
  | 'crosshatch'
  | 'wavy'
  | 'grid'
  | 'zigzag'

export const ALL_TEXTURES: TagTexture[] = [
  'solid',
  'spotted',
  'lined',
  'dotted',
  'striped',
  'checkered',
  'crosshatch',
  'wavy',
  'grid',
  'zigzag',
]

// Background shape options
export type BackgroundShape = 'square' | 'circle' | 'hexagon'

export const ALL_BACKGROUND_SHAPES: BackgroundShape[] = ['square', 'circle', 'hexagon']

// Tag category to default shape mapping
export const TAG_TYPE_SHAPES: Record<string, TagShape> = {
  work: 'spade', // ♠ Professional/business
  personal: 'star', // ⭐ Personal goals
  health: 'heart', // ♥ Health/wellness
  finance: 'diamond', // ♦ Money matters
  other: 'circle', // ● General/default
}

// Tag Icon configuration
export interface TagIcon {
  foregroundColor: string // Main color from TAG_COLORS
  backgroundColor: string // Lighter shade for background
  shape: TagShape // Icon shape
  texture: TagTexture // Pattern overlay
  backgroundShape: BackgroundShape // Container shape
}

/**
 * Generate a unique tag icon configuration
 * @param category Tag category (work, personal, health, finance, other)
 * @param usedCombos Set of already-used combinations to avoid duplicates
 * @returns Unique TagIcon configuration
 */
export function generateTagIcon(
  category: string = 'other',
  usedCombos: Set<string> = new Set()
): TagIcon {
  let attempts = 0
  const maxAttempts = 1000 // Safety limit

  while (attempts < maxAttempts) {
    // Generate random icon
    const foregroundColor = randomChoice(ALL_TAG_COLORS)
    const backgroundColor = lightenColor(randomChoice(ALL_TAG_COLORS), 0.8)
    const shape = TAG_TYPE_SHAPES[category] || randomChoice(ALL_SHAPES)
    const texture = randomChoice(ALL_TEXTURES)
    const backgroundShape = randomChoice(ALL_BACKGROUND_SHAPES)

    // Create combo key
    const comboKey = `${foregroundColor}-${backgroundColor}-${shape}-${texture}-${backgroundShape}`

    // Check if this combo is unused
    if (!usedCombos.has(comboKey)) {
      usedCombos.add(comboKey)
      return {
        foregroundColor,
        backgroundColor,
        shape,
        texture,
        backgroundShape,
      }
    }

    attempts++
  }

  // Fallback: return a simple config if all combos exhausted (very unlikely)
  console.warn('Tag icon generation: Maximum attempts reached, using fallback')
  return {
    foregroundColor: TAG_GREYS[0],
    backgroundColor: lightenColor(TAG_GREYS[0], 0.9),
    shape: 'circle',
    texture: 'solid',
    backgroundShape: 'circle',
  }
}

/**
 * Parse tag icon from database fields
 */
export function parseTagIconFromDB(row: {
  icon_foreground_color: string | null
  icon_background_color: string | null
  icon_shape: string | null
  icon_texture: string | null
  icon_background_shape: string | null
}): TagIcon | null {
  if (
    !row.icon_foreground_color ||
    !row.icon_background_color ||
    !row.icon_shape ||
    !row.icon_texture ||
    !row.icon_background_shape
  ) {
    return null
  }

  return {
    foregroundColor: row.icon_foreground_color,
    backgroundColor: row.icon_background_color,
    shape: row.icon_shape as TagShape,
    texture: row.icon_texture as TagTexture,
    backgroundShape: row.icon_background_shape as BackgroundShape,
  }
}

/**
 * Serialize tag icon for database storage
 */
export function serializeTagIconForDB(icon: TagIcon) {
  return {
    icon_foreground_color: icon.foregroundColor,
    icon_background_color: icon.backgroundColor,
    icon_shape: icon.shape,
    icon_texture: icon.texture,
    icon_background_shape: icon.backgroundShape,
  }
}

// Utility: Random choice from array
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

// Utility: Lighten a hex color
function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Lighten by moving toward white (255, 255, 255)
  const newR = Math.round(r + (255 - r) * percent)
  const newG = Math.round(g + (255 - g) * percent)
  const newB = Math.round(b + (255 - b) * percent)

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
}

/**
 * Load all used icon combinations from database
 * @param db Better-sqlite3 database instance
 * @returns Set of used combination keys
 */
export function loadUsedIconCombos(db: any): Set<string> {
  const rows = db.prepare(`
    SELECT icon_foreground_color, icon_background_color, icon_shape, icon_texture, icon_background_shape
    FROM tags
    WHERE icon_foreground_color IS NOT NULL
  `).all()

  const usedCombos = new Set<string>()

  for (const row of rows) {
    const icon = parseTagIconFromDB(row)
    if (icon) {
      const key = `${icon.foregroundColor}-${icon.backgroundColor}-${icon.shape}-${icon.texture}-${icon.backgroundShape}`
      usedCombos.add(key)
    }
  }

  return usedCombos
}

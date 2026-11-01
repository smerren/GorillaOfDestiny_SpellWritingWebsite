/**
 * Inks.
 *
 * The default single colour is the oxblood the dictionaries are printed in,
 * sampled from the PDF itself.
 *
 * Layer inks go by k rather than by attribute name, so a scheme of the author's
 * own invention is coloured as readily as the 5e one: the first layer is always
 * oxblood, the second teal, and so on. They are a reading aid, not part of the
 * notation, and are picked to sit together on parchment.
 */

export const INK = '#8b0000'
export const SCAFFOLD_INK = '#8a7a5c'

/** Plates carry their own ground, so they export as a finished page. */
export const PARCHMENT = '#ece0c4'
export const GOLD = '#a98b46'
export const TEXT_INK = '#3a2d1c'

export const LAYER_INKS: readonly string[] = [
  '#8b0000', // oxblood
  '#1f4e5f', // deep teal
  '#a6611a', // burnt sienna
  '#4b3869', // iron gall
  '#2f5d2f', // verdigris
  '#7d1f4f', // madder
  '#3c4f7a', // indigo
]

/** The ink for the layer drawn with chords of length k. */
export function layerInk(k: number): string {
  return LAYER_INKS[(Math.max(1, k) - 1) % LAYER_INKS.length]
}

/** Single-colour choices offered beside the picker, all legible on parchment. */
export const INK_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '#8b0000', label: 'Oxblood' },
  { value: '#2a1a10', label: 'Iron gall' },
  { value: '#1f4e5f', label: 'Deep teal' },
  { value: '#4b3869', label: 'Violet' },
  { value: '#2f5d2f', label: 'Verdigris' },
  { value: '#a6611a', label: 'Sienna' },
]

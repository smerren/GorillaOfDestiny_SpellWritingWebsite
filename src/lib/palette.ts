/**
 * Inks.
 *
 * The default is the oxblood the dictionaries are printed in, sampled from the
 * PDF itself. The per-attribute inks are for the "tint by attribute" view,
 * which is a reading aid rather than part of the notation — they are picked to
 * sit together on parchment rather than to signify anything.
 */

import type { AttributeId } from './keys'

export const INK = '#8b0000'
export const SCAFFOLD_INK = '#8a7a5c'

export const ATTRIBUTE_INK: Record<AttributeId, string> = {
  level: '#8b0000',
  school: '#1f4e5f',
  damage: '#a6611a',
  area: '#4b3869',
  range: '#2f5d2f',
}

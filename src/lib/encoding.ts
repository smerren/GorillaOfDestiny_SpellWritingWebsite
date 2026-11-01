/**
 * Turning a spell's attributes into chords.
 *
 * Section 3: read the binary number left to right; where bit i is 1, connect
 * vertex i to the vertex k steps along. Each attribute uses its own k, so the
 * layers stack into one figure without ever sharing an edge.
 */

import { cyclicUniques } from './binary'
import { ATTRIBUTES, type Attribute, type SpellAttributes } from './keys'

export interface Chord {
  readonly from: number
  readonly to: number
  readonly k: number
  readonly attribute: Attribute
}

export interface Layer {
  readonly attribute: Attribute
  readonly feature: string
  readonly bits: string
  readonly chords: readonly Chord[]
}

/** The binary number a single feature is written with, or all-zeroes if unknown. */
export function bitsFor(attribute: Attribute, feature: string, sides: number): string {
  const position = attribute.features.indexOf(feature)
  const uniques = cyclicUniques(sides)
  if (position < 0) return uniques[0]
  return uniques[position + attribute.indexOffset] ?? uniques[0]
}

/** The chords one attribute contributes. */
export function chordsFor(attribute: Attribute, bits: string, sides: number): Chord[] {
  const out: Chord[] = []
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== '1') continue
    out.push({
      from: i,
      to: (i + attribute.k) % sides,
      k: attribute.k,
      attribute,
    })
  }
  return out
}

/** Every layer of a spell, in attribute order. */
export function encodeSpell(
  spell: SpellAttributes,
  sides: number,
  attributes: readonly Attribute[] = ATTRIBUTES,
): Layer[] {
  return attributes.map((attribute) => {
    const feature = spell[attribute.id] ?? attribute.features[0]
    const bits = bitsFor(attribute, feature, sides)
    return { attribute, feature, bits, chords: chordsFor(attribute, bits, sides) }
  })
}

/**
 * Read a rune back: for each attribute, which feature matches these chords.
 *
 * The inverse of encodeSpell, used by the decoder view to prove a drawing is
 * unambiguous.
 */
export function decodeBits(attribute: Attribute, bits: string, sides: number): string | null {
  const uniques = cyclicUniques(sides)
  const index = uniques.indexOf(bits)
  if (index < 0) return null
  const position = index - attribute.indexOffset
  return attribute.features[position] ?? null
}

/** Every chord the base could carry, used to draw the faint scaffold. */
export function scaffoldChords(
  sides: number,
  attributes: readonly Attribute[] = ATTRIBUTES,
): Chord[] {
  const out: Chord[] = []
  for (const attribute of attributes) {
    if (attribute.k > Math.floor(sides / 2)) continue
    for (let i = 0; i < sides; i++) {
      out.push({ from: i, to: (i + attribute.k) % sides, k: attribute.k, attribute })
    }
  }
  return out
}

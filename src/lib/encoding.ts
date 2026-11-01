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
  /**
   * The feature this layer spells, or null when it spells none.
   *
   * Drawing by hand can land on a number that is cyclically unique but outside
   * the attribute's list — a legible symbol with nothing to say. The notation
   * allows it, so the model does too.
   */
  readonly feature: string | null
  /** A name the author gave these bits, when the list has no word for them. */
  readonly named: string | null
  readonly bits: string
  readonly chords: readonly Chord[]
}

/** Whatever this layer should be called, if anything. */
export function labelOf(layer: Layer): string | null {
  return layer.feature ?? layer.named
}


/** A whole figure: what is drawn, on how many nodes, under which attributes. */
export interface Figure {
  readonly sides: number
  readonly attributes: readonly Attribute[]
  readonly layers: readonly Layer[]
}

/** Which bits each attribute is currently drawn with. */
export type Bits = Record<string, string>

export function figureFromBits(
  bits: Bits,
  sides: number,
  attributes: readonly Attribute[] = ATTRIBUTES,
): Figure {
  const layers = attributes.map((attribute) => {
    const written = bits[attribute.id] ?? '0'.repeat(sides)
    const padded = written.length === sides ? written : '0'.repeat(sides)
    const feature = decodeBits(attribute, padded, sides)
    return {
      attribute,
      feature,
      named: feature === null ? keptNameOf(attribute, padded) : null,
      bits: padded,
      chords: chordsFor(attribute, padded, sides),
    }
  })
  return { sides, attributes, layers }
}

export function figureFromSpell(
  spell: SpellAttributes,
  sides: number,
  attributes: readonly Attribute[] = ATTRIBUTES,
): Figure {
  return { sides, attributes, layers: encodeSpell(spell, sides, attributes) }
}

export function bitsOf(figure: Figure): Bits {
  return Object.fromEntries(figure.layers.map((l) => [l.attribute.id, l.bits]))
}

/**
 * Which attribute owns the chord between two nodes, and which end it starts
 * from. Null when no attribute is drawn with chords of that length.
 */
export function chordOwner(
  attributes: readonly Attribute[],
  sides: number,
  a: number,
  b: number,
): { attribute: Attribute; from: number } | null {
  if (a === b) return null
  const step = (b - a + sides) % sides
  const k = Math.min(step, sides - step)
  const attribute = attributes.find((x) => x.k === k)
  if (!attribute) return null
  return { attribute, from: (a + k) % sides === b ? a : b }
}

/** Turn one chord on or off, leaving every other layer alone. */
export function toggleChord(figure: Figure, a: number, b: number): Bits | null {
  const owner = chordOwner(figure.attributes, figure.sides, a, b)
  if (!owner) return null
  const bits = bitsOf(figure)
  const current = bits[owner.attribute.id]
  const flipped =
    current.slice(0, owner.from) +
    (current[owner.from] === '1' ? '0' : '1') +
    current.slice(owner.from + 1)
  return { ...bits, [owner.attribute.id]: flipped }
}

/** Every layer blank, which draws nothing. */
export function emptyBits(sides: number, attributes: readonly Attribute[]): Bits {
  return Object.fromEntries(attributes.map((a) => [a.id, '0'.repeat(sides)]))
}

/** The binary number a single feature is written with, or all-zeroes if unknown. */
export function bitsFor(attribute: Attribute, feature: string, sides: number): string {
  const uniques = cyclicUniques(sides)
  const kept = attribute.kept?.find((k) => k.name === feature)
  // A kept shape was drawn before it was named, so it keeps its own bits.
  if (kept) return kept.bits.length === sides ? kept.bits : uniques[0]
  const position = attribute.features.indexOf(feature)
  if (position < 0) return uniques[0]
  return uniques[position + attribute.indexOffset] ?? uniques[0]
}

/** The name the author gave this shape, if they kept it. */
export function keptNameOf(attribute: Attribute, bits: string): string | null {
  return attribute.kept?.find((k) => k.bits === bits)?.name ?? null
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
    return { attribute, feature, named: null, bits, chords: chordsFor(attribute, bits, sides) }
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

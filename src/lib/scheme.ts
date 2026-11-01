/**
 * Schemes: which attributes a rune encodes.
 *
 * The notation never cared that there were five attributes or that they were
 * D&D's. Any set of attributes works so long as each has a finite list of
 * features, which is the one limitation the guide names. This is what lets a
 * caster — or a different game entirely — write in the same hand.
 */

import { cyclicUniques, minimumSides, uniqueCount } from './binary'
import { ATTRIBUTES, DEFAULT_SIDES, type Attribute, type SpellAttributes } from './keys'
import { namedFor, type NamedLibrary } from './named'

export interface Scheme {
  readonly id: string
  readonly name: string
  readonly sides: number
  readonly attributes: readonly Attribute[]
}

/** What the user edits: the derived parts (k, the blank, ids) are computed. */
export interface DraftAttribute {
  readonly id: string
  readonly label: string
  /** One feature per line, as typed. */
  readonly features: string
}

export interface Draft {
  readonly name: string
  /** null follows the minimum for the attribute count. */
  readonly sides: number | null
  readonly attributes: readonly DraftAttribute[]
}

/** Every scheme reserves index 0 for "nothing here", which draws no lines. */
export const BLANK = '—'

export const FIVE_E: Scheme = {
  id: '5e',
  name: 'Dungeons & Dragons 5e',
  sides: DEFAULT_SIDES,
  attributes: ATTRIBUTES,
}

export function parseFeatures(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split('\n')) {
    const value = line.trim()
    if (!value || value === BLANK || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

/**
 * How many features of your own a base of this size can carry.
 *
 * One of its symbols is always the blank, so this is one fewer than the number
 * of cyclically unique numbers.
 */
export function capacityOf(sides: number): number {
  return uniqueCount(sides) - 1
}

/**
 * Enumerating the symbols means walking 2^n numbers, so the automatic size
 * stops here. Thirteen nodes already carry 631 features per attribute.
 */
export const MAX_AUTO_SIDES = 15

/**
 * The smallest base this scheme fits on.
 *
 * Section 2.1 sets two floors and the guide names both: n >= 2 x attributes + 1
 * so no two layers share an edge, and enough unique symbols for "the largest
 * length of any attribute list". Taking only the first would quietly alias an
 * overflowing feature onto the blank.
 */
export function sidesFor(draft: Draft): number {
  if (draft.sides !== null) return draft.sides

  const wanted = draft.attributes.reduce(
    (most, a) => Math.max(most, parseFeatures(a.features).length),
    0,
  )
  let sides = minimumSides(Math.max(1, draft.attributes.length))
  while (sides < MAX_AUTO_SIDES && capacityOf(sides) < wanted) sides += 1
  return sides
}

/**
 * Turn what the user typed into a scheme.
 *
 * Position in the list is the symbol, so the blank goes first and the rest
 * follow in the order they were written — reordering them rewrites every rune,
 * which is the author's business rather than ours to sort alphabetically.
 */
export function compile(draft: Draft): Scheme {
  const sides = sidesFor(draft)
  return {
    id: 'custom',
    name: draft.name.trim() || 'Untitled scheme',
    sides,
    attributes: draft.attributes.map((attribute, i) => ({
      id: attribute.id as Attribute['id'],
      label: attribute.label.trim() || `Attribute ${i + 1}`,
      k: i + 1,
      features: [BLANK, ...parseFeatures(attribute.features)],
      indexOffset: 0,
    })),
  }
}

export interface Problem {
  readonly attributeId: string | null
  readonly message: string
}

/** Everything that would make a scheme unreadable, in the order worth fixing. */
export function problems(draft: Draft): Problem[] {
  const out: Problem[] = []
  const sides = sidesFor(draft)
  const capacity = uniqueCount(sides)
  const halfway = Math.floor(sides / 2)

  if (draft.attributes.length === 0) {
    out.push({ attributeId: null, message: 'Add an attribute to begin.' })
    return out
  }

  if (draft.attributes.length > halfway) {
    out.push({
      attributeId: null,
      message:
        `${draft.attributes.length} attributes need at least ` +
        `${minimumSides(draft.attributes.length)} nodes. On ${sides}, two of them would ` +
        'have to be drawn with the same lines, and the rune could not be read back.',
    })
  }

  draft.attributes.forEach((attribute, i) => {
    const features = parseFeatures(attribute.features)
    if (features.length === 0) {
      out.push({
        attributeId: attribute.id,
        message: 'No features yet, so this attribute draws nothing.',
      })
    }
    // The blank at index 0 takes one of the available numbers.
    if (features.length + 1 > capacity) {
      out.push({
        attributeId: attribute.id,
        message:
          `${sides} nodes hold ${capacityOf(sides)} features, and this has ` +
          `${features.length}. Remove some, or give the scheme more nodes.`,
      })
    }
    if (i + 1 > halfway) {
      out.push({
        attributeId: attribute.id,
        message:
          `This attribute is drawn with lines ${i + 1} steps long, more than half of ` +
          `${sides}, so its symbols would repeat when the rune is turned round.`,
      })
    }
  })

  return out
}

/** The symbol a feature would be written with, for the editor's preview. */
export function symbolFor(scheme: Scheme, attribute: Attribute, feature: string): string {
  const position = attribute.features.indexOf(feature)
  return cyclicUniques(scheme.sides)[Math.max(0, position)] ?? ''
}

/** A spell with every attribute left blank. */
export function blankSpell(scheme: Scheme): SpellAttributes {
  const out: Record<string, string> = {}
  for (const attribute of scheme.attributes) out[attribute.id] = attribute.features[0]
  return out as SpellAttributes
}

export function newAttributeId(): string {
  return `a${Math.random().toString(36).slice(2, 9)}`
}

export const STARTER: Draft = {
  name: 'My scheme',
  sides: null,
  attributes: [
    {
      id: newAttributeId(),
      label: 'Element',
      features: 'Fire\nWater\nEarth\nAir\nAether',
    },
    {
      id: newAttributeId(),
      label: 'Intent',
      features: 'Ward\nSummon\nBind\nUnmake',
    },
    {
      id: newAttributeId(),
      label: 'Cost',
      features: 'Breath\nBlood\nMemory\nYears',
    },
  ],
}

const STORAGE_KEY = 'spell-writing:scheme'

/**
 * Browser storage is per-viewer and can throw outright in a private window, so
 * a failure here loses a draft and nothing more.
 */
export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Draft
    if (!Array.isArray(parsed?.attributes)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // Nothing to do: the draft stays in memory for this session.
  }
}

/**
 * Fold the shapes the author has named into the scheme they were named under.
 *
 * A kept shape is a feature of its attribute like any other — it shows in the
 * dropdown, reads back by name, and prints on a plate. What it does not do is
 * take a place in the published list, because a feature's place in that list
 * is its symbol, and this one already has one.
 */
export function withKept(scheme: Scheme, library: NamedLibrary): Scheme {
  return {
    ...scheme,
    attributes: scheme.attributes.map((attribute) => {
      const kept = namedFor(library, scheme.id, attribute.id, scheme.sides).map((entry) => ({
        name: entry.name,
        bits: entry.bits,
      }))
      return kept.length > 0 ? { ...attribute, kept } : attribute
    }),
  }
}

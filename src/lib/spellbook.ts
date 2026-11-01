/**
 * The author's own spellbook.
 *
 * A kept spell is the lines themselves — bits per attribute — rather than a
 * list of chosen features, for the same reason a figure is: a spell drawn by
 * hand can say something no feature names. Copying a spell out of the
 * published dictionary stores its lines too, so a favourite survives even if
 * the author later renames the shapes it was written with.
 *
 * Spells are kept per scheme and per dot count, because the same bits drawn
 * under a different scheme are a different spell entirely.
 */

import type { Bits } from './encoding'

export interface SavedSpell {
  readonly id: string
  /** The scheme it was written under. */
  readonly scheme: string
  readonly sides: number
  readonly name: string
  readonly bits: Bits
  /** Set when this was copied from the published dictionary. */
  readonly fromDictionary?: boolean
}

export type Spellbook = readonly SavedSpell[]

const STORAGE_KEY = 'spell-writing:spellbook'

/** Stable id for a dictionary spell, so favouriting one twice is idempotent. */
export function dictionaryId(scheme: string, name: string): string {
  return `srd:${scheme}:${name}`
}

export function newSpellId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function sameShape(a: Bits, b: Bits): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    const left = a[key] ?? ''
    const right = b[key] ?? ''
    // A layer that draws nothing and a layer that is absent are the same spell.
    if (left.replace(/0/g, '') === '' && right.replace(/0/g, '') === '') continue
    if (left !== right) return false
  }
  return true
}

/** Everything kept for one scheme, newest last. */
export function spellsFor(book: Spellbook, scheme: string, sides: number): SavedSpell[] {
  return book.filter((s) => s.scheme === scheme && s.sides === sides)
}

/** The kept spell drawn exactly like this, if there is one. */
export function findByShape(
  book: Spellbook,
  scheme: string,
  sides: number,
  bits: Bits,
): SavedSpell | null {
  return (
    spellsFor(book, scheme, sides).find((s) => sameShape(s.bits, bits)) ?? null
  )
}

export function keep(book: Spellbook, spell: SavedSpell): SavedSpell[] {
  const name = spell.name.trim()
  if (!name) return [...book]
  const without = book.filter((s) => s.id !== spell.id)
  return [...without, { ...spell, name }]
}

export function drop(book: Spellbook, id: string): SavedSpell[] {
  return book.filter((s) => s.id !== id)
}

export function rename(book: Spellbook, id: string, name: string): SavedSpell[] {
  const trimmed = name.trim()
  if (!trimmed) return [...book]
  return book.map((s) => (s.id === id ? { ...s, name: trimmed } : s))
}

/**
 * Browser storage is per-viewer and can throw outright in a private window, so
 * a failure here costs the spellbook and nothing else.
 */
export function loadSpellbook(): SavedSpell[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is SavedSpell =>
        typeof s?.id === 'string' &&
        typeof s?.scheme === 'string' &&
        typeof s?.sides === 'number' &&
        typeof s?.name === 'string' &&
        s?.bits !== null &&
        typeof s?.bits === 'object',
    )
  } catch {
    return []
  }
}

export function saveSpellbook(book: Spellbook): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
  } catch {
    // Nothing to do: the spellbook stays in memory for this session.
  }
}

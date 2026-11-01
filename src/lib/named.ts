/**
 * Symbols the author has named.
 *
 * A figure drawn by hand can land on a number that is cyclically unique but
 * outside its attribute's list — legible notation with no word for it. Naming
 * one keeps it, so it can be chosen again from the dropdown like any feature.
 *
 * This module is the store. `withKept` in scheme.ts folds what is here into
 * the scheme the shapes were named under, where they become features of their
 * attribute like any other.
 *
 * What they never become is an entry in the attribute's published list.
 * Position in that list *is* the symbol, so appending to it would hand the new
 * name somebody else's shape and quietly rewrite every rune after it. A kept
 * shape carries its own bits instead, because the shape came first.
 */

export interface NamedSymbol {
  /** Which scheme it was written under: its attributes and node count. */
  readonly scheme: string
  readonly attribute: string
  /** Bits are only meaningful for the base they were drawn on. */
  readonly sides: number
  readonly bits: string
  readonly name: string
}

export type NamedLibrary = readonly NamedSymbol[]

const STORAGE_KEY = 'spell-writing:named'

function matches(entry: NamedSymbol, scheme: string, attribute: string, sides: number): boolean {
  return entry.scheme === scheme && entry.attribute === attribute && entry.sides === sides
}

/** The name given to these bits, if there is one. */
export function nameOf(
  library: NamedLibrary,
  scheme: string,
  attribute: string,
  sides: number,
  bits: string,
): string | null {
  const hit = library.find((e) => matches(e, scheme, attribute, sides) && e.bits === bits)
  return hit?.name ?? null
}

/** Everything named for one attribute, in the order it was named. */
export function namedFor(
  library: NamedLibrary,
  scheme: string,
  attribute: string,
  sides: number,
): NamedSymbol[] {
  return library.filter((e) => matches(e, scheme, attribute, sides))
}

export function remember(library: NamedLibrary, entry: NamedSymbol): NamedSymbol[] {
  const name = entry.name.trim()
  if (!name) return [...library]
  // One name per shape: naming the same shape again renames it.
  const without = library.filter(
    (e) => !(matches(e, entry.scheme, entry.attribute, entry.sides) && e.bits === entry.bits),
  )
  return [...without, { ...entry, name }]
}

export function forget(library: NamedLibrary, entry: NamedSymbol): NamedSymbol[] {
  return library.filter(
    (e) =>
      !(matches(e, entry.scheme, entry.attribute, entry.sides) && e.bits === entry.bits),
  )
}

/**
 * Browser storage is per-viewer and can throw outright in a private window, so
 * a failure here costs the saved names and nothing else.
 */
export function loadNames(): NamedSymbol[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is NamedSymbol =>
        typeof e?.scheme === 'string' &&
        typeof e?.attribute === 'string' &&
        typeof e?.sides === 'number' &&
        typeof e?.bits === 'string' &&
        typeof e?.name === 'string',
    )
  } catch {
    return []
  }
}

export function saveNames(library: NamedLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
  } catch {
    // Nothing to do: the names stay in memory for this session.
  }
}

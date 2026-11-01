/**
 * Naming a symbol that was drawn rather than chosen.
 *
 * The point of care here is that a name must never become an entry in an
 * attribute's feature list. Position in that list is the symbol, so appending
 * would hand the new name somebody else's shape.
 */

import { describe, expect, it } from 'vitest'

import {
  bitsFor,
  bitsOf,
  emptyBits,
  figureFromBits,
  figureFromSpell,
  labelOf,
  toggleChord,
} from '../src/lib/encoding'
import { ATTRIBUTES, ATTRIBUTE_BY_ID, DEFAULT_SIDES } from '../src/lib/keys'
import { forget, nameOf, namedFor, remember, resolver, type NamedLibrary } from '../src/lib/named'

const N = DEFAULT_SIDES
const SCHEME = '5e'
const blank = () => emptyBits(N, ATTRIBUTES)

/** A shape outside the school list: cyclically unique, but far past the end. */
const ODD = '01010101011'

const entry = (bits: string, name: string, attribute = 'school') => ({
  scheme: SCHEME,
  attribute,
  sides: N,
  bits,
  name,
})

describe('remembering a symbol', () => {
  it('reads back the name it was given', () => {
    const library = remember([], entry(ODD, 'Hedge-witchery'))
    expect(nameOf(library, SCHEME, 'school', N, ODD)).toBe('Hedge-witchery')
  })

  it('trims the name, and ignores one that is only spaces', () => {
    expect(remember([], entry(ODD, '  Runic  '))[0].name).toBe('Runic')
    expect(remember([], entry(ODD, '   '))).toEqual([])
  })

  it('renames rather than piling up duplicates', () => {
    let library: NamedLibrary = remember([], entry(ODD, 'First'))
    library = remember(library, entry(ODD, 'Second'))
    expect(library).toHaveLength(1)
    expect(nameOf(library, SCHEME, 'school', N, ODD)).toBe('Second')
  })

  it('keeps names apart by attribute, scheme and node count', () => {
    let library: NamedLibrary = remember([], entry(ODD, 'Of schools'))
    library = remember(library, entry(ODD, 'Of damage', 'damage'))
    library = remember(library, { ...entry(ODD, 'Of another scheme'), scheme: 'custom' })

    expect(nameOf(library, SCHEME, 'school', N, ODD)).toBe('Of schools')
    expect(nameOf(library, SCHEME, 'damage', N, ODD)).toBe('Of damage')
    expect(nameOf(library, 'custom', 'school', N, ODD)).toBe('Of another scheme')
    // Bits only mean something on the base they were drawn for.
    expect(nameOf(library, SCHEME, 'school', 9, ODD)).toBeNull()
  })

  it('forgets one without disturbing the others', () => {
    let library: NamedLibrary = remember([], entry(ODD, 'Keep me', 'damage'))
    library = remember(library, entry(ODD, 'Drop me'))
    library = forget(library, entry(ODD, 'Drop me'))
    expect(nameOf(library, SCHEME, 'school', N, ODD)).toBeNull()
    expect(nameOf(library, SCHEME, 'damage', N, ODD)).toBe('Keep me')
  })

  it('lists what has been named for one attribute', () => {
    let library: NamedLibrary = remember([], entry(ODD, 'One'))
    library = remember(library, entry('00000100101', 'Two'))
    library = remember(library, entry(ODD, 'Elsewhere', 'damage'))
    expect(namedFor(library, SCHEME, 'school', N).map((e) => e.name)).toEqual(['One', 'Two'])
  })
})

describe('reading a named symbol', () => {
  const library = remember([], entry(ODD, 'Hedge-witchery'))
  const look = resolver(library, SCHEME, N)

  it('labels a layer the dictionary has no word for', () => {
    const figure = figureFromBits({ ...blank(), school: ODD }, N, ATTRIBUTES, look)
    const school = figure.layers.find((l) => l.attribute.id === 'school')!
    expect(school.feature).toBeNull()
    expect(school.named).toBe('Hedge-witchery')
    expect(labelOf(school)).toBe('Hedge-witchery')
  })

  it('never shadows a feature the attribute already has', () => {
    const evocation = bitsFor(ATTRIBUTE_BY_ID.school, 'Evocation', N)
    const shadowing = remember([], entry(evocation, 'Not this'))
    const figure = figureFromBits(
      { ...blank(), school: evocation },
      N,
      ATTRIBUTES,
      resolver(shadowing, SCHEME, N),
    )
    const school = figure.layers.find((l) => l.attribute.id === 'school')!
    expect(school.feature).toBe('Evocation')
    expect(school.named).toBeNull()
    expect(labelOf(school)).toBe('Evocation')
  })

  it('leaves a layer unnamed when nothing has been saved for it', () => {
    const figure = figureFromBits({ ...blank(), school: ODD }, N, ATTRIBUTES)
    expect(labelOf(figure.layers.find((l) => l.attribute.id === 'school')!)).toBeNull()
  })
})

describe('the published lists are left alone', () => {
  it('naming a symbol does not change what any feature is written as', () => {
    const before = ATTRIBUTES.map((a) => a.features.map((f) => bitsFor(a, f, N)))
    remember([], entry(ODD, 'Hedge-witchery'))
    const after = ATTRIBUTES.map((a) => a.features.map((f) => bitsFor(a, f, N)))
    expect(after).toEqual(before)
  })

  it('a named shape keeps the bits it was drawn with', () => {
    // Drawn by hand, named, then chosen again from the dropdown.
    const start = figureFromSpell(
      { level: '1', school: 'Blank', damage: 'None', area: 'None', range: 'Blank' },
      N,
      ATTRIBUTES,
    )
    const drawn = toggleChord(start, 0, 2)!
    const library = remember([], entry(drawn.school, 'My school'))
    const reopened = figureFromBits(drawn, N, ATTRIBUTES, resolver(library, SCHEME, N))
    const school = reopened.layers.find((l) => l.attribute.id === 'school')!

    expect(school.bits).toBe(drawn.school)
    expect(school.named).toBe('My school')
    // And the rest of the figure is untouched.
    expect(bitsOf(reopened).level).toBe(bitsOf(start).level)
  })
})

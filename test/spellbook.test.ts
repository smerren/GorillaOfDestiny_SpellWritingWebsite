/**
 * The author's own spellbook.
 *
 * A kept spell is the lines themselves, not a list of chosen features, so a
 * spell drawn by hand can be kept as readily as one out of the dictionary.
 */

import { describe, expect, it } from 'vitest'

import { bitsOf, emptyBits, figureFromSpell, toggleChord, figureFromBits } from '../src/lib/encoding'
import { ATTRIBUTES, DEFAULT_SIDES } from '../src/lib/keys'
import {
  dictionaryId,
  drop,
  findByShape,
  keep,
  newSpellId,
  rename,
  spellsFor,
  type Spellbook,
} from '../src/lib/spellbook'

const N = DEFAULT_SIDES
const FIREBALL = {
  level: '3',
  school: 'Evocation',
  damage: 'Fire',
  area: 'Sphere (20)',
  range: '150 Feet',
}
const bitsOfFireball = () => bitsOf(figureFromSpell(FIREBALL, N, ATTRIBUTES))

const spell = (name: string, bits = bitsOfFireball(), over = {}) => ({
  id: newSpellId(),
  scheme: '5e',
  sides: N,
  name,
  bits,
  ...over,
})

describe('keeping a spell', () => {
  it('holds what was kept, under the name given', () => {
    const book = keep([], spell('My Fireball'))
    expect(spellsFor(book, '5e', N).map((s) => s.name)).toEqual(['My Fireball'])
  })

  it('trims the name and refuses one that is only spaces', () => {
    expect(keep([], spell('  Spaced  '))[0].name).toBe('Spaced')
    expect(keep([], spell('   '))).toEqual([])
  })

  it('keeps spells of different schemes and dot counts apart', () => {
    let book: Spellbook = keep([], spell('Mine'))
    book = keep(book, spell('Elsewhere', bitsOfFireball(), { scheme: 'custom' }))
    book = keep(book, spell('Smaller', bitsOfFireball(), { sides: 7 }))

    expect(spellsFor(book, '5e', N).map((s) => s.name)).toEqual(['Mine'])
    expect(spellsFor(book, 'custom', N).map((s) => s.name)).toEqual(['Elsewhere'])
    expect(spellsFor(book, '5e', 7).map((s) => s.name)).toEqual(['Smaller'])
  })

  it('renames and removes by id, leaving the rest alone', () => {
    const one = spell('One')
    const two = spell('Two', emptyBits(N, ATTRIBUTES))
    let book: Spellbook = keep(keep([], one), two)

    book = rename(book, one.id, 'Renamed')
    expect(spellsFor(book, '5e', N).map((s) => s.name).sort()).toEqual(['Renamed', 'Two'])

    book = drop(book, two.id)
    expect(spellsFor(book, '5e', N).map((s) => s.name)).toEqual(['Renamed'])
  })

  it('refuses a rename to nothing', () => {
    const one = spell('One')
    const book = rename(keep([], one), one.id, '   ')
    expect(spellsFor(book, '5e', N)[0].name).toBe('One')
  })
})

describe('telling whether a rune is already kept', () => {
  it('finds a spell drawn exactly the same way', () => {
    const book = keep([], spell('My Fireball'))
    expect(findByShape(book, '5e', N, bitsOfFireball())?.name).toBe('My Fireball')
  })

  it('does not match once a single line is changed', () => {
    const book = keep([], spell('My Fireball'))
    const altered = toggleChord(figureFromBits(bitsOfFireball(), N, ATTRIBUTES), 0, 1)!
    expect(findByShape(book, '5e', N, altered)).toBeNull()
  })

  it('treats a blank layer and a missing one as the same spell', () => {
    // A layer that draws nothing is the same spell whether it is stored or not.
    const full = emptyBits(N, ATTRIBUTES)
    const sparse = { level: full.level }
    const book = keep([], spell('Almost nothing', sparse))
    expect(findByShape(book, '5e', N, full)?.name).toBe('Almost nothing')
  })

  it('does not look in another scheme', () => {
    const book = keep([], spell('Mine', bitsOfFireball(), { scheme: 'custom' }))
    expect(findByShape(book, '5e', N, bitsOfFireball())).toBeNull()
  })
})

describe('copying a spell out of the dictionary', () => {
  it('is idempotent, so starring twice keeps one copy', () => {
    const id = dictionaryId('5e', 'Fireball')
    let book: Spellbook = keep([], { ...spell('Fireball'), id, fromDictionary: true })
    book = keep(book, { ...spell('Fireball'), id, fromDictionary: true })
    expect(spellsFor(book, '5e', N)).toHaveLength(1)
  })

  it('unstarring removes exactly that spell', () => {
    const id = dictionaryId('5e', 'Fireball')
    let book: Spellbook = keep([], { ...spell('Fireball'), id, fromDictionary: true })
    book = keep(book, spell('Something of my own', emptyBits(N, ATTRIBUTES)))
    book = drop(book, id)
    expect(spellsFor(book, '5e', N).map((s) => s.name)).toEqual(['Something of my own'])
  })

  it('stores the lines, so the copy survives the dictionary being re-read', () => {
    const copied = { ...spell('Fireball'), fromDictionary: true }
    const book = keep([], copied)
    expect(findByShape(book, '5e', N, bitsOfFireball())?.fromDictionary).toBe(true)
  })
})

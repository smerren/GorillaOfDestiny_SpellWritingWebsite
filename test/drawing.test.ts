/**
 * Drawing by hand.
 *
 * A figure built from chords rather than chosen from lists can spell something
 * the dictionary has no word for. The notation allows that, so the model keeps
 * bits as the truth and treats the feature name as a reading of them.
 */

import { describe, expect, it } from 'vitest'

import {
  bitsFor,
  bitsOf,
  chordOwner,
  emptyBits,
  figureFromBits,
  figureFromSpell,
  toggleChord,
} from '../src/lib/encoding'
import { ATTRIBUTES, ATTRIBUTE_BY_ID, DEFAULT_SIDES, EMPTY_SPELL } from '../src/lib/keys'

const N = DEFAULT_SIDES
const blank = () => emptyBits(N, ATTRIBUTES)

describe('which attribute owns a chord', () => {
  it('matches a chord to the attribute drawn with that length', () => {
    for (const attribute of ATTRIBUTES) {
      const owner = chordOwner(ATTRIBUTES, N, 0, attribute.k)
      expect(owner?.attribute.id).toBe(attribute.id)
      expect(owner?.from).toBe(0)
    }
  })

  it('reads a chord the same way round whichever end is clicked first', () => {
    const forward = chordOwner(ATTRIBUTES, N, 2, 5)
    const backward = chordOwner(ATTRIBUTES, N, 5, 2)
    expect(forward).toEqual(backward)
    expect(forward?.attribute.k).toBe(3)
    expect(forward?.from).toBe(2)
  })

  it('wraps round the base, so the last node joins the first', () => {
    const owner = chordOwner(ATTRIBUTES, N, 10, 0)
    expect(owner?.attribute.k).toBe(1)
    expect(owner?.from).toBe(10)
  })

  it('refuses a node joined to itself', () => {
    expect(chordOwner(ATTRIBUTES, N, 4, 4)).toBeNull()
  })

  it('refuses a length no attribute is drawn with', () => {
    // Five attributes use k = 1..5; on an 11-gon nothing uses more.
    const two = ATTRIBUTES.slice(0, 2)
    expect(chordOwner(two, N, 0, 3)).toBeNull()
    expect(chordOwner(two, N, 0, 2)?.attribute.k).toBe(2)
  })
})

describe('toggling a chord', () => {
  it('draws a line that was not there, and erases one that was', () => {
    const start = figureFromBits(blank(), N, ATTRIBUTES)
    const once = toggleChord(start, 0, 1)!
    expect(once.level[0]).toBe('1')

    const again = toggleChord(figureFromBits(once, N, ATTRIBUTES), 0, 1)!
    expect(again.level).toBe('0'.repeat(N))
  })

  it('leaves every other layer alone', () => {
    const fireball = bitsOf(
      figureFromSpell(
        { level: '3', school: 'Evocation', damage: 'Fire', area: 'Sphere (20)', range: '150 Feet' },
        N,
        ATTRIBUTES,
      ),
    )
    const next = toggleChord(figureFromBits(fireball, N, ATTRIBUTES), 0, 3)!
    expect(next.damage).not.toBe(fireball.damage)
    for (const id of ['level', 'school', 'area', 'range']) {
      expect(next[id], id).toBe(fireball[id])
    }
  })

  it('does nothing where no attribute owns the chord', () => {
    const two = ATTRIBUTES.slice(0, 2)
    const figure = figureFromBits(emptyBits(N, two), N, two)
    expect(toggleChord(figure, 0, 5)).toBeNull()
  })
})

describe('reading a hand-drawn figure', () => {
  it('names the feature when the lines happen to spell one', () => {
    const bits = { ...blank(), school: bitsFor(ATTRIBUTE_BY_ID.school, 'Evocation', N) }
    const figure = figureFromBits(bits, N, ATTRIBUTES)
    expect(figure.layers.find((l) => l.attribute.id === 'school')?.feature).toBe('Evocation')
  })

  it('leaves the feature unnamed when they spell nothing in the list', () => {
    // Cyclically unique, but far past the end of the school list.
    const bits = { ...blank(), school: '01010101011' }
    const figure = figureFromBits(bits, N, ATTRIBUTES)
    const school = figure.layers.find((l) => l.attribute.id === 'school')!
    expect(school.feature).toBeNull()
    expect(school.chords.length).toBeGreaterThan(0)
  })

  it('still draws the chords of an unnamed symbol', () => {
    const bits = { ...blank(), level: '10000000000' }
    const figure = figureFromBits(bits, N, ATTRIBUTES)
    const level = figure.layers.find((l) => l.attribute.id === 'level')!
    expect(level.chords).toEqual([
      { from: 0, to: 1, k: 1, attribute: ATTRIBUTE_BY_ID.level },
    ])
  })

  it('treats a layer of the wrong length as blank rather than crashing', () => {
    const figure = figureFromBits({ level: '101' }, N, ATTRIBUTES)
    expect(figure.layers[0].bits).toBe('0'.repeat(N))
    expect(figure.layers[0].chords).toEqual([])
  })
})

describe('round trip', () => {
  it('a spell survives being turned into bits and read back', () => {
    const figure = figureFromSpell(EMPTY_SPELL, N, ATTRIBUTES)
    const again = figureFromBits(bitsOf(figure), N, ATTRIBUTES)
    expect(again.layers.map((l) => l.feature)).toEqual(figure.layers.map((l) => l.feature))
  })

  it('drawing a chord and erasing it returns the spell it started as', () => {
    const start = figureFromSpell(
      { level: '5', school: 'Illusion', damage: 'Cold', area: 'Cone (30)', range: 'Touch' },
      N,
      ATTRIBUTES,
    )
    const drawn = toggleChord(start, 3, 7)!
    const erased = toggleChord(figureFromBits(drawn, N, ATTRIBUTES), 3, 7)!
    expect(erased).toEqual(bitsOf(start))
  })
})

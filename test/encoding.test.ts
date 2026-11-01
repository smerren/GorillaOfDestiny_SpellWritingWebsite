/**
 * The fixture in drawn-runes.json was decoded straight out of the vector paths
 * of the Spell Writing Guide Dictionary (July 2024) — the chords the Gorilla of
 * Destiny's own plots actually draw. If these pass, the encoder agrees with the
 * published book for every SRD spell, layer by layer.
 */

import { describe, expect, it } from 'vitest'

import { cyclicUniques, minimumSides, uniqueCount } from '../src/lib/binary'
import { bitsFor, decodeBits, encodeSpell } from '../src/lib/encoding'
import {
  ATTRIBUTES,
  ATTRIBUTE_BY_ID,
  DEFAULT_SIDES,
  type AttributeId,
  type SpellAttributes,
} from '../src/lib/keys'
import spells from '../src/data/spells.json'
import drawn from './drawn-runes.json'

const N = DEFAULT_SIDES

describe('cyclically unique binaries', () => {
  it('keeps exactly one of each rotation class', () => {
    const uniques = cyclicUniques(N)
    const classes = new Set(
      uniques.map((bits) => {
        const rotations = Array.from({ length: N }, (_, r) => bits.slice(r) + bits.slice(0, r))
        return rotations.sort()[0]
      }),
    )
    expect(classes.size).toBe(uniques.length)
  })

  it('matches the counts printed in the Binary Dictionary', () => {
    // Section 5, "NUniques" for each n.
    expect(uniqueCount(3)).toBe(4)
    expect(uniqueCount(4)).toBe(6)
    expect(uniqueCount(5)).toBe(8)
    expect(uniqueCount(6)).toBe(14)
    expect(uniqueCount(7)).toBe(20)
    expect(uniqueCount(8)).toBe(36)
    expect(uniqueCount(9)).toBe(60)
    expect(uniqueCount(10)).toBe(108)
    expect(uniqueCount(11)).toBe(188)
    expect(uniqueCount(12)).toBe(352)
    expect(uniqueCount(13)).toBe(632)
  })

  it('needs an 11-gon for the five 5e attributes', () => {
    expect(minimumSides(ATTRIBUTES.length)).toBe(N)
  })

  it('starts with the empty figure, which draws nothing', () => {
    expect(cyclicUniques(N)[0]).toBe('0'.repeat(N))
  })
})

describe('the symbolic dictionary of the original guide', () => {
  // Section 4.1 and 4.2, read off the plates.
  it('writes the levels as printed', () => {
    const level = ATTRIBUTE_BY_ID.level
    expect(bitsFor(level, '0', N)).toBe('00000000001')
    expect(bitsFor(level, '3', N)).toBe('00000000111')
    expect(bitsFor(level, '9', N)).toBe('00000010011')
  })

  it('writes the schools as printed', () => {
    const school = ATTRIBUTE_BY_ID.school
    expect(bitsFor(school, 'Abjuration', N)).toBe('00000000001')
    expect(bitsFor(school, 'Evocation', N)).toBe('00000001001')
    expect(bitsFor(school, 'Transmutation', N)).toBe('00000001111')
  })

  it('leaves a blank attribute undrawn', () => {
    expect(bitsFor(ATTRIBUTE_BY_ID.school, 'Blank', N)).toBe('00000000000')
    expect(bitsFor(ATTRIBUTE_BY_ID.damage, 'None', N)).toBe('00000000000')
    expect(bitsFor(ATTRIBUTE_BY_ID.area, 'None', N)).toBe('00000000000')
  })
})

describe('every SRD spell', () => {
  const library = spells as ReadonlyArray<SpellAttributes & { name: string; level: number }>
  const fixture = drawn as Record<string, Record<AttributeId, string>>

  it('covers the whole dictionary', () => {
    expect(library.length).toBe(319)
    expect(Object.keys(fixture).length).toBe(319)
  })

  it('draws the same chords as the published plates', () => {
    const wrong: string[] = []
    for (const spell of library) {
      const attributes: SpellAttributes = {
        level: String(spell.level),
        school: spell.school,
        damage: spell.damage,
        area: spell.area,
        range: spell.range,
      }
      const expected = fixture[spell.name]
      expect(expected, `${spell.name} is missing from the fixture`).toBeDefined()
      for (const layer of encodeSpell(attributes, N)) {
        if (layer.bits !== expected[layer.attribute.id]) {
          wrong.push(
            `${spell.name} ${layer.attribute.id}: drew ${expected[layer.attribute.id]}, ` +
              `encoded ${layer.bits}`,
          )
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('reads back to the attributes it was written from', () => {
    for (const spell of library) {
      const attributes: SpellAttributes = {
        level: String(spell.level),
        school: spell.school,
        damage: spell.damage,
        area: spell.area,
        range: spell.range,
      }
      for (const layer of encodeSpell(attributes, N)) {
        expect(decodeBits(layer.attribute, layer.bits, N)).toBe(layer.feature)
      }
    }
  })
})

describe('chords', () => {
  it('steps k vertices along for each set bit', () => {
    const spell: SpellAttributes = {
      level: '0',
      school: 'Blank',
      damage: 'None',
      area: 'None',
      range: 'Blank',
    }
    const [level] = encodeSpell(spell, N)
    // Level 0 is 00000000001: the single set bit is the last one.
    expect(level.chords).toEqual([
      { from: 10, to: 0, k: 1, attribute: ATTRIBUTE_BY_ID.level },
    ])
  })

  it('never lets two attributes share an edge', () => {
    const seen = new Map<string, number>()
    for (const attribute of ATTRIBUTES) {
      for (let i = 0; i < N; i++) {
        const key = [i, (i + attribute.k) % N].sort((a, b) => a - b).join('-')
        expect(seen.has(key)).toBe(false)
        seen.set(key, attribute.k)
      }
    }
  })
})

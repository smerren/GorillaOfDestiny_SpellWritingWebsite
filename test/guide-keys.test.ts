/**
 * The guide's own keys, Section 4.
 *
 * Every expectation here is a binary number printed beside its symbol on the
 * plates of pages 14 to 17, typed in from the page. If these pass, the 2022
 * edition is transcribed as the guide prints it.
 */

import { describe, expect, it } from 'vitest'

import { bitsFor } from '../src/lib/encoding'
import { ATTRIBUTES, DEFAULT_SIDES, GUIDE_ATTRIBUTES, type Attribute } from '../src/lib/keys'

const N = DEFAULT_SIDES
const of = (id: string) => GUIDE_ATTRIBUTES.find((a) => a.id === id)!
const bits = (a: Attribute, feature: string) => bitsFor(a, feature, N)

describe('level and school, which both editions agree on', () => {
  it('writes the levels as the plate prints them', () => {
    const level = of('level')
    expect(bits(level, '0')).toBe('00000000001')
    expect(bits(level, '3')).toBe('00000000111')
    expect(bits(level, '9')).toBe('00000010011')
  })

  it('writes the schools as the plate prints them', () => {
    const school = of('school')
    expect(bits(school, 'Abjuration')).toBe('00000000001')
    expect(bits(school, 'Evocation')).toBe('00000001001')
    expect(bits(school, 'Transmutation')).toBe('00000001111')
  })

  it('agrees with the 2024 edition on both', () => {
    for (const id of ['level', 'school']) {
      const guide = of(id)
      const dictionary = ATTRIBUTES.find((a) => a.id === id)!
      for (const feature of dictionary.features) {
        if (!guide.features.includes(feature)) continue
        expect(bits(guide, feature), `${id} ${feature}`).toBe(bits(dictionary, feature))
      }
    }
  })
})

describe('damage, where the editions part company', () => {
  // Page 15, every symbol on the plate.
  const expected: Array<[string, string]> = [
    ['acid', '00000000001'],
    ['bludgeoning', '00000000011'],
    ['cold', '00000000101'],
    ['damage', '00000000111'],
    ['extra', '00000001001'],
    ['fire', '00000001011'],
    ['force', '00000001101'],
    ['lightning', '00000001111'],
    ['necrotic', '00000010001'],
    ['nonmagical', '00000010011'],
    ['piercing', '00000010101'],
    ['poison', '00000010111'],
    ['psychic', '00000011001'],
    ['radiant', '00000011011'],
    ['slashing', '00000011101'],
    ['thunder', '00000011111'],
  ]

  it.each(expected)('writes %s as %s', (feature, want) => {
    expect(bits(of('damage'), feature)).toBe(want)
  })

  it('puts fire two places after the 2024 edition does', () => {
    // The reported discrepancy: the guide's fire is the 2024 edition's Fire
    // plus the two entries the SRD has no word for.
    const guide = bits(of('damage'), 'fire')
    const dictionary = bits(ATTRIBUTES.find((a) => a.id === 'damage')!, 'Fire')
    expect(guide).toBe('00000001011')
    expect(dictionary).toBe('00000000111')
    // And what the 2024 edition calls Fire, the guide calls plain damage.
    expect(bits(of('damage'), 'damage')).toBe(dictionary)
  })
})

describe('areas, numbered in the order of the author’s own data', () => {
  // Page 16. The plate is laid out alphabetically but numbered otherwise.
  const expected: Array<[string, string]> = [
    ['Cube', '00000000001'],
    ['Line', '00000000011'],
    ['Multiple-Targets', '00000000101'],
    ['Multiple-Targets/Sphere', '00000000111'],
    ['Cone', '00000001001'],
    ['Cone/Sphere', '00000001011'],
    ['Square', '00000001101'],
    ['Circle', '00000001111'],
    ['Sphere', '00000010001'],
    ['Sphere/Cylinder', '00000010011'],
    ['Single-Target', '00000010101'],
    ['Single-Target/Cube', '00000010111'],
    ['Single-Target/Multiple-Targets', '00000011001'],
    ['Single-Target/Cone', '00000011011'],
    ['Single-Target/Sphere', '00000011101'],
    ['Single-Target/Wall', '00000011111'],
    ['Wall', '00000100001'],
    ['Cylinder', '00000100011'],
    ['None', '00000100101'],
  ]

  it.each(expected)('writes %s as %s', (feature, want) => {
    expect(bits(of('area'), feature)).toBe(want)
  })

  it('treats the guide’s None as a symbol, not an empty layer', () => {
    // Unlike the 2024 edition, where None is the blank that draws nothing.
    expect(bits(of('area'), 'None')).not.toBe('0'.repeat(N))
  })
})

describe('range, which folds shape into distance', () => {
  // Page 17, spot checks across the plate including both ends.
  const expected: Array<[string, string]> = [
    ['10-feet radius', '00000000001'],
    ['100-feet line', '00000000011'],
    ['15-feet cone', '00000000101'],
    ['15-feet cube', '00000000111'],
    ['5-feet radius', '00000010001'],
    ['Point (1 miles)', '00000010111'],
    ['Point (150 feet)', '00000011111'],
    ['Point (30 feet)', '00000100001'],
    ['Point (90 feet)', '00000101011'],
    ['Self', '00000101101'],
    ['Sight', '00000101111'],
    ['Special', '00000110001'],
    ['Touch', '00000110011'],
  ]

  it.each(expected)('writes %s as %s', (feature, want) => {
    expect(bits(of('range'), feature)).toBe(want)
  })
})

describe('both editions as a whole', () => {
  it('leaves every layer blank-able, so nothing need be drawn', () => {
    for (const attribute of GUIDE_ATTRIBUTES) {
      const blank = attribute.id === 'level' ? null : attribute.features[0]
      if (blank) expect(bits(attribute, blank), attribute.id).toBe('0'.repeat(N))
    }
  })

  it('never gives two features of one attribute the same symbol', () => {
    for (const attribute of GUIDE_ATTRIBUTES) {
      const seen = new Set(attribute.features.map((f) => bits(attribute, f)))
      expect(seen.size, attribute.id).toBe(attribute.features.length)
    }
  })

  it('uses the same five chord lengths as the 2024 edition', () => {
    expect(GUIDE_ATTRIBUTES.map((a) => a.k)).toEqual(ATTRIBUTES.map((a) => a.k))
  })
})

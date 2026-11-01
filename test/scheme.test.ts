/**
 * Schemes of the author's own making.
 *
 * The system was built to be general: any set of attributes with finite
 * feature lists can be written in the same hand. These check that a hand-made
 * scheme obeys the same rules the published one does.
 */

import { describe, expect, it } from 'vitest'

import { minimumSides, uniqueCount } from '../src/lib/binary'
import { encodeSpell, figureFromSpell } from '../src/lib/encoding'
import { buildRune } from '../src/lib/rune'
import {
  BLANK,
  blankSpell,
  capacityOf,
  compile,
  parseFeatures,
  problems,
  sidesFor,
  STARTER,
  type Draft,
} from '../src/lib/scheme'

const draft = (attributes: Array<[string, string]>, sides: number | null = null): Draft => ({
  name: 'Test',
  sides,
  attributes: attributes.map(([label, features], i) => ({ id: `a${i}`, label, features })),
})

describe('reading what the author typed', () => {
  it('takes one feature per line, trimmed', () => {
    expect(parseFeatures('  Fire \n Water\n\n  Earth  ')).toEqual(['Fire', 'Water', 'Earth'])
  })

  it('drops repeats, which would be two names for one symbol', () => {
    expect(parseFeatures('Fire\nWater\nFire')).toEqual(['Fire', 'Water'])
  })

  it('will not let a feature impersonate the blank', () => {
    expect(parseFeatures(`Fire\n${BLANK}\nWater`)).toEqual(['Fire', 'Water'])
  })
})

describe('compiling a scheme', () => {
  it('gives each attribute the next chord length', () => {
    const scheme = compile(draft([['One', 'a'], ['Two', 'b'], ['Three', 'c']]))
    expect(scheme.attributes.map((a) => a.k)).toEqual([1, 2, 3])
  })

  it('reserves the first symbol for the blank, so nothing is drawn', () => {
    const scheme = compile(draft([['Element', 'Fire\nWater']]))
    const [element] = scheme.attributes
    expect(element.features[0]).toBe(BLANK)
    const layers = encodeSpell({ [element.id]: BLANK }, scheme.sides, scheme.attributes)
    expect(layers[0].bits).toBe('0'.repeat(scheme.sides))
    expect(layers[0].chords).toEqual([])
  })

  it('sizes the base to the attribute count by default', () => {
    const d = draft([['A', 'x'], ['B', 'y'], ['C', 'z'], ['D', 'w']])
    expect(sidesFor(d)).toBe(minimumSides(4))
    expect(compile(d).sides).toBe(9)
  })

  it('honours a base size the author chose', () => {
    expect(compile(draft([['A', 'x']], 13)).sides).toBe(13)
  })

  it('names an attribute that was left unnamed', () => {
    expect(compile(draft([['', 'x']])).attributes[0].label).toBe('Attribute 1')
  })

  it('grows the base until every feature has a symbol of its own', () => {
    // One attribute needs only 3 nodes for its own chord length, but 3 nodes
    // carry 3 features and this asks for 4, so the base has to grow.
    const d = draft([['Element', 'Fire\nWater\nEarth\nAir']])
    expect(minimumSides(1)).toBe(3)
    expect(sidesFor(d)).toBeGreaterThan(3)

    const scheme = compile(d)
    const [element] = scheme.attributes
    const seen = new Set(
      element.features.map(
        (f) => encodeSpell({ [element.id]: f }, scheme.sides, scheme.attributes)[0].bits,
      ),
    )
    expect(seen.size).toBe(element.features.length)
  })

  it('never writes a feature as the blank by accident', () => {
    const many = Array.from({ length: 40 }, (_, i) => `f${i}`).join('\n')
    const scheme = compile(draft([['Big', many]]))
    const [big] = scheme.attributes
    const empty = '0'.repeat(scheme.sides)
    for (const feature of big.features.slice(1)) {
      const bits = encodeSpell({ [big.id]: feature }, scheme.sides, scheme.attributes)[0].bits
      expect(bits, feature).not.toBe(empty)
    }
  })

  it('keeps layers off each other’s edges', () => {
    const scheme = compile(STARTER)
    const figure = figureFromSpell(blankSpell(scheme), scheme.sides, scheme.attributes)
    const rune = buildRune(figure, {
      base: 'polygon',
      sides: scheme.sides,
      curvature: 0,
      showScaffold: true,
      showNodes: true,
      showStartNode: true,
    }, 100)
    const seen = new Set<string>()
    for (const attribute of scheme.attributes) {
      for (let i = 0; i < scheme.sides; i++) {
        const key = [i, (i + attribute.k) % scheme.sides].sort((a, b) => a - b).join('-')
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
    expect(rune.nodes).toHaveLength(scheme.sides)
  })
})

describe('warnings', () => {
  it('says so when there is nothing yet', () => {
    expect(problems(draft([]))[0].message).toMatch(/Add an attribute/)
  })

  it('catches an attribute with no features', () => {
    const faults = problems(draft([['Element', '   ']]))
    expect(faults.some((p) => /No features/.test(p.message))).toBe(true)
  })

  it('catches more features than the base can carry', () => {
    const many = Array.from({ length: 10 }, (_, i) => `f${i}`).join('\n')
    // 3 nodes carry 4 unique symbols, so only 3 features once the blank is counted.
    expect(capacityOf(3)).toBe(uniqueCount(3) - 1)
    const faults = problems(draft([['Element', many]], 3))
    expect(faults.some((p) => /Remove some/.test(p.message))).toBe(true)
  })

  it('catches a base too small for the attributes, where layers would collide', () => {
    const faults = problems(draft([['A', 'x'], ['B', 'y'], ['C', 'z']], 5))
    expect(faults.some((p) => /at least 7 dots/.test(p.message))).toBe(true)
  })

  it('is quiet about a scheme that is fine', () => {
    expect(problems(STARTER)).toEqual([])
  })
})

describe('the starter scheme', () => {
  it('compiles to something writable', () => {
    const scheme = compile(STARTER)
    expect(scheme.attributes).toHaveLength(3)
    expect(scheme.sides).toBe(7)
    const spell = {
      [scheme.attributes[0].id]: 'Fire',
      [scheme.attributes[1].id]: 'Bind',
      [scheme.attributes[2].id]: 'Memory',
    }
    const layers = encodeSpell(spell, scheme.sides, scheme.attributes)
    expect(layers.map((l) => l.feature)).toEqual(['Fire', 'Bind', 'Memory'])
    expect(layers.every((l) => l.chords.length > 0)).toBe(true)
  })
})

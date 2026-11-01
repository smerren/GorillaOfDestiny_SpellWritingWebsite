/**
 * The spellbook plate: the whole rune beside the five symbols it is built from,
 * after the worked example the guide closes Section 3 with.
 */

import { describe, expect, it } from 'vitest'

import { ATTRIBUTES, DEFAULT_SIDES, type SpellAttributes } from '../src/lib/keys'
import { GOLD, INK, layerInk, PARCHMENT, SCAFFOLD_INK, TEXT_INK } from '../src/lib/palette'
import { figureFromSpell } from '../src/lib/encoding'
import { buildPlate, cellValue, plateToSvg } from '../src/lib/plate'
import { buildRune } from '../src/lib/rune'
import spells from '../src/data/spells.json'
import type { RuneStyle } from '../src/lib/rune'

const STYLE: RuneStyle = {
  base: 'polygon',
  sides: DEFAULT_SIDES,
  curvature: 0,
  showScaffold: true,
  showNodes: true,
  showStartNode: true,
}

const FIREBALL: SpellAttributes = {
  level: '3',
  school: 'Evocation',
  damage: 'Fire',
  area: 'Sphere (20)',
  range: '150 Feet',
}

const MISTY_STEP: SpellAttributes = {
  level: '2',
  school: 'Conjuration',
  damage: 'None',
  area: 'None',
  range: 'Self',
}

const FIG_FIREBALL = figureFromSpell(FIREBALL, DEFAULT_SIDES, ATTRIBUTES)
const FIG_MISTY = figureFromSpell(MISTY_STEP, DEFAULT_SIDES, ATTRIBUTES)

const PLAIN = {
  ink: INK,
  scaffoldInk: SCAFFOLD_INK,
  parchment: PARCHMENT,
  text: TEXT_INK,
  gold: GOLD,
  tint: null,
}

describe('plate', () => {
  it('breaks the rune out into one cell per attribute, in reading order', () => {
    const plate = buildPlate(FIG_FIREBALL, STYLE, 'Fireball')
    expect(plate.cells.map((c) => c.cell.attribute.id)).toEqual(ATTRIBUTES.map((a) => a.id))
  })

  it('gives each cell exactly the chords of its own layer', () => {
    const plate = buildPlate(FIG_FIREBALL, STYLE, 'Fireball')
    for (const { cell, rune, groups } of plate.cells) {
      const layer = rune.layers.find((l) => l.attribute.id === cell.attribute.id)!
      expect(groups).toHaveLength(1)
      expect(groups[0].paths).toEqual(layer.paths)
    }
  })

  it('accounts for every chord of the main figure across the cells', () => {
    const plate = buildPlate(FIG_FIREBALL, STYLE, 'Fireball')
    const inMain = plate.main.groups.map((g) => [g.attribute.id, g.paths.length] as const)
    const inCells = plate.cells.map((c) => [c.cell.attribute.id, c.groups[0].paths.length] as const)
    expect(inMain).toEqual(inCells)
  })

  it('keeps the main figure tintable layer by layer', () => {
    const plate = buildPlate(FIG_FIREBALL, STYLE, 'Fireball')
    expect(plate.main.groups.map((g) => g.attribute.id)).toEqual(ATTRIBUTES.map((a) => a.id))
  })

  it('draws nothing for an attribute the spell does not have', () => {
    const plate = buildPlate(FIG_MISTY, STYLE, 'Misty Step')
    const damage = plate.cells.find((c) => c.cell.attribute.id === 'damage')!
    expect(damage.groups[0].paths).toEqual([])
    // The nodes are still drawn, so the reader can see the layer is empty
    // rather than missing.
    expect(damage.rune.nodes).toHaveLength(DEFAULT_SIDES)
  })

  it('labels a cantrip and an absent attribute in words', () => {
    const level = ATTRIBUTES[0]
    const damage = ATTRIBUTES[2]
    expect(cellValue(level, '0')).toBe('Cantrip')
    expect(cellValue(level, '3')).toBe('Level 3')
    expect(cellValue(damage, 'None')).toBe('—')
    expect(cellValue(damage, 'Fire')).toBe('Fire')
  })

  it('writes a self-contained SVG with its own ground and credit', () => {
    const svg = plateToSvg(buildPlate(FIG_FIREBALL, STYLE, 'Fireball'), PLAIN)
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain(`fill="${PARCHMENT}"`)
    expect(svg).toContain('FIREBALL')
    expect(svg).toContain('The Gorilla of Destiny')
    for (const attribute of ATTRIBUTES) {
      expect(svg).toContain(attribute.label.toUpperCase())
    }
  })

  it('escapes a name that would otherwise break the markup', () => {
    const svg = plateToSvg(buildPlate(FIG_FIREBALL, STYLE, '<script> & co'), PLAIN)
    expect(svg).toContain('&lt;SCRIPT&gt; &amp; CO')
    expect(svg).not.toContain('<script>')
  })

  it('tints every layer when asked', () => {
    const svg = plateToSvg(buildPlate(FIG_FIREBALL, STYLE, 'Fireball'), {
      ...PLAIN,
      tint: (a) => layerInk(a.k),
    })
    for (const attribute of ATTRIBUTES) {
      expect(svg).toContain(layerInk(attribute.k))
    }
  })
})

/**
 * A broken-out symbol must be the same figure as the one above it, only
 * smaller. They are built at different sizes, so anything that decides a
 * shape from absolute coordinates can make them disagree — which is how a
 * chord passing near the centre of the figure came to bow one way in the
 * large drawing and the other way in the small one.
 */
describe('a cell is the main figure, smaller', () => {
  interface Shape {
    readonly kind: string
    /** Which way the arc bows, and whether it is the long way round. */
    readonly flags: string
    /** Positions and radius as fractions of the frame. */
    readonly numbers: number[]
  }

  /**
   * A path as fractions of its own frame, so two sizes can be compared.
   *
   * Path text is rounded to three places before it is scaled, so the numbers
   * only agree to about a part in ten thousand; the flags, which say which way
   * a line bows, must agree exactly.
   */
  function shapeOf(d: string, vb: { x: number; y: number; size: number }): Shape {
    const line = d.match(/^M (-?[\d.]+) (-?[\d.]+) L (-?[\d.]+) (-?[\d.]+)$/)
    const arc = d.match(
      /^M (-?[\d.]+) (-?[\d.]+) A (-?[\d.]+) (-?[\d.]+) 0 (\d) (\d) (-?[\d.]+) (-?[\d.]+)$/,
    )
    const fx = (v: string) => (Number(v) - vb.x) / vb.size
    const fy = (v: string) => (Number(v) - vb.y) / vb.size

    if (line) {
      return { kind: 'line', flags: '', numbers: [fx(line[1]), fy(line[2]), fx(line[3]), fy(line[4])] }
    }
    if (arc) {
      return {
        kind: 'arc',
        flags: `${arc[5]}${arc[6]}`,
        numbers: [fx(arc[1]), fy(arc[2]), Number(arc[3]) / vb.size, fx(arc[7]), fy(arc[8])],
      }
    }
    return { kind: 'point', flags: '', numbers: [] }
  }

  // The whole book. The case that first showed this up — Gate on a curved
  // base — is a hundred and thirty spells in, so a sample would have missed it.
  const library = spells as Array<Record<string, string | number>>

  it('draws every layer the same way at both sizes', () => {
    const wrong: string[] = []

    for (const spell of library) {
      const figure = figureFromSpell(
        {
          level: String(spell.level),
          school: spell.school as string,
          damage: spell.damage as string,
          area: spell.area as string,
          range: spell.range as string,
        },
        DEFAULT_SIDES,
        ATTRIBUTES,
      )

      for (const base of ['polygon', 'cubic', 'quadratic', 'quarter', 'semicircle'] as const) {
        for (const curvature of [0, 0.45, 0.6, 1]) {
          const style = { ...STYLE, base, curvature }
          const plate = buildPlate(figure, style, String(spell.name))
          const main = buildRune(figure, style, plate.layout.main.size)

          for (const entry of plate.cells) {
            const id = entry.cell.attribute.id
            const mine = main.layers.find((l) => l.attribute.id === id)!
            const large = mine.paths.map((d) => shapeOf(d, main.viewBox))
            const small = entry.groups[0].paths.map((d) => shapeOf(d, entry.rune.viewBox))
            const where = `${spell.name} ${base} curvature=${curvature} ${id}`

            if (large.length !== small.length) {
              wrong.push(`${where}: ${large.length} lines against ${small.length}`)
              continue
            }
            large.forEach((shape, i) => {
              const other = small[i]
              if (shape.kind !== other.kind || shape.flags !== other.flags) {
                wrong.push(`${where}: ${shape.kind}${shape.flags} against ${other.kind}${other.flags}`)
                return
              }
              shape.numbers.forEach((n, j) => {
                if (Math.abs(n - other.numbers[j]) > 1e-3) {
                  wrong.push(`${where}: ${n.toFixed(5)} against ${other.numbers[j].toFixed(5)}`)
                }
              })
            })
          }
        }
      }
    }

    expect(wrong).toEqual([])
  })

  it('frames both at the same relative size', () => {
    const figure = figureFromSpell(
      { level: '9', school: 'Conjuration', damage: 'None', area: 'None', range: '60 Feet' },
      DEFAULT_SIDES,
      ATTRIBUTES,
    )
    for (const base of ['polygon', 'cubic', 'quadratic', 'quarter', 'semicircle'] as const) {
      for (const curvature of [0, 0.45, 0.8, 1]) {
        const style = { ...STYLE, base, curvature }
        const plate = buildPlate(figure, style, 'Gate')
        const main = buildRune(figure, style, plate.layout.main.size)
        const mainScale = main.viewBox.size / plate.layout.main.size
        for (const entry of plate.cells) {
          const cellScale = entry.rune.viewBox.size / entry.cell.size
          expect(cellScale, `${base} ${curvature} ${entry.cell.attribute.id}`).toBeCloseTo(mainScale, 2)
        }
      }
    }
  })
})

/**
 * The spellbook plate: the whole rune beside the five symbols it is built from,
 * after the worked example the guide closes Section 3 with.
 */

import { describe, expect, it } from 'vitest'

import { ATTRIBUTES, DEFAULT_SIDES, type SpellAttributes } from '../src/lib/keys'
import { GOLD, INK, layerInk, PARCHMENT, SCAFFOLD_INK, TEXT_INK } from '../src/lib/palette'
import { buildPlate, cellValue, plateToSvg } from '../src/lib/plate'
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
    const plate = buildPlate(FIREBALL, STYLE, 'Fireball')
    expect(plate.cells.map((c) => c.cell.attribute.id)).toEqual(ATTRIBUTES.map((a) => a.id))
  })

  it('gives each cell exactly the chords of its own layer', () => {
    const plate = buildPlate(FIREBALL, STYLE, 'Fireball')
    for (const { cell, rune, groups } of plate.cells) {
      const layer = rune.layers.find((l) => l.attribute.id === cell.attribute.id)!
      expect(groups).toHaveLength(1)
      expect(groups[0].paths).toEqual(layer.paths)
    }
  })

  it('accounts for every chord of the main figure across the cells', () => {
    const plate = buildPlate(FIREBALL, STYLE, 'Fireball')
    const inMain = plate.main.groups.map((g) => [g.attribute.id, g.paths.length] as const)
    const inCells = plate.cells.map((c) => [c.cell.attribute.id, c.groups[0].paths.length] as const)
    expect(inMain).toEqual(inCells)
  })

  it('keeps the main figure tintable layer by layer', () => {
    const plate = buildPlate(FIREBALL, STYLE, 'Fireball')
    expect(plate.main.groups.map((g) => g.attribute.id)).toEqual(ATTRIBUTES.map((a) => a.id))
  })

  it('draws nothing for an attribute the spell does not have', () => {
    const plate = buildPlate(MISTY_STEP, STYLE, 'Misty Step')
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
    const svg = plateToSvg(buildPlate(FIREBALL, STYLE, 'Fireball'), PLAIN)
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
    const svg = plateToSvg(buildPlate(FIREBALL, STYLE, '<script> & co'), PLAIN)
    expect(svg).toContain('&lt;SCRIPT&gt; &amp; CO')
    expect(svg).not.toContain('<script>')
  })

  it('tints every layer when asked', () => {
    const svg = plateToSvg(buildPlate(FIREBALL, STYLE, 'Fireball'), {
      ...PLAIN,
      tint: (a) => layerInk(a.k),
    })
    for (const attribute of ATTRIBUTES) {
      expect(svg).toContain(layerInk(attribute.k))
    }
  })
})

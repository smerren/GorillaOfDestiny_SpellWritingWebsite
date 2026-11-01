/**
 * A spellbook plate: the whole rune, with each attribute broken out beside it.
 *
 * This is the page the guide itself closes its qualitative section with — a
 * worked Fireball surrounded by the five symbols it is built from, each
 * labelled. It is the form a caster would actually keep, because it can be read
 * without already knowing the system.
 *
 * The layout is computed once here and shared by the live view and the SVG
 * writer, so what you export is what you saw.
 */

import type { Point } from './bases'
import { encodeSpell } from './encoding'
import { ATTRIBUTES, type Attribute, type SpellAttributes } from './keys'
import { buildRune, type Rune, type RuneStyle } from './rune'

export interface PlateCell {
  readonly attribute: Attribute
  readonly feature: string
  readonly x: number
  readonly labelY: number
  readonly runeY: number
  readonly valueY: number
  readonly size: number
}

export interface PlateLayout {
  readonly width: number
  readonly height: number
  readonly title: Point
  readonly main: { readonly x: number; readonly y: number; readonly size: number }
  readonly divider: { readonly y: number; readonly x1: number; readonly x2: number }
  readonly cells: readonly PlateCell[]
  readonly footer: Point
}

/** A set of chords sharing one ink. */
export interface InkedGroup {
  readonly attribute: Attribute
  readonly paths: readonly string[]
}

export interface PlatePiece {
  readonly rune: Rune
  /**
   * Kept grouped by attribute rather than flattened, so the main figure can be
   * tinted layer by layer exactly as the broken-out symbols are.
   */
  readonly groups: readonly InkedGroup[]
}

export interface Plate {
  readonly layout: PlateLayout
  readonly title: string
  readonly main: PlatePiece
  readonly cells: ReadonlyArray<PlatePiece & { readonly cell: PlateCell }>
}

const WIDTH = 720
const HEIGHT = 816
const MAIN_SIZE = 430
const CELL_SIZE = 118
const CELL_GAP = 14

function layout(spell: SpellAttributes, attributes: readonly Attribute[]): PlateLayout {
  const span = attributes.length * CELL_SIZE + (attributes.length - 1) * CELL_GAP
  const left = (WIDTH - span) / 2

  return {
    width: WIDTH,
    height: HEIGHT,
    title: { x: WIDTH / 2, y: 58 },
    main: { x: (WIDTH - MAIN_SIZE) / 2, y: 82, size: MAIN_SIZE },
    divider: { y: 548, x1: 64, x2: WIDTH - 64 },
    cells: attributes.map((attribute, i) => ({
      attribute,
      feature: spell[attribute.id] ?? attribute.features[0],
      x: left + i * (CELL_SIZE + CELL_GAP),
      labelY: 582,
      runeY: 594,
      valueY: 736,
      size: CELL_SIZE,
    })),
    footer: { x: WIDTH / 2, y: 790 },
  }
}

/**
 * The guide's own plate labels a cantrip as "Cantrip" rather than level 0, and
 * writes an absent attribute as a dash rather than leaving the reader guessing.
 */
export function cellValue(attribute: Attribute, feature: string): string {
  if (attribute.id === 'level') return feature === '0' ? 'Cantrip' : `Level ${feature}`
  return feature === 'None' || feature === 'Blank' ? '—' : feature
}

export function buildPlate(
  spell: SpellAttributes,
  style: RuneStyle,
  title: string,
  attributes: readonly Attribute[] = ATTRIBUTES,
): Plate {
  const plan = layout(spell, attributes)

  const mainRune = buildRune(spell, style, plan.main.size, attributes)
  const main: PlatePiece = {
    rune: mainRune,
    groups: mainRune.layers.map((l) => ({ attribute: l.attribute, paths: l.paths })),
  }

  // Each cell shows one layer alone, with the scaffold dropped: at this size it
  // would read as noise rather than as context.
  const cellStyle: RuneStyle = { ...style, showScaffold: false }
  const cells = plan.cells.map((cell) => {
    const rune = buildRune(spell, cellStyle, cell.size, attributes)
    const layer = rune.layers.find((l) => l.attribute.id === cell.attribute.id)
    return {
      cell,
      rune,
      groups: [{ attribute: cell.attribute, paths: layer?.paths ?? [] }],
    }
  })

  return { layout: plan, title, main, cells }
}

export interface PlateInk {
  readonly ink: string
  readonly scaffoldInk: string
  readonly parchment: string
  readonly text: string
  readonly gold: string
  /** Per-attribute inks, when the layers are tinted. */
  readonly tint: ((attribute: Attribute) => string) | null
}

const FONT = "Cinzel, Georgia, 'Times New Roman', serif"
const BODY_FONT = "'EB Garamond', Georgia, 'Times New Roman', serif"

function escape(text: string): string {
  return text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)
}

/** Draw one rune's chords, nodes and start node inside its own box. */
function piece(
  p: PlatePiece,
  x: number,
  y: number,
  colours: PlateInk,
  showScaffold: boolean,
): string[] {
  const size = p.rune.size
  const width = size / 70
  const node = size / 110
  const out: string[] = [`<g transform="translate(${x} ${y})">`]

  if (showScaffold && p.rune.scaffold.length) {
    out.push(
      `<g fill="none" stroke="${colours.scaffoldInk}" stroke-width="${(width / 6).toFixed(3)}" opacity="0.4">`,
      ...p.rune.scaffold.map((d) => `<path d="${d}"/>`),
      '</g>',
    )
  }

  for (const group of p.groups) {
    const stroke = colours.tint ? colours.tint(group.attribute) : colours.ink
    out.push(
      `<g fill="none" stroke="${stroke}" stroke-width="${width.toFixed(3)}" stroke-linecap="round">`,
      ...group.paths.map((d) => `<path d="${d}"/>`),
      '</g>',
    )
  }

  out.push(
    `<g fill="${colours.parchment}" stroke="${colours.scaffoldInk}" stroke-width="${(width / 4).toFixed(3)}">`,
    ...p.rune.nodes.map(
      (n) => `<circle cx="${n.x.toFixed(2)}" cy="${n.y.toFixed(2)}" r="${node.toFixed(2)}"/>`,
    ),
    '</g>',
  )

  if (p.rune.nodes.length) {
    const start = p.rune.nodes[0]
    out.push(
      `<circle cx="${start.x.toFixed(2)}" cy="${start.y.toFixed(2)}" r="${(node * 1.35).toFixed(2)}" fill="${colours.text}"/>`,
    )
  }

  out.push('</g>')
  return out
}

/** The plate as a standalone SVG document. */
export function plateToSvg(plate: Plate, colours: PlateInk): string {
  const { layout: plan } = plate
  const parts: string[] = [
    // Declared because the plate carries em dashes and middots in its labels,
    // and a downloaded .svg opened straight from disk has no other hint.
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${plan.width} ${plan.height}" width="${plan.width * 2}" height="${plan.height * 2}">`,
    `<rect width="${plan.width}" height="${plan.height}" fill="${colours.parchment}"/>`,
    `<rect x="14" y="14" width="${plan.width - 28}" height="${plan.height - 28}" fill="none" stroke="${colours.gold}" stroke-width="1" opacity="0.55"/>`,
    `<text x="${plan.title.x}" y="${plan.title.y}" text-anchor="middle" font-family="${FONT}" font-size="30" letter-spacing="3" fill="${colours.text}">${escape(plate.title.toUpperCase())}</text>`,
  ]

  parts.push(
    ...piece(plate.main, plan.main.x, plan.main.y, colours, true),
    `<line x1="${plan.divider.x1}" y1="${plan.divider.y}" x2="${plan.divider.x2}" y2="${plan.divider.y}" stroke="${colours.gold}" stroke-width="1" opacity="0.6"/>`,
  )

  for (const { cell, ...p } of plate.cells) {
    parts.push(
      `<text x="${cell.x + cell.size / 2}" y="${cell.labelY}" text-anchor="middle" font-family="${FONT}" font-size="11" letter-spacing="1.6" fill="${colours.gold}">${escape(cell.attribute.label.toUpperCase())}</text>`,
      ...piece(p, cell.x, cell.runeY, colours, false),
      `<text x="${cell.x + cell.size / 2}" y="${cell.valueY}" text-anchor="middle" font-family="${BODY_FONT}" font-size="15" font-style="italic" fill="${colours.text}">${escape(cellValue(cell.attribute, cell.feature))}</text>`,
      `<text x="${cell.x + cell.size / 2}" y="${cell.valueY + 17}" text-anchor="middle" font-family="${BODY_FONT}" font-size="11" fill="${colours.scaffoldInk}">k = ${cell.attribute.k}</text>`,
    )
  }

  parts.push(
    `<text x="${plan.footer.x}" y="${plan.footer.y}" text-anchor="middle" font-family="${BODY_FONT}" font-size="11" fill="${colours.scaffoldInk}">Spell writing system by The Gorilla of Destiny · not endorsed by or authored by them</text>`,
    '</svg>',
  )

  return parts.join('\n')
}

/** The attributes a plate was written from, for the caption under the title. */
export function plateSummary(spell: SpellAttributes, sides = 11): string {
  return encodeSpell(spell, sides)
    .map((l) => cellValue(l.attribute, l.feature))
    .join(' · ')
}

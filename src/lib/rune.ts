/**
 * Assembling one figure: nodes, the faint scaffold of every chord the base
 * could carry, and the drawn chords of each attribute layer.
 */

import { BASE_BY_ID, type BaseId, type Point } from './bases'
import { chordPath } from './connectors'
import { encodeSpell, scaffoldChords, type Chord, type Layer } from './encoding'
import type { SpellAttributes } from './keys'

export interface RuneStyle {
  readonly base: BaseId
  readonly sides: number
  readonly curvature: number
  readonly showScaffold: boolean
  readonly showNodes: boolean
  readonly showStartNode: boolean
}

export interface DrawnLayer extends Layer {
  readonly paths: readonly string[]
}

export interface Rune {
  readonly nodes: readonly Point[]
  readonly centre: Point
  readonly layers: readonly DrawnLayer[]
  readonly scaffold: readonly string[]
  readonly size: number
}

/** Leaves room for the stroke and the node rings to sit inside the viewBox. */
const MARGIN = 0.1

export function buildRune(spell: SpellAttributes, style: RuneStyle, size = 100): Rune {
  const radius = (size / 2) * (1 - MARGIN)
  const mid = size / 2

  const unit = BASE_BY_ID[style.base].place(style.sides)
  const nodes = unit.map((p) => ({ x: mid + p.x * radius, y: mid + p.y * radius }))
  const centre = {
    x: nodes.reduce((t, p) => t + p.x, 0) / nodes.length,
    y: nodes.reduce((t, p) => t + p.y, 0) / nodes.length,
  }

  const draw = (c: Chord) => chordPath(nodes[c.from], nodes[c.to], centre, style.curvature)

  const layers = encodeSpell(spell, style.sides).map((layer) => ({
    ...layer,
    paths: layer.chords.map(draw),
  }))

  const scaffold = style.showScaffold ? scaffoldChords(style.sides).map(draw) : []

  return { nodes, centre, layers, scaffold, size }
}

/** A standalone SVG document, for download or copy-paste. */
export function runeToSvg(
  rune: Rune,
  options: { ink: string; scaffoldInk: string; showNodes: boolean; showStartNode: boolean },
): string {
  const { size } = rune
  const stroke = size / 70
  const node = size / 110

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 6}" height="${size * 6}">`,
  ]

  if (rune.scaffold.length) {
    parts.push(
      `<g fill="none" stroke="${options.scaffoldInk}" stroke-width="${(stroke / 6).toFixed(3)}" opacity="0.45">`,
      ...rune.scaffold.map((d) => `<path d="${d}"/>`),
      '</g>',
    )
  }

  parts.push(
    `<g fill="none" stroke="${options.ink}" stroke-width="${stroke.toFixed(3)}" stroke-linecap="round">`,
    ...rune.layers.flatMap((l) => l.paths).map((d) => `<path d="${d}"/>`),
    '</g>',
  )

  if (options.showNodes) {
    parts.push(
      `<g fill="none" stroke="${options.scaffoldInk}" stroke-width="${(stroke / 4).toFixed(3)}">`,
      ...rune.nodes.map(
        (p) => `<circle cx="${p.x.toFixed(3)}" cy="${p.y.toFixed(3)}" r="${node.toFixed(3)}"/>`,
      ),
      '</g>',
    )
  }

  if (options.showStartNode && rune.nodes.length) {
    const start = rune.nodes[0]
    parts.push(
      `<circle cx="${start.x.toFixed(3)}" cy="${start.y.toFixed(3)}" r="${(node * 1.35).toFixed(3)}" fill="${options.ink}"/>`,
    )
  }

  parts.push('</svg>')
  return parts.join('\n')
}

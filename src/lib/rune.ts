/**
 * Assembling one figure: nodes, the faint scaffold of every chord the base
 * could carry, and the drawn chords of each attribute layer.
 */

import { BASE_BY_ID, type BaseId, type Point } from './bases'
import { chord, unionBox, type Box } from './connectors'
import { scaffoldChords, type Chord, type Figure, type Layer } from './encoding'


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
  /** The nominal frame the nodes were laid out in. */
  readonly size: number
  /**
   * A square that holds the whole drawing, bows included. A deep bow on an
   * open base reaches well outside the ring of nodes, so the frame follows the
   * ink rather than the other way round.
   */
  readonly viewBox: { readonly x: number; readonly y: number; readonly size: number }
  /** Line weights, scaled so a shrunk figure keeps the same visual weight. */
  readonly strokeWidth: number
  readonly nodeRadius: number
}

/**
 * Place a rune's own frame inside a box on a page.
 *
 * An explicit transform rather than a nested <svg>: nested viewports are valid
 * SVG but are not honoured by every renderer that might open an exported file.
 */
export function fitTransform(rune: Rune, x: number, y: number, box: number): string {
  const scale = box / rune.viewBox.size
  const tx = x - rune.viewBox.x * scale
  const ty = y - rune.viewBox.y * scale
  return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})`
}

export function viewBoxOf(rune: Rune): string {
  const { x, y, size } = rune.viewBox
  return `${x.toFixed(2)} ${y.toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`
}

/** Leaves room for the stroke and the node rings to sit inside the viewBox. */
const MARGIN = 0.1

/**
 * The nodes lying between two endpoints along the base.
 *
 * On a closed base that is the shorter way round. On an open one there is no
 * way round at all, so it is simply the nodes in between by index — which is
 * why a chord from the last node to the first spans the whole curve rather
 * than stepping across a gap.
 */
export function betweenIndices(count: number, closed: boolean, i: number, j: number): number[] {
  if (!closed) {
    const lo = Math.min(i, j)
    const hi = Math.max(i, j)
    return Array.from({ length: Math.max(0, hi - lo - 1) }, (_, t) => lo + 1 + t)
  }
  const forward = (j - i + count) % count
  const [from, steps] = forward * 2 <= count ? [i, forward] : [j, count - forward]
  return Array.from({ length: Math.max(0, steps - 1) }, (_, t) => (from + 1 + t) % count)
}

/** Centre of the circle through three points, or null if they are collinear. */
function circumcentre(a: Point, b: Point, c: Point): Point | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-9) return null
  const aa = a.x * a.x + a.y * a.y
  const bb = b.x * b.x + b.y * b.y
  const cc = c.x * c.x + c.y * c.y
  return {
    x: (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d,
    y: (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d,
  }
}

/**
 * The point a chord should bow towards.
 *
 * A bow that follows the base curve runs alongside it and is hard to pick out,
 * so a chord bows away from the stretch of base between its own endpoints. On
 * a polygon that works out as bowing inwards, which is what the guide asks for;
 * on an arc or a curve it bows to the open side instead of nesting along it.
 *
 * Where the endpoints are neighbours there is no stretch in between, so the
 * local centre of curvature stands in — for a circular base that is exactly
 * the centre of the circle.
 */
function bowTowards(
  nodes: readonly Point[],
  closed: boolean,
  i: number,
  j: number,
  fallback: Point,
): Point {
  const inner = betweenIndices(nodes.length, closed, i, j)

  if (inner.length > 0) {
    const cx = inner.reduce((t, n) => t + nodes[n].x, 0) / inner.length
    const cy = inner.reduce((t, n) => t + nodes[n].y, 0) / inner.length
    const mid = { x: (nodes[i].x + nodes[j].x) / 2, y: (nodes[i].y + nodes[j].y) / 2 }
    // Reflecting the stretch through the chord turns "away from" into a point
    // to aim at, which is all the connector needs.
    return { x: 2 * mid.x - cx, y: 2 * mid.y - cy }
  }

  const count = nodes.length
  const lo = Math.min(i, j)
  const outside = closed ? (lo - 1 + count) % count : lo > 0 ? lo - 1 : Math.max(i, j) + 1
  return circumcentre(nodes[outside] ?? nodes[i], nodes[i], nodes[j]) ?? fallback
}

/** Where a chord of a finished figure should bow towards. */
export function bowTarget(rune: Rune, closed: boolean, i: number, j: number): Point {
  return bowTowards(rune.nodes, closed, i, j, rune.centre)
}

export function buildRune(figure: Figure, style: RuneStyle, size = 100): Rune {
  const attributes = figure.attributes
  const radius = (size / 2) * (1 - MARGIN)
  const mid = size / 2

  const base = BASE_BY_ID[style.base]
  const unit = base.place(style.sides)
  const nodes = unit.map((p) => ({ x: mid + p.x * radius, y: mid + p.y * radius }))
  const centre = {
    x: nodes.reduce((t, p) => t + p.x, 0) / nodes.length,
    y: nodes.reduce((t, p) => t + p.y, 0) / nodes.length,
  }

  const boxes: Box[] = []
  const draw = (c: Chord) => {
    const drawn = chord(
      nodes[c.from],
      nodes[c.to],
      bowTowards(nodes, base.closed, c.from, c.to, centre),
      style.curvature,
    )
    boxes.push(drawn.box)
    return drawn.d
  }

  const layers = figure.layers.map((layer) => ({ ...layer, paths: layer.chords.map(draw) }))

  const scaffold = style.showScaffold ? scaffoldChords(style.sides, attributes).map(draw) : []

  // The frame is the nominal square unless something reaches past it, so a
  // figure keeps a steady, familiar size and only pulls back when a deep bow
  // would otherwise be cropped.
  const padding = size / 110 + size / 70
  const reach = unionBox(boxes)
  const spill = Math.max(
    0,
    padding - reach.minX,
    padding - reach.minY,
    reach.maxX + padding - size,
    reach.maxY + padding - size,
  )
  const span = size + spill * 2
  const viewBox = { x: -spill, y: -spill, size: span }

  return {
    nodes,
    centre,
    layers,
    scaffold,
    size,
    viewBox,
    strokeWidth: span / 70,
    nodeRadius: span / 110,
  }
}

/** A standalone SVG document, for download or copy-paste. */
export function runeToSvg(
  rune: Rune,
  options: { ink: string; scaffoldInk: string; showNodes: boolean; showStartNode: boolean },
): string {
  const stroke = rune.strokeWidth
  const node = rune.nodeRadius
  const px = Math.round(rune.size * 6)

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxOf(rune)}" width="${px}" height="${px}">`,
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

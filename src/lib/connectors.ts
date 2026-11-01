/**
 * How two nodes are joined — Sections 2.3.1 and 2.3.2.
 *
 * The guide draws connections three ways: straight lines, "centred circles"
 * whose centre is the midpoint of the two nodes, and "non-centred circles"
 * where the centre is free and the arc bows by some other amount.
 *
 * All three are one family. A circular arc through two points is fixed by its
 * sagitta — how far the arc bows off the chord — so a single curvature dial
 * covers the lot: 0 is a straight line and 1 is the centred circle, whose
 * radius is exactly half the chord. The guide picks whichever arc stays inside
 * the figure, so the bow always points at the centre.
 */

import type { Point } from './bases'

export type ConnectorId = 'straight' | 'arc'

export interface Connector {
  readonly id: ConnectorId
  readonly label: string
  readonly description: string
  readonly curved: boolean
}

export const CONNECTORS: readonly Connector[] = [
  {
    id: 'straight',
    label: 'Straight lines',
    description: 'The default of the published dictionaries.',
    curved: false,
  },
  {
    id: 'arc',
    label: 'Circular arcs',
    description: 'Centred circles at 1.00; anything else is a non-centred circle.',
    curved: true,
  },
]

/** Below this the arc is indistinguishable from a line, and the radius blows up. */
const FLAT = 1e-4

export interface Box {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

export interface Chord {
  readonly d: string
  /** Everything the chord actually covers, bow included. */
  readonly box: Box
}

function boxOf(points: readonly Point[]): Box {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}

export function unionBox(boxes: readonly Box[]): Box {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  }
}

const TAU = Math.PI * 2

/**
 * A turn in [0, TAU).
 *
 * JavaScript's % keeps the sign of the dividend, so a single `+ TAU` is not
 * enough to bring a difference of two bearings back into range — it can still
 * land negative, which silently reads as "no distance at all".
 */
function turn(angle: number): number {
  return ((angle % TAU) + TAU) % TAU
}

/**
 * An SVG path joining two nodes.
 *
 * `curvature` is the sagitta as a fraction of half the chord, and `centre` is
 * the point the bow should lean towards.
 */
export function chord(p: Point, q: Point, towards: Point, curvature: number): Chord {
  const move = `M ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
  const dx = q.x - p.x
  const dy = q.y - p.y
  const length = Math.hypot(dx, dy)
  if (length < FLAT) return { d: move, box: boxOf([p]) }

  const sagitta = (curvature * length) / 2
  if (Math.abs(sagitta) < FLAT) {
    return { d: `${move} L ${q.x.toFixed(3)} ${q.y.toFixed(3)}`, box: boxOf([p, q]) }
  }

  const radius = (length * length) / 4 / (2 * Math.abs(sagitta)) + Math.abs(sagitta) / 2

  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  let nx = -dy / length
  let ny = dx / length
  if (nx * (towards.x - mid.x) + ny * (towards.y - mid.y) < 0) {
    nx = -nx
    ny = -ny
  }
  const apex = { x: mid.x + nx * sagitta, y: mid.y + ny * sagitta }

  // A bow deeper than the half-chord is the major arc of its circle, and the
  // centre then sits on the same side as the apex rather than opposite it.
  const largeArc = Math.abs(sagitta) > length / 2 ? 1 : 0
  const reach = Math.sqrt(Math.max(0, radius * radius - (length * length) / 4))
  const centre = {
    x: mid.x + nx * reach * (largeArc ? 1 : -1),
    y: mid.y + ny * reach * (largeArc ? 1 : -1),
  }

  // Everything below hangs off one fact: the arc is the path from p to q that
  // passes through the apex. Deriving the sweep flag and the swept range from
  // that same fact keeps them from ever disagreeing.
  const from = Math.atan2(p.y - centre.y, p.x - centre.x)
  const to = Math.atan2(q.y - centre.y, q.x - centre.x)
  const toApex = Math.atan2(apex.y - centre.y, apex.x - centre.x)
  const rising = turn(to - from)
  const clockwise = turn(toApex - from) <= rising
  const swept = clockwise ? rising : TAU - rising
  const sweep = clockwise ? 1 : 0

  // The reach of an arc is its ends, its apex, and whichever compass points of
  // its circle it happens to pass on the way.
  const covered: Point[] = [p, q, apex]
  for (let compass = 0; compass < 4; compass++) {
    const angle = (compass * Math.PI) / 2
    const along = clockwise ? turn(angle - from) : turn(from - angle)
    if (along <= swept) {
      covered.push({
        x: centre.x + radius * Math.cos(angle),
        y: centre.y + radius * Math.sin(angle),
      })
    }
  }

  const r = radius.toFixed(3)
  return {
    d: `${move} A ${r} ${r} 0 ${largeArc} ${sweep} ${q.x.toFixed(3)} ${q.y.toFixed(3)}`,
    box: boxOf(covered),
  }
}

/** The path alone, for callers that do not need the extent. */
export function chordPath(p: Point, q: Point, towards: Point, curvature: number): string {
  return chord(p, q, towards, curvature).d
}

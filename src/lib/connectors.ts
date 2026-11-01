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

/**
 * An SVG path joining two nodes.
 *
 * `curvature` is the sagitta as a fraction of half the chord, and `centre` is
 * the point the bow should lean towards.
 */
export function chordPath(p: Point, q: Point, centre: Point, curvature: number): string {
  const move = `M ${p.x.toFixed(3)} ${p.y.toFixed(3)}`
  const dx = q.x - p.x
  const dy = q.y - p.y
  const length = Math.hypot(dx, dy)
  if (length < FLAT) return move

  const sagitta = (curvature * length) / 2
  if (Math.abs(sagitta) < FLAT) return `${move} L ${q.x.toFixed(3)} ${q.y.toFixed(3)}`

  const radius = (length * length) / 4 / (2 * Math.abs(sagitta)) + Math.abs(sagitta) / 2

  // Bow towards the centre of the figure, so arcs stay within its bounds.
  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  let nx = -dy / length
  let ny = dx / length
  if (nx * (centre.x - mid.x) + ny * (centre.y - mid.y) < 0) {
    nx = -nx
    ny = -ny
  }
  const apex = { x: mid.x + nx * sagitta, y: mid.y + ny * sagitta }

  // A bow deeper than the half-chord is the major arc of its circle.
  const largeArc = Math.abs(sagitta) > length / 2 ? 1 : 0
  // Positive cross product puts the apex on the anticlockwise side on screen.
  const cross = dx * (apex.y - p.y) - dy * (apex.x - p.x)
  const sweep = cross > 0 ? 0 : 1

  const r = radius.toFixed(3)
  return `${move} A ${r} ${r} 0 ${largeArc} ${sweep} ${q.x.toFixed(3)} ${q.y.toFixed(3)}`
}

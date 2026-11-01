/**
 * Geometry checks.
 *
 * The arc test matters because an SVG "A" command does not say where the curve
 * bulges — that falls out of the radius and the two flags. The guide is explicit
 * that arcs should stay "within the polygon's outermost borders", so here the
 * path is converted back to a centre and its apex measured against the figure.
 */

import { describe, expect, it } from 'vitest'

import { BASES, BASE_BY_ID, type Point } from '../src/lib/bases'
import { chordPath } from '../src/lib/connectors'
import { DEFAULT_SIDES } from '../src/lib/keys'

const N = DEFAULT_SIDES
const ORIGIN: Point = { x: 0, y: 0 }

/** W3C SVG 1.1 F.6.5: recover the centre of an arc from its endpoint form. */
function arcApex(p: Point, q: Point, path: string): Point {
  const m = path.match(/A ([\d.-]+) [\d.-]+ 0 (\d) (\d)/)
  if (!m) throw new Error(`not an arc: ${path}`)
  const r = Number(m[1])
  const largeArc = Number(m[2])
  const sweep = Number(m[3])

  const x1 = (p.x - q.x) / 2
  const y1 = (p.y - q.y) / 2
  const num = r * r * r * r - r * r * y1 * y1 - r * r * x1 * x1
  const den = r * r * y1 * y1 + r * r * x1 * x1
  const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den))
  const cx = coef * r * (y1 / r) + (p.x + q.x) / 2
  const cy = coef * -r * (x1 / r) + (p.y + q.y) / 2

  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  let dx = mid.x - cx
  let dy = mid.y - cy
  const len = Math.hypot(dx, dy)

  if (len < 1e-9) {
    // A half turn: the centre sits on the chord, so take a quarter turn from an
    // endpoint in whichever direction the sweep flag runs (y grows downwards,
    // so sweep 1 turns clockwise on screen).
    const ax = p.x - cx
    const ay = p.y - cy
    return sweep === 1 ? { x: cx - ay, y: cy + ax } : { x: cx + ay, y: cy - ax }
  }

  // Otherwise the apex lies on the line from the centre through the midpoint.
  dx /= len
  dy /= len
  const sign = largeArc === 1 ? -1 : 1
  return { x: cx + sign * r * dx, y: cy + sign * r * dy }
}

describe('connectors', () => {
  it('draws a plain line at zero curvature', () => {
    expect(chordPath({ x: 0, y: 0 }, { x: 10, y: 0 }, ORIGIN, 0)).toBe('M 0.000 0.000 L 10.000 0.000')
  })

  it('makes the centred circle exactly half the chord across', () => {
    // Section 2.3.1: the circle's centre is the midpoint of the two nodes.
    const path = chordPath({ x: -5, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 40 }, 1)
    const radius = Number(path.match(/A ([\d.]+)/)![1])
    expect(radius).toBeCloseTo(5, 3)
  })

  it('bows every chord towards the centre of the figure', () => {
    for (const base of BASES) {
      const nodes = base.place(N)
      const centre = {
        x: nodes.reduce((t, p) => t + p.x, 0) / N,
        y: nodes.reduce((t, p) => t + p.y, 0) / N,
      }
      for (const curvature of [0.3, 1, 1.4]) {
        for (let i = 0; i < N; i++) {
          for (const k of [1, 2, 3, 4, 5]) {
            const p = nodes[i]
            const q = nodes[(i + k) % N]
            if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-6) continue

            const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
            const toCentre = { x: centre.x - mid.x, y: centre.y - mid.y }

            // When the centre is collinear with the chord there is no inward
            // side to bow towards, and either choice is equally correct.
            const dx = q.x - p.x
            const dy = q.y - p.y
            const span = Math.hypot(dx, dy)
            const offChord = Math.abs(dx * toCentre.y - dy * toCentre.x) / span
            if (offChord < 1e-3) continue

            const apex = arcApex(p, q, chordPath(p, q, centre, curvature))
            const bow = { x: apex.x - mid.x, y: apex.y - mid.y }
            expect(
              bow.x * toCentre.x + bow.y * toCentre.y,
              `${base.id} curvature=${curvature} i=${i} k=${k}`,
            ).toBeGreaterThan(0)
          }
        }
      }
    }
  })
})

describe('bases', () => {
  it('puts the polygon start node just clockwise of vertical', () => {
    const nodes = BASE_BY_ID.polygon.place(N)
    const bearing = (Math.atan2(nodes[0].x, -nodes[0].y) * 180) / Math.PI
    expect(bearing).toBeCloseTo((1.5 * 360) / N, 6)
  })

  it('spaces the polygon evenly on the unit circle', () => {
    for (const p of BASE_BY_ID.polygon.place(N)) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 10)
    }
  })

  it('fits every base inside the frame and fills one axis of it', () => {
    for (const base of BASES) {
      const nodes = base.place(N)
      const reach = Math.max(...nodes.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))))
      expect(reach, base.id).toBeLessThanOrEqual(1 + 1e-9)
      expect(reach, base.id).toBeGreaterThan(0.99)
    }
  })

  it('gives every base the requested number of distinct nodes', () => {
    for (const base of BASES) {
      for (const sides of [5, 7, 11, 13]) {
        const nodes = base.place(sides)
        expect(nodes.length, base.id).toBe(sides)
        const distinct = new Set(nodes.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`))
        expect(distinct.size, base.id).toBe(sides)
      }
    }
  })
})

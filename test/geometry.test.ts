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
import { chord, chordPath } from '../src/lib/connectors'
import { ATTRIBUTES, DEFAULT_SIDES, type SpellAttributes } from '../src/lib/keys'
import { figureFromSpell } from '../src/lib/encoding'
import { betweenIndices, bowTarget, buildRune, type RuneStyle } from '../src/lib/rune'

const N = DEFAULT_SIDES
const ORIGIN: Point = { x: 0, y: 0 }

/** A spell dense enough that every layer contributes chords. */
const SPELL: SpellAttributes = {
  level: '9',
  school: 'Transmutation',
  damage: 'Thunder',
  area: 'Sphere (60)',
  range: 'Touch',
}

const FIGURE = figureFromSpell(SPELL, N, ATTRIBUTES)

const STYLE: RuneStyle = {
  base: 'polygon',
  sides: N,
  curvature: 0,
  showScaffold: false,
  showNodes: true,
  showStartNode: true,
}

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

  it('bows every chord away from the base between its endpoints', () => {
    // A bow that follows the base runs alongside it and is hard to read. On a
    // polygon this comes out as bowing inwards; on an open curve it bows to the
    // open side rather than nesting along the curve.
    for (const base of BASES) {
      for (const curvature of [0.3, 1]) {
        for (let i = 0; i < N; i++) {
          for (const k of [1, 2, 3, 4, 5]) {
            const j = (i + k) % N
            const rune = buildRune(FIGURE, { ...STYLE, base: base.id, curvature }, 100)
            const p = rune.nodes[i]
            const q = rune.nodes[j]

            const inner = betweenIndices(N, base.closed, i, j)
            if (inner.length === 0) continue

            const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
            const away = {
              x: mid.x - inner.reduce((t, n) => t + rune.nodes[n].x, 0) / inner.length,
              y: mid.y - inner.reduce((t, n) => t + rune.nodes[n].y, 0) / inner.length,
            }

            // If that stretch sits on the chord there is no side to prefer.
            const dx = q.x - p.x
            const dy = q.y - p.y
            const off = Math.abs(dx * away.y - dy * away.x) / Math.hypot(dx, dy)
            if (off < 1e-3) continue

            const apex = arcApex(p, q, chordPath(p, q, bowTarget(rune, base.closed, i, j), curvature))
            const bow = { x: apex.x - mid.x, y: apex.y - mid.y }
            expect(
              bow.x * away.x + bow.y * away.y,
              `${base.id} curvature=${curvature} i=${i} k=${k}`,
            ).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('bows a quarter-circle end-to-end chord away from the arc, not along it', () => {
    // The case that showed the old rule was wrong: the chord joining the two
    // ends of a quarter circle used to bow the same way the arc curves, so it
    // ran alongside the base instead of closing a readable shape against it.
    const rune = buildRune(FIGURE, { ...STYLE, base: 'quarter', curvature: 0.6 }, 100)
    const first = rune.nodes[0]
    const last = rune.nodes[N - 1]

    const dx = last.x - first.x
    const dy = last.y - first.y
    const span = Math.hypot(dx, dy)
    /** Signed distance from the end-to-end chord. */
    const side = (p: Point) => (dx * (p.y - first.y) - dy * (p.x - first.x)) / span

    const furthest = rune.nodes.reduce((best, p) =>
      Math.abs(side(p)) > Math.abs(side(best)) ? p : best,
    )
    const arcSide = Math.sign(side(furthest))
    expect(arcSide).not.toBe(0)

    const path = chordPath(first, last, bowTarget(rune, false, 0, N - 1), 0.6)
    const apex = arcApex(first, last, path)
    expect(Math.sign(side(apex))).toBe(-arcSide)
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

describe('the frame', () => {
  const bows = [0, 0.2, 0.45, 0.6, 0.8, 1]

  it('reports an arc’s true reach, not its whole circle', () => {
    // A shallow bow has an enormous radius. Counting a compass point of that
    // circle which the arc never reaches would blow the frame wide open, which
    // is what a signed-modulo slip used to do.
    const p = { x: 84, y: 20 }
    const q = { x: 91, y: 69 }
    const { box } = chord(p, q, { x: 50, y: 50 }, 0.2)
    expect(box.minX).toBeGreaterThan(75)
    expect(box.maxX).toBeLessThan(95)
    expect(box.minY).toBeGreaterThan(15)
    expect(box.maxY).toBeLessThan(75)
  })

  it('keeps a polygon exactly its nominal size at every bow', () => {
    for (const curvature of bows) {
      const rune = buildRune(FIGURE, { ...STYLE, base: 'polygon', curvature }, 100)
      expect(rune.viewBox.size, `curvature ${curvature}`).toBeCloseTo(100, 6)
    }
  })

  it('never shrinks a figure below its nominal size', () => {
    for (const base of BASES) {
      for (const curvature of bows) {
        const rune = buildRune(FIGURE, { ...STYLE, base: base.id, curvature }, 100)
        expect(rune.viewBox.size, `${base.id} ${curvature}`).toBeGreaterThanOrEqual(100 - 1e-6)
      }
    }
  })

  it('grows only as far as the ink actually reaches', () => {
    for (const base of BASES) {
      for (const curvature of bows) {
        const style = { ...STYLE, base: base.id, curvature, showScaffold: true }
        const rune = buildRune(FIGURE, style, 100)
        const { x, y, size } = rune.viewBox
        for (let i = 0; i < N; i++) {
          for (const k of [1, 2, 3, 4, 5]) {
            const j = (i + k) % N
            const { box } = chord(
              rune.nodes[i],
              rune.nodes[j],
              bowTarget(rune, base.closed, i, j),
              curvature,
            )
            expect(box.minX, `${base.id} ${curvature}`).toBeGreaterThanOrEqual(x - 1e-6)
            expect(box.minY, `${base.id} ${curvature}`).toBeGreaterThanOrEqual(y - 1e-6)
            expect(box.maxX, `${base.id} ${curvature}`).toBeLessThanOrEqual(x + size + 1e-6)
            expect(box.maxY, `${base.id} ${curvature}`).toBeLessThanOrEqual(y + size + 1e-6)
          }
        }
      }
    }
  })

  it('does not move when the scaffold is shown or hidden', () => {
    for (const base of BASES) {
      for (const curvature of bows) {
        const on = buildRune(FIGURE, { ...STYLE, base: base.id, curvature, showScaffold: true }, 100)
        const off = buildRune(FIGURE, { ...STYLE, base: base.id, curvature, showScaffold: false }, 100)
        expect(off.viewBox, `${base.id} ${curvature}`).toEqual(on.viewBox)
      }
    }
  })
})

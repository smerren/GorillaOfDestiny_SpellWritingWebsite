/**
 * Moving a figure from one shape to the next.
 *
 * The hook that drives this needs a browser, but everything it decides is
 * arithmetic and lives here, so the behaviour that matters can be checked
 * without one.
 */

import { describe, expect, it } from 'vitest'

import { blend, ease, grownBy, lerp, lerpPoint, type Frame } from '../src/lib/animate'
import { BASE_BY_ID } from '../src/lib/bases'
import { chordBetween } from '../src/lib/rune'

const frame = (nodes: Array<[number, number]>, size = 100): Frame => ({
  nodes: nodes.map(([x, y]) => ({ x, y })),
  viewBox: { x: 0, y: 0, size },
})

describe('easing', () => {
  it('starts where it starts and ends where it ends', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5, 6)
  })

  it('never overshoots, however far out of range it is asked', () => {
    for (const t of [-5, -0.1, 0, 0.3, 0.7, 1, 1.4, 99]) {
      const e = ease(t)
      expect(e).toBeGreaterThanOrEqual(0)
      expect(e).toBeLessThanOrEqual(1)
    }
  })

  it('rises without ever going backwards', () => {
    let last = -1
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const e = ease(t)
      expect(e).toBeGreaterThanOrEqual(last - 1e-9)
      last = e
    }
  })
})

describe('sliding between figures', () => {
  const from = frame([[0, 0], [10, 0]], 100)
  const to = frame([[0, 10], [20, 0]], 150)

  it('leaves everything where it was at the start', () => {
    const at = blend(from, to, 0)
    expect(at.nodes).toEqual(from.nodes)
    expect(at.viewBox.size).toBeCloseTo(100, 6)
  })

  it('arrives exactly, so nothing is left a fraction out', () => {
    const at = blend(from, to, 1)
    expect(at.nodes).toEqual(to.nodes)
    expect(at.viewBox.size).toBeCloseTo(150, 6)
  })

  it('carries the frame along with the dots', () => {
    const at = blend(from, to, 0.5)
    expect(at.viewBox.size).toBeGreaterThan(100)
    expect(at.viewBox.size).toBeLessThan(150)
  })

  it('keeps the figure spread, rather than crumpling it through the middle', () => {
    // Dots sweep around the centre, so each stays between the distance it
    // started at and the one it is heading for. Interpolating straight across
    // instead would pull them all inward at once and knot the figure halfway.
    const ring = frame(
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return [50 + 40 * Math.cos(a), 50 + 40 * Math.sin(a)] as [number, number]
      }),
    )
    const line = frame(
      Array.from({ length: 8 }, (_, i) => [20 + i * 8, 20 + i * 8] as [number, number]),
    )

    for (let t = 0.05; t < 1; t += 0.1) {
      const at = blend(ring, line, t)
      const middle = {
        x: at.nodes.reduce((s, p) => s + p.x, 0) / at.nodes.length,
        y: at.nodes.reduce((s, p) => s + p.y, 0) / at.nodes.length,
      }
      const spread = Math.max(...at.nodes.map((p) => Math.hypot(p.x - middle.x, p.y - middle.y)))
      // Never collapses to a knot: the widest dot stays well off the centre.
      expect(spread, `t=${t.toFixed(2)}`).toBeGreaterThan(15)
    }
  })

  it('never lets a dot swing outside the frame', () => {
    const ring = frame(
      Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2
        return [50 + 45 * Math.cos(a), 50 + 45 * Math.sin(a)] as [number, number]
      }),
    )
    const arc = frame(
      Array.from({ length: 11 }, (_, i) => {
        const a = (i / 10) * (Math.PI / 2)
        return [10 + 80 * Math.sin(a), 90 - 80 * Math.cos(a)] as [number, number]
      }),
    )
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const at = blend(ring, arc, t)
      const { x, y, size } = at.viewBox
      for (const node of at.nodes) {
        expect(node.x, `t=${t.toFixed(2)}`).toBeGreaterThanOrEqual(x - 1e-6)
        expect(node.x, `t=${t.toFixed(2)}`).toBeLessThanOrEqual(x + size + 1e-6)
        expect(node.y, `t=${t.toFixed(2)}`).toBeGreaterThanOrEqual(y - 1e-6)
        expect(node.y, `t=${t.toFixed(2)}`).toBeLessThanOrEqual(y + size + 1e-6)
      }
    }
  })

  it('turns the short way round', () => {
    // A dot just past twelve o'clock and one just before it should pass
    // through the top, not swing the long way round the circle.
    const before = frame([[50, 10], [50, 90]])
    const after = frame([[40, 12], [60, 88]])
    const at = blend(before, after, 0.5)
    expect(at.nodes[0].y).toBeLessThan(50)
  })

  it('takes the new arrangement whole when the dot count changes', () => {
    // There is no sensible path from two dots to three, so it does not invent one.
    const grown = frame([[0, 0], [5, 5], [10, 0]])
    expect(blend(from, grown, 0.5).nodes).toEqual(grown.nodes)
  })
})

describe('drawing a line on and taking it back', () => {
  it('runs from nothing to whole, and back', () => {
    expect(grownBy(0, 1, 0)).toBeCloseTo(0, 6)
    expect(grownBy(0, 1, 1)).toBeCloseTo(1, 6)
    expect(grownBy(1, 0, 1)).toBeCloseTo(0, 6)
  })

  it('starts from where a line had got to, so interrupting does not jump', () => {
    // A line half drawn that is then told to leave starts leaving from a half.
    expect(grownBy(0.5, 0, 0)).toBeCloseTo(0.5, 6)
  })
})

describe('a part-drawn chord', () => {
  const nodes = BASE_BY_ID.polygon.place(11).map((p) => ({ x: 50 + p.x * 45, y: 50 + p.y * 45 }))

  it('is nothing at all when it has not started', () => {
    const d = chordBetween(nodes, true, 0, 1, 0, 0)
    // Just a move to the first node: no line yet.
    expect(d).toMatch(/^M [\d.-]+ [\d.-]+$/)
  })

  it('reaches the far node once whole', () => {
    const whole = chordBetween(nodes, true, 0, 3, 0, 1)
    const q = nodes[3]
    expect(whole).toContain(`${q.x.toFixed(3)} ${q.y.toFixed(3)}`)
  })

  it('grows from its first node rather than appearing all at once', () => {
    const start = nodes[0]
    for (const grown of [0.25, 0.5, 0.75]) {
      const d = chordBetween(nodes, true, 0, 3, 0, grown)
      expect(d.startsWith(`M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`)).toBe(true)
      const [, x, y] = d.match(/L ([\d.-]+) ([\d.-]+)/)!
      const reach = Math.hypot(Number(x) - start.x, Number(y) - start.y)
      const full = Math.hypot(nodes[3].x - start.x, nodes[3].y - start.y)
      expect(reach).toBeCloseTo(full * grown, 2)
    }
  })

  it('curves on the way in the way it will when it arrives', () => {
    // A bowed line part drawn is still an arc, not a straight stand-in.
    expect(chordBetween(nodes, true, 0, 3, 0.6, 0.5)).toContain(' A ')
  })
})

describe('lerp', () => {
  it('is exact at both ends', () => {
    expect(lerp(3, 9, 0)).toBe(3)
    expect(lerp(3, 9, 1)).toBe(9)
    expect(lerpPoint({ x: 0, y: 0 }, { x: 4, y: 8 }, 0.25)).toEqual({ x: 1, y: 2 })
  })
})

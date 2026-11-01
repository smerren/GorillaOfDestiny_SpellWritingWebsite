/**
 * Moving a figure from one shape to the next.
 *
 * Two things change, and they change differently. When the base changes the
 * dots move, so their positions are slid from where they were to where they
 * are going. When the spell changes the dots stay put and the lines change
 * instead, so a line is drawn on from its first node and taken back the same
 * way. Both fall out of geometry, which keeps the whole thing to arithmetic
 * and off the DOM.
 */

import type { Point } from './bases'

export const DURATION = 420

/** Slow at both ends, quick through the middle. */
export function ease(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function lerpPoint(from: Point, to: Point, t: number): Point {
  return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
}

export interface Frame {
  readonly nodes: readonly Point[]
  readonly viewBox: { readonly x: number; readonly y: number; readonly size: number }
}

function centroid(points: readonly Point[]): Point {
  return {
    x: points.reduce((t, p) => t + p.x, 0) / points.length,
    y: points.reduce((t, p) => t + p.y, 0) / points.length,
  }
}

/** The shorter way round between two bearings. */
function shortestTurn(from: number, to: number): number {
  const TAU = Math.PI * 2
  return (((to - from) % TAU) + TAU + Math.PI) % TAU - Math.PI
}

/**
 * A figure part way between two others.
 *
 * Dots sweep rather than cutting straight across. Taking the direct line
 * between, say, a ring and a quarter arc sends every dot through the middle at
 * once, so the figure crumples to a knot halfway and opens out again. Carrying
 * each dot around the centre instead — turning the short way and easing its
 * distance out — keeps the figure spread the whole way, and reads as the shape
 * unfurling into the next one.
 *
 * Node counts only match while the scheme holds still. When one changes there
 * is no sensible path from eleven dots to seven, so the new arrangement is
 * taken whole and the caller fades between them instead.
 */
export function blend(from: Frame, to: Frame, t: number): Frame {
  // Land exactly on the ends. Going round by angle and distance is accurate to
  // a rounding error, and a figure that settles a rounding error short of where
  // it belongs would stay there.
  if (t <= 0) return from
  if (t >= 1) return to

  const eased = ease(t)
  const viewBox = {
    x: lerp(from.viewBox.x, to.viewBox.x, eased),
    y: lerp(from.viewBox.y, to.viewBox.y, eased),
    size: lerp(from.viewBox.size, to.viewBox.size, eased),
  }

  if (from.nodes.length !== to.nodes.length) return { nodes: to.nodes, viewBox }

  const was = centroid(from.nodes)
  const wants = centroid(to.nodes)
  const middle = lerpPoint(was, wants, eased)

  const nodes = to.nodes.map((node, i) => {
    const start = from.nodes[i]
    const r0 = Math.hypot(start.x - was.x, start.y - was.y)
    const r1 = Math.hypot(node.x - wants.x, node.y - wants.y)
    // A dot sitting on the centre has no bearing to turn from, so it is simply
    // carried across.
    if (r0 < 1e-6 || r1 < 1e-6) return lerpPoint(start, node, eased)

    const a0 = Math.atan2(start.y - was.y, start.x - was.x)
    const a1 = Math.atan2(node.y - wants.y, node.x - wants.x)
    const angle = a0 + shortestTurn(a0, a1) * eased
    const radius = lerp(r0, r1, eased)
    return {
      x: middle.x + radius * Math.cos(angle),
      y: middle.y + radius * Math.sin(angle),
    }
  })

  return { nodes, viewBox: holding(viewBox, nodes) }
}

/**
 * Widen a frame until it holds every dot.
 *
 * Swinging a dot round can carry it briefly wider than either end of the move,
 * and a frame interpolated between the two ends would crop it. The frame stays
 * where the interpolation puts it and only grows, so it never jitters.
 */
function holding(viewBox: Frame['viewBox'], nodes: readonly Point[]): Frame['viewBox'] {
  const cx = viewBox.x + viewBox.size / 2
  const cy = viewBox.y + viewBox.size / 2
  const padding = viewBox.size / 55
  let reach = viewBox.size / 2
  for (const node of nodes) {
    reach = Math.max(reach, Math.abs(node.x - cx) + padding, Math.abs(node.y - cy) + padding)
  }
  const size = reach * 2
  return { x: cx - size / 2, y: cy - size / 2, size }
}

/** How far a line has been drawn on, or taken back. */
export function grownBy(was: number, wants: number, t: number): number {
  return lerp(was, wants, ease(t))
}

/** Some readers would rather nothing moved. */
export function prefersStillness(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

import { useEffect, useMemo, useRef, useState } from 'react'

import { blend, DURATION, grownBy, prefersStillness, type Frame } from '../lib/animate'
import { BASE_BY_ID, type Point } from '../lib/bases'
import { scaffoldChords, type Figure } from '../lib/encoding'
import { buildRune, chordBetween, type RuneStyle } from '../lib/rune'

/** One line of the figure, with how much of it is currently drawn. */
export interface AnimatedChord {
  readonly key: string
  readonly attributeId: string
  readonly from: number
  readonly to: number
  /** 1 fully drawn, 0 gone, between while arriving or leaving. */
  readonly grown: number
}

export interface AnimatedRune {
  readonly nodes: readonly Point[]
  readonly viewBox: { readonly x: number; readonly y: number; readonly size: number }
  readonly strokeWidth: number
  readonly nodeRadius: number
  readonly scaffold: readonly string[]
  readonly chords: readonly AnimatedChord[]
  readonly pathOf: (chord: AnimatedChord) => string
}

type Growth = ReadonlyMap<string, number>

const nameOf = (attributeId: string, from: number) => `${attributeId}:${from}`

/**
 * The figure as it should be drawn this instant, on its way to the one asked
 * for.
 *
 * Node positions slide, so changing the base carries the dots across; lines
 * are drawn on from their first node and taken back the same way, so changing
 * the spell writes the new lines in and rubs the old ones out. A figure is
 * rebuilt from the moving dots each frame, which is why the lines follow them
 * rather than being animated separately.
 */
export function useAnimatedRune(figure: Figure, style: RuneStyle, size = 100): AnimatedRune {
  const target = useMemo(() => buildRune(figure, style, size), [figure, style, size])
  const closed = BASE_BY_ID[style.base].closed

  const goal: Frame = useMemo(
    () => ({ nodes: target.nodes, viewBox: target.viewBox }),
    [target],
  )

  const goalGrowth: Growth = useMemo(() => {
    const out = new Map<string, number>()
    for (const layer of target.layers) {
      for (const chord of layer.chords) out.set(nameOf(layer.attribute.id, chord.from), 1)
    }
    return out
  }, [target])

  // What is on screen. The next move starts from here, so interrupting one
  // half way does not jump.
  const shown = useRef<Frame>(goal)
  const growth = useRef<Growth>(goalGrowth)
  const [, redraw] = useState(0)

  // What to animate towards, read inside the loop so a change mid-flight is
  // picked up without restarting from the beginning.
  const goalRef = useRef(goal)
  const goalGrowthRef = useRef(goalGrowth)
  goalRef.current = goal
  goalGrowthRef.current = goalGrowth

  const signature = useMemo(
    () =>
      [
        style.base,
        style.curvature,
        style.showScaffold,
        size,
        target.nodes.length,
        [...goalGrowth.keys()].sort().join(','),
        goal.viewBox.size.toFixed(3),
      ].join('|'),
    [style, size, target, goalGrowth, goal],
  )

  useEffect(() => {
    if (prefersStillness()) {
      shown.current = goalRef.current
      growth.current = goalGrowthRef.current
      redraw((n) => n + 1)
      return
    }

    const fromFrame = shown.current
    const fromGrowth = growth.current
    const begun = performance.now()
    let frame = requestAnimationFrame(function step() {
      const t = Math.min(1, (performance.now() - begun) / DURATION)
      shown.current = blend(fromFrame, goalRef.current, t)

      const next = new Map<string, number>()
      const names = new Set([...fromGrowth.keys(), ...goalGrowthRef.current.keys()])
      for (const name of names) {
        const amount = grownBy(fromGrowth.get(name) ?? 0, goalGrowthRef.current.get(name) ?? 0, t)
        // A line that has gone is dropped rather than kept at zero.
        if (amount > 0.001) next.set(name, amount)
      }
      growth.current = next

      redraw((n) => n + 1)
      if (t < 1) frame = requestAnimationFrame(step)
    })

    return () => cancelAnimationFrame(frame)
  }, [signature])

  const nodes = shown.current.nodes
  const sides = nodes.length
  const byId = new Map(target.layers.map((l) => [l.attribute.id, l.attribute]))

  const chords: AnimatedChord[] = []
  for (const [name, grown] of growth.current) {
    const [attributeId, start] = name.split(':')
    const attribute = byId.get(attributeId)
    const from = Number(start)
    if (!attribute || from >= sides) continue
    chords.push({
      key: name,
      attributeId,
      from,
      to: (from + attribute.k) % sides,
      grown,
    })
  }

  const scaffold = style.showScaffold
    ? scaffoldChords(sides, figure.attributes).map((c) =>
        chordBetween(nodes, closed, c.from, c.to, style.curvature),
      )
    : []

  return {
    nodes,
    viewBox: shown.current.viewBox,
    strokeWidth: shown.current.viewBox.size / 70,
    nodeRadius: shown.current.viewBox.size / 110,
    scaffold,
    chords,
    pathOf: (chord) =>
      chordBetween(nodes, closed, chord.from, chord.to, style.curvature, chord.grown),
  }
}

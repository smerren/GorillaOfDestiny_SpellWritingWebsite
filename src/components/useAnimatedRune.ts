import { useEffect, useMemo, useRef, useState } from 'react'

import { blend, DURATION, grownBy, prefersStillness, type Frame } from '../lib/animate'
import { BASE_BY_ID, type Point } from '../lib/bases'
import { scaffoldChords, type Figure } from '../lib/encoding'
import { bowSignOf, buildRune, chordBetween, type RuneStyle } from '../lib/rune'

/** One line of the figure, with how much of it is currently drawn. */
export interface AnimatedChord {
  readonly key: string
  readonly attributeId: string
  readonly from: number
  readonly to: number
  /** 1 fully drawn, 0 gone, between while arriving or leaving. */
  readonly grown: number
  /** Signed: the sign is which way it bows, the size how deeply. */
  readonly bow: number
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

interface Drawn {
  readonly grown: number
  readonly bow: number
}

type Growth = ReadonlyMap<string, Drawn>

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
  // The same unit points buildRune settles its bows on, so the moving figure
  // and the still one never disagree about which way a line curves.
  const unit = useMemo(
    () => BASE_BY_ID[style.base].place(style.sides),
    [style.base, style.sides],
  )

  const goal: Frame = useMemo(
    () => ({ nodes: target.nodes, viewBox: target.viewBox }),
    [target],
  )

  const goalGrowth: Growth = useMemo(() => {
    const out = new Map<string, Drawn>()
    for (const layer of target.layers) {
      for (const chord of layer.chords) {
        // Settled here, on the arrangement being moved towards, and then held
        // for the whole move. Deciding it per frame lets a line swap sides
        // partway and flicker.
        const bow = bowSignOf(unit, closed, chord.from, chord.to) * style.curvature
        out.set(nameOf(layer.attribute.id, chord.from), { grown: 1, bow })
      }
    }
    return out
  }, [target, unit, closed, style.curvature])

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

      const next = new Map<string, Drawn>()
      const names = new Set([...fromGrowth.keys(), ...goalGrowthRef.current.keys()])
      for (const name of names) {
        const was = fromGrowth.get(name)
        const wants = goalGrowthRef.current.get(name)
        const grown = grownBy(was?.grown ?? 0, wants?.grown ?? 0, t)
        // A line that has gone is dropped rather than kept at zero.
        if (grown <= 0.001) continue
        // Bow is signed, so a line that changes sides passes through straight
        // rather than snapping over. A line arriving or leaving keeps the one
        // side it has.
        const bow = grownBy(was?.bow ?? wants?.bow ?? 0, wants?.bow ?? was?.bow ?? 0, t)
        next.set(name, { grown, bow })
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
  for (const [name, drawn] of growth.current) {
    const [attributeId, start] = name.split(':')
    const attribute = byId.get(attributeId)
    const from = Number(start)
    if (!attribute || from >= sides) continue
    chords.push({
      key: name,
      attributeId,
      from,
      to: (from + attribute.k) % sides,
      grown: drawn.grown,
      bow: drawn.bow,
    })
  }

  const scaffold = style.showScaffold
    ? scaffoldChords(sides, figure.attributes).map((c) =>
        chordBetween(
          nodes,
          c.from,
          c.to,
          bowSignOf(unit, closed, c.from, c.to) * style.curvature,
        ),
      )
    : []

  return {
    nodes,
    viewBox: shown.current.viewBox,
    strokeWidth: shown.current.viewBox.size / 70,
    nodeRadius: shown.current.viewBox.size / 110,
    scaffold,
    chords,
    pathOf: (chord) => chordBetween(nodes, chord.from, chord.to, chord.bow, chord.grown),
  }
}

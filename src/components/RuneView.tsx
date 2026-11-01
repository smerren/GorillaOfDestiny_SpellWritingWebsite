import { useMemo } from 'react'

import { chordOwner, type Figure } from '../lib/encoding'
import { layerInk, SCAFFOLD_INK } from '../lib/palette'
import type { RuneStyle } from '../lib/rune'
import { useAnimatedRune } from './useAnimatedRune'

interface Props {
  figure: Figure
  style: RuneStyle
  tintByAttribute: boolean
  /** Used for every layer when they are not tinted apart. */
  ink: string
  /** Dims every layer but this one, so a reader can pick an attribute out. */
  focus: string | null
  /** When set, nodes can be joined and parted by hand. */
  onToggle?: (a: number, b: number) => void
  /** The node waiting for its partner, if a line is half-drawn. */
  held?: number | null
  onHold?: (node: number | null) => void
}

const VIEW = 100

export function RuneView({
  figure,
  style,
  tintByAttribute,
  ink,
  focus,
  onToggle,
  held = null,
  onHold,
}: Props) {
  const rune = useAnimatedRune(figure, style, VIEW)
  const drawable = Boolean(onToggle && onHold)

  const stroke = rune.strokeWidth
  const node = rune.nodeRadius
  const { x, y, size } = rune.viewBox

  /** Which nodes would make a line with the one being held. */
  const reachable = useMemo(() => {
    if (held === null) return null
    const out = new Set<number>()
    for (let i = 0; i < figure.sides; i++) {
      if (chordOwner(figure.attributes, figure.sides, held, i)) out.add(i)
    }
    return out
  }, [held, figure])

  const press = (index: number) => {
    if (!drawable) return
    if (held === null) {
      onHold?.(index)
      return
    }
    if (held === index) {
      onHold?.(null)
      return
    }
    onToggle?.(held, index)
    onHold?.(null)
  }

  return (
    <svg
      className={drawable ? 'rune drawable' : 'rune'}
      viewBox={`${x.toFixed(2)} ${y.toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)}`}
      role="img"
      aria-label={`Rune of ${figure.layers.reduce((t, l) => t + l.chords.length, 0)} lines`}
    >
      {style.showScaffold && (
        <g fill="none" stroke={SCAFFOLD_INK} strokeWidth={stroke / 6} opacity={0.4}>
          {rune.scaffold.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}

      {figure.layers.map((layer) => {
        const dimmed = focus !== null && focus !== layer.attribute.id
        const mine = rune.chords.filter((c) => c.attributeId === layer.attribute.id)
        return (
          <g
            key={layer.attribute.id}
            fill="none"
            stroke={tintByAttribute ? layerInk(layer.attribute.k) : ink}
            strokeWidth={stroke}
            strokeLinecap="round"
            opacity={dimmed ? 0.12 : 1}
            style={{ transition: 'opacity 140ms ease' }}
          >
            {mine.map((c) => (
              <path key={c.key} d={rune.pathOf(c)} />
            ))}
          </g>
        )
      })}

      {style.showNodes && (
        <g fill="var(--parchment)" stroke={SCAFFOLD_INK} strokeWidth={stroke / 4}>
          {rune.nodes.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={node} />
          ))}
        </g>
      )}

      {style.showStartNode && rune.nodes.length > 0 && (
        <circle cx={rune.nodes[0].x} cy={rune.nodes[0].y} r={node * 1.35} fill="#2a1a10" />
      )}

      {drawable &&
        rune.nodes.map((p, i) => {
          const isHeld = held === i
          const canJoin = reachable?.has(i) ?? false
          return (
            <g key={`hit-${i}`} className="node-hit">
              {isHeld && (
                <circle cx={p.x} cy={p.y} r={node * 2.4} className="node-held" fill="none" />
              )}
              {held !== null && canJoin && !isHeld && (
                <circle cx={p.x} cy={p.y} r={node * 1.5} className="node-open" />
              )}
              {/* A target big enough for a finger, invisible but clickable. */}
              <circle
                cx={p.x}
                cy={p.y}
                r={Math.max(node * 3, rune.viewBox.size / 26)}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={
                  held === null
                    ? `Dot ${i}. Click to start a line.`
                    : isHeld
                      ? `Dot ${i}, held. Click again to let go.`
                      : canJoin
                        ? `Join dot ${held} to dot ${i}.`
                        : `Dot ${i}. No attribute is drawn with a line that long.`
                }
                onClick={() => press(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    press(i)
                  }
                  if (e.key === 'Escape') onHold?.(null)
                }}
              />
            </g>
          )
        })}
    </svg>
  )
}

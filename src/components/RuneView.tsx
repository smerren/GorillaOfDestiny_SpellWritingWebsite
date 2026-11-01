import { useMemo } from 'react'

import { layerInk, SCAFFOLD_INK } from '../lib/palette'
import { buildRune, type RuneStyle } from '../lib/rune'
import type { Attribute, SpellAttributes } from '../lib/keys'

interface Props {
  spell: SpellAttributes
  style: RuneStyle
  attributes?: readonly Attribute[]
  tintByAttribute: boolean
  /** Used for every layer when they are not tinted apart. */
  ink: string
  /** Dims every layer but this one, so a reader can pick an attribute out. */
  focus: string | null
}

const VIEW = 100

export function RuneView({ spell, style, attributes, tintByAttribute, ink, focus }: Props) {
  const rune = useMemo(
    () => buildRune(spell, style, VIEW, attributes),
    [spell, style, attributes],
  )

  const stroke = VIEW / 70
  const node = VIEW / 110

  return (
    <svg
      className="rune"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      aria-label={`Rune made of ${rune.layers.reduce((t, l) => t + l.chords.length, 0)} chords`}
    >
      {style.showScaffold && (
        <g fill="none" stroke={SCAFFOLD_INK} strokeWidth={stroke / 6} opacity={0.4}>
          {rune.scaffold.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}

      {rune.layers.map((layer) => {
        const dimmed = focus !== null && focus !== layer.attribute.id
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
            {layer.paths.map((d, i) => (
              <path key={i} d={d} />
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
    </svg>
  )
}

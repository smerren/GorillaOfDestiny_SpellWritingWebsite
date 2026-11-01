import { useMemo } from 'react'

import { ATTRIBUTE_INK, INK, SCAFFOLD_INK } from '../lib/palette'
import { buildRune, type RuneStyle } from '../lib/rune'
import type { SpellAttributes } from '../lib/keys'

interface Props {
  spell: SpellAttributes
  style: RuneStyle
  tintByAttribute: boolean
  /** Dims every layer but this one, so a reader can pick an attribute out. */
  focus: string | null
}

const VIEW = 100

export function RuneView({ spell, style, tintByAttribute, focus }: Props) {
  const rune = useMemo(() => buildRune(spell, style, VIEW), [spell, style])

  const stroke = VIEW / 70
  const node = VIEW / 110

  return (
    <svg
      className="rune"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      aria-label={`Rune for a level ${spell.level} ${spell.school} spell`}
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
            stroke={tintByAttribute ? ATTRIBUTE_INK[layer.attribute.id] : INK}
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

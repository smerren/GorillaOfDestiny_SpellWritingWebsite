import { useMemo } from 'react'

import { GOLD, layerInk, PARCHMENT, SCAFFOLD_INK, TEXT_INK } from '../lib/palette'
import { buildPlate, cellValue, type PlatePiece } from '../lib/plate'
import type { Attribute, SpellAttributes } from '../lib/keys'
import type { RuneStyle } from '../lib/rune'

interface Props {
  spell: SpellAttributes
  style: RuneStyle
  attributes?: readonly Attribute[]
  tintByAttribute: boolean
  ink: string
  title: string
}

/** One rune inside its own box, positioned on the plate. */
function Piece({
  piece,
  x,
  y,
  tintByAttribute,
  ink,
  showScaffold,
}: {
  piece: PlatePiece
  x: number
  y: number
  tintByAttribute: boolean
  ink: string
  showScaffold: boolean
}) {
  const size = piece.rune.size
  const width = size / 70
  const node = size / 110

  return (
    <g transform={`translate(${x} ${y})`}>
      {showScaffold && (
        <g fill="none" stroke={SCAFFOLD_INK} strokeWidth={width / 6} opacity={0.4}>
          {piece.rune.scaffold.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}

      {piece.groups.map((group) => (
        <g
          key={group.attribute.id}
          fill="none"
          stroke={tintByAttribute ? layerInk(group.attribute.k) : ink}
          strokeWidth={width}
          strokeLinecap="round"
        >
          {group.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ))}

      <g fill={PARCHMENT} stroke={SCAFFOLD_INK} strokeWidth={width / 4}>
        {piece.rune.nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={node} />
        ))}
      </g>

      {piece.rune.nodes.length > 0 && (
        <circle
          cx={piece.rune.nodes[0].x}
          cy={piece.rune.nodes[0].y}
          r={node * 1.35}
          fill={TEXT_INK}
        />
      )}
    </g>
  )
}

export function PlateView({ spell, style, attributes, tintByAttribute, ink, title }: Props) {
  const plate = useMemo(
    () => buildPlate(spell, style, title, attributes),
    [spell, style, title, attributes],
  )
  const { layout } = plate

  return (
    <svg
      className="plate-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label={`Spellbook plate for ${title}`}
    >
      <rect width={layout.width} height={layout.height} fill={PARCHMENT} />
      <rect
        x={14}
        y={14}
        width={layout.width - 28}
        height={layout.height - 28}
        fill="none"
        stroke={GOLD}
        strokeWidth={1}
        opacity={0.55}
      />

      <text
        x={layout.title.x}
        y={layout.title.y}
        textAnchor="middle"
        className="plate-title"
        fill={TEXT_INK}
      >
        {title.toUpperCase()}
      </text>

      <Piece
        piece={plate.main}
        x={layout.main.x}
        y={layout.main.y}
        tintByAttribute={tintByAttribute}
        ink={ink}
        showScaffold={style.showScaffold}
      />

      <line
        x1={layout.divider.x1}
        y1={layout.divider.y}
        x2={layout.divider.x2}
        y2={layout.divider.y}
        stroke={GOLD}
        strokeWidth={1}
        opacity={0.6}
      />

      {plate.cells.map(({ cell, ...piece }) => (
        <g key={cell.attribute.id}>
          <text
            x={cell.x + cell.size / 2}
            y={cell.labelY}
            textAnchor="middle"
            className="plate-label"
            fill={GOLD}
          >
            {cell.attribute.label.toUpperCase()}
          </text>

          <Piece
            piece={piece}
            x={cell.x}
            y={cell.runeY}
            tintByAttribute={tintByAttribute}
            ink={ink}
            showScaffold={false}
          />

          <text
            x={cell.x + cell.size / 2}
            y={cell.valueY}
            textAnchor="middle"
            className="plate-value"
            fill={TEXT_INK}
          >
            {cellValue(cell.attribute, cell.feature)}
          </text>
          <text
            x={cell.x + cell.size / 2}
            y={cell.valueY + 17}
            textAnchor="middle"
            className="plate-k"
            fill={SCAFFOLD_INK}
          >
            k = {cell.attribute.k}
          </text>
        </g>
      ))}

      <text
        x={layout.footer.x}
        y={layout.footer.y}
        textAnchor="middle"
        className="plate-k"
        fill={SCAFFOLD_INK}
      >
        Spell writing system by The Gorilla of Destiny · not endorsed by or authored by them
      </text>
    </svg>
  )
}

import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { AttributePanel } from './AttributePanel'
import { PlateView } from './PlateView'
import { RuneView } from './RuneView'
import { StylePanel } from './StylePanel'
import { downloadPng, downloadText, slug } from '../lib/download'
import {
  bitsFor,
  emptyBits,
  figureFromBits,
  toggleChord,
  type Bits,
} from '../lib/encoding'
import type { AttributeId } from '../lib/keys'
import { GOLD, layerInk, INK, PARCHMENT, SCAFFOLD_INK, TEXT_INK } from '../lib/palette'
import { buildPlate, plateToSvg } from '../lib/plate'
import { buildRune, runeToSvg, type RuneStyle } from '../lib/rune'
import type { Scheme } from '../lib/scheme'

interface Props {
  scheme: Scheme
  /**
   * What is drawn, layer by layer. Bits rather than feature names, because a
   * figure drawn by hand can spell something the dictionary has no word for.
   */
  bits: Bits
  onBits: (next: Bits) => void
  title: string | null
  onTitle: (next: string | null) => void
  /** Extra control panels for this tab: a spellbook, a scheme editor. */
  children?: ReactNode
}

type View = 'rune' | 'plate'

export function Workbench({ scheme, bits, onBits, title, onTitle, children }: Props) {
  const [base, setBase] = useState<RuneStyle['base']>('polygon')
  const [curvature, setCurvature] = useState(0)
  const [showScaffold, setScaffold] = useState(true)
  const [showNodes, setNodes] = useState(true)
  const [showStartNode, setStartNode] = useState(true)
  const [connector, setConnector] = useState('straight')
  const [tintByAttribute, setTint] = useState(true)
  const [ink, setInk] = useState(INK)
  const [focus, setFocus] = useState<AttributeId | null>(null)
  const [view, setView] = useState<View>('rune')
  const [held, setHeld] = useState<number | null>(null)

  const style = useMemo<RuneStyle>(
    () => ({
      base,
      sides: scheme.sides,
      curvature: connector === 'straight' ? 0 : curvature,
      showScaffold,
      showNodes,
      showStartNode,
    }),
    [base, scheme.sides, connector, curvature, showScaffold, showNodes, showStartNode],
  )

  const patchStyle = useCallback((patch: Partial<RuneStyle>) => {
    if (patch.base !== undefined) setBase(patch.base)
    if (patch.curvature !== undefined) setCurvature(patch.curvature)
    if (patch.showScaffold !== undefined) setScaffold(patch.showScaffold)
    if (patch.showNodes !== undefined) setNodes(patch.showNodes)
    if (patch.showStartNode !== undefined) setStartNode(patch.showStartNode)
  }, [])

  const changeConnector = useCallback((id: string) => {
    setConnector(id)
    // Opening the arcs on a figure that was straight should show something.
    setCurvature((c) => (id === 'arc' && c < 0.05 ? 0.6 : c))
  }, [])

  const figure = useMemo(
    () => figureFromBits(bits, scheme.sides, scheme.attributes),
    [bits, scheme],
  )

  const setAttribute = useCallback(
    (id: AttributeId, feature: string) => {
      const attribute = scheme.attributes.find((a) => a.id === id)
      if (!attribute || feature === '') return
      onBits({ ...bits, [id]: bitsFor(attribute, feature, scheme.sides) })
    },
    [bits, onBits, scheme],
  )

  const toggle = useCallback(
    (a: number, b: number) => {
      const next = toggleChord(figure, a, b)
      if (next) onBits(next)
    },
    [figure, onBits],
  )

  const shown = title ?? 'Unnamed rune'
  const layers = figure.layers

  const svg = useMemo(() => {
    if (view === 'plate') {
      return plateToSvg(buildPlate(figure, style, shown), {
        ink,
        scaffoldInk: SCAFFOLD_INK,
        parchment: PARCHMENT,
        text: TEXT_INK,
        gold: GOLD,
        tint: tintByAttribute ? (a) => layerInk(a.k) : null,
      })
    }
    return runeToSvg(buildRune(figure, style, 100), {
      ink,
      scaffoldInk: SCAFFOLD_INK,
      showNodes: style.showNodes,
      showStartNode: style.showStartNode,
    })
  }, [view, figure, style, shown, tintByAttribute, ink])

  return (
    <main className="layout">
      <div className="stage">
        <div className="view-switch" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'rune'}
            className={view === 'rune' ? 'on' : undefined}
            onClick={() => setView('rune')}
          >
            Rune
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'plate'}
            className={view === 'plate' ? 'on' : undefined}
            onClick={() => setView('plate')}
          >
            Spellbook plate
          </button>
        </div>

        <figure className="plate">
          {view === 'rune' ? (
            <RuneView
              figure={figure}
              style={style}
              tintByAttribute={tintByAttribute}
              ink={ink}
              focus={focus}
              onToggle={toggle}
              held={held}
              onHold={setHeld}
            />
          ) : (
            <PlateView
              figure={figure}
              style={style}
              tintByAttribute={tintByAttribute}
              ink={ink}
              title={shown}
            />
          )}
          <figcaption>
            {view === 'rune' && (
              <p className="draw-hint">
                {held === null ? (
                  <>Click a node to begin a line, or set an attribute below.</>
                ) : (
                  <>
                    Now click another node to draw or erase. <strong>Esc</strong> to let go.
                  </>
                )}
              </p>
            )}
            <input
              className="title-input"
              value={title ?? ''}
              placeholder="Unnamed rune"
              aria-label="Spell name"
              onChange={(e) => onTitle(e.target.value || null)}
            />
          </figcaption>
        </figure>

        <div className="readout">
          <h2>Reading</h2>
          {layers.length === 0 ? (
            <p className="hint">Nothing to read yet.</p>
          ) : (
            <table>
              <tbody>
                {layers.map((layer) => (
                  <tr
                    key={layer.attribute.id}
                    onMouseEnter={() => setFocus(layer.attribute.id)}
                    onMouseLeave={() => setFocus(null)}
                  >
                    <th scope="row">
                      <span
                        className="swatch"
                        style={{ background: tintByAttribute ? layerInk(layer.attribute.k) : ink }}
                        aria-hidden="true"
                      />
                      {layer.attribute.label}
                    </th>
                    <td className="feature">
                      {layer.feature ?? <span className="unnamed">drawn by hand</span>}
                    </td>
                    <td>
                      <code>{layer.bits}</code>
                    </td>
                    <td className="count">
                      {layer.chords.length === 0
                        ? 'no lines'
                        : `${layer.chords.length} line${layer.chords.length > 1 ? 's' : ''}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="actions">
            <button
              type="button"
              onClick={() => downloadText(`${slug(shown)}.svg`, svg, 'image/svg+xml')}
            >
              Download SVG
            </button>
            <button
              type="button"
              onClick={() => downloadPng(`${slug(shown)}.png`, svg, view === 'plate' ? 1440 : 1200)}
            >
              Download PNG
            </button>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(svg)}>
              Copy SVG
            </button>
            <button
              type="button"
              onClick={() => {
                onBits(emptyBits(scheme.sides, scheme.attributes))
                setHeld(null)
                onTitle(null)
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <aside className="controls">
        <AttributePanel
          figure={figure}
          tintByAttribute={tintByAttribute}
          ink={ink}
          onChange={setAttribute}
          onFocus={setFocus}
        />
        <StylePanel
          style={style}
          connector={connector}
          tintByAttribute={tintByAttribute}
          ink={ink}
          onStyle={patchStyle}
          onConnector={changeConnector}
          onTint={setTint}
          onInk={setInk}
        />
        {children}
      </aside>
    </main>
  )
}

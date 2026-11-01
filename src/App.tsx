import { useCallback, useMemo, useState } from 'react'

import { AttributePanel } from './components/AttributePanel'
import { PlateView } from './components/PlateView'
import { RuneView } from './components/RuneView'
import { SpellLibrary, type LibrarySpell } from './components/SpellLibrary'
import { StylePanel } from './components/StylePanel'
import { downloadPng, downloadText, slug } from './lib/download'
import { encodeSpell } from './lib/encoding'
import { DEFAULT_SIDES, EMPTY_SPELL, type AttributeId, type SpellAttributes } from './lib/keys'
import { ATTRIBUTE_INK, GOLD, INK, PARCHMENT, SCAFFOLD_INK, TEXT_INK } from './lib/palette'
import { buildPlate, plateToSvg } from './lib/plate'
import { buildRune, runeToSvg, type RuneStyle } from './lib/rune'

type View = 'rune' | 'plate'

const DEFAULT_STYLE: RuneStyle = {
  base: 'polygon',
  sides: DEFAULT_SIDES,
  curvature: 0,
  showScaffold: true,
  showNodes: true,
  showStartNode: true,
}

export function App() {
  const [spell, setSpell] = useState<SpellAttributes>(EMPTY_SPELL)
  const [name, setName] = useState<string | null>(null)
  const [style, setStyle] = useState<RuneStyle>(DEFAULT_STYLE)
  const [connector, setConnector] = useState('straight')
  const [tintByAttribute, setTint] = useState(false)
  const [focus, setFocus] = useState<AttributeId | null>(null)
  const [view, setView] = useState<View>('rune')

  const effectiveStyle = useMemo<RuneStyle>(
    () => ({ ...style, curvature: connector === 'straight' ? 0 : style.curvature }),
    [style, connector],
  )

  const setAttribute = useCallback((id: AttributeId, feature: string) => {
    setSpell((prev) => ({ ...prev, [id]: feature }))
    setName(null)
  }, [])

  const pickSpell = useCallback((picked: LibrarySpell) => {
    const { name: picked_name, ...attributes } = picked
    setSpell(attributes)
    setName(picked_name)
  }, [])

  const patchStyle = useCallback((patch: Partial<RuneStyle>) => {
    setStyle((prev) => ({ ...prev, ...patch }))
  }, [])

  const changeConnector = useCallback((id: string) => {
    setConnector(id)
    // Opening the arcs on a figure that was straight should show something.
    setStyle((prev) => (id === 'arc' && prev.curvature < 0.05 ? { ...prev, curvature: 1 } : prev))
  }, [])

  const layers = useMemo(() => encodeSpell(spell, effectiveStyle.sides), [spell, effectiveStyle])

  const title = name ?? 'Unnamed rune'

  const svg = useMemo(() => {
    if (view === 'plate') {
      return plateToSvg(buildPlate(spell, effectiveStyle, title), {
        ink: INK,
        scaffoldInk: SCAFFOLD_INK,
        parchment: PARCHMENT,
        text: TEXT_INK,
        gold: GOLD,
        tint: tintByAttribute ? (a) => ATTRIBUTE_INK[a.id] : null,
      })
    }
    return runeToSvg(buildRune(spell, effectiveStyle, 100), {
      ink: INK,
      scaffoldInk: SCAFFOLD_INK,
      showNodes: effectiveStyle.showNodes,
      showStartNode: effectiveStyle.showStartNode,
    })
  }, [view, spell, effectiveStyle, title, tintByAttribute])

  return (
    <div className="page">
      <header className="masthead">
        <h1>Spell Writing</h1>
        <p className="standfirst">
          A scribing table for the notation set out in <em>The Spell Writing Guide</em> by
          the Gorilla of Destiny. Choose what a spell <em>is</em>, and read back the shape it
          is written as.
        </p>
      </header>

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
                spell={spell}
                style={effectiveStyle}
                tintByAttribute={tintByAttribute}
                focus={focus}
              />
            ) : (
              <PlateView
                spell={spell}
                style={effectiveStyle}
                tintByAttribute={tintByAttribute}
                title={title}
              />
            )}
            <figcaption>
              <input
                className="title-input"
                value={name ?? ''}
                placeholder="Unnamed rune"
                aria-label="Spell name"
                onChange={(e) => setName(e.target.value || null)}
              />
            </figcaption>
          </figure>

          <div className="readout">
            <h2>Reading</h2>
            <table>
              <tbody>
                {layers.map((layer) => (
                  <tr
                    key={layer.attribute.id}
                    onMouseEnter={() => setFocus(layer.attribute.id)}
                    onMouseLeave={() => setFocus(null)}
                  >
                    <th scope="row">{layer.attribute.label}</th>
                    <td className="feature">{layer.feature}</td>
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

            <div className="actions">
              <button
                type="button"
                onClick={() => downloadText(`${slug(title)}.svg`, svg, 'image/svg+xml')}
              >
                Download SVG
              </button>
              <button type="button" onClick={() => downloadPng(`${slug(title)}.png`, svg, 1200)}>
                Download PNG
              </button>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(svg)}
              >
                Copy SVG
              </button>
            </div>
          </div>
        </div>

        <aside className="controls">
          <AttributePanel
            spell={spell}
            sides={effectiveStyle.sides}
            tintByAttribute={tintByAttribute}
            onChange={setAttribute}
            onFocus={setFocus}
          />
          <StylePanel
            style={style}
            connector={connector}
            tintByAttribute={tintByAttribute}
            onStyle={patchStyle}
            onConnector={changeConnector}
            onTint={setTint}
          />
          <SpellLibrary current={name} onPick={pickSpell} />
        </aside>
      </main>

      <footer className="colophon">
        <p>
          The spell writing system is the work of{' '}
          <strong>The Gorilla of Destiny</strong> (@GorillaOfDestiny). This site is not
          endorsed by or authored by them.
        </p>
        <p>
          Spell attributes are taken from the System Reference Document 5.1 by Wizards of the
          Coast LLC, used under the{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/legalcode">
            Creative Commons Attribution 4.0 International License
          </a>
          .
        </p>
      </footer>
    </div>
  )
}

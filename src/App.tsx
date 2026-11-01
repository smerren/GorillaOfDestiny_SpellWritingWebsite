import { useCallback, useMemo, useState } from 'react'

import { AttributePanel } from './components/AttributePanel'
import { RuneView } from './components/RuneView'
import { SpellLibrary, type LibrarySpell } from './components/SpellLibrary'
import { StylePanel } from './components/StylePanel'
import { downloadPng, downloadText, slug } from './lib/download'
import { encodeSpell } from './lib/encoding'
import { DEFAULT_SIDES, EMPTY_SPELL, type AttributeId, type SpellAttributes } from './lib/keys'
import { INK, SCAFFOLD_INK } from './lib/palette'
import { buildRune, runeToSvg, type RuneStyle } from './lib/rune'

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

  const svg = useMemo(
    () =>
      runeToSvg(buildRune(spell, effectiveStyle, 100), {
        ink: INK,
        scaffoldInk: SCAFFOLD_INK,
        showNodes: effectiveStyle.showNodes,
        showStartNode: effectiveStyle.showStartNode,
      }),
    [spell, effectiveStyle],
  )

  const title = name ?? 'Unnamed rune'

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
          <figure className="plate">
            <RuneView
              spell={spell}
              style={effectiveStyle}
              tintByAttribute={tintByAttribute}
              focus={focus}
            />
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

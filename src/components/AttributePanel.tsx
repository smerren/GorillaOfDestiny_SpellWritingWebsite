import { useState } from 'react'

import { bitsFor, type Figure } from '../lib/encoding'
import type { AttributeId } from '../lib/keys'
import type { NamedSymbol } from '../lib/named'
import { layerInk } from '../lib/palette'

interface Props {
  figure: Figure
  /** Which scheme these symbols belong to, so names do not cross over. */
  schemeId: string
  tintByAttribute: boolean
  ink: string
  /** Set a layer's bits outright: every option resolves to a shape. */
  onChoose: (id: AttributeId, bits: string) => void
  onRemember: (entry: NamedSymbol) => void
  onForget: (entry: NamedSymbol) => void
  onFocus: (id: AttributeId | null) => void
}

export function AttributePanel({
  figure,
  schemeId,
  tintByAttribute,
  ink,
  onChoose,
  onRemember,
  onForget,
  onFocus,
}: Props) {
  const [naming, setNaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const begin = (id: string) => {
    setNaming(id)
    setDraft('')
  }

  return (
    <section className="panel">
      <h2>Attributes</h2>
      <p className="hint">
        Each attribute is drawn with chords of its own length <em>k</em>, so the layers stack
        without ever sharing an edge.
      </p>

      <div className="attributes">
        {figure.layers.map(({ attribute, feature, named: givenName, bits }) => {
          const mine = attribute.kept ?? []
          const unnamed = feature === null && givenName === null
          const isNaming = naming === attribute.id

          return (
            <label
              key={attribute.id}
              className="attribute"
              onMouseEnter={() => onFocus(attribute.id)}
              onMouseLeave={() => onFocus(null)}
            >
              <span className="attribute-head">
                <span
                  className="swatch"
                  style={{ background: tintByAttribute ? layerInk(attribute.k) : ink }}
                  aria-hidden="true"
                />
                <span className="attribute-label">{attribute.label}</span>
                <span className="k">k = {attribute.k}</span>
              </span>

              <select
                value={bits}
                onChange={(e) => onChoose(attribute.id, e.target.value)}
              >
                {unnamed && <option value={bits}>Drawn by hand — unnamed</option>}
                {attribute.features.map((option) => (
                  <option key={option} value={bitsFor(attribute, option, figure.sides)}>
                    {attribute.id === 'level' && option === '0' ? '0 (cantrip)' : option}
                  </option>
                ))}
                {mine.length > 0 && (
                  <optgroup label="Kept by you">
                    {mine.map((entry) => (
                      <option key={entry.bits} value={entry.bits}>
                        {entry.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <code className="bits">{bits}</code>

              {unnamed &&
                (isNaming ? (
                  <span className="naming">
                    <input
                      type="text"
                      value={draft}
                      autoFocus
                      placeholder="Name this symbol"
                      aria-label={`Name for the symbol drawn on ${attribute.label}`}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (draft.trim()) {
                            onRemember({
                              scheme: schemeId,
                              attribute: attribute.id,
                              sides: figure.sides,
                              bits,
                              name: draft,
                            })
                            setNaming(null)
                          }
                        }
                        if (e.key === 'Escape') setNaming(null)
                      }}
                    />
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => {
                        onRemember({
                          scheme: schemeId,
                          attribute: attribute.id,
                          sides: figure.sides,
                          bits,
                          name: draft,
                        })
                        setNaming(null)
                      }}
                    >
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" className="link" onClick={() => begin(attribute.id)}>
                    Name this symbol…
                  </button>
                ))}

              {givenName !== null && (
                <span className="named-note">
                  Yours: <strong>{givenName}</strong>
                  <button
                    type="button"
                    className="link"
                    onClick={() =>
                      onForget({
                        scheme: schemeId,
                        attribute: attribute.id,
                        sides: figure.sides,
                        bits,
                        name: givenName,
                      })
                    }
                  >
                    forget
                  </button>
                </span>
              )}
            </label>
          )
        })}
      </div>
    </section>
  )
}

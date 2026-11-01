import { minimumSides, uniqueCount } from '../lib/binary'
import { layerInk } from '../lib/palette'
import type { NamedSymbol } from '../lib/named'
import type { Scheme } from '../lib/scheme'
import {
  capacityOf,
  newAttributeId,
  parseFeatures,
  problems,
  sidesFor,
  type Draft,
  type DraftAttribute,
} from '../lib/scheme'

interface Props {
  draft: Draft
  /** The compiled scheme, which carries the shapes kept against it. */
  scheme: Scheme
  onDraft: (next: Draft) => void
  onForget: (entry: NamedSymbol) => void
  onReset: () => void
}

const MAX_SIDES = 13

export function SchemeEditor({ draft, scheme, onDraft, onForget, onReset }: Props) {
  const sides = sidesFor(draft)
  const faults = problems(draft)
  const faultFor = (id: string) => faults.filter((p) => p.attributeId === id)
  const general = faults.filter((p) => p.attributeId === null)

  const patch = (id: string, change: Partial<DraftAttribute>) =>
    onDraft({
      ...draft,
      attributes: draft.attributes.map((a) => (a.id === id ? { ...a, ...change } : a)),
    })

  const move = (index: number, by: number) => {
    const next = [...draft.attributes]
    const to = index + by
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    onDraft({ ...draft, attributes: next })
  }

  return (
    <section className="panel">
      <h2>The scheme</h2>
      <p className="hint">
        The notation never required five attributes, or D&amp;D's. Any set works so long as each
        has a finite list of features. Order is the symbol: moving an attribute or a feature
        rewrites every rune written with it.
      </p>

      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={draft.name}
          placeholder="Untitled scheme"
          onChange={(e) => onDraft({ ...draft, name: e.target.value })}
        />
      </label>

      <label className="field">
        <span>Nodes</span>
        <select
          value={draft.sides ?? 'auto'}
          onChange={(e) =>
            onDraft({ ...draft, sides: e.target.value === 'auto' ? null : Number(e.target.value) })
          }
        >
          <option value="auto">
            Follow the attributes ({minimumSides(Math.max(1, draft.attributes.length))})
          </option>
          {Array.from({ length: MAX_SIDES - 2 }, (_, i) => i + 3).map((n) => (
            <option key={n} value={n}>
              {n} nodes — {capacityOf(n)} features each
            </option>
          ))}
        </select>
        <small>
          {sides} nodes give {uniqueCount(sides)} unique symbols, so {capacityOf(sides)} features
          per attribute once the blank is counted.
        </small>
      </label>

      {general.map((p, i) => (
        <p key={i} className="fault">
          {p.message}
        </p>
      ))}

      <div className="attributes">
        {draft.attributes.map((attribute, i) => {
          const count = parseFeatures(attribute.features).length
          const mine = faultFor(attribute.id)
          const kept = scheme.attributes.find((a) => a.id === attribute.id)?.kept ?? []
          return (
            <div key={attribute.id} className="draft-attribute">
              <div className="attribute-head">
                <span
                  className="swatch"
                  style={{ background: layerInk(i + 1) }}
                  aria-hidden="true"
                />
                <input
                  className="draft-name"
                  type="text"
                  value={attribute.label}
                  placeholder={`Attribute ${i + 1}`}
                  aria-label={`Name of attribute ${i + 1}`}
                  onChange={(e) => patch(attribute.id, { label: e.target.value })}
                />
                <span className="k">k = {i + 1}</span>
              </div>

              <textarea
                className="draft-features"
                rows={Math.min(8, Math.max(3, count + 1))}
                value={attribute.features}
                placeholder="One feature per line"
                aria-label={`Features of ${attribute.label || `attribute ${i + 1}`}`}
                onChange={(e) => patch(attribute.id, { features: e.target.value })}
              />

              {kept.length > 0 && (
                <ul className="kept-list">
                  {kept.map((shape) => (
                    <li key={shape.bits}>
                      <span className="kept-name">{shape.name}</span>
                      <code>{shape.bits}</code>
                      <button
                        type="button"
                        className="link"
                        onClick={() =>
                          onForget({
                            scheme: scheme.id,
                            attribute: attribute.id,
                            sides: scheme.sides,
                            bits: shape.bits,
                            name: shape.name,
                          })
                        }
                      >
                        forget
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="draft-foot">
                <span>
                  {count} feature{count === 1 ? '' : 's'} + blank
                  {kept.length > 0 && ` + ${kept.length} drawn`}
                </span>
                <span className="draft-buttons">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.attributes.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onDraft({
                        ...draft,
                        attributes: draft.attributes.filter((a) => a.id !== attribute.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </span>
              </div>

              {mine.map((p, n) => (
                <p key={n} className="fault">
                  {p.message}
                </p>
              ))}
            </div>
          )
        })}
      </div>

      <div className="actions">
        <button
          type="button"
          onClick={() =>
            onDraft({
              ...draft,
              attributes: [
                ...draft.attributes,
                { id: newAttributeId(), label: '', features: '' },
              ],
            })
          }
        >
          Add attribute
        </button>
        <button type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  )
}

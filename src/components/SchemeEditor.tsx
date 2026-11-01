import { uniqueCount } from '../lib/binary'
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
        Nothing about this notation is particular to D&amp;D. Describe a spell with whatever
        attributes you like — an attribute just needs a fixed list of features to choose
        from, the way a 5e spell has exactly one school.
      </p>
      <p className="hint">
        Each attribute is drawn with its own length of line, and each of its features with
        its own shape. <strong>Which shape depends on where the feature sits in the
        list</strong>, so reordering a list, or moving an attribute, changes what runes you
        have already drawn would say.
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
        <span>Dots</span>
        <select
          value={draft.sides ?? 'auto'}
          onChange={(e) =>
            onDraft({ ...draft, sides: e.target.value === 'auto' ? null : Number(e.target.value) })
          }
        >
          <option value="auto">
            As many as needed ({sidesFor({ ...draft, sides: null })})
          </option>
          {Array.from({ length: MAX_SIDES - 2 }, (_, i) => i + 3).map((n) => (
            <option key={n} value={n}>
              {n} dots — room for {capacityOf(n)} features each
            </option>
          ))}
        </select>
        <small>
          {sides} dots give {uniqueCount(sides)} shapes that cannot be mistaken for one
          another when turned. One is the blank, leaving room for {capacityOf(sides)} features
          in each attribute.
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
                <span className="k" title={`Drawn with lines ${i + 1} dots long`}>
                  k = {i + 1}
                </span>
              </div>

              <textarea
                className="draft-features"
                rows={Math.min(8, Math.max(3, count + 1))}
                value={attribute.features}
                placeholder="One feature per line, in the order you want them numbered"
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
                  {count} feature{count === 1 ? '' : 's'}, plus the blank
                  {kept.length > 0 &&
                    ` and ${kept.length} you drew`}
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

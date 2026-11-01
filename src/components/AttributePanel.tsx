import { ATTRIBUTES, type AttributeId, type SpellAttributes } from '../lib/keys'
import { ATTRIBUTE_INK } from '../lib/palette'
import { bitsFor } from '../lib/encoding'

interface Props {
  spell: SpellAttributes
  sides: number
  tintByAttribute: boolean
  onChange: (id: AttributeId, feature: string) => void
  onFocus: (id: AttributeId | null) => void
}

export function AttributePanel({ spell, sides, tintByAttribute, onChange, onFocus }: Props) {
  return (
    <section className="panel">
      <h2>Attributes</h2>
      <p className="hint">
        Each attribute is drawn with chords of its own length <em>k</em>, so the layers stack
        without ever sharing an edge.
      </p>

      <div className="attributes">
        {ATTRIBUTES.map((attribute) => {
          const feature = spell[attribute.id]
          const bits = bitsFor(attribute, feature, sides)
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
                  style={{
                    background: tintByAttribute ? ATTRIBUTE_INK[attribute.id] : 'var(--ink)',
                  }}
                  aria-hidden="true"
                />
                <span className="attribute-label">{attribute.label}</span>
                <span className="k">k = {attribute.k}</span>
              </span>

              <select
                value={feature}
                onChange={(e) => onChange(attribute.id, e.target.value)}
              >
                {attribute.features.map((option) => (
                  <option key={option} value={option}>
                    {attribute.id === 'level' && option === '0' ? '0 (cantrip)' : option}
                  </option>
                ))}
              </select>

              <code className="bits">{bits}</code>
            </label>
          )
        })}
      </div>
    </section>
  )
}

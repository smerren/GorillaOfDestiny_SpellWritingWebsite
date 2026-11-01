import type { AttributeId } from '../lib/keys'
import type { Figure } from '../lib/encoding'
import { layerInk } from '../lib/palette'


interface Props {
  figure: Figure
  tintByAttribute: boolean
  ink: string
  onChange: (id: AttributeId, feature: string) => void
  onFocus: (id: AttributeId | null) => void
}

export function AttributePanel({ figure, tintByAttribute, ink, onChange, onFocus }: Props) {
  return (
    <section className="panel">
      <h2>Attributes</h2>
      <p className="hint">
        Each attribute is drawn with chords of its own length <em>k</em>, so the layers stack
        without ever sharing an edge.
      </p>

      <div className="attributes">
        {figure.layers.map(({ attribute, feature, bits }) => {
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
                    background: tintByAttribute ? layerInk(attribute.k) : ink,
                  }}
                  aria-hidden="true"
                />
                <span className="attribute-label">{attribute.label}</span>
                <span className="k">k = {attribute.k}</span>
              </span>

              <select
                value={feature ?? ''}
                onChange={(e) => onChange(attribute.id, e.target.value)}
              >
                {feature === null && (
                  <option value="">Drawn by hand — no feature</option>
                )}
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

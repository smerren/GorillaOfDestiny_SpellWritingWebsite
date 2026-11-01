import { BASES } from '../lib/bases'
import { CONNECTORS } from '../lib/connectors'
import { INK_PRESETS } from '../lib/palette'
import type { RuneStyle } from '../lib/rune'

interface Props {
  style: RuneStyle
  connector: string
  tintByAttribute: boolean
  ink: string
  onStyle: (patch: Partial<RuneStyle>) => void
  onConnector: (id: string) => void
  onTint: (on: boolean) => void
  onInk: (colour: string) => void
}

export function StylePanel({
  style,
  connector,
  tintByAttribute,
  ink,
  onStyle,
  onConnector,
  onTint,
  onInk,
}: Props) {
  const curved = connector === 'arc'

  return (
    <section className="panel">
      <h2>Style</h2>
      <p className="hint">
        The system decides <em>which</em> dots get joined. How you draw them is yours — this
        is where one caster's handwriting differs from another's.
      </p>

      <label className="field">
        <span>Where the dots sit</span>
        <select value={style.base} onChange={(e) => onStyle({ base: e.target.value as never })}>
          {BASES.map((base) => (
            <option key={base.id} value={base.id}>
              {base.label}
            </option>
          ))}
        </select>
        <small>{BASES.find((b) => b.id === style.base)?.description}</small>
      </label>

      <label className="field">
        <span>How they join</span>
        <select value={connector} onChange={(e) => onConnector(e.target.value)}>
          {CONNECTORS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <small>{CONNECTORS.find((c) => c.id === connector)?.description}</small>
      </label>

      {curved && (
        <label className="field">
          <span>
            How far they bend <code className="inline">{style.curvature.toFixed(2)}</code>
          </span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={style.curvature}
            onChange={(e) => onStyle({ curvature: Number(e.target.value) })}
          />
          <small>
            At 1.00 each line swells into a half circle. Lower values bend it more gently.
          </small>
        </label>
      )}

      <fieldset className="toggles">
        <legend>Show</legend>
        <label>
          <input
            type="checkbox"
            checked={style.showScaffold}
            onChange={(e) => onStyle({ showScaffold: e.target.checked })}
          />
          Guide lines
        </label>
        <label>
          <input
            type="checkbox"
            checked={style.showNodes}
            onChange={(e) => onStyle({ showNodes: e.target.checked })}
          />
          The dots themselves
        </label>
        <label>
          <input
            type="checkbox"
            checked={style.showStartNode}
            onChange={(e) => onStyle({ showStartNode: e.target.checked })}
          />
          The filled dot, which marks where reading begins
        </label>
        <small>
          Guide lines show every line the shape could carry, faintly, behind the spell.
        </small>
      </fieldset>

      <fieldset className="toggles">
        <legend>Ink</legend>
        <label>
          <input
            type="checkbox"
            checked={tintByAttribute}
            onChange={(e) => onTint(e.target.checked)}
          />
          Give each attribute its own colour
        </label>

        {tintByAttribute ? (
          <small>
            Makes a crowded rune easier to read: every line of one colour belongs to the same
            attribute.
          </small>
        ) : (
          <div className="ink-pick">
            <div className="swatches">
              {INK_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={preset.value === ink ? 'chip on' : 'chip'}
                  style={{ background: preset.value }}
                  title={preset.label}
                  aria-label={preset.label}
                  aria-pressed={preset.value === ink}
                  onClick={() => onInk(preset.value)}
                />
              ))}
            </div>
            <label className="custom-ink">
              <input
                type="color"
                value={ink}
                aria-label="Custom ink colour"
                onChange={(e) => onInk(e.target.value)}
              />
              <code>{ink}</code>
            </label>
          </div>
        )}
      </fieldset>
    </section>
  )
}

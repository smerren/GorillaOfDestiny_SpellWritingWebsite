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
      <h2>Hand</h2>
      <p className="hint">
        The rules fix which nodes join, never how. Base and line style are where a caster shows
        their own hand.
      </p>

      <label className="field">
        <span>Base</span>
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
        <span>Connections</span>
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
            Bow <code className="inline">{style.curvature.toFixed(2)}</code>
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
            How far each arc bows off its chord. At 1.00 the circle is centred on the two nodes;
            below that it is a non-centred circle, and the arc stays inside the figure.
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
          Scaffold of every possible chord
        </label>
        <label>
          <input
            type="checkbox"
            checked={style.showNodes}
            onChange={(e) => onStyle({ showNodes: e.target.checked })}
          />
          Nodes
        </label>
        <label>
          <input
            type="checkbox"
            checked={style.showStartNode}
            onChange={(e) => onStyle({ showStartNode: e.target.checked })}
          />
          Start node
        </label>
      </fieldset>

      <fieldset className="toggles">
        <legend>Ink</legend>
        <label>
          <input
            type="checkbox"
            checked={tintByAttribute}
            onChange={(e) => onTint(e.target.checked)}
          />
          A colour per attribute
        </label>

        {tintByAttribute ? (
          <small>Each layer takes its own colour, so a reader can follow one attribute.</small>
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

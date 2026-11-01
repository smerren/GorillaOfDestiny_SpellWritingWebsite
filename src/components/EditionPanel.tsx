import { EDITIONS, EDITION_BY_ID, type EditionId } from '../lib/scheme'

interface Props {
  edition: EditionId
  onEdition: (id: EditionId) => void
}

export function EditionPanel({ edition, onEdition }: Props) {
  const chosen = EDITION_BY_ID[edition]

  return (
    <section className="panel">
      <h2>Which keys</h2>
      <p className="hint">
        The Gorilla of Destiny published two sets of keys, and they do not agree. Level and
        school are the same in both; damage, area and range are not, so the same spell comes
        out as a different rune under each.
      </p>

      <label className="field">
        <span>Keys</span>
        <select value={edition} onChange={(e) => onEdition(e.target.value as EditionId)}>
          {EDITIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <small>{chosen.note}</small>
      </label>

      {!chosen.hasSpellList && (
        <p className="hint">
          The 319 published spells are written in the 2024 vocabulary — areas like{' '}
          <em>Sphere (20)</em> have no equivalent here — so the 5e spellbook is only
          offered with those keys.
        </p>
      )}
    </section>
  )
}

import { useMemo, useState } from 'react'

import spellData from '../data/spells.json'
import type { SpellAttributes } from '../lib/keys'

export interface LibrarySpell extends SpellAttributes {
  name: string
}

/** The SRD spells of the 2024 dictionary, with level widened to the key's strings. */
export const LIBRARY: readonly LibrarySpell[] = (
  spellData as ReadonlyArray<{
    name: string
    level: number
    school: string
    damage: string
    area: string
    range: string
  }>
).map((s) => ({
  name: s.name,
  level: String(s.level),
  school: s.school,
  damage: s.damage,
  area: s.area,
  range: s.range,
}))

interface Props {
  current: string | null
  onPick: (spell: LibrarySpell) => void
}

export function SpellLibrary({ current, onPick }: Props) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return LIBRARY
    return LIBRARY.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q) ||
        s.damage.toLowerCase().includes(q) ||
        `level ${s.level}`.includes(q),
    )
  }, [query])

  return (
    <section className="panel">
      <h2>Spellbook</h2>
      <p className="hint">
        All {LIBRARY.length} spells of the 5e SRD, drawn exactly as the Gorilla of Destiny's
        2024 dictionary draws them. Pick one to load it.
      </p>

      <input
        className="search"
        type="search"
        value={query}
        placeholder="Search by name, school or damage…"
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search the spellbook"
      />

      <ul className="spell-list">
        {matches.map((spell) => (
          <li key={spell.name}>
            <button
              type="button"
              className={spell.name === current ? 'spell current' : 'spell'}
              onClick={() => onPick(spell)}
            >
              <span className="spell-name">{spell.name}</span>
              <span className="spell-meta">
                {spell.level === '0' ? 'Cantrip' : `Level ${spell.level}`} · {spell.school}
              </span>
            </button>
          </li>
        ))}
        {matches.length === 0 && <li className="empty">No spell by that name.</li>}
      </ul>
    </section>
  )
}

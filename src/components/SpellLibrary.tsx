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
  /** Names already copied into the author's own spellbook. */
  favourites: ReadonlySet<string>
  onPick: (spell: LibrarySpell) => void
  onFavourite: (spell: LibrarySpell, on: boolean) => void
}

export function SpellLibrary({ current, favourites, onPick, onFavourite }: Props) {
  const [query, setQuery] = useState('')
  const [onlyFavourites, setOnlyFavourites] = useState(false)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = onlyFavourites ? LIBRARY.filter((s) => favourites.has(s.name)) : LIBRARY
    if (!q) return pool
    return pool.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q) ||
        s.damage.toLowerCase().includes(q) ||
        `level ${s.level}`.includes(q),
    )
  }, [query, onlyFavourites, favourites])

  return (
    <section className="panel">
      <h2>The 5e spellbook</h2>
      <p className="hint">
        All {LIBRARY.length} spells of the 5e SRD, drawn exactly as the Gorilla of Destiny's
        2024 dictionary draws them. Click one to open it, or star it to copy it into your own
        spellbook.
      </p>

      <input
        className="search"
        type="search"
        value={query}
        placeholder="Search by name, school or damage…"
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search the spellbook"
      />

      <label className="only-favourites">
        <input
          type="checkbox"
          checked={onlyFavourites}
          onChange={(e) => setOnlyFavourites(e.target.checked)}
        />
        Only the {favourites.size} I have starred
      </label>

      <ul className="spell-list">
        {matches.map((spell) => {
          const starred = favourites.has(spell.name)
          return (
            <li key={spell.name}>
              <div className="kept-row">
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
                <button
                  type="button"
                  className={starred ? 'star on' : 'star'}
                  aria-pressed={starred}
                  title={
                    starred
                      ? `Remove ${spell.name} from your spellbook`
                      : `Copy ${spell.name} into your spellbook`
                  }
                  aria-label={
                    starred
                      ? `Remove ${spell.name} from your spellbook`
                      : `Copy ${spell.name} into your spellbook`
                  }
                  onClick={() => onFavourite(spell, !starred)}
                >
                  {starred ? '★' : '☆'}
                </button>
              </div>
            </li>
          )
        })}
        {matches.length === 0 && (
          <li className="empty">
            {onlyFavourites ? 'Nothing starred yet.' : 'No spell by that name.'}
          </li>
        )}
      </ul>
    </section>
  )
}

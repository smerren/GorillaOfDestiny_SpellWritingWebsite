import { useState } from 'react'

import { spellsFor, type SavedSpell, type Spellbook } from '../lib/spellbook'

interface Props {
  book: Spellbook
  scheme: string
  sides: number
  /** The spell on the table, if it is already in the book. */
  current: SavedSpell | null
  /** What the rune is called at the moment, from the field under it. */
  title: string | null
  onOpen: (spell: SavedSpell) => void
  onKeep: (name: string) => void
  onRename: (id: string, name: string) => void
  onDrop: (id: string) => void
}

export function SpellbookPanel({
  book,
  scheme,
  sides,
  current,
  title,
  onOpen,
  onKeep,
  onRename,
  onDrop,
}: Props) {
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameTo, setRenameTo] = useState('')

  const mine = spellsFor(book, scheme, sides)
  const proposed = (draft || title || '').trim()

  return (
    <section className="panel">
      <h2>Your spellbook</h2>
      <p className="hint">
        Spells you have written or copied. Change a rune however you like, then keep it here
        under a name of your own.
      </p>

      {current ? (
        <p className="kept-here">
          This one is already in your spellbook as <strong>{current.name}</strong>.
        </p>
      ) : (
        <div className="keep-spell">
          <input
            type="text"
            value={draft || title || ''}
            placeholder="Name this spell"
            aria-label="Name for this spell"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && proposed) {
                e.preventDefault()
                onKeep(proposed)
                setDraft('')
              }
            }}
          />
          <button
            type="button"
            disabled={!proposed}
            onClick={() => {
              onKeep(proposed)
              setDraft('')
            }}
          >
            Keep
          </button>
        </div>
      )}

      {mine.length === 0 ? (
        <p className="empty">Nothing kept yet.</p>
      ) : (
        <ul className="spell-list">
          {mine.map((spell) => (
            <li key={spell.id}>
              {renaming === spell.id ? (
                <span className="keep-spell">
                  <input
                    type="text"
                    value={renameTo}
                    autoFocus
                    aria-label={`New name for ${spell.name}`}
                    onChange={(e) => setRenameTo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onRename(spell.id, renameTo)
                        setRenaming(null)
                      }
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                  />
                  <button
                    type="button"
                    disabled={!renameTo.trim()}
                    onClick={() => {
                      onRename(spell.id, renameTo)
                      setRenaming(null)
                    }}
                  >
                    Rename
                  </button>
                </span>
              ) : (
                <div className="kept-row">
                  <button
                    type="button"
                    className={current?.id === spell.id ? 'spell current' : 'spell'}
                    onClick={() => onOpen(spell)}
                  >
                    <span className="spell-name">{spell.name}</span>
                    {spell.fromDictionary && (
                      <span className="spell-meta">copied from the dictionary</span>
                    )}
                  </button>
                  <span className="kept-actions">
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        setRenaming(spell.id)
                        setRenameTo(spell.name)
                      }}
                    >
                      rename
                    </button>
                    <button
                      type="button"
                      className="link"
                      aria-label={`Remove ${spell.name} from your spellbook`}
                      onClick={() => onDrop(spell.id)}
                    >
                      remove
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

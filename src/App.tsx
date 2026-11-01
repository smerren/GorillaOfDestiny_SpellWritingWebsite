import { useCallback, useEffect, useMemo, useState } from 'react'

import { SchemeEditor } from './components/SchemeEditor'
import { SpellLibrary, type LibrarySpell } from './components/SpellLibrary'
import { Workbench } from './components/Workbench'
import { EMPTY_SPELL, type SpellAttributes } from './lib/keys'
import {
  blankSpell,
  compile,
  FIVE_E,
  loadDraft,
  saveDraft,
  STARTER,
  type Draft,
} from './lib/scheme'

type Tab = 'scribe' | 'forge'

/** The 5e dictionary: a fixed scheme with a spellbook to draw from. */
function Scribe() {
  const [spell, setSpell] = useState<SpellAttributes>(EMPTY_SPELL)
  const [name, setName] = useState<string | null>(null)

  const pick = useCallback((picked: LibrarySpell) => {
    const { name: picked_name, ...attributes } = picked
    setSpell(attributes)
    setName(picked_name)
  }, [])

  const change = useCallback((next: SpellAttributes) => {
    setSpell(next)
    // Once an attribute is altered this is no longer the spell from the book.
    setName(null)
  }, [])

  return (
    <Workbench
      scheme={FIVE_E}
      spell={spell}
      onSpell={change}
      title={name}
      onTitle={setName}
    >
      <SpellLibrary current={name} onPick={pick} />
    </Workbench>
  )
}

/** A scheme of the author's own making. */
function Forge() {
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? STARTER)
  const [chosen, setChosen] = useState<SpellAttributes>({})
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  const scheme = useMemo(() => compile(draft), [draft])

  // Features come and go while the scheme is being written, so anything no
  // longer on offer falls back to the blank rather than hanging about unseen.
  const spell = useMemo(() => {
    const blank = blankSpell(scheme)
    const out: SpellAttributes = { ...blank }
    for (const attribute of scheme.attributes) {
      const picked = chosen[attribute.id]
      if (picked && attribute.features.includes(picked)) out[attribute.id] = picked
    }
    return out
  }, [scheme, chosen])

  return (
    <Workbench
      scheme={scheme}
      spell={spell}
      onSpell={setChosen}
      title={name}
      onTitle={setName}
    >
      <SchemeEditor draft={draft} onDraft={setDraft} onReset={() => setDraft(STARTER)} />
    </Workbench>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('scribe')

  return (
    <div className="page">
      <header className="masthead">
        <h1>Spell Writing</h1>
        <p className="standfirst">
          A scribing table for the notation set out in <em>The Spell Writing Guide</em> by the
          Gorilla of Destiny. Choose what a spell <em>is</em>, and read back the shape it is
          written as.
        </p>

        <nav className="tabs" role="tablist" aria-label="Scheme">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'scribe'}
            className={tab === 'scribe' ? 'on' : undefined}
            onClick={() => setTab('scribe')}
          >
            Dungeons &amp; Dragons 5e
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'forge'}
            className={tab === 'forge' ? 'on' : undefined}
            onClick={() => setTab('forge')}
          >
            Forge your own
          </button>
        </nav>
      </header>

      {tab === 'scribe' ? <Scribe /> : <Forge />}

      <footer className="colophon">
        <p>
          The spell writing system is the work of <strong>The Gorilla of Destiny</strong>{' '}
          (@GorillaOfDestiny). This site is not endorsed by or authored by them.
        </p>
        <p>
          Spell attributes are taken from the System Reference Document 5.1 by Wizards of the
          Coast LLC, used under the{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/legalcode">
            Creative Commons Attribution 4.0 International License
          </a>
          .
        </p>
      </footer>
    </div>
  )
}

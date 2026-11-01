import { useCallback, useEffect, useMemo, useState } from 'react'

import { SchemeEditor } from './components/SchemeEditor'
import { SpellLibrary, type LibrarySpell } from './components/SpellLibrary'
import { Workbench } from './components/Workbench'
import { bitsOf, emptyBits, figureFromSpell, type Bits } from './lib/encoding'
import { EMPTY_SPELL } from './lib/keys'
import {
  forget,
  loadNames,
  remember,
  saveNames,
  type NamedLibrary,
  type NamedSymbol,
} from './lib/named'
import {
  compile,
  FIVE_E,
  loadDraft,
  saveDraft,
  STARTER,
  withKept,
  type Draft,
} from './lib/scheme'

type Tab = 'scribe' | 'forge'

/** Symbols the author has named, kept across visits. */
function useNamedSymbols() {
  const [named, setNamed] = useState<NamedLibrary>(() => loadNames())

  useEffect(() => {
    saveNames(named)
  }, [named])

  const onRemember = useCallback(
    (entry: NamedSymbol) => setNamed((all) => remember(all, entry)),
    [],
  )
  const onForget = useCallback((entry: NamedSymbol) => setNamed((all) => forget(all, entry)), [])

  return { named, onRemember, onForget }
}

/** The 5e dictionary: a fixed scheme with a spellbook to draw from. */
function Scribe() {
  const { named, onRemember, onForget } = useNamedSymbols()
  const scheme = useMemo(() => withKept(FIVE_E, named), [named])
  const [bits, setBits] = useState<Bits>(() =>
    bitsOf(figureFromSpell(EMPTY_SPELL, FIVE_E.sides, FIVE_E.attributes)),
  )
  const [name, setName] = useState<string | null>(null)

  const pick = useCallback((picked: LibrarySpell) => {
    const { name: picked_name, ...attributes } = picked
    setBits(bitsOf(figureFromSpell(attributes, FIVE_E.sides, FIVE_E.attributes)))
    setName(picked_name)
  }, [])

  const change = useCallback((next: Bits) => {
    setBits(next)
    // Once a line is altered this is no longer the spell from the book.
    setName(null)
  }, [])

  return (
    <Workbench
      scheme={scheme}
      bits={bits}
      onBits={change}
      onRemember={onRemember}
      onForget={onForget}
      title={name}
      onTitle={setName}
    >
      <SpellLibrary current={name} onPick={pick} />
    </Workbench>
  )
}

/** A scheme of the author's own making. */
function Forge() {
  const { named, onRemember, onForget } = useNamedSymbols()
  const [draft, setDraft] = useState<Draft>(() => loadDraft() ?? STARTER)
  const [drawn, setDrawn] = useState<Bits>({})
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    saveDraft(draft)
  }, [draft])

  const scheme = useMemo(() => withKept(compile(draft), named), [draft, named])

  // Attributes come and go while a scheme is being written, and the node count
  // moves with them, so anything that no longer fits falls back to blank
  // rather than hanging about at the wrong length.
  const bits = useMemo(() => {
    const out = emptyBits(scheme.sides, scheme.attributes)
    for (const attribute of scheme.attributes) {
      const written = drawn[attribute.id]
      if (written && written.length === scheme.sides) out[attribute.id] = written
    }
    return out
  }, [scheme, drawn])

  return (
    <Workbench
      scheme={scheme}
      bits={bits}
      onBits={setDrawn}
      onRemember={onRemember}
      onForget={onForget}
      title={name}
      onTitle={setName}
    >
      <SchemeEditor
        draft={draft}
        scheme={scheme}
        onDraft={setDraft}
        onForget={onForget}
        onReset={() => setDraft(STARTER)}
      />
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

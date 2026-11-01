import { useCallback, useEffect, useMemo, useState } from 'react'

import { SchemeEditor } from './components/SchemeEditor'
import { SpellLibrary, type LibrarySpell } from './components/SpellLibrary'
import { SpellbookPanel } from './components/SpellbookPanel'
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
  dictionaryId,
  drop,
  findByShape,
  keep,
  loadSpellbook,
  newSpellId,
  rename,
  saveSpellbook,
  spellsFor,
  type SavedSpell,
  type Spellbook,
} from './lib/spellbook'
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

/** Spells the author has kept, across visits. */
function useSpellbook() {
  const [book, setBook] = useState<Spellbook>(() => loadSpellbook())

  useEffect(() => {
    saveSpellbook(book)
  }, [book])

  return {
    book,
    onKeep: useCallback((spell: SavedSpell) => setBook((all) => keep(all, spell)), []),
    onDrop: useCallback((id: string) => setBook((all) => drop(all, id)), []),
    onRename: useCallback(
      (id: string, name: string) => setBook((all) => rename(all, id, name)),
      [],
    ),
  }
}

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
/** Lines for a spell out of the published dictionary. */
function dictionaryBits(spell: LibrarySpell): Bits {
  const { name: _name, ...attributes } = spell
  return bitsOf(figureFromSpell(attributes, FIVE_E.sides, FIVE_E.attributes))
}

function Scribe() {
  const { named, onRemember, onForget } = useNamedSymbols()
  const { book, onKeep, onDrop, onRename } = useSpellbook()
  const scheme = useMemo(() => withKept(FIVE_E, named), [named])

  const [bits, setBits] = useState<Bits>(() =>
    bitsOf(figureFromSpell(EMPTY_SPELL, FIVE_E.sides, FIVE_E.attributes)),
  )
  const [name, setName] = useState<string | null>(null)

  const pick = useCallback((picked: LibrarySpell) => {
    setBits(dictionaryBits(picked))
    setName(picked.name)
  }, [])

  const change = useCallback((next: Bits) => {
    setBits(next)
    // Once a line is altered this is no longer the spell it was opened as.
    setName(null)
  }, [])

  // Which dictionary spells have been copied in, so the stars can show it.
  const favourites = useMemo(
    () =>
      new Set(
        spellsFor(book, scheme.id, scheme.sides)
          .filter((s) => s.fromDictionary)
          .map((s) => s.name),
      ),
    [book, scheme],
  )

  const current = useMemo(
    () => findByShape(book, scheme.id, scheme.sides, bits),
    [book, scheme, bits],
  )

  const favourite = useCallback(
    (spell: LibrarySpell, on: boolean) => {
      const id = dictionaryId(scheme.id, spell.name)
      if (!on) {
        onDrop(id)
        return
      }
      onKeep({
        id,
        scheme: scheme.id,
        sides: scheme.sides,
        name: spell.name,
        bits: dictionaryBits(spell),
        fromDictionary: true,
      })
    },
    [scheme, onKeep, onDrop],
  )

  const open = useCallback((spell: SavedSpell) => {
    setBits(spell.bits)
    setName(spell.name)
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
      <SpellbookPanel
        book={book}
        scheme={scheme.id}
        sides={scheme.sides}
        current={current}
        title={name}
        onOpen={open}
        onKeep={(spellName) => {
          const id = newSpellId()
          onKeep({ id, scheme: scheme.id, sides: scheme.sides, name: spellName, bits })
          setName(spellName)
        }}
        onRename={onRename}
        onDrop={onDrop}
      />
      <SpellLibrary
        current={name}
        favourites={favourites}
        onPick={pick}
        onFavourite={favourite}
      />
    </Workbench>
  )
}

/** A scheme of the author's own making. */
function Forge() {
  const { named, onRemember, onForget } = useNamedSymbols()
  const { book, onKeep, onDrop, onRename } = useSpellbook()
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

  const current = useMemo(
    () => findByShape(book, scheme.id, scheme.sides, bits),
    [book, scheme, bits],
  )

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
      <SpellbookPanel
        book={book}
        scheme={scheme.id}
        sides={scheme.sides}
        current={current}
        title={name}
        onOpen={(spell) => {
          setDrawn(spell.bits)
          setName(spell.name)
        }}
        onKeep={(spellName) => {
          onKeep({
            id: newSpellId(),
            scheme: scheme.id,
            sides: scheme.sides,
            name: spellName,
            bits,
          })
          setName(spellName)
        }}
        onRename={onRename}
        onDrop={onDrop}
      />
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
          Write a spell as a rune. Say what the spell does and its shape follows; or join the
          dots yourself and read back what you have written. The notation is the Gorilla of
          Destiny's, from <em>The Spell Writing Guide</em>.
        </p>

        <nav className="tabs" role="tablist" aria-label="Scheme">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'scribe'}
            className={tab === 'scribe' ? 'on' : undefined}
            onClick={() => setTab('scribe')}
          >
            Spellbook
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'forge'}
            className={tab === 'forge' ? 'on' : undefined}
            onClick={() => setTab('forge')}
          >
            Invent your own system
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

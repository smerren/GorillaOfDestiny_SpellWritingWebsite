# Spell Writing

A scribing table for the spell notation set out in **The Spell Writing Guide** by
[The Gorilla of Destiny](https://www.tiktok.com/@gorillaofdestiny).

Say what a spell *is* — its level, school, damage type, area and range — and read back the
rune it is written as. Or join the dots yourself and read back what you wrote. Keep what
you make in your own spellbook, or invent a notation of your own with whatever attributes
you like.

```
npm install
npm run dev        # http://localhost:5173
npm test           # 149 tests, including every published rune and both sets of keys
npm run build
```

Everything runs in the browser. There is no server, no account and no database: the build
is three static files, and your spellbook lives in your own browser storage.

## Made with AI

**This site was built with AI.** The code here was written by Claude, working from the
guide, with me directing it.

> I used AI mainly because I'm lazy, however I think this is a good usage of it, since it
> makes this type of art easily accessible, without the knowledge of the maths involved.

Which is the thing worth saying about it: the notation rests on cyclically unique binary
numbers and a bit of graph theory, and none of that should be the price of writing a
pretty rune for your character. The maths is in here so you do not have to do it.

None of the system is mine. It is the Gorilla of Destiny's, and the credits are at the
bottom.

## How the notation works

Spell attributes are drawn as chords of a polygon. Every attribute gets its own chord
length `k`, so the layers stack into one figure without ever sharing an edge, and each
layer can be read back on its own.

| Attribute   | `k` | Features |
| ----------- | --- | -------- |
| Level       | 1   | 0–9 |
| School      | 2   | Blank + 8 schools |
| Damage type | 3   | None + 13 types |
| Area type   | 4   | None + 35 shapes and sizes |
| Range       | 5   | Blank + 17 ranges |

Five attributes need `n >= 2 x 5 + 1`, so the base is an **11-gon**.

Each feature is written as an 11-bit binary number drawn from the *cyclically unique* list:
of all `2^11` binary numbers, only one member of each rotation class is kept. That is what
makes a rune readable without knowing which way up it was written — no rotation of one
feature's shape can be mistaken for another's.

To draw a layer, read its bits left to right. Where bit `i` is `1`, join node `i` to node
`(i + k) mod 11`.

The feature's position in its list is its index into that binary list:

- Index `0` is all zeroes and draws nothing, which is what **None** and **Blank** are.
- **Level is the exception**: its list has no blank entry, so level `L` takes index `L + 1`.

Node `0` is the filled start node, one and a half steps clockwise of vertical, and the
numbering runs clockwise.

## Two sets of keys

The Gorilla of Destiny published the keys twice, and they do not agree.

|  | Guide, Section 4 (2022) | Dictionary (2024) |
| --- | --- | --- |
| Level | same | same |
| School | same | same |
| Damage | 16 types, including `damage`, `extra`, `nonmagical` | 14, led by `None` |
| Area | `Single-Target/Sphere`, `Circle`, `Square`… | `Sphere (20)`, `Cube (10)`… |
| Range | folds shape in: `15-feet cone`, `100-feet line` | plain distances, plus Self and Touch |

So `fire` is `00000001011` in the guide but `00000000111` in the dictionary — and
`00000000111` is what the guide calls plain `damage`. Everything from the fourth damage
type on sits two places later in the guide, because the SRD has no word for `damage` or
`extra`.

Both are offered, under **Which keys**. The 2024 keys are the default because the 319
published spells are written in that vocabulary and cannot be expressed in the other, so
the 5e spellbook only appears with those keys selected. Spells and named shapes are held
per scheme, so the two editions keep separate spellbooks.

## Is it faithful?

Yes, and the tests prove it rather than assert it. The chords of all 319 runes in the 2024
dictionary were extracted from the vector paths of the PDF itself and stored in
[`test/drawn-runes.json`](test/drawn-runes.json), one entry per spell with each layer kept
separate:

```json
"Fireball": { "level": "00000000111", "school": "00000001001",
              "damage": "00000000111", "area": "00000111011",
              "range": "00000001001" }
```

`npm test` encodes every spell from its attributes and compares each layer against what
the book actually draws:

```
319 spells x 5 layers = 1595 bitstrings, 0 mismatches
```

Because the layers are stored separately, a regression names the attribute that broke
rather than just the spell — `Fireball damage: drew 00000000110, encoded 00000000111`.

That fixture is also what pinned down the two rules above — the index offsets and the
start node — which are not stated anywhere in the guide.

## Source material

The guide and its dictionaries are not in this repository — they are the Gorilla of
Destiny's work, and the v2 dictionary alone is 54MB. Everything the project needs has
already been extracted into `src/data/spells.json` and `test/drawn-runes.json`.

| File | Used for |
| ---- | -------- |
| `SpellWritingGuide_Plainv4_3.pdf` | The system itself, and the binary dictionary counts the tests check against |
| `Spell_Writing_NewDictionary_v1.pdf` (July 2024) | The attribute key lists, all 319 spells, and the drawn chords of every rune |
| `Spell_Writing_Dictionaryv2.pdf` | Nothing — superseded by the 2024 dictionary |

If you re-extract the spell list from the PDF, note that the small-caps headings drop
spaces between words in twelve names (`Mistystep`, `Rayof Frost`, `Holyaura` and others).
They were corrected against the dictionary's own table of contents. The tests will not
catch a regression here, because the fixture is generated from the same headings.

## Layout

```
src/lib/binary.ts       cyclically unique binary numbers
src/lib/keys.ts         the five 5e attributes and their feature lists
src/lib/encoding.ts     feature <-> bits <-> chords, and figures made of them
src/lib/bases.ts        where the dots sit (Section 2.3.3)
src/lib/connectors.ts   how dots are joined, and how far a line reaches
src/lib/rune.ts         assembling a figure, and writing it out as SVG
src/lib/plate.ts        the spellbook page: a rune beside its parts
src/lib/scheme.ts       attribute sets, including ones you invent
src/lib/named.ts        shapes you drew, named and kept
src/lib/spellbook.ts    spells you wrote or copied
src/data/spells.json    319 SRD spells, parsed from the 2024 dictionary
```

**The order of the lists in `keys.ts` is load-bearing.** A feature's position *is* its
symbol, so reordering one list silently rewrites every rune that uses it. The tests will
catch it.

## Views

**Rune** is the figure on its own. **Spellbook plate** is the page the guide closes its
qualitative section with: the whole rune above, and the five symbols it is built from
below, each labelled with its attribute, its value and its `k`. Turn on *Tint each
attribute* and a colour traces from the main figure straight down to the symbol it came
from.

Both views export as SVG or PNG. The plate carries its own parchment ground and credit
line, so it stands alone as a page.

## A caster's own hand

The rules fix *which* nodes are joined, never *how*. Both of those are adjustable:

- **Bases** — regular polygon (the published default), semicircle, quarter circle,
  quadratic and cubic.
- **Connections** — straight lines, or circular arcs on a curvature dial. At `1.00` the
  arc is the guide's "centred circle", whose circle is centred on the two nodes; below
  that it is a "non-centred circle".
- **Ink** — a colour per attribute by default, so a layer can be followed through a
  crowded figure, or a single colour of your choosing.

### Which way an arc bows

A chord bows **away from the stretch of base lying between its own endpoints**. On a
polygon that works out as bowing inwards, which is what the guide asks for. On an open
base it matters more: bowing towards the node centroid would make a chord run alongside
the curve and disappear into it, so instead it bows to the open side and closes a
readable shape against the base.

Where the endpoints are neighbours there is no stretch in between, so the local centre of
curvature stands in — for any circular base that is exactly the centre of the circle.
This is also why `Base` carries a `closed` flag: on an open curve the chord from the last
node to the first spans the whole figure rather than stepping across a gap, so which
nodes count as "between" differs.

## Two spellbooks

The **Spellbook** tab holds two of them. *Your spellbook* is what you have written or
copied; *the 5e spellbook* is the 319 published SRD spells, which you can open or star.
Starring copies a spell into yours.

A kept spell stores **the lines**, not a list of chosen features — the same reason a
figure does. A spell drawn by hand can say something no feature names, and a copied
favourite then survives you later renaming the shapes it was written with.

Whether the rune on the table is already kept is decided by comparing its lines, not its
name, so changing one line makes it a new spell to be named. A layer that draws nothing
and a layer that was never stored count as the same spell.

Spells are kept per scheme and per dot count, because the same lines drawn under a
different scheme are a different spell. The Forge therefore has its own spellbook for
whatever system you invent there.

## Drawing by hand

Click a node to start a line and another to finish it; clicking the same pair again
erases it. Only lengths some attribute is drawn with can be joined, and the nodes that
would make a line are marked once one is held. The dropdowns still work and stay in step.

This is why bits, not feature names, are the state a figure is kept in. A figure drawn by
hand can land on a number that is cyclically unique but outside its attribute's list — a
legible symbol that names nothing. The notation allows it, so the model does too: such a
layer reads as *drawn by hand* rather than being snapped to the nearest word or refused.

### Naming what you drew

Name an unnamed symbol and it joins the scheme as a feature of its attribute: it appears
in that attribute's dropdown under *Kept by you*, reads back by name wherever it is drawn
again, prints on a plate, and is listed under its attribute in the Forge, where it can be
forgotten again.

What it does **not** join is the attribute's published list:

```ts
features: readonly string[]            // order is the symbol
kept?:    readonly KeptFeature[]       // each carries its own bits
```

Position in `features` *is* the symbol, so appending to it would hand the new name
somebody else's shape and silently rewrite every rune after it — the same trap as
reordering a list. A kept shape carries the bits it was drawn with, because the shape
came first and the name second. Order means nothing among them. Tests hold the published
lists still across a naming to make sure of it.

Kept shapes are held per attribute, per scheme and per node count, because a shape drawn
on a 7-gon is not that shape on a 9-gon, and one never shadows a feature the attribute
already has. They live in browser storage, which is per-viewer and can fail outright in a
private window, costing the kept shapes and nothing else.

## Moving between figures

Changing a spell or a base is animated, and the two cases differ. Changing the base moves
the dots, so their positions are carried across; changing the spell leaves the dots where
they are and changes the lines, so a line is drawn on from its first node and taken back
the same way.

Both fall out of geometry rather than CSS. The figure is rebuilt from the moving dots
every frame, which is why the lines follow them instead of being animated separately —
and it is also why `d` never has to be transitioned, which no browser does portably.

Dots sweep round the centre rather than cutting straight across. Interpolating directly
between, say, a ring and a quarter arc sends every dot through the middle at once, so the
figure crumples to a knot halfway and opens out again; turning each the short way round
and easing its distance keeps the figure spread the whole way. A swung dot can briefly
reach wider than either end of the move, so the frame grows to hold it rather than
cropping.

Which way a line bows is settled once, on the arrangement being moved towards, and held
for the whole move. Deciding it per frame lets a line swap sides partway past a
degenerate arrangement and flicker — on a ring to quarter-circle change, twelve of them
did. The bow is carried as a signed amount, so a line that genuinely changes sides eases
through straight rather than snapping over.

`prefers-reduced-motion` skips all of it.

## Forging a scheme

The notation never required five attributes, or D&D's. The **Forge** tab takes any set of
attributes with finite feature lists and writes them in the same hand.

Two floors decide how big the base must be, and the guide names both: `n >= 2 x attributes
+ 1` so no two layers share an edge, and enough unique symbols for "the largest length of
any attribute list". Taking only the first would quietly alias an overflowing feature onto
the blank, so the automatic size respects both.

Every scheme reserves index 0 for a blank that draws nothing, exactly as the published
keys do with `None` and `Blank`. Drafts are kept in browser storage, which is per-viewer
and can fail outright in a private window — losing a draft and nothing else.

## To do

- **Let people define their own bases.** The five on offer — ring, dome, quarter circle,
  valley, wave — are hard-coded in `bases.ts`. The guide treats the base as free: any set
  of points that can be told apart and joined in order will do, which is the whole of
  Section 2.3.3. A base is only a function from a dot count to a list of points plus a
  flag for whether it closes, so the shape of the thing is already right; what is missing
  is a way to describe one without editing the file. Dragging dots around, or typing a
  formula, would both fit.

Attributes and feature lists of your own are done — that is the Forge tab — and
`binary.ts` and `bases.ts` were written against an arbitrary dot count from the start.

## Publishing

Pushing to `main` builds the site and publishes it to GitHub Pages, by way of
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It typechecks and runs the
tests first, so a broken encoding cannot reach the published page.

Turn it on once, under **Settings → Pages → Build and deployment → Source: GitHub
Actions**. The site then lands at `https://smerren.github.io/spell-writing/`.

**The path is the repository name.** GitHub serves a project site at
`https://<user>.github.io/<repo>/` and offers no setting to change it, so the repository
has to be called `spell-writing` for the URL to read that way. Renaming it later is one
field in **Settings → General**, and GitHub redirects the old URL afterwards; the only
other thing to do is point your local copy at the new name:

```
git remote set-url origin https://github.com/smerren/spell-writing.git
```

Nothing in the project refers to the repository by name, so a rename needs no code
change. Asset paths are relative (`base: './'` in `vite.config.ts`), so the site works at
whatever path it is served from — including the root, if you ever put it behind a domain
of your own.

Pages serves the built artifact directly, so Jekyll never runs over it and no `.nojekyll`
file is needed, even though your user page is itself a Jekyll site.

## Credits and licensing

The spell writing system is the work of **The Gorilla of Destiny**
([@GorillaOfDestiny](https://www.tiktok.com/@gorillaofdestiny) on TikTok,
[@GorillaOfDest](https://twitter.com/GorillaOfDest) on Twitter). The guide permits use for
any purpose given credit and a clear statement that the work is not endorsed or authored
by them. **This project is not endorsed by or authored by The Gorilla of Destiny.**

Spell attribute data comes from the System Reference Document 5.1 by Wizards of the Coast
LLC, used under the
[Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/legalcode),
by way of the [D&D 5e API](https://www.dnd5eapi.co/).

The code in this repository is MIT licensed — see [LICENSE](LICENSE).

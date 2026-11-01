# Spell Writing

A scribing table for the spell notation set out in **The Spell Writing Guide** by
[The Gorilla of Destiny](https://www.tiktok.com/@gorillaofdestiny). Pick what a spell *is* —
its level, school, damage type, area and range — and read back the rune it is written as.

```
npm install
npm run dev        # http://localhost:5173
npm test           # 19 tests, including a check against all 319 published runes
npm run build
```

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
src/lib/keys.ts         the five attributes and their feature lists
src/lib/encoding.ts     feature -> bits -> chords, and back again
src/lib/bases.ts        where the nodes sit (Section 2.3.3)
src/lib/connectors.ts   how nodes are joined (Sections 2.3.1-2.3.2)
src/lib/rune.ts         assembling a figure, and writing it out as SVG
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

## Drawing by hand

Click a node to start a line and another to finish it; clicking the same pair again
erases it. Only lengths some attribute is drawn with can be joined, and the nodes that
would make a line are marked once one is held. The dropdowns still work and stay in step.

This is why bits, not feature names, are the state a figure is kept in. A figure drawn by
hand can land on a number that is cyclically unique but outside its attribute's list — a
legible symbol that names nothing. The notation allows it, so the model does too: such a
layer reads as *drawn by hand* rather than being snapped to the nearest word or refused.

### Naming what you drew

An unnamed symbol can be given a name and kept. It then appears in that attribute's
dropdown under *Named by you*, and is read back by name wherever it is drawn again.

**A name is an overlay keyed by the bits, never an extra entry in the attribute's feature
list.** Position in that list *is* the symbol, so appending to it would hand the new name
somebody else's shape and silently rewrite every rune after it — which is the same trap
as reordering a list, and the tests guard it.

Names are held per attribute, per scheme and per node count, because a shape drawn on a
7-gon is not the same shape on a 9-gon. A name never shadows a feature the attribute
already has. They live in browser storage, which is per-viewer and can fail outright in a
private window, costing the saved names and nothing else.

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

## Not yet done

Letting people define their own attributes, feature lists and bases — the system is
general enough for any set of attributes with discrete features, and `binary.ts` and
`bases.ts` are already written against an arbitrary `n`. The UI is what assumes the 5e
five.

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

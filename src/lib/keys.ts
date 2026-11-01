/**
 * The five 5e attributes and their feature lists, transcribed from the "Updated
 * Keys" of the Spell Writing Guide Dictionary (July 2024), which draws its
 * attribute data from the D&D 5e SRD API.
 *
 * Order is load-bearing: a feature's position in its list is its index into the
 * cyclically unique binary list, so reordering one of these silently rewrites
 * every rune. The leading "None"/"Blank" sits at index 0 and draws nothing.
 */

/**
 * Attributes are identified by a plain string, because a scheme of the
 * author's own making invents its own. The five below are the built-in set.
 */
export type AttributeId = string

export type FiveEAttributeId = 'level' | 'school' | 'damage' | 'area' | 'range'

/**
 * A feature the author added by naming a shape they drew.
 *
 * It carries its own bits rather than taking them from its position, because
 * the shape came first and the name second. That is the whole difference
 * between these and the listed features.
 */
export interface KeptFeature {
  readonly name: string
  readonly bits: string
}

export interface Attribute {
  readonly id: AttributeId
  readonly label: string
  /** Which chord length this attribute is drawn with. */
  readonly k: number
  /** The published list, whose order is the symbol. */
  readonly features: readonly string[]
  /** Shapes the author drew, named, and kept. Order means nothing here. */
  readonly kept?: readonly KeptFeature[]
  /**
   * Levels are the one list with no blank entry, so level 0 takes index 1.
   * Every other attribute maps position straight onto the binary list.
   */
  readonly indexOffset: number
}

const LEVELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

const SCHOOLS = [
  'Blank',
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
]

const DAMAGE_TYPES = [
  'None',
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
]

const AREA_TYPES = [
  'None',
  'Cone (15)',
  'Cone (30)',
  'Cone (40)',
  'Cone (60)',
  'Cube (10)',
  'Cube (100)',
  'Cube (15)',
  'Cube (150)',
  'Cube (20)',
  'Cube (200)',
  'Cube (2500)',
  'Cube (30)',
  'Cube (40)',
  'Cube (40000)',
  'Cube (5)',
  'Cube (5280)',
  'Cylinder (10)',
  'Cylinder (20)',
  'Cylinder (40)',
  'Cylinder (5)',
  'Cylinder (50)',
  'Cylinder (60)',
  'Line (100)',
  'Line (50)',
  'Line (60)',
  'Line (90)',
  'Sphere (10)',
  'Sphere (100)',
  'Sphere (15)',
  'Sphere (20)',
  'Sphere (30)',
  'Sphere (360)',
  'Sphere (40)',
  'Sphere (5)',
  'Sphere (60)',
]

const RANGES = [
  'Blank',
  '1 Mile',
  '10 Feet',
  '100 Feet',
  '120 Feet',
  '150 Feet',
  '30 Feet',
  '300 Feet',
  '5 Feet',
  '500 Feet',
  '500 Miles',
  '60 Feet',
  '90 Feet',
  'Self',
  'Sight',
  'Special',
  'Touch',
  'Unlimited',
]

export const ATTRIBUTES: readonly Attribute[] = [
  { id: 'level', label: 'Level', k: 1, features: LEVELS, indexOffset: 1 },
  { id: 'school', label: 'School', k: 2, features: SCHOOLS, indexOffset: 0 },
  { id: 'damage', label: 'Damage Type', k: 3, features: DAMAGE_TYPES, indexOffset: 0 },
  { id: 'area', label: 'Area Type', k: 4, features: AREA_TYPES, indexOffset: 0 },
  { id: 'range', label: 'Range', k: 5, features: RANGES, indexOffset: 0 },
]

/**
 * The keys of the guide itself — Section 4, "Symbolic Dictionary", 2022.
 *
 * These are transcribed from the plates on pages 14 to 17 and differ from the
 * 2024 dictionary above for damage, area and range. The guide's damage list
 * carries three entries the SRD has no word for — damage, extra and
 * nonmagical — so everything from the fourth entry on sits two places later
 * than it does in the 2024 list. Its range list folds shape into range
 * ("15-feet cone"), which the 2024 one separates out.
 *
 * Level and school are the same in both.
 *
 * The guide prints no blank, numbering its features from the first symbol
 * rather than from the empty one. A blank is prepended here so a layer can be
 * left undrawn, which leaves every printed symbol on the number the plate
 * gives it.
 */

/** The undrawn layer. The guide's own lists have no such entry. */
const NOTHING = '—'

const GUIDE_SCHOOLS = [
  NOTHING,
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
]

const GUIDE_DAMAGE_TYPES = [
  NOTHING,
  'acid',
  'bludgeoning',
  'cold',
  'damage',
  'extra',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'nonmagical',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]

/**
 * Not alphabetical. The plate lays its symbols out alphabetically but numbers
 * them in another order entirely, which is the order of the author's own
 * source data; this is that order, read off the binaries beside each symbol.
 * Note that "None" here is a drawn symbol near the end of the list, not the
 * blank.
 */
const GUIDE_AREA_TYPES = [
  NOTHING,
  'Cube',
  'Line',
  'Multiple-Targets',
  'Multiple-Targets/Sphere',
  'Cone',
  'Cone/Sphere',
  'Square',
  'Circle',
  'Sphere',
  'Sphere/Cylinder',
  'Single-Target',
  'Single-Target/Cube',
  'Single-Target/Multiple-Targets',
  'Single-Target/Cone',
  'Single-Target/Sphere',
  'Single-Target/Wall',
  'Wall',
  'Cylinder',
  'None',
]

const GUIDE_RANGES = [
  NOTHING,
  '10-feet radius',
  '100-feet line',
  '15-feet cone',
  '15-feet cube',
  '15-feet radius',
  '30-feet cone',
  '30-feet line',
  '30-feet radius',
  '5-feet radius',
  '60-feet cone',
  '60-feet line',
  'Point (1 miles)',
  'Point (10 feet)',
  'Point (1000 feet)',
  'Point (120 feet)',
  'Point (150 feet)',
  'Point (30 feet)',
  'Point (300 feet)',
  'Point (5 feet)',
  'Point (500 feet)',
  'Point (60 feet)',
  'Point (90 feet)',
  'Self',
  'Sight',
  'Special',
  'Touch',
]

export const GUIDE_ATTRIBUTES: readonly Attribute[] = [
  { id: 'level', label: 'Level', k: 1, features: LEVELS, indexOffset: 1 },
  { id: 'school', label: 'School', k: 2, features: GUIDE_SCHOOLS, indexOffset: 0 },
  { id: 'damage', label: 'Damage Type', k: 3, features: GUIDE_DAMAGE_TYPES, indexOffset: 0 },
  { id: 'area', label: 'Areas', k: 4, features: GUIDE_AREA_TYPES, indexOffset: 0 },
  { id: 'range', label: 'Range', k: 5, features: GUIDE_RANGES, indexOffset: 0 },
]

export const ATTRIBUTE_BY_ID = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, a]),
) as Record<FiveEAttributeId, Attribute>

/** The 11-gon the guide recommends for these five attributes. */
export const DEFAULT_SIDES = 11

/** A chosen feature per attribute, keyed by attribute id. */
export type SpellAttributes = Record<string, string>

export const EMPTY_SPELL: SpellAttributes = {
  level: '0',
  school: 'Blank',
  damage: 'None',
  area: 'None',
  range: 'Blank',
}

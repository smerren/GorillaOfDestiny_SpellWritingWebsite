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

export interface Attribute {
  readonly id: AttributeId
  readonly label: string
  /** Which chord length this attribute is drawn with. */
  readonly k: number
  readonly features: readonly string[]
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

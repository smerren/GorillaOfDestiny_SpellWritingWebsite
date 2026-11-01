/**
 * Cyclically unique binary numbers — Section 2.1 of the Spell Writing Guide.
 *
 * Two n-bit strings that are rotations of one another would draw the same shape
 * at a different orientation, so only one member of each rotation class is kept.
 * That is what makes a rune readable without knowing which way up it was written.
 */

const cache = new Map<number, readonly string[]>()

/**
 * Every cyclically unique n-bit string, ascending.
 *
 * Index 0 is always all-zeroes, which draws nothing — the guide's dictionaries
 * use it as the "None"/"Blank" feature.
 */
export function cyclicUniques(n: number): readonly string[] {
  const hit = cache.get(n)
  if (hit) return hit

  const seen = new Set<string>()
  const out: string[] = []
  for (let v = 0; v < 2 ** n; v++) {
    const bits = v.toString(2).padStart(n, '0')
    if (seen.has(bits)) continue
    out.push(bits)
    for (let r = 0; r < n; r++) seen.add(bits.slice(r) + bits.slice(0, r))
  }

  cache.set(n, out)
  return out
}

/** How many features an n-sided base can encode per attribute. */
export function uniqueCount(n: number): number {
  return cyclicUniques(n).length
}

/**
 * The smallest base size that can carry this many attributes.
 *
 * Section 2.1 step (i): n >= 2 x attributes + 1, so that every attribute gets
 * its own k and no k exceeds n/2 (beyond which shapes repeat by rotation).
 */
export function minimumSides(attributeCount: number): number {
  return 2 * attributeCount + 1
}

/**
 * Where the nodes sit — Section 2.3.3, "Non-Polygon Bases".
 *
 * The scheme only needs n points that can be told apart and joined in order, so
 * the base is free: a regular polygon is the default, but an arc or a curve
 * works just as well and is how a caster shows their hand.
 *
 * Every base returns points in a box centred on the origin and scaled to fit a
 * unit radius, so the renderer can treat them all the same.
 */

export interface Point {
  readonly x: number
  readonly y: number
}

export type BaseId = 'polygon' | 'semicircle' | 'quarter' | 'quadratic' | 'cubic'

export interface Base {
  readonly id: BaseId
  readonly label: string
  readonly description: string
  /**
   * Whether the last node runs back round to the first. A polygon closes; an
   * arc or a curve does not, and on those the chord from the last node to the
   * first is a long line from one end to the other rather than a short step.
   * Which nodes lie "between" two endpoints depends on this.
   */
  readonly closed: boolean
  readonly place: (sides: number) => Point[]
}

/**
 * Centre on the bounding box and grow until the longer side touches the frame.
 *
 * Open curves are not centred on their own centroid, so without this the curved
 * bases would sit off to one side. Scaling both axes by the same factor keeps a
 * quarter circle circular rather than squashing it into an ellipse.
 */
function normalise(points: Point[]): Point[] {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const centred = points.map((p) => ({ x: p.x - cx, y: p.y - cy }))
  const extent = Math.max(...centred.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))))
  return extent === 0 ? centred : centred.map((p) => ({ x: p.x / extent, y: p.y / extent }))
}

/**
 * Steepness of the free-form curves. The guide gives these bases only as
 * "general form y = ax² + bx + c", so the coefficient is a matter of taste;
 * these are chosen to sit close to the proportions of Figures 2.6 and 2.9.
 */
const QUADRATIC_A = 2.2
const CUBIC_A = 1.6

/** Sample a function of x evenly across [-1, 1]. */
function sampleCurve(sides: number, f: (x: number) => number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < sides; i++) {
    const x = sides === 1 ? 0 : -1 + (2 * i) / (sides - 1)
    points.push({ x, y: -f(x) })
  }
  return normalise(points)
}

/** Sample an arc of a circle between two bearings, measured clockwise from north. */
function sampleArc(sides: number, fromDeg: number, toDeg: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i < sides; i++) {
    const t = sides === 1 ? 0 : i / (sides - 1)
    const a = ((fromDeg + (toDeg - fromDeg) * t) * Math.PI) / 180
    points.push({ x: Math.sin(a), y: -Math.cos(a) })
  }
  return normalise(points)
}

/**
 * The regular polygon of the published dictionaries.
 *
 * The half-step offset is what the Gorilla of Destiny's own plots use: with an
 * odd n it leaves two nodes straddling the top rather than one sitting on it,
 * and puts node 0 — the filled start node — just clockwise of vertical.
 */
function polygon(sides: number): Point[] {
  const step = (2 * Math.PI) / sides
  const points: Point[] = []
  for (let i = 0; i < sides; i++) {
    const a = (i + 1.5) * step
    points.push({ x: Math.sin(a), y: -Math.cos(a) })
  }
  return points
}

export const BASES: readonly Base[] = [
  {
    id: 'polygon',
    label: 'Regular polygon',
    description: 'The default of the published dictionaries.',
    closed: true,
    place: polygon,
  },
  {
    id: 'semicircle',
    label: 'Semicircle',
    description: 'Nodes along a half turn, as in Figure 2.5.',
    closed: false,
    place: (n) => sampleArc(n, -90, 90),
  },
  {
    id: 'quarter',
    label: 'Quarter circle',
    description: 'A quarter turn, as in Figures 2.7 and 2.10.',
    closed: false,
    place: (n) => sampleArc(n, 0, 90),
  },
  {
    id: 'quadratic',
    label: 'Quadratic',
    description: 'Nodes on y = ax², as in Figures 2.6 and 2.9.',
    closed: false,
    place: (n) => sampleCurve(n, (x) => QUADRATIC_A * x * x),
  },
  {
    id: 'cubic',
    label: 'Cubic',
    description: 'Nodes on y = ax³, as in Figure 2.6.',
    closed: false,
    place: (n) => sampleCurve(n, (x) => CUBIC_A * x * x * x),
  },
]

export const BASE_BY_ID = Object.fromEntries(BASES.map((b) => [b.id, b])) as Record<BaseId, Base>

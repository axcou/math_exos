/**
 * Courbe « lisse » passant par des points donnés, monotone entre deux points
 * consécutifs (interpolation d'Hermite monotone, dite PCHIP). Les points où la
 * courbe change de sens ont une tangente horizontale : on lit donc exactement
 * les extremums et les zéros sur le graphique.
 */
export type Knot = [number, number];

export function curveSlopes(k: Knot[]): number[] {
  const n = k.length;
  const h = k.slice(1).map(([x], i) => x - k[i][0]);
  const d = k.slice(1).map(([, y], i) => (y - k[i][1]) / h[i]);
  if (n === 2) return [d[0], d[0]];
  const m = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue;
    const w1 = 2 * h[i] + h[i - 1];
    const w2 = h[i] + 2 * h[i - 1];
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  const end = (h0: number, h1: number, d0: number, d1: number) => {
    const s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
    if (Math.sign(s) !== Math.sign(d0)) return 0;
    if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > 3 * Math.abs(d0)) return 3 * d0;
    return s;
  };
  m[0] = end(h[0], h[1], d[0], d[1]);
  m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  return m;
}

function segment(k: Knot[], x: number) {
  let i = 0;
  while (i < k.length - 2 && x > k[i + 1][0]) i++;
  const [x0, y0] = k[i];
  const [x1, y1] = k[i + 1];
  const h = x1 - x0;
  return { i, y0, y1, h, t: (x - x0) / h };
}

/** Valeur de la courbe en x (x dans l'intervalle des points). */
export function evalCurve(k: Knot[], x: number, slopes = curveSlopes(k)): number {
  const { i, y0, y1, h, t } = segment(k, x);
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * slopes[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * slopes[i + 1];
}

/** Nombre dérivé de la courbe en x (exact : nul aux sommets). */
export function evalCurveDerivative(k: Knot[], x: number, slopes = curveSlopes(k)): number {
  const { i, y0, y1, h, t } = segment(k, x);
  const t2 = t * t;
  return ((6 * t2 - 6 * t) * (y0 - y1)) / h + (3 * t2 - 4 * t + 1) * slopes[i] + (3 * t2 - 2 * t) * slopes[i + 1];
}

type Asymptote = { p: number; m: number; k: number; lin: 0 | 1; s: 1 | -1 };
type Graph = { knots: Knot[]; asymptote?: Asymptote };

/** Valeur de f en x pour une courbe donnée (±Infinity sur l'asymptote). */
export function evalGraph(g: Graph, x: number): number {
  const h = g.asymptote;
  if (!h) return evalCurve(g.knots, x);
  const t = x - h.p;
  return h.s * (h.lin * t + h.m / t) + h.k;
}

export function evalGraphDerivative(g: Graph, x: number): number {
  const h = g.asymptote;
  if (!h) return evalCurveDerivative(g.knots, x);
  const t = x - h.p;
  return h.s * (h.lin - h.m / (t * t));
}

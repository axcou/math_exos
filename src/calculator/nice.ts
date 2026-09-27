import * as Q from '../core/expr/rational';

/** Fraction p/q (q ≤ maxDen) égale à v à 1e-9 près, sinon null. */
export function asRational(v: number, maxDen = 1000): Q.Rational | null {
  if (!Number.isFinite(v)) return null;
  const tol = 1e-9 * Math.max(1, Math.abs(v));
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(v - n / d) < tol && Math.abs(n) < 1e9) return Q.rat(n, d);
  }
  return null;
}

/** √(p/q) simplifié : k√m / q'. */
function sqrtLatex(r: Q.Rational): string {
  // √(p/q) = √(p·q) / q
  let m = r.n * r.d;
  let k = 1;
  for (let f = 2; f * f <= m; f++) {
    while (m % (f * f) === 0) {
      m /= f * f;
      k *= f;
    }
  }
  const g = Q.rat(k, r.d);
  const root = m === 1 ? '' : `\\sqrt{${m}}`;
  if (g.d === 1) return `${g.n === 1 && root ? '' : g.n}${root}`;
  return `\\frac{${g.n === 1 && root ? '' : g.n}${root}}{${g.d}}`;
}

export interface NiceNumber {
  latex: string;
  exact: boolean;
}

/** Écriture lisible d'un nombre : fraction, racine, puissance de e, logarithme, multiple de π, sinon valeur approchée. */
export function nice(v: number): NiceNumber {
  if (Number.isNaN(v)) return { latex: '?', exact: false };
  if (!Number.isFinite(v)) return { latex: v > 0 ? '+\\infty' : '-\\infty', exact: true };
  const r = asRational(v);
  if (r) return { latex: Q.toLatex(r), exact: true };
  const sign = v < 0 ? '-' : '';
  const r2 = asRational(v * v, 400);
  if (r2 && r2.n > 0) return { latex: sign + sqrtLatex(r2), exact: true };
  if (v > 0) {
    const l = asRational(Math.log(v), 12);
    if (l && !Q.isZero(l)) return { latex: Q.eq(l, Q.ONE) ? '\\mathrm{e}' : `\\mathrm{e}^{${Q.toLatex(l)}}`, exact: true };
  }
  const ev = Math.exp(Math.abs(v));
  const lr = asRational(ev, 12);
  if (lr && lr.n < 10000 && !Q.eq(lr, Q.ONE)) return { latex: `${sign}\\ln${lr.d === 1 ? `(${lr.n})` : `\\left(${Q.toLatex(lr)}\\right)`}`, exact: true };
  const p = asRational(v / Math.PI, 12);
  if (p) return { latex: Q.eq(p, Q.ONE) ? '\\pi' : Q.eq(p, Q.rat(-1)) ? '-\\pi' : `${Q.toLatex(p)}\\pi`, exact: true };
  return { latex: String(Number(v.toPrecision(6))), exact: false };
}

export const niceLatex = (v: number) => {
  const n = nice(v);
  return n.exact ? n.latex : `\\approx ${n.latex}`;
};

/** Expression exacte correspondant à nice(v), ou null. */
export function niceExpr(v: number): import('../core/expr/ast').Expr | null {
  if (!Number.isFinite(v)) return null;
  const numE = (r: Q.Rational) => ({ type: 'num', value: r }) as const;
  const r = asRational(v);
  if (r) return numE(r);
  const sign = v < 0 ? -1 : 1;
  const r2 = asRational(v * v, 400);
  if (r2 && r2.n > 0) {
    const s = { type: 'fn', name: 'sqrt', arg: numE(r2) } as const;
    return sign < 0 ? { type: 'mul', factors: [numE(Q.rat(-1)), s] } : s;
  }
  if (v > 0) {
    const l = asRational(Math.log(v), 12);
    if (l && !Q.isZero(l)) return { type: 'fn', name: 'exp', arg: numE(l) };
  }
  const lr = asRational(Math.exp(Math.abs(v)), 12);
  if (lr && lr.n < 10000 && !Q.eq(lr, Q.ONE)) {
    const l = { type: 'fn', name: 'ln', arg: numE(lr) } as const;
    return sign < 0 ? { type: 'mul', factors: [numE(Q.rat(-1)), l] } : l;
  }
  return null;
}

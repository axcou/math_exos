import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { solveDerivative } from '../src/calculator/derivativeSolver';
import { derive } from '../src/core/expr/derive';
import { evaluate } from '../src/core/expr/evaluate';
import { parse, ParseError } from '../src/core/expr/parse';
import { Poly } from '../src/core/expr/poly';
import * as Q from '../src/core/expr/rational';
import { tidy } from '../src/core/expr/simplify';
import { toLatex } from '../src/core/expr/toLatex';
import { toText } from '../src/core/expr/toText';
import { Rng } from '../src/core/random/prng';
import { POSITIVE_POINTS, randomExprs } from './helpers/randomExpr';

/*
 * Tests par propriétés : des centaines d'expressions aléatoires doivent
 * vérifier des invariants (réécriture sans changer la valeur, dérivée
 * correcte, affichage valide…).
 */

const close = (a: number, b: number, tol = 1e-7) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

let compared = 0;
let skipped = 0;

function sameValues(a: (x: number) => number, b: (x: number) => number, tol = 1e-7): boolean {
  let here = 0;
  for (const x of POSITIVE_POINTS) {
    const va = a(x);
    const vb = b(x);
    if (!Number.isFinite(va) || !Number.isFinite(vb) || Math.abs(va) > 1e8) continue;
    here++;
    if (!close(va, vb, tol)) return false;
  }
  if (here) compared++;
  else skipped++;
  return true;
}

const N = 400;

describe('expressions aléatoires', () => {
  it('toText → parse redonne la même fonction', () => {
    for (const e of randomExprs(N, 11)) {
      const back = parse(toText(e));
      expect(sameValues((x) => evaluate(e, x), (x) => evaluate(back, x)), toText(e)).toBe(true);
    }
  });

  it('toLatex produit du LaTeX valide', () => {
    for (const e of randomExprs(N, 12)) katex.renderToString(toLatex(e), { throwOnError: true });
  });

  it('tidy ne change jamais la valeur', () => {
    for (const e of randomExprs(N, 13)) {
      const t = tidy(e);
      expect(sameValues((x) => evaluate(e, x), (x) => evaluate(t, x), 1e-6), `${toText(e)}  →  ${toText(t)}`).toBe(true);
    }
  });

  it('tidy est idempotent (même valeur à la 2e application)', () => {
    for (const e of randomExprs(200, 14)) {
      const t1 = tidy(e);
      const t2 = tidy(t1);
      expect(sameValues((x) => evaluate(t1, x), (x) => evaluate(t2, x), 1e-6)).toBe(true);
    }
  });

  it('derive coïncide avec la dérivée numérique', () => {
    const h = 1e-5;
    for (const e of randomExprs(N, 15)) {
      const d = derive(e);
      for (const x of POSITIVE_POINTS) {
        const f = (t: number) => evaluate(e, t);
        const num = (f(x + h) - f(x - h)) / (2 * h);
        const v = evaluate(d, x);
        if (!Number.isFinite(num) || !Number.isFinite(v) || Math.abs(v) > 1e5) continue;
        expect(close(num, v, 1e-4), `${toText(e)} en ${x}`).toBe(true);
      }
    }
  });

  it('le calculateur de dérivées donne une dérivée juste et un corrigé affichable', () => {
    for (const e of randomExprs(150, 16, 2)) {
      const r = solveDerivative(e);
      expect(r.checked).toBe(true);
      const raw = derive(e);
      expect(sameValues((x) => evaluate(r.df, x), (x) => evaluate(raw, x), 1e-6), toText(e)).toBe(true);
      for (const s of r.steps) if (s.math) katex.renderToString(s.math, { throwOnError: true, displayMode: true });
    }
  });

  it('parse ne lève que des ParseError sur des saisies quelconques', () => {
    const rng = new Rng(17);
    const alphabet = 'x0123456789+-*/^()., elnsqrtpi√²';
    for (let i = 0; i < 2000; i++) {
      const len = rng.int(0, 14);
      const s = Array.from({ length: len }, () => alphabet[rng.int(0, alphabet.length - 1)]).join('');
      try {
        parse(s);
      } catch (err) {
        expect(err, s).toBeInstanceOf(ParseError);
      }
    }
  });
});

describe('couverture des tests par propriétés', () => {
  it('la grande majorité des expressions a bien été comparée', () => {
    expect(compared).toBeGreaterThan(10 * skipped);
  });
});

describe('fractions exactes', () => {
  it('les opérations coïncident avec les flottants', () => {
    const rng = new Rng(21);
    for (let i = 0; i < 2000; i++) {
      const a = Q.rat(rng.int(-50, 50), rng.nonZero(1, 30));
      const b = Q.rat(rng.nonZero(-50, 50), rng.nonZero(1, 30));
      const [x, y] = [Q.toNumber(a), Q.toNumber(b)];
      expect(Q.toNumber(Q.add(a, b))).toBeCloseTo(x + y, 12);
      expect(Q.toNumber(Q.sub(a, b))).toBeCloseTo(x - y, 12);
      expect(Q.toNumber(Q.mul(a, b))).toBeCloseTo(x * y, 12);
      expect(Q.toNumber(Q.div(a, b))).toBeCloseTo(x / y, 12);
      // toujours irréductible, dénominateur positif
      const s = Q.add(a, b);
      expect(s.d).toBeGreaterThan(0);
    }
  });
});

describe('polynômes', () => {
  const rng = new Rng(31);
  const randPoly = () => new Poly(Array.from({ length: rng.int(1, 5) }, () => rng.int(-6, 6)));

  it('somme, produit et dérivée', () => {
    for (let i = 0; i < 500; i++) {
      const p = randPoly();
      const q = randPoly();
      const x = rng.int(-30, 30) / 7;
      expect(p.add(q).eval(x)).toBeCloseTo(p.eval(x) + q.eval(x), 8);
      expect(p.mul(q).eval(x)).toBeCloseTo(p.eval(x) * q.eval(x), 6);
      const h = 1e-5;
      expect(p.derive().eval(x)).toBeCloseTo((p.eval(x + h) - p.eval(x - h)) / (2 * h), 3);
      expect(evaluate(p.toExpr(), x)).toBeCloseTo(p.eval(x), 8);
    }
  });

  it('fromRoots s’annule en ses racines', () => {
    for (let i = 0; i < 300; i++) {
      const roots = Array.from({ length: rng.int(1, 4) }, () => rng.int(-6, 6));
      const p = Poly.fromRoots(rng.nonZero(-4, 4), roots);
      for (const r of roots) expect(Q.isZero(p.evalQ(Q.rat(r)))).toBe(true);
      expect(p.degree).toBe(roots.length);
    }
  });
});

describe('générateur pseudo-aléatoire', () => {
  it('int reste dans les bornes et couvre toutes les valeurs', () => {
    const rng = new Rng(41);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = rng.int(-3, 3);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect(seen.size).toBe(7);
  });

  it('nonZero et intExcept respectent les exclusions', () => {
    const rng = new Rng(42);
    for (let i = 0; i < 2000; i++) {
      expect(rng.nonZero(-2, 2)).not.toBe(0);
      expect([1, 2]).not.toContain(rng.intExcept(0, 4, [1, 2]));
    }
  });

  it('shuffle est une permutation', () => {
    const rng = new Rng(43);
    const a = Array.from({ length: 30 }, (_, i) => i);
    const s = rng.shuffle(a);
    expect([...s].sort((u, v) => u - v)).toEqual(a);
    expect(s).not.toEqual(a);
  });

  it('distribution à peu près uniforme', () => {
    const rng = new Rng(44);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 40000; i++) counts[rng.int(0, 3)]++;
    for (const c of counts) expect(Math.abs(c - 10000)).toBeLessThan(500);
  });
});

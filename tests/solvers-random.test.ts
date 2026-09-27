import { describe, expect, it } from 'vitest';
import { nice, niceExpr } from '../src/calculator/nice';
import { solveLimit } from '../src/calculator/limitSolver';
import { solveSign } from '../src/calculator/signSolver';
import { solveVariations } from '../src/calculator/variationSolver';
import { evaluate } from '../src/core/expr/evaluate';
import { parse } from '../src/core/expr/parse';
import { Poly } from '../src/core/expr/poly';
import * as Q from '../src/core/expr/rational';
import { toText } from '../src/core/expr/toText';
import { div, mul, num } from '../src/core/expr/build';
import { Rng } from '../src/core/random/prng';

const rng = new Rng(2026);

describe('limites de fractions rationnelles aléatoires en l’infini', () => {
  it.each(Array.from({ length: 60 }, (_, i) => i))('cas %i', () => {
    const p = new Poly(Array.from({ length: rng.int(1, 4) }, () => rng.int(-5, 5)).concat(rng.nonZero(-5, 5)));
    const q = new Poly(Array.from({ length: rng.int(1, 4) }, () => rng.int(-5, 5)).concat(rng.nonZero(-5, 5)));
    const at = rng.pick(['+inf', '-inf'] as const);
    const f = div(p.toExpr(), q.toExpr());
    const r = solveLimit(f, { at, side: 0 });
    const k = p.degree - q.degree;
    const ratio = Q.toNumber(p.lead) / Q.toNumber(q.lead);
    if (k < 0) expect(r.value).toMatchObject({ k: 'fin', v: 0 });
    else if (k === 0) {
      expect(r.value.k).toBe('fin');
      if (r.value.k === 'fin') expect(r.value.v).toBeCloseTo(ratio, 12);
    } else {
      const sign = Math.sign(ratio) * (at === '-inf' && k % 2 ? -1 : 1);
      expect(r.value, toText(f)).toMatchObject({ k: 'inf', s: sign });
    }
    expect(r.warning).toBeUndefined();
  });
});

describe('limites en une valeur interdite', () => {
  it.each(Array.from({ length: 40 }, (_, i) => i))('cas %i', () => {
    const c = rng.int(-6, 6);
    const a = rng.nonZero(-5, 5);
    let b = rng.int(-6, 6);
    if (a * c + b === 0) b++;
    const f = div(new Poly([b, a]).toExpr(), new Poly([-c, 1]).toExpr());
    const right = solveLimit(f, { at: c, side: 1 });
    const left = solveLimit(f, { at: c, side: -1 });
    const both = solveLimit(f, { at: c, side: 0 });
    const s = Math.sign(a * c + b);
    expect(right.value).toMatchObject({ k: 'inf', s });
    expect(left.value).toMatchObject({ k: 'inf', s: -s });
    expect(both.value.k).toBe('none');
  });
});

describe('formes 0/0 par factorisation', () => {
  it.each(Array.from({ length: 40 }, (_, i) => i))('cas %i', () => {
    const a = rng.int(-5, 5);
    const r1 = rng.intExcept(-5, 5, [a]);
    const r2 = rng.intExcept(-5, 5, [a]);
    const k = rng.nonZero(-3, 3);
    const f = div(Poly.fromRoots(k, [a, r1]).toExpr(), Poly.fromRoots(1, [a, r2]).toExpr());
    const r = solveLimit(f, { at: a, side: 0 });
    expect(r.value.k).toBe('fin');
    if (r.value.k === 'fin') expect(r.value.v).toBeCloseTo((k * (a - r1)) / (a - r2), 10);
    expect(JSON.stringify(r.sections)).toMatch(/Factoriser/);
  });
});

describe('tableaux de signes de polynômes à racines entières', () => {
  it.each(Array.from({ length: 50 }, (_, i) => i))('cas %i', () => {
    const n = rng.int(1, 3);
    const roots = [...new Set(Array.from({ length: n }, () => rng.int(-6, 6)))].sort((u, v) => u - v);
    const lead = rng.nonZero(-3, 3);
    const p = Poly.fromRoots(lead, roots);
    const r = solveSign(p.toExpr());
    expect(r.xs.slice(1, -1).map((x) => x.v)).toEqual(roots);
    for (let i = 0; i < r.signs.length; i++) {
      const a = r.xs[i].v;
      const b = r.xs[i + 1].v;
      const m = a === -Infinity ? b - 1 : b === Infinity ? a + 1 : (a + b) / 2;
      expect(r.signs[i]).toBe(p.eval(m) > 0 ? '+' : '-');
    }
    expect(r.marks.slice(1, -1).every((m) => m === '0')).toBe(true);
  });
});

describe('variations de polynômes de degré 3 aléatoires', () => {
  it.each(Array.from({ length: 30 }, (_, i) => i))('cas %i', () => {
    const x1 = rng.int(-4, 2);
    const x2 = rng.int(x1 + 1, 4);
    const k = rng.pick([-3, 3, -6, 6]);
    // f' = k(x − x1)(x − x2)
    const df = Poly.fromRoots(k, [x1, x2]);
    const f = new Poly([rng.int(-4, 4), ...df.c.map((c, i) => Q.div(c, Q.rat(i + 1)))]);
    const r = solveVariations(f.toExpr());
    const row = r.table!.rows.at(-1)!;
    if (row.kind !== 'variation') throw new Error();
    expect(r.table!.xv.slice(1, -1)).toEqual([x1, x2]);
    expect(row.arrows).toEqual(k > 0 ? ['up', 'down', 'up'] : ['down', 'up', 'down']);
    // extremums exacts
    expect(row.values[1]).toBe(Q.toLatex(f.evalQ(Q.rat(x1))));
    expect(row.values[2]).toBe(Q.toLatex(f.evalQ(Q.rat(x2))));
  });
});

describe('nice : reconnaissance des valeurs exactes', () => {
  it.each([
    [0.75, '\\frac{3}{4}'],
    [-2, '-2'],
    [Math.SQRT2, '\\sqrt{2}'],
    [Math.SQRT1_2, '\\frac{\\sqrt{2}}{2}'],
    [2 * Math.sqrt(3), '2\\sqrt{3}'],
    [Math.E, '\\mathrm{e}'],
    [Math.E ** 2, '\\mathrm{e}^{2}'],
    [Math.exp(-1), '\\mathrm{e}^{-1}'],
    [Math.log(2), '\\ln(2)'],
    [-Math.log(3), '-\\ln(3)'],
    [Math.PI, '\\pi'],
    [Math.PI / 2, '\\frac{1}{2}\\pi'],
  ])('%f → %s', (v, latex) => {
    expect(nice(v)).toEqual({ latex, exact: true });
    const e = niceExpr(v);
    if (e) expect(evaluate(e, 0)).toBeCloseTo(v, 12);
  });

  it('valeur quelconque : approchée', () => {
    expect(nice(1.23456789123).exact).toBe(false);
  });
});

describe('robustesse des calculateurs', () => {
  it('ne plantent jamais sur des fonctions variées', () => {
    const fs = ['x', '1', 'x^5 - x', '1/(x^2+1)', 'e^(-x^2)', 'ln(x^2+1)', 'sqrt(x^2+1) - x', 'x^x', 'e^x/(e^x+1)', '(x-1)^3', '1/x - 1/(x+1)', 'ln(ln(x))'];
    for (const s of fs) {
      const f = parse(s);
      for (const at of ['+inf', '-inf', 0, 1] as const) {
        for (const side of [0, 1, -1] as const) {
          if (typeof at !== 'number' && side !== 0) continue;
          expect(() => solveLimit(f, { at, side })).not.toThrow();
        }
      }
      expect(() => solveSign(f)).not.toThrow();
      expect(() => solveVariations(f)).not.toThrow();
    }
  });

  it('un produit k·f garde les mêmes racines', () => {
    const f = parse('(x-1)(x+2)');
    const g = mul(num(-3), f);
    expect(solveSign(g).xs.map((x) => x.v)).toEqual(solveSign(f).xs.map((x) => x.v));
    expect(solveSign(g).signs).toEqual(solveSign(f).signs.map((s) => (s === '+' ? '-' : '+')));
  });
});

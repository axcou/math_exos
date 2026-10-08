import { describe, expect, it } from 'vitest';
import { conclusion, LAW_BY_ID, LAWS, plotRange, quantile, solvePValue, type Tail, validate } from '../src/calculator/pvalueSolver';
import { chi2Pdf, fPdf, normalPdf, studentCdf, studentPdf } from '../src/core/stats/distributions';
import { Rng } from '../src/core/random/prng';

const law = (id: 'normal' | 'student' | 'chi2' | 'fisher') => LAW_BY_ID.get(id)!;

describe('loi de Student', () => {
  it('t(1) est la loi de Cauchy', () => {
    for (const t of [-3, -0.5, 0, 1, 4]) expect(studentCdf(t, 1)).toBeCloseTo(0.5 + Math.atan(t) / Math.PI, 12);
  });

  it('quantiles de la table', () => {
    expect(quantile(law('student'), [10], 0.975)).toBeCloseTo(2.228138851986, 8);
    expect(quantile(law('student'), [4], 0.95)).toBeCloseTo(2.131846786, 8);
    expect(quantile(law('student'), [30], 0.995)).toBeCloseTo(2.749995653, 7);
  });

  it('symétrique, et proche de N(0,1) pour un grand ν', () => {
    for (const t of [0.3, 1.2, 2.5]) expect(studentCdf(-t, 7) + studentCdf(t, 7)).toBeCloseTo(1, 12);
    expect(studentCdf(1.96, 1e5)).toBeCloseTo(0.975, 4);
  });
});

describe('densités', () => {
  const cases: [string, (x: number) => number, number, number][] = [
    ['N(0,1)', (x) => normalPdf(x), -12, 12],
    ['N(3, 2²)', (x) => normalPdf(x, 3, 2), -25, 31],
    ['t(5)', (x) => studentPdf(x, 5), -400, 400],
    ['χ²(4)', (x) => chi2Pdf(x, 4), 0, 80],
    ['χ²(12)', (x) => chi2Pdf(x, 12), 0, 120],
    ['F(3, 20)', (x) => fPdf(x, 3, 20), 0, 200],
  ];
  it.each(cases)('%s : aire totale 1', (_, f, a, b) => {
    const n = 40000;
    const h = (b - a) / n;
    let s = 0;
    for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 0.5 : 1) * f(a + i * h);
    expect(s * h).toBeCloseTo(1, 3);
  });

  it('la densité est la dérivée de la fonction de répartition', () => {
    const configs: [string, number[], number[]][] = [
      ['normal', [1, 2], [-2, 0.5, 3]],
      ['student', [6], [-1.5, 0, 2.2]],
      ['chi2', [3], [0.5, 2, 7]],
      ['fisher', [4, 15], [0.3, 1, 3]],
    ];
    for (const [id, p, xs] of configs) {
      const l = law(id as 'normal');
      for (const x of xs) {
        const h = 1e-5;
        expect((l.cdf(x + h, p) - l.cdf(x - h, p)) / (2 * h), `${id} en ${x}`).toBeCloseTo(l.pdf(x, p), 5);
      }
    }
  });

  it('cas particuliers en 0 : χ²(2) et F(2, d) finies, χ²(1) infinie, nulles avant 0', () => {
    expect(chi2Pdf(0, 2)).toBe(0.5);
    expect(chi2Pdf(0, 1)).toBe(Infinity);
    expect(chi2Pdf(0, 4)).toBe(0);
    expect(fPdf(0, 2, 9)).toBe(1);
    expect(chi2Pdf(-1, 3)).toBe(0);
    expect(fPdf(-1, 3, 4)).toBe(0);
  });
});

describe('quantiles', () => {
  it('inverse de la fonction de répartition, pour chaque loi et chaque ordre', () => {
    const params: Record<string, number[]> = { normal: [-1, 0.5], student: [3], chi2: [7], fisher: [5, 12] };
    for (const l of LAWS) {
      for (const p of [0.001, 0.025, 0.1, 0.5, 0.9, 0.95, 0.999]) expect(l.cdf(quantile(l, params[l.id], p), params[l.id]), `${l.id} ${p}`).toBeCloseTo(p, 9);
    }
  });
});

describe('p-valeur et seuils de rejet', () => {
  it('dé du TD : χ²(5), T = 11,24, unilatéral à droite', () => {
    const r = solvePValue({ law: 'chi2', params: [5], alpha: 0.05, tail: 'right', x: 11.24 });
    expect(r.pValue).toBeCloseTo(0.04683, 4);
    expect(r.critical).toHaveLength(1);
    expect(r.critical[0]).toBeCloseTo(11.0705, 3);
    expect(r.orders).toEqual([0.95]);
    expect(r.reject).toBe(true);
    expect(r.regionLatex).toContain('+\\infty');
    expect(r.rCode).toContain('1 - pchisq(11.24, 5)');
    expect(r.rCode).toContain('qchisq(0.95, 5)');
    expect(solvePValue({ law: 'chi2', params: [5], alpha: 0.01, tail: 'right', x: 11.24 }).reject).toBe(false);
  });

  it('zona du TD : N(0,1), z = 1,644, bilatéral', () => {
    const r = solvePValue({ law: 'normal', params: [0, 1], alpha: 0.1, tail: 'two', x: 1.644 });
    expect(r.pValue).toBeCloseTo(0.1002, 3);
    expect(r.critical[0]).toBeCloseTo(-1.6449, 3);
    expect(r.critical[1]).toBeCloseTo(1.6449, 3);
    expect(r.orders).toEqual([0.05, 0.95]);
    expect(r.reject).toBe(false);
    expect(r.pLatex).toContain('|1{,}644|');
    expect(r.rCode).toContain('qnorm(0.05)');
    // bilatéral : même p-valeur pour −z
    expect(solvePValue({ law: 'normal', params: [0, 1], alpha: 0.1, tail: 'two', x: -1.644 }).pValue).toBeCloseTo(r.pValue!, 12);
  });

  it('engrais du TD : F(2, 9), F = 10,4', () => {
    const r = solvePValue({ law: 'fisher', params: [2, 9], alpha: 0.05, tail: 'right', x: 10.4 });
    // pour d1 = 2 : P(F > f) = (1 + 2f/d2)^(-d2/2)
    expect(r.pValue).toBeCloseTo((1 + (2 * 10.4) / 9) ** -4.5, 12);
    expect(r.critical[0]).toBeCloseTo(4.2565, 3);
    expect(r.rCode).toContain('1 - pf(10.4, 2, 9)');
  });

  it('Student unilatéral à gauche', () => {
    const r = solvePValue({ law: 'student', params: [10], alpha: 0.05, tail: 'left', x: -2.5 });
    expect(r.pValue).toBeCloseTo(studentCdf(-2.5, 10), 12);
    expect(r.critical[0]).toBeCloseTo(-1.8125, 3);
    expect(r.reject).toBe(true);
    expect(r.regionLatex).toContain('-\\infty');
  });

  it('bilatéral pour une loi non symétrique : deux fois la plus petite queue', () => {
    const l = law('chi2');
    const r = solvePValue({ law: 'chi2', params: [8], alpha: 0.05, tail: 'two', x: 2 });
    expect(r.pValue).toBeCloseTo(2 * l.cdf(2, [8]), 12);
    expect(r.critical[0]).toBeCloseTo(2.1797, 3);
    expect(r.critical[1]).toBeCloseTo(17.5345, 3);
    expect(r.reject).toBe(true);
    expect(r.pLatex).toContain('\\min');
  });

  it('loi normale non centrée réduite : paramètres dans R et la notation', () => {
    const r = solvePValue({ law: 'normal', params: [10, 2], alpha: 0.05, tail: 'right', x: 13 });
    expect(r.pValue).toBeCloseTo(0.0668072, 6);
    expect(r.lawLatex).toBe('\\mathcal{N}(10,\\, 2^2)');
    expect(r.rCode).toContain('pnorm(13, 10, 2)');
  });

  it('sans valeur observée : seulement les seuils', () => {
    const r = solvePValue({ law: 'chi2', params: [3], alpha: 0.01, tail: 'right' });
    expect(r.pValue).toBeUndefined();
    expect(r.reject).toBeUndefined();
    expect(r.critical[0]).toBeCloseTo(11.3449, 3);
    expect(r.rCode).not.toContain('p-valeur');
    expect(conclusion(r)).toContain('région de rejet');
  });

  it('propriété : on rejette exactement quand la valeur observée est dans la région de rejet', () => {
    const rng = new Rng(2024);
    const tails: Tail[] = ['left', 'right', 'two'];
    for (let i = 0; i < 3000; i++) {
      const l = rng.pick(LAWS);
      const params = l.id === 'normal' ? [rng.int(-5, 5), rng.int(1, 4)] : l.params.map(() => rng.int(1, 30));
      const alpha = rng.pick([0.1, 0.05, 0.01, 0.2]);
      const tail = rng.pick(tails);
      const x = quantile(l, params, 0.0005 + 0.999 * rng.next());
      const r = solvePValue({ law: l.id, params, alpha, tail, x });
      expect(r.pValue!).toBeGreaterThanOrEqual(0);
      expect(r.pValue!).toBeLessThanOrEqual(1);
      const c = r.critical;
      const inRegion = tail === 'right' ? x >= c[0] : tail === 'left' ? x <= c[0] : x <= c[0] || x >= c[1];
      // hors de la frontière exacte (à 1e-6 près)
      if (c.every((v) => Math.abs(v - x) > 1e-6)) expect(r.reject, `${l.id}(${params}) ${tail} α=${alpha} x=${x}`).toBe(inRegion);
    }
  });
});

describe('saisie et affichage', () => {
  it('paramètres invalides : message clair', () => {
    expect(validate({ law: 'normal', params: [0, 0], alpha: 0.05, tail: 'two' })).toMatch(/strictement positif/);
    expect(validate({ law: 'chi2', params: [2.5], alpha: 0.05, tail: 'right' })).toMatch(/entier/);
    expect(validate({ law: 'fisher', params: [2, Number.NaN], alpha: 0.05, tail: 'right' })).toMatch(/manquant/);
    expect(validate({ law: 'student', params: [5], alpha: 0, tail: 'two' })).toMatch(/entre 0 et 1/);
    expect(validate({ law: 'student', params: [5], alpha: 1.5, tail: 'two' })).toMatch(/entre 0 et 1/);
    expect(validate({ law: 'student', params: [5], alpha: 0.05, tail: 'two', x: Number.NaN })).toMatch(/nombre/);
    expect(validate({ law: 'chi2', params: [5], alpha: 0.05, tail: 'right', x: 3 })).toBeNull();
  });

  it('fenêtre du graphique : contient les seuils et la valeur observée, commence à 0 pour χ² et Fisher', () => {
    const r = solvePValue({ law: 'chi2', params: [5], alpha: 0.05, tail: 'right', x: 11.24 });
    const [lo, hi] = plotRange(r);
    expect(lo).toBe(0);
    expect(hi).toBeGreaterThan(Math.max(r.critical[0], 11.24));
    const n = solvePValue({ law: 'normal', params: [0, 1], alpha: 0.05, tail: 'two', x: -3.5 });
    const [a, b] = plotRange(n);
    expect(a).toBeLessThan(-3.5);
    expect(b).toBeGreaterThan(n.critical[1]);
    // valeur extrême : la courbe reste lisible (la valeur est signalée au bord)
    const far = solvePValue({ law: 'normal', params: [0, 1], alpha: 0.05, tail: 'two', x: 80 });
    expect(plotRange(far)[1]).toBeLessThan(15);
  });
});

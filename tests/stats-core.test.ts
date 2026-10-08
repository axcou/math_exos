import { describe, expect, it } from 'vitest';
import {
  betaI,
  chi2Cdf,
  chi2Quantile,
  chi2Sf,
  fQuantile,
  fSf,
  gammaP,
  gammaQ,
  lnGamma,
  normalCdf,
  normalQuantile,
  normalSf,
  poissonCdf,
  poissonPmf,
} from '../src/core/stats/distributions';
import { anova, contingency, goodnessOfFit, groupedMoments, twoProportions } from '../src/core/stats/hypothesisTests';
import { sampleBinomial, sampleCounts, sampleNormal, samplePoisson } from '../src/core/stats/sampling';
import { Rng } from '../src/core/random/prng';

describe('fonctions spéciales', () => {
  it('ln Γ sur des valeurs connues', () => {
    expect(lnGamma(1)).toBeCloseTo(0, 12);
    expect(lnGamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(lnGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
    expect(lnGamma(10.5)).toBeCloseTo(13.940625219403763, 10);
  });

  it('gamma incomplète : P + Q = 1 et cas exponentiel', () => {
    for (const [a, x] of [[0.5, 0.3], [2, 1], [3.5, 7], [10, 4], [25, 30]]) {
      expect(gammaP(a, x) + gammaQ(a, x)).toBeCloseTo(1, 12);
    }
    // a = 1 : P(1, x) = 1 − e^{−x}
    for (const x of [0.1, 1, 5]) expect(gammaP(1, x)).toBeCloseTo(1 - Math.exp(-x), 12);
  });

  it('bêta incomplète : symétrie et cas uniforme', () => {
    for (const [a, b, x] of [[2, 3, 0.4], [0.5, 4.5, 0.2], [6, 2, 0.9]]) {
      expect(betaI(a, b, x) + betaI(b, a, 1 - x)).toBeCloseTo(1, 12);
    }
    expect(betaI(1, 1, 0.37)).toBeCloseTo(0.37, 12);
  });
});

describe('loi normale', () => {
  it('valeurs de la table', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 14);
    expect(normalCdf(1.96)).toBeCloseTo(0.9750021048517795, 10);
    expect(normalCdf(-1.645)).toBeCloseTo(0.04998490553912138, 10);
    expect(normalCdf(1)).toBeCloseTo(0.8413447460685429, 10);
    // donnée du TD : P(X < 1,644) ≃ 0,9499
    expect(normalCdf(1.644)).toBeCloseTo(0.9499, 4);
    expect(normalSf(3)).toBeCloseTo(0.0013498980316301, 12);
  });

  it('quantiles', () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.959963984540054, 8);
    expect(normalQuantile(0.95)).toBeCloseTo(1.6448536269514722, 8);
    expect(normalQuantile(0.5)).toBeCloseTo(0, 10);
  });
});

describe('lois du χ² et de Fisher', () => {
  it('valeurs critiques usuelles', () => {
    expect(chi2Quantile(0.95, 1)).toBeCloseTo(3.841458820694124, 6);
    expect(chi2Quantile(0.95, 5)).toBeCloseTo(11.070497693516351, 6);
    expect(chi2Quantile(0.99, 5)).toBeCloseTo(15.08627246938899, 6);
    expect(chi2Quantile(0.95, 3)).toBeCloseTo(7.814727903251178, 6);
    expect(fQuantile(0.95, 2, 9)).toBeCloseTo(4.256494729093748, 5);
    expect(fQuantile(0.95, 3, 20)).toBeCloseTo(3.0983912121407795, 5);
  });

  it('p-valeurs', () => {
    expect(chi2Sf(3.841458820694124, 1)).toBeCloseTo(0.05, 10);
    expect(chi2Sf(11.24, 5)).toBeCloseTo(0.04683, 4);
    expect(chi2Cdf(2, 2)).toBeCloseTo(1 - Math.exp(-1), 12);
    expect(fSf(4.256494729093748, 2, 9)).toBeCloseTo(0.05, 8);
    expect(fSf(0, 2, 9)).toBe(1);
  });

  it('χ²(1) est le carré d’une N(0,1)', () => {
    for (const z of [0.5, 1.2, 2.3]) expect(chi2Sf(z * z, 1)).toBeCloseTo(2 * normalSf(z), 10);
  });
});

describe('loi de Poisson', () => {
  it('probabilités et somme', () => {
    expect(poissonPmf(0, 2)).toBeCloseTo(Math.exp(-2), 14);
    expect(poissonPmf(3, 2)).toBeCloseTo((8 * Math.exp(-2)) / 6, 14);
    expect(poissonCdf(60, 3.5)).toBeCloseTo(1, 12);
    expect(poissonPmf(-1, 2)).toBe(0);
  });
});

describe('tests du TD', () => {
  it('zona : statistique ≃ 1,644 et p-valeur bilatérale ≃ 0,100', () => {
    const t = twoProportions(20, 100, 30, 100);
    expect(t.diff).toBeCloseTo(0.1, 12);
    expect(t.se).toBeCloseTo(Math.sqrt(0.0037), 12);
    expect(t.z).toBeCloseTo(1.644, 3);
    expect(t.pBilateral).toBeCloseTo(0.1002, 3);
    expect(t.pGreater).toBeCloseTo(0.0501, 3);
    expect(t.pLess + t.pGreater).toBeCloseTo(1, 12);
    expect(t.ci[0]).toBeCloseTo(0.1 - 1.959964 * Math.sqrt(0.0037), 5);
  });

  it('dé : effectifs théoriques n/6 et 5 degrés de liberté', () => {
    const g = goodnessOfFit([7, 18, 26, 15, 18, 6], Array(6).fill(1 / 6));
    expect(g.n).toBe(90);
    // le TD donne 16,67 = 100/6 : les effectifs y somment à 90 ; on vérifie la formule sur n = 90
    expect(g.expected[0]).toBeCloseTo(15, 12);
    expect(g.df).toBe(5);
    expect(g.statistic).toBeCloseTo([7, 18, 26, 15, 18, 6].reduce((s, o) => s + (o - 15) ** 2 / 15, 0), 12);
    expect(g.contributions.reduce((s, c) => s + c, 0)).toBeCloseTo(g.statistic, 12);
  });

  it('transports : T ≃ 0,18, 3 ddl, p ≃ 0,98', () => {
    const g = goodnessOfFit([82, 70, 28, 20], [0.4, 0.35, 0.15, 0.1]);
    expect(g.expected).toEqual([80, 70, 30, 20]);
    expect(g.statistic).toBeCloseTo(0.05 + 4 / 30, 12);
    expect(g.df).toBe(3);
    expect(g.pValue).toBeCloseTo(0.98, 2);
  });

  it('paramètres estimés : un ddl de moins par paramètre', () => {
    expect(goodnessOfFit([10, 20, 30, 20, 10], [0.1, 0.2, 0.4, 0.2, 0.1], 2).df).toBe(2);
  });

  it('indépendance (préparation × réussite)', () => {
    const c = contingency([
      [30, 20],
      [50, 10],
      [20, 30],
    ]);
    expect(c.rowTotals).toEqual([50, 60, 50]);
    expect(c.colTotals).toEqual([100, 60]);
    expect(c.expected[0][0]).toBeCloseTo(31.25, 12);
    expect(c.expected[1][1]).toBeCloseTo(22.5, 12);
    expect(c.df).toBe(2);
    expect(c.statistic).toBeCloseTo(0.05 + 1.25 ** 2 / 18.75 + 12.5 ** 2 / 37.5 + 12.5 ** 2 / 22.5 + 11.25 ** 2 / 31.25 + 11.25 ** 2 / 18.75, 10);
    expect(c.pValue).toBeLessThan(0.001);
  });

  it('homogénéité (régions × produits)', () => {
    const c = contingency([
      [50, 30, 20],
      [40, 35, 25],
      [45, 25, 30],
    ]);
    expect(c.expected[0]).toEqual([45, 30, 25]);
    expect(c.df).toBe(4);
    expect(c.statistic).toBeCloseTo(25 / 45 + 0 + 1 + 25 / 45 + 25 / 30 + 0 + 0 + 25 / 30 + 25 / 25, 10);
    expect(c.pValue).toBeGreaterThan(0.05);
  });

  it('ANOVA (engrais) : F = 10,4', () => {
    const a = anova([
      [12, 14, 11, 13],
      [15, 17, 16, 18],
      [14, 13, 15, 12],
    ]);
    expect(a.means).toEqual([12.5, 16.5, 13.5]);
    expect(a.grandMean).toBeCloseTo(85 / 6, 12);
    expect(a.ssBetween).toBeCloseTo(104 / 3, 10);
    expect(a.ssWithin).toBeCloseTo(15, 12);
    expect(a.df1).toBe(2);
    expect(a.df2).toBe(9);
    expect(a.F).toBeCloseTo(10.4, 10);
    expect(a.pValue).toBeCloseTo(0.004581, 4);
  });

  it('moments sur données groupées', () => {
    const m = groupedMoments([15, 25, 35, 45, 55], [30, 50, 70, 40, 10]);
    expect(m.mean).toBeCloseTo(32.5, 12);
    expect(m.variance).toBeCloseTo((30 * 17.5 ** 2 + 50 * 7.5 ** 2 + 70 * 2.5 ** 2 + 40 * 12.5 ** 2 + 10 * 22.5 ** 2) / 200, 10);
  });
});

describe('tirages reproductibles', () => {
  it('même graine, mêmes données ; lois respectées en moyenne', () => {
    const a = new Rng(7);
    const b = new Rng(7);
    expect(sampleCounts(a, 50, [1, 2, 3])).toEqual(sampleCounts(b, 50, [1, 2, 3]));
    const rng = new Rng(11);
    const N = 4000;
    let sn = 0;
    let sp = 0;
    let sb = 0;
    for (let i = 0; i < N; i++) {
      sn += sampleNormal(rng, 10, 2);
      sp += samplePoisson(rng, 3);
      sb += sampleBinomial(rng, 10, 0.3);
    }
    expect(sn / N).toBeCloseTo(10, 0);
    expect(sp / N).toBeCloseTo(3, 0);
    expect(sb / N).toBeCloseTo(3, 0);
    expect(sampleCounts(rng, 300, [1, 1, 1]).reduce((s, x) => s + x, 0)).toBe(300);
  });
});

import { chi2Sf, fSf, normalCdf, normalQuantile, normalSf } from './distributions';

/*
 * Calcul complet des tests du cours (avec toutes les valeurs intermédiaires,
 * affichées dans les corrigés).
 */

// ——————————————————————————————————— Comparaison de deux proportions

export interface TwoProportions {
  /** Proportions observées p̂_A = x_A / n_A, p̂_B = x_B / n_B. */
  pA: number;
  pB: number;
  diff: number;
  /** Écart type estimé de p̂_B − p̂_A : √(p̂_A(1 − p̂_A)/n_A + p̂_B(1 − p̂_B)/n_B). */
  se: number;
  /** Z = (p̂_B − p̂_A) / se, de loi ≈ N(0, 1) sous H0. */
  z: number;
  /** H0 : p_A = p_B contre H1 : p_A ≠ p_B. */
  pBilateral: number;
  /** H0 : p_B ≤ p_A contre H1 : p_B > p_A. */
  pGreater: number;
  /** H0 : p_B ≥ p_A contre H1 : p_B < p_A. */
  pLess: number;
  /** Intervalle de confiance de p_B − p_A au niveau `level`. */
  ci: [number, number];
  quantile: number;
}

export function twoProportions(xA: number, nA: number, xB: number, nB: number, level = 0.95): TwoProportions {
  const pA = xA / nA;
  const pB = xB / nB;
  const diff = pB - pA;
  const se = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
  const z = diff / se;
  const quantile = normalQuantile(1 - (1 - level) / 2);
  return {
    pA,
    pB,
    diff,
    se,
    z,
    pBilateral: Math.min(1, 2 * normalSf(Math.abs(z))),
    pGreater: normalSf(z),
    pLess: normalCdf(z),
    ci: [diff - quantile * se, diff + quantile * se],
    quantile,
  };
}

// ——————————————————————————————————— χ² d'adéquation

export interface GoodnessOfFit {
  n: number;
  expected: number[];
  /** Contributions (n_i − np_i)² / (np_i). */
  contributions: number[];
  statistic: number;
  /** k − 1 − (nombre de paramètres estimés). */
  df: number;
  pValue: number;
}

export function goodnessOfFit(observed: number[], probs: number[], estimated = 0): GoodnessOfFit {
  const n = observed.reduce((s, x) => s + x, 0);
  const expected = probs.map((p) => n * p);
  const contributions = observed.map((o, i) => (o - expected[i]) ** 2 / expected[i]);
  const statistic = contributions.reduce((s, c) => s + c, 0);
  const df = observed.length - 1 - estimated;
  return { n, expected, contributions, statistic, df, pValue: chi2Sf(statistic, df) };
}

// ——————————————————————————————————— χ² d'indépendance / d'homogénéité

export interface Contingency {
  rowTotals: number[];
  colTotals: number[];
  n: number;
  /** E_ij = (total ligne i × total colonne j) / n. */
  expected: number[][];
  contributions: number[][];
  statistic: number;
  /** (r − 1)(c − 1). */
  df: number;
  pValue: number;
}

export function contingency(table: number[][]): Contingency {
  const rowTotals = table.map((r) => r.reduce((s, x) => s + x, 0));
  const colTotals = table[0].map((_, j) => table.reduce((s, r) => s + r[j], 0));
  const n = rowTotals.reduce((s, x) => s + x, 0);
  const expected = rowTotals.map((ri) => colTotals.map((cj) => (ri * cj) / n));
  const contributions = table.map((r, i) => r.map((o, j) => (o - expected[i][j]) ** 2 / expected[i][j]));
  const statistic = contributions.flat().reduce((s, c) => s + c, 0);
  const df = (table.length - 1) * (table[0].length - 1);
  return { rowTotals, colTotals, n, expected, contributions, statistic, df, pValue: chi2Sf(statistic, df) };
}

// ——————————————————————————————————— ANOVA à un facteur

export interface Anova {
  k: number;
  N: number;
  means: number[];
  grandMean: number;
  /** Somme des carrés des écarts inter-groupes (expliquée par le facteur). */
  ssBetween: number;
  /** Somme des carrés des écarts intra-groupes (résiduelle). */
  ssWithin: number;
  ssTotal: number;
  df1: number;
  df2: number;
  msBetween: number;
  msWithin: number;
  F: number;
  pValue: number;
}

export function anova(groups: number[][]): Anova {
  const k = groups.length;
  const N = groups.reduce((s, g) => s + g.length, 0);
  const means = groups.map((g) => g.reduce((s, x) => s + x, 0) / g.length);
  const grandMean = groups.flat().reduce((s, x) => s + x, 0) / N;
  const ssBetween = groups.reduce((s, g, i) => s + g.length * (means[i] - grandMean) ** 2, 0);
  const ssWithin = groups.reduce((s, g, i) => s + g.reduce((t, x) => t + (x - means[i]) ** 2, 0), 0);
  const df1 = k - 1;
  const df2 = N - k;
  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  const F = msBetween / msWithin;
  return { k, N, means, grandMean, ssBetween, ssWithin, ssTotal: ssBetween + ssWithin, df1, df2, msBetween, msWithin, F, pValue: fSf(F, df1, df2) };
}

// ——————————————————————————————————— Estimation sur données groupées

/** Moyenne et variance (estimateur du maximum de vraisemblance, en 1/n) de valeurs pondérées par des effectifs. */
export function groupedMoments(values: number[], counts: number[]): { mean: number; variance: number } {
  const n = counts.reduce((s, c) => s + c, 0);
  const mean = values.reduce((s, v, i) => s + v * counts[i], 0) / n;
  const variance = values.reduce((s, v, i) => s + counts[i] * (v - mean) ** 2, 0) / n;
  return { mean, variance };
}

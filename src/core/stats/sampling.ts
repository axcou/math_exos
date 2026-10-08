import type { Rng } from '../random/prng';

/*
 * Tirages aléatoires reproductibles (même graine → mêmes données) pour
 * fabriquer les jeux de données des exercices.
 */

/** Loi normale N(mu, sigma²) (Box-Muller). */
export function sampleNormal(rng: Rng, mu = 0, sigma = 1): number {
  const u = Math.max(rng.next(), 1e-12);
  const v = rng.next();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Loi binomiale B(n, p), par n épreuves de Bernoulli. */
export function sampleBinomial(rng: Rng, n: number, p: number): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng.next() < p) k++;
  return k;
}

/** Loi de Poisson P(λ) (méthode de Knuth, λ modéré). */
export function samplePoisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  for (;;) {
    p *= rng.next();
    if (p <= L) return k;
    k++;
  }
}

/** Indice tiré selon les poids (non normalisés). */
export function sampleIndex(rng: Rng, weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let u = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    u -= weights[i];
    if (u < 0) return i;
  }
  return weights.length - 1;
}

/** Effectifs observés de n tirages indépendants selon les poids (loi multinomiale). */
export function sampleCounts(rng: Rng, n: number, weights: number[]): number[] {
  const counts = weights.map(() => 0);
  for (let i = 0; i < n; i++) counts[sampleIndex(rng, weights)]++;
  return counts;
}

/** Réel uniforme dans [a, b]. */
export const uniform = (rng: Rng, a: number, b: number): number => a + (b - a) * rng.next();

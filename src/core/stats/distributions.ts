/**
 * Lois usuelles des tests : normale, χ², Fisher, Poisson.
 * Fonctions gamma et bêta incomplètes régularisées (méthodes classiques :
 * série et fraction continue de Lentz), précision ~1e-12.
 */

const EPS = 1e-15;
const FPMIN = 1e-300;
const MAX_IT = 500;

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** ln Γ(x) pour x > 0 (approximation de Lanczos). */
export function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

function gammaSeries(a: number, x: number): number {
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 0; n < MAX_IT; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < MAX_IT; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** P(a, x) = γ(a, x) / Γ(a), fonction gamma incomplète régularisée. */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaContinuedFraction(a, x);
}

/** Q(a, x) = 1 − P(a, x), calculée directement (précise dans la queue). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaContinuedFraction(a, x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_IT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** I_x(a, b), fonction bêta incomplète régularisée. */
export function betaI(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betaContinuedFraction(a, b, x)) / a : 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

// ——————————————————————————————————— Loi normale

/** Φ(z) = P(Z ≤ z), Z ~ N(0, 1). */
export function normalCdf(z: number): number {
  const h = gammaP(0.5, (z * z) / 2) / 2;
  return z >= 0 ? 0.5 + h : 0.5 - h;
}

/** P(Z > z). */
export const normalSf = (z: number): number => normalCdf(-z);

// ——————————————————————————————————— χ² et Fisher

/** P(X ≤ x), X ~ χ²(k). */
export const chi2Cdf = (x: number, k: number): number => gammaP(k / 2, x / 2);

/** P(X > x), X ~ χ²(k) : la p-valeur d'un test du χ². */
export const chi2Sf = (x: number, k: number): number => gammaQ(k / 2, x / 2);

/** P(F > f), F ~ F(d1, d2) : la p-valeur d'une ANOVA. */
export function fSf(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  return betaI(d2 / 2, d1 / 2, d2 / (d2 + d1 * f));
}

// ——————————————————————————————————— Quantiles (par dichotomie sur la fonction de répartition)

function bisect(cdf: (x: number) => number, p: number, lo: number, hi: number): number {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Quantile d'ordre p de N(0, 1) (ex. 0,975 → 1,96). */
export const normalQuantile = (p: number): number => bisect(normalCdf, p, -40, 40);

/** Quantile d'ordre p de χ²(k). */
export const chi2Quantile = (p: number, k: number): number => bisect((x) => chi2Cdf(x, k), p, 0, 1000);

/** Quantile d'ordre p de F(d1, d2). */
export const fQuantile = (p: number, d1: number, d2: number): number => bisect((x) => 1 - fSf(x, d1, d2), p, 0, 1000);

// ——————————————————————————————————— Poisson

/** P(X = k), X ~ P(λ). */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0) return 0;
  return Math.exp(k * Math.log(lambda) - lambda - lnGamma(k + 1));
}

/** P(X ≤ k). */
export function poissonCdf(k: number, lambda: number): number {
  let s = 0;
  for (let i = 0; i <= k; i++) s += poissonPmf(i, lambda);
  return Math.min(1, s);
}

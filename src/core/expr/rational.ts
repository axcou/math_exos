/** Fraction exacte n/d (d > 0, irréductible). */
export interface Rational {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function rat(n: number, d = 1): Rational {
  if (d === 0) throw new Error('Division par zéro');
  if (!Number.isInteger(n) || !Number.isInteger(d)) return fromDecimal(n / d);
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g || 0, d: d / g };
}

/** Convertit un décimal fini (ex. 0.25) en fraction exacte. */
export function fromDecimal(x: number): Rational {
  if (Number.isInteger(x)) return { n: x, d: 1 };
  let d = 1;
  while (!Number.isInteger(Math.round(x * d * 1e9) / 1e9) && d < 1e9) d *= 10;
  return rat(Math.round(x * d), d);
}

export const ZERO = rat(0);
export const ONE = rat(1);

export const add = (a: Rational, b: Rational) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational) => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational) => rat(a.n * b.d, a.d * b.n);
export const neg = (a: Rational) => rat(-a.n, a.d);
export const abs = (a: Rational) => rat(Math.abs(a.n), a.d);
export const eq = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
export const isZero = (a: Rational) => a.n === 0;
export const isInt = (a: Rational) => a.d === 1;
export const sign = (a: Rational) => Math.sign(a.n);
export const toNumber = (a: Rational) => a.n / a.d;
export const cmp = (a: Rational, b: Rational) => sign(sub(a, b));

export function pow(a: Rational, k: number): Rational {
  let r = ONE;
  for (let i = 0; i < Math.abs(k); i++) r = mul(r, a);
  return k < 0 ? div(ONE, r) : r;
}

export function toLatex(a: Rational): string {
  if (a.d === 1) return String(a.n);
  const s = a.n < 0 ? '-' : '';
  return `${s}\\frac{${Math.abs(a.n)}}{${a.d}}`;
}

export function toText(a: Rational): string {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}

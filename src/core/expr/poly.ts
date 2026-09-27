import type { Expr } from './ast';
import { mono, num } from './build';
import * as Q from './rational';
import type { Rational } from './rational';
import { toLatex } from './toLatex';

/** Polynôme à coefficients rationnels exacts ; c[k] est le coefficient de x^k. */
export class Poly {
  readonly c: Rational[];

  constructor(coefs: (number | Rational)[]) {
    const c = coefs.map((v) => (typeof v === 'number' ? Q.rat(v) : v));
    while (c.length > 1 && Q.isZero(c[c.length - 1])) c.pop();
    this.c = c.length ? c : [Q.ZERO];
  }

  /** Construit depuis les coefficients du plus haut degré au plus bas : fromHigh(2, -3, 1) = 2x² − 3x + 1. */
  static fromHigh(...coefs: (number | Rational)[]): Poly {
    return new Poly([...coefs].reverse());
  }

  /** a·(x − r₁)(x − r₂)… */
  static fromRoots(a: number | Rational, roots: (number | Rational)[]): Poly {
    let p = new Poly([a]);
    for (const r of roots) {
      const rr = typeof r === 'number' ? Q.rat(r) : r;
      p = p.mul(new Poly([Q.neg(rr), Q.ONE]));
    }
    return p;
  }

  get degree(): number {
    return this.c.length === 1 && Q.isZero(this.c[0]) ? -Infinity : this.c.length - 1;
  }

  get lead(): Rational {
    return this.c[this.c.length - 1];
  }

  coef(k: number): Rational {
    return this.c[k] ?? Q.ZERO;
  }

  add(p: Poly): Poly {
    const n = Math.max(this.c.length, p.c.length);
    return new Poly(Array.from({ length: n }, (_, k) => Q.add(this.coef(k), p.coef(k))));
  }

  sub(p: Poly): Poly {
    return this.add(p.scale(-1));
  }

  scale(k: number | Rational): Poly {
    const r = typeof k === 'number' ? Q.rat(k) : k;
    return new Poly(this.c.map((v) => Q.mul(v, r)));
  }

  mul(p: Poly): Poly {
    const out: Rational[] = Array(this.c.length + p.c.length - 1).fill(Q.ZERO);
    this.c.forEach((a, i) => p.c.forEach((b, j) => (out[i + j] = Q.add(out[i + j], Q.mul(a, b)))));
    return new Poly(out);
  }

  derive(): Poly {
    return new Poly(this.c.slice(1).map((v, k) => Q.mul(v, Q.rat(k + 1))));
  }

  evalQ(x: Rational): Rational {
    return this.c.reduceRight((acc, v) => Q.add(Q.mul(acc, x), v), Q.ZERO);
  }

  eval(x: number): number {
    return this.c.reduceRight((acc, v) => acc * x + Q.toNumber(v), 0);
  }

  isZero(): boolean {
    return this.degree === -Infinity;
  }

  /** Expression ordonnée par degrés décroissants. */
  toExpr(): Expr {
    const terms: Expr[] = [];
    for (let k = this.c.length - 1; k >= 0; k--) {
      if (!Q.isZero(this.c[k])) terms.push(k === 0 ? num(this.c[k]) : mono(this.c[k], k));
    }
    if (terms.length === 0) return num(0);
    // add() replacerait la constante en fin : on construit directement l'ordre voulu
    return terms.length === 1 ? terms[0] : { type: 'add', terms };
  }

  toLatex(): string {
    return toLatex(this.toExpr());
  }

  /** Discriminant (degré 2). */
  discriminant(): Rational {
    const [c, b, a] = [this.coef(0), this.coef(1), this.coef(2)];
    return Q.sub(Q.mul(b, b), Q.mul(Q.rat(4), Q.mul(a, c)));
  }
}


import type { Expr } from './ast';
import { add, div, exp, ln, mul, num, pow, sqrt } from './build';
import { hasVar } from './evaluate';

/**
 * Dérivée symbolique (non simplifiée au-delà des constructeurs).
 * Sert à calculer des nombres dérivés, pas à afficher une correction.
 */
export function derive(e: Expr): Expr {
  if (!hasVar(e)) return num(0);
  switch (e.type) {
    case 'var':
      return num(1);
    case 'add':
      return add(...e.terms.map(derive));
    case 'neg':
      return mul(num(-1), derive(e.arg));
    case 'mul':
      return add(...e.factors.map((_, i) => mul(...e.factors.map((f, j) => (i === j ? derive(f) : f)))));
    case 'div':
      return div(add(mul(derive(e.num), e.den), mul(num(-1), e.num, derive(e.den))), pow(e.den, 2));
    case 'pow':
      if (hasVar(e.exp)) {
        // a^b = e^{b ln a}
        return derive(exp(mul(e.exp, ln(e.base))));
      }
      return mul(e.exp, pow(e.base, add(e.exp, num(-1))), derive(e.base));
    case 'fn':
      if (e.name === 'exp') return mul(derive(e.arg), e);
      if (e.name === 'ln') return div(derive(e.arg), e.arg);
      return div(derive(e.arg), mul(num(2), sqrt(e.arg)));
    default:
      return num(0);
  }
}

import type { Expr } from './ast';
import { toNumber } from './rational';

/** Valeur numérique de e en x (NaN hors du domaine de définition). */
export function evaluate(e: Expr, x: number): number {
  switch (e.type) {
    case 'num':
      return toNumber(e.value);
    case 'const':
      return e.name === 'e' ? Math.E : Math.PI;
    case 'var':
      return x;
    case 'add':
      return e.terms.reduce((s, t) => s + evaluate(t, x), 0);
    case 'mul':
      return e.factors.reduce((p, f) => p * evaluate(f, x), 1);
    case 'div': {
      const d = evaluate(e.den, x);
      return d === 0 ? NaN : evaluate(e.num, x) / d;
    }
    case 'pow': {
      const b = evaluate(e.base, x);
      const p = evaluate(e.exp, x);
      if (b === 0 && p < 0) return NaN;
      return Math.pow(b, p);
    }
    case 'neg':
      return -evaluate(e.arg, x);
    case 'fn': {
      const a = evaluate(e.arg, x);
      if (e.name === 'exp') return Math.exp(a);
      if (e.name === 'ln') return a > 0 ? Math.log(a) : NaN;
      return a >= 0 ? Math.sqrt(a) : NaN;
    }
  }
}

/** L'expression dépend-elle de x ? */
export function hasVar(e: Expr): boolean {
  switch (e.type) {
    case 'var':
      return true;
    case 'num':
    case 'const':
      return false;
    case 'add':
      return e.terms.some(hasVar);
    case 'mul':
      return e.factors.some(hasVar);
    case 'div':
      return hasVar(e.num) || hasVar(e.den);
    case 'pow':
      return hasVar(e.base) || hasVar(e.exp);
    case 'neg':
    case 'fn':
      return hasVar(e.arg);
  }
}

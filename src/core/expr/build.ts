import type { Expr, FnName } from './ast';
import * as Q from './rational';
import type { Rational } from './rational';

/*
 * Constructeurs avec nettoyage léger (0 + a → a, 1·a → a, coefficients
 * numériques regroupés en tête) : suffisant pour obtenir un affichage propre
 * sans moteur de simplification complet.
 */

export const X: Expr = { type: 'var' };
export const E: Expr = { type: 'const', name: 'e' };

export function num(n: number | Rational, d = 1): Expr {
  return { type: 'num', value: typeof n === 'number' ? Q.rat(n, d) : n };
}

export const isNum = (e: Expr): e is Extract<Expr, { type: 'num' }> => e.type === 'num';
export const isNumValue = (e: Expr, v: number) => isNum(e) && Q.toNumber(e.value) === v;

export function add(...terms: Expr[]): Expr {
  const flat: Expr[] = [];
  let c = Q.ZERO;
  for (const t of terms) {
    if (t.type === 'add') flat.push(...t.terms);
    else flat.push(t);
  }
  const rest: Expr[] = [];
  for (const t of flat) {
    if (isNum(t)) c = Q.add(c, t.value);
    else rest.push(t);
  }
  if (!Q.isZero(c)) rest.push(num(c));
  if (rest.length === 0) return num(0);
  if (rest.length === 1) return rest[0];
  return { type: 'add', terms: rest };
}

export function sub(a: Expr, b: Expr): Expr {
  return add(a, neg(b));
}

export function mul(...factors: Expr[]): Expr {
  const flat: Expr[] = [];
  let c = Q.ONE;
  const push = (f: Expr) => {
    if (f.type === 'mul') f.factors.forEach(push);
    else if (f.type === 'neg') {
      c = Q.neg(c);
      push(f.arg);
    } else if (isNum(f)) c = Q.mul(c, f.value);
    else flat.push(f);
  };
  factors.forEach(push);
  if (Q.isZero(c)) return num(0);
  if (flat.length === 0) return num(c);
  if (Q.eq(c, Q.ONE)) return flat.length === 1 ? flat[0] : { type: 'mul', factors: flat };
  return { type: 'mul', factors: [num(c), ...flat] };
}

export function div(a: Expr, b: Expr): Expr {
  if (isNumValue(b, 1)) return a;
  if (isNum(a) && isNum(b)) return num(Q.div(a.value, b.value));
  if (isNumValue(a, 0)) return num(0);
  return { type: 'div', num: a, den: b };
}

export function pow(base: Expr, exp: Expr | number): Expr {
  const e = typeof exp === 'number' ? num(exp) : exp;
  if (isNumValue(e, 1)) return base;
  if (isNumValue(e, 0)) return num(1);
  if (isNum(base) && isNum(e) && Q.isInt(e.value)) return num(Q.pow(base.value, e.value.n));
  return { type: 'pow', base, exp: e };
}

export function neg(a: Expr): Expr {
  if (isNum(a)) return num(Q.neg(a.value));
  if (a.type === 'neg') return a.arg;
  if (a.type === 'mul') return mul(num(-1), a);
  return mul(num(-1), a);
}

export const fn = (name: FnName, arg: Expr): Expr => ({ type: 'fn', name, arg });
export const exp = (arg: Expr) => fn('exp', arg);
export const ln = (arg: Expr) => fn('ln', arg);
export const sqrt = (arg: Expr) => fn('sqrt', arg);

/** a·x^k */
export function mono(a: number | Rational, k: number): Expr {
  return mul(num(a), pow(X, k));
}

/** ax + b */
export function affine(a: number | Rational, b: number | Rational): Expr {
  return add(mono(a, 1), num(b));
}

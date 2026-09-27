import type { Expr } from './ast';
import { div, isNum, mul, num } from './build';
import * as Q from './rational';

/** L'expression s'affiche-t-elle avec un signe « − » en tête ? */
export function isNegative(e: Expr): boolean {
  switch (e.type) {
    case 'num':
      return e.value.n < 0;
    case 'mul':
      return isNum(e.factors[0]) && e.factors[0].value.n < 0;
    case 'div':
      return isNegative(e.num);
    case 'neg':
      return true;
    default:
      return false;
  }
}

/** Opposé « d'affichage » d'une expression négative (retire le signe de tête). */
export function negated(e: Expr): Expr {
  switch (e.type) {
    case 'num':
      return num(Q.neg(e.value));
    case 'mul': {
      const [c, ...rest] = e.factors;
      return isNum(c) ? mul(num(Q.neg(c.value)), ...rest) : mul(num(-1), e);
    }
    case 'div':
      return div(negated(e.num), e.den);
    case 'neg':
      return e.arg;
    default:
      return mul(num(-1), e);
  }
}

function paren(s: string): string {
  return s.includes('\\frac') ? `\\left(${s}\\right)` : `(${s})`;
}

function needsParenAsFactor(f: Expr, first: boolean): boolean {
  if (f.type === 'add' || f.type === 'neg') return true;
  if (f.type === 'num' && f.value.n < 0 && !first) return true;
  return false;
}

function needsParenAsBase(b: Expr): boolean {
  if (b.type === 'var') return false;
  if (b.type === 'const') return false;
  if (b.type === 'num') return b.value.n < 0 || b.value.d !== 1;
  if (b.type === 'fn') return b.name !== 'sqrt';
  return true;
}

function mulLatex(factors: Expr[]): string {
  let coef: Q.Rational | null = null;
  let rest = factors;
  if (isNum(factors[0])) {
    coef = factors[0].value;
    rest = factors.slice(1);
  }
  // c · (a/b) s'écrit (c·a)/b pour éviter l'ambiguïté « 2 1/x »
  if (coef && rest.length === 1 && rest[0].type === 'div') {
    return toLatex(div(mul(num(coef), rest[0].num), rest[0].den));
  }
  let out = '';
  rest.forEach((f, i) => {
    let s = toLatex(f);
    if (needsParenAsFactor(f, i === 0 && !coef)) s = paren(s);
    if (i > 0 && (f.type === 'num' || f.type === 'div')) out += ' \\times ';
    else if (i > 0 && f.type === 'fn' && f.name === 'sqrt') out += ' ';
    out += s;
  });
  if (!coef) return out;
  if (Q.eq(coef, Q.ONE)) return out;
  if (Q.eq(coef, Q.rat(-1))) return `-${out}`;
  const c = Q.toLatex(coef);
  return rest[0]?.type === 'div' ? `${c} \\times ${out}` : `${c}${out}`;
}

let varName = 'x';

/** Même rendu, avec un autre nom de variable (changement de variable X = −x…). */
export function toLatexVar(e: Expr, name: string): string {
  const prev = varName;
  varName = name;
  try {
    return toLatex(e);
  } finally {
    varName = prev;
  }
}

export function toLatex(e: Expr): string {
  switch (e.type) {
    case 'num':
      return Q.toLatex(e.value);
    case 'const':
      return e.name === 'e' ? '\\mathrm{e}' : '\\pi';
    case 'var':
      return varName;
    case 'add':
      return e.terms
        .map((t, i) => {
          if (i === 0) return toLatex(t);
          return isNegative(t) ? ` - ${toLatex(negated(t))}` : ` + ${toLatex(t)}`;
        })
        .join('');
    case 'mul':
      return mulLatex(e.factors);
    case 'div':
      if (isNegative(e.num)) return `-\\frac{${toLatex(negated(e.num))}}{${toLatex(e.den)}}`;
      return `\\frac{${toLatex(e.num)}}{${toLatex(e.den)}}`;
    case 'pow': {
      const b = toLatex(e.base);
      return `${needsParenAsBase(e.base) ? paren(b) : b}^{${toLatex(e.exp)}}`;
    }
    case 'neg': {
      const s = toLatex(e.arg);
      return `-${e.arg.type === 'add' ? paren(s) : s}`;
    }
    case 'fn':
      if (e.name === 'exp') return `\\mathrm{e}^{${toLatex(e.arg)}}`;
      if (e.name === 'sqrt') return `\\sqrt{${toLatex(e.arg)}}`;
      return `\\ln${paren(toLatex(e.arg))}`;
  }
}

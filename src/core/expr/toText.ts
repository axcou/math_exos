import type { Expr } from './ast';

/*
 * Écriture « au clavier » d'une expression, relisible par parse() :
 * (2*x+1)/(x-3), e^(3*x+1), sqrt(x), ln(x)…
 * Utile pour pré-remplir un calculateur ou taper une réponse dans les tests.
 */

function numText(e: Extract<Expr, { type: 'num' }>): string {
  const { n, d } = e.value;
  return d === 1 ? String(n) : `${n}/${d}`;
}

const wrap = (s: string) => `(${s})`;

export function toText(e: Expr): string {
  switch (e.type) {
    case 'num':
      return e.value.d === 1 && e.value.n >= 0 ? String(e.value.n) : wrap(numText(e));
    case 'const':
      return e.name === 'e' ? 'e' : 'pi';
    case 'var':
      return 'x';
    case 'add':
      return e.terms.map((t, i) => (i === 0 ? toText(t) : `+${toText(t)}`)).join('');
    case 'mul':
      return e.factors.map((f) => (f.type === 'add' ? wrap(toText(f)) : toText(f))).join('*');
    case 'div':
      return `${wrap(toText(e.num))}/${wrap(toText(e.den))}`;
    case 'pow':
      return `${wrap(toText(e.base))}^${wrap(toText(e.exp))}`;
    case 'neg':
      return `(-${wrap(toText(e.arg))})`;
    case 'fn':
      return e.name === 'exp' ? `e^(${toText(e.arg)})` : `${e.name}(${toText(e.arg)})`;
  }
}


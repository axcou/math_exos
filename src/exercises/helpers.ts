import type { Expr } from '../core/expr/ast';
import { Poly } from '../core/expr/poly';
import * as Q from '../core/expr/rational';
import type { Rational } from '../core/expr/rational';
import { toLatex } from '../core/expr/toLatex';

export const L = toLatex;

/** Nombre entre parenthèses s'il est négatif (pour « × (−3) »). */
export function pn(n: number | Rational): string {
  const s = typeof n === 'number' ? String(n) : Q.toLatex(n);
  return (typeof n === 'number' ? n : n.n) < 0 ? `(${s})` : s;
}

/** Expression entre parenthèses si elle contient une somme. */
export function pe(e: Expr | Poly): string {
  const ex = e instanceof Poly ? e.toExpr() : e;
  const s = L(ex);
  return ex.type === 'add' ? `(${s})` : s;
}

/** Tableau aligné « u(x) = …  u'(x) = … ». */
export function uvBlock(rows: [string, Expr | Poly, Expr | Poly][]): string {
  const lx = (e: Expr | Poly) => (e instanceof Poly ? e.toLatex() : L(e));
  const lines = rows.map(([n, f, df]) => `${n}(x) &= ${lx(f)} & \\quad ${n}'(x) &= ${lx(df)}`);
  return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
}

/** Écriture LaTeX d'un rationnel. */
export const R = (r: Rational | number) => Q.toLatex(typeof r === 'number' ? Q.rat(r) : r);

/** Intervalle en LaTeX. */
export function interval(a: string, b: string, openA = true, openB = true): string {
  return `${openA ? ']' : '['}${a}\\,;\\,${b}${openB ? '[' : ']'}`;
}

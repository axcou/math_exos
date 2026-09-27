import type { Expr } from './ast';
import { add, div, isNum, mul, num, pow } from './build';
import { Poly } from './poly';
import * as Q from './rational';
import { toLatex } from './toLatex';

/*
 * Simplification « de manuel » : on ne cherche pas une forme canonique, mais
 * l'écriture qu'on attend d'un élève :
 *   - un polynôme est développé et réduit ;
 *   - les termes semblables sont regroupés ;
 *   - un facteur e^{u} commun à tous les termes d'une somme est mis en facteur ;
 *   - les puissances d'une même base sont regroupées ;
 *   - les fractions de fractions sont remises sous une seule barre.
 * Les puissances de sommes ((2x+1)^3, (x-3)^2 au dénominateur) sont conservées.
 */

const key = (e: Expr) => toLatex(e);

/** Polynôme en x, ou null (sans développer les puissances de sommes au-delà de 2). */
export function asPoly(e: Expr): Poly | null {
  switch (e.type) {
    case 'num':
      return new Poly([e.value]);
    case 'var':
      return new Poly([0, 1]);
    case 'add': {
      let p = new Poly([0]);
      for (const t of e.terms) {
        const q = asPoly(t);
        if (!q) return null;
        p = p.add(q);
      }
      return p;
    }
    case 'mul': {
      let p = new Poly([1]);
      for (const f of e.factors) {
        const q = asPoly(f);
        if (!q) return null;
        p = p.mul(q);
      }
      return p;
    }
    case 'neg': {
      const q = asPoly(e.arg);
      return q ? q.scale(-1) : null;
    }
    case 'pow': {
      if (!isNum(e.exp) || !Q.isInt(e.exp.value) || e.exp.value.n < 0) return null;
      const b = asPoly(e.base);
      if (!b) return null;
      // x^n se développe ; une puissance de somme ((x-3)^2…) est gardée telle quelle
      if (b.c.filter((c) => !Q.isZero(c)).length > 1 && e.exp.value.n > 1) return null;
      let p = new Poly([1]);
      for (let i = 0; i < e.exp.value.n; i++) p = p.mul(b);
      return p;
    }
    case 'div': {
      if (!isNum(e.den) || Q.isZero(e.den.value)) return null;
      const q = asPoly(e.num);
      return q ? q.scale(Q.div(Q.ONE, e.den.value)) : null;
    }
    default:
      return null;
  }
}

function mapChildren(e: Expr, f: (e: Expr) => Expr): Expr {
  switch (e.type) {
    case 'add':
      return add(...e.terms.map(f));
    case 'mul':
      return mul(...e.factors.map(f));
    case 'div':
      return div(f(e.num), f(e.den));
    case 'pow':
      return pow(f(e.base), f(e.exp));
    case 'neg':
      return mul(num(-1), f(e.arg));
    case 'fn':
      return { type: 'fn', name: e.name, arg: f(e.arg) };
    default:
      return e;
  }
}

/** Sépare un terme en coefficient numérique × reste. */
function splitCoef(t: Expr): [Q.Rational, Expr | null] {
  if (isNum(t)) return [t.value, null];
  if (t.type === 'mul' && isNum(t.factors[0])) {
    const rest = t.factors.slice(1);
    return [t.factors[0].value, rest.length === 1 ? rest[0] : { type: 'mul', factors: rest }];
  }
  if (t.type === 'div') {
    const [c, r] = splitCoef(t.num);
    return [c, div(r ?? num(1), t.den)];
  }
  return [Q.ONE, t];
}

/** Facteurs d'un terme (produit aplati). */
const factorsOf = (t: Expr): Expr[] => (t.type === 'mul' ? t.factors : [t]);

function isExpFactor(f: Expr): boolean {
  return f.type === 'fn' && f.name === 'exp';
}

function tidyAdd(e: Extract<Expr, { type: 'add' }>): Expr {
  // Termes semblables
  const groups = new Map<string, { c: Q.Rational; rest: Expr | null }>();
  const order: string[] = [];
  for (const t of e.terms) {
    const [c, rest] = splitCoef(t);
    const k = rest ? key(rest) : '#';
    const g = groups.get(k);
    if (g) g.c = Q.add(g.c, c);
    else {
      groups.set(k, { c, rest });
      order.push(k);
    }
  }
  const terms = order
    .map((k) => groups.get(k)!)
    .filter((g) => !Q.isZero(g.c))
    .map((g) => (g.rest ? mul(num(g.c), g.rest) : num(g.c)));
  if (terms.length === 0) return num(0);
  if (terms.length === 1) return terms[0];
  const sum = add(...terms);
  const p = asPoly(sum);
  if (p) return p.toExpr();
  // Pas de signe « − » en tête s'il existe un terme positif : 1 − ln(x) plutôt que −ln(x) + 1
  if (sum.type === 'add') {
    const first = splitCoef(sum.terms[0])[0];
    const pos = sum.terms.findIndex((t) => Q.sign(splitCoef(t)[0]) > 0);
    if (Q.sign(first) < 0 && pos > 0) {
      const reordered = [sum.terms[pos], ...sum.terms.filter((_, i) => i !== pos)];
      return finishAdd({ type: 'add', terms: reordered });
    }
  }
  return finishAdd(sum);
}

function finishAdd(sum: Expr): Expr {
  if (sum.type !== 'add') return sum;
  const terms = sum.terms;

  // Facteur e^{u} commun à tous les termes
  const expKeys = terms.map((t) => factorsOf(t).filter(isExpFactor).map(key));
  const common = expKeys[0].find((k) => expKeys.every((ks) => ks.includes(k)));
  if (common) {
    const factor = factorsOf(terms[0]).find((f) => key(f) === common)!;
    const rest = terms.map((t) => {
      const fs = factorsOf(t);
      const i = fs.findIndex((f) => key(f) === common);
      const others = fs.filter((_, j) => j !== i);
      return others.length === 0 ? num(1) : others.length === 1 ? others[0] : mul(...others);
    });
    const inner = tidy(add(...rest));
    return mul(inner, factor);
  }

  // Fractions de même dénominateur
  const dens = terms.map((t) => (t.type === 'div' ? key(t.den) : null));
  if (dens.every((d) => d && d === dens[0])) {
    const den = (terms[0] as Extract<Expr, { type: 'div' }>).den;
    return div(tidy(add(...terms.map((t) => (t as Extract<Expr, { type: 'div' }>).num))), den);
  }
  return sum;
}

function tidyMul(e: Extract<Expr, { type: 'mul' }>): Expr {
  // Une fraction dans un produit : tout sous la même barre
  const d = e.factors.findIndex((f) => f.type === 'div');
  if (d !== -1) {
    const fr = e.factors[d] as Extract<Expr, { type: 'div' }>;
    const others = e.factors.filter((_, i) => i !== d);
    return tidy(div(mul(...others, fr.num), fr.den));
  }
  // Regrouper les puissances d'une même base
  const bases = new Map<string, { base: Expr; n: Q.Rational }>();
  const order: string[] = [];
  let coef = Q.ONE;
  const polys: Poly[] = [];
  for (const f of e.factors) {
    if (isNum(f)) {
      coef = Q.mul(coef, f.value);
      continue;
    }
    const [base, n] = f.type === 'pow' && isNum(f.exp) ? [f.base, f.exp.value] : [f, Q.ONE];
    // e^{u} · e^{v} = e^{u+v}
    if (isExpFactor(base) && Q.eq(n, Q.ONE)) {
      const k0 = order.find((k) => isExpFactor(bases.get(k)!.base));
      if (k0) {
        const b = bases.get(k0)!;
        const arg = tidy(add((b.base as Extract<Expr, { type: 'fn' }>).arg, (base as Extract<Expr, { type: 'fn' }>).arg));
        bases.delete(k0);
        order.splice(order.indexOf(k0), 1);
        const nb: Expr = { type: 'fn', name: 'exp', arg };
        bases.set(key(nb), { base: nb, n: Q.ONE });
        order.push(key(nb));
        continue;
      }
    }
    const k = key(base);
    const g = bases.get(k);
    if (g) g.n = Q.add(g.n, n);
    else {
      bases.set(k, { base, n });
      order.push(k);
    }
  }
  const others: Expr[] = [];
  for (const k of order) {
    const { base, n } = bases.get(k)!;
    if (Q.isZero(n)) continue;
    const f = Q.eq(n, Q.ONE) ? base : pow(base, num(n));
    const p = asPoly(f);
    // Les petits polynômes (x, 2x+1, x²) se multiplient entre eux ; les puissances de sommes restent telles quelles
    const powOfSum = f.type === 'pow' && f.base.type === 'add';
    if (p && !powOfSum) polys.push(p);
    else others.push(f);
  }
  const poly = polys.reduce((acc, q) => acc.mul(q), new Poly([coef]));
  if (poly.isZero()) return num(0);
  if (others.length === 0) return poly.toExpr();
  if (poly.degree <= 0) return mul(num(poly.coef(0)), ...others);
  const nonZero = poly.c.filter((c) => !Q.isZero(c)).length;
  if (nonZero === 1) return mul(num(poly.lead), pow({ type: 'var' }, poly.degree), ...others);
  return mul(poly.toExpr(), ...others);
}

function tidyDiv(e: Extract<Expr, { type: 'div' }>): Expr {
  let { num: n, den: d } = e;
  if (isNum(d) && Q.eq(d.value, Q.ONE)) return n;
  if (n.type === 'div') return tidy(div(n.num, mul(n.den, d)));
  if (d.type === 'div') return tidy(div(mul(n, d.den), d.num));
  if (isNum(d)) return tidy(mul(num(Q.div(Q.ONE, d.value)), n));
  // Facteurs communs identiques (même base) entre numérateur et dénominateur
  const nf = factorsOf(n);
  const df = factorsOf(d);
  const base = (f: Expr): [string, Q.Rational] => (f.type === 'pow' && isNum(f.exp) ? [key(f.base), f.exp.value] : [key(f), Q.ONE]);
  for (let i = 0; i < nf.length; i++) {
    const [kb, a] = base(nf[i]);
    const j = df.findIndex((f) => base(f)[0] === kb);
    if (j === -1 || isNum(nf[i])) continue;
    const b = base(df[j])[1];
    const bExpr = nf[i].type === 'pow' ? (nf[i] as Extract<Expr, { type: 'pow' }>).base : nf[i];
    const diff = Q.sub(a, b);
    const nf2 = nf.filter((_, k) => k !== i);
    const df2 = df.filter((_, k) => k !== j);
    if (Q.sign(diff) > 0) nf2.push(pow(bExpr, num(diff)));
    if (Q.sign(diff) < 0) df2.push(pow(bExpr, num(Q.neg(diff))));
    const top = nf2.length ? mul(...nf2) : num(1);
    const bot = df2.length ? mul(...df2) : num(1);
    return tidy(div(top, bot));
  }
  // Coefficients numériques : 2/(2√u) = 1/√u
  const [cn, nRest] = splitCoef(n);
  const [cd, dRest] = splitCoef(d);
  if (!Q.eq(cd, Q.ONE) || !Q.eq(cn, Q.ONE)) {
    const c = Q.div(cn, cd);
    if (!Q.eq(c, cn) || !Q.eq(cd, Q.ONE)) {
      const top = nRest ? mul(num(c.n), nRest) : num(c.n);
      const bot = dRest ? mul(num(c.d), dRest) : num(c.d);
      if (key(top) !== key(n) || key(bot) !== key(d)) return div(top, bot);
    }
  }
  return div(n, d);
}

/** Simplification d'affichage ; le résultat est égal à e (vérifié par les tests). */
export function tidy(e: Expr): Expr {
  const t = mapChildren(e, tidy);
  const p = asPoly(t);
  if (p) return p.toExpr();
  switch (t.type) {
    case 'add':
      return tidyAdd(t);
    case 'mul':
      return tidyMul(t);
    case 'div':
      return tidyDiv(t);
    case 'pow': {
      if (t.base.type === 'pow' && isNum(t.exp) && isNum(t.base.exp)) return pow(t.base.base, num(Q.mul(t.base.exp.value, t.exp.value)));
      return t;
    }
    case 'fn': {
      // e^{ln a} = a, ln(e^a) = a, e^0 = 1, ln 1 = 0, √(a²) pour a rationnel positif
      if (t.name === 'exp' && t.arg.type === 'fn' && t.arg.name === 'ln') return t.arg.arg;
      if (t.name === 'ln' && t.arg.type === 'fn' && t.arg.name === 'exp') return t.arg.arg;
      if (t.name === 'exp' && isNum(t.arg) && Q.isZero(t.arg.value)) return num(1);
      if (t.name === 'exp' && isNum(t.arg) && Q.eq(t.arg.value, Q.ONE)) return { type: 'const', name: 'e' };
      if (t.name === 'ln' && t.arg.type === 'const' && t.arg.name === 'e') return num(1);
      if (t.name === 'ln' && isNum(t.arg) && Q.eq(t.arg.value, Q.ONE)) return num(0);
      if (t.name === 'sqrt' && isNum(t.arg) && Q.sign(t.arg.value) >= 0) {
        const n = Math.round(Math.sqrt(t.arg.value.n));
        const d = Math.round(Math.sqrt(t.arg.value.d));
        if (n * n === t.arg.value.n && d * d === t.arg.value.d) return num(n, d);
      }
      // e^{k ln a} = a^k (k entier)
      if (t.name === 'exp' && t.arg.type === 'mul' && t.arg.factors.length === 2 && isNum(t.arg.factors[0]) && Q.isInt(t.arg.factors[0].value)) {
        const inner = t.arg.factors[1];
        if (inner.type === 'fn' && inner.name === 'ln' && isNum(inner.arg)) return num(Q.pow(inner.arg.value, t.arg.factors[0].value.n));
      }
      return t;
    }
    default:
      return t;
  }
}

/** Remplace x par une expression (sans simplifier). */
export function substituteVar(e: Expr, v: Expr): Expr {
  switch (e.type) {
    case 'var':
      return v;
    case 'add':
      return { type: 'add', terms: e.terms.map((t) => substituteVar(t, v)) };
    case 'mul':
      return { type: 'mul', factors: e.factors.map((t) => substituteVar(t, v)) };
    case 'div':
      return { type: 'div', num: substituteVar(e.num, v), den: substituteVar(e.den, v) };
    case 'pow':
      return { type: 'pow', base: substituteVar(e.base, v), exp: substituteVar(e.exp, v) };
    case 'neg':
      return { type: 'neg', arg: substituteVar(e.arg, v) };
    case 'fn':
      return { type: 'fn', name: e.name, arg: substituteVar(e.arg, v) };
    default:
      return e;
  }
}

import type { Expr } from '../core/expr/ast';
import { add, div, exp, fn, isNum, ln, mul, neg, num, pow, X } from '../core/expr/build';
import { derive } from '../core/expr/derive';
import { evaluate, hasVar } from '../core/expr/evaluate';
import { Poly } from '../core/expr/poly';
import * as Q from '../core/expr/rational';
import { toLatexVar } from '../core/expr/toLatex';
import type { Step } from '../exercises/types';
import { asRational, nice, niceLatex } from './nice';

/*
 * Calculateur de limites « comme au lycée ».
 *
 * 1. Continuité : on remplace x par a.
 * 2. Opérations sur les limites (somme, produit, quotient, composée), avec 0⁺ / 0⁻.
 * 3. En cas de forme indéterminée, sur le sous-terme fautif :
 *    polynôme / fraction rationnelle (terme de plus haut degré), factorisation
 *    par (x − a), quantité conjuguée, terme prépondérant et croissances
 *    comparées, taux d'accroissement (nombre dérivé), changement de variable.
 * 4. Sinon : estimation numérique, signalée comme telle.
 * Le résultat est toujours confronté à un tableau de valeurs.
 */

export type At = number | '+inf' | '-inf';
export type Side = 1 | -1;

export interface LimitPoint {
  at: At;
  /** 0 : des deux côtés (point fini uniquement). */
  side: 0 | Side;
}

export type Val =
  | { k: 'fin'; v: number; z?: Side } // z : signe au voisinage quand v = 0 (0⁺ / 0⁻)
  | { k: 'inf'; s: Side }
  | { k: 'none' } // pas de limite (limites à gauche et à droite différentes)
  | { k: 'undef' } // f non définie au voisinage
  | { k: 'approx'; v: number } // estimation numérique seulement
  | { k: 'unknown' };

type FI = { k: 'fi'; form: string; node: Expr };
type V = Val | FI;

export interface LimitSection {
  title?: string;
  steps: Step[];
}

export interface LimitReport {
  value: Val;
  sections: LimitSection[];
  table: { x: string; fx: string }[];
  warning?: string;
  statement: string; // \lim_{x \to a} f(x)
}

// ——————————————————————————————————— Affichage

const fin = (v: number, z?: Side): Val => (Number.isNaN(v) ? { k: 'undef' } : { k: 'fin', v, z: v === 0 ? z : undefined });
const inf = (s: number): Val => ({ k: 'inf', s: s >= 0 ? 1 : -1 });

export function valLatex(v: Val, withZero = false): string {
  switch (v.k) {
    case 'fin':
      if (v.v === 0 && withZero && v.z) return `0^{${v.z > 0 ? '+' : '-'}}`;
      return niceLatex(v.v);
    case 'inf':
      return v.s > 0 ? '+\\infty' : '-\\infty';
    case 'approx':
      return `\\approx ${nice(v.v).latex}`;
    case 'none':
      return '\\text{n’existe pas}';
    case 'undef':
      return '\\text{non définie}';
    default:
      return '\\,?';
  }
}

export function atLatex(at: At, side: 0 | Side = 0): string {
  if (at === '+inf') return '+\\infty';
  if (at === '-inf') return '-\\infty';
  const a = nice(at).latex;
  return side ? `${a}^{${side > 0 ? '+' : '-'}}` : a;
}

// ——————————————————————————————————— Outils

/** Valeur de x au « niveau » k d'approche (k grand = très proche). */
function sample(at: At, side: Side, k: number): number {
  if (at === '+inf') return 10 ** k;
  if (at === '-inf') return -(10 ** k);
  return at + side * 10 ** -k;
}

function evalSafe(e: Expr, x: number): number {
  try {
    return evaluate(e, x);
  } catch {
    return NaN;
  }
}

/** Signe de e au voisinage du point (pour distinguer 0⁺ et 0⁻). */
function zSide(e: Expr, at: At, side: Side): Side | undefined {
  const levels = at === '+inf' || at === '-inf' ? [4, 5, 6] : [6, 7, 8];
  const s = levels.map((k) => Math.sign(evalSafe(e, sample(at, side, k))));
  if (s.every((v) => v > 0)) return 1;
  if (s.every((v) => v < 0)) return -1;
  return undefined;
}

/** Polynôme en x, ou null. */
export function toPoly(e: Expr): Poly | null {
  switch (e.type) {
    case 'num':
      return new Poly([e.value]);
    case 'var':
      return new Poly([0, 1]);
    case 'add': {
      let p = new Poly([0]);
      for (const t of e.terms) {
        const q = toPoly(t);
        if (!q) return null;
        p = p.add(q);
      }
      return p;
    }
    case 'mul': {
      let p = new Poly([1]);
      for (const f of e.factors) {
        const q = toPoly(f);
        if (!q) return null;
        p = p.mul(q);
      }
      return p;
    }
    case 'neg': {
      const q = toPoly(e.arg);
      return q ? q.scale(-1) : null;
    }
    case 'pow': {
      if (!isNum(e.exp) || !Q.isInt(e.exp.value) || e.exp.value.n < 0 || e.exp.value.n > 12) return null;
      const b = toPoly(e.base);
      if (!b) return null;
      let p = new Poly([1]);
      for (let i = 0; i < e.exp.value.n; i++) p = p.mul(b);
      return p;
    }
    case 'div': {
      if (!isNum(e.den) || Q.isZero(e.den.value)) return null;
      const q = toPoly(e.num);
      return q ? q.scale(Q.div(Q.ONE, e.den.value)) : null;
    }
    default:
      return null;
  }
}

/** Remplace (par identité) le nœud `target` par `repl`. */
function replaceNode(root: Expr, target: Expr, repl: Expr): Expr {
  if (root === target) return repl;
  const r = (e: Expr) => replaceNode(e, target, repl);
  switch (root.type) {
    case 'add':
      return { type: 'add', terms: root.terms.map(r) };
    case 'mul':
      return { type: 'mul', factors: root.factors.map(r) };
    case 'div':
      return { type: 'div', num: r(root.num), den: r(root.den) };
    case 'pow':
      return { type: 'pow', base: r(root.base), exp: r(root.exp) };
    case 'neg':
      return { type: 'neg', arg: r(root.arg) };
    case 'fn':
      return { type: 'fn', name: root.name, arg: r(root.arg) };
    default:
      return root;
  }
}

/** Ancêtres de `target` (du plus proche au plus lointain). */
function ancestors(root: Expr, target: Expr): Expr[] {
  const path: Expr[] = [];
  const walk = (e: Expr): boolean => {
    if (e === target) return true;
    const kids = children(e);
    for (const k of kids) {
      if (walk(k)) {
        path.push(e);
        return true;
      }
    }
    return false;
  };
  walk(root);
  return path;
}

function children(e: Expr): Expr[] {
  switch (e.type) {
    case 'add':
      return e.terms;
    case 'mul':
      return e.factors;
    case 'div':
      return [e.num, e.den];
    case 'pow':
      return [e.base, e.exp];
    case 'neg':
    case 'fn':
      return [e.arg];
    default:
      return [];
  }
}

/**
 * Substitution x ↦ repl avec quelques simplifications d'affichage
 * ((−X)² = X², 1/(1/X) = X, ln(1/X) = −ln X…).
 */
function substitute(e: Expr, repl: Expr): Expr {
  const s = (t: Expr) => substitute(t, repl);
  switch (e.type) {
    case 'var':
      return repl;
    case 'num':
    case 'const':
      return e;
    case 'add':
      return add(...e.terms.map(s));
    case 'mul':
      return mul(...e.factors.map(s));
    case 'neg':
      return neg(s(e.arg));
    case 'div': {
      const n = s(e.num);
      const d = s(e.den);
      if (d.type === 'div' && isNum(d.num) && Q.eq(d.num.value, Q.ONE)) return mul(n, d.den);
      return div(n, d);
    }
    case 'pow': {
      const b = s(e.base);
      const x = s(e.exp);
      if (isNum(x) && Q.isInt(x.value)) {
        const n = x.value.n;
        if (b.type === 'mul' && isNum(b.factors[0]) && Q.eq(b.factors[0].value, Q.rat(-1))) {
          const rest = b.factors.length === 2 ? b.factors[1] : mul(...b.factors.slice(1));
          return n % 2 === 0 ? pow(rest, n) : neg(pow(rest, n));
        }
        if (b.type === 'div' && isNum(b.num) && Q.eq(b.num.value, Q.ONE)) return div(num(1), pow(b.den, n));
      }
      return pow(b, x);
    }
    case 'fn': {
      const a = s(e.arg);
      if (e.name === 'ln' && a.type === 'div' && isNum(a.num) && Q.eq(a.num.value, Q.ONE)) return neg(ln(a.den));
      return fn(e.name, a);
    }
  }
}

// ——————————————————————————————————— Échelle de comparaison en +∞

/**
 * Comportement de e quand x → +∞ : c · x^p · (ln x)^q · e^{u(x)},
 * u polynôme sans terme constant. null si des termes dominants se compensent.
 */
interface Scale {
  c: number;
  p: number;
  q: number;
  u: Poly;
}

const ZERO_POLY = new Poly([0]);

function scaleKey(s: Scale): number[] {
  const d = s.u.degree === -Infinity ? 0 : s.u.degree;
  const a = s.u.degree === -Infinity ? 0 : Q.toNumber(s.u.lead);
  return [a === 0 ? 0 : Math.sign(a) * d, a, s.p, s.q];
}

function cmpKey(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-12) return a[i] - b[i];
  }
  return 0;
}

function scale(e: Expr): Scale | null {
  const one = (c: number): Scale => ({ c, p: 0, q: 0, u: ZERO_POLY });
  switch (e.type) {
    case 'num':
      return one(Q.toNumber(e.value));
    case 'const':
      return one(e.name === 'e' ? Math.E : Math.PI);
    case 'var':
      return { c: 1, p: 1, q: 0, u: ZERO_POLY };
    case 'neg': {
      const s = scale(e.arg);
      return s && { ...s, c: -s.c };
    }
    case 'add': {
      const ss = e.terms.map(scale);
      if (ss.some((s) => !s)) return null;
      const list = (ss as Scale[]).filter((s) => s.c !== 0);
      if (!list.length) return one(0);
      let top = list[0];
      for (const s of list.slice(1)) if (cmpKey(scaleKey(s), scaleKey(top)) > 0) top = s;
      const same = list.filter((s) => cmpKey(scaleKey(s), scaleKey(top)) === 0);
      // Les exposants de e doivent coïncider exactement pour additionner les coefficients
      if (same.some((s) => s.u.sub(top.u).degree !== -Infinity)) return null;
      const c = same.reduce((acc, s) => acc + s.c, 0);
      if (Math.abs(c) < 1e-12 * Math.max(...same.map((s) => Math.abs(s.c)))) return null;
      return { ...top, c };
    }
    case 'mul': {
      let acc = one(1);
      for (const f of e.factors) {
        const s = scale(f);
        if (!s) return null;
        acc = { c: acc.c * s.c, p: acc.p + s.p, q: acc.q + s.q, u: acc.u.add(s.u) };
      }
      return acc;
    }
    case 'div': {
      const a = scale(e.num);
      const b = scale(e.den);
      if (!a || !b || b.c === 0) return null;
      return { c: a.c / b.c, p: a.p - b.p, q: a.q - b.q, u: a.u.sub(b.u) };
    }
    case 'pow': {
      if (hasVar(e.exp)) return scale(exp(mul(e.exp, ln(e.base))));
      const n = evaluate(e.exp, 0);
      const b = scale(e.base);
      if (!b) return null;
      if (!Number.isInteger(n) && b.c < 0) return null;
      const r = asRational(n, 12);
      if (!r) return null;
      return { c: b.c ** n, p: b.p * n, q: b.q * n, u: b.u.scale(r) };
    }
    case 'fn': {
      if (e.name === 'sqrt') return scale(pow(e.arg, num(1, 2)));
      if (e.name === 'exp') {
        const u = toPoly(e.arg);
        if (u) {
          const c0 = Q.toNumber(u.coef(0));
          return { c: Math.exp(c0), p: 0, q: 0, u: u.sub(new Poly([u.coef(0)])) };
        }
        const s = scale(e.arg);
        const l = s && scaleLimit(s);
        return l && l.k === 'fin' ? one(Math.exp(l.v)) : null;
      }
      // ln
      const s = scale(e.arg);
      if (!s || s.c <= 0) return null;
      if (s.u.degree !== -Infinity) {
        // ln(… e^{u}) se comporte comme le terme dominant de u
        const d = s.u.degree;
        return { c: Q.toNumber(s.u.lead), p: d, q: 0, u: ZERO_POLY };
      }
      if (s.p !== 0) return { c: s.p, p: 0, q: 1, u: ZERO_POLY };
      if (s.q !== 0) return null;
      return one(Math.log(s.c));
    }
  }
}

function scaleLimit(s: Scale): Val | null {
  const k = scaleKey(s);
  const growth = k[0] !== 0 ? k[1] : s.p !== 0 ? s.p : s.q;
  if (growth > 0) return inf(s.c);
  if (growth < 0) return fin(0, s.c > 0 ? 1 : -1);
  return fin(s.c);
}

function scaleLatex(s: Scale, v: string): string {
  const power = (p: number) => {
    const pr = asRational(p, 12);
    if (pr && Q.eq(pr, Q.ONE)) return v;
    if (pr && pr.d === 2 && pr.n === 1) return `\\sqrt{${v}}`;
    return `${v}^{${pr ? Q.toLatex(pr) : p}}`;
  };
  const top: string[] = [];
  const bottom: string[] = [];
  if (s.p > 0) top.push(power(s.p));
  if (s.p < 0) bottom.push(power(-s.p));
  if (s.q > 0) top.push(s.q === 1 ? `\\ln ${v}` : `(\\ln ${v})^{${s.q}}`);
  if (s.q < 0) bottom.push(s.q === -1 ? `\\ln ${v}` : `(\\ln ${v})^{${-s.q}}`);
  if (s.u.degree !== -Infinity) {
    // e^{-u} au dénominateur si son terme dominant est négatif
    if (Q.sign(s.u.lead) < 0) bottom.push(`\\mathrm{e}^{${toLatexVar(s.u.scale(-1).toExpr(), v)}}`);
    else top.push(`\\mathrm{e}^{${toLatexVar(s.u.toExpr(), v)}}`);
  }
  const c = nice(Math.abs(s.c));
  const sign = s.c < 0 ? '-' : '';
  const coef = c.latex === '1' ? '' : c.latex;
  if (!top.length && !bottom.length) return nice(s.c).latex;
  if (!bottom.length) return `${sign}${coef}${top.join('\\,')}`;
  return `${sign}\\frac{${coef || (top.length ? '' : '1')}${top.join('\\,')}}{${bottom.join('\\,')}}`;
}

// ——————————————————————————————————— Évaluation par opérations

interface Ctx {
  at: At;
  side: Side;
  v: string; // nom de la variable pour l'affichage
  over: Map<Expr, Val>;
  cache: Map<Expr, V>;
}

function ev(e: Expr, c: Ctx): V {
  const o = c.over.get(e);
  if (o) return o;
  const cached = c.cache.get(e);
  if (cached) return cached;
  const r = evRaw(e, c);
  // 0⁺ ou 0⁻ : déterminé au voisinage
  const out = r.k === 'fin' && r.v === 0 && hasVar(e) ? fin(0, zSide(e, c.at, c.side)) : r;
  c.cache.set(e, out);
  return out;
}

const bad = (v: V): v is FI | { k: 'undef' } | { k: 'none' } | { k: 'approx'; v: number } | { k: 'unknown' } => v.k !== 'fin' && v.k !== 'inf';

function evRaw(e: Expr, c: Ctx): V {
  switch (e.type) {
    case 'num':
      return fin(Q.toNumber(e.value));
    case 'const':
      return fin(e.name === 'e' ? Math.E : Math.PI);
    case 'var':
      return c.at === '+inf' ? inf(1) : c.at === '-inf' ? inf(-1) : fin(c.at);
    case 'neg': {
      const a = ev(e.arg, c);
      if (bad(a)) return a;
      return a.k === 'fin' ? fin(-a.v) : inf(-a.s);
    }
    case 'add': {
      let acc: Val = fin(0);
      for (const t of e.terms) {
        const a = ev(t, c);
        if (bad(a)) return a;
        if (acc.k === 'fin' && a.k === 'fin') acc = fin(acc.v + a.v);
        else if (acc.k === 'fin') acc = a;
        else if (a.k === 'inf' && acc.k === 'inf' && a.s !== acc.s) return { k: 'fi', form: '\\infty - \\infty', node: e };
      }
      return acc;
    }
    case 'mul': {
      let acc: Val = fin(1);
      for (const f of e.factors) {
        const a = ev(f, c);
        if (bad(a)) return a;
        if (acc.k === 'fin' && a.k === 'fin') acc = fin(acc.v * a.v);
        else if ((acc.k === 'fin' && acc.v === 0) || (a.k === 'fin' && a.v === 0)) return { k: 'fi', form: '0 \\times \\infty', node: e };
        else {
          const s1 = acc.k === 'fin' ? Math.sign(acc.v) : (acc as { s: Side }).s;
          const s2 = a.k === 'fin' ? Math.sign(a.v) : a.s;
          acc = inf(s1 * s2);
        }
      }
      return acc;
    }
    case 'div': {
      const n = ev(e.num, c);
      if (bad(n)) return n;
      const d = ev(e.den, c);
      if (bad(d)) return d;
      if (d.k === 'fin' && d.v !== 0) return n.k === 'fin' ? fin(n.v / d.v) : inf(n.s * Math.sign(d.v));
      if (d.k === 'fin') {
        if (n.k === 'fin' && n.v === 0) return { k: 'fi', form: '\\frac{0}{0}', node: e };
        if (!d.z) return { k: 'undef' };
        return inf((n.k === 'fin' ? Math.sign(n.v) : n.s) * d.z);
      }
      if (n.k === 'fin') return fin(0);
      return { k: 'fi', form: '\\frac{\\infty}{\\infty}', node: e };
    }
    case 'pow': {
      if (hasVar(e.exp)) return ev(exp(mul(e.exp, ln(e.base))), c);
      const n = evaluate(e.exp, 0);
      const b = ev(e.base, c);
      if (bad(b)) return b;
      const odd = Number.isInteger(n) && Math.abs(n) % 2 === 1;
      if (b.k === 'fin') {
        if (b.v === 0) {
          if (n > 0) return fin(0);
          if (n === 0) return fin(1);
          if (!b.z) return { k: 'undef' };
          return inf(b.z < 0 && odd ? -1 : 1);
        }
        return fin(b.v ** n);
      }
      if (n === 0) return fin(1);
      if (b.s < 0 && !Number.isInteger(n)) return { k: 'undef' };
      if (n > 0) return inf(b.s < 0 && odd ? -1 : 1);
      return fin(0);
    }
    case 'fn': {
      const a = ev(e.arg, c);
      if (bad(a)) return a;
      if (e.name === 'exp') return a.k === 'fin' ? fin(Math.exp(a.v)) : a.s > 0 ? inf(1) : fin(0);
      if (e.name === 'ln') {
        if (a.k === 'inf') return a.s > 0 ? inf(1) : { k: 'undef' };
        if (a.v > 0) return fin(Math.log(a.v));
        return a.v === 0 && a.z === 1 ? inf(-1) : { k: 'undef' };
      }
      // sqrt
      if (a.k === 'inf') return a.s > 0 ? inf(1) : { k: 'undef' };
      if (a.v > 0) return fin(Math.sqrt(a.v));
      return a.v === 0 && a.z !== -1 ? fin(0) : { k: 'undef' };
    }
  }
}

// ——————————————————————————————————— Stratégies de levée d'indétermination

type Strategy = { value: Val; steps: Step[] } | { rewrite: Expr; steps: Step[] } | null;

const lim = (c: Ctx) => `\\lim_{${c.v} \\to ${atLatex(c.at, c.at === '+inf' || c.at === '-inf' ? 0 : c.side)}}`;

function monomialLatex(p: Poly, v: string): string {
  const d = p.degree;
  return toLatexVar(new Poly([...Array(d).fill(0), p.lead]).toExpr(), v);
}

function monoLimit(c: number, k: number, at: At): Val {
  if (k === 0) return fin(c);
  if (k < 0) return fin(0);
  return inf(Math.sign(c) * (at === '-inf' && k % 2 === 1 ? -1 : 1));
}

/** Polynôme ou fraction rationnelle en ±∞ : termes de plus haut degré. */
function leadingTerms(N: Expr, c: Ctx): Strategy {
  if (c.at !== '+inf' && c.at !== '-inf') return null;
  const L = (e: Expr) => toLatexVar(e, c.v);
  const p = toPoly(N);
  if (p && p.degree > 0) {
    const val = monoLimit(Q.toNumber(p.lead), p.degree, c.at);
    return {
      value: val,
      steps: [
        {
          title: 'Terme de plus haut degré',
          text: 'En l’infini, un polynôme a la même limite que son terme de plus haut degré.',
          math: `${lim(c)} \\left(${L(N)}\\right) = ${lim(c)} ${monomialLatex(p, c.v)} = ${valLatex(val)}`,
          formulas: ['l.poly', 'l.xn'],
        },
      ],
    };
  }
  if (N.type === 'div') {
    const a = toPoly(N.num);
    const b = toPoly(N.den);
    if (a && b && b.degree >= 0 && !b.isZero()) {
      const k = a.degree - b.degree;
      const r = Q.div(a.lead, b.lead);
      const val = monoLimit(Q.toNumber(r), k, c.at);
      const simplified = k === 0 ? Q.toLatex(r) : k > 0 ? L(mul(num(r), pow(X, k))) : L(div(num(r.n), mul(num(r.d), pow(X, -k))));
      return {
        value: val,
        steps: [
          {
            title: 'Termes de plus haut degré',
            text: 'On factorise le numérateur et le dénominateur par leur terme de plus haut degré : la limite est celle du quotient de ces termes.',
            math: `${lim(c)} ${L(N)} = ${lim(c)} \\frac{${monomialLatex(a, c.v)}}{${monomialLatex(b, c.v)}} = ${lim(c)} ${simplified} = ${valLatex(val)}`,
            formulas: ['l.rat'],
          },
        ],
      };
    }
  }
  return null;
}

/** Sépare e en (polynôme) × (autres facteurs). */
function splitPoly(e: Expr): { p: Poly; rest: Expr[] } {
  const p = toPoly(e);
  if (p) return { p, rest: [] };
  if (e.type === 'mul') {
    let acc = new Poly([1]);
    const rest: Expr[] = [];
    for (const f of e.factors) {
      const q = toPoly(f);
      if (q) acc = acc.mul(q);
      else rest.push(f);
    }
    return { p: acc, rest };
  }
  return { p: new Poly([1]), rest: [e] };
}

/** Division exacte d'un polynôme par (x − a). */
function divideByRoot(p: Poly, a: Q.Rational): Poly | null {
  if (!Q.isZero(p.evalQ(a))) return null;
  const n = p.degree;
  const out: Q.Rational[] = Array(n).fill(Q.ZERO);
  let carry = Q.ZERO;
  for (let k = n; k >= 1; k--) {
    carry = Q.add(Q.mul(carry, a), p.coef(k));
    out[k - 1] = carry;
  }
  return new Poly(out);
}

/** Forme 0/0 en a : factorisation par (x − a) puis simplification. */
function factorOut(N: Expr, c: Ctx): Strategy {
  if (typeof c.at !== 'number' || N.type !== 'div') return null;
  const a = asRational(c.at, 100);
  if (!a) return null;
  const top = splitPoly(N.num);
  const bot = splitPoly(N.den);
  let pn = top.p;
  let pd = bot.p;
  let times = 0;
  for (;;) {
    const qn = divideByRoot(pn, a);
    const qd = divideByRoot(pd, a);
    if (!qn || !qd || pn.degree < 1 || pd.degree < 1) break;
    pn = qn;
    pd = qd;
    times++;
  }
  if (!times) return null;
  const L = (e: Expr) => toLatexVar(e, c.v);
  const factor = L(new Poly([Q.neg(a), Q.ONE]).toExpr());
  const f = times > 1 ? `(${factor})^{${times}}` : `(${factor})`;
  const build = (p: Poly, rest: Expr[]) => {
    const parts = [...(p.degree === 0 && Q.eq(p.coef(0), Q.ONE) ? [] : [p.toExpr()]), ...rest];
    return parts.length === 0 ? num(1) : parts.length === 1 ? parts[0] : mul(...parts);
  };
  const newN = div(build(pn, top.rest), build(pd, bot.rest));
  const show = (p: Poly, rest: Expr[]) => {
    const inner = [p.degree === 0 && Q.eq(p.coef(0), Q.ONE) ? '' : `(${p.toLatex()})`, ...rest.map((r) => `\\left(${L(r)}\\right)`)].join('');
    return `${f}${inner}`;
  };
  return {
    rewrite: newN,
    steps: [
      {
        title: `Factoriser par $${f}$`,
        text: `$${nice(c.at).latex}$ annule le numérateur et le dénominateur : on peut les factoriser par $${f}$, puis simplifier (pour $${c.v} \\neq ${nice(c.at).latex}$).`,
        math: `${L(N)} = \\frac{${show(pn, top.rest)}}{${show(pd, bot.rest)}} = ${L(newN)}`,
      },
    ],
  };
}

/** Carré d'un terme « polynôme » ou « k·√(polynôme) », sous forme de polynôme. */
function squarePoly(t: Expr): Poly | null {
  if (t.type === 'neg') return squarePoly(t.arg);
  const p = toPoly(t);
  if (p) return p.mul(p);
  let k = 1;
  let s: Expr = t;
  if (t.type === 'mul' && t.factors.length === 2 && isNum(t.factors[0])) {
    k = Q.toNumber(t.factors[0].value);
    s = t.factors[1];
  }
  if (s.type === 'fn' && s.name === 'sqrt') {
    const a = toPoly(s.arg);
    const kr = asRational(k * k, 100);
    return a && kr ? a.scale(kr) : null;
  }
  return null;
}

const hasSqrt = (e: Expr): boolean => (e.type === 'fn' && e.name === 'sqrt') || children(e).some(hasSqrt);

/** u + v avec une racine : on multiplie par la quantité conjuguée u − v. */
function conjugateOf(sum: Expr): { num: Poly; conj: Expr; u: Expr; v: Expr } | null {
  if (sum.type !== 'add' || sum.terms.length !== 2 || !hasSqrt(sum)) return null;
  const [u, v] = sum.terms;
  const su = squarePoly(u);
  const sv = squarePoly(v);
  if (!su || !sv) return null;
  return { num: su.sub(sv), conj: add(u, neg(v)), u, v };
}

function conjugate(N: Expr, c: Ctx): Strategy {
  const L = (e: Expr) => toLatexVar(e, c.v);
  const direct = conjugateOf(N);
  if (direct) {
    const repl = div(direct.num.toExpr(), direct.conj);
    return {
      rewrite: repl,
      steps: [
        {
          title: 'Quantité conjuguée',
          text: `On multiplie et on divise par la quantité conjuguée $${L(direct.conj)}$, puis on utilise $(a+b)(a-b) = a^2 - b^2$ :`,
          math: `${L(N)} = \\frac{\\left(${L(N)}\\right)\\left(${L(direct.conj)}\\right)}{${L(direct.conj)}} = ${L(repl)}`,
          formulas: ['l.conj'],
        },
      ],
    };
  }
  // Dans un quotient : seulement pour une forme 0/0 en un point (en l'infini, on conclut par les termes prépondérants)
  if (N.type === 'div' && typeof c.at === 'number') {
    for (const which of ['num', 'den'] as const) {
      const cj = conjugateOf(N[which]);
      if (!cj) continue;
      const repl = which === 'num' ? div(cj.num.toExpr(), mul(N.den, cj.conj)) : div(mul(N.num, cj.conj), cj.num.toExpr());
      return {
        rewrite: repl,
        steps: [
          {
            title: 'Quantité conjuguée',
            text: `On multiplie le numérateur et le dénominateur par la quantité conjuguée $${L(cj.conj)}$ du ${which === 'num' ? 'numérateur' : 'dénominateur'} :`,
            math: `${L(N)} = ${L(repl)}`,
            formulas: ['l.conj'],
          },
        ],
      };
    }
  }
  return null;
}

/** Terme prépondérant / croissances comparées en +∞. */
function dominant(N: Expr, c: Ctx): Strategy {
  if (c.at !== '+inf') return null;
  const s = scale(N);
  const val = s && scaleLimit(s);
  if (!s || !val) return null;
  const L = (e: Expr) => toLatexVar(e, c.v);
  const mixed = (e: Expr): boolean => {
    let hasE = false;
    let hasL = false;
    let hasP = false;
    const walk = (t: Expr) => {
      if (t.type === 'fn' && t.name === 'exp') hasE = true;
      else if (t.type === 'fn' && t.name === 'ln') hasL = true;
      else if (t.type === 'var') hasP = true;
      children(t).forEach(walk);
    };
    walk(e);
    return [hasE, hasL, hasP].filter(Boolean).length >= 2;
  };
  const cc = mixed(N);
  let text: string;
  let math: string;
  if (N.type === 'div') {
    const a = scale(N.num);
    const b = scale(N.den);
    text = cc
      ? 'On compare les vitesses de croissance du numérateur et du dénominateur (croissances comparées : l’exponentielle l’emporte sur les puissances, qui l’emportent sur le logarithme).'
      : 'On factorise le numérateur et le dénominateur par leur terme prépondérant.';
    math = a && b ? `${lim(c)} ${L(N)} = ${lim(c)} \\frac{${scaleLatex(a, c.v)}}{${scaleLatex(b, c.v)}} = ${lim(c)} ${scaleLatex(s, c.v)} = ${valLatex(val)}` : `${lim(c)} ${L(N)} = ${valLatex(val)}`;
  } else if (N.type === 'add') {
    text = cc
      ? `Le terme prépondérant est $${scaleLatex(s, c.v)}$ : on factorise par lui, les autres termes deviennent négligeables (croissances comparées).`
      : `On factorise par le terme prépondérant $${scaleLatex(s, c.v)}$ ; les autres termes sont négligeables devant lui.`;
    math = `${lim(c)} \\left(${L(N)}\\right) = ${lim(c)} ${scaleLatex(s, c.v)} = ${valLatex(val)}`;
  } else {
    text = cc ? 'Croissances comparées : l’exponentielle l’emporte sur les puissances, qui l’emportent sur le logarithme.' : 'On regroupe les puissances.';
    math = `${lim(c)} ${L(N)} = ${lim(c)} ${scaleLatex(s, c.v)} = ${valLatex(val)}`;
  }
  return { value: val, steps: [{ title: cc ? 'Croissances comparées' : 'Terme prépondérant', text, math, formulas: cc ? ['l.cc'] : ['l.rat'] }] };
}

/** 0/0 en a : taux d'accroissement → nombres dérivés. */
function rateOfChange(N: Expr, c: Ctx): Strategy {
  if (typeof c.at !== 'number' || N.type !== 'div') return null;
  const a = c.at;
  const L = (e: Expr) => toLatexVar(e, c.v);
  const dn = evalSafe(derive(N.num), a);
  const dd = evalSafe(derive(N.den), a);
  if (!Number.isFinite(dn) || !Number.isFinite(dd) || Math.abs(dd) < 1e-12) return null;
  const val = fin(dn / dd);
  const al = nice(a).latex;
  const xa = a === 0 ? c.v : L(add(X, num(asRational(-a, 100) ?? Q.rat(0))));
  const denIsLinear = (() => {
    const p = toPoly(N.den);
    return p && p.degree === 1;
  })();
  const u = `u(${c.v}) = ${L(N.num)}`;
  if (denIsLinear) {
    return {
      value: val,
      steps: [
        {
          title: 'Taux d’accroissement',
          text: `Avec $${u}$, on a $u(${al}) = 0$, donc ${L(N)}$ est${Math.abs(dd - 1) < 1e-12 ? '' : ' (à un facteur près)'} le taux d’accroissement $\\dfrac{u(${c.v}) - u(${al})}{${xa}}$. Sa limite est le nombre dérivé $u'(${al})$.`,
          math: `u'(${al}) = ${niceLatex(dn)} \\qquad \\text{donc} \\qquad ${lim(c)} ${L(N)} = \\frac{u'(${al})}{${niceLatex(dd)}} = ${valLatex(val)}`,
          formulas: ['l.taux'],
        },
      ],
    };
  }
  return {
    value: val,
    steps: [
      {
        title: 'Taux d’accroissement',
        text: `Numérateur $u$ et dénominateur $v$ s’annulent en $${al}$. On divise les deux par $${xa}$ : on obtient deux taux d’accroissement, qui tendent vers les nombres dérivés $u'(${al})$ et $v'(${al})$.`,
        math: `${lim(c)} ${L(N)} = ${lim(c)} \\frac{\\frac{u(${c.v}) - u(${al})}{${xa}}}{\\frac{v(${c.v}) - v(${al})}{${xa}}} = \\frac{u'(${al})}{v'(${al})} = \\frac{${niceLatex(dn)}}{${niceLatex(dd)}} = ${valLatex(val)}`,
        formulas: ['l.taux'],
      },
    ],
  };
}

// ——————————————————————————————————— Résolution

const OP_NAMES: Record<string, string> = {
  add: 'Par somme',
  mul: 'Par produit',
  div: 'Par quotient',
  pow: 'Par puissance',
  neg: 'Par opposé',
  fn: 'Par composition',
};

function explain(root: Expr, val: Val, c: Ctx): Step[] {
  const L = (e: Expr) => toLatexVar(e, c.v);
  const ops = children(root).filter(hasVar);
  if (!ops.length || c.over.has(root)) return [];
  const lines = ops.map((o) => {
    const r = c.cache.get(o) ?? c.over.get(o);
    return `${lim(c)} ${L(o)} = ${r && r.k !== 'fi' ? valLatex(r, true) : '?'}`;
  });
  let concl = '';
  if (root.type === 'fn') {
    const inner = c.cache.get(root.arg);
    const g = root.name === 'exp' ? '\\mathrm{e}^{X}' : root.name === 'ln' ? '\\ln X' : '\\sqrt{X}';
    concl = inner && inner.k !== 'fi' ? `\\lim_{X \\to ${valLatex(inner, true)}} ${g} = ${valLatex(val)}` : '';
  }
  return [
    {
      title: 'Limites de chaque partie',
      math: lines.length > 3 ? `\\begin{aligned} ${lines.map((l) => `& ${l}`).join(' \\\\ ')} \\end{aligned}` : lines.join(' \\qquad '),
      formulas: root.type === 'fn' ? ['l.comp'] : ['l.opsok'],
    },
    {
      title: OP_NAMES[root.type] ?? 'Conclusion',
      math: concl || `${lim(c)} ${L(root)} = ${valLatex(val)}`,
    },
  ];
}

/** Limite d'un côté (ou en ±∞). */
function solveSide(f: Expr, at: At, side: Side, v: string, steps: Step[], depth = 0): Val {
  const L = (e: Expr) => toLatexVar(e, v);
  // 1. Continuité
  if (typeof at === 'number') {
    const fa = evalSafe(f, at);
    const near = evalSafe(f, at + side * 1e-10);
    if (Number.isFinite(fa) && Number.isFinite(near) && Math.abs(near - fa) < 1e-4 * Math.max(1, Math.abs(fa))) {
      const shown = L(substitute(f, num(asRational(at, 100) ?? Q.fromDecimal(Number(at.toPrecision(10))))));
      steps.push({
        title: 'Continuité',
        text: `La fonction est définie en $${nice(at).latex}$ et continue (opérations sur des fonctions usuelles) : on remplace $${v}$ par $${nice(at).latex}$.`,
        math: `${lim({ at, side, v } as Ctx)} ${L(f)} = ${shown} = ${niceLatex(fa)}`,
      });
      return fin(fa);
    }
  }

  const c: Ctx = { at, side, v, over: new Map(), cache: new Map() };
  let expr = f;
  const seen = new Set<string>();
  for (let iter = 0; iter < 12; iter++) {
    c.cache = new Map();
    const r = ev(expr, c);
    if (r.k !== 'fi') {
      if (r.k === 'fin' || r.k === 'inf') steps.push(...explain(expr, r, c));
      return r;
    }
    // Forme indéterminée sur le nœud N : on remonte vers un quotient de polynômes englobant
    let N = r.node;
    const up = ancestors(expr, N);
    const ratAncestor = up.find((p) => p.type === 'div' && toPoly(p.num) && toPoly(p.den));
    if (ratAncestor) N = ratAncestor;
    const key = `${r.form}|${L(N)}`;
    if (!seen.has(key)) {
      steps.push({
        title: 'Forme indéterminée',
        text: `Pour $${L(N)}$, les règles d’opérations donnent la forme indéterminée $${r.form}$ : il faut transformer l’écriture.`,
        formulas: ['l.ops'],
      });
      seen.add(key);
    }
    const strategies = typeof at === 'number' ? [factorOut, conjugate, rateOfChange] : [leadingTerms, conjugate, dominant];
    let done = false;
    for (const strat of strategies) {
      const s = strat(N, c);
      if (!s) continue;
      steps.push(...s.steps);
      if ('value' in s) c.over.set(N, s.value);
      else expr = replaceNode(expr, N, s.rewrite);
      done = true;
      break;
    }
    if (done) continue;

    // Changement de variable vers +∞
    if (depth < 2 && at === '-inf') {
      const g = substitute(f, neg(X));
      steps.push({
        title: 'Changement de variable',
        text: `On pose $X = -${v}$ : quand $${v} \\to -\\infty$, $X \\to +\\infty$, et l’expression devient :`,
        math: `${toLatexVar(g, 'X')}`,
      });
      return solveSide(g, '+inf', 1, 'X', steps, depth + 1);
    }
    if (depth < 2 && at === 0) {
      const g = substitute(f, side > 0 ? div(num(1), X) : neg(div(num(1), X)));
      steps.push({
        title: 'Changement de variable',
        text: `On pose $X = ${side > 0 ? '' : '-'}\\frac{1}{${v}}$ : quand $${v} \\to 0^{${side > 0 ? '+' : '-'}}$, $X \\to +\\infty$, et l’expression devient :`,
        math: `${toLatexVar(g, 'X')}`,
      });
      return solveSide(g, '+inf', 1, 'X', steps, depth + 1);
    }
    return { k: 'unknown' };
  }
  return { k: 'unknown' };
}

/** Estimation numérique à partir du tableau de valeurs. */
function numericGuess(f: Expr, at: At, side: Side): Val {
  const vals = [4, 5, 6, 7].map((k) => evalSafe(f, sample(at, side, k)));
  if (vals.some((v) => Number.isNaN(v))) return { k: 'undef' };
  const [, , a, b] = vals;
  if (Math.abs(b) > 1e8 && Math.abs(b) >= Math.abs(a)) return inf(Math.sign(b));
  if (!Number.isFinite(b)) return inf(Math.sign(b));
  if (Math.abs(b - a) < 1e-4 * Math.max(1, Math.abs(b))) return { k: 'approx', v: b };
  return { k: 'unknown' };
}

function sameVal(a: Val, b: Val): boolean {
  if (a.k === 'fin' && b.k === 'fin') return Math.abs(a.v - b.v) < 1e-9 * Math.max(1, Math.abs(a.v));
  if (a.k === 'inf' && b.k === 'inf') return a.s === b.s;
  return false;
}

function formatNumber(v: number): string {
  if (Number.isNaN(v)) return 'non définie';
  if (!Number.isFinite(v)) return v > 0 ? 'très grand (+)' : 'très grand (−)';
  if (v !== 0 && (Math.abs(v) >= 1e7 || Math.abs(v) < 1e-5)) {
    const [m, e] = v.toExponential(4).split('e');
    const sup = e.replace('+', '').replace(/[-0-9]/g, (d) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(d)]);
    return `${Number(m)} × 10${sup}`;
  }
  return String(Number(v.toPrecision(8)));
}

function valuesTable(f: Expr, at: At, side: Side): { x: string; fx: string }[] {
  return [1, 2, 3, 4, 6].map((k) => {
    const x = sample(at, side, k);
    return { x: formatNumber(x), fx: formatNumber(evalSafe(f, x)) };
  });
}

/** Contrôle du résultat par le tableau de valeurs. */
function consistent(val: Val, f: Expr, at: At, side: Side): boolean {
  const g = numericGuess(f, at, side);
  if (val.k === 'fin') {
    if (g.k === 'approx' || g.k === 'fin') return Math.abs(g.v - val.v) < 1e-3 * Math.max(1, Math.abs(val.v));
    return g.k === 'unknown';
  }
  if (val.k === 'inf') return g.k === 'unknown' || (g.k === 'inf' && g.s === val.s) || (g.k === 'approx' && Math.sign(g.v) === val.s && Math.abs(g.v) > 1e3);
  return true;
}

export function solveLimit(f: Expr, point: LimitPoint): LimitReport {
  const statement = `\\lim_{x \\to ${atLatex(point.at, point.side)}} ${toLatexVar(f, 'x')}`;
  const sides: Side[] = typeof point.at === 'number' && point.side === 0 ? [1, -1] : [point.side === 0 ? 1 : point.side];
  const runs = sides.map((side) => {
    const steps: Step[] = [];
    let value = solveSide(f, point.at, side, 'x', steps);
    let warning: string | undefined;
    if (value.k === 'unknown' || value.k === 'undef') {
      const g = numericGuess(f, point.at, side);
      if (value.k === 'unknown' && g.k !== 'undef') {
        steps.push({
          title: 'Estimation numérique',
          text: 'Je n’ai pas trouvé de méthode du programme pour cette forme. Le tableau de valeurs ci-dessous suggère la limite indiquée, sans la démontrer.',
        });
        value = g;
      }
    } else if (!consistent(value, f, point.at, side)) {
      warning = 'Attention : le tableau de valeurs ne confirme pas ce résultat. Vérifie l’écriture de la fonction.';
    }
    return { side, steps, value, warning, table: valuesTable(f, point.at, side) };
  });

  if (runs.length === 1) {
    const r = runs[0];
    return { value: r.value, sections: [{ steps: r.steps }], table: r.table, warning: r.warning, statement };
  }

  // Point fini, des deux côtés
  const [right, left] = runs;
  const a = atLatex(point.at);
  const sections: LimitSection[] = [
    { title: `À droite ($x \\to ${a}^{+}$)`, steps: right.steps },
    { title: `À gauche ($x \\to ${a}^{-}$)`, steps: left.steps },
  ];
  const table = [...left.table.slice().reverse(), ...right.table];
  const warning = right.warning ?? left.warning;
  // Même raisonnement des deux côtés (fonction continue) : on n'affiche qu'une fois
  if (right.steps.length && right.steps[0].title === 'Continuité') return { value: right.value, sections: [{ steps: right.steps }], table, warning, statement };
  if (right.value.k === 'undef' && left.value.k !== 'undef') {
    return {
      value: left.value,
      sections: [{ title: `$f$ n’est définie qu’à gauche de $${a}$ : on calcule la limite à gauche.`, steps: left.steps }],
      table: left.table,
      warning,
      statement,
    };
  }
  if (left.value.k === 'undef' && right.value.k !== 'undef') {
    return {
      value: right.value,
      sections: [{ title: `$f$ n’est définie qu’à droite de $${a}$ : on calcule la limite à droite.`, steps: right.steps }],
      table: right.table,
      warning,
      statement,
    };
  }
  const unsided = (st: Step[]) => JSON.stringify(st).split(`${a}^{+}`).join(a).split(`${a}^{-}`).join(a);
  if (sameVal(right.value, left.value) && right.value.k === 'fin' && unsided(right.steps) === unsided(left.steps)) {
    const merged = JSON.parse(unsided(right.steps)) as Step[];
    return { value: right.value, sections: [{ steps: merged }], table, warning, statement };
  }
  if (sameVal(right.value, left.value)) {
    sections.push({ steps: [{ title: 'Conclusion', text: 'Les limites à gauche et à droite sont égales.', math: `${statement.replace(/\^\{[+-]\}/, '')} = ${valLatex(right.value)}` }] });
    return { value: right.value, sections, table, warning, statement };
  }
  const value: Val = right.value.k === 'unknown' || left.value.k === 'unknown' ? { k: 'unknown' } : { k: 'none' };
  sections.push({
    steps: [
      {
        title: 'Conclusion',
        text:
          value.k === 'none'
            ? `Les limites à gauche ($${valLatex(left.value)}$) et à droite ($${valLatex(right.value)}$) sont différentes : la fonction n’a pas de limite en $${a}$.${left.value.k === 'inf' || right.value.k === 'inf' ? ` La droite d’équation $x = ${a}$ est asymptote verticale.` : ''}`
            : 'Au moins une des deux limites n’a pas pu être déterminée.',
        formulas: left.value.k === 'inf' || right.value.k === 'inf' ? ['l.asym'] : undefined,
      },
    ],
  });
  return { value, sections, table, warning, statement };
}

// ——————————————————————————————————— Lecture du point

/** Lit « 14+ », « 14⁻ », « 2 », « +inf », « -∞ », « 0+ », « 1/2- », « e »… */
export function parsePoint(src: string, evalExpr: (s: string) => number): LimitPoint | null {
  const s = src.trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/⁺/g, '+').replace(/⁻/g, '-').replace(/\^/g, '');
  if (!s) return null;
  const inf = /^([+-]?)(∞|inf|infini|infinity|oo)$/i.exec(s);
  if (inf) return { at: inf[1] === '-' ? '-inf' : '+inf', side: 0 };
  let side: 0 | Side = 0;
  let body = s;
  const m = /^(.*[^+-])([+-])$/.exec(s);
  if (m) {
    body = m[1];
    side = m[2] === '+' ? 1 : -1;
  }
  const v = evalExpr(body);
  if (!Number.isFinite(v)) return null;
  return { at: v, side };
}

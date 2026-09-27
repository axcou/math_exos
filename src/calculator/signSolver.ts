import type { Expr } from '../core/expr/ast';
import { add, exp, isNum, ln, mul, num } from '../core/expr/build';
import { evaluate, hasVar } from '../core/expr/evaluate';
import { Poly } from '../core/expr/poly';
import * as Q from '../core/expr/rational';
import { asPoly } from '../core/expr/simplify';
import { toLatex } from '../core/expr/toLatex';
import type { Mark, Sign, SignRow, Step, TableData } from '../exercises/types';
import { asRational, nice } from './nice';

/*
 * Tableau de signes expliqué : on écrit f comme un produit / quotient de
 * facteurs dont on sait trouver le signe (affine, trinôme, exponentielle,
 * logarithme, racine…), on étudie chacun, puis on applique la règle des signes.
 */

export interface Root {
  v: number;
  latex: string;
}

export interface Interval {
  lo: number; // -Infinity possible
  hi: number;
  loLatex: string;
  hiLatex: string;
  /** Bornes incluses (f définie en ce point). */
  loIn: boolean;
  hiIn: boolean;
}

export interface SignReport {
  steps: Step[];
  table: TableData | null;
  domain: Interval | null;
  /** Valeurs de x du tableau (bornes comprises) et signe de f sur chaque intervalle. */
  xs: Root[];
  signs: Sign[];
  marks: Mark[];
  warning?: string;
}

const L = toLatex;

function evalSafe(e: Expr, x: number): number {
  try {
    return evaluate(e, x);
  } catch {
    return NaN;
  }
}

export function rootLatex(v: number): string {
  return nice(v).exact ? nice(v).latex : `\\approx ${nice(v).latex}`;
}

/** Racines numériques de g sur [lo, hi] (changements de signe). */
export function numericRoots(g: Expr, lo = -60, hi = 60): number[] {
  const a0 = Math.max(lo, -60);
  const b0 = Math.min(hi, 60);
  const N = 6000;
  const out: number[] = [];
  let px = a0 + 1e-9;
  let pv = evalSafe(g, px);
  for (let i = 1; i <= N; i++) {
    const x = a0 + ((b0 - a0) * i) / N - (i === N ? 1e-9 : 0);
    const v = evalSafe(g, x);
    if (Number.isFinite(v) && v === 0) out.push(x);
    else if (Number.isFinite(pv) && Number.isFinite(v) && pv !== 0 && Math.sign(pv) !== Math.sign(v)) {
      let a = px;
      let b = x;
      for (let k = 0; k < 80; k++) {
        const m = (a + b) / 2;
        const vm = evalSafe(g, m);
        if (!Number.isFinite(vm)) break;
        if (Math.sign(vm) === Math.sign(evalSafe(g, a))) a = m;
        else b = m;
      }
      const r = (a + b) / 2;
      // Un pôle (1/x) change aussi de signe : on ne garde que les vrais zéros
      if (Math.abs(evalSafe(g, r)) < 1e-6) out.push(r);
    }
    px = x;
    pv = v;
  }
  // Arrondi vers une valeur « propre » si possible
  return out.map((r) => {
    const q = asRational(r, 100);
    if (q && Math.abs(Q.toNumber(q) - r) < 1e-7) return Q.toNumber(q);
    return r;
  });
}

// ——————————————————————————————————— Polynômes

/** Racines rationnelles d'un polynôme (théorème des racines rationnelles, petits coefficients). */
function rationalRoots(p: Poly): Q.Rational[] {
  const lcm = p.c.reduce((m, c) => (m * c.d) / gcd(m, c.d), 1);
  const ints = p.c.map((c) => Math.round(Q.toNumber(c) * lcm));
  const out: Q.Rational[] = [];
  let k = 0;
  while (k < ints.length - 1 && ints[k] === 0) k++;
  if (k > 0) out.push(Q.ZERO);
  const a0 = Math.abs(ints[k]);
  const an = Math.abs(ints[ints.length - 1]);
  if (a0 > 5000 || an > 5000) return out;
  for (const pDiv of divisors(a0)) {
    for (const qDiv of divisors(an)) {
      for (const s of [1, -1]) {
        const r = Q.rat(s * pDiv, qDiv);
        if (Q.isZero(p.evalQ(r)) && !out.some((o) => Q.eq(o, r))) out.push(r);
      }
    }
  }
  return out.sort((a, b) => Q.toNumber(a) - Q.toNumber(b));
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function divisors(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out.length ? out : [1];
}

function divideByRoot(p: Poly, a: Q.Rational): Poly {
  const n = p.degree;
  const out: Q.Rational[] = Array(n).fill(Q.ZERO);
  let carry = Q.ZERO;
  for (let k = n; k >= 1; k--) {
    carry = Q.add(Q.mul(carry, a), p.coef(k));
    out[k - 1] = carry;
  }
  return new Poly(out);
}

/** √Δ simplifié pour Δ entier positif : [k, m] avec √Δ = k√m. */
function sqrtParts(n: number): [number, number] {
  let k = 1;
  let m = n;
  for (let f = 2; f * f <= m; f++) {
    while (m % (f * f) === 0) {
      m /= f * f;
      k *= f;
    }
  }
  return [k, m];
}

/** Racines d'un trinôme ax²+bx+c à coefficients entiers, en écriture exacte. */
function quadRoots(p: Poly): { delta: Q.Rational; roots: Root[] } {
  const [b, a] = [p.coef(1), p.coef(2)];
  const delta = p.discriminant();
  const dn = Q.toNumber(delta);
  if (dn < 0) return { delta, roots: [] };
  const A = Q.toNumber(a);
  const B = Q.toNumber(b);
  if (dn === 0) {
    const r = Q.div(Q.neg(b), Q.mul(Q.rat(2), a));
    return { delta, roots: [{ v: Q.toNumber(r), latex: Q.toLatex(r) }] };
  }
  const sq = Math.sqrt(dn);
  const vals = [(-B - sq) / (2 * A), (-B + sq) / (2 * A)].sort((u, v) => u - v);
  const rq = asRational(sq, 1);
  if (rq || (delta.d === 1 && Number.isInteger(Math.sqrt(delta.n)))) {
    return { delta, roots: vals.map((v) => ({ v, latex: nice(v).latex })) };
  }
  // Racines irrationnelles : (−b ± k√m) / (2a), avec coefficients entiers si possible
  if (delta.d === 1 && Q.isInt(a) && Q.isInt(b)) {
    const [k, m] = sqrtParts(delta.n);
    let nb = -b.n;
    let kk = k;
    let den = 2 * a.n;
    const g = gcd(gcd(nb, kk), den);
    nb /= g;
    kk /= g;
    den /= g;
    if (den < 0) {
      nb = -nb;
      den = -den;
      kk = -kk;
    }
    const rad = `${Math.abs(kk) === 1 ? '' : Math.abs(kk)}\\sqrt{${m}}`;
    const mk = (s: number) => {
      const sign = s * Math.sign(kk) < 0 ? '-' : '+';
      const top = nb === 0 ? `${sign === '-' ? '-' : ''}${rad}` : `${nb} ${sign} ${rad}`;
      return den === 1 ? top : `\\frac{${top}}{${den}}`;
    };
    const both = [mk(-1), mk(1)].map((latex, i) => ({ latex, v: [(nb - Math.abs(kk) * Math.sqrt(m)) / den, (nb + Math.abs(kk) * Math.sqrt(m)) / den][i] }));
    return { delta, roots: both.sort((u, v) => u.v - v.v) };
  }
  return { delta, roots: vals.map((v) => ({ v, latex: rootLatex(v) })) };
}

// ——————————————————————————————————— Factorisation

interface Factor {
  e: Expr;
  pow: number; // < 0 : au dénominateur
}

function factorize(e: Expr): { k: number; list: Factor[] } {
  let k = 1;
  const list: Factor[] = [];
  const push = (f: Expr, p: number) => {
    const existing = list.find((x) => L(x.e) === L(f));
    if (existing) existing.pow += p;
    else list.push({ e: f, pow: p });
  };
  const walk = (t: Expr, p: number) => {
    if (!hasVar(t)) {
      const v = evaluate(t, 0);
      k *= v ** p;
      return;
    }
    switch (t.type) {
      case 'neg':
        k *= (-1) ** Math.abs(p);
        return walk(t.arg, p);
      case 'mul':
        return t.factors.forEach((f) => walk(f, p));
      case 'div':
        walk(t.num, p);
        return walk(t.den, -p);
      case 'pow':
        if (isNum(t.exp) && Q.isInt(t.exp.value)) return walk(t.base, p * t.exp.value.n);
        return push(t, p);
      default: {
        const poly = asPoly(t);
        if (poly && poly.degree >= 3) {
          // Factorisation par les racines rationnelles
          let rest = poly;
          const roots = rationalRoots(poly);
          for (const r of roots) {
            while (rest.degree >= 1 && Q.isZero(rest.evalQ(r))) {
              push(new Poly([Q.neg(r), Q.ONE]).toExpr(), p);
              rest = divideByRoot(rest, r);
            }
          }
          if (roots.length) {
            if (rest.degree <= 0) k *= Q.toNumber(rest.coef(0)) ** p;
            else push(rest.toExpr(), p);
            return;
          }
        }
        if (poly && poly.degree === 1 && !Q.eq(poly.lead, Q.ONE) && Q.isZero(poly.coef(0))) {
          // a·x : on sort la constante
          k *= Q.toNumber(poly.lead) ** p;
          return push({ type: 'var' }, p);
        }
        return push(t, p);
      }
    }
  };
  walk(e, 1);
  return { k, list: list.filter((f) => f.pow !== 0) };
}

// ——————————————————————————————————— Étude d'un facteur

interface FactorStudy {
  label: string;
  roots: Root[];
  sign: (x: number) => number;
  step: Step;
  approximate?: boolean;
}

function study(f: Factor, domain: [number, number]): FactorStudy {
  const e = f.e;
  const power = Math.abs(f.pow);
  const even = power % 2 === 0;
  const base = L(e);
  const label = power === 1 ? base : `${e.type === 'add' || e.type === 'fn' ? `\\left(${base}\\right)` : base}^{${power}}`;
  const where = f.pow < 0 ? ' (au dénominateur : valeur interdite)' : '';
  const sign = (x: number) => {
    const v = evalSafe(e, x);
    return even ? (v === 0 ? 0 : 1) : Math.sign(v);
  };
  const evenNote = even ? ` Comme il est élevé à une puissance paire, $${label}$ est positif (et nul en ses racines).` : '';
  const poly = asPoly(e);

  if (poly && poly.degree === 1) {
    const r = Q.div(Q.neg(poly.coef(0)), poly.lead);
    const a = Q.toNumber(poly.lead);
    return {
      label,
      roots: [{ v: Q.toNumber(r), latex: Q.toLatex(r) }],
      sign,
      step: {
        title: `Signe de $${label}$${where}`,
        text: `$${base} = 0 \\iff x = ${Q.toLatex(r)}$. Le coefficient de $x$ vaut $${Q.toLatex(poly.lead)}$ : $${base}$ est ${a > 0 ? 'négatif puis positif' : 'positif puis négatif'}.${evenNote}`,
        formulas: ['v.affine'],
      },
    };
  }
  if (poly && poly.degree === 2) {
    const { delta, roots } = quadRoots(poly);
    const a = Q.toNumber(poly.lead);
    const dTxt = `\\Delta = ${pnq(poly.coef(1))}^2 - 4 \\times ${pnq(poly.coef(2))} \\times ${pnq(poly.coef(0))} = ${Q.toLatex(delta)}`;
    const rootsTxt =
      roots.length === 0
        ? `$\\Delta < 0$ : pas de racine, $${base}$ est du signe de $a = ${Q.toLatex(poly.lead)}$ pour tout $x$.`
        : roots.length === 1
          ? `$\\Delta = 0$ : une racine double $x_0 = ${roots[0].latex}$ ; $${base}$ est du signe de $a$ (et nul en $x_0$).`
          : `$\\Delta > 0$ : deux racines $x_1 = ${roots[0].latex}$ et $x_2 = ${roots[1].latex}$. Le trinôme est du signe de $a = ${Q.toLatex(poly.lead)}$ (${a > 0 ? 'positif' : 'négatif'}) à l’extérieur des racines, du signe contraire entre elles.`;
    return {
      label,
      roots,
      sign,
      step: { title: `Signe de $${label}$${where}`, math: dTxt, text: rootsTxt + evenNote, formulas: ['v.delta', 'v.trinome'] },
    };
  }
  if (e.type === 'var') {
    return {
      label,
      roots: [{ v: 0, latex: '0' }],
      sign,
      step: { title: `Signe de $${label}$${where}`, text: `$x$ est négatif puis positif, nul en $0$.${evenNote}` },
    };
  }
  if (e.type === 'fn' && e.name === 'exp') {
    return {
      label,
      roots: [],
      sign: () => 1,
      step: { title: `Signe de $${label}$`, text: `Une exponentielle est toujours strictement positive : $${label} > 0$.`, formulas: ['v.exp'] },
    };
  }
  if (e.type === 'fn' && e.name === 'sqrt') {
    const roots = rootsOf(e.arg, domain);
    return {
      label,
      roots: roots.roots,
      sign,
      approximate: roots.approximate,
      step: { title: `Signe de $${label}$${where}`, text: `Une racine carrée est positive ; elle est nulle quand $${L(e.arg)} = 0$${roots.roots.length ? `, c’est-à-dire en $${roots.roots.map((r) => r.latex).join(' ; ')}$` : ''}.` },
    };
  }
  if (e.type === 'fn' && e.name === 'ln') {
    const u1 = add(e.arg, num(-1));
    const roots = rootsOf(u1, domain);
    return {
      label,
      roots: roots.roots,
      sign,
      approximate: roots.approximate,
      step: {
        title: `Signe de $${label}$${where}`,
        text: `$\\ln(u) > 0 \\iff u > 1$ et $\\ln(u) = 0 \\iff u = 1$. Ici $${L(e.arg)} = 1$ ${roots.roots.length ? `pour $x = ${roots.roots.map((r) => r.latex).join('$ ou $x = ')}$` : 'n’a pas de solution sur le domaine'}.`,
        formulas: ['l.ln'],
      },
    };
  }
  // e^{u} − k, k − e^{u}, ln(u) − k : on se ramène à u
  const pattern = expOrLnMinusConst(e);
  if (pattern) {
    const roots = rootsOf(pattern.reduced, domain);
    return {
      label,
      roots: roots.roots,
      sign,
      approximate: roots.approximate,
      step: { title: `Signe de $${label}$${where}`, text: pattern.text + (roots.roots.length ? ` Racine : $x = ${roots.roots.map((r) => r.latex).join('$, $x = ')}$.` : ''), formulas: ['v.exp'] },
    };
  }
  // Cas général : racines numériques
  const roots = rootsOf(e, domain);
  return {
    label,
    roots: roots.roots,
    sign,
    approximate: roots.approximate,
    step: {
      title: `Signe de $${label}$${where}`,
      text: `On cherche où $${base}$ s’annule et change de signe${roots.roots.length ? ` : en $${roots.roots.map((r) => r.latex).join('$, $')}$` : ' : il ne s’annule pas'}. (Étude numérique : pour une rédaction complète, on étudierait les variations de cette expression.)`,
    },
  };
}

function pnq(r: Q.Rational): string {
  return r.n < 0 ? `(${Q.toLatex(r)})` : Q.toLatex(r);
}

/** Racines d'une expression : exactes pour un polynôme de degré ≤ 2 ou à racines rationnelles, numériques sinon. */
function rootsOf(u: Expr, domain: [number, number]): { roots: Root[]; approximate?: boolean } {
  const p = asPoly(u);
  const inDom = (r: Root) => r.v > domain[0] - 1e-12 && r.v < domain[1] + 1e-12;
  if (p && p.degree === 1) {
    const r = Q.div(Q.neg(p.coef(0)), p.lead);
    return { roots: [{ v: Q.toNumber(r), latex: Q.toLatex(r) }].filter(inDom) };
  }
  if (p && p.degree === 2) return { roots: quadRoots(p).roots.filter(inDom) };
  if (p && p.degree >= 3) {
    const rr = rationalRoots(p);
    let rest = p;
    for (const r of rr) while (rest.degree >= 1 && Q.isZero(rest.evalQ(r))) rest = divideByRoot(rest, r);
    const roots: Root[] = rr.map((r) => ({ v: Q.toNumber(r), latex: Q.toLatex(r) }));
    if (rest.degree === 2) roots.push(...quadRoots(rest).roots);
    if (rest.degree <= 2) return { roots: dedupe(roots).filter(inDom) };
  }
  const num = numericRoots(u, domain[0], domain[1]);
  return { roots: num.map((v) => ({ v, latex: rootLatex(v) })), approximate: num.some((v) => !nice(v).exact) };
}

function dedupe(rs: Root[]): Root[] {
  const out: Root[] = [];
  for (const r of rs.sort((a, b) => a.v - b.v)) if (!out.some((o) => Math.abs(o.v - r.v) < 1e-9)) out.push(r);
  return out;
}

function expOrLnMinusConst(e: Expr): { reduced: Expr; text: string } | null {
  if (e.type !== 'add' || e.terms.length !== 2) return null;
  const [a, b] = e.terms;
  const cst = !hasVar(a) ? a : !hasVar(b) ? b : null;
  const other = cst === a ? b : a;
  if (!cst) return null;
  const k = -evaluate(cst, 0); // e = other − k
  let s = 1;
  let core = other;
  if (other.type === 'mul' && isNum(other.factors[0]) && other.factors.length === 2) {
    s = Q.toNumber(other.factors[0].value);
    core = other.factors[1];
  } else if (other.type === 'neg') {
    s = -1;
    core = other.arg;
  }
  if (core.type !== 'fn' || core.name === 'sqrt') return null;
  const target = k / s; // core ⋛ target
  const kl = nice(target).latex;
  const t = asRational(target, 100) ?? Q.fromDecimal(Number(target.toPrecision(12)));
  if (core.name === 'exp') {
    if (target <= 0) return null;
    const lnL = target === 1 ? '0' : `\\ln(${kl})`;
    return {
      reduced: add(core.arg, mul(num(-1), ln(num(t)))),
      text: `$${L(e)}$ ${s > 0 ? 'est du signe de' : 'est du signe contraire de'} $\\mathrm{e}^{${L(core.arg)}} - ${kl}$, et $\\mathrm{e}^{${L(core.arg)}} > ${kl} \\iff ${L(core.arg)} > ${lnL}$ (la fonction exponentielle est strictement croissante).`,
    };
  }
  // ln(u) − k
  return {
    reduced: add(core.arg, mul(num(-1), exp(num(t)))),
    text: `$${L(e)}$ ${s > 0 ? 'est du signe de' : 'est du signe contraire de'} $\\ln(${L(core.arg)}) - ${kl}$, et $\\ln(${L(core.arg)}) > ${kl} \\iff ${L(core.arg)} > ${nice(Math.exp(target)).latex}$ (la fonction ln est strictement croissante).`,
  };
}

// ——————————————————————————————————— Domaine

/** Points où l'on doit regarder la définition : racines des arguments de ln et √ et des dénominateurs. */
function domainPoints(e: Expr): number[] {
  const pts: number[] = [];
  const walk = (t: Expr) => {
    if (t.type === 'fn' && (t.name === 'ln' || t.name === 'sqrt')) pts.push(...rootsOf(t.arg, [-1e9, 1e9]).roots.map((r) => r.v));
    if (t.type === 'div') pts.push(...rootsOf(t.den, [-1e9, 1e9]).roots.map((r) => r.v));
    if (t.type === 'pow' && isNum(t.exp) && Q.sign(t.exp.value) < 0) pts.push(...rootsOf(t.base, [-1e9, 1e9]).roots.map((r) => r.v));
    switch (t.type) {
      case 'add':
        return t.terms.forEach(walk);
      case 'mul':
        return t.factors.forEach(walk);
      case 'div':
        walk(t.num);
        return walk(t.den);
      case 'pow':
        walk(t.base);
        return walk(t.exp);
      case 'neg':
      case 'fn':
        return walk(t.arg);
    }
  };
  walk(e);
  return [...new Set(pts)].sort((a, b) => a - b);
}

const defined = (e: Expr, x: number) => Number.isFinite(evalSafe(e, x));

/** Domaine de définition (un seul intervalle, éventuellement privé de valeurs interdites). */
export function domainOf(e: Expr): { interval: Interval; holes: number[] } | null {
  const pts = domainPoints(e);
  const cuts = [-Infinity, ...pts, Infinity];
  const mids = cuts.slice(0, -1).map((a, i) => {
    const b = cuts[i + 1];
    return a === -Infinity && b === Infinity ? 0.5 : a === -Infinity ? b - 1 : b === Infinity ? a + 1 : (a + b) / 2;
  });
  const ok = mids.map((m) => defined(e, m));
  const first = ok.indexOf(true);
  const last = ok.lastIndexOf(true);
  if (first === -1) return null;
  for (let i = first; i <= last; i++) if (!ok[i]) return null; // plusieurs morceaux : non pris en charge
  const lo = cuts[first];
  const hi = cuts[last + 1];
  const holes = pts.filter((p) => p > lo && p < hi && !defined(e, p));
  return {
    interval: {
      lo,
      hi,
      loLatex: lo === -Infinity ? '-\\infty' : rootLatex(lo),
      hiLatex: hi === Infinity ? '+\\infty' : rootLatex(hi),
      loIn: Number.isFinite(lo) && defined(e, lo),
      hiIn: Number.isFinite(hi) && defined(e, hi),
    },
    holes,
  };
}

export function intervalLatex(i: Interval): string {
  return `${i.loIn ? '[' : ']'}${i.loLatex}\\,;\\,${i.hiLatex}${i.hiIn ? ']' : '['}`;
}

function domainLatex(d: { interval: Interval; holes: number[] }): string {
  const base = d.interval.lo === -Infinity && d.interval.hi === Infinity ? '\\mathbb{R}' : intervalLatex(d.interval);
  if (!d.holes.length) return base;
  return `${base} \\setminus \\left\\{${d.holes.map(rootLatex).join(' ; ')}\\right\\}`;
}

// ——————————————————————————————————— Résolution

export interface SignOptions {
  label?: string;
  /** Restreindre l'étude à cet intervalle (domaine de f pour le signe de f'). */
  restrict?: Interval;
}

export function solveSign(f: Expr, opts: SignOptions = {}): SignReport {
  const label = opts.label ?? 'f(x)';
  const steps: Step[] = [];
  const dom = domainOf(f);
  if (!dom) {
    return { steps: [{ title: 'Domaine', text: 'Le domaine de définition n’est pas un intervalle (ou est vide) : ce cas n’est pas pris en charge.' }], table: null, domain: null, xs: [], signs: [], marks: [] };
  }
  let I = dom.interval;
  if (opts.restrict) {
    const r = opts.restrict;
    I = {
      lo: Math.max(I.lo, r.lo),
      hi: Math.min(I.hi, r.hi),
      loLatex: r.lo > I.lo ? r.loLatex : I.loLatex,
      hiLatex: r.hi < I.hi ? r.hiLatex : I.hiLatex,
      loIn: r.lo > I.lo ? r.loIn : I.loIn && (r.lo < I.lo || r.loIn),
      hiIn: r.hi < I.hi ? r.hiIn : I.hiIn && (r.hi > I.hi || r.hiIn),
    };
  }
  const restricted = I.lo !== -Infinity || I.hi !== Infinity || dom.holes.length > 0;
  if (restricted && !opts.restrict) {
    steps.push({ title: 'Domaine de définition', text: `$${label.replace('(x)', '')}$ est définie sur $D = ${domainLatex({ interval: I, holes: dom.holes })}$.` });
  }

  const { k, list } = factorize(f);
  const studies = list.map((fc) => ({ fc, s: study(fc, [I.lo, I.hi]) }));
  if (list.length > 1 || k !== 1) {
    steps.push({
      title: 'Factorisation',
      text: `On écrit $${label} = ${L(f)}$ comme ${list.some((x) => x.pow < 0) ? 'un quotient' : 'un produit'} de facteurs dont on sait étudier le signe${k !== 1 ? ` (le facteur constant $${nice(k).latex}$ est ${k > 0 ? 'positif' : 'négatif'})` : ''}.`,
    });
  }
  for (const { s } of studies) steps.push(s.step);

  // Valeurs de x du tableau
  const inside = (v: number) => v > I.lo + 1e-12 && v < I.hi - 1e-12;
  const crit = dedupe([...studies.flatMap(({ s }) => s.roots), ...dom.holes.map((h) => ({ v: h, latex: rootLatex(h) }))].filter((r) => inside(r.v)));
  const xs: Root[] = [{ v: I.lo, latex: I.loLatex }, ...crit, { v: I.hi, latex: I.hiLatex }];
  const mids = xs.slice(0, -1).map((a, i) => {
    const b = xs[i + 1].v;
    return a.v === -Infinity && b === Infinity ? 0.5 : a.v === -Infinity ? Math.min(b - 1, b / 2 - 1) : b === Infinity ? a.v + 1 : (a.v + b) / 2;
  });
  const toSign = (v: number): Sign => (v >= 0 ? '+' : '-');
  const rows: SignRow[] = [];
  if (k < 0 && list.length) rows.push({ kind: 'sign', label: nice(k).latex, signs: mids.map(() => '-'), marks: xs.map(() => '') });
  for (const { fc, s } of studies) {
    rows.push({
      kind: 'sign',
      label: s.label,
      signs: mids.map((m) => toSign(s.sign(m))),
      marks: xs.map((x, i) => (i === 0 || i === xs.length - 1 ? '' : Math.abs(evalSafe(fc.e, x.v)) < 1e-9 ? (fc.pow < 0 ? '||' : '0') : '')),
    });
  }
  // Ligne résultat, contrôlée par l'évaluation directe
  const signs = mids.map((m) => toSign(Math.sign(k) * studies.reduce((acc, { s }) => acc * (s.sign(m) || 1), 1)));
  const marks: Mark[] = xs.map((x, i) => {
    if (i === 0 || i === xs.length - 1) return '';
    if (rows.some((r) => r.marks[i] === '||') || dom.holes.some((h) => Math.abs(h - x.v) < 1e-9)) return '||';
    if (rows.some((r) => r.marks[i] === '0')) return '0';
    return '';
  });
  let warning: string | undefined;
  mids.forEach((m, i) => {
    const v = evalSafe(f, m);
    if (Number.isFinite(v) && toSign(v) !== signs[i]) warning = 'Le tableau ne concorde pas avec l’évaluation de la fonction : vérifie la saisie.';
  });
  if (studies.some(({ s }) => s.approximate)) warning ??= 'Certaines valeurs sont approchées (étude numérique).';

  const resultRow: SignRow = { kind: 'sign', label, signs, marks };
  const table: TableData = {
    xs: xs.map((x) => x.latex),
    xv: xs.map((x) => x.v),
    rows: rows.length === 1 && k === 1 ? [{ ...resultRow }] : [...rows, resultRow],
  };
  steps.push({
    title: 'Tableau de signes',
    text: rows.length > 1 ? 'On place les valeurs remarquables, puis on applique la règle des signes colonne par colonne.' : undefined,
    table,
    formulas: rows.length > 1 ? ['v.prod'] : undefined,
  });

  // Conclusion
  const ivl = (i: number): string => {
    const a = xs[i];
    const b = xs[i + 1];
    const closedA = i === 0 ? I.loIn && Math.abs(evalSafe(f, a.v)) > 1e-12 : false;
    const closedB = i === xs.length - 2 ? I.hiIn && Math.abs(evalSafe(f, b.v)) > 1e-12 : false;
    return `${closedA ? '[' : ']'}${a.latex}\\,;\\,${b.latex}${closedB ? ']' : '['}`;
  };
  const pos = signs.map((s, i) => (s === '+' ? ivl(i) : null)).filter(Boolean);
  const neg = signs.map((s, i) => (s === '-' ? ivl(i) : null)).filter(Boolean);
  const zeros = xs.filter((_, i) => marks[i] === '0').map((x) => x.latex);
  const parts = [
    pos.length ? `$${label} > 0$ sur $${pos.join(' \\cup ')}$` : null,
    neg.length ? `$${label} < 0$ sur $${neg.join(' \\cup ')}$` : null,
    zeros.length ? `$${label} = 0$ pour $x \\in \\left\\{${zeros.join(' ; ')}\\right\\}$` : null,
  ].filter(Boolean);
  steps.push({ title: 'Conclusion', text: `${parts.join(', ')}.` });

  return { steps, table, domain: I, xs, signs, marks, warning };
}

/** Évaluation numérique utilisée par les tests et le calculateur de variations. */
export const valueAt = (e: Expr, x: number) => evalSafe(e, x);

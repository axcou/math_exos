import { equivalent, testPoints } from '../checking/check';
import type { Expr } from '../core/expr/ast';
import { add, div, exp, isNum, ln, mul, num, pow, sqrt, X } from '../core/expr/build';
import { derive } from '../core/expr/derive';
import { evaluate, hasVar } from '../core/expr/evaluate';
import * as Q from '../core/expr/rational';
import { asPoly, tidy } from '../core/expr/simplify';
import { toLatex } from '../core/expr/toLatex';
import type { Step } from '../exercises/types';

/*
 * Dérivation expliquée : on lit la structure de f (somme, produit, quotient,
 * composée…), on nomme u et v, on calcule u' et v' (en détaillant si besoin),
 * puis on applique la formule du cours et on simplifie.
 */

export interface DerivativeReport {
  f: Expr;
  df: Expr;
  steps: Step[];
  /** Le résultat simplifié a été contrôlé numériquement. */
  checked: boolean;
}

const L = toLatex;
const paren = (e: Expr) => (e.type === 'add' ? `\\left(${L(e)}\\right)` : L(e));

/** Produit affiché : on omet un facteur 1, on écrit × à côté d'un nombre ou d'une fraction. */
function times(a: Expr, b: Expr): string {
  if (isNum(a) && Q.eq(a.value, Q.ONE)) return L(b);
  if (isNum(b) && Q.eq(b.value, Q.ONE)) return L(a);
  const juxtapose = a.type === 'add' && b.type === 'add';
  return `${paren(a)}${juxtapose ? '' : ' \\times '}${paren(b)}`;
}

/** (e)' avec des parenthèses à la bonne taille. */
const prime = (e: Expr) => `\\left(${L(e)}\\right)'`;

/** Dérivée « immédiate » (sans étape dédiée) : constantes, ax+b, x^n, e^x, ln x, √x, 1/x. */
function immediate(e: Expr): boolean {
  if (!hasVar(e)) return true;
  const p = asPoly(e);
  if (p && p.degree <= 1) return true;
  if (p && p.c.filter((c) => !Q.isZero(c)).length === 1) return true; // a·x^n
  if (e.type === 'pow' && e.base.type === 'var' && isNum(e.exp)) return true;
  if (e.type === 'fn' && e.arg.type === 'var') return true;
  if (e.type === 'div' && !hasVar(e.num) && e.den.type === 'var') return true;
  return false;
}

interface Ctx {
  steps: Step[];
}

/** Dérivée de e ; pousse les étapes d'explication des nœuds non immédiats. */
function D(e: Expr, c: Ctx, name?: string): Expr {
  const d = tidy(derive(e));
  if (immediate(e)) return d;

  const title = name ? `Dérivée de $${name}(x) = ${L(e)}$` : `Dérivée de $${L(e)}$`;
  const p = asPoly(e);
  // Polynôme écrit sous forme développée : terme à terme (un produit de polynômes suit la formule du produit)
  if (p && e.type !== 'mul' && e.type !== 'pow' && e.type !== 'div') {
    const terms: string[] = [];
    for (let k = p.c.length - 1; k >= 0; k--) {
      if (Q.isZero(p.c[k])) continue;
      const t = asPoly(mul(num(p.c[k]), pow(X, k)))!;
      terms.push(`(${t.toLatex()})' = ${t.derive().toLatex()}`);
    }
    c.steps.push({
      title,
      text: 'Polynôme : on dérive terme à terme.',
      math: terms.length > 1 ? `${terms.join(' \\qquad ')} \\qquad \\Longrightarrow \\qquad ${prime(e)} = ${L(d)}` : `${prime(e)} = ${L(d)}`,
      formulas: ['d.sum', 'd.xn', 'd.const'],
    });
    return d;
  }

  switch (e.type) {
    case 'add': {
      const parts = e.terms.map((t) => ({ t, d: D(t, c) }));
      c.steps.push({
        title,
        text: 'Somme : la dérivée est la somme des dérivées de chaque terme.',
        math: `${parts.map((x) => `(${L(x.t)})' = ${L(x.d)}`).join(' \\qquad ')}`,
        formulas: ['d.sum'],
      });
      return tidy(add(...parts.map((x) => x.d)));
    }
    case 'neg': {
      const du = D(e.arg, c);
      return tidy(mul(num(-1), du));
    }
    case 'mul': {
      const coef = e.factors.filter((f) => !hasVar(f));
      const vars = e.factors.filter(hasVar);
      if (coef.length && vars.length === 1) {
        const k = mul(...coef);
        const u = vars[0];
        const du = D(u, c, 'u');
        const res = tidy(mul(k, du));
        c.steps.push({
          title,
          text: `$f = k \\times u$ avec $k = ${L(k)}$ et $u(x) = ${L(u)}$ : on multiplie la dérivée de $u$ par $k$.`,
          math: `${prime(e)} = ${L(k)} \\times ${paren(du)} = ${L(res)}`,
          formulas: ['d.scal'],
        });
        return res;
      }
      const u = mul(...coef, vars[0]);
      const v = vars.length === 2 ? vars[1] : mul(...vars.slice(1));
      const du = D(u, c, 'u');
      const dv = D(v, c, 'v');
      const raw = add(mul(du, v), mul(u, dv));
      const res = tidy(raw);
      c.steps.push({
        title,
        text: `Produit $u \\times v$ avec $u(x) = ${L(u)}$ et $v(x) = ${L(v)}$, donc $u'(x) = ${L(du)}$ et $v'(x) = ${L(dv)}$.`,
        math: `${prime(e)} = u'v + uv' = ${times(du, v)} + ${times(u, dv)} = ${L(res)}`,
        formulas: ['d.prod'],
      });
      return res;
    }
    case 'div': {
      const u = e.num;
      const v = e.den;
      const dv = D(v, c, 'v');
      if (!hasVar(u)) {
        const res = tidy(div(mul(num(-1), u, dv), pow(v, 2)));
        c.steps.push({
          title,
          text: `$f = \\dfrac{k}{v}$ avec $k = ${L(u)}$ et $v(x) = ${L(v)}$, donc $v'(x) = ${L(dv)}$.`,
          math: `${prime(e)} = -\\frac{k\\,v'}{v^2} = -\\frac{${L(u)} \\times ${paren(dv)}}{${paren(v)}^{2}} = ${L(res)}`,
          formulas: ['d.invu'],
        });
        return res;
      }
      const du = D(u, c, 'u');
      const numer = tidy(add(mul(du, v), mul(num(-1), u, dv)));
      const res = tidy(div(numer, pow(v, 2)));
      c.steps.push({
        title,
        text: `Quotient $\\dfrac{u}{v}$ avec $u(x) = ${L(u)}$ et $v(x) = ${L(v)}$, donc $u'(x) = ${L(du)}$ et $v'(x) = ${L(dv)}$.`,
        math: `${prime(e)} = \\frac{u'v - uv'}{v^2} = \\frac{${times(du, v)} - ${times(u, dv)}}{${paren(v)}^{2}} = ${L(res)}`,
        formulas: ['d.quot'],
      });
      return res;
    }
    case 'pow': {
      if (hasVar(e.exp)) {
        const rewritten = exp(mul(e.exp, ln(e.base)));
        c.steps.push({ title, text: `On écrit $${L(e)} = ${L(rewritten)}$ (car $a^b = \\mathrm{e}^{b \\ln a}$).` });
        return D(rewritten, c);
      }
      const n = e.exp;
      const u = e.base;
      const du = D(u, c, 'u');
      const res = tidy(mul(n, du, pow(u, add(n, num(-1)))));
      c.steps.push({
        title,
        text: `$f = u^{${L(n)}}$ avec $u(x) = ${L(u)}$ et $u'(x) = ${L(du)}$.`,
        math: `${prime(e)} = ${L(n)}\\,u'\\,u^{${L(tidy(add(n, num(-1))))}} = ${L(res)}`,
        formulas: ['d.un'],
      });
      return res;
    }
    case 'fn': {
      const u = e.arg;
      const du = D(u, c, 'u');
      if (e.name === 'exp') {
        const res = tidy(mul(du, e));
        c.steps.push({
          title,
          text: `$f = \\mathrm{e}^{u}$ avec $u(x) = ${L(u)}$ et $u'(x) = ${L(du)}$.`,
          math: `${prime(e)} = u'\\,\\mathrm{e}^{u} = ${L(res)}`,
          formulas: ['d.expu'],
        });
        return res;
      }
      if (e.name === 'ln') {
        const res = tidy(div(du, u));
        c.steps.push({
          title,
          text: `$f = \\ln(u)$ avec $u(x) = ${L(u)}$ et $u'(x) = ${L(du)}$ (là où $u > 0$).`,
          math: `${prime(e)} = \\frac{u'}{u} = ${L(res)}`,
          formulas: ['d.lnu'],
        });
        return res;
      }
      const res = tidy(div(du, mul(num(2), sqrt(u))));
      c.steps.push({
        title,
        text: `$f = \\sqrt{u}$ avec $u(x) = ${L(u)}$ et $u'(x) = ${L(du)}$ (là où $u > 0$).`,
        math: `${prime(e)} = \\frac{u'}{2\\sqrt{u}} = ${L(res)}`,
        formulas: ['d.sqrtu'],
      });
      return res;
    }
    default:
      return d;
  }
}

/** Dérivées des fonctions de référence, pour l'étape « immédiate ». */
function referenceStep(e: Expr, d: Expr): Step {
  const ids: string[] = [];
  if (e.type === 'fn') ids.push(e.name === 'exp' ? 'd.exp' : e.name === 'ln' ? 'd.ln' : 'd.sqrt');
  else if (e.type === 'div') ids.push('d.inv');
  else ids.push('d.xn', 'd.scal', 'd.const');
  return { title: 'Dérivée de référence', math: `${prime(e)} = ${L(d)}`, formulas: ids };
}

export function solveDerivative(f: Expr): DerivativeReport {
  const steps: Step[] = [];
  const c: Ctx = { steps };
  let df = D(f, c);
  if (immediate(f)) steps.push(referenceStep(f, df));

  // Contrôle : le résultat simplifié doit coïncider avec la dérivée brute
  const raw = derive(f);
  const pts = testPoints(raw, [-4, 4], 12).concat(testPoints(raw, [0.1, 6], 8));
  let checked = pts.length > 0 && equivalent(df, raw, pts);
  if (!checked && pts.length) {
    df = raw;
    checked = true;
  }
  steps.push({ title: 'Conclusion', math: `f'(x) = ${L(df)}` });
  return { f, df, steps, checked };
}

/** Valeur de f'(a) (pour les calculateurs et les tests). */
export const derivativeAt = (f: Expr, a: number) => evaluate(derive(f), a);

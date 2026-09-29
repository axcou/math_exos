import type { Expr } from '../../core/expr/ast';
import { add, div, exp, ln, mul, num, pow, X } from '../../core/expr/build';
import { L, pn } from '../helpers';
import type { Question, Step, Template, ValueAnswer } from '../types';
import { type Axis, factorRow, makeTable, variationRow } from './table';

/**
 * Étude complète, comme en TD : « On considère g : ℝ → ℝ, x ↦ eˣ − x − 1.
 * 1. Limites aux bornes. 2. Variations. 3. Signe de g(x). »
 * Le signe se déduit du minimum m (≥ 0) : g(x) ≥ m, avec égalité seulement au minimum.
 */
interface Family {
  g: Expr;
  dg: Expr;
  /** Domaine : ℝ ou ]0 ; +∞[. */
  positive: boolean;
  x0: number;
  dgValue: (x: number) => number;
  /** Limite à gauche du domaine (en −∞ ou en 0⁺). */
  left: ValueAnswer;
  leftWhy: string;
  rightWhy: string;
  derivWhy: string;
  signWhy: string;
  minWhy: string;
  formulas: string[];
}

const PLUS_INF: ValueAnswer = { kind: 'infinity', sign: 1 };
const finite = (n: number): ValueAnswer => ({ kind: 'finite', expr: num(n), latex: String(n) });

function family(form: number, k: number, a: number): Family {
  const m = k; // valeur du minimum
  switch (form) {
    case 0: {
      // e^{x−a} − x + a − 1 + k : minimum en a
      const e = a === 0 ? exp(X) : exp(add(X, num(-a)));
      const eL = a === 0 ? '\\mathrm{e}^{x}' : `\\mathrm{e}^{x ${a > 0 ? '-' : '+'} ${Math.abs(a)}}`;
      const c = a - 1 + k;
      return {
        g: add(e, mul(num(-1), X), num(c)),
        dg: add(e, num(-1)),
        positive: false,
        x0: a,
        dgValue: (x) => Math.exp(x - a) - 1,
        left: PLUS_INF,
        leftWhy: `En $-\\infty$ : $${eL} \\to 0$ et $-x \\to +\\infty$, donc par somme $\\lim_{x \\to -\\infty} g(x) = +\\infty$.`,
        rightWhy: `En $+\\infty$ : forme indéterminée « $\\infty - \\infty$ ». On factorise : $g(x) = ${eL}\\left(1 - \\frac{x}{${eL}}\\right) ${c ? `${c > 0 ? '+' : '-'} ${Math.abs(c)}` : ''}$ ; par croissances comparées $\\frac{x}{${eL}} \\to 0$, donc $\\lim_{x \\to +\\infty} g(x) = +\\infty$.`,
        derivWhy: `$g'(x) = ${eL} - 1$.`,
        signWhy: `$${eL} - 1 > 0 \\iff ${eL} > 1 \\iff ${a === 0 ? 'x > 0' : `x ${a > 0 ? '-' : '+'} ${Math.abs(a)} > 0 \\iff x > ${a}`}$ (la fonction exponentielle est strictement croissante et $\\mathrm{e}^0 = 1$).`,
        minWhy: `g(${a}) = \\mathrm{e}^{0} - ${pn(a)} ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = ${m}`,
        formulas: ['l.exp', 'l.cc', 'd.exp', 'v.var'],
      };
    }
    case 1: {
      // x − 1 − ln x + k sur ]0 ; +∞[ : minimum en 1
      return {
        g: add(X, num(k - 1), mul(num(-1), ln(X))),
        dg: div(add(X, num(-1)), X),
        positive: true,
        x0: 1,
        dgValue: (x) => (x - 1) / x,
        left: PLUS_INF,
        leftWhy: `En $0^+$ : $\\ln x \\to -\\infty$ donc $-\\ln x \\to +\\infty$, et $x ${k - 1 >= 0 ? '+' : '-'} ${Math.abs(k - 1)} \\to ${k - 1}$ : $\\lim_{x \\to 0^+} g(x) = +\\infty$.`,
        rightWhy: `En $+\\infty$ : forme indéterminée « $\\infty - \\infty$ ». On factorise : $g(x) = x\\left(1 - \\frac{\\ln x}{x}\\right) ${k - 1 >= 0 ? '+' : '-'} ${Math.abs(k - 1)}$ ; par croissances comparées $\\frac{\\ln x}{x} \\to 0$, donc $\\lim_{x \\to +\\infty} g(x) = +\\infty$.`,
        derivWhy: `$g'(x) = 1 - \\frac{1}{x} = \\frac{x - 1}{x}$.`,
        signWhy: 'Sur $]0\\,;\\,+\\infty[$, $x > 0$ : $g\'(x)$ est du signe de $x - 1$.',
        minWhy: `g(1) = 1 ${k - 1 >= 0 ? '+' : '-'} ${Math.abs(k - 1)} - \\ln 1 = ${m}`,
        formulas: ['l.ln', 'l.cc', 'd.ln', 'v.var'],
      };
    }
    case 2: {
      // x ln x − x + 1 + k sur ]0 ; +∞[ : minimum en 1
      return {
        g: add(mul(X, ln(X)), mul(num(-1), X), num(1 + k)),
        dg: ln(X),
        positive: true,
        x0: 1,
        dgValue: (x) => Math.log(x),
        left: finite(1 + k),
        leftWhy: `En $0^+$ : par croissances comparées $x \\ln x \\to 0$, et $-x \\to 0$ : $\\lim_{x \\to 0^+} g(x) = ${1 + k}$.`,
        rightWhy: `En $+\\infty$ : on factorise $g(x) = x(\\ln x - 1) + ${1 + k}$ ; $\\ln x - 1 \\to +\\infty$ donc $\\lim_{x \\to +\\infty} g(x) = +\\infty$.`,
        derivWhy: "Formule du produit pour $x \\ln x$ : $(x \\ln x)' = 1 \\times \\ln x + x \\times \\frac{1}{x} = \\ln x + 1$, donc $g'(x) = \\ln x + 1 - 1 = \\ln x$.",
        signWhy: '$\\ln x > 0 \\iff x > 1$ et $\\ln x < 0 \\iff 0 < x < 1$.',
        minWhy: `g(1) = 1 \\times \\ln 1 - 1 + ${1 + k} = ${m}`,
        formulas: ['l.cc', 'd.prod', 'd.ln', 'v.var'],
      };
    }
    case 4: {
      // x² − 2 ln x + k − 1 sur ]0 ; +∞[ : minimum en 1
      const c = k - 1;
      const cL = c ? ` ${c > 0 ? '+' : '-'} ${Math.abs(c)}` : '';
      return {
        g: add(pow(X, 2), mul(num(-2), ln(X)), num(c)),
        dg: div(add(mul(num(2), pow(X, 2)), num(-2)), X),
        positive: true,
        x0: 1,
        dgValue: (x) => (2 * x * x - 2) / x,
        left: PLUS_INF,
        leftWhy: `En $0^+$ : $x^2 \\to 0$ et $\\ln x \\to -\\infty$ donc $-2\\ln x \\to +\\infty$ : $\\lim_{x \\to 0^+} g(x) = +\\infty$.`,
        rightWhy: `En $+\\infty$ : forme indéterminée « $\\infty - \\infty$ ». On factorise : $g(x) = x^2\\left(1 - 2\\frac{\\ln x}{x^2}\\right)${cL}$ ; par croissances comparées $\\frac{\\ln x}{x^2} \\to 0$, donc $\\lim_{x \\to +\\infty} g(x) = +\\infty$.`,
        derivWhy: "$g'(x) = 2x - \\frac{2}{x} = \\frac{2x^2 - 2}{x} = \\frac{2(x - 1)(x + 1)}{x}$.",
        signWhy: "Sur $]0\\,;\\,+\\infty[$, $x > 0$ et $x + 1 > 0$ : $g'(x)$ est du signe de $x - 1$.",
        minWhy: `g(1) = 1 - 2\\ln 1${cL} = ${m}`,
        formulas: ['l.ln', 'l.cc', 'd.xn', 'd.ln', 'v.var'],
      };
    }
    default: {
      // (x − 1)eˣ + 1 + k sur ℝ : minimum en 0
      return {
        g: add(mul(add(X, num(-1)), exp(X)), num(1 + k)),
        dg: mul(X, exp(X)),
        positive: false,
        x0: 0,
        dgValue: (x) => x * Math.exp(x),
        left: finite(1 + k),
        leftWhy: `En $-\\infty$ : $(x - 1)\\mathrm{e}^{x} = x\\mathrm{e}^{x} - \\mathrm{e}^{x}$ ; par croissances comparées $x\\mathrm{e}^{x} \\to 0$, et $\\mathrm{e}^{x} \\to 0$ : $\\lim_{x \\to -\\infty} g(x) = ${1 + k}$.`,
        rightWhy: `En $+\\infty$ : $x - 1 \\to +\\infty$ et $\\mathrm{e}^{x} \\to +\\infty$, donc par produit puis somme $\\lim_{x \\to +\\infty} g(x) = +\\infty$.`,
        derivWhy: "Formule du produit : $g'(x) = 1 \\times \\mathrm{e}^{x} + (x - 1)\\mathrm{e}^{x} = x\\,\\mathrm{e}^{x}$.",
        signWhy: '$\\mathrm{e}^{x} > 0$ : $g\'(x)$ est du signe de $x$.',
        minWhy: `g(0) = (0 - 1)\\mathrm{e}^{0} + ${1 + k} = ${m}`,
        formulas: ['l.cc', 'l.exp', 'd.prod', 'd.exp', 'v.var'],
      };
    }
  }
}

const limLatex = (positive: boolean) => (positive ? '\\lim_{x \\to 0^+} g(x) =' : '\\lim_{x \\to -\\infty} g(x) =');
const answerLatex = (v: ValueAnswer) => (v.kind === 'infinity' ? (v.sign > 0 ? '+\\infty' : '-\\infty') : v.kind === 'finite' ? v.latex : '');

const V13: Template = {
  code: 'V13',
  theme: 'variation',
  difficulty: 3,
  subtype: 'etude-complete',
  title: 'Étude complète d’une fonction',
  variants: 5,
  generate(rng, variant) {
    const form = variant ?? rng.int(0, 4);
    // Minimum nul le plus souvent (g ≥ 0, comme eˣ ≥ x + 1), sinon strictement positif
    const k = rng.bool(0.5) ? 0 : rng.int(1, 4);
    const a = form === 0 ? rng.pick([0, 0, 1, -1, 2, -2, 3]) : 0;
    const F = family(form, k, a);
    const D = F.positive ? ']0\\,;\\,+\\infty[' : '\\mathbb{R}';
    const lo = F.positive ? { value: 0, latex: '0' } : undefined;
    const vAxis: Axis = { xs: [F.x0], xsLatex: [String(F.x0)], lo };
    const dRow = factorRow(vAxis, { label: "g'(x)", f: F.dgValue });
    const vTable = makeTable(vAxis, [dRow, variationRow('g', dRow, [answerLatex(F.left), String(k), '+\\infty'])]);
    const sAxis: Axis = k === 0 ? { xs: [F.x0], xsLatex: [String(F.x0)], lo } : { xs: [], xsLatex: [], lo };
    const sTable = makeTable(sAxis, [factorRow(sAxis, { label: 'g(x)', f: (x) => (k === 0 ? (x - F.x0) ** 2 : 1) })]);
    const gL = L(F.g);
    const where = F.positive ? '$0$ (à droite)' : '$-\\infty$';

    const questions: Question[] = [
      {
        id: 'q1',
        type: 'value',
        prompt: `Déterminer la limite de $g$ en ${where}.`,
        label: limLatex(F.positive),
        expected: F.left,
        mistakes: F.left.kind === 'finite' ? [{ answer: { kind: 'finite', expr: num(0), latex: '0' }, message: 'N’oublie pas la constante : seule la partie qui tend vers $0$ disparaît.' }] : undefined,
      },
      {
        id: 'q2',
        type: 'value',
        prompt: 'Déterminer la limite de $g$ en $+\\infty$.',
        label: '\\lim_{x \\to +\\infty} g(x) =',
        expected: PLUS_INF,
        mistakes: [{ answer: { kind: 'infinity', sign: -1 }, message: 'Forme indéterminée : factorise par le terme qui l’emporte (croissances comparées).' }],
      },
      { id: 'q3', type: 'expression', prompt: "Calculer $g'(x)$.", label: "g'(x) =", expected: F.dg, expectedLatex: L(F.dg), domain: F.positive ? [0.2, 5] : [-3, 3] },
      { id: 'q4', type: 'table', prompt: 'Étudier les variations de $g$ (tableau de variations, limites comprises).', expected: vTable },
      { id: 'q5', type: 'table', prompt: 'En déduire le signe de $g(x)$ suivant les valeurs de $x$.', expected: sTable },
    ];
    const steps: Step[] = [
      { title: 'Limites aux bornes', text: `${F.leftWhy} ${F.rightWhy}`, formulas: F.formulas.filter((f) => f.startsWith('l.')) },
      { title: 'Dérivée', text: F.derivWhy, formulas: F.formulas.filter((f) => f.startsWith('d.')) },
      { title: "Signe de g'(x)", text: `${F.signWhy} Donc $g$ est décroissante sur $${F.positive ? `]0\\,;\\,${F.x0}]` : `]-\\infty\\,;\\,${F.x0}]`}$ et croissante sur $[${F.x0}\\,;\\,+\\infty[$.` },
      { title: 'Minimum', math: F.minWhy },
      { title: 'Tableau de variations', table: vTable, formulas: ['v.var'] },
      {
        title: 'Signe de g(x)',
        text:
          k === 0
            ? `Le minimum de $g$ sur $${D}$ vaut $0$, atteint en $x = ${F.x0}$ : pour tout $x$, $g(x) \\geq 0$, et $g(x) = 0$ seulement pour $x = ${F.x0}$.`
            : `Le minimum de $g$ sur $${D}$ vaut $${k} > 0$ : pour tout $x$, $g(x) \\geq ${k} > 0$, donc $g$ est strictement positive.`,
        table: sTable,
      },
    ];
    // Présentation du TD : « g : D → ℝ » puis « x ↦ … » en dessous
    const def = `\\begin{array}{rrcl} g : & ${D} & \\longrightarrow & \\mathbb{R} \\\\ & x & \\longmapsto & ${gL} \\end{array}`;
    return {
      statement: `On considère la fonction $${def}$`,
      lead: 'Pour chacune des fonctions suivantes, répondre aux questions.',
      item: `$${def}$`,
      questions,
      steps,
      meta: [
        { kind: 'derivative', f: F.g, df: F.dg, domain: F.positive ? [0.2, 5] : [-3, 3] },
        { kind: 'table', f: F.g, df: F.dg },
      ],
    };
  },
};

export const STUDY_TEMPLATES: Template[] = [V13];

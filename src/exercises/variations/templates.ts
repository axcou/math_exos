import type { Expr } from '../../core/expr/ast';
import { add, div, exp, ln, mul, num, pow, X } from '../../core/expr/build';
import { Poly } from '../../core/expr/poly';
import * as Q from '../../core/expr/rational';
import { L, pn, R } from '../helpers';
import type { ExerciseDraft, ExpressionQuestion, Question, RootsQuestion, Step, TableData, TableQuestion, Template, ValueQuestion } from '../types';
import { type Axis, factorRow, makeTable, productRow, signTable, variationRow } from './table';

const tableQ = (id: string, expected: TableData, prompt: string): TableQuestion => ({
  id,
  type: 'table',
  prompt,
  expected,
});

const derivQ = (id: string, df: Expr, domain: [number, number]): ExpressionQuestion => ({
  id,
  type: 'expression',
  prompt: "Calcule $f'(x)$.",
  label: "f'(x) =",
  expected: df,
  expectedLatex: L(df),
  domain,
});

const rootsQ = (id: string, prompt: string, values: number[], latex: string[]): RootsQuestion => ({
  id,
  type: 'roots',
  prompt,
  expected: values,
  expectedLatex: latex,
});

const extremumQ = (id: string, kind: 'minimum' | 'maximum', value: Expr): ValueQuestion => ({
  id,
  type: 'value',
  prompt: `Quelle est la valeur du ${kind} de $f$ ?`,
  label: `\\text{${kind}} =`,
  expected: { kind: 'finite', expr: value, latex: L(value) },
});

function draft(statement: string, questions: Question[], steps: Step[], f: Expr, df?: Expr): ExerciseDraft {
  return { statement, questions, steps, meta: [{ kind: 'table', f, df }] };
}

// ——————————————————————————————————— Niveau 1

const V01: Template = {
  code: 'V01',
  theme: 'variation',
  difficulty: 1,
  subtype: 'signe-affine',
  title: "Signe d'une fonction affine",
  generate(rng) {
    const a = rng.nonZero(-5, 5);
    const b = rng.nonZero(-8, 8);
    const p = Poly.fromHigh(a, b);
    const x0 = Q.rat(-b, a);
    const axis: Axis = { xs: [Q.toNumber(x0)], xsLatex: [R(x0)] };
    const table = signTable(axis, [{ label: 'f(x)', f: (x) => p.eval(x) }], 'f(x)');
    return draft(
      `Étudier le signe de la fonction $f$ définie sur $\\mathbb{R}$ par $f(x) = ${p.toLatex()}$.`,
      [rootsQ('q1', 'Résous $f(x) = 0$.', [Q.toNumber(x0)], [R(x0)]), tableQ('q2', table, 'Complète le tableau de signes.')],
      [
        { title: 'Racine', math: `${p.toLatex()} = 0 \\iff x = \\frac{${-b}}{${a}} = ${R(x0)}`, formulas: ['v.affine'] },
        {
          title: 'Signe',
          text: `Le coefficient directeur $a = ${a}$ est ${a > 0 ? 'positif' : 'négatif'} : $f$ est ${a > 0 ? 'négative puis positive' : 'positive puis négative'} (signe de $a$ **après** la racine).`,
        },
        { title: 'Tableau de signes', table },
      ],
      p.toExpr(),
    );
  },
};

const V02: Template = {
  code: 'V02',
  theme: 'variation',
  difficulty: 1,
  subtype: 'signe-trinome',
  title: "Signe d'un trinôme",
  generate(rng) {
    const a = rng.nonZero(-3, 3);
    if (rng.bool(0.2)) {
      // Discriminant négatif : signe constant
      const alpha = rng.int(-3, 3);
      const beta = Math.sign(a) * rng.int(1, 6);
      const p = Poly.fromHigh(a, -2 * a * alpha, a * alpha * alpha + beta);
      const delta = p.discriminant();
      const table = signTable({ xs: [], xsLatex: [] }, [{ label: 'f(x)', f: (x) => p.eval(x) }], 'f(x)');
      return draft(
        `Étudier le signe de $f(x) = ${p.toLatex()}$ sur $\\mathbb{R}$.`,
        [rootsQ('q1', "Résous $f(x) = 0$ (écris « aucune » s'il n'y a pas de solution).", [], []), tableQ('q2', table, 'Complète le tableau de signes.')],
        [
          { title: 'Discriminant', math: `\\Delta = ${pn(p.coef(1))}^2 - 4 \\times ${pn(a)} \\times ${pn(p.coef(0))} = ${R(delta)} < 0`, formulas: ['v.delta'] },
          { title: 'Signe', text: `Pas de racine : $f(x)$ est du signe de $a = ${a}$ pour tout réel $x$.`, formulas: ['v.trinome'] },
          { title: 'Tableau de signes', table },
        ],
        p.toExpr(),
      );
    }
    const x1 = rng.int(-5, 4);
    const x2 = rng.int(x1 + 1, 5);
    const p = Poly.fromRoots(a, [x1, x2]);
    const delta = p.discriminant();
    const table = signTable({ xs: [x1, x2], xsLatex: [String(x1), String(x2)] }, [{ label: 'f(x)', f: (x) => p.eval(x) }], 'f(x)');
    const b = p.coef(1);
    return draft(
      `Étudier le signe de $f(x) = ${p.toLatex()}$ sur $\\mathbb{R}$.`,
      [rootsQ('q1', 'Résous $f(x) = 0$.', [x1, x2], [String(x1), String(x2)]), tableQ('q2', table, 'Complète le tableau de signes.')],
      [
        { title: 'Discriminant', math: `\\Delta = ${pn(b)}^2 - 4 \\times ${pn(a)} \\times ${pn(p.coef(0))} = ${R(delta)} > 0`, formulas: ['v.delta'] },
        {
          title: 'Racines',
          math: `x_1 = \\frac{${R(Q.neg(b))} - \\sqrt{${R(delta)}}}{2 \\times ${pn(a)}} = ${a > 0 ? x1 : x2} \\qquad x_2 = \\frac{${R(Q.neg(b))} + \\sqrt{${R(delta)}}}{2 \\times ${pn(a)}} = ${a > 0 ? x2 : x1}`,
        },
        { title: 'Signe', text: `$f(x)$ est du signe de $a = ${a}$ (${a > 0 ? 'positif' : 'négatif'}) à l'extérieur des racines, et du signe contraire entre elles.`, formulas: ['v.trinome'] },
        { title: 'Tableau de signes', table },
      ],
      p.toExpr(),
    );
  },
};

const V03: Template = {
  code: 'V03',
  theme: 'variation',
  difficulty: 1,
  subtype: 'variations-trinome',
  title: "Variations d'un trinôme",
  generate(rng) {
    const a = rng.nonZero(-3, 3);
    const alpha = rng.int(-4, 4);
    const c = rng.int(-6, 6);
    const p = Poly.fromHigh(a, -2 * a * alpha, c);
    const dp = p.derive();
    const beta = p.evalQ(Q.rat(alpha));
    const axis: Axis = { xs: [alpha], xsLatex: [String(alpha)] };
    const dRow = factorRow(axis, { label: "f'(x)", f: (x) => dp.eval(x) });
    const table: TableData = makeTable(axis, [dRow, variationRow('f', dRow, [null, R(beta), null])]);
    const kind = a > 0 ? 'minimum' : 'maximum';
    return draft(
      `Dresser le tableau de variations de $f(x) = ${p.toLatex()}$ sur $\\mathbb{R}$.`,
      [derivQ('q1', dp.toExpr(), [-5, 5]), tableQ('q2', table, 'Complète le tableau de variations.'), extremumQ('q3', kind, num(beta))],
      [
        { title: 'Dérivée', math: `f'(x) = ${dp.toLatex()}`, formulas: ['d.xn', 'd.sum'] },
        { title: "Signe de f'(x)", math: `${dp.toLatex()} = 0 \\iff x = ${alpha}`, text: `$f'$ est affine de coefficient $${R(dp.lead)}$ : ${a > 0 ? 'négative puis positive' : 'positive puis négative'}.`, formulas: ['v.affine'] },
        { title: `Valeur du ${kind}`, math: `f(${alpha}) = ${R(beta)}`, formulas: ['v.sommet'] },
        { title: 'Tableau de variations', table, formulas: ['v.var'] },
      ],
      p.toExpr(),
      dp.toExpr(),
    );
  },
};

// ——————————————————————————————————— Niveau 2

const V04: Template = {
  code: 'V04',
  theme: 'variation',
  difficulty: 2,
  subtype: 'signe-produit-quotient',
  title: "Signe d'un produit ou d'un quotient",
  generate(rng) {
    const quotient = rng.bool();
    const a = rng.nonZero(-3, 3);
    const c = rng.nonZero(-3, 3);
    const r1 = rng.int(-5, 5);
    const r2 = rng.intExcept(-5, 5, [r1]);
    const u = Poly.fromHigh(a, -a * r1);
    const v = Poly.fromHigh(c, -c * r2);
    const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
    const axis: Axis = { xs: [lo, hi], xsLatex: [String(lo), String(hi)] };
    const table = signTable(
      axis,
      [
        { label: u.toLatex(), f: (x) => u.eval(x) },
        { label: v.toLatex(), f: (x) => v.eval(x), denominator: quotient },
      ],
      'f(x)',
    );
    const f = quotient ? div(u.toExpr(), v.toExpr()) : mul(u.toExpr(), v.toExpr());
    return draft(
      `Étudier le signe de $f(x) = ${L(f)}$${quotient ? ` sur $\\mathbb{R} \\setminus \\{${r2}\\}$` : ' sur $\\mathbb{R}$'}.`,
      [
        rootsQ('q1', `Donne les valeurs de $x$ qui annulent ${quotient ? 'le numérateur ou le dénominateur' : 'chaque facteur'}.`, [lo, hi], [String(lo), String(hi)]),
        tableQ('q2', table, 'Complète le tableau de signes.'),
      ],
      [
        {
          title: 'Racine de chaque facteur',
          math: `${u.toLatex()} = 0 \\iff x = ${r1} \\qquad ${v.toLatex()} = 0 \\iff x = ${r2}`,
          text: quotient ? `$${r2}$ annule le dénominateur : c'est une **valeur interdite** (double barre).` : undefined,
          formulas: ['v.affine'],
        },
        { title: 'Règle des signes', text: 'On étudie le signe de chaque facteur, puis on applique la règle des signes colonne par colonne.', formulas: ['v.prod'] },
        { title: 'Tableau de signes', table },
      ],
      f,
    );
  },
};

const V05: Template = {
  code: 'V05',
  theme: 'variation',
  difficulty: 2,
  subtype: 'variations-cubique',
  title: "Variations d'un polynôme de degré 3",
  generate(rng) {
    const x1 = rng.int(-4, 3);
    const x2 = rng.int(x1 + 1, 4);
    let k = rng.pick([-3, 3, -6, 6]);
    if (Math.abs(k) === 3 && (x1 + x2) % 2 !== 0) k *= 2;
    const c = rng.int(-5, 5);
    const p = new Poly([c, k * x1 * x2, Q.rat(-k * (x1 + x2), 2), Q.rat(k, 3)]);
    const dp = p.derive();
    const [v1, v2] = [p.evalQ(Q.rat(x1)), p.evalQ(Q.rat(x2))];
    const axis: Axis = { xs: [x1, x2], xsLatex: [String(x1), String(x2)] };
    const dRow = factorRow(axis, { label: "f'(x)", f: (x) => dp.eval(x) });
    const table: TableData = makeTable(axis, [dRow, variationRow('f', dRow, [null, R(v1), R(v2), null])]);
    const delta = dp.discriminant();
    return draft(
      `Dresser le tableau de variations de $f(x) = ${p.toLatex()}$ sur $\\mathbb{R}$.`,
      [
        derivQ('q1', dp.toExpr(), [-5, 5]),
        rootsQ('q2', "Résous $f'(x) = 0$.", [x1, x2], [String(x1), String(x2)]),
        tableQ('q3', table, 'Complète le tableau de variations.'),
      ],
      [
        { title: 'Dérivée', math: `f'(x) = ${dp.toLatex()}`, formulas: ['d.xn', 'd.sum'] },
        { title: "Racines de f'", math: `\\Delta = ${R(delta)} \\qquad x_1 = ${x1} \\qquad x_2 = ${x2}`, formulas: ['v.delta'] },
        { title: "Signe de f'", text: `$f'(x)$ est un trinôme du signe de $${k}$ à l'extérieur des racines.`, formulas: ['v.trinome'] },
        { title: 'Extremums', math: `f(${x1}) = ${R(v1)} \\qquad f(${x2}) = ${R(v2)}`, formulas: ['v.extr'] },
        { title: 'Tableau de variations', table, formulas: ['v.var'] },
      ],
      p.toExpr(),
      dp.toExpr(),
    );
  },
};

const V06: Template = {
  code: 'V06',
  theme: 'variation',
  difficulty: 2,
  subtype: 'variations-homographique',
  title: "Variations d'une fonction homographique",
  generate(rng) {
    const c = rng.nonZero(-3, 3);
    const r = rng.int(-4, 4);
    const d = -c * r;
    const a = rng.nonZero(-5, 5);
    let b = rng.int(-6, 6);
    if (a * d - b * c === 0) b += 1;
    const u = Poly.fromHigh(a, b);
    const v = Poly.fromHigh(c, d);
    const k = a * d - b * c;
    const df = div(num(k), pow(v.toExpr(), 2));
    const axis: Axis = { xs: [r], xsLatex: [String(r)] };
    const dRow = factorRow(axis, { label: "f'(x)", f: (x) => (Math.abs(x - r) < 1e-9 ? 0 : k / v.eval(x) ** 2), denominator: true });
    const table: TableData = makeTable(axis, [dRow, variationRow('f', dRow, [null, null, null])]);
    const f = div(u.toExpr(), v.toExpr());
    return draft(
      `Dresser le tableau de variations de $f(x) = ${L(f)}$ sur $\\mathbb{R} \\setminus \\{${r}\\}$.`,
      [derivQ('q1', df, [-6, 6]), tableQ('q2', table, 'Complète le tableau de variations.')],
      [
        { title: 'Dérivée', text: 'Formule du quotient :', math: `f'(x) = \\frac{${a}(${v.toLatex()}) - (${u.toLatex()}) \\times ${pn(c)}}{(${v.toLatex()})^2} = ${L(df)}`, formulas: ['d.quot'] },
        { title: "Signe de f'", text: `Le dénominateur est un carré, strictement positif pour $x \\neq ${r}$ : $f'(x)$ est du signe de $${k}$, donc ${k > 0 ? 'positive' : 'négative'}.` },
        { title: 'Tableau de variations', text: `$f$ est ${k > 0 ? 'croissante' : 'décroissante'} sur chacun des intervalles $]-\\infty\\,;\\,${r}[$ et $]${r}\\,;\\,+\\infty[$ (mais pas sur leur réunion !).`, table, formulas: ['v.var'] },
      ],
      f,
      df,
    );
  },
};

// ——————————————————————————————————— Niveau 3

const V07: Template = {
  code: 'V07',
  theme: 'variation',
  difficulty: 3,
  subtype: 'variations-exp',
  title: 'Variations avec l’exponentielle',
  generate(rng) {
    const a = rng.pick([-3, -2, -1, 1, 2, 3]);
    const x0 = rng.int(-3, 3);
    const b = -a * (x0 + 1);
    const u = Poly.fromHigh(a, b);
    const g = Poly.fromHigh(a, a + b);
    const f = mul(u.toExpr(), exp(X));
    const df = mul(g.toExpr(), exp(X));
    const ext = x0 === 0 ? num(-a) : mul(num(-a), exp(num(x0)));
    const axis: Axis = { xs: [x0], xsLatex: [String(x0)] };
    const gRow = factorRow(axis, { label: g.toLatex(), f: (x) => g.eval(x) });
    const eRow = factorRow(axis, { label: '\\mathrm{e}^{x}', f: (x) => Math.exp(x) });
    const dRow = productRow("f'(x)", [gRow, eRow]);
    const table: TableData = makeTable(axis, [gRow, eRow, dRow, variationRow('f', dRow, ['0', L(ext), a > 0 ? '+\\infty' : '-\\infty'])]);
    const kind = a > 0 ? 'minimum' : 'maximum';
    return draft(
      `Étudier les variations de $f(x) = ${L(f)}$ sur $\\mathbb{R}$, limites comprises.`,
      [derivQ('q1', df, [-3, 3]), tableQ('q2', table, 'Complète le tableau de variations.'), extremumQ('q3', kind, ext)],
      [
        { title: 'Dérivée', text: 'Formule du produit, puis factorisation par $\\mathrm{e}^x$ :', math: `f'(x) = ${a}\\,\\mathrm{e}^{x} + (${u.toLatex()})\\mathrm{e}^{x} = ${L(df)}`, formulas: ['d.prod', 'd.exp'] },
        { title: "Signe de f'", text: `$\\mathrm{e}^x > 0$, donc $f'(x)$ est du signe de $${g.toLatex()}$, qui s'annule en $${x0}$.`, formulas: ['v.exp', 'v.affine'] },
        { title: 'Limites', math: `\\lim_{x \\to -\\infty} f(x) = 0 \\qquad \\lim_{x \\to +\\infty} f(x) = ${a > 0 ? '+' : '-'}\\infty`, text: 'En $-\\infty$ : croissances comparées ($x\\,\\mathrm{e}^x \\to 0$ et $\\mathrm{e}^x \\to 0$). En $+\\infty$ : produit de limites.', formulas: ['l.cc'] },
        { title: `Valeur du ${kind}`, math: `f(${x0}) = (${a * x0 + b})\\mathrm{e}^{${x0}} = ${L(ext)}` },
        { title: 'Tableau de variations', table, formulas: ['v.var'] },
      ],
      f,
      df,
    );
  },
};

const V08: Template = {
  code: 'V08',
  theme: 'variation',
  difficulty: 3,
  subtype: 'variations-ln',
  title: 'Variations avec le logarithme',
  generate(rng) {
    const a = rng.int(1, 5);
    const b = rng.int(-4, 4);
    const f = add(X, mul(num(-a), ln(X)), num(b));
    const df = div(Poly.fromHigh(1, -a).toExpr(), X);
    const ext = a === 1 ? num(1 + b) : add(num(a + b), mul(num(-a), ln(num(a))));
    const axis: Axis = { xs: [a], xsLatex: [String(a)], lo: { value: 0, latex: '0' } };
    const nRow = factorRow(axis, { label: `x - ${a}`, f: (x) => x - a });
    const xRow = factorRow(axis, { label: 'x', f: (x) => x });
    const dRow = productRow("f'(x)", [nRow, xRow]);
    const table: TableData = makeTable(axis, [nRow, xRow, dRow, variationRow('f', dRow, ['+\\infty', L(ext), '+\\infty'])]);
    return draft(
      `Étudier les variations de $f(x) = ${L(f)}$ sur $]0\\,;\\,+\\infty[$, limites comprises.`,
      [derivQ('q1', df, [0.2, 6]), tableQ('q2', table, 'Complète le tableau de variations.'), extremumQ('q3', 'minimum', ext)],
      [
        { title: 'Dérivée', math: `f'(x) = 1 - \\frac{${a}}{x} = ${L(df)}`, formulas: ['d.ln', 'd.sum'] },
        { title: "Signe de f'", text: `Sur $]0\\,;\\,+\\infty[$, $x > 0$ : $f'(x)$ est du signe de $x - ${a}$.`, formulas: ['v.prod'] },
        {
          title: 'Limites',
          math: `\\lim_{x \\to 0^+} f(x) = +\\infty \\qquad \\lim_{x \\to +\\infty} f(x) = +\\infty`,
          text: `En $0^+$ : $\\ln x \\to -\\infty$ donc $-${a === 1 ? '' : a}\\ln x \\to +\\infty$. En $+\\infty$ : on factorise $f(x) = x\\left(1 - ${a === 1 ? '' : a}\\frac{\\ln x}{x}\\right) + ${pn(b)}$ et $\\frac{\\ln x}{x} \\to 0$ (croissances comparées).`,
          formulas: ['l.ln', 'l.cc'],
        },
        { title: 'Minimum', math: `f(${a}) = ${L(ext)}` },
        { title: 'Tableau de variations', table, formulas: ['v.var'] },
      ],
      f,
      df,
    );
  },
};

const V09: Template = {
  code: 'V09',
  theme: 'variation',
  difficulty: 3,
  subtype: 'variations-exp',
  title: 'Exponentielle et fonction affine',
  generate(rng) {
    const a = rng.int(1, 6);
    const b = rng.int(-4, 4);
    const f = add(exp(X), mul(num(-a), X), num(b));
    const df = add(exp(X), num(-a));
    const lnA = a === 1 ? num(0) : ln(num(a));
    const x0 = Math.log(a);
    const ext = a === 1 ? num(1 + b) : add(num(a + b), mul(num(-a), ln(num(a))));
    const axis: Axis = { xs: [x0], xsLatex: [L(lnA)] };
    const dRow = factorRow(axis, { label: "f'(x)", f: (x) => Math.exp(x) - a });
    const table: TableData = makeTable(axis, [dRow, variationRow('f', dRow, ['+\\infty', L(ext), '+\\infty'])]);
    return draft(
      `Étudier les variations de $f(x) = ${L(f)}$ sur $\\mathbb{R}$, limites comprises.`,
      [
        derivQ('q1', df, [-3, 3]),
        rootsQ('q2', "Résous $f'(x) = 0$.", [x0], [L(lnA)]),
        tableQ('q3', table, 'Complète le tableau de variations.'),
        extremumQ('q4', 'minimum', ext),
      ],
      [
        { title: 'Dérivée', math: `f'(x) = ${L(df)}`, formulas: ['d.exp', 'd.sum'] },
        { title: "Signe de f'", math: `\\mathrm{e}^{x} - ${a} > 0 \\iff \\mathrm{e}^{x} > ${a} \\iff x > ${L(lnA)}`, text: 'La fonction exponentielle est strictement croissante (et ln est sa réciproque).' },
        {
          title: 'Limites',
          math: `\\lim_{x \\to -\\infty} f(x) = +\\infty \\qquad \\lim_{x \\to +\\infty} f(x) = +\\infty`,
          text: `En $-\\infty$ : $\\mathrm{e}^x \\to 0$ et $-${a === 1 ? '' : a}x \\to +\\infty$. En $+\\infty$ : $f(x) = \\mathrm{e}^{x}\\left(1 - ${a === 1 ? '' : a}\\frac{x}{\\mathrm{e}^{x}}\\right) + ${pn(b)}$ et $\\frac{x}{\\mathrm{e}^x} \\to 0$.`,
          formulas: ['l.exp', 'l.cc'],
        },
        { title: 'Minimum', math: a === 1 ? `f(0) = \\mathrm{e}^{0} - 0 + ${pn(b)} = ${L(ext)}` : `f(${L(lnA)}) = ${a} - ${a} ${L(lnA)} + ${pn(b)} = ${L(ext)}` },
        { title: 'Tableau de variations', table, formulas: ['v.var'] },
      ],
      f,
      df,
    );
  },
};

export const VARIATION_TEMPLATES: Template[] = [V01, V02, V03, V04, V05, V06, V07, V08, V09];


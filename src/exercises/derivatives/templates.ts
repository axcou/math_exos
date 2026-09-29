import type { Expr } from '../../core/expr/ast';
import { solveDerivative } from '../../calculator/derivativeSolver';
import { add, affine, div, exp, ln, mono, mul, num, pow, sqrt, X } from '../../core/expr/build';
import { Poly } from '../../core/expr/poly';
import * as Q from '../../core/expr/rational';
import type { Rng } from '../../core/random/prng';
import { L, pe, pn, uvBlock } from '../helpers';
import type { ExerciseDraft, KnownMistake, Step, Template } from '../types';

interface DerivSpec {
  f: Expr;
  df: Expr;
  /** Texte « sur ℝ », « sur ]0 ; +∞[ »… */
  domainText: string;
  /** Intervalle de tirage des points de vérification. */
  domain: [number, number];
  steps: Step[];
  mistakes?: KnownMistake[];
}

/**
 * Énoncé au format TD : « Dériver la fonction suivante. » puis x ↦ … en
 * grand ; la réponse se tape après « f'(x) = ».
 */
function derivative(s: DerivSpec): ExerciseDraft {
  const fl = L(s.f);
  const dfl = L(s.df);
  const display = `$\\displaystyle x \\mapsto ${fl}$`;
  return {
    statement: 'Dériver la fonction suivante.',
    lead: 'Dériver les fonctions suivantes.',
    item: display,
    questions: [
      {
        id: 'q1',
        type: 'expression',
        prompt: display,
        label: "f'(x) =",
        expected: s.df,
        expectedLatex: dfl,
        domain: s.domain,
        mistakes: s.mistakes,
      },
    ],
    steps: [...s.steps, { title: 'Conclusion', math: `f'(x) = ${dfl}` }],
    meta: [{ kind: 'derivative', f: s.f, df: s.df, domain: s.domain }],
  };
}

const R_TEXT = 'sur $\\mathbb{R}$';

/** Coefficients d'un polynôme aléatoire de degré d, coefficient dominant non nul. */
function randomPoly(rng: Rng, d: number, max = 6): Poly {
  const c: number[] = [];
  for (let k = 0; k < d; k++) c.push(rng.bool(0.25) ? 0 : rng.int(-max, max));
  c.push(rng.nonZero(-max, max));
  return new Poly(c);
}

/** Dérivées des termes d'un polynôme, une par une. */
function termByTerm(p: Poly): string {
  const parts: string[] = [];
  for (let k = p.c.length - 1; k >= 0; k--) {
    const a = p.c[k];
    if (Q.isZero(a)) continue;
    const t = new Poly([...Array(k).fill(0), a]);
    parts.push(`(${t.toLatex()})' = ${t.derive().toLatex()}`);
  }
  return parts.join(' \\qquad ');
}

// ——————————————————————————————————— Niveau 1

const D01: Template = {
  code: 'D01',
  theme: 'derivee',
  difficulty: 1,
  subtype: 'polynome',
  title: "Dérivée d'un polynôme",
  generate(rng) {
    const p = randomPoly(rng, rng.int(2, 4));
    const dp = p.derive();
    // Erreur : garder l'exposant (n·a·x^n)
    const keepExp = new Poly(p.c.map((a, k) => (k === 0 ? Q.ZERO : Q.mul(a, Q.rat(k)))));
    return derivative({
      f: p.toExpr(),
      df: dp.toExpr(),
      domainText: R_TEXT,
      domain: [-5, 5],
      steps: [
        {
          title: 'Méthode',
          text: "$f$ est un polynôme : on dérive **terme à terme**. La dérivée d'une somme est la somme des dérivées, et chaque terme $a\\,x^n$ se dérive en $a\\,n\\,x^{n-1}$.",
          formulas: ['d.sum', 'd.scal', 'd.xn', 'd.const'],
        },
        { title: 'Dérivée de chaque terme', math: termByTerm(p) },
      ],
      mistakes: [
        { expr: keepExp.toExpr(), message: "Attention : $(x^n)' = n\\,x^{n-1}$, l'exposant **diminue de 1**." },
        ...(Q.isZero(p.coef(0))
          ? []
          : [{ expr: dp.add(new Poly([p.coef(0)])).toExpr(), message: "La dérivée d'une constante est **0**." }]),
      ],
    });
  },
};

const D02: Template = {
  code: 'D02',
  theme: 'derivee',
  difficulty: 1,
  subtype: 'inverse',
  title: 'Dérivée avec la fonction inverse',
  generate(rng) {
    const n = rng.int(2, 3);
    const a = rng.nonZero(-5, 5);
    const b = rng.nonZero(-6, 6);
    const c = rng.int(-6, 6);
    const f = add(mono(a, n), div(num(b), X), num(c));
    const df = add(mono(n * a, n - 1), div(num(-b), pow(X, 2)));
    return derivative({
      f,
      df,
      domainText: 'sur $\\mathbb{R}^*$',
      domain: [-5, 5],
      steps: [
        {
          title: 'Méthode',
          text: `On dérive terme à terme. Le terme $\\frac{${b}}{x}$ s'écrit $${b} \\times \\frac{1}{x}$ : on utilise la dérivée de l'inverse.`,
          formulas: ['d.sum', 'd.xn', 'd.inv', 'd.const'],
        },
        {
          title: 'Dérivée de chaque terme',
          math: `(${L(mono(a, n))})' = ${L(mono(n * a, n - 1))} \\qquad \\left(${L(div(num(b), X))}\\right)' = ${b} \\times \\left(-\\frac{1}{x^2}\\right) = ${L(div(num(-b), pow(X, 2)))}${c ? ` \\qquad (${c})' = 0` : ''}`,
        },
      ],
      mistakes: [
        {
          expr: add(mono(n * a, n - 1), div(num(b), pow(X, 2))),
          message: "Attention au signe : $\\left(\\frac{1}{x}\\right)' = -\\frac{1}{x^2}$.",
        },
      ],
    });
  },
};

const D03: Template = {
  code: 'D03',
  theme: 'derivee',
  difficulty: 1,
  subtype: 'racine',
  title: 'Dérivée avec la racine carrée',
  generate(rng) {
    const a = rng.nonZero(-6, 6);
    const b = rng.nonZero(-4, 4);
    const c = rng.int(-5, 5);
    const f = add(mono(b, 2), mul(num(a), sqrt(X)), num(c));
    const half = Q.rat(a, 2);
    const sqrtTerm = div(num(half.n), mul(num(half.d), sqrt(X)));
    const df = add(mono(2 * b, 1), sqrtTerm);
    return derivative({
      f,
      df,
      domainText: 'sur $]0\\,;\\,+\\infty[$',
      domain: [0.2, 6],
      steps: [
        {
          title: 'Méthode',
          text: 'On dérive terme à terme ; $\\sqrt{x}$ est dérivable sur $]0\\,;\\,+\\infty[$.',
          formulas: ['d.sum', 'd.xn', 'd.sqrt', 'd.const'],
        },
        {
          title: 'Dérivée de chaque terme',
          math: `(${L(mono(b, 2))})' = ${L(mono(2 * b, 1))} \\qquad (${L(mul(num(a), sqrt(X)))})' = ${Math.abs(a) === 1 ? '' : `${a} \\times \\frac{1}{2\\sqrt{x}} = `}${L(sqrtTerm)}`,
        },
      ],
      mistakes: [
        {
          expr: add(mono(2 * b, 1), div(num(a), sqrt(X))),
          message: "Attention : $(\\sqrt{x})' = \\frac{1}{2\\sqrt{x}}$ — n'oublie pas le facteur 2 au dénominateur.",
        },
      ],
    });
  },
};

// ——————————————————————————————————— Niveau 2

const D04: Template = {
  code: 'D04',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'produit',
  title: "Dérivée d'un produit",
  generate(rng) {
    const u = Poly.fromHigh(rng.nonZero(-4, 4), rng.nonZero(-5, 5));
    const v = Poly.fromHigh(rng.nonZero(-3, 3), rng.int(-5, 5), rng.nonZero(-5, 5));
    const du = u.derive();
    const dv = v.derive();
    const result = du.mul(v).add(u.mul(dv));
    return derivative({
      f: mul(u.toExpr(), v.toExpr()),
      df: result.toExpr(),
      domainText: R_TEXT,
      domain: [-5, 5],
      steps: [
        { title: 'Identifier u et v', text: '$f = u \\times v$ avec :', math: uvBlock([['u', u, du], ['v', v, dv]]), formulas: ['d.prod'] },
        {
          title: 'Appliquer la formule',
          math: `f'(x) = u'(x)v(x) + u(x)v'(x) = ${pn(du.c[0])}${pe(v)} + ${pe(u)}${pe(dv)}`,
        },
        { title: 'Développer et réduire', math: `f'(x) = ${du.mul(v).toLatex()} + ${pe(u.mul(dv))} = ${result.toLatex()}` },
      ],
      mistakes: [
        { expr: du.mul(dv).toExpr(), message: "Attention : $(uv)' \\neq u'v'$. Il faut utiliser $(uv)' = u'v + uv'$." },
      ],
    });
  },
};

/** Numérateur « u'v − uv' » affiché avant développement. */
function quotientNumerator(du: string, v: string, u: string, dv: string): string {
  return `${du}${v} - ${u}${dv}`;
}

const D05: Template = {
  code: 'D05',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'quotient',
  title: "Dérivée d'un quotient (homographique)",
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
    const vSq = pow(v.toExpr(), 2);
    const df = div(num(k), vSq);
    return derivative({
      f: div(u.toExpr(), v.toExpr()),
      df,
      domainText: `sur $\\mathbb{R} \\setminus \\{${r}\\}$`,
      domain: [-6, 6],
      steps: [
        {
          title: 'Identifier u et v',
          text: `$f = \\dfrac{u}{v}$ avec $v(x) \\neq 0$ pour $x \\neq ${r}$ :`,
          math: uvBlock([['u', u, u.derive()], ['v', v, v.derive()]]),
          formulas: ['d.quot'],
        },
        {
          title: 'Appliquer la formule',
          math: `f'(x) = \\frac{u'v - uv'}{v^2} = \\frac{${quotientNumerator(pn(a), pe(v), pe(u), ` \\times ${pn(c)}`)}}{${L(vSq)}}`,
        },
        {
          title: 'Simplifier le numérateur',
          text: 'Les termes en $x$ se simplifient :',
          math: `${u.derive().mul(v).toLatex()} - (${u.mul(v.derive()).toLatex()}) = ${k}`,
        },
      ],
      mistakes: [
        { expr: div(num(-k), vSq), message: "Attention à l'ordre : le numérateur est $u'v - uv'$ (et non $uv' - u'v$)." },
        { expr: div(num(k), v.toExpr()), message: 'Le dénominateur est $v^2$ : n’oublie pas le carré.' },
      ],
    });
  },
};

const D06: Template = {
  code: 'D06',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'quotient',
  title: "Dérivée d'un quotient",
  generate(rng) {
    const r = rng.int(-4, 4);
    const u = Poly.fromHigh(rng.nonZero(-3, 3), rng.int(-5, 5), rng.int(-6, 6));
    const v = Poly.fromHigh(1, -r);
    if (u.eval(r) === 0) u.c[0] = Q.add(u.c[0], Q.ONE);
    const du = u.derive();
    const numer = du.mul(v).sub(u);
    const vSq = pow(v.toExpr(), 2);
    return derivative({
      f: div(u.toExpr(), v.toExpr()),
      df: div(numer.toExpr(), vSq),
      domainText: `sur $\\mathbb{R} \\setminus \\{${r}\\}$`,
      domain: [-6, 6],
      steps: [
        {
          title: 'Identifier u et v',
          text: '$f = \\dfrac{u}{v}$ avec :',
          math: uvBlock([['u', u, du], ['v', v, v.derive()]]),
          formulas: ['d.quot'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = \\frac{${pe(du)}${pe(v)} - ${pe(u)} \\times 1}{${L(vSq)}}` },
        {
          title: 'Développer le numérateur',
          math: `${du.mul(v).toLatex()} - (${u.toLatex()}) = ${numer.toLatex()}`,
        },
      ],
      mistakes: [
        { expr: div(numer.scale(-1).toExpr(), vSq), message: "Attention à l'ordre : le numérateur est $u'v - uv'$." },
        { expr: div(numer.toExpr(), v.toExpr()), message: 'Le dénominateur est $v^2$ : n’oublie pas le carré.' },
      ],
    });
  },
};

const D07: Template = {
  code: 'D07',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'exp',
  title: 'Produit avec l’exponentielle',
  generate(rng) {
    const a = rng.nonZero(-5, 5);
    const b = rng.int(-6, 6);
    const u = Poly.fromHigh(a, b);
    const g = Poly.fromHigh(a, a + b);
    const df = mul(g.toExpr(), exp(X));
    return derivative({
      f: mul(u.toExpr(), exp(X)),
      df,
      domainText: R_TEXT,
      domain: [-4, 4],
      steps: [
        {
          title: 'Identifier u et v',
          text: '$f = u \\times v$ avec :',
          math: uvBlock([['u', u, u.derive()], ['v', exp(X), exp(X)]]),
          formulas: ['d.prod', 'd.exp'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = ${a}\\,\\mathrm{e}^{x} + ${pe(u)}\\mathrm{e}^{x}` },
        { title: 'Factoriser par $\\mathrm{e}^x$', text: 'On factorise pour faciliter l’étude du signe :', math: `f'(x) = (${a} + ${u.toLatex()})\\mathrm{e}^{x} = ${L(df)}` },
      ],
      mistakes: [
        { expr: mul(num(a), exp(X)), message: "Attention : $(uv)' \\neq u'v'$. Utilise $(uv)' = u'v + uv'$." },
        { expr: mul(u.toExpr(), exp(X)), message: "Il manque le terme $u'v$ : $(uv)' = u'v + uv'$." },
      ],
    });
  },
};

const D08: Template = {
  code: 'D08',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'ln',
  title: 'Produit avec le logarithme',
  generate(rng) {
    const a = rng.nonZero(-5, 5);
    const b = rng.int(-6, 6);
    const u = Poly.fromHigh(a, b);
    const df = add(mul(num(a), ln(X)), div(u.toExpr(), X));
    return derivative({
      f: mul(u.toExpr(), ln(X)),
      df,
      domainText: 'sur $]0\\,;\\,+\\infty[$',
      domain: [0.2, 6],
      steps: [
        {
          title: 'Identifier u et v',
          text: '$f = u \\times v$ avec :',
          math: uvBlock([['u', u, u.derive()], ['v', ln(X), div(num(1), X)]]),
          formulas: ['d.prod', 'd.ln'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = ${a}\\ln(x) + ${pe(u)} \\times \\frac{1}{x} = ${L(df)}` },
      ],
      mistakes: [
        { expr: div(num(a), X), message: "Attention : $(uv)' \\neq u'v'$. Utilise $(uv)' = u'v + uv'$." },
      ],
    });
  },
};

const D09: Template = {
  code: 'D09',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'inverse',
  title: "Dérivée de l'inverse d'une fonction",
  generate(rng) {
    const p = rng.int(-4, 4);
    const q = Math.floor((p * p) / 4) + rng.int(1, 5);
    const k = rng.nonZero(-6, 6);
    const u = Poly.fromHigh(1, p, q);
    const du = u.derive();
    const uSq = pow(u.toExpr(), 2);
    const df = div(du.scale(-k).toExpr(), uSq);
    return derivative({
      f: div(num(k), u.toExpr()),
      df,
      domainText: R_TEXT,
      domain: [-5, 5],
      steps: [
        {
          title: 'Identifier u',
          text: `$f = ${k} \\times \\dfrac{1}{u}$ avec $u(x) = ${u.toLatex()}$, qui ne s'annule pas sur $\\mathbb{R}$ (discriminant négatif). $u'(x) = ${du.toLatex()}$.`,
          formulas: ['d.invu', 'd.scal'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = ${k} \\times \\left(-\\frac{${du.toLatex()}}{${L(uSq)}}\\right) = ${L(df)}` },
      ],
      mistakes: [
        { expr: div(du.scale(k).toExpr(), uSq), message: "Attention au signe : $\\left(\\frac{1}{u}\\right)' = -\\frac{u'}{u^2}$." },
        { expr: div(du.scale(-k).toExpr(), u.toExpr()), message: 'Le dénominateur est $u^2$ : n’oublie pas le carré.' },
      ],
    });
  },
};

// ——————————————————————————————————— Niveau 3

const D10: Template = {
  code: 'D10',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'composee-exp',
  title: 'Exponentielle d’une fonction',
  generate(rng) {
    const k = rng.nonZero(-4, 4);
    const u = rng.bool() ? Poly.fromHigh(rng.nonZero(-4, 4), rng.int(-5, 5)) : Poly.fromHigh(rng.nonZero(-2, 2), rng.int(-4, 4), 0);
    const du = u.derive();
    const e = exp(u.toExpr());
    const df = mul(du.scale(k).toExpr(), e);
    return derivative({
      f: mul(num(k), e),
      df,
      domainText: R_TEXT,
      domain: [-1.5, 1.5],
      steps: [
        {
          title: 'Identifier u',
          text: `$f = ${k}\\,\\mathrm{e}^{u}$ avec $u(x) = ${u.toLatex()}$ et $u'(x) = ${du.toLatex()}$.`,
          formulas: ['d.expu', 'd.scal'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = ${k} \\times ${pe(du)}\\,\\mathrm{e}^{${u.toLatex()}} = ${L(df)}` },
      ],
      mistakes: [
        { expr: mul(num(k), e), message: "Attention : $(\\mathrm{e}^{u})' = u'\\,\\mathrm{e}^{u}$ — n'oublie pas de multiplier par $u'$." },
      ],
    });
  },
};

const D11: Template = {
  code: 'D11',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'composee-ln',
  title: 'Logarithme d’une fonction',
  generate(rng) {
    let u: Poly;
    let domainText: string;
    let domain: [number, number];
    if (rng.bool()) {
      const a = rng.int(1, 5);
      const r = rng.int(-4, 4);
      u = Poly.fromHigh(a, -a * r);
      domainText = `sur $]{${r}}\\,;\\,+\\infty[$`;
      domain = [r + 0.2, r + 6];
    } else {
      u = Poly.fromHigh(1, 0, rng.int(1, 9));
      domainText = R_TEXT;
      domain = [-5, 5];
    }
    const du = u.derive();
    const df = div(du.toExpr(), u.toExpr());
    return derivative({
      f: ln(u.toExpr()),
      df,
      domainText,
      domain,
      steps: [
        {
          title: 'Identifier u',
          text: `$f = \\ln(u)$ avec $u(x) = ${u.toLatex()} > 0$ ${domainText} et $u'(x) = ${du.toLatex()}$.`,
          formulas: ['d.lnu'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = \\frac{u'(x)}{u(x)} = ${L(df)}` },
      ],
      mistakes: [
        { expr: div(num(1), u.toExpr()), message: "Attention : $(\\ln u)' = \\frac{u'}{u}$ — il faut $u'$ au numérateur." },
      ],
    });
  },
};

const D12: Template = {
  code: 'D12',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'composee-racine',
  title: 'Racine d’une fonction',
  generate(rng) {
    const a = rng.int(1, 6);
    const r = rng.int(-4, 4);
    const u = Poly.fromHigh(a, -a * r);
    const half = Q.rat(a, 2);
    const df = div(num(half.n), mul(num(half.d), sqrt(u.toExpr())));
    return derivative({
      f: sqrt(u.toExpr()),
      df,
      domainText: `sur $]{${r}}\\,;\\,+\\infty[$`,
      domain: [r + 0.2, r + 6],
      steps: [
        {
          title: 'Identifier u',
          text: `$f = \\sqrt{u}$ avec $u(x) = ${u.toLatex()}$, strictement positif pour $x > ${r}$, et $u'(x) = ${a}$.`,
          formulas: ['d.sqrtu'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = \\frac{u'(x)}{2\\sqrt{u(x)}} = \\frac{${a}}{2\\sqrt{${u.toLatex()}}} = ${L(df)}` },
      ],
      mistakes: [
        { expr: div(num(1), mul(num(2), sqrt(u.toExpr()))), message: "Attention : $(\\sqrt{u})' = \\frac{u'}{2\\sqrt{u}}$ — il faut multiplier par $u'$." },
      ],
    });
  },
};

const D13: Template = {
  code: 'D13',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'composee-puissance',
  title: 'Puissance d’une fonction',
  generate(rng) {
    const n = rng.int(3, 5);
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-5, 5);
    const u = affine(a, b);
    const df = mul(num(n * a), pow(u, n - 1));
    return derivative({
      f: pow(u, n),
      df,
      domainText: R_TEXT,
      domain: [-2, 2],
      steps: [
        {
          title: 'Identifier u',
          text: `$f = u^{${n}}$ avec $u(x) = ${L(u)}$ et $u'(x) = ${a}$.`,
          formulas: ['d.un'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = ${n} \\times u'(x) \\times u(x)^{${n - 1}} = ${n} \\times ${pn(a)} \\times (${L(u)})^{${n - 1}} = ${L(df)}` },
      ],
      mistakes: [
        { expr: mul(num(n), pow(u, n - 1)), message: "Attention : $(u^n)' = n\\,u'\\,u^{n-1}$ — n'oublie pas le facteur $u'$." },
      ],
    });
  },
};

const D14: Template = {
  code: 'D14',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'composee-exp',
  title: 'Produit et exponentielle composée',
  generate(rng) {
    const p = rng.nonZero(-4, 4);
    const q = rng.int(-5, 5);
    const a = rng.pick([-3, -2, -1, 2, 3]);
    const b = rng.int(-3, 3);
    const u = Poly.fromHigh(p, q);
    const w = Poly.fromHigh(a, b);
    const e = exp(w.toExpr());
    const g = Poly.fromHigh(a * p, a * q + p);
    const df = mul(g.toExpr(), e);
    return derivative({
      f: mul(u.toExpr(), e),
      df,
      domainText: R_TEXT,
      domain: [-1.5, 1.5],
      steps: [
        {
          title: 'Identifier u et v',
          text: `$f = u \\times v$ avec $v = \\mathrm{e}^{w}$, $w(x) = ${w.toLatex()}$ :`,
          math: uvBlock([['u', u, u.derive()], ['v', e, mul(num(a), e)]]),
          formulas: ['d.prod', 'd.expu'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = ${p}\\,${L(e)} + ${pe(u)} \\times ${pn(a)}${L(e)}` },
        { title: 'Factoriser', math: `f'(x) = (${p} + ${u.scale(a).toLatex()})${L(e)} = ${L(df)}` },
      ],
      mistakes: [
        {
          expr: mul(Poly.fromHigh(p, q + p).toExpr(), e),
          message: "Attention : $(\\mathrm{e}^{w})' = w'\\,\\mathrm{e}^{w}$ — la dérivée de $\\mathrm{e}^{" + w.toLatex() + '}$ est $' + L(mul(num(a), e)) + '$.',
        },
      ],
    });
  },
};

const D15: Template = {
  code: 'D15',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'quotient',
  title: 'Quotient avec l’exponentielle',
  generate(rng) {
    const r = rng.int(-4, 4);
    const k = rng.pick([-3, -2, -1, 1, 2, 3]);
    const v = Poly.fromHigh(1, -r);
    const vSq = pow(v.toExpr(), 2);
    const numer = Poly.fromHigh(1, -r - 1).scale(k);
    const df = div(mul(numer.toExpr(), exp(X)), vSq);
    const ke = mul(num(k), exp(X));
    return derivative({
      f: div(ke, v.toExpr()),
      df,
      domainText: `sur $\\mathbb{R} \\setminus \\{${r}\\}$`,
      domain: [-4, 4],
      steps: [
        { title: 'Identifier u et v', math: uvBlock([['u', ke, ke], ['v', v, v.derive()]]), formulas: ['d.quot', 'd.exp'] },
        { title: 'Appliquer la formule', math: `f'(x) = \\frac{${L(ke)}${pe(v)} - ${L(ke)} \\times 1}{${L(vSq)}}` },
        { title: 'Factoriser par $\\mathrm{e}^x$', math: `f'(x) = \\frac{${k === 1 ? '' : k === -1 ? '-' : k}(${v.toLatex()} - 1)\\mathrm{e}^{x}}{${L(vSq)}} = ${L(df)}` },
      ],
      mistakes: [
        { expr: div(mul(numer.scale(-1).toExpr(), exp(X)), vSq), message: "Attention à l'ordre : le numérateur est $u'v - uv'$." },
        { expr: div(mul(numer.toExpr(), exp(X)), v.toExpr()), message: 'Le dénominateur est $v^2$ : n’oublie pas le carré.' },
      ],
    });
  },
};

const D16: Template = {
  code: 'D16',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'quotient',
  title: 'Quotient avec le logarithme',
  generate(rng) {
    const a = rng.nonZero(-4, 4);
    const b = rng.int(-5, 5);
    const u = add(mul(num(a), ln(X)), num(b));
    const numer = add(mul(num(-a), ln(X)), num(a - b));
    const df = div(numer, pow(X, 2));
    return derivative({
      f: div(u, X),
      df,
      domainText: 'sur $]0\\,;\\,+\\infty[$',
      domain: [0.2, 6],
      steps: [
        {
          title: 'Identifier u et v',
          math: uvBlock([['u', u, div(num(a), X)], ['v', X, num(1)]]),
          formulas: ['d.quot', 'd.ln'],
        },
        { title: 'Appliquer la formule', math: `f'(x) = \\frac{\\frac{${a}}{x} \\times x - (${L(u)}) \\times 1}{x^2}` },
        { title: 'Simplifier', math: `f'(x) = \\frac{${a} - ${pe(u)}}{x^2} = ${L(df)}` },
      ],
      mistakes: [
        { expr: div(mul(num(-1), numer), pow(X, 2)), message: "Attention à l'ordre : le numérateur est $u'v - uv'$." },
      ],
    });
  },
};

// ——————————————————————————————————— Format « TD » : corrections produites par le calculateur

/** Exercice dont la correction détaillée vient du calculateur de dérivées. */
function explained(f: Expr, domain: [number, number], mistakes: KnownMistake[] = []): ExerciseDraft {
  const r = solveDerivative(f);
  return derivative({ f, df: r.df, domainText: '', domain, steps: r.steps.filter((s) => s.title !== 'Conclusion'), mistakes });
}

const FORGOT_U = "Il manque le facteur $u'$ : on dérive aussi la fonction « intérieure ».";
const PRODUCT_TRAP = "Attention : $(uv)' \\neq u'v'$. Il faut utiliser $(uv)' = u'v + uv'$.";

/** Petit polynôme de degré d, sans terme constant si `noConst` (pour les grandes puissances). */
function smallPoly(rng: Rng, d: number, noConst: boolean): Poly {
  const c: number[] = [noConst ? 0 : rng.int(-4, 4)];
  for (let k = 1; k < d; k++) c.push(rng.bool(0.3) ? 0 : rng.int(-3, 3));
  c.push(rng.nonZero(-2, 2));
  const p = new Poly(c);
  return p.c.filter((x) => !Q.isZero(x)).length >= 2 ? p : p.add(new Poly([0, 1]));
}

const D17: Template = {
  code: 'D17',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'composee-puissance',
  title: 'Puissance d’un polynôme',
  generate(rng) {
    const n = rng.pick([2, 2, 3, 4, 5, 7, 10, 47]);
    const p = smallPoly(rng, rng.pick([2, 2, 3, 4]), n > 4);
    const k = rng.bool(0.65) ? 1 : rng.nonZero(-5, 5);
    const u = p.toExpr();
    const f = mul(num(k), pow(u, n));
    const du = p.derive().toExpr();
    return explained(f, n > 4 ? [-0.8, 0.8] : [-1.5, 1.5], [
      { expr: mul(num(k * n), pow(u, n - 1)), message: FORGOT_U },
      { expr: mul(num(k), du, pow(u, n - 1)), message: "Attention : $(u^n)' = n\\,u'\\,u^{n-1}$ — l’exposant $n$ passe devant." },
    ]);
  },
};

const D18: Template = {
  code: 'D18',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'composee-racine',
  title: 'Racine d’un polynôme',
  generate(rng) {
    // u(x) = a x² + b x + c, toujours strictement positif (a > 0, Δ < 0)
    const a = rng.int(1, 3);
    const b = rng.bool(0.5) ? 0 : rng.int(-4, 4);
    const c = Math.floor((b * b) / (4 * a)) + rng.int(1, 6);
    const u = Poly.fromHigh(a, b, c).toExpr();
    const k = rng.bool(0.7) ? 1 : rng.nonZero(-4, 4);
    const f = mul(num(k), sqrt(u));
    return explained(f, [-4, 4], [{ expr: div(num(k), mul(num(2), sqrt(u))), message: "Attention : $(\\sqrt{u})' = \\frac{u'}{2\\sqrt{u}}$ — il faut $u'$ au numérateur." }]);
  },
};

const D19: Template = {
  code: 'D19',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'produit',
  title: 'Produit avec une racine',
  generate(rng) {
    if (rng.bool(0.25)) {
      // x√x, 2x√x…
      const k = rng.bool(0.6) ? 1 : rng.nonZero(-4, 4);
      const f = mul(num(k), X, sqrt(X));
      return explained(f, [0.2, 5], [{ expr: div(num(k), mul(num(2), sqrt(X))), message: PRODUCT_TRAP }]);
    }
    const n = rng.int(1, 3);
    const a = rng.bool(0.6) ? 1 : rng.nonZero(-3, 3);
    const b = rng.int(1, 4);
    const r = rng.int(0, 4);
    const u = Poly.fromHigh(b, -b * r).toExpr(); // b(x − r) > 0 pour x > r
    const f = mul(mono(a, n), sqrt(u));
    return explained(f, [r + 0.3, r + 4], [{ expr: mul(num(n * a * b), pow(X, n - 1), div(num(1), mul(num(2), sqrt(u)))), message: PRODUCT_TRAP }]);
  },
};

const D20: Template = {
  code: 'D20',
  theme: 'derivee',
  difficulty: 1,
  subtype: 'produit',
  title: 'Produit de deux fonctions affines',
  generate(rng) {
    if (rng.bool(0.2)) {
      // x · x³ : on peut dériver le produit ou simplifier d'abord
      const m = rng.int(1, 3);
      const p = rng.int(2, 4);
      // produit écrit tel quel (sans regrouper les puissances), comme dans l'énoncé du TD
      const f: Expr = { type: 'mul', factors: [m === 1 ? X : pow(X, m), pow(X, p)] };
      return explained(f, [-3, 3], [{ expr: mono(m * p, m + p - 2), message: PRODUCT_TRAP }]);
    }
    const k = rng.bool(0.6) ? 1 : rng.nonZero(-5, 5);
    const a = rng.nonZero(-4, 4);
    const b = rng.nonZero(-6, 6);
    const c = rng.nonZero(-4, 4);
    const d = rng.nonZero(-6, 6);
    const factors = [affine(a, b), affine(c, d)];
    const f: Expr = k === 1 ? { type: 'mul', factors } : { type: 'mul', factors: [num(k), ...factors] };
    return explained(f, [-3, 3], [{ expr: num(k * a * c), message: PRODUCT_TRAP }]);
  },
};

const D21: Template = {
  code: 'D21',
  theme: 'derivee',
  difficulty: 1,
  subtype: 'inverse',
  title: 'Inverse d’une fonction affine',
  generate(rng) {
    const k = rng.bool(0.6) ? 1 : rng.nonZero(-6, 6);
    const a = rng.bool(0.3) ? 1 : rng.nonZero(-4, 4);
    const b = rng.bool(0.25) ? 0 : rng.nonZero(-6, 6);
    const v = affine(a, b);
    const f = div(num(k), v);
    return explained(f, [-5, 5], [
      { expr: div(num(k * a), pow(v, 2)), message: "Attention au signe : $\\left(\\frac{1}{v}\\right)' = -\\frac{v'}{v^2}$." },
      { expr: div(num(-k * a), v), message: 'Le dénominateur est $v^2$ : n’oublie pas le carré.' },
    ]);
  },
};

const D22: Template = {
  code: 'D22',
  theme: 'derivee',
  difficulty: 2,
  subtype: 'quotient',
  title: 'Quotient par un trinôme',
  generate(rng) {
    const c = rng.int(1, 6);
    const v = Poly.fromHigh(1, 0, c);
    const constant = rng.bool(0.4);
    const a = constant ? 0 : rng.nonZero(-5, 5);
    const b = rng.nonZero(-6, 6);
    const u = constant ? num(b) : affine(a, b);
    const f = div(u, v.toExpr());
    const numer = constant ? v.derive().scale(-b) : Poly.fromHigh(a, b).derive().mul(v).sub(Poly.fromHigh(a, b).mul(v.derive()));
    return explained(f, [-4, 4], [
      { expr: div(numer.scale(-1).toExpr(), pow(v.toExpr(), 2)), message: "Attention à l'ordre (ou au signe) : le numérateur est $u'v - uv'$." },
      { expr: div(numer.toExpr(), v.toExpr()), message: 'Le dénominateur est $v^2$ : n’oublie pas le carré.' },
    ]);
  },
};

const D23: Template = {
  code: 'D23',
  theme: 'derivee',
  difficulty: 3,
  subtype: 'quotient',
  title: 'Quotient avec une racine',
  generate(rng) {
    const a = rng.int(1, 8);
    const r = rng.int(1, 3);
    const u = Poly.fromHigh(a, -a * r).toExpr(); // a(x − r) > 0 pour x > r
    const c = rng.int(1, 5);
    const f = div(sqrt(u), mono(c, 1));
    return explained(f, [r + 0.3, r + 4], [{ expr: div(num(a), mul(num(2 * c), sqrt(u))), message: "Ce n’est pas le quotient des dérivées : utilise $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$." }]);
  },
};

export const DERIVATIVE_TEMPLATES: Template[] = [D01, D02, D03, D04, D05, D06, D07, D08, D09, D10, D11, D12, D13, D14, D15, D16, D17, D18, D19, D20, D21, D22, D23];

import type { Expr } from '../../core/expr/ast';
import { add, div, exp, ln, mono, mul, num, pow, sqrt, X } from '../../core/expr/build';
import { Poly } from '../../core/expr/poly';
import * as Q from '../../core/expr/rational';
import type { Rational } from '../../core/expr/rational';
import type { Rng } from '../../core/random/prng';
import { nice } from '../../calculator/nice';
import { L, pn, R } from '../helpers';
import type { ExerciseDraft, ExerciseMeta, Step, Template, ValueAnswer, ValueQuestion } from '../types';

type At = number | '+inf' | '-inf';

export function atLatex(at: At, side?: 1 | -1): string {
  if (at === '+inf') return '+\\infty';
  if (at === '-inf') return '-\\infty';
  const a = nice(at).latex;
  return side ? `${a}^{${side > 0 ? '+' : '-'}}` : a;
}

export const limLatex = (at: At, side?: 1 | -1) => `\\lim_{x \\to ${atLatex(at, side)}}`;

export function valueLatex(v: ValueAnswer): string {
  if (v.kind === 'finite') return v.latex;
  if (v.kind === 'infinity') return v.sign > 0 ? '+\\infty' : '-\\infty';
  return '\\text{n’existe pas}';
}

const inf = (sign: number): ValueAnswer => ({ kind: 'infinity', sign: sign >= 0 ? 1 : -1 });
const finiteQ = (r: Rational): ValueAnswer => ({ kind: 'finite', expr: num(r), latex: Q.toLatex(r) });
const finiteE = (e: Expr): ValueAnswer => ({ kind: 'finite', expr: e, latex: L(e) });

interface LimitQ {
  at: At;
  side?: 1 | -1;
  answer: ValueAnswer;
  mistakes?: ValueQuestion['mistakes'];
}

interface LimitSpec {
  f: Expr;
  domainText?: string;
  limits: LimitQ[];
  steps: Step[];
  /** Interprétation graphique ajoutée à la conclusion. */
  asymptote?: string;
}

/**
 * Énoncé au format TD : la limite est écrite directement et en grand
 * (« Déterminer la limite suivante. » puis lim_{x→a} …), sans passer par
 * « Soit f la fonction… ». La réponse se tape (ou s'écrit sur le PDF)
 * après la limite, sans la recopier.
 */
function limit(s: LimitSpec): ExerciseDraft {
  const fl = L(s.f);
  // Une somme se met entre parenthèses : la limite porte sur toute l'expression
  const body = s.f.type === 'add' ? `\\left(${fl}\\right)` : fl;
  const exprs = s.limits.map((q) => `${limLatex(q.at, q.side)} ${body}`);
  const one = s.limits.length === 1;
  const display = (e: string) => `$\\displaystyle ${e}$`;
  return {
    statement: one ? 'Déterminer la limite suivante.' : 'Déterminer les limites suivantes.',
    lead: 'Déterminer les limites suivantes.',
    // Dans une série (a, b, c…), une partie à une seule limite l'affiche ; sinon ce sont ses questions
    item: one ? display(exprs[0]) : '',
    questions: s.limits.map((q, i) => ({
      id: `q${i + 1}`,
      type: 'value',
      prompt: display(exprs[i]),
      label: `${exprs[i]} =`,
      hideLabel: true,
      expected: q.answer,
      mistakes: q.mistakes,
    })),
    steps: [
      ...s.steps,
      {
        title: 'Conclusion',
        math: s.limits.map((q, i) => `${exprs[i]} = ${valueLatex(q.answer)}`).join(' \\qquad '),
        text: s.asymptote,
        formulas: s.asymptote ? ['l.asym'] : undefined,
      },
    ],
    meta: s.limits.map((q): ExerciseMeta => ({ kind: 'limit', f: s.f, at: q.at, side: q.side })),
  };
}

const opposite = (v: ValueAnswer): ValueAnswer => (v.kind === 'infinity' ? inf(-v.sign) : v);

function randomPoly(rng: Rng, d: number, max = 6): Poly {
  const c: number[] = [];
  for (let k = 0; k < d; k++) c.push(rng.bool(0.25) ? 0 : rng.int(-max, max));
  c.push(rng.nonZero(-max, max));
  return new Poly(c);
}

/** Limite de a·x^n en ±∞ : signe de l'infini obtenu. */
function monoSign(a: number, n: number, at: '+inf' | '-inf'): 1 | -1 {
  const s = Math.sign(a) * (at === '-inf' && n % 2 === 1 ? -1 : 1);
  return s > 0 ? 1 : -1;
}

// ——————————————————————————————————— Niveau 1

const L01: Template = {
  code: 'L01',
  theme: 'limite',
  difficulty: 1,
  subtype: 'polynome',
  title: "Limite d'un polynôme en l'infini",
  variants: 4,
  generate(rng, variant) {
    const p = randomPoly(rng, variant === undefined ? rng.int(2, 4) : [2, 3, 4, 3][variant]);
    const at = variant === undefined ? rng.pick(['+inf', '-inf'] as const) : (['+inf', '-inf', '-inf', '+inf'] as const)[variant];
    const n = p.degree;
    const a = Q.toNumber(p.lead);
    const ans = inf(monoSign(a, n, at));
    const lead = mono(p.lead, n);
    return limit({
      f: p.toExpr(),
      limits: [{ at, answer: ans, mistakes: [{ answer: opposite(ans), message: `Attention au signe : regarde le signe de $${R(p.lead)}$ et la parité de l'exposant $${n}$.` }] }],
      steps: [
        {
          title: 'Méthode',
          text: 'En l’infini, un polynôme a la même limite que son **terme de plus haut degré**. (Additionner directement les limites mènerait souvent à la forme indéterminée $\\infty - \\infty$.)',
          formulas: ['l.poly', 'l.xn'],
        },
        { title: 'Terme dominant', math: `${limLatex(at)} ${L(p.toExpr())} = ${limLatex(at)} ${L(lead)}` },
        {
          title: 'Calcul',
          text: `$${limLatex(at)} x^{${n}} = ${at === '-inf' && n % 2 ? '-\\infty' : '+\\infty'}$${at === '-inf' ? ` (exposant ${n % 2 ? 'impair' : 'pair'})` : ''}, et on multiplie par $${R(p.lead)}$ ${a > 0 ? '(positif : le signe ne change pas)' : '(négatif : le signe change)'}.`,
        },
      ],
    });
  },
};

const L02: Template = {
  code: 'L02',
  theme: 'limite',
  difficulty: 1,
  subtype: 'reference',
  title: 'Limites de référence',
  variants: 3,
  generate(rng, v) {
    const variant = v ?? rng.int(0, 2);
    if (variant === 0) {
      const c = rng.nonZero(-6, 6);
      const b = rng.nonZero(-6, 6);
      const n = rng.int(1, 3);
      const at = rng.pick(['+inf', '-inf'] as const);
      return limit({
        f: add(num(c), div(num(b), pow(X, n))),
        limits: [{ at, answer: finiteQ(Q.rat(c)) }],
        steps: [
          { title: 'Limite de chaque terme', math: `${limLatex(at)} \\frac{${b}}{${L(pow(X, n))}} = 0 \\qquad ${limLatex(at)} ${c} = ${c}`, formulas: ['l.inv'] },
          { title: 'Somme', text: `Par somme, la limite vaut $${c} + 0 = ${c}$.`, formulas: ['l.opsok'] },
        ],
        asymptote: `La droite d'équation $y = ${c}$ est asymptote horizontale à la courbe de $f$ en $${atLatex(at)}$.`,
      });
    }
    if (variant === 1) {
      const a = rng.nonZero(-5, 5);
      const c = rng.int(-6, 6);
      const at = rng.pick(['+inf', '-inf'] as const);
      const ans = at === '-inf' ? finiteQ(Q.rat(c)) : inf(a);
      return limit({
        f: add(mul(num(a), exp(X)), num(c)),
        limits: [{ at, answer: ans }],
        steps: [
          {
            title: 'Limite de l’exponentielle',
            math: `${limLatex(at)} \\mathrm{e}^{x} = ${at === '-inf' ? '0' : '+\\infty'}`,
            formulas: ['l.exp'],
          },
          {
            title: 'Opérations',
            text:
              at === '-inf'
                ? `Donc $${a}\\,\\mathrm{e}^{x} \\to 0$ et, par somme, $f(x) \\to ${c}$.`
                : `On multiplie par $${a}$ (${a > 0 ? 'positif' : 'négatif'}) puis on ajoute $${c}$ : $f(x) \\to ${a > 0 ? '+' : '-'}\\infty$.`,
            formulas: ['l.opsok'],
          },
        ],
        asymptote: at === '-inf' ? `La droite $y = ${c}$ est asymptote horizontale en $-\\infty$.` : undefined,
      });
    }
    const a = rng.nonZero(-5, 5);
    const c = rng.int(-6, 6);
    const at = rng.pick([0, '+inf'] as const);
    const side = at === 0 ? (1 as const) : undefined;
    const ans = at === 0 ? inf(-a) : inf(a);
    return limit({
      f: add(mul(num(a), ln(X)), num(c)),
      domainText: 'sur $]0\\,;\\,+\\infty[$',
      limits: [{ at, side, answer: ans, mistakes: [{ answer: opposite(ans), message: `Attention au signe : $\\ln x \\to ${at === 0 ? '-' : '+'}\\infty$, puis on multiplie par $${a}$.` }] }],
      steps: [
        { title: 'Limite du logarithme', math: `${limLatex(at, side)} \\ln x = ${at === 0 ? '-' : '+'}\\infty`, formulas: ['l.ln'] },
        {
          title: 'Opérations',
          text: `On multiplie par $${a}$ (${a > 0 ? 'positif : le signe est conservé' : 'négatif : le signe change'}), puis ajouter $${c}$ ne change pas la limite infinie.`,
          formulas: ['l.opsok'],
        },
      ],
      asymptote: at === 0 ? 'La droite $x = 0$ (axe des ordonnées) est asymptote verticale.' : undefined,
    });
  },
};

const L03: Template = {
  code: 'L03',
  theme: 'limite',
  difficulty: 1,
  subtype: 'continuite',
  title: 'Limite en un point (substitution)',
  generate(rng) {
    const r = rng.int(-4, 4);
    const u = Poly.fromHigh(rng.nonZero(-4, 4), rng.int(-5, 5), rng.int(-5, 5));
    const v = Poly.fromHigh(1, -r);
    const a = rng.intExcept(-4, 4, [r]);
    const val = Q.div(u.evalQ(Q.rat(a)), v.evalQ(Q.rat(a)));
    return limit({
      f: div(u.toExpr(), v.toExpr()),
      domainText: `sur $\\mathbb{R} \\setminus \\{${r}\\}$`,
      limits: [{ at: a, answer: finiteQ(val) }],
      steps: [
        {
          title: 'Méthode',
          text: `$f$ est une fonction rationnelle définie en $${a}$ (le dénominateur ne s'annule qu'en $${r}$) : elle est continue en $${a}$, donc la limite est simplement $f(${a})$.`,
        },
        {
          title: 'Calcul',
          math: `f(${a}) = \\frac{${R(u.evalQ(Q.rat(a)))}}{${R(v.evalQ(Q.rat(a)))}} = ${R(val)}`,
        },
      ],
    });
  },
};

// ——————————————————————————————————— Niveau 2

const L04: Template = {
  code: 'L04',
  theme: 'limite',
  difficulty: 2,
  subtype: 'rationnelle',
  title: "Fraction rationnelle en l'infini",
  variants: 3,
  generate(rng, variant) {
    const byKind: [number, number][][] = [[[1, 2], [2, 3], [1, 3]], [[1, 1], [2, 2], [3, 3]], [[2, 1], [3, 2], [3, 1]]];
    const [dp, dq]: readonly number[] = variant === undefined ? rng.pick([[1, 1], [2, 2], [1, 2], [2, 1], [3, 2], [2, 3], [3, 3]] as const) : rng.pick(byKind[variant]);
    const p = randomPoly(rng, dp, 5);
    const q = randomPoly(rng, dq, 5);
    const at = rng.pick(['+inf', '-inf'] as const);
    const ratio = Q.div(p.lead, q.lead);
    let ans: ValueAnswer;
    let calc: string;
    let asymptote: string | undefined;
    if (dp < dq) {
      ans = finiteQ(Q.ZERO);
      calc = `${limLatex(at)} ${L(div(num(ratio.n), mul(num(ratio.d), pow(X, dq - dp))))} = 0`;
      asymptote = `La droite $y = 0$ est asymptote horizontale en $${atLatex(at)}$.`;
    } else if (dp === dq) {
      ans = finiteQ(ratio);
      calc = `\\frac{${R(p.lead)}}{${R(q.lead)}} = ${R(ratio)}`;
      asymptote = `La droite $y = ${R(ratio)}$ est asymptote horizontale en $${atLatex(at)}$.`;
    } else {
      ans = inf(monoSign(Q.toNumber(ratio), dp - dq, at));
      calc = `${limLatex(at)} ${L(mono(ratio, dp - dq))} = ${valueLatex(ans)}`;
    }
    const fracLead = `\\frac{${L(mono(p.lead, dp))}}{${L(mono(q.lead, dq))}}`;
    return limit({
      f: div(p.toExpr(), q.toExpr()),
      limits: [{ at, answer: ans, mistakes: ans.kind === 'infinity' ? [{ answer: opposite(ans), message: 'Attention au signe : regarde le signe du quotient des coefficients dominants et la parité de l’exposant restant.' }] : undefined }],
      steps: [
        {
          title: 'Forme indéterminée',
          text: 'Le numérateur et le dénominateur tendent vers l’infini : c’est la forme indéterminée $\\frac{\\infty}{\\infty}$. On garde les **termes de plus haut degré**.',
          formulas: ['l.ops', 'l.rat'],
        },
        { title: 'Termes dominants', math: `${limLatex(at)} f(x) = ${limLatex(at)} ${fracLead}` },
        { title: 'Simplifier et conclure', math: calc },
      ],
      asymptote,
    });
  },
};

const L05: Template = {
  code: 'L05',
  theme: 'limite',
  difficulty: 2,
  subtype: 'valeur-interdite',
  title: 'Limite en une valeur interdite',
  generate(rng) {
    const c = rng.int(-4, 4);
    const a = rng.nonZero(-4, 4);
    let b = rng.int(-6, 6);
    if (a * c + b === 0) b += rng.pick([-1, 1]);
    const N = a * c + b;
    const right = inf(N);
    const left = inf(-N);
    return limit({
      f: div(Poly.fromHigh(a, b).toExpr(), Poly.fromHigh(1, -c).toExpr()),
      domainText: `sur $\\mathbb{R} \\setminus \\{${c}\\}$`,
      limits: [
        { at: c, side: -1, answer: left, mistakes: [{ answer: right, message: `Pour $x < ${c}$, le dénominateur $x - ${c}$ est **négatif**.` }] },
        { at: c, side: 1, answer: right, mistakes: [{ answer: left, message: `Pour $x > ${c}$, le dénominateur $x - ${c}$ est **positif**.` }] },
      ],
      steps: [
        { title: 'Limite du numérateur', math: `\\lim_{x \\to ${c}} (${Poly.fromHigh(a, b).toLatex()}) = ${N}`, text: `Le numérateur tend vers $${N}$ (${N > 0 ? 'positif' : 'négatif'}).` },
        {
          title: 'Signe du dénominateur',
          text: `Le dénominateur $x - ${c}$ tend vers $0$ : il est **négatif** si $x < ${c}$ (on note $0^-$) et **positif** si $x > ${c}$ ($0^+$).`,
        },
        {
          title: 'Règle des signes',
          math: `\\frac{${N}}{0^-} = ${valueLatex(left)} \\qquad \\frac{${N}}{0^+} = ${valueLatex(right)}`,
          formulas: ['l.opsok', 'v.prod'],
        },
      ],
      asymptote: `La droite d'équation $x = ${c}$ est asymptote verticale à la courbe de $f$. La limite en $${c}$ (sans préciser le côté) n'existe pas, car les deux limites sont différentes.`,
    });
  },
};

const L06: Template = {
  code: 'L06',
  theme: 'limite',
  difficulty: 2,
  subtype: 'factorisation',
  title: 'Forme 0/0 par factorisation',
  generate(rng) {
    const c = rng.int(-4, 4);
    const r = rng.intExcept(-5, 5, [c]);
    const k = rng.nonZero(-3, 3);
    const numer = Poly.fromRoots(k, [c, r]);
    const den = Poly.fromHigh(1, -c);
    const val = k * (c - r);
    const simplified = Poly.fromHigh(k, -k * r);
    const kTimes = k === 1 ? '' : `${pn(k)} \\times `;
    return limit({
      f: div(numer.toExpr(), den.toExpr()),
      domainText: `sur $\\mathbb{R} \\setminus \\{${c}\\}$`,
      limits: [{ at: c, answer: finiteQ(Q.rat(val)) }],
      steps: [
        {
          title: 'Forme indéterminée',
          text: `En remplaçant $x$ par $${c}$, le numérateur et le dénominateur valent $0$ : c'est la forme indéterminée $\\frac{0}{0}$. Comme $${c}$ est racine du numérateur, on peut le factoriser par $(${den.toLatex()})$.`,
          formulas: ['l.ops'],
        },
        { title: 'Factoriser', math: `${numer.toLatex()} = ${k === 1 ? '' : k === -1 ? '-' : k}(${den.toLatex()})(${Poly.fromHigh(1, -r).toLatex()})`, formulas: ['v.delta'] },
        { title: 'Simplifier', math: `f(x) = ${simplified.toLatex()} \\quad \\text{pour } x \\neq ${c}` },
        { title: 'Calcul', text: 'Cette expression est continue en ' + `$${c}$ : on remplace.`, math: `\\lim_{x \\to ${c}} f(x) = ${kTimes}(${c} - ${pn(r)}) = ${val}` },
      ],
    });
  },
};

// ——————————————————————————————————— Niveau 3

const L07: Template = {
  code: 'L07',
  theme: 'limite',
  difficulty: 3,
  subtype: 'conjugue',
  title: 'Quantité conjuguée',
  generate(rng) {
    const b = rng.nonZero(-6, 6);
    const c = rng.int(1, 9);
    const inner = Poly.fromHigh(1, b, c);
    const f = add(sqrt(inner.toExpr()), mul(num(-1), X));
    const ans = Q.rat(b, 2);
    return limit({
      f,
      limits: [{ at: '+inf', answer: finiteQ(ans) }],
      steps: [
        {
          title: 'Forme indéterminée',
          text: 'Les deux termes tendent vers $+\\infty$ : forme indéterminée $\\infty - \\infty$. On multiplie par la **quantité conjuguée**.',
          formulas: ['l.ops', 'l.conj'],
        },
        {
          title: 'Quantité conjuguée',
          math: `f(x) = \\frac{(${inner.toLatex()}) - x^2}{\\sqrt{${inner.toLatex()}} + x} = \\frac{${Poly.fromHigh(b, c).toLatex()}}{\\sqrt{${inner.toLatex()}} + x}`,
        },
        {
          title: 'Factoriser par x',
          text: 'Pour $x > 0$, $\\sqrt{x^2} = x$ :',
          math: `f(x) = \\frac{x\\left(${b} + \\frac{${c}}{x}\\right)}{x\\left(\\sqrt{1 ${b > 0 ? '+' : '-'} \\frac{${Math.abs(b)}}{x} + \\frac{${c}}{x^2}} + 1\\right)} = \\frac{${b} + \\frac{${c}}{x}}{\\sqrt{1 ${b > 0 ? '+' : '-'} \\frac{${Math.abs(b)}}{x} + \\frac{${c}}{x^2}} + 1}`,
        },
        { title: 'Calcul', text: 'Les termes en $\\frac{1}{x}$ tendent vers $0$ :', math: `\\lim_{x \\to +\\infty} f(x) = \\frac{${b}}{\\sqrt{1} + 1} = ${R(ans)}` },
      ],
      asymptote: `La droite $y = ${R(ans)}$ est asymptote horizontale en $+\\infty$.`,
    });
  },
};

const L08: Template = {
  code: 'L08',
  theme: 'limite',
  difficulty: 3,
  subtype: 'croissances-comparees',
  title: 'Croissances comparées',
  variants: 5,
  generate(rng, v) {
    const a = rng.nonZero(-5, 5);
    const n = rng.int(1, 3);
    const xn = pow(X, n);
    const variant = v ?? rng.int(0, 4);
    const cc = ['l.cc', 'l.ops'];
    const fi = (form: string) => ({ title: 'Forme indéterminée', text: `On obtient la forme indéterminée $${form}$ : on utilise les **croissances comparées**.`, formulas: cc });
    switch (variant) {
      case 0:
        return limit({
          f: div(mul(num(a), exp(X)), xn),
          domainText: 'sur $]0\\,;\\,+\\infty[$',
          limits: [{ at: '+inf', answer: inf(a), mistakes: [{ answer: finiteQ(Q.ZERO), message: "L'exponentielle l'emporte sur les puissances : $\\frac{\\mathrm{e}^x}{x^n} \\to +\\infty$." }] }],
          steps: [fi('\\frac{\\infty}{\\infty}'), { title: 'Croissances comparées', math: `\\lim_{x \\to +\\infty} \\frac{\\mathrm{e}^{x}}{${L(xn)}} = +\\infty` }, { title: 'Conclusion partielle', text: `On multiplie par $${a}$ (${a > 0 ? 'positif' : 'négatif'}).` }],
        });
      case 1:
        return limit({
          f: mul(num(a), xn, exp(X)),
          limits: [{ at: '-inf', answer: finiteQ(Q.ZERO), mistakes: [{ answer: inf(1), message: "L'exponentielle l'emporte : $x^n\\mathrm{e}^x \\to 0$ en $-\\infty$." }, { answer: inf(-1), message: "L'exponentielle l'emporte : $x^n\\mathrm{e}^x \\to 0$ en $-\\infty$." }] }],
          steps: [fi('\\infty \\times 0'), { title: 'Croissances comparées', math: `\\lim_{x \\to -\\infty} ${L(xn)}\\,\\mathrm{e}^{x} = 0` }, { title: 'Produit', text: `Donc $${a} \\times 0 = 0$.` }],
          asymptote: 'La droite $y = 0$ est asymptote horizontale en $-\\infty$.',
        });
      case 2:
        return limit({
          f: div(mul(num(a), ln(X)), xn),
          domainText: 'sur $]0\\,;\\,+\\infty[$',
          limits: [{ at: '+inf', answer: finiteQ(Q.ZERO) }],
          steps: [fi('\\frac{\\infty}{\\infty}'), { title: 'Croissances comparées', math: `\\lim_{x \\to +\\infty} \\frac{\\ln x}{${L(xn)}} = 0` }, { title: 'Produit', text: `Donc $${a} \\times 0 = 0$.` }],
          asymptote: 'La droite $y = 0$ est asymptote horizontale en $+\\infty$.',
        });
      case 3:
        return limit({
          f: mul(num(a), xn, ln(X)),
          domainText: 'sur $]0\\,;\\,+\\infty[$',
          limits: [{ at: 0, side: 1, answer: finiteQ(Q.ZERO) }],
          steps: [fi('0 \\times \\infty'), { title: 'Croissances comparées', math: `\\lim_{x \\to 0^+} ${L(xn)}\\ln x = 0` }, { title: 'Produit', text: `Donc $${a} \\times 0 = 0$.` }],
        });
      default: {
        const k = rng.int(1, 6);
        return limit({
          f: add(exp(X), mul(num(-k), xn)),
          limits: [{ at: '+inf', answer: inf(1), mistakes: [{ answer: inf(-1), message: "L'exponentielle l'emporte sur les puissances." }] }],
          steps: [
            fi('\\infty - \\infty'),
            { title: 'Factoriser par $\\mathrm{e}^x$', math: `f(x) = \\mathrm{e}^{x}\\left(1 - ${k === 1 ? '' : k}\\frac{${L(xn)}}{\\mathrm{e}^{x}}\\right)` },
            { title: 'Croissances comparées', math: `\\lim_{x \\to +\\infty} \\frac{${L(xn)}}{\\mathrm{e}^{x}} = 0 \\quad \\text{donc} \\quad 1 - ${k === 1 ? '' : k}\\frac{${L(xn)}}{\\mathrm{e}^{x}} \\to 1` },
            { title: 'Produit', text: 'Comme $\\mathrm{e}^x \\to +\\infty$, par produit $f(x) \\to +\\infty$.', formulas: ['l.exp'] },
          ],
        });
      }
    }
  },
};

const L09: Template = {
  code: 'L09',
  theme: 'limite',
  difficulty: 3,
  subtype: 'taux',
  title: "Taux d'accroissement",
  variants: 2,
  generate(rng, variant) {
    const a = rng.pick([-4, -3, -2, 2, 3, 4, 5]);
    const m = rng.pick([1, 1, 2, 3]);
    const ax = mono(a, 1);
    const useExp = variant === undefined ? rng.bool() : variant === 0;
    const numer = useExp ? add(exp(ax), num(-1)) : ln(add(num(1), ax));
    const f = div(numer, mono(m, 1));
    const g = useExp ? '\\frac{\\mathrm{e}^{X} - 1}{X}' : '\\frac{\\ln(1 + X)}{X}';
    const coef = Q.rat(a, m);
    const coefL = R(coef);
    return limit({
      f,
      limits: [{ at: 0, answer: finiteQ(coef), mistakes: [{ answer: finiteQ(Q.ONE), message: `Attention : ici $X = ${a}x$, il reste un facteur $${coefL}$.` }] }],
      steps: [
        { title: 'Forme indéterminée', text: 'En $0$, numérateur et dénominateur tendent vers $0$ : forme $\\frac{0}{0}$.', formulas: ['l.ops'] },
        {
          title: 'Faire apparaître une limite connue',
          text: `On pose $X = ${L(ax)}$ ; quand $x \\to 0$, $X \\to 0$.`,
          math: `f(x) = ${m === 1 ? '' : `\\frac{${a}}{${m}}`}${m === 1 ? a : ''} \\times ${L(div(numer, ax))} = ${coefL} \\times ${g}`,
          formulas: ['l.taux', 'l.comp'],
        },
        { title: 'Calcul', math: `\\lim_{X \\to 0} ${g} = 1 \\quad \\text{donc} \\quad \\lim_{x \\to 0} f(x) = ${coefL}` },
      ],
    });
  },
};

const L10: Template = {
  code: 'L10',
  theme: 'limite',
  difficulty: 3,
  subtype: 'composee',
  title: "Limite d'une fonction composée",
  variants: 2,
  generate(rng, variant) {
    if (variant === undefined ? rng.bool() : variant === 0) {
      const a = rng.nonZero(-4, 4);
      const b = rng.int(-5, 5);
      const c = rng.nonZero(1, 3);
      const d = rng.int(1, 5);
      const inner = div(Poly.fromHigh(a, b).toExpr(), Poly.fromHigh(c, d).toExpr());
      const l = Q.rat(a, c);
      const ansE = exp(num(l));
      return limit({
        f: exp(inner),
        limits: [{ at: '+inf', answer: finiteE(ansE) }],
        steps: [
          { title: 'Limite de la fonction intérieure', text: 'Quotient des termes de plus haut degré :', math: `\\lim_{x \\to +\\infty} ${L(inner)} = \\frac{${a}}{${c}} = ${R(l)}`, formulas: ['l.rat'] },
          { title: 'Composition', text: 'La fonction exponentielle est continue :', math: `\\lim_{X \\to ${R(l)}} \\mathrm{e}^{X} = ${L(ansE)}`, formulas: ['l.comp'] },
        ],
        asymptote: `La droite $y = ${L(ansE)}$ est asymptote horizontale en $+\\infty$.`,
      });
    }
    const a = rng.int(2, 7);
    const b = rng.int(-5, 5);
    const d = rng.int(1, 5);
    const inner = div(Poly.fromHigh(a, b).toExpr(), Poly.fromHigh(1, d).toExpr());
    const ansE = ln(num(a));
    return limit({
      f: ln(inner),
      domainText: 'sur un intervalle de la forme $]A\\,;\\,+\\infty[$',
      limits: [{ at: '+inf', answer: finiteE(ansE) }],
      steps: [
        { title: 'Limite de la fonction intérieure', math: `\\lim_{x \\to +\\infty} ${L(inner)} = \\frac{${a}}{1} = ${a}`, formulas: ['l.rat'] },
        { title: 'Composition', text: 'La fonction ln est continue en ' + `$${a}$ :`, math: `\\lim_{X \\to ${a}} \\ln X = ${L(ansE)}`, formulas: ['l.comp'] },
      ],
    });
  },
};

// ——————————————————————————————————— Format « TD »

/** Coefficient au hasard : entier non nul, parfois une fraction (−23/5, 62/5…). */
function coef(rng: Rng, fracProb = 0.25): Rational {
  if (rng.bool(fracProb)) {
    const q = rng.pick([2, 3, 5]);
    let p = rng.nonZero(-70, 70);
    if (p % q === 0) p += p > 0 ? 1 : -1;
    return Q.rat(p, q);
  }
  return Q.rat(rng.nonZero(-9, 9));
}

/** Polynôme écrit « en vrac » : termes dans le désordre, parfois deux termes de même degré. */
function scrambled(rng: Rng, p: Poly): Expr {
  const terms: Expr[] = [];
  for (let k = 0; k < p.c.length; k++) {
    const c = p.coef(k);
    if (Q.isZero(c)) continue;
    if (k > 0 && Q.isInt(c) && rng.bool(0.3)) {
      const c1 = rng.intExcept(-9, 9, [0, c.n]);
      terms.push(mono(c1, k), mono(Q.sub(c, Q.rat(c1)), k));
      continue;
    }
    terms.push(k === 0 ? num(c) : mono(c, k));
  }
  const mixed = rng.shuffle(terms);
  return mixed.length === 1 ? mixed[0] : { type: 'add', terms: mixed };
}

function tdPoly(rng: Rng, d: number): Poly {
  const c: Rational[] = [];
  for (let k = 0; k < d; k++) c.push(rng.bool(0.3) ? Q.ZERO : coef(rng));
  c.push(coef(rng, 0.1));
  return new Poly(c);
}

const L11: Template = {
  code: 'L11',
  theme: 'limite',
  difficulty: 1,
  subtype: 'valeur-interdite',
  title: 'Limite de k/(x − a) à gauche ou à droite',
  variants: 4,
  generate(rng, variant) {
    const k = rng.nonZero(-15, 15);
    const a = (variant === undefined ? rng.bool(0.3) : variant >= 2) ? (() => {
      const q = rng.pick([2, 3, 4, 5]);
      let p = rng.nonZero(-70, 70);
      if (p % q === 0) p += 1;
      return Q.rat(p, q);
    })() : Q.rat(rng.int(-20, 20));
    const side = variant === undefined ? rng.sign() : variant % 2 === 0 ? 1 : -1;
    const den = add(X, num(Q.neg(a)));
    const f = div(num(k), den);
    const ans = inf(k * side);
    const al = R(a);
    const zs = side > 0 ? '0^{+}' : '0^{-}';
    return limit({
      f,
      limits: [
        {
          at: Q.toNumber(a),
          side,
          answer: ans,
          mistakes: [{ answer: opposite(ans), message: `Regarde le signe du dénominateur : pour $x ${side > 0 ? '>' : '<'} ${al}$, $${L(den)}$ est ${side > 0 ? 'positif' : 'négatif'}.` }],
        },
      ],
      steps: [
        { title: 'Numérateur', text: `Le numérateur est la constante $${k}$ (${k > 0 ? 'positive' : 'négative'}).` },
        {
          title: 'Signe du dénominateur',
          text: `Quand $x \\to ${al}^{${side > 0 ? '+' : '-'}}$, on a $x ${side > 0 ? '>' : '<'} ${al}$, donc $${L(den)}$ tend vers $0$ en restant ${side > 0 ? 'positif' : 'négatif'} : on note $${zs}$.`,
        },
        { title: 'Règle des signes', math: `\\frac{${k}}{${zs}} = ${valueLatex(ans)}`, formulas: ['l.opsok', 'l.inv'] },
      ],
      asymptote: `La droite d'équation $x = ${al}$ est asymptote verticale à la courbe.`,
    });
  },
};

const L12: Template = {
  code: 'L12',
  theme: 'limite',
  difficulty: 2,
  subtype: 'rationnelle',
  title: 'Fraction rationnelle en l’infini (termes en vrac)',
  variants: 4,
  generate(rng, variant) {
    let dn = rng.int(0, 4);
    let dd = rng.int(1, 4);
    if (variant === 0) dn = 0;
    if (variant === 1) {
      dd = Math.max(dd, 2);
      dn = rng.int(1, dd - 1);
    }
    if (variant === 2) dn = dd;
    if (variant === 3) {
      dd = Math.min(dd, 3);
      dn = dd + rng.int(1, 2);
    }
    const p = tdPoly(rng, dn);
    const q = tdPoly(rng, dd);
    const at = rng.bool(0.7) ? ('-inf' as const) : ('+inf' as const);
    const N = scrambled(rng, p);
    const D = scrambled(rng, q);
    const f: Expr = { type: 'div', num: N, den: D };
    const steps: Step[] = [];
    if (L(N) !== p.toLatex() || L(D) !== q.toLatex()) {
      steps.push({
        title: 'Ranger et réduire',
        text: 'On range les termes par degrés décroissants et on regroupe ceux de même degré :',
        math: `\\frac{${L(N)}}{${L(D)}} = \\frac{${p.toLatex()}}{${q.toLatex()}}`,
      });
    }
    let ans: ValueAnswer;
    const leadN = L(mono(p.lead, Math.max(0, p.degree)));
    const leadD = L(mono(q.lead, q.degree));
    const denLim = inf(monoSign(Q.toNumber(q.lead), q.degree, at));
    if (p.degree <= 0) {
      ans = finiteQ(Q.ZERO);
      steps.push({
        title: 'Numérateur constant',
        text: `Le numérateur vaut $${R(p.coef(0))}$ ; le dénominateur a la même limite que $${leadD}$, c’est-à-dire $${valueLatex(denLim)}$. Par quotient, la limite est $0$.`,
        formulas: ['l.poly', 'l.opsok'],
      });
    } else {
      const k = p.degree - q.degree;
      const r = Q.div(p.lead, q.lead);
      const simplified = k === 0 ? R(r) : k > 0 ? L(mono(r, k)) : L(div(num(r.n), mul(num(r.d), pow(X, -k))));
      ans = k < 0 ? finiteQ(Q.ZERO) : k === 0 ? finiteQ(r) : inf(monoSign(Q.toNumber(r), k, at));
      steps.push(
        { title: 'Forme indéterminée', text: 'Numérateur et dénominateur tendent vers l’infini : forme $\\frac{\\infty}{\\infty}$. On garde les termes de plus haut degré.', formulas: ['l.ops', 'l.rat'] },
        {
          title: 'Termes de plus haut degré',
          math: `${limLatex(at)} \\frac{${leadN}}{${leadD}} = ${limLatex(at)} ${simplified} = ${valueLatex(ans)}`,
          text: k > 0 && at === '-inf' ? `En $-\\infty$, $x^{${k}}$ tend vers $${k % 2 ? '-' : '+'}\\infty$ (exposant ${k % 2 ? 'impair' : 'pair'}).` : undefined,
          formulas: ['l.xn'],
        },
      );
    }
    const mistakes: ValueQuestion['mistakes'] = [];
    if (ans.kind === 'infinity') mistakes.push({ answer: opposite(ans), message: 'Attention au signe : regarde le signe du quotient des coefficients dominants et la parité de l’exposant restant en $-\\infty$.' });
    if (!Q.isZero(q.coef(0)) && p.degree > 0) {
      mistakes.push({ answer: finiteQ(Q.div(p.coef(0), q.coef(0))), message: 'Ce sont les termes de **plus haut degré** qui comptent en l’infini, pas les constantes.' });
    }
    return limit({
      f,
      limits: [{ at, answer: ans, mistakes }],
      steps,
      asymptote: ans.kind === 'finite' ? `La droite $y = ${valueLatex(ans)}$ est asymptote horizontale en $${atLatex(at)}$.` : undefined,
    });
  },
};

export const LIMIT_TEMPLATES: Template[] = [L01, L02, L03, L04, L05, L06, L07, L08, L09, L10, L11, L12];

import { num } from '../../core/expr/build';
import { curveSlopes, evalCurve, type Knot } from '../../core/curve';
import type { Rng } from '../../core/random/prng';
import type { ExerciseDraft, GraphData, Question, SignRow, Step, TableData, Template } from '../types';
import { type Axis, factorRow, makeTable, variationRow } from './table';

/**
 * Lecture graphique : l'énoncé donne seulement la courbe de f (points de
 * passage entiers, lisibles sur le quadrillage) et l'élève en déduit le
 * tableau de signes ou de variations.
 */
interface Curve {
  graph: GraphData;
  /** Bornes et extremums (points où la courbe change de sens). */
  xs: number[];
  ys: number[];
  zeros: number[];
  f: (x: number) => number;
}

function randomCurve(rng: Rng, nExt: number, nZeros?: number): Curve {
  for (let attempt = 0; attempt < 500; attempt++) {
    const a = rng.int(-5, -2);
    const b = a + rng.int(7, 10);
    // Extremums entiers, espacés d'au moins 2 carreaux (place pour un zéro entre deux)
    const ext: number[] = [];
    for (const x of rng.shuffle(Array.from({ length: b - a - 3 }, (_, i) => a + 2 + i))) {
      // Pas de sommet sur l'axe des ordonnées : il cacherait la graduation
      if (ext.length < nExt && x !== 0 && ext.every((e) => Math.abs(e - x) >= 2)) ext.push(x);
    }
    if (ext.length < nExt) continue;
    ext.sort((p, q) => p - q);
    const xs = [a, ...ext, b];
    let up = rng.bool();
    const ys = [rng.nonZero(-4, 4)];
    let ok = true;
    for (let i = 1; i < xs.length; i++, up = !up) {
      const prev = ys[i - 1];
      const choices = Array.from({ length: 11 }, (_, k) => k - 5).filter((y) => y !== 0 && (up ? y >= prev + 2 : y <= prev - 2) && Math.abs(y - prev) <= 2.5 * (xs[i] - xs[i - 1]));
      if (!choices.length) {
        ok = false;
        break;
      }
      ys.push(rng.pick(choices));
    }
    if (!ok) continue;
    const zeros: number[] = [];
    for (let i = 0; i < xs.length - 1; i++) {
      if (ys[i] * ys[i + 1] > 0) continue;
      zeros.push(rng.int(xs[i] + 1, xs[i + 1] - 1));
    }
    if (nZeros !== undefined ? zeros.length !== nZeros : zeros.length === 0) continue;
    const knots: Knot[] = [...xs.map((x, i): Knot => [x, ys[i]]), ...zeros.map((z): Knot => [z, 0])].sort((p, q) => p[0] - q[0]);
    const slopes = curveSlopes(knots);
    return { graph: { knots }, xs, ys, zeros, f: (x) => evalCurve(knots, x, slopes) };
  }
  throw new Error('courbe introuvable');
}

const I = (a: number, b: number) => `[${a}\\,;\\,${b}]`;
const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`);

function signTableOf(c: Curve): TableData {
  const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
  const axis: Axis = { xs: c.zeros, xsLatex: c.zeros.map(String), lo: { value: a, latex: String(a) }, hi: { value: b, latex: String(b) } };
  return makeTable(axis, [factorRow(axis, { label: 'f(x)', f: c.f })]);
}

function variationTableOf(c: Curve, withDerivative: boolean): TableData {
  const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
  const inner = c.xs.slice(1, -1);
  const axis: Axis = { xs: inner, xsLatex: inner.map(String), lo: { value: a, latex: String(a) }, hi: { value: b, latex: String(b) } };
  const dRow: SignRow = {
    kind: 'sign',
    label: "f'(x)",
    signs: c.ys.slice(1).map((y, i) => (y > c.ys[i] ? '+' : '-')),
    marks: c.xs.map((_, i) => (i === 0 || i === c.xs.length - 1 ? '' : '0')),
  };
  const vRow = variationRow('f', dRow, c.ys.map(String));
  return makeTable(axis, withDerivative ? [dRow, vRow] : [vRow]);
}

function signSteps(c: Curve, table: TableData): Step[] {
  const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
  const bounds = [a, ...c.zeros, b];
  const row = table.rows[0] as SignRow;
  const where = (s: '+' | '-') =>
    row.signs.flatMap((v, i) => (v === s ? [`$${i === 0 ? `[${bounds[i]}` : `]${bounds[i]}`}\\,;\\,${i === row.signs.length - 1 ? `${bounds[i + 1]}]` : `${bounds[i + 1]}[`}$`] : []));
  const pos = where('+');
  const neg = where('-');
  return [
    {
      title: 'Lire les zéros',
      text: `La courbe coupe l'axe des abscisses en ${list(c.zeros.map((z) => `$x = ${z}$`))} : ${c.zeros.length > 1 ? 'ce sont les solutions' : 'c’est la solution'} de $f(x) = 0$ (un $0$ dans le tableau).`,
    },
    {
      title: 'Lire le signe',
      text: `$f(x) > 0$ là où la courbe est **au-dessus** de l'axe des abscisses${pos.length ? ` : ${list(pos)}` : ''} ; $f(x) < 0$ là où elle est **en dessous**${neg.length ? ` : ${list(neg)}` : ''}.`,
    },
    { title: 'Tableau de signes', table },
  ];
}

function variationSteps(c: Curve, table: TableData, withDerivative: boolean): Step[] {
  const segs = c.ys.slice(1).map((y, i) => ({ up: y > c.ys[i], iv: `$${I(c.xs[i], c.xs[i + 1])}$` }));
  const ups = segs.filter((s) => s.up).map((s) => s.iv);
  const downs = segs.filter((s) => !s.up).map((s) => s.iv);
  const steps: Step[] = [
    {
      title: 'Lire le sens de variation',
      text: `En lisant la courbe de gauche à droite : elle **monte** sur ${ups.length ? list(ups) : '—'} ($f$ croissante) et **descend** sur ${downs.length ? list(downs) : '—'} ($f$ décroissante).`,
    },
    {
      title: 'Lire les valeurs',
      text: `On lit l'ordonnée des points où la courbe change de sens et des extrémités : ${list(c.xs.map((x, i) => `$f(${x}) = ${c.ys[i]}$`))}.`,
    },
  ];
  if (withDerivative) {
    steps.push({
      title: "Signe de f'(x)",
      text: "$f'(x) > 0$ là où $f$ est croissante, $f'(x) < 0$ là où elle est décroissante, et $f'(x) = 0$ aux sommets (tangente horizontale).",
      formulas: ['v.var'],
    });
  }
  steps.push({ title: 'Tableau de variations', table, formulas: withDerivative ? undefined : ['v.var'] });
  return steps;
}

function graphDraft(c: Curve, questions: Question[], steps: Step[]): ExerciseDraft {
  const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
  return {
    statement: `On donne ci-dessous la courbe représentative $\\mathcal{C}_f$ d'une fonction $f$ définie sur $${I(a, b)}$.`,
    lead: 'Pour chaque fonction dont la courbe est donnée, répondre aux questions par lecture graphique.',
    item: `Fonction $f$ définie sur $${I(a, b)}$ :`,
    graph: c.graph,
    questions,
    steps,
    meta: [{ kind: 'graph', graph: c.graph }],
  };
}

const V10: Template = {
  code: 'V10',
  theme: 'variation',
  difficulty: 1,
  subtype: 'lecture-graphique',
  title: 'Tableau de signes à partir d’une courbe',
  variants: 3,
  generate(rng, variant) {
    const nZeros = variant === undefined ? rng.int(1, 3) : variant + 1;
    const c = randomCurve(rng, Math.min(3, nZeros - 1 + rng.int(0, 1)), nZeros);
    const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
    const table = signTableOf(c);
    return graphDraft(
      c,
      [
        { id: 'q1', type: 'roots', prompt: 'Résoudre graphiquement l’équation $f(x) = 0$.', expected: c.zeros, expectedLatex: c.zeros.map(String) },
        { id: 'q2', type: 'table', prompt: `Dresser le tableau de signes de $f(x)$ sur $${I(a, b)}$.`, expected: table },
      ],
      signSteps(c, table),
    );
  },
};

const V11: Template = {
  code: 'V11',
  theme: 'variation',
  difficulty: 1,
  subtype: 'lecture-graphique',
  title: 'Tableau de variations à partir d’une courbe',
  variants: 3,
  generate(rng, variant) {
    const c = randomCurve(rng, variant === undefined ? rng.int(1, 3) : variant + 1);
    const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
    const table = variationTableOf(c, false);
    const kind = rng.bool() ? 'maximum' : 'minimum';
    const best = kind === 'maximum' ? Math.max(...c.ys) : Math.min(...c.ys);
    const at = c.xs[c.ys.indexOf(best)];
    return graphDraft(
      c,
      [
        { id: 'q1', type: 'table', prompt: `Dresser le tableau de variations de $f$ sur $${I(a, b)}$.`, expected: table },
        {
          id: 'q2',
          type: 'value',
          prompt: `Quel est le ${kind} de $f$ sur $${I(a, b)}$ ?`,
          label: `\\text{${kind}} =`,
          expected: { kind: 'finite', expr: num(best), latex: String(best) },
        },
      ],
      [
        ...variationSteps(c, table, false),
        {
          title: kind === 'maximum' ? 'Maximum' : 'Minimum',
          text: `Le point le plus ${kind === 'maximum' ? 'haut' : 'bas'} de la courbe est $(${at}\\,;\\,${best})$ : le ${kind} de $f$ sur $${I(a, b)}$ vaut $${best}$, atteint en $x = ${at}$.`,
        },
      ],
    );
  },
};

const V12: Template = {
  code: 'V12',
  theme: 'variation',
  difficulty: 2,
  subtype: 'lecture-graphique',
  title: 'Signe et variations à partir d’une courbe',
  variants: 2,
  generate(rng, variant) {
    const c = randomCurve(rng, variant === undefined ? rng.int(1, 2) : variant + 1);
    const [a, b] = [c.xs[0], c.xs[c.xs.length - 1]];
    const vTable = variationTableOf(c, true);
    const sTable = signTableOf(c);
    return graphDraft(
      c,
      [
        { id: 'q1', type: 'table', prompt: `Dresser le tableau de variations de $f$ sur $${I(a, b)}$, avec le signe de $f'(x)$.`, expected: vTable },
        { id: 'q2', type: 'table', prompt: `Dresser le tableau de signes de $f(x)$ sur $${I(a, b)}$.`, expected: sTable },
      ],
      [...variationSteps(c, vTable, true), ...signSteps(c, sTable)],
    );
  },
};


// ——————————————————————————————————— Courbe avec asymptote verticale (valeur interdite ||)

type Asym = NonNullable<GraphData['asymptote']>;

interface AsymCurve {
  graph: GraphData;
  a: number;
  b: number;
  p: number;
  /** Sommets (abscisses), hors bornes. */
  ext: number[];
  zeros: number[];
  f: (x: number) => number;
  df: (x: number) => number;
}

function asymCurve(h: Asym, a: number, b: number, ext: number[], zeros: number[]): AsymCurve {
  const f = (x: number) => h.s * (h.lin * (x - h.p) + h.m / (x - h.p)) + h.k;
  const df = (x: number) => h.s * (h.lin - h.m / (x - h.p) ** 2);
  const knots = [a, ...ext, ...zeros, b].sort((u, v) => u - v).map((x): Knot => [x, Math.round(f(x))]);
  return { graph: { knots, asymptote: h }, a, b, p: h.p, ext, zeros, f, df };
}

/** k + m/(x − p) : une branche monotone de chaque côté, un zéro entier. */
function homographic(rng: Rng): AsymCurve {
  for (;;) {
    const p = rng.int(-2, 3);
    const mAbs = rng.pick([2, 3, 4, 6]);
    const m = mAbs * rng.sign();
    const divs = [1, 2, 3, 4, 5].filter((d) => mAbs % d === 0);
    const d1 = rng.pick(divs);
    const d2 = rng.pick(divs);
    if (d1 + d2 < 4) continue;
    const k = rng.pick(divs.filter((d) => d <= 3)) * rng.sign();
    const x0 = p - m / k;
    const [a, b] = [p - d1, p + d2];
    if (!(x0 > a && x0 < b) || x0 === p) continue;
    const c = asymCurve({ p, m, k, lin: 0, s: 1 }, a, b, [], [x0]);
    if (Math.abs(c.f(a)) > 6 || Math.abs(c.f(b)) > 6) continue;
    return c;
  }
}

/** ±(t + 4/t) + k, t = x − p : un maximum et un minimum de part et d'autre de l'asymptote. */
function withExtrema(rng: Rng): AsymCurve {
  const p = rng.int(-1, 2);
  const s = rng.sign();
  const k = rng.int(-2, 2);
  return asymCurve({ p, m: 4, k, lin: 1, s }, p - 4, p + 4, [p - 2, p + 2], []);
}

function asymSignTable(c: AsymCurve): TableData {
  const inner = [...c.zeros, c.p].sort((u, v) => u - v);
  const axis: Axis = { xs: inner, xsLatex: inner.map(String), lo: { value: c.a, latex: String(c.a) }, hi: { value: c.b, latex: String(c.b) } };
  const bounds = [c.a, ...inner, c.b];
  const row: SignRow = {
    kind: 'sign',
    label: 'f(x)',
    signs: bounds.slice(1).map((x, i) => (c.f((x + bounds[i]) / 2) > 0 ? '+' : '-')),
    marks: bounds.map((x, i) => (i === 0 || i === bounds.length - 1 ? '' : x === c.p ? '||' : '0')),
  };
  return makeTable(axis, [row]);
}

function asymVariationTable(c: AsymCurve): TableData {
  const inner = [...c.ext, c.p].sort((u, v) => u - v);
  const axis: Axis = { xs: inner, xsLatex: inner.map(String), lo: { value: c.a, latex: String(c.a) }, hi: { value: c.b, latex: String(c.b) } };
  const bounds = [c.a, ...inner, c.b];
  const dRow: SignRow = {
    kind: 'sign',
    label: "f'(x)",
    signs: bounds.slice(1).map((x, i) => (c.df((x + bounds[i]) / 2) > 0 ? '+' : '-')),
    marks: bounds.map((x, i) => (i === 0 || i === bounds.length - 1 ? '' : x === c.p ? '||' : '0')),
  };
  return makeTable(axis, [dRow, variationRow('f', dRow, bounds.map((x) => (x === c.p ? null : String(Math.round(c.f(x))))))]);
}

const V14: Template = {
  code: 'V14',
  theme: 'variation',
  difficulty: 2,
  subtype: 'lecture-graphique',
  title: 'Courbe avec une valeur interdite',
  variants: 2,
  generate(rng, variant) {
    const form = variant ?? (rng.bool() ? 0 : 1);
    const c = form === 0 ? homographic(rng) : withExtrema(rng);
    const vTable = asymVariationTable(c);
    const sTable = asymSignTable(c);
    const D = I(c.a, c.b);
    const questions: Question[] = [
      {
        id: 'q1',
        type: 'value',
        prompt: 'Pour quelle valeur de $x$ la fonction $f$ n’est-elle pas définie ?',
        label: 'x =',
        expected: { kind: 'finite', expr: num(c.p), latex: String(c.p) },
      },
      { id: 'q2', type: 'table', prompt: `Dresser le tableau de variations de $f$, avec le signe de $f'(x)$.`, expected: vTable },
      { id: 'q3', type: 'table', prompt: 'Dresser le tableau de signes de $f(x)$.', expected: sTable },
    ];
    const left = `$[${c.a}\\,;\\,${c.p}[$`;
    const right = `$]${c.p}\\,;\\,${c.b}]$`;
    const steps: Step[] = [
      {
        title: 'Valeur interdite',
        text: `La courbe est en deux morceaux : de part et d'autre de la droite verticale $x = ${c.p}$ (en pointillés), elle part vers l'infini sans jamais la toucher. C'est une **asymptote verticale** : $f$ n'est pas définie en $${c.p}$. Dans les tableaux, on met une **double barre** $||$ sous $${c.p}$, et aucune valeur de $f$.`,
      },
      {
        title: 'Lire le sens de variation',
        text:
          form === 0
            ? `Sur ${left} la courbe ${c.df(c.a) > 0 ? 'monte' : 'descend'}, et sur ${right} elle ${c.df(c.b) > 0 ? 'monte' : 'descend'} aussi : $f$ est ${c.df(c.a) > 0 ? 'croissante' : 'décroissante'} sur chacun des deux intervalles (mais pas sur leur réunion : la double barre sépare les flèches).`
            : `Sur ${left} la courbe ${c.df(c.a) > 0 ? 'monte jusqu’au sommet puis descend' : 'descend jusqu’au creux puis remonte'} ; sur ${right} elle ${c.df(c.b) > 0 ? 'descend jusqu’au creux puis remonte' : 'monte jusqu’au sommet puis descend'}. Les sommets sont en $x = ${c.ext[0]}$ et $x = ${c.ext[1]}$ (tangente horizontale : $f'(x) = 0$).`,
      },
      {
        title: 'Lire les valeurs',
        text: `On lit : ${list(c.graph.knots.filter(([x]) => !c.zeros.includes(x)).map(([x, y]) => `$f(${x}) = ${y}$`))}.`,
      },
      { title: 'Tableau de variations', table: vTable, formulas: ['v.var'] },
      {
        title: 'Lire le signe',
        text: `${c.zeros.length ? `La courbe coupe l'axe des abscisses en $x = ${c.zeros[0]}$ (un $0$ dans le tableau). ` : 'La courbe ne coupe jamais l’axe des abscisses : pas de $0$ dans le tableau. '}$f(x) > 0$ là où la courbe est au-dessus de l'axe, $f(x) < 0$ là où elle est en dessous. Le signe peut changer en passant la double barre, sans passer par $0$.`,
      },
      { title: 'Tableau de signes', table: sTable },
    ];
    return {
      statement: `On donne ci-dessous la courbe représentative $\\mathcal{C}_f$ d'une fonction $f$ définie sur $${D}$ sauf en une valeur.`,
      lead: 'Pour chaque fonction dont la courbe est donnée, répondre aux questions par lecture graphique.',
      item: `Fonction $f$ définie sur $${D}$ sauf en une valeur :`,
      graph: c.graph,
      questions,
      steps,
      meta: [{ kind: 'graph', graph: c.graph }],
    };
  },
};

export const GRAPH_TEMPLATES: Template[] = [V10, V11, V12, V14];

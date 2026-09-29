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

export const GRAPH_TEMPLATES: Template[] = [V10, V11, V12];

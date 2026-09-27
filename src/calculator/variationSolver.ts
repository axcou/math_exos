import type { Expr } from '../core/expr/ast';
import { toLatex } from '../core/expr/toLatex';
import type { Arrow, Step, TableData, VariationRow } from '../exercises/types';
import { solveDerivative } from './derivativeSolver';
import { solveLimit, valLatex } from './limitSolver';
import { hasVar } from '../core/expr/evaluate';
import { substituteVar, tidy } from '../core/expr/simplify';
import { niceExpr, niceLatex } from './nice';
import { bracket, domainOf, intervalLatex, type Root, solveSign, valueAt } from './signSolver';

/*
 * Tableau de variations expliqué :
 * domaine → dérivée (détaillée) → signe de f' → flèches, extremums et
 * limites aux bornes (calculées par le moteur de limites).
 */

export interface VariationSection {
  title: string;
  steps: Step[];
}

export interface VariationReport {
  sections: VariationSection[];
  table: TableData | null;
  warning?: string;
}

const L = toLatex;

/** f(a) en écriture exacte si possible (−e^{-2}, 2 − 2ln 2…), sinon valeur approchée. */
export function exactValue(f: Expr, a: number): string {
  const v = valueAt(f, a);
  const xa = niceExpr(a);
  if (xa) {
    const e = tidy(substituteVar(f, xa));
    const l = L(e);
    if (!hasVar(e) && l.length < 60 && Math.abs(valueAt(e, 0) - v) < 1e-9 * Math.max(1, Math.abs(v))) return l;
  }
  return niceLatex(v);
}

/** Valeur ou limite de f à une borne du tableau. */
function boundValue(f: Expr, x: Root, side: 1 | -1, included: boolean): string | null {
  if (included && Number.isFinite(x.v)) {
    const v = valueAt(f, x.v);
    if (Number.isFinite(v)) return exactValue(f, x.v);
  }
  const at = x.v === Infinity ? '+inf' : x.v === -Infinity ? '-inf' : x.v;
  const r = solveLimit(f, { at, side: typeof at === 'number' ? side : 0 });
  if (r.value.k === 'fin' || r.value.k === 'inf') return valLatex(r.value);
  if (r.value.k === 'approx') return valLatex(r.value);
  return null;
}

export function solveVariations(f: Expr): VariationReport {
  const sections: VariationSection[] = [];
  const dom = domainOf(f);
  if (!dom) return { sections: [{ title: 'Domaine', steps: [{ title: 'Domaine', text: 'Le domaine de définition n’est pas un intervalle : ce cas n’est pas pris en charge.' }] }], table: null };
  const I = dom.interval;

  // 1. Dérivée
  const d = solveDerivative(f);
  sections.push({ title: 'Calcul de la dérivée', steps: d.steps });

  // 2. Signe de f'
  const sign = solveSign(d.df, { label: "f'(x)", restrict: I });
  const signSteps = sign.steps.filter((s) => s.title !== 'Tableau de signes');
  sections.push({ title: "Signe de f'(x)", steps: signSteps });
  if (!sign.table) return { sections, table: null, warning: sign.warning };

  // 3. Tableau de variations
  const xs = sign.xs;
  const arrows: Arrow[] = sign.signs.map((s) => (s === '+' ? 'up' : 'down'));
  const forbidden = xs.map((x, i) => i > 0 && i < xs.length - 1 && !Number.isFinite(valueAt(f, x.v)));
  const values = xs.map((x, i) => {
    if (forbidden[i]) return null;
    if (i === 0) return boundValue(f, x, 1, I.loIn);
    if (i === xs.length - 1) return boundValue(f, x, -1, I.hiIn);
    const v = valueAt(f, x.v);
    return Number.isFinite(v) ? exactValue(f, x.v) : null;
  });
  const row: VariationRow = { kind: 'variation', label: 'f', arrows, values, forbidden };
  const table: TableData = { ...sign.table, rows: [...sign.table.rows, row] };

  const interval = (i: number) => {
    const a = xs[i];
    const b = xs[i + 1];
    const closedA = i === 0 ? I.loIn : !forbidden[i];
    const closedB = i === xs.length - 2 ? I.hiIn : !forbidden[i + 1];
    return bracket(closedA && Number.isFinite(a.v), a.latex, b.latex, closedB && Number.isFinite(b.v));
  };
  const up = arrows.map((a, i) => (a === 'up' ? interval(i) : null)).filter(Boolean);
  const down = arrows.map((a, i) => (a === 'down' ? interval(i) : null)).filter(Boolean);
  const extrema: string[] = [];
  for (let i = 1; i < xs.length - 1; i++) {
    if (forbidden[i] || arrows[i - 1] === arrows[i]) continue;
    const kind = arrows[i - 1] === 'up' ? 'maximum' : 'minimum';
    const eq = values[i]?.startsWith('\\approx') ? '' : '= ';
    extrema.push(`un ${kind} local $f(${xs[i].latex}) ${eq}${values[i]}$ en $x = ${xs[i].latex}$`);
  }
  const hasForbidden = forbidden.some(Boolean);
  const steps: Step[] = [
    {
      title: 'Tableau de variations',
      text: `Sur un intervalle où $f'(x) > 0$, $f$ est strictement croissante ; où $f'(x) < 0$, elle est strictement décroissante. Aux bornes, on indique les limites${hasForbidden ? ' ; une double barre marque une valeur interdite' : ''}.`,
      table,
      formulas: ['v.var', 'v.extr'],
    },
    {
      title: 'Conclusion',
      text: [
        up.length ? `$f$ est strictement croissante sur $${up.join('$ et sur $')}$` : null,
        down.length ? `$f$ est strictement décroissante sur $${down.join('$ et sur $')}$` : null,
        extrema.length ? `$f$ admet ${extrema.join(' et ')}` : null,
      ]
        .filter(Boolean)
        .join('. ') + '.',
    },
  ];
  sections.push({ title: 'Variations de f', steps });
  const domainStep: Step = {
    title: 'Domaine de définition',
    text: `$f(x) = ${L(f)}$ est définie${dom.holes.length ? ' et dérivable' : ''} sur $${I.lo === -Infinity && I.hi === Infinity && !dom.holes.length ? '\\mathbb{R}' : intervalLatex(I) + (dom.holes.length ? ` \\setminus \\{${dom.holes.map((h) => niceLatex(h)).join(' ; ')}\\}` : '')}$.`,
  };
  sections.unshift({ title: 'Domaine', steps: [domainStep] });
  return { sections, table, warning: sign.warning ?? (d.checked ? undefined : 'La dérivée n’a pas pu être contrôlée.') };
}

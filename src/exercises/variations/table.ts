import type { Arrow, Mark, Sign, SignRow, TableData, VariationRow } from '../types';

/** Facteur d'un produit / quotient, évaluable numériquement. */
export interface Factor {
  label: string;
  f: (x: number) => number;
  denominator?: boolean;
}

export interface Axis {
  /** Valeurs critiques intérieures, triées. */
  xs: number[];
  xsLatex: string[];
  /** Bornes du domaine (défaut : ±∞). */
  lo?: { value: number; latex: string };
  hi?: { value: number; latex: string };
}

const EPS = 1e-9;

function samplePoints(axis: Axis): number[] {
  const lo = axis.lo?.value ?? -Infinity;
  const hi = axis.hi?.value ?? Infinity;
  const pts = [lo, ...axis.xs, hi];
  const out: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    if (a === -Infinity && b === Infinity) out.push(0.5);
    else if (a === -Infinity) out.push(b - 1);
    else if (b === Infinity) out.push(a + 1);
    else out.push((a + b) / 2);
  }
  return out;
}

export function axisValues(axis: Axis): number[] {
  return [axis.lo?.value ?? -Infinity, ...axis.xs, axis.hi?.value ?? Infinity];
}

/** Assemble un tableau à partir de l'axe et des lignes. */
export function makeTable(axis: Axis, rows: TableData['rows']): TableData {
  return { xs: axisLatex(axis), xv: axisValues(axis), rows };
}

export function axisLatex(axis: Axis): string[] {
  return [axis.lo?.latex ?? '-\\infty', ...axis.xsLatex, axis.hi?.latex ?? '+\\infty'];
}

function signOf(v: number): Sign {
  return v > 0 ? '+' : '-';
}

export function factorRow(axis: Axis, fac: Factor): SignRow {
  const signs = samplePoints(axis).map((x) => signOf(fac.f(x)));
  const marks: Mark[] = ['', ...axis.xs.map((x): Mark => (Math.abs(fac.f(x)) < EPS ? (fac.denominator ? '||' : '0') : '')), ''];
  return { kind: 'sign', label: fac.label, signs, marks };
}

/** Ligne résultat : règle des signes appliquée aux lignes des facteurs. */
export function productRow(label: string, rows: SignRow[]): SignRow {
  const n = rows[0].signs.length;
  const signs = Array.from({ length: n }, (_, i) => (rows.filter((r) => r.signs[i] === '-').length % 2 ? '-' : '+') as Sign);
  const marks = rows[0].marks.map((_, j): Mark => {
    if (rows.some((r) => r.marks[j] === '||')) return '||';
    if (rows.some((r) => r.marks[j] === '0')) return '0';
    return '';
  });
  return { kind: 'sign', label, signs, marks };
}

/** Tableau de signes complet : un facteur par ligne puis la ligne résultat. */
export function signTable(axis: Axis, factors: Factor[], resultLabel: string): TableData {
  const rows = factors.map((f) => factorRow(axis, f));
  const all = factors.length > 1 ? [...rows, productRow(resultLabel, rows)] : [{ ...rows[0], label: resultLabel }];
  return makeTable(axis, all);
}

/**
 * Ligne de variations déduite de la ligne de signe de f'.
 * `values` : valeur en chaque x (LaTeX) ou null.
 */
export function variationRow(label: string, derivRow: SignRow, values: (string | null)[]): VariationRow {
  const arrows: Arrow[] = derivRow.signs.map((s) => (s === '+' ? 'up' : 'down'));
  const forbidden = derivRow.marks.map((m) => m === '||');
  return { kind: 'variation', label, arrows, values: values.map((v, i) => (forbidden[i] ? null : v)), forbidden };
}

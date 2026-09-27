import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { solveSign } from '../src/calculator/signSolver';
import { solveVariations } from '../src/calculator/variationSolver';
import { evaluate } from '../src/core/expr/evaluate';
import { parse } from '../src/core/expr/parse';
import type { Step, TableData } from '../src/exercises/types';

function renderAll(steps: Step[]) {
  for (const s of steps) {
    if (s.math) katex.renderToString(s.math, { throwOnError: true, displayMode: true });
    for (const m of `${s.title} ${s.text ?? ''}`.matchAll(/\$([^$]+)\$/g)) katex.renderToString(m[1], { throwOnError: true });
    if (s.table) renderTable(s.table);
  }
}

function renderTable(t: TableData) {
  for (const x of t.xs) katex.renderToString(x, { throwOnError: true });
  for (const r of t.rows) {
    katex.renderToString(r.label, { throwOnError: true });
    if (r.kind === 'variation') r.values.forEach((v) => v && katex.renderToString(v, { throwOnError: true }));
  }
}

/** Le signe annoncé sur chaque intervalle doit être celui de f. */
function checkSigns(f: string, xs: number[], signs: string[]) {
  const e = parse(f);
  for (let i = 0; i < signs.length; i++) {
    const [a, b] = [xs[i], xs[i + 1]];
    const pts = a === -Infinity ? [b - 3, b - 0.5] : b === Infinity ? [a + 0.5, a + 3] : [a + (b - a) * 0.2, a + (b - a) * 0.8];
    for (const x of pts) {
      const v = evaluate(e, x);
      expect(Math.sign(v), `${f} en ${x}`).toBe(signs[i] === '+' ? 1 : -1);
    }
  }
}

const SIGN_CASES: [string, string[]][] = [
  ['2x - 6', ['3']],
  ['-3x + 1', ['\\frac{1}{3}']],
  ['x^2 - 5x + 6', ['2', '3']],
  ['x^2 + x + 1', []],
  ['x^2 - 2', ['-\\sqrt{2}', '\\sqrt{2}']],
  ['x^2 - x - 1', ['\\frac{1 - \\sqrt{5}}{2}', '\\frac{1 + \\sqrt{5}}{2}']],
  ['(x-1)(x+2)', ['-2', '1']],
  ['(2x+1)/(x-3)', ['-\\frac{1}{2}', '3']],
  ['x^3 - x', ['-1', '0', '1']],
  ['(x+1)e^x', ['-1']],
  ['e^x - 2', ['\\ln(2)']],
  ['ln(x)', ['1']],
  ['x ln(x)', ['1']],
  ['(x-2)^2/(x+1)', ['-1', '2']],
  ['1 - ln(x)', ['\\mathrm{e}']],
  ['sqrt(x) - 2', ['4']],
  ['-2(x-1)(x-4)', ['1', '4']],
];

describe('calculateur de tableau de signes', () => {
  it.each(SIGN_CASES)('signe de %s', (f, roots) => {
    const r = solveSign(parse(f));
    expect(r.table, f).not.toBeNull();
    expect(r.xs.slice(1, -1).map((x) => x.latex)).toEqual(roots);
    checkSigns(f, r.xs.map((x) => x.v), r.signs);
    expect(r.warning).toBeUndefined();
    renderAll(r.steps);
  });

  it('marque les valeurs interdites et les zéros', () => {
    const r = solveSign(parse('(2x+1)/(x-3)'));
    expect(r.marks).toEqual(['', '0', '||', '']);
  });

  it('respecte le domaine', () => {
    const r = solveSign(parse('ln(x)'));
    expect(r.xs[0].latex).toBe('0');
    expect(r.signs).toEqual(['-', '+']);
  });
});

const VAR_CASES: [string, string[], string[]][] = [
  // f, valeurs de x, flèches
  ['x^2 - 4x + 1', ['-\\infty', '2', '+\\infty'], ['down', 'up']],
  ['x^3 - 3x', ['-\\infty', '-1', '1', '+\\infty'], ['up', 'down', 'up']],
  ['(x+1)e^x', ['-\\infty', '-2', '+\\infty'], ['down', 'up']],
  ['x - ln(x)', ['0', '1', '+\\infty'], ['down', 'up']],
  ['(2x+1)/(x-3)', ['-\\infty', '3', '+\\infty'], ['down', 'down']],
  ['e^x - 2x', ['-\\infty', '\\ln(2)', '+\\infty'], ['down', 'up']],
  ['ln(x)/x', ['0', '\\mathrm{e}', '+\\infty'], ['up', 'down']],
  ['x + 1/x', ['-\\infty', '-1', '0', '1', '+\\infty'], ['up', 'down', 'down', 'up']],
];

describe('calculateur de variations', () => {
  it.each(VAR_CASES)('variations de %s', (f, xs, arrows) => {
    const r = solveVariations(parse(f));
    expect(r.table, f).not.toBeNull();
    expect(r.table!.xs).toEqual(xs);
    const row = r.table!.rows[r.table!.rows.length - 1];
    expect(row.kind).toBe('variation');
    if (row.kind === 'variation') expect(row.arrows).toEqual(arrows);
    for (const s of r.sections) renderAll(s.steps);
  });

  it('donne extremums et limites', () => {
    const r = solveVariations(parse('x^2 - 4x + 1'));
    const row = r.table!.rows.at(-1)!;
    if (row.kind !== 'variation') throw new Error();
    expect(row.values).toEqual(['+\\infty', '-3', '+\\infty']);
    expect(JSON.stringify(r.sections)).toMatch(/minimum local/);
  });
});

describe('valeurs exactes des extremums', () => {
  it.each([
    ['(x+1)e^x', '-\\mathrm{e}^{-2}'],
    ['e^x - 2x', '2 - 2\\ln(2)'],
    ['ln(x)/x', '\\frac{1}{\\mathrm{e}}'],
    ['x - ln(x)', '1'],
  ])('extremum de %s', (f, v) => {
    const r = solveVariations(parse(f));
    const row = r.table!.rows.at(-1)!;
    if (row.kind !== 'variation') throw new Error();
    expect(row.values[1]).toBe(v);
  });
});

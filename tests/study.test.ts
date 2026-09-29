import { describe, expect, it } from 'vitest';
import { checkExpression, checkValue } from '../src/checking/check';
import { evaluate } from '../src/core/expr/evaluate';
import { toText } from '../src/core/expr/toText';
import { generateExercise, TEMPLATE_BY_CODE } from '../src/exercises/registry';
import type { ExpressionQuestion, SignRow, TableQuestion, ValueQuestion } from '../src/exercises/types';

const t = TEMPLATE_BY_CODE.get('V13')!;
const SEEDS = Array.from({ length: 80 }, (_, i) => (i * 2654435761 + 5) >>> 0);

describe('V13 : étude complète (format TD)', () => {
  it('reprend le déroulé du TD : limites, variations, signe', () => {
    const ex = generateExercise(t, 1);
    expect(ex.statement).toMatch(/^On considère la fonction \$\\begin\{array\}\{rrcl\} g : & .* & \\longrightarrow & \\mathbb\{R\} \\\\ & x & \\longmapsto & /);
    expect(ex.questions.map((q) => q.type)).toEqual(['value', 'value', 'expression', 'table', 'table']);
  });

  it('propose la fonction du TD, e^x − x − 1', () => {
    const found = SEEDS.some((s) => generateExercise(t, s, 1).statement.includes('\\longmapsto & \\mathrm{e}^{x} - x - 1 \\end{array}'));
    expect(found).toBe(true);
  });

  it('les limites attendues sont justes numériquement', () => {
    for (const seed of SEEDS) {
      const ex = generateExercise(t, seed);
      const m = ex.meta[0];
      if (m.kind !== 'derivative') throw new Error('meta inattendue');
      const g = (x: number) => evaluate(m.f, x);
      const positive = ex.statement.includes(']0');
      const [left, right] = ex.questions as [ValueQuestion, ValueQuestion];
      const xl = positive ? 1e-7 : -40;
      if (left.expected.kind === 'finite') expect(g(xl)).toBeCloseTo(evaluate(left.expected.expr, 0), 3);
      else expect(g(xl)).toBeGreaterThan(10);
      expect(right.expected.kind).toBe('infinity');
      expect(g(1000)).toBeGreaterThan(g(40));
      expect(g(40)).toBeGreaterThan(20);
      expect(checkValue(right.expected.kind === 'infinity' ? '+inf' : '', right).status).toBe('correct');
    }
  });

  it('la dérivée attendue est acceptée', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const q = generateExercise(t, seed).questions[2] as ExpressionQuestion;
      expect(checkExpression(toText(q.expected), q).status).toBe('correct');
    }
  });

  it('le signe de g se déduit du minimum : positif partout, nul au plus en un point', () => {
    for (const seed of SEEDS) {
      const ex = generateExercise(t, seed);
      const row = (ex.questions[4] as TableQuestion).expected.rows[0] as SignRow;
      expect(row.signs.every((s) => s === '+')).toBe(true);
      expect(row.marks.filter((m) => m === '0').length).toBeLessThanOrEqual(1);
    }
  });

  it('une série de 4 parties mélange des fonctions de familles différentes', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const items = generateExercise(t, seed, 4).parts.map((p) => p.item);
      const kinds = items.map((i) => (i.includes('\\ln') ? (i.includes('x^{2}') ? 'x2ln' : i.includes('x\\ln') ? 'xln' : 'ln') : i.includes('(x - 1)') ? 'xexp' : 'exp'));
      expect(new Set(kinds).size).toBe(4);
    }
  });
});

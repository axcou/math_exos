import { describe, expect, it } from 'vitest';
import { parsePoint, solveLimit, type Val } from '../src/calculator/limitSolver';
import { evaluate } from '../src/core/expr/evaluate';
import { parse } from '../src/core/expr/parse';
import { generateExercise, TEMPLATES } from '../src/exercises/registry';

// Limites relevées dans un TD de lycée, telles qu'un élève les taperait.
const TD: [string, string, number | '+inf' | '-inf'][] = [
  ['-8/(x-14)', '14+', '-inf'],
  ['-15/(x-5)', '5-', '+inf'],
  ['9/(x-7)', '7-', '-inf'],
  ['-3/(x+61/3)', '-61/3+', '-inf'],
  ['(-4x^2 - x - 23/5)/(3x^4 - 7 + 4x^3 - x^2 + 7x^3)', '-inf', 0],
  ['5/(-35/3 - 7x - 2x^3 - 9x^2)', '-inf', 0],
  ['(-3 + 11/3x + 5x^3)/(2/3x + 62/5x^2 + 4 + 5x^3)', '-inf', 1],
  ['(5 - 8x - x^2 - x^3)/(-7x^2 - x^3 - x - 5)', '-inf', 1],
];

function expectVal(v: Val, e: number | '+inf' | '-inf') {
  if (e === '+inf') expect(v).toMatchObject({ k: 'inf', s: 1 });
  else if (e === '-inf') expect(v).toMatchObject({ k: 'inf', s: -1 });
  else {
    expect(v.k).toBe('fin');
    if (v.k === 'fin') expect(v.v).toBeCloseTo(e, 12);
  }
}

describe('limites de TD dans le calculateur', () => {
  it.each(TD)('lim %s en %s', (f, at, expected) => {
    const r = solveLimit(parse(f), parsePoint(at, (s) => evaluate(parse(s), 0))!);
    expectVal(r.value, expected);
    expect(r.warning).toBeUndefined();
  });

  it('le point −61/3⁺ s’affiche en fraction', () => {
    const r = solveLimit(parse('-3/(x+61/3)'), parsePoint('-61/3+', (s) => evaluate(parse(s), 0))!);
    expect(r.statement).toContain('-\\frac{61}{3}^{+}');
  });
});

describe('exercices au format TD', () => {
  const L11 = TEMPLATES.find((t) => t.code === 'L11')!;
  const L12 = TEMPLATES.find((t) => t.code === 'L12')!;

  it('L11 : k/(x − a) en a⁺ ou a⁻, points entiers ou fractionnaires', () => {
    let fractions = 0;
    const sides = new Set<number>();
    for (let seed = 1; seed <= 300; seed++) {
      const ex = generateExercise(L11, seed);
      expect(ex.statement).toMatch(/^Déterminer \$\\lim_\{x \\to .+\^\{[+-]\}\} /);
      const m = ex.meta[0];
      if (m.kind !== 'limit') throw new Error();
      if (!Number.isInteger(m.at)) fractions++;
      sides.add(m.side!);
    }
    expect(fractions).toBeGreaterThan(40);
    expect(sides).toEqual(new Set([1, -1]));
  });

  it('L12 : termes en désordre, fractions, termes à regrouper, surtout en −∞', () => {
    let unordered = 0;
    let merged = 0;
    let minusInf = 0;
    let constantNum = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const ex = generateExercise(L12, seed);
      const steps = JSON.stringify(ex.steps);
      if (steps.includes('Ranger et réduire')) unordered++;
      if (/x\^\{(\d)\}.*x\^\{\1\}/.test(ex.statement.split('\\frac')[1] ?? '')) merged++;
      const m = ex.meta[0];
      if (m.kind === 'limit' && m.at === '-inf') minusInf++;
      if (steps.includes('Numérateur constant')) constantNum++;
    }
    expect(unordered).toBeGreaterThan(200);
    expect(merged).toBeGreaterThan(20);
    expect(minusInf).toBeGreaterThan(150);
    expect(constantNum).toBeGreaterThan(20);
  });

  it('série de 4 limites « comme en TD » : a, b, c, d', () => {
    const ex = generateExercise(L12, 7, 4);
    expect(ex.statement).toBe('Déterminer les limites suivantes.');
    expect(ex.parts.map((p) => p.label)).toEqual(['a', 'b', 'c', 'd']);
    for (const p of ex.parts) expect(p.item).toMatch(/^\$\\displaystyle \\lim_\{x \\to [+-]\\infty\} /);
  });
});

describe('raccourci « Série de limites (TD) »', () => {
  it('2 exercices de 4 limites : valeurs interdites et fractions rationnelles', async () => {
    const { PRESETS, DEFAULT_CONFIG } = await import('../src/sheet/sheetConfig');
    const { buildSheet } = await import('../src/sheet/buildSheet');
    const preset = PRESETS.find((p) => p.label === 'Série de limites (TD)')!;
    const sheet = buildSheet(preset.config(DEFAULT_CONFIG), []);
    expect(sheet).toHaveLength(2);
    for (const ex of sheet) {
      expect(ex.theme).toBe('limite');
      expect(ex.parts).toHaveLength(4);
      expect(['valeur-interdite', 'rationnelle']).toContain(TEMPLATES.find((t) => t.code === ex.code)!.subtype);
    }
    expect(new Set(sheet.map((e) => e.difficulty)).size).toBe(2);
  });
});

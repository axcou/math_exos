import { describe, expect, it } from 'vitest';
import { checkRoots, checkTable, checkValue } from '../src/checking/check';
import { curveSlopes, evalCurve, evalCurveDerivative, evalGraph } from '../src/core/curve';
import { generateExercise, TEMPLATE_BY_CODE, templatesFor } from '../src/exercises/registry';
import type { SignRow, TableQuestion, VariationRow } from '../src/exercises/types';

const SEEDS = Array.from({ length: 60 }, (_, i) => (i * 2654435761 + 17) >>> 0);
const GRAPH = ['V10', 'V11', 'V12'];

describe('courbe interpolée', () => {
  const knots: [number, number][] = [[-3, 2], [-1, 0], [1, -3], [3, 0], [5, 4]];

  it('passe par les points donnés, tangente horizontale au sommet', () => {
    for (const [x, y] of knots) expect(evalCurve(knots, x)).toBeCloseTo(y, 12);
    expect(evalCurveDerivative(knots, 1)).toBe(0);
  });

  it('est monotone entre deux points consécutifs', () => {
    const s = curveSlopes(knots);
    for (let i = 0; i < knots.length - 1; i++) {
      const dir = Math.sign(knots[i + 1][1] - knots[i][1]);
      let prev = knots[i][1];
      for (let t = 1; t <= 50; t++) {
        const y = evalCurve(knots, knots[i][0] + ((knots[i + 1][0] - knots[i][0]) * t) / 50, s);
        expect(Math.sign(y - prev) * dir).toBeGreaterThanOrEqual(0);
        prev = y;
      }
    }
  });
});

describe('lecture graphique', () => {
  it.each(GRAPH)('%s : points entiers, lisibles sur le quadrillage', (code) => {
    for (const seed of SEEDS) {
      const ex = generateExercise(TEMPLATE_BY_CODE.get(code)!, seed);
      const k = ex.parts[0].graph!.knots;
      expect(k.length).toBeGreaterThanOrEqual(3);
      for (const [x, y] of k) {
        expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
        expect(Math.abs(y)).toBeLessThanOrEqual(5);
      }
      // Les seuls zéros de la courbe sont des points du quadrillage
      const zeros = k.filter(([, y]) => y === 0).map(([x]) => x);
      for (let x = k[0][0]; x < k[k.length - 1][0]; x += 0.05) {
        if (zeros.some((z) => Math.abs(z - x) < 0.06)) continue;
        expect(Math.abs(evalCurve(k, x))).toBeGreaterThan(0);
      }
    }
  });

  it.each(GRAPH)('%s : la bonne réponse est acceptée', (code) => {
    for (const seed of SEEDS.slice(0, 20)) {
      const ex = generateExercise(TEMPLATE_BY_CODE.get(code)!, seed);
      for (const q of ex.questions) {
        if (q.type === 'roots') expect(checkRoots(q.expectedLatex.join(' ; '), q).status).toBe('correct');
        if (q.type === 'value') expect(checkValue(q.expected.kind === 'finite' ? q.expected.latex : '', q).status).toBe('correct');
        if (q.type === 'table') {
          const answer = q.expected.rows.map((r) => (r.kind === 'sign' ? { signs: [...r.signs], marks: [...r.marks] } : { arrows: [...r.arrows] }));
          expect(checkTable(answer, q).status).toBe('correct');
        }
      }
    }
  });

  it('V12 : le signe de f′ correspond aux flèches', () => {
    for (const seed of SEEDS) {
      const ex = generateExercise(TEMPLATE_BY_CODE.get('V12')!, seed);
      const t = (ex.questions[0] as TableQuestion).expected;
      const [d, v] = t.rows as [SignRow, VariationRow];
      expect(v.arrows).toEqual(d.signs.map((s) => (s === '+' ? 'up' : 'down')));
    }
  });

  it('les parties d’une série montrent des courbes différentes', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const ex = generateExercise(TEMPLATE_BY_CODE.get('V10')!, seed, 3);
      const zeroCounts = ex.parts.map((p) => p.graph!.knots.filter(([, y]) => y === 0).length).sort();
      expect(zeroCounts).toEqual([1, 2, 3]);
    }
  });

  it('est proposée dans le thème « signes & variations »', () => {
    expect(templatesFor('variation').map((t) => t.code)).toEqual(expect.arrayContaining(GRAPH));
  });
});

describe('dérivées : seulement les types des TD', () => {
  it('les autres modèles restent décodables mais ne sont plus tirés', () => {
    const drawn = templatesFor('derivee').map((t) => t.code);
    expect(drawn).toEqual(['D01', 'D09', 'D12', 'D13', 'D17', 'D18', 'D19', 'D20', 'D21', 'D22', 'D23']);
    expect(generateExercise(TEMPLATE_BY_CODE.get('D07')!, 1).code).toBe('D07');
    for (const level of [1, 2, 3] as const) expect(templatesFor('derivee', level).length).toBeGreaterThan(0);
  });
});

describe('V14 : courbe avec valeur interdite', () => {
  it('double barre en p dans les deux tableaux, f non définie en p', () => {
    for (const seed of SEEDS) {
      const ex = generateExercise(TEMPLATE_BY_CODE.get('V14')!, seed);
      const g = ex.parts[0].graph!;
      const p = g.asymptote!.p;
      expect(Number.isFinite(evalGraph(g, p))).toBe(false);
      for (const q of ex.questions.filter((x): x is TableQuestion => x.type === 'table')) {
        const j = q.expected.xv.indexOf(p);
        expect(j).toBeGreaterThan(0);
        for (const r of q.expected.rows) expect(r.kind === 'sign' ? r.marks[j] : r.forbidden[j] ? '||' : '').toBe('||');
      }
      // Points lisibles : entiers
      for (const [x, y] of g.knots) expect(Number.isInteger(x) && Number.isInteger(y) && evalGraph(g, x) === y).toBe(true);
    }
  });
});

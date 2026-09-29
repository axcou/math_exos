import { describe, expect, it } from 'vitest';
import { equivalent, testPoints } from '../src/checking/check';
import { solveDerivative } from '../src/calculator/derivativeSolver';
import { derive } from '../src/core/expr/derive';
import { parse } from '../src/core/expr/parse';
import { generateExercise, TEMPLATES } from '../src/exercises/registry';

// Fonctions relevées dans un TD de dérivation, telles qu'un élève les taperait.
const TD: [string, [number, number]][] = [
  ['x^3', [-3, 3]],
  ['x^4 - 5x^2 + 4', [-3, 3]],
  ['sqrt(x)', [0.2, 5]],
  ['sqrt(x-3)', [3.2, 8]],
  ['sqrt(x^2+1)', [-3, 3]],
  ['(x^2-2x)^2', [-3, 3]],
  ['(x^2-x)^47', [-0.8, 0.8]],
  ['3(x^4-9x^3+x)^7', [-0.5, 0.5]],
  ['(x-1)(2x+3)', [-3, 3]],
  ['4(2x-4)(x+3)', [-3, 3]],
  ['x sqrt(x)', [0.2, 5]],
  ['x x^3', [-3, 3]],
  ['x^2 sqrt(x-1)', [1.2, 5]],
  ['x^3 sqrt(3x-4)', [1.5, 5]],
  ['1/x', [-4, 4]],
  ['1/(x+1)', [-4, 4]],
  ['1/(x^2+1)', [-4, 4]],
  ['3/(x^2+1)', [-4, 4]],
  ['(3x-4)/(x^2+1)', [-4, 4]],
  ['sqrt(7x-8)/(3x)', [1.3, 6]],
];

describe('dérivées de TD dans le calculateur', () => {
  it.each(TD)('%s', (f, domain) => {
    const e = parse(f);
    const r = solveDerivative(e);
    expect(r.checked).toBe(true);
    const raw = derive(e);
    expect(equivalent(r.df, raw, testPoints(raw, domain))).toBe(true);
  });
});

describe('exercices de dérivées au format TD', () => {
  it('toujours « Dériver … » et x ↦ …, jamais « Soit f la fonction… »', () => {
    for (const t of TEMPLATES.filter((x) => x.theme === 'derivee')) {
      for (let seed = 1; seed <= 30; seed++) {
        for (const parts of [1, 4]) {
          const ex = generateExercise(t, seed, parts);
          expect(ex.statement, ex.uid).toMatch(/^Dériver (la fonction suivante|les fonctions suivantes)\.$/);
          if (parts > 1) for (const p of ex.parts) expect(p.item, ex.uid).toMatch(/^\$\\displaystyle x \\mapsto /);
          for (const q of ex.questions) {
            expect(q.label, ex.uid).toBe("f'(x) =");
            expect(q.prompt, ex.uid).toMatch(/^\$\\displaystyle x \\mapsto /);
          }
        }
      }
    }
  });

  it.each([
    ['D17', /\^\{(2|3|4|5|7|10|47)\}/],
    ['D18', /\\sqrt\{/],
    ['D19', /\\sqrt\{/],
    ['D20', /\)\(|x\^\{\d\}/],
    ['D21', /\\frac\{-?\d+\}\{/],
    ['D22', /x\^\{2\} \+ \d/],
    ['D23', /\\frac\{\\sqrt\{/],
  ])('%s produit des fonctions du type attendu', (code, pattern) => {
    const t = TEMPLATES.find((x) => x.code === code)!;
    let hits = 0;
    for (let seed = 1; seed <= 60; seed++) if (pattern.test(generateExercise(t, seed).questions[0].prompt)) hits++;
    expect(hits).toBeGreaterThan(30);
  });

  it('D17 couvre les grandes puissances comme (x² − x)⁴⁷', () => {
    const t = TEMPLATES.find((x) => x.code === 'D17')!;
    const exps = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const m = /\^\{(\d+)\}\$$/.exec(generateExercise(t, seed).questions[0].prompt);
      if (m) exps.add(m[1]);
    }
    expect(exps.has('47')).toBe(true);
    expect(exps.has('2')).toBe(true);
  });
});

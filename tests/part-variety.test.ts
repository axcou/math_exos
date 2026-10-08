import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/random/prng';
import { generateExercise, TEMPLATE_BY_CODE, TEMPLATES } from '../src/exercises/registry';

const SEEDS = Array.from({ length: 25 }, (_, i) => 1000 + i * 7919);
const prompts = (code: string, seed: number, parts: number) => generateExercise(TEMPLATE_BY_CODE.get(code)!, seed, parts).parts.map((p) => p.questions[0].prompt);
/** Plus grand exposant entier écrit dans un énoncé LaTeX. */
const maxExponent = (latex: string) => Math.max(1, ...[...latex.matchAll(/\^\{?(\d+)\}?/g)].map((m) => Number(m[1])));

describe('variété des parties', () => {
  const withVariants = TEMPLATES.filter((t) => (t.variants ?? 0) > 1);

  it('plusieurs modèles déclarent des variantes', () => {
    expect(withVariants.length).toBeGreaterThanOrEqual(20);
  });

  it.each(withVariants.map((t) => [t.code, t] as const))('%s : chaque variante produit des énoncés corrects', (_, t) => {
    for (let v = 0; v < t.variants!; v++) {
      for (const seed of SEEDS.slice(0, 8)) {
        const d = t.generate(new Rng(seed), v);
        expect(d.questions.length).toBeGreaterThan(0);
        expect(d.questions.every((q) => q.prompt.length > 0)).toBe(true);
      }
    }
  });

  it.each(withVariants.map((t) => [t.code, t] as const))('%s : les parties d’un exercice multiple sont toutes différentes', (_, t) => {
    const n = Math.min(4, t.variants!);
    for (const seed of SEEDS) {
      const ex = generateExercise(t, seed, n);
      const contents = ex.parts.map((p) => [p.item, ...p.questions.map((q) => q.prompt), JSON.stringify(p.graph ?? ''), JSON.stringify(p.tables ?? '')].join('|'));
      expect(new Set(contents).size).toBe(n);
    }
  });

  it('D17 : une des quatre parties a un très grand exposant, une autre un coefficient devant', () => {
    for (const seed of SEEDS) {
      const ps = prompts('D17', seed, 4);
      expect(ps.some((p) => maxExponent(p) >= 12)).toBe(true);
      expect(ps.some((p) => /\\mapsto -?\d+\s*(\\left)?\(/.test(p))).toBe(true);
    }
  });

  it('D13 : les exposants des trois parties sont 3, 4 et 5', () => {
    for (const seed of SEEDS) {
      const exps = prompts('D13', seed, 3).map(maxExponent).sort();
      expect(exps).toEqual([3, 4, 5]);
    }
  });

  it('D21 : on trouve k/x, 1/(x + b) et k/(ax + b)', () => {
    for (const seed of SEEDS) {
      const ps = prompts('D21', seed, 3);
      expect(ps.some((p) => /\{x\}/.test(p))).toBe(true);
      expect(ps.some((p) => /\\frac\{1\}\{x [+-]/.test(p))).toBe(true);
    }
  });

  it('L01 : les limites en +∞ et en −∞ apparaissent toutes les deux', () => {
    for (const seed of SEEDS) {
      const ps = prompts('L01', seed, 4);
      expect(ps.some((p) => p.includes('+\\infty'))).toBe(true);
      expect(ps.some((p) => p.includes('-\\infty'))).toBe(true);
    }
  });

  it('L11 : limites à droite et à gauche dans une même série', () => {
    for (const seed of SEEDS) {
      const ps = prompts('L11', seed, 4);
      expect(ps.some((p) => /\^\{?\+\}?/.test(p) || p.includes('>'))).toBe(true);
      expect(ps.some((p) => /\^\{?-\}?/.test(p) || p.includes('<'))).toBe(true);
    }
  });
});

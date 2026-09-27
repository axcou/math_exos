import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { runCalc } from '../src/components/CalcResult';
import { TEMPLATES } from '../src/exercises/registry';
import { FORMULA_BY_ID } from '../src/formulas/formulas';
import { METHOD_FOR_SUBTYPE, METHODS } from '../src/methods/methods';

const inline = (s: string) => [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);

describe('fiches méthodes', () => {
  it.each(METHODS.flatMap((m) => m.examples.map((ex) => [m.id, ex] as const)))('%s : %o', (_id, ex) => {
    const out = runCalc(ex.mode, ex.f, ex.x);
    expect('error' in out ? out.error : '').toBe('');
    if ('error' in out) return;
    expect(out.warning).toBeUndefined();
    katex.renderToString(out.headline, { throwOnError: true, displayMode: true });
  });

  it('textes et formules valides', () => {
    for (const m of METHODS) {
      for (const t of [m.when, ...m.steps, ...(m.pitfalls ?? [])]) for (const l of inline(t)) katex.renderToString(l, { throwOnError: true });
      for (const f of m.formulas ?? []) expect(FORMULA_BY_ID.has(f), f).toBe(true);
    }
  });

  it('chaque type d’exercice renvoie vers une méthode', () => {
    const ids = new Set(METHODS.map((m) => m.id));
    for (const t of TEMPLATES) expect(ids.has(METHOD_FOR_SUBTYPE[t.subtype]), t.subtype).toBe(true);
  });
});

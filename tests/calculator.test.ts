import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { parsePoint, solveLimit, type Val } from '../src/calculator/limitSolver';
import { evaluate } from '../src/core/expr/evaluate';
import { parse } from '../src/core/expr/parse';

const pt = (s: string) => parsePoint(s, (b) => evaluate(parse(b), 0))!;

function run(f: string, at: string) {
  return solveLimit(parse(f), pt(at));
}

function expectVal(v: Val, expected: number | '+inf' | '-inf' | 'none') {
  if (expected === '+inf') expect(v).toMatchObject({ k: 'inf', s: 1 });
  else if (expected === '-inf') expect(v).toMatchObject({ k: 'inf', s: -1 });
  else if (expected === 'none') expect(v.k).toBe('none');
  else {
    expect(v.k).toBe('fin');
    if (v.k === 'fin') expect(v.v).toBeCloseTo(expected, 9);
  }
}

const CASES: [string, string, number | '+inf' | '-inf' | 'none', RegExp?][] = [
  // continuité
  ['(2x+1)/(x-3)', '1', -1.5, /Continuité/],
  ['sqrt(x+5)', '4', 3, /Continuité/],
  // valeurs interdites
  ['(2x+1)/(x-14)', '14+', '+inf'],
  ['(2x+1)/(x-14)', '14-', '-inf'],
  ['(2x+1)/(x-14)', '14', 'none'],
  ['1/x^2', '0', '+inf'],
  ['1/x', '0', 'none'],
  ['ln(x)', '0+', '-inf'],
  ['ln(x)', '0', '-inf'],
  ['(3-x)/(x-2)^2', '2', '+inf'],
  // polynômes et fractions rationnelles
  ['x^3 - 5x^2 + 1', '-inf', '-inf'],
  ['x^3 - 5x^2 + 1', '+inf', '+inf', /plus haut degré/],
  ['-2x^4 + x', '-inf', '-inf'],
  ['(3x^2+1)/(x^2-5)', '+inf', 3, /plus haut degré/],
  ['(x+1)/(x^2+1)', '+inf', 0],
  ['(2x^3-x)/(1-x^2)', '-inf', '+inf'],
  // 0/0
  ['(x^2-4)/(x-2)', '2', 4, /Factoriser/],
  ['(x^2-3x+2)/(x^2-1)', '1', -0.5, /Factoriser/],
  ['(x^3-1)/(x-1)', '1', 3],
  ['(sqrt(x+1)-2)/(x-3)', '3', 0.25, /conjuguée/],
  ['(e^(2x)-1)/x', '0', 2, /accroissement/],
  ['ln(1+3x)/x', '0', 3, /accroissement/],
  ['(e^x - 1)/(2x)', '0', 0.5],
  // quantité conjuguée
  ['sqrt(x^2+3x) - x', '+inf', 1.5, /conjuguée/],
  ['sqrt(x+1) - sqrt(x)', '+inf', 0, /conjuguée/],
  ['x - sqrt(x)', '+inf', '+inf'],
  // croissances comparées
  ['e^x/x^3', '+inf', '+inf', /Croissances comparées/],
  ['x^2 e^x', '-inf', 0],
  ['ln(x)/x', '+inf', 0, /Croissances comparées/],
  ['x ln(x)', '0+', 0],
  ['e^x - x^2', '+inf', '+inf'],
  ['x e^(-x)', '+inf', 0],
  ['(x^2+1)e^(-x)', '+inf', 0],
  ['ln(x) - x', '+inf', '-inf'],
  // composées
  ['e^((2x+1)/(x+3))', '+inf', Math.E ** 2],
  ['ln((5x-1)/(x+2))', '+inf', Math.log(5)],
  ['e^(1/x)', '0+', '+inf'],
  ['e^(1/x)', '0-', 0],
  ['1/x - 1/x^2', '0+', '-inf', /Changement de variable/],
  ['sqrt(x^2 + 1)/x', '-inf', -1],
];

describe('calculateur de limites', () => {
  it.each(CASES)('lim %s en %s', (f, at, expected, method) => {
    const r = run(f, at);
    expectVal(r.value, expected);
    expect(r.warning).toBeUndefined();
    const text = JSON.stringify(r.sections);
    if (method) expect(text).toMatch(method);
    // Tout le LaTeX produit doit s'afficher
    const latex = [r.statement, ...r.sections.flatMap((s) => [s.title ?? '', ...s.steps.flatMap((st) => [st.title, st.text ?? '', st.math ?? ''])])];
    for (const l of latex) {
      for (const m of l.matchAll(/\$([^$]+)\$/g)) katex.renderToString(m[1], { throwOnError: true });
    }
    for (const st of r.sections.flatMap((s) => s.steps)) if (st.math) katex.renderToString(st.math, { throwOnError: true, displayMode: true });
  });

  it('lit les points', () => {
    expect(pt('14+')).toEqual({ at: 14, side: 1 });
    expect(pt('14 -')).toEqual({ at: 14, side: -1 });
    expect(pt('14⁺')).toEqual({ at: 14, side: 1 });
    expect(pt('-3')).toEqual({ at: -3, side: 0 });
    expect(pt('-3-')).toEqual({ at: -3, side: -1 });
    expect(pt('1/2+')).toEqual({ at: 0.5, side: 1 });
    expect(pt('+inf')).toEqual({ at: '+inf', side: 0 });
    expect(pt('-∞')).toEqual({ at: '-inf', side: 0 });
  });
});

import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { equivalent, testPoints } from '../src/checking/check';
import { solveDerivative } from '../src/calculator/derivativeSolver';
import { derive } from '../src/core/expr/derive';
import { parse } from '../src/core/expr/parse';
import { tidy } from '../src/core/expr/simplify';
import { toLatex } from '../src/core/expr/toLatex';

// [fonction, dérivée attendue affichée (LaTeX) ou null, méthode attendue]
const CASES: [string, string | null, RegExp?][] = [
  ['3x^4 - 2x^2 + 5', '12x^{3} - 4x', /terme à terme/],
  ['x^2', '2x'],
  ['1/x', '-\\frac{1}{x^{2}}'],
  ['sqrt(x)', null],
  ['(2x+1)(x^2-3x)', '6x^{2} - 10x - 3', /Produit/],
  ['(2x+1)/(x-3)', '-\\frac{7}{(x - 3)^{2}}', /Quotient/],
  ['(x^2+1)/(x-1)', '\\frac{x^{2} - 2x - 1}{(x - 1)^{2}}', /Quotient/],
  ['(2x+1)e^x', '(2x + 3)\\mathrm{e}^{x}', /Produit/],
  ['x ln(x)', '\\ln(x) + 1', /Produit/],
  ['e^(3x+1)', '3\\mathrm{e}^{3x + 1}', /\\mathrm\{e\}\^\{u\}/],
  ['ln(x^2+1)', '\\frac{2x}{x^{2} + 1}'],
  ['sqrt(2x+5)', '\\frac{1}{\\sqrt{2x + 5}}'],
  ['(2x+1)^4', '8(2x + 1)^{3}', /u\^/],
  ['5/(x^2+1)', '-\\frac{10x}{(x^{2} + 1)^{2}}'],
  ['x^2 e^(-x)', '(-x^{2} + 2x)\\mathrm{e}^{-x}'],
  ['e^x/x', '\\frac{(x - 1)\\mathrm{e}^{x}}{x^{2}}'],
  ['ln(x)/x', '\\frac{1 - \\ln(x)}{x^{2}}'],
  ['3x^2 - 4sqrt(x) + 2/x', null],
  ['e^x - x^2 + ln(x)', null],
  ['(x+1)sqrt(x)', null],
  ['ln(e^x + 1)', null],
  ['2^x', null],
  ['x/sqrt(x^2+1)', null],
];

describe('calculateur de dérivées', () => {
  it.each(CASES)("dérivée de %s", (f, expected, method) => {
    const e = parse(f);
    const r = solveDerivative(e);
    expect(r.checked).toBe(true);
    const raw = derive(e);
    const pts = testPoints(raw, [0.3, 3], 10);
    expect(equivalent(r.df, raw, pts)).toBe(true);
    if (expected) expect(toLatex(r.df)).toBe(expected);
    if (method) expect(JSON.stringify(r.steps)).toMatch(method);
    for (const s of r.steps) {
      if (s.math) katex.renderToString(s.math, { throwOnError: true, displayMode: true });
      for (const m of `${s.title} ${s.text ?? ''}`.matchAll(/\$([^$]+)\$/g)) katex.renderToString(m[1], { throwOnError: true });
    }
  });

  it('tidy ne change jamais la valeur', () => {
    for (const f of ['(x+1)(x-1) + x e^x', '(x^2 e^x)/(x e^x)', 'e^x e^(2x)', '(3x)/(6x^2)', '2x/(4(x+1))', 'x x^2 x^(-1)']) {
      const e = parse(f);
      const pts = testPoints(e, [0.3, 3], 10);
      expect(equivalent(tidy(e), e, pts), f).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { add, affine, div, E, exp, ln, mono, mul, num, pow, sqrt, X } from '../src/core/expr/build';
import { evaluate } from '../src/core/expr/evaluate';
import { parse, ParseError } from '../src/core/expr/parse';
import { Poly } from '../src/core/expr/poly';
import * as Q from '../src/core/expr/rational';
import { toLatex } from '../src/core/expr/toLatex';
import { Rng } from '../src/core/random/prng';

describe('rational', () => {
  it('normalise les fractions', () => {
    expect(Q.rat(4, -6)).toEqual({ n: -2, d: 3 });
    expect(Q.toLatex(Q.add(Q.rat(1, 2), Q.rat(1, 3)))).toBe('\\frac{5}{6}');
    expect(Q.fromDecimal(0.25)).toEqual({ n: 1, d: 4 });
  });
});

describe('toLatex', () => {
  it('affiche proprement les polynômes', () => {
    expect(Poly.fromHigh(3, -1, 0, 5).toLatex()).toBe('3x^{3} - x^{2} + 5');
    expect(Poly.fromHigh(-1, 2).toLatex()).toBe('-x + 2');
    expect(Poly.fromHigh(Q.rat(1, 2), 0).toLatex()).toBe('\\frac{1}{2}x');
  });
  it('gère produits, quotients et fonctions', () => {
    expect(toLatex(mul(affine(2, 1), exp(X)))).toBe('(2x + 1)\\mathrm{e}^{x}');
    expect(toLatex(div(num(-7), pow(affine(1, -3), 2)))).toBe('-\\frac{7}{(x - 3)^{2}}');
    expect(toLatex(add(mono(3, 2), mul(num(-2), ln(X))))).toBe('3x^{2} - 2\\ln(x)');
    expect(toLatex(mul(num(3), div(num(1), X)))).toBe('\\frac{3}{x}');
    expect(toLatex(sqrt(affine(1, 1)))).toBe('\\sqrt{x + 1}');
  });
});

describe('poly', () => {
  it('dérive et multiplie', () => {
    const p = Poly.fromRoots(2, [1, -3]);
    expect(p.toLatex()).toBe('2x^{2} + 4x - 6');
    expect(p.derive().toLatex()).toBe('4x + 4');
    expect(p.eval(1)).toBe(0);
  });
});

describe('parse', () => {
  const val = (s: string, x: number) => evaluate(parse(s), x);
  it('comprend les écritures usuelles', () => {
    expect(val('3x^2-2x+1', 2)).toBe(9);
    expect(val('(2x+1)/(x-3)', 4)).toBe(9);
    expect(val('2(x+1)', 1)).toBe(4);
    expect(val('e^(2x)', 1)).toBeCloseTo(Math.E ** 2);
    expect(val('ln x', Math.E)).toBeCloseTo(1);
    expect(val('lnx', Math.E)).toBeCloseTo(1);
    expect(val('xe^x', 1)).toBeCloseTo(Math.E);
    expect(val('√(x+1)', 3)).toBe(2);
    expect(val('x²', 3)).toBe(9);
    expect(val('-x^2', 3)).toBe(-9);
    expect(val('x^-2', 2)).toBe(0.25);
    expect(val('1/2x', 4)).toBe(2);
    expect(val('0,5x', 4)).toBe(2);
    expect(val('exp(x)', 0)).toBe(1);
  });
  it('signale les erreurs', () => {
    expect(() => parse('(x+1')).toThrow(ParseError);
    expect(() => parse('y+1')).toThrow(/inconnu/);
    expect(() => parse('')).toThrow(/vide/);
    expect(() => parse('x+')).toThrow(ParseError);
  });
  it("produit un aperçu fidèle", () => {
    expect(toLatex(parse('1+x'))).toBe('1 + x');
    expect(toLatex(parse('(2x+1)/(x-3)'))).toBe('\\frac{2x + 1}{x - 3}');
  });
});

describe('prng', () => {
  it('est reproductible', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.int(0, 100), a.int(0, 100)]).toEqual([b.int(0, 100), b.int(0, 100)]);
  });
  it('e constant', () => {
    expect(evaluate(E, 0)).toBe(Math.E);
  });
});

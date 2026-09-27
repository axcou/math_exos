import type { Expr } from '../../src/core/expr/ast';
import { add, div, exp, ln, mul, num, pow, sqrt, X } from '../../src/core/expr/build';
import { Rng } from '../../src/core/random/prng';

/**
 * Expression aléatoire (reproductible) construite avec x, des entiers,
 * + − × ÷, des puissances entières, exp, ln et √.
 * Les arguments de ln et √ sont rendus positifs sur ]0 ; +∞[ pour que les
 * tests puissent évaluer sur cet intervalle.
 */
export function randomExpr(rng: Rng, depth = 3): Expr {
  if (depth <= 0 || rng.bool(0.25)) return rng.bool(0.6) ? X : num(rng.nonZero(-5, 5));
  const sub = () => randomExpr(rng, depth - 1);
  const positive = () => add(mul(num(rng.int(1, 3)), pow(X, rng.int(1, 2))), num(rng.int(1, 4)));
  switch (rng.int(0, 8)) {
    case 0:
      return add(sub(), sub());
    case 1:
      return add(sub(), mul(num(-1), sub()));
    case 2:
      return mul(sub(), sub());
    case 3:
      return div(sub(), add(pow(X, 2), num(rng.int(1, 5))));
    case 4:
      return pow(sub(), rng.int(2, 3));
    case 5:
      return exp(mul(num(rng.pick([-1, 1, 2])), rng.bool() ? X : num(rng.int(-2, 2))));
    case 6:
      return ln(positive());
    case 7:
      return sqrt(positive());
    default:
      return mul(num(rng.nonZero(-4, 4)), sub());
  }
}

/** Points d'évaluation dans ]0 ; +∞[. */
export const POSITIVE_POINTS = [0.3, 0.7, 1.1, 1.9, 2.6, 3.4];

export function* randomExprs(count: number, seed = 1, depth = 3): Generator<Expr> {
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) yield randomExpr(rng, depth);
}

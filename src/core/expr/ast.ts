import type { Rational } from './rational';

export type FnName = 'exp' | 'ln' | 'sqrt';

/** Arbre d'expression d'une fonction de la variable x. */
export type Expr =
  | { type: 'num'; value: Rational }
  | { type: 'const'; name: 'e' | 'pi' }
  | { type: 'var' }
  | { type: 'add'; terms: Expr[] }
  | { type: 'mul'; factors: Expr[] }
  | { type: 'div'; num: Expr; den: Expr }
  | { type: 'pow'; base: Expr; exp: Expr }
  | { type: 'neg'; arg: Expr }
  | { type: 'fn'; name: FnName; arg: Expr };

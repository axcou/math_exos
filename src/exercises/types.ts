import type { Expr } from '../core/expr/ast';
import type { Rng } from '../core/random/prng';

export type Theme = 'derivee' | 'limite' | 'variation';
export type Difficulty = 1 | 2 | 3;
export type DifficultyChoice = Difficulty | 'mixte';

export const THEMES: Theme[] = ['derivee', 'limite', 'variation'];

export const THEME_LABELS: Record<Theme, string> = {
  derivee: 'Dérivées',
  limite: 'Limites',
  variation: 'Signes & variations',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Facile',
  2: 'Moyen',
  3: 'Difficile',
};

/** Réponse attendue pour une valeur ou une limite. */
export type ValueAnswer =
  | { kind: 'finite'; expr: Expr; latex: string }
  | { kind: 'infinity'; sign: 1 | -1 }
  | { kind: 'none' };

export type Sign = '+' | '-';
/** Marque sous une valeur de x : rien, zéro, ou valeur interdite (double barre). */
export type Mark = '' | '0' | '||';
export type Arrow = 'up' | 'down';

export interface SignRow {
  kind: 'sign';
  label: string;
  signs: Sign[]; // un par intervalle
  marks: Mark[]; // un par valeur de x (extrémités comprises, toujours '')
}

export interface VariationRow {
  kind: 'variation';
  label: string;
  arrows: Arrow[]; // un par intervalle
  values: (string | null)[]; // valeur affichée en chaque x (LaTeX) ; null = rien
  forbidden: boolean[]; // double barre en ce x
}

export type TableRow = SignRow | VariationRow;

export interface TableData {
  xs: string[]; // valeurs de x en LaTeX, bornes comprises
  xv: number[]; // mêmes valeurs en numérique (±Infinity pour ±∞)
  rows: TableRow[];
}

export interface KnownMistake {
  expr: Expr;
  message: string;
}

interface QuestionBase {
  id: string;
  prompt: string; // texte avec $…$
  label?: string; // LaTeX affiché devant le champ, ex. f'(x) =
  hint?: string;
}

export interface ExpressionQuestion extends QuestionBase {
  type: 'expression';
  expected: Expr;
  expectedLatex: string;
  /** Intervalle où tirer les points de test. */
  domain: [number, number];
  mistakes?: KnownMistake[];
}

export interface ValueQuestion extends QuestionBase {
  type: 'value';
  expected: ValueAnswer;
  mistakes?: { answer: ValueAnswer; message: string }[];
}

export interface RootsQuestion extends QuestionBase {
  type: 'roots';
  expected: number[];
  expectedLatex: string[];
}

export interface TableQuestion extends QuestionBase {
  type: 'table';
  expected: TableData;
}

export type Question = ExpressionQuestion | ValueQuestion | RootsQuestion | TableQuestion;

export interface Step {
  title: string;
  text?: string; // texte avec $…$
  math?: string; // bloc LaTeX
  table?: TableData;
  formulas?: string[]; // ids de formulas.ts
}

/** Données de contrôle utilisées par les tests automatiques. */
export type ExerciseMeta =
  | { kind: 'derivative'; f: Expr; df: Expr; domain: [number, number] }
  | { kind: 'limit'; f: Expr; at: number | '+inf' | '-inf'; side?: 1 | -1 }
  | { kind: 'table'; f: Expr; df?: Expr };

/** Ce que produit un générateur (les champs communs sont ajoutés par le registre). */
export interface ExerciseDraft {
  statement: string; // texte avec $…$
  questions: Question[];
  steps: Step[];
  meta: ExerciseMeta[];
  /** Consigne commune quand plusieurs parties sont regroupées (« Calculer la dérivée de chaque fonction. »). */
  lead?: string;
  /** Donnée propre à une partie (« $f(x) = \ln(2x+1)$ sur … »). */
  item?: string;
}

/** Partie a, b, c… d'un exercice. */
export interface ExercisePart {
  label: string; // 'a', 'b'… ; vide pour un exercice sans parties
  item: string;
  questions: Question[];
  steps: Step[];
}

export interface Exercise extends ExerciseDraft {
  uid: string; // code.graine(base 36)[.nombre de parties]
  code: string;
  seed: number;
  parts: ExercisePart[];
  theme: Theme;
  difficulty: Difficulty;
  title: string;
  /** Empreinte du contenu (énoncé + données des parties), pour l'anti-répétition. */
  signature: string;
}

export const MAX_PARTS = 4;

export interface Template {
  code: string; // code court STABLE, utilisé dans les liens de partage
  theme: Theme;
  difficulty: Difficulty;
  subtype: string;
  title: string;
  legacy?: boolean; // conservé pour décoder d'anciens liens, jamais tiré au hasard
  generate(rng: Rng): ExerciseDraft;
}

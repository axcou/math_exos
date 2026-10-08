import type { Expr } from '../core/expr/ast';
import type { Rng } from '../core/random/prng';

export type Theme = 'derivee' | 'limite' | 'variation' | 'stat';
export type Difficulty = 1 | 2 | 3;
export type DifficultyChoice = Difficulty | 'mixte';

/** Chapitres d'analyse (page « Exercices »). */
export const THEMES: Theme[] = ['derivee', 'limite', 'variation'];

/** Tous les chapitres, y compris les tests statistiques (page « Tests stat. »). */
export const ALL_THEMES: Theme[] = [...THEMES, 'stat'];

export const THEME_LABELS: Record<Theme, string> = {
  derivee: 'Dérivées',
  limite: 'Limites',
  variation: 'Signes & variations',
  stat: 'Tests statistiques',
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

/** Courbe donnée dans l'énoncé (lecture graphique) : points de passage, entiers. */
export interface GraphData {
  /** Points de passage (bornes, sommets, zéros), entiers. */
  knots: [number, number][];
  /**
   * Courbe à asymptote verticale x = p : f(x) = s·(lin·t + m/t) + k avec t = x − p
   * (au lieu de l'interpolation des points). f n'est pas définie en p.
   */
  asymptote?: { p: number; m: number; k: number; lin: 0 | 1; s: 1 | -1 };
}

export interface KnownMistake {
  expr: Expr;
  message: string;
}

interface QuestionBase {
  id: string;
  prompt: string; // texte avec $…$
  label?: string; // LaTeX affiché devant le champ, ex. f'(x) =
  /** La consigne affiche déjà l'expression en grand : ne pas la répéter devant le champ. */
  hideLabel?: boolean;
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

/** Résultat numérique approché (statistique de test, p-valeur…), accepté à une tolérance près. */
export interface NumberQuestion extends QuestionBase {
  type: 'number';
  expected: number;
  /** Écart maximal accepté (absolu). */
  tolerance: number;
  /** Nombre de décimales pour afficher la réponse attendue. */
  decimals: number;
  mistakes?: { value: number; message: string }[];
}

/** Question à choix unique (hypothèses, loi, décision…). */
export interface ChoiceQuestion extends QuestionBase {
  type: 'choice';
  /** Propositions (texte avec $…$). */
  options: string[];
  /** Indice de la bonne proposition. */
  expected: number;
  /** Explication propre à une mauvaise proposition (même indice que options). */
  feedback?: (string | undefined)[];
}

export type Question = ExpressionQuestion | ValueQuestion | RootsQuestion | TableQuestion | NumberQuestion | ChoiceQuestion;

/** Tableau de données (énoncé ou corrigé) : cellules en texte avec $…$. */
export interface DataTable {
  caption?: string;
  header: string[];
  rows: string[][];
  /** La première colonne contient les intitulés des lignes. */
  rowHeaders?: boolean;
  /** La dernière ligne est une ligne de totaux (filet au-dessus). */
  totalRow?: boolean;
  /** La dernière colonne est une colonne de totaux. */
  totalCol?: boolean;
}

export interface Step {
  title: string;
  text?: string; // texte avec $…$
  math?: string; // bloc LaTeX
  table?: TableData;
  /** Tableau de calculs (effectifs théoriques, contributions…). */
  data?: DataTable;
  /** Code R qui refait le calcul. */
  code?: string;
  formulas?: string[]; // ids de formulas.ts
}

/** Données de contrôle utilisées par les tests automatiques. */
export type ExerciseMeta =
  | { kind: 'derivative'; f: Expr; df: Expr; domain: [number, number] }
  | { kind: 'limit'; f: Expr; at: number | '+inf' | '-inf'; side?: 1 | -1 }
  | { kind: 'table'; f: Expr; df?: Expr }
  | { kind: 'graph'; graph: GraphData }
  | {
      kind: 'stat';
      test: 'two-proportions' | 'goodness-of-fit' | 'contingency' | 'anova';
      /** Deux proportions : succès et effectifs des groupes A puis B. */
      x?: [number, number];
      n?: [number, number];
      /** Adéquation : effectifs observés, probabilités théoriques, nombre de paramètres estimés. */
      observed?: number[];
      probs?: number[];
      estimated?: number;
      /** Contingence : tableau des effectifs observés. */
      table?: number[][];
      /** ANOVA : mesures de chaque groupe. */
      groups?: number[][];
    };

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
  /** Courbe à lire. */
  graph?: GraphData;
  /** Tableaux de données de l'énoncé. */
  tables?: DataTable[];
}

/** Partie a, b, c… d'un exercice. */
export interface ExercisePart {
  label: string; // 'a', 'b'… ; vide pour un exercice sans parties
  item: string;
  graph?: GraphData;
  tables?: DataTable[];
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
  /**
   * Nombre de variantes de forme (0 … variants − 1). Dans un exercice en
   * plusieurs parties, chaque partie reçoit une variante différente pour que
   * a, b, c… ne se ressemblent pas. Sans variante imposée, le template tire
   * sa forme au hasard (exactement comme avant : les liens restent valables).
   */
  variants?: number;
  generate(rng: Rng, variant?: number): ExerciseDraft;
}

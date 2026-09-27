import { equivalent, testPoints } from '../checking/check';
import { evaluate } from '../core/expr/evaluate';
import { Rng } from '../core/random/prng';
import { DERIVATIVE_TEMPLATES } from './derivatives/templates';
import { LIMIT_TEMPLATES } from './limits/templates';
import type { Difficulty, Exercise, Question, Template, Theme, ValueAnswer } from './types';
import { VARIATION_TEMPLATES } from './variations/templates';

/*
 * Les codes des templates sont FIGÉS : ils apparaissent dans les liens de
 * partage. Un changement qui modifie ce qu'un template génère doit se faire
 * sous un nouveau code (l'ancien passe en `legacy`). Voir tests/golden-seeds.
 */
export const TEMPLATES: Template[] = [...DERIVATIVE_TEMPLATES, ...LIMIT_TEMPLATES, ...VARIATION_TEMPLATES];

export const TEMPLATE_BY_CODE = new Map(TEMPLATES.map((t) => [t.code, t]));

export const SUBTYPE_LABELS: Record<string, string> = {
  polynome: 'Polynômes',
  inverse: 'Inverse',
  racine: 'Racine carrée',
  produit: 'Produit',
  quotient: 'Quotient',
  exp: 'Exponentielle',
  ln: 'Logarithme',
  'composee-exp': 'Composée exp',
  'composee-ln': 'Composée ln',
  'composee-racine': 'Composée racine',
  'composee-puissance': 'Puissance de u',
  reference: 'Limites de référence',
  continuite: 'Substitution',
  rationnelle: 'Fractions rationnelles',
  'valeur-interdite': 'Valeur interdite',
  factorisation: 'Factorisation 0/0',
  conjugue: 'Quantité conjuguée',
  'croissances-comparees': 'Croissances comparées',
  taux: "Taux d'accroissement",
  composee: 'Composition',
  'signe-affine': 'Signe affine',
  'signe-trinome': 'Signe trinôme',
  'variations-trinome': 'Variations trinôme',
  'signe-produit-quotient': 'Produit / quotient',
  'variations-cubique': 'Degré 3',
  'variations-homographique': 'Homographique',
  'variations-exp': 'Avec exponentielle',
  'variations-ln': 'Avec logarithme',
};

export function templatesFor(theme: Theme, difficulty?: Difficulty, subtypes?: string[]): Template[] {
  return TEMPLATES.filter(
    (t) =>
      !t.legacy &&
      t.theme === theme &&
      (difficulty === undefined || t.difficulty === difficulty) &&
      (!subtypes?.length || subtypes.includes(t.subtype)),
  );
}

export function subtypesOf(theme: Theme): string[] {
  return [...new Set(TEMPLATES.filter((t) => t.theme === theme && !t.legacy).map((t) => t.subtype))];
}

export const exerciseUid = (code: string, seed: number) => `${code}.${(seed >>> 0).toString(36)}`;

/**
 * Retire les « erreurs classiques » qui coïncident avec la bonne réponse
 * (ex. oublier u' est sans effet quand u' = 1).
 */
function dropHarmlessMistakes(q: Question): Question {
  if (q.type === 'expression' && q.mistakes) {
    const pts = testPoints(q.expected, q.domain);
    return { ...q, mistakes: q.mistakes.filter((m) => !equivalent(m.expr, q.expected, pts)) };
  }
  if (q.type === 'value' && q.mistakes) {
    const same = (v: ValueAnswer) =>
      v.kind === q.expected.kind &&
      (v.kind !== 'infinity' || q.expected.kind !== 'infinity' || v.sign === q.expected.sign) &&
      (v.kind !== 'finite' || q.expected.kind !== 'finite' || Math.abs(evaluate(v.expr, 0) - evaluate(q.expected.expr, 0)) < 1e-9);
    return { ...q, mistakes: q.mistakes.filter((m) => !same(m.answer)) };
  }
  return q;
}

export function generateExercise(template: Template, seed: number): Exercise {
  const draft = template.generate(new Rng(seed));
  return {
    ...draft,
    questions: draft.questions.map(dropHarmlessMistakes),
    uid: exerciseUid(template.code, seed),
    code: template.code,
    seed: seed >>> 0,
    theme: template.theme,
    difficulty: template.difficulty,
    title: template.title,
  };
}

/** Régénère un exercice depuis son code et sa graine (liens de partage, historique). */
export function exerciseFromRef(code: string, seed: number): Exercise | null {
  const t = TEMPLATE_BY_CODE.get(code);
  return t ? generateExercise(t, seed) : null;
}

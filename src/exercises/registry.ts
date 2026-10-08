import { equivalent, testPoints } from '../checking/check';
import { evaluate } from '../core/expr/evaluate';
import { Rng } from '../core/random/prng';
import { DERIVATIVE_TEMPLATES } from './derivatives/templates';
import { LIMIT_TEMPLATES } from './limits/templates';
import { type Difficulty, type Exercise, type ExerciseDraft, type DataTable, type ExercisePart, type GraphData, MAX_PARTS, type Question, type Template, type Theme, type ValueAnswer } from './types';
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
  'lecture-graphique': 'Lecture graphique',
  'etude-complete': 'Étude complète',
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

export const exerciseUid = (code: string, seed: number, parts = 1) => `${code}.${(seed >>> 0).toString(36)}${parts > 1 ? `.${parts}` : ''}`;

/** Inverse de exerciseUid. */
export function parseUid(uid: string): { code: string; seed: number; parts: number } | null {
  const m = /^([A-Z]\d{2,3}[a-z]?)\.([0-9a-z]{1,7})(?:\.(\d))?$/.exec(uid);
  if (!m) return null;
  const parts = m[3] ? Number(m[3]) : 1;
  if (parts < 1 || parts > MAX_PARTS) return null;
  return { code: m[1], seed: parseInt(m[2], 36), parts };
}

/**
 * Retire les « erreurs classiques » qui coïncident avec la bonne réponse
 * (ex. oublier u' est sans effet quand u' = 1).
 */
function dropHarmlessMistakes(q: Question): Question {
  if (q.type === 'expression' && q.mistakes) {
    const pts = testPoints(q.expected, q.domain);
    // ni une erreur qui donnerait la bonne réponse, ni deux erreurs qui coïncident (le message serait ambigu)
    const kept: typeof q.mistakes = [];
    for (const m of q.mistakes) if (!equivalent(m.expr, q.expected, pts) && !kept.some((k) => equivalent(k.expr, m.expr, pts))) kept.push(m);
    return { ...q, mistakes: kept };
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

/** Graine de la partie i (la partie 0 garde la graine de l'exercice). */
function partSeed(seed: number, i: number): number {
  return i === 0 ? seed >>> 0 : Math.floor(new Rng((seed ^ Math.imul(i, 0x9e3779b9)) >>> 0).next() * 2 ** 32);
}

const LABELS = 'abcdefgh';

/** Une courbe fait partie du contenu : deux graphiques différents donnent deux énoncés différents. */
/** Les données chiffrées font aussi partie du contenu (deux jeux de données = deux énoncés). */
const tablesKey = (t?: DataTable[]) => (t?.length ? [t.map((x) => x.rows.map((r) => r.join(',')).join(';')).join('/')] : []);

const graphKey = (g?: GraphData) => (g ? [g.knots.map((p) => p.join(',')).join(';') + (g.asymptote ? `|${Object.values(g.asymptote).join(',')}` : '')] : []);

/**
 * Génère un exercice. Avec `parts` > 1, regroupe plusieurs énoncés du même
 * type en parties a, b, c… (tirés de graines dérivées, donc reproductibles).
 */
export function generateExercise(template: Template, seed: number, parts = 1): Exercise {
  const n = Math.max(1, Math.min(MAX_PARTS, Math.floor(parts)));
  const drafts: ExerciseDraft[] = [];
  const items = new Set<string>();
  const nv = template.variants ?? 0;
  for (let i = 0; i < n; i++) {
    // Série : les parties parcourent les variantes de forme (point de départ tiré de la graine)
    const variant = n > 1 && nv > 1 ? (seed + i) % nv : undefined;
    let d = template.generate(new Rng(partSeed(seed, i)), variant);
    // Parties toutes différentes
    // Contenu d'une partie : sa donnée et ses consignes (une partie « lim à gauche / à droite » n'a que des consignes)
    const content = (x: ExerciseDraft) => [x.item ?? x.statement, ...x.questions.map((q) => q.prompt), ...graphKey(x.graph), ...tablesKey(x.tables)].join('|');
    for (let k = 1; k < 20 && items.has(content(d)); k++) d = template.generate(new Rng(partSeed(seed, i + k * 16)), variant);
    items.add(content(d));
    drafts.push({ ...d, questions: d.questions.map(dropHarmlessMistakes) });
  }
  const multi = n > 1;
  const exParts: ExercisePart[] = drafts.map((d, i) => {
    const label = multi ? LABELS[i] : '';
    return {
      label,
      item: multi ? d.item ?? d.statement : d.statement,
      ...(d.graph ? { graph: d.graph } : {}),
      ...(d.tables ? { tables: d.tables } : {}),
      questions: multi ? d.questions.map((q) => ({ ...q, id: `${label}-${q.id}` })) : d.questions,
      steps: d.steps,
    };
  });
  const statement = multi ? drafts[0].lead ?? 'Traiter chacune des situations suivantes.' : drafts[0].statement;
  return {
    statement,
    lead: drafts[0].lead,
    item: drafts[0].item,
    ...(drafts[0].graph ? { graph: drafts[0].graph } : {}),
    ...(drafts[0].tables ? { tables: drafts[0].tables } : {}),
    questions: exParts.flatMap((p) => p.questions),
    steps: exParts.flatMap((p) => p.steps),
    meta: drafts.flatMap((d) => d.meta),
    parts: exParts,
    // Contenu complet (énoncé, données et consignes) : deux exercices différents n'ont jamais la même empreinte
    signature: [statement, ...exParts.map((p) => [p.item, ...p.questions.map((q) => q.prompt), ...graphKey(p.graph), ...tablesKey(p.tables)].join('\n'))].join('\n'),
    uid: exerciseUid(template.code, seed, n),
    code: template.code,
    seed: seed >>> 0,
    theme: template.theme,
    difficulty: template.difficulty,
    title: template.title,
  };
}

/** Régénère un exercice depuis son code et sa graine (liens de partage, historique). */
export function exerciseFromRef(code: string, seed: number, parts = 1): Exercise | null {
  const t = TEMPLATE_BY_CODE.get(code);
  return t ? generateExercise(t, seed, parts) : null;
}

export function exerciseFromUid(uid: string): Exercise | null {
  const r = parseUid(uid);
  return r ? exerciseFromRef(r.code, r.seed, r.parts) : null;
}

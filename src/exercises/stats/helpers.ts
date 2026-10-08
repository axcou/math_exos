import type { Rng } from '../../core/random/prng';
import { chi2Quantile } from '../../core/stats/distributions';
import { rNum, texFixed, texNum, texPercent, texPValue } from '../../core/stats/format';
import type { ChoiceQuestion, NumberQuestion, Step } from '../types';

/*
 * Briques communes aux exercices de tests statistiques.
 */

/** Tolérances : on accepte les écarts dus aux arrondis des calculs intermédiaires. */
export const tolStat = (v: number) => Math.max(0.02, 0.01 * Math.abs(v));
export const tolP = (p: number) => Math.max(0.003, 0.04 * p);

export function numberQ(
  id: string,
  prompt: string,
  label: string,
  expected: number,
  decimals: number,
  tolerance: number,
  mistakes: { value: number; message: string }[] = [],
): NumberQuestion {
  // une « erreur classique » trop proche de la bonne réponse, ou d'une autre erreur, rendrait le message ambigu
  const kept: typeof mistakes = [];
  for (const m of mistakes) {
    const apart = (v: number) => Math.abs(m.value - v) > 2 * tolerance;
    if (Number.isFinite(m.value) && apart(expected) && kept.every((k) => apart(k.value))) kept.push(m);
  }
  return { id, type: 'number', prompt, label, expected, decimals, tolerance, ...(kept.length ? { mistakes: kept } : {}) };
}

/** p-valeur demandée à 10⁻³ près. */
export function pValueQ(id: string, prompt: string, p: number, mistakes: { value: number; message: string }[] = []): NumberQuestion {
  return numberQ(id, prompt, 'p\\text{-valeur} =', p, 3, tolP(p), mistakes);
}

/** Statistique de test demandée à 10⁻² près. */
export function statQ(id: string, prompt: string, label: string, v: number, mistakes: { value: number; message: string }[] = [], tolerance = tolStat(v)): NumberQuestion {
  return numberQ(id, prompt, label, v, 2, tolerance, mistakes);
}

export interface Option {
  text: string;
  /** Explication si l'élève choisit cette proposition (fausse). */
  why?: string;
}

/** Choix unique : la bonne proposition puis les distracteurs, mélangés par la graine. */
export function choiceQ(rng: Rng, id: string, prompt: string, correct: string, wrong: Option[], shuffle = true): ChoiceQuestion {
  const all: (Option & { ok: boolean })[] = [{ text: correct, ok: true }, ...wrong.map((w) => ({ ...w, ok: false }))];
  const order = shuffle ? rng.shuffle(all) : all;
  return {
    id,
    type: 'choice',
    prompt,
    options: order.map((o) => o.text),
    expected: order.findIndex((o) => o.ok),
    feedback: order.map((o) => (o.ok ? undefined : o.why)),
  };
}

export const REJECT = 'On rejette $H_0$';
export const KEEP = 'On ne rejette pas $H_0$';

/** Décision au seuil α (propositions toujours dans le même ordre). */
export function decisionQ(id: string, alpha: number, p: number): ChoiceQuestion {
  const reject = p < alpha;
  const why = `La p-valeur ($\\approx ${texPValue(p).replace('<', '\\lt')}$) est ${reject ? 'inférieure' : 'supérieure'} au seuil $\\alpha = ${texNum(alpha, 3)}$ : on ${reject ? 'rejette' : 'ne rejette pas'} $H_0$.`;
  return {
    id,
    type: 'choice',
    prompt: `Décision au seuil de signification $${texPercent(alpha)}$ :`,
    options: [REJECT, KEEP],
    expected: reject ? 0 : 1,
    feedback: reject ? [undefined, why] : [why, undefined],
  };
}

/**
 * Une p-valeur trop proche d'un seuil rendrait la décision dépendante de
 * l'arrondi : on retire ces jeux de données.
 */
export const clearOf = (p: number, alphas: number[]) => alphas.every((a) => Math.abs(p - a) > 0.15 * a + 0.002);

/** Texte de conclusion pour plusieurs seuils. */
export function decisionText(p: number, alphas: number[]): string {
  const pTex = texPValue(p).replace('<', '\\lt');
  return alphas
    .map((a) => {
      const reject = p < a;
      return `Au seuil $${texPercent(a)}$ : $p ${reject ? '<' : '>'} ${texNum(a, 3)}$, on **${reject ? 'rejette' : 'ne rejette pas'}** $H_0$.`;
    })
    .join(' ')
    .replace(/^/, `La p-valeur vaut $p \\approx ${pTex}$. `);
}

/** Étape « loi de la statistique sous H0 » pour un test du χ². */
export function chi2LawStep(df: number, detail: string, alphas: number[]): Step {
  const crit = alphas.map((a) => `\\chi^2_{${texNum(1 - a, 3)}}(${df}) \\approx ${texFixed(chi2Quantile(1 - a, df), 2)}`).join(' \\qquad ');
  return {
    title: 'Loi sous $H_0$',
    text: `Sous $H_0$, $T$ suit asymptotiquement la loi $\\chi^2(${df})$ : ${detail} Valeurs critiques (on rejette si $T$ les dépasse) :`,
    math: crit,
    formulas: ['s.chi2ddl'],
  };
}

/** Vecteur R : c(1, 2, 3). */
export const rVec = (xs: number[]) => `c(${xs.map(rNum).join(', ')})`;

/** Pourcentage entier lisible (« 40 % »). */
export const pct = (p: number) => `${texNum(p * 100, 1)} %`;

/** Proportions entières (multiples de `step` %) au moins égales à `min` %, de somme 100 %. */
export function randomComposition(rng: Rng, k: number, min = 10, step = 5): number[] {
  const parts = Array(k).fill(min);
  let left = 100 - k * min;
  while (left > 0) {
    parts[rng.int(0, k - 1)] += step;
    left -= step;
  }
  return parts.map((x) => x / 100);
}

/** Écriture française d'un nombre décimal dans une cellule de tableau (décimales fixes, colonnes alignées). */
export const cell = (x: number, d = 2) => texFixed(x, d).replace('{,}', ',');

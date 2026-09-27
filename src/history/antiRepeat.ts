import { randomSeed } from '../core/random/prng';
import { generateExercise } from '../exercises/registry';
import type { Exercise, Template } from '../exercises/types';

/** Entrée minimale d'historique utilisée pour pondérer les tirages. */
export interface PastExercise {
  code: string;
  key: string; // empreinte du contenu (voir Exercise.signature)
  result?: 'reussi' | 'rate';
}

/** Empreinte courte d'un énoncé (FNV-1a 32 bits). */
export function statementKey(statement: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < statement.length; i++) {
    h ^= statement.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Poids d'un template : les types jamais faits ou faits il y a longtemps sont
 * favorisés, le type tiré juste avant est exclu, ceux déjà présents dans la
 * feuille sont très pénalisés et ceux ratés récemment reviennent plus souvent.
 */
export function templateWeight(t: Template, past: PastExercise[], sheetCodes: string[], lastCode: string | undefined, alone: boolean): number {
  if (!alone && t.code === lastCode) return 0;
  let idx = -1;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].code === t.code) {
      idx = i;
      break;
    }
  }
  let w = idx === -1 ? 100 : Math.min(past.length - idx, 50);
  const inSheet = sheetCodes.filter((c) => c === t.code).length;
  w *= 0.05 ** inSheet;
  if (idx !== -1 && past[idx].result === 'rate') w *= 2;
  return w;
}

export function pickWeighted<T>(items: T[], weights: number[], rand: () => number = Math.random): T {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(rand() * items.length)];
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Tire un exercice parmi `candidates` en évitant les répétitions :
 * choix pondéré du template, puis graines successives jusqu'à obtenir un
 * énoncé absent de l'historique récent.
 */
export function nextExercise(
  candidates: Template[],
  past: PastExercise[],
  sheet: Exercise[],
  rand: () => number = Math.random,
  seedFn: () => number = randomSeed,
  parts = 1,
): Exercise {
  const sheetCodes = sheet.map((e) => e.code);
  const lastCode = sheetCodes[sheetCodes.length - 1] ?? past[past.length - 1]?.code;
  const weights = candidates.map((t) => templateWeight(t, past, sheetCodes, lastCode, candidates.length === 1));
  const template = pickWeighted(candidates, weights, rand);
  const seen = new Set([...past.slice(-300).map((p) => p.key), ...sheet.map((e) => statementKey(e.signature))]);
  let ex = generateExercise(template, seedFn(), parts);
  for (let i = 0; i < 20 && seen.has(statementKey(ex.signature)); i++) ex = generateExercise(template, seedFn(), parts);
  return ex;
}

import { templatesFor } from '../exercises/registry';
import type { Difficulty, Exercise, Template } from '../exercises/types';
import { nextExercise, type PastExercise } from '../history/antiRepeat';
import type { SheetConfig, SheetItem } from './sheetConfig';

const LEVELS: Difficulty[] = [1, 2, 3];

function candidatesFor(item: SheetItem, level: Difficulty): Template[] {
  const c = templatesFor(item.theme, level, item.subtypes);
  if (c.length) return c;
  // Filtre de types incompatible avec le niveau : on garde les types choisis, tous niveaux
  const bySub = templatesFor(item.theme, undefined, item.subtypes);
  return bySub.length ? bySub : templatesFor(item.theme, level);
}

/** Niveau du prochain exercice en mode « mélangé » : le moins représenté parmi ceux disponibles. */
function mixedLevel(item: SheetItem, done: Difficulty[], rand: () => number): Difficulty {
  const available = LEVELS.filter((l) => templatesFor(item.theme, l, item.subtypes).length > 0);
  const levels = available.length ? available : LEVELS;
  const min = Math.min(...levels.map((l) => done.filter((d) => d === l).length));
  const least = levels.filter((l) => done.filter((d) => d === l).length === min);
  return least[Math.floor(rand() * least.length)];
}

export function buildSheet(config: SheetConfig, past: PastExercise[], rand: () => number = Math.random): Exercise[] {
  const sheet: Exercise[] = [];
  for (const item of config.items) {
    if (!item.enabled) continue;
    const levels: Difficulty[] = [];
    for (let i = 0; i < item.count; i++) {
      const level = item.difficulty === 'mixte' ? mixedLevel(item, levels, rand) : item.difficulty;
      levels.push(level);
      sheet.push(nextExercise(candidatesFor(item, level), past, sheet, rand, undefined, item.parts ?? 1));
    }
  }
  if (config.order === 'shuffled') {
    for (let i = sheet.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [sheet[i], sheet[j]] = [sheet[j], sheet[i]];
    }
  }
  return sheet;
}

/** Un exercice de remplacement (même thème et même niveau), différent de ceux de la feuille. */
export function replacementFor(ex: Exercise, sheet: Exercise[], past: PastExercise[], subtypes: string[] = []): Exercise {
  const item: SheetItem = { theme: ex.theme, enabled: true, count: 1, difficulty: ex.difficulty, parts: ex.parts.length, subtypes };
  return nextExercise(candidatesFor(item, ex.difficulty), past, sheet.filter((e) => e.uid !== ex.uid).concat(ex), Math.random, undefined, ex.parts.length);
}

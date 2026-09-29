import type { DifficultyChoice, Theme } from '../exercises/types';

export interface SheetItem {
  theme: Theme;
  enabled: boolean;
  count: number;
  difficulty: DifficultyChoice;
  /** Questions a, b, c… regroupées dans chaque exercice (1 = exercice simple). */
  parts: number;
  subtypes: string[]; // vide = tous les types
}

export interface SheetConfig {
  items: SheetItem[];
  order: 'grouped' | 'shuffled';
}

export const MAX_PER_THEME = 20;
export const MAX_TOTAL = 40;

export const DEFAULT_CONFIG: SheetConfig = {
  items: [
    { theme: 'derivee', enabled: true, count: 3, difficulty: 1, parts: 3, subtypes: [] },
    { theme: 'limite', enabled: true, count: 3, difficulty: 1, parts: 2, subtypes: [] },
    { theme: 'variation', enabled: true, count: 3, difficulty: 1, parts: 1, subtypes: [] },
  ],
  order: 'grouped',
};

export function totalCount(c: SheetConfig): number {
  return c.items.filter((i) => i.enabled).reduce((s, i) => s + i.count, 0);
}

/** Raccourcis de composition. */
export const PRESETS: { label: string; config: (base: SheetConfig) => SheetConfig }[] = [
  { label: '10 dérivées', config: (b) => only(b, { derivee: 10 }) },
  { label: '10 limites', config: (b) => only(b, { limite: 10 }) },
  { label: '6 tableaux', config: (b) => only(b, { variation: 6 }) },
  { label: 'Dérivées + limites', config: (b) => only(b, { derivee: 5, limite: 5 }) },
  { label: 'Tout (3 × 3)', config: (b) => only(b, { derivee: 3, limite: 3, variation: 3 }) },
  {
    // Comme en TD : des listes de fonctions à dériver (x ↦ …)
    label: 'Série de dérivées (TD)',
    config: (b) => {
      const c = only(b, { derivee: 3 });
      return { ...c, items: c.items.map((i) => (i.theme === 'derivee' ? { ...i, parts: 4, difficulty: 'mixte' as const, subtypes: [] } : i)) };
    },
  },
  {
    // Comme en TD : des listes de limites (valeurs interdites, fractions rationnelles en l'infini)
    label: 'Série de limites (TD)',
    config: (b) => {
      const c = only(b, { limite: 2 });
      return { ...c, items: c.items.map((i) => (i.theme === 'limite' ? { ...i, parts: 4, difficulty: 'mixte' as const, subtypes: ['valeur-interdite', 'rationnelle'] } : i)) };
    },
  },
  {
    // Seulement la courbe : on en déduit les tableaux
    label: 'Lecture graphique',
    config: (b) => {
      const c = only(b, { variation: 4 });
      return { ...c, items: c.items.map((i) => (i.theme === 'variation' ? { ...i, parts: 1, difficulty: 'mixte' as const, subtypes: ['lecture-graphique'] } : i)) };
    },
  },
];

export function only(base: SheetConfig, counts: Partial<Record<Theme, number>>): SheetConfig {
  return {
    ...base,
    items: base.items.map((i) => ({ ...i, enabled: counts[i.theme] !== undefined, count: counts[i.theme] ?? i.count })),
  };
}

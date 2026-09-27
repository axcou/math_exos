import type { DifficultyChoice, Theme } from '../exercises/types';

export interface SheetItem {
  theme: Theme;
  enabled: boolean;
  count: number;
  difficulty: DifficultyChoice;
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
    { theme: 'derivee', enabled: true, count: 4, difficulty: 1, subtypes: [] },
    { theme: 'limite', enabled: true, count: 3, difficulty: 1, subtypes: [] },
    { theme: 'variation', enabled: true, count: 3, difficulty: 1, subtypes: [] },
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
];

export function only(base: SheetConfig, counts: Partial<Record<Theme, number>>): SheetConfig {
  return {
    ...base,
    items: base.items.map((i) => ({ ...i, enabled: counts[i.theme] !== undefined, count: counts[i.theme] ?? i.count })),
  };
}

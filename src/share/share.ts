import { exerciseUid, parseUid, TEMPLATE_BY_CODE } from '../exercises/registry';
import { MAX_PARTS } from '../exercises/types';
import type { DifficultyChoice, Theme } from '../exercises/types';
import { DEFAULT_CONFIG, MAX_PER_THEME, MAX_TOTAL, type SheetConfig } from '../sheet/sheetConfig';

/*
 * Liens de partage (routes du HashRouter) :
 *   feuille exacte   #/f?v=1&e=D07.1k3f9a~L05.9zz01&t=Titre&c=1&s=1&r=0&u=1
 *     c : corrigé, s : saisie, r=0 : sans « Recommencer », u=1 : une seule vérification
 *   configuration    #/g?v=1&d=6.2&l=4.m&s=3.1&o=g
 * Un exercice en plusieurs parties (a, b, c) ajoute leur nombre : D11.1k3f9a.3,
 * et côté configuration d=4.2.3 (4 exercices de niveau 2, 3 parties chacun).
 */

export const SHARE_VERSION = 1;

export interface ExerciseRef {
  code: string;
  seed: number;
  /** Nombre de parties a, b, c… (1 par défaut). */
  parts?: number;
}

export interface SharedSheet {
  refs: ExerciseRef[];
  title: string;
  showSolutions: boolean;
  inputs: boolean;
  /** « Recommencer » autorisé (défaut : oui). */
  allowRetry?: boolean;
  /** Une seule vérification par question (défaut : non). */
  singleAttempt?: boolean;
}

export interface DecodedSheet extends SharedSheet {
  /** Nombre d'exercices ignorés (code inconnu, graine invalide…). */
  skipped: number;
}

export function encodeSheet(s: SharedSheet): string {
  const p = new URLSearchParams();
  p.set('v', String(SHARE_VERSION));
  p.set('e', s.refs.map((r) => exerciseUid(r.code, r.seed, r.parts)).join('~'));
  if (s.title.trim()) p.set('t', s.title.trim());
  p.set('c', s.showSolutions ? '1' : '0');
  p.set('s', s.inputs ? '1' : '0');
  if (s.allowRetry === false) p.set('r', '0');
  if (s.singleAttempt) p.set('u', '1');
  return `f?${p.toString()}`;
}

export function decodeSheet(params: URLSearchParams): DecodedSheet | null {
  const v = Number(params.get('v') ?? '1');
  if (!Number.isInteger(v) || v < 1 || v > SHARE_VERSION) return null;
  const raw = (params.get('e') ?? '').split('~').filter(Boolean);
  const refs: ExerciseRef[] = [];
  let skipped = 0;
  for (const item of raw.slice(0, MAX_TOTAL)) {
    const r = parseUid(item);
    if (!r || !TEMPLATE_BY_CODE.has(r.code) || !Number.isFinite(r.seed) || r.seed > 0xffffffff) {
      skipped++;
      continue;
    }
    refs.push(r.parts > 1 ? r : { code: r.code, seed: r.seed });
  }
  skipped += Math.max(0, raw.length - MAX_TOTAL);
  if (refs.length === 0) return null;
  return {
    refs,
    skipped,
    title: (params.get('t') ?? '').slice(0, 80),
    showSolutions: params.get('c') !== '0',
    allowRetry: params.get('r') !== '0',
    singleAttempt: params.get('u') === '1',
    inputs: params.get('s') !== '0',
  };
}

const THEME_KEYS: Record<Theme, string> = { derivee: 'd', limite: 'l', variation: 's' };

export function encodeConfig(c: SheetConfig): string {
  const p = new URLSearchParams();
  p.set('v', String(SHARE_VERSION));
  for (const i of c.items) {
    if (i.enabled) p.set(THEME_KEYS[i.theme], `${i.count}.${i.difficulty === 'mixte' ? 'm' : i.difficulty}${i.parts > 1 ? `.${i.parts}` : ''}`);
  }
  p.set('o', c.order === 'shuffled' ? 'm' : 'g');
  return `g?${p.toString()}`;
}

export function decodeConfig(params: URLSearchParams): SheetConfig | null {
  let any = false;
  const items = DEFAULT_CONFIG.items.map((item) => {
    const raw = params.get(THEME_KEYS[item.theme]);
    const m = raw ? /^(\d{1,2})\.([123m])(?:\.(\d))?$/.exec(raw) : null;
    if (!m) return { ...item, enabled: false, subtypes: [] };
    any = true;
    const count = Math.min(MAX_PER_THEME, Math.max(1, Number(m[1])));
    const difficulty: DifficultyChoice = m[2] === 'm' ? 'mixte' : (Number(m[2]) as 1 | 2 | 3);
    const parts = Math.min(MAX_PARTS, Math.max(1, Number(m[3] ?? 1)));
    return { ...item, enabled: true, count, difficulty, parts, subtypes: [] };
  });
  if (!any) return null;
  return { items, order: params.get('o') === 'm' ? 'shuffled' : 'grouped' };
}

/** URL absolue d'une route du HashRouter. */
export function absoluteUrl(route: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/${route}`;
}

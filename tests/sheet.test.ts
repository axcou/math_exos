import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/random/prng';
import { exerciseFromRef, templatesFor, TEMPLATES } from '../src/exercises/registry';
import { nextExercise, type PastExercise, statementKey } from '../src/history/antiRepeat';
import { decodeConfig, decodeSheet, encodeConfig, encodeSheet } from '../src/share/share';
import { buildSheet } from '../src/sheet/buildSheet';
import { DEFAULT_CONFIG, only } from '../src/sheet/sheetConfig';

const seeded = (s: number) => {
  const r = new Rng(s);
  return () => r.next();
};

describe('anti-répétition', () => {
  it('ne tire jamais deux fois le même type de suite et parcourt tous les types', () => {
    const candidates = templatesFor('derivee');
    const past: PastExercise[] = [];
    const rand = seeded(1);
    let prev = '';
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const ex = nextExercise(candidates, past, [], rand);
      expect(ex.code).not.toBe(prev);
      prev = ex.code;
      seen.add(ex.code);
      past.push({ code: ex.code, key: statementKey(ex.statement) });
    }
    expect(seen.size).toBe(candidates.length);
  });

  it('parcourt tous les types avant d’en répéter un (ordre « moins récent d’abord »)', () => {
    const candidates = templatesFor('limite', 2);
    const past: PastExercise[] = [];
    const rand = seeded(7);
    const firstRound = new Set<string>();
    for (let i = 0; i < candidates.length; i++) {
      const ex = nextExercise(candidates, past, [], rand);
      firstRound.add(ex.code);
      past.push({ code: ex.code, key: statementKey(ex.statement) });
    }
    expect(firstRound.size).toBe(candidates.length);
  });
});

describe('composition de feuille', () => {
  it('respecte thèmes, nombres et niveaux', () => {
    const config = only({ ...DEFAULT_CONFIG, items: DEFAULT_CONFIG.items.map((i) => ({ ...i, difficulty: 2 as const })) }, { derivee: 6, limite: 4 });
    const sheet = buildSheet(config, [], seeded(3));
    expect(sheet).toHaveLength(10);
    expect(sheet.slice(0, 6).every((e) => e.theme === 'derivee')).toBe(true);
    expect(sheet.slice(6).every((e) => e.theme === 'limite')).toBe(true);
    expect(sheet.every((e) => e.difficulty === 2)).toBe(true);
    expect(new Set(sheet.map((e) => e.statement)).size).toBe(10);
  });

  it('varie les types dans une feuille mono-thème', () => {
    const sheet = buildSheet(only(DEFAULT_CONFIG, { derivee: 10 }), [], seeded(5));
    const lvl1 = templatesFor('derivee', 1).length;
    expect(new Set(sheet.map((e) => e.code)).size).toBe(lvl1);
    // aucun type deux fois de suite
    sheet.slice(1).forEach((e, i) => expect(e.code).not.toBe(sheet[i].code));
  });

  it('équilibre les niveaux en mode mélangé', () => {
    const config = only({ ...DEFAULT_CONFIG, items: DEFAULT_CONFIG.items.map((i) => ({ ...i, difficulty: 'mixte' as const })) }, { variation: 9 });
    const sheet = buildSheet(config, [], seeded(9));
    for (const d of [1, 2, 3]) expect(sheet.filter((e) => e.difficulty === d)).toHaveLength(3);
  });

  it('applique le filtre de types', () => {
    const config = only({ ...DEFAULT_CONFIG, items: DEFAULT_CONFIG.items.map((i) => ({ ...i, difficulty: 2 as const, subtypes: ['quotient'] })) }, { derivee: 5 });
    const sheet = buildSheet(config, [], seeded(11));
    expect(sheet.every((e) => TEMPLATES.find((t) => t.code === e.code)!.subtype === 'quotient')).toBe(true);
    expect(new Set(sheet.map((e) => e.statement)).size).toBe(5);
  });

  it('mélange sur demande', () => {
    const config = { ...only(DEFAULT_CONFIG, { derivee: 5, limite: 5, variation: 5 }), order: 'shuffled' as const };
    const sheet = buildSheet(config, [], seeded(13));
    const blocks = sheet.filter((e, i) => i === 0 || e.theme !== sheet[i - 1].theme).length;
    expect(blocks).toBeGreaterThan(3);
  });
});

describe('partage par URL', () => {
  const sheet = buildSheet(DEFAULT_CONFIG, [], seeded(17));
  const refs = sheet.map((e) => ({ code: e.code, seed: e.seed }));

  it('feuille exacte : aller-retour identique', () => {
    const url = encodeSheet({ refs, title: 'Révisions dérivées', showSolutions: false, inputs: true });
    const decoded = decodeSheet(new URLSearchParams(url.split('?')[1]))!;
    expect(decoded.refs).toEqual(refs);
    expect(decoded.title).toBe('Révisions dérivées');
    expect(decoded.showSolutions).toBe(false);
    expect(decoded.skipped).toBe(0);
    decoded.refs.forEach((r, i) => expect(exerciseFromRef(r.code, r.seed)!.statement).toBe(sheet[i].statement));
    expect(url.length).toBeLessThan(250);
  });

  it('ignore les exercices invalides sans planter', () => {
    const d = decodeSheet(new URLSearchParams('v=1&e=D01.abc~Z99.1~D02.!!~L03.zzzzzzzzz~V01.0'))!;
    expect(d.refs.map((r) => r.code)).toEqual(['D01', 'V01']);
    expect(d.skipped).toBe(3);
    expect(decodeSheet(new URLSearchParams('v=99&e=D01.abc'))).toBeNull();
    expect(decodeSheet(new URLSearchParams('e='))).toBeNull();
  });

  it('configuration : aller-retour', () => {
    const c = { ...only({ ...DEFAULT_CONFIG, items: DEFAULT_CONFIG.items.map((i) => ({ ...i, difficulty: 'mixte' as const })) }, { derivee: 6, limite: 4 }), order: 'shuffled' as const };
    const d = decodeConfig(new URLSearchParams(encodeConfig(c).split('?')[1]))!;
    expect(d.items.map((i) => [i.enabled, i.enabled ? i.count : 0, i.enabled ? i.difficulty : null])).toEqual([
      [true, 6, 'mixte'],
      [true, 4, 'mixte'],
      [false, 0, null],
    ]);
    expect(d.order).toBe('shuffled');
    expect(decodeConfig(new URLSearchParams('v=1'))).toBeNull();
  });
});

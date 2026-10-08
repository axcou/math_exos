import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { checkChoice, checkNumber, parseNumber } from '../src/checking/check';
import { rNum, texFixed, texNum, texPercent, texPValue, textFixed } from '../src/core/stats/format';
import { generateExercise, TEMPLATE_BY_CODE } from '../src/exercises/registry';
import { choiceQ, clearOf, decisionQ, numberQ, randomComposition } from '../src/exercises/stats/helpers';
import type { ChoiceQuestion, NumberQuestion } from '../src/exercises/types';
import { Rng } from '../src/core/random/prng';
import { decodeConfig, decodeSheet, encodeConfig, encodeSheet } from '../src/share/share';
import { buildSheet } from '../src/sheet/buildSheet';
import { DEFAULT_CONFIG } from '../src/sheet/sheetConfig';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

let store: typeof import('../src/history/store');
beforeAll(async () => {
  (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  store = await import('../src/history/store');
});

const ex = (code: string, seed = 1) => generateExercise(TEMPLATE_BY_CODE.get(code)!, seed);

describe('saisie d’un nombre décimal', () => {
  it('virgule, point, espaces, signe, notation scientifique, fraction', () => {
    expect(parseNumber('3,84')).toBe(3.84);
    expect(parseNumber(' 3.84 ')).toBe(3.84);
    expect(parseNumber('1 234,5')).toBe(1234.5);
    expect(parseNumber('−0,25')).toBe(-0.25);
    expect(parseNumber(',5')).toBe(0.5);
    expect(parseNumber('4,7e-2')).toBeCloseTo(0.047, 12);
    expect(parseNumber('1.2E3')).toBe(1200);
    expect(parseNumber('22/3')).toBeCloseTo(22 / 3, 12);
  });

  it('refuse les saisies illisibles avec un message utile', () => {
    for (const s of ['', '   ', 'abc', '3,8,4', 'x+1']) {
      const r = parseNumber(s);
      expect(typeof r, s).toBe('object');
      if (typeof r === 'object') expect(r.status).toBe('invalid');
    }
    const pct = parseNumber('5 %');
    expect(typeof pct === 'object' && pct.message).toMatch(/sans « % »/);
  });
});

describe('vérification d’une valeur numérique', () => {
  const q: NumberQuestion = numberQ('q', '', 'T =', 11.237, 2, 0.02, [
    { value: 9.5, message: 'Divise par l’effectif théorique.' },
    { value: 11.24, message: 'trop proche : écartée' },
  ]);

  it('tolérance : juste, presque (arrondi), faux', () => {
    expect(checkNumber('11,24', q).status).toBe('correct');
    expect(checkNumber('11.25', q).status).toBe('correct');
    expect(checkNumber('11,30', q).status).toBe('partial');
    expect(checkNumber('12', q).status).toBe('incorrect');
    expect(checkNumber('rien', q).status).toBe('invalid');
  });

  it('erreurs classiques : message dédié, et jamais confondues avec la bonne réponse', () => {
    expect(q.mistakes).toEqual([{ value: 9.5, message: 'Divise par l’effectif théorique.' }]);
    expect(checkNumber('9,5', q)).toEqual({ status: 'incorrect', message: 'Divise par l’effectif théorique.' });
  });

  it('deux erreurs classiques confondues : seule la première est gardée', () => {
    const r = numberQ('q', '', 'p =', 0.3, 3, 0.003, [
      { value: 0.6, message: 'A' },
      { value: 0.601, message: 'B' },
      { value: Number.NaN, message: 'C' },
    ]);
    expect(r.mistakes?.map((m) => m.message)).toEqual(['A']);
  });
});

describe('questions à choix', () => {
  it('mélange reproductible, bonne réponse suivie, explications attachées', () => {
    const a = choiceQ(new Rng(4), 'q', 'Quelle loi ?', 'bonne', [{ text: 'f1', why: 'w1' }, { text: 'f2', why: 'w2' }, { text: 'f3' }]);
    const b = choiceQ(new Rng(4), 'q', 'Quelle loi ?', 'bonne', [{ text: 'f1', why: 'w1' }, { text: 'f2', why: 'w2' }, { text: 'f3' }]);
    expect(a).toEqual(b);
    expect(a.options[a.expected]).toBe('bonne');
    expect(a.feedback![a.options.indexOf('f1')]).toBe('w1');
    expect(a.feedback![a.expected]).toBeUndefined();
    expect(checkChoice(String(a.expected), a).status).toBe('correct');
    expect(checkChoice(String(a.options.indexOf('f2')), a)).toEqual({ status: 'incorrect', message: 'w2' });
    expect(checkChoice(String(a.options.indexOf('f3')), a).message).toBe('Ce n’est pas la bonne proposition.');
    expect(checkChoice('', a).status).toBe('invalid');
    expect(checkChoice('9', a).status).toBe('invalid');
  });

  it('sans mélange, l’ordre est conservé', () => {
    const q = choiceQ(new Rng(1), 'q', '', 'bonne', [{ text: 'x' }], false);
    expect(q.options).toEqual(['bonne', 'x']);
  });

  it('décision : rejet si et seulement si p < α, avec rappel de la règle', () => {
    const rej: ChoiceQuestion = decisionQ('d', 0.05, 0.012);
    expect(rej.options[rej.expected]).toMatch(/On rejette/);
    expect(rej.feedback![1]).toMatch(/inférieure au seuil/);
    const keep = decisionQ('d', 0.01, 0.012);
    expect(keep.options[keep.expected]).toMatch(/ne rejette pas/);
    expect(keep.feedback![0]).toMatch(/supérieure au seuil/);
    expect(rej.prompt).toContain('5\\,\\%');
  });

  it('marge de sécurité autour des seuils', () => {
    expect(clearOf(0.049, [0.05])).toBe(false);
    expect(clearOf(0.03, [0.05])).toBe(true);
    expect(clearOf(0.0105, [0.05, 0.01])).toBe(false);
    expect(clearOf(0.5, [0.05, 0.01])).toBe(true);
  });

  it('répartitions annoncées : multiples de 5 %, de somme 100 %', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 50; i++) {
      const p = randomComposition(rng, rng.int(3, 5));
      expect(p.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
      for (const x of p) {
        expect(x).toBeGreaterThanOrEqual(0.1);
        expect(Math.round(x * 100) % 5).toBe(0);
      }
    }
  });
});

describe('écriture des nombres', () => {
  it('à la française en LaTeX, avec un point en R', () => {
    expect(texNum(16.6667)).toBe('16{,}67');
    expect(texNum(12)).toBe('12');
    expect(texNum(0.5, 3)).toBe('0{,}5');
    expect(texFixed(0.05, 3)).toBe('0{,}050');
    expect(texFixed(-0.0001, 2)).toBe('0{,}00');
    expect(textFixed(3.14159, 2)).toBe('3,14');
    expect(texPValue(0.04683)).toBe('0{,}047');
    expect(texPValue(0.00002)).toBe('< 0{,}001');
    expect(texPercent(0.05)).toBe('5\\,\\%');
    expect(rNum(0.1 + 0.2)).toBe('0.3');
  });
});

describe('feuille de tests : store, partage, génération', () => {
  beforeEach(() => store.useStore.getState().clearHistory());

  it('la feuille « stat » est indépendante de la feuille principale', () => {
    const s = store.useStore.getState();
    const a = ex('D01');
    const b = ex('S02');
    const c = ex('S06');
    s.setSheet([a]);
    s.setSheet([b], {}, 'stat');
    expect(store.useStore.getState().sheet!.refs.map((r) => r.code)).toEqual(['D01']);
    expect(store.useStore.getState().statSheet!.refs.map((r) => r.code)).toEqual(['S02']);
    s.appendToSheet(c, b.uid, 'stat');
    expect(store.useStore.getState().statSheet!.refs.map((r) => r.code)).toEqual(['S02', 'S06']);
    s.replaceInSheet(b.uid, ex('S08'), 'stat');
    expect(store.useStore.getState().statSheet!.refs.map((r) => r.code)).toEqual(['S08', 'S06']);
    expect(store.useStore.getState().sheet!.refs.map((r) => r.code)).toEqual(['D01']);
    // les deux feuilles alimentent le même historique
    expect(store.useStore.getState().history.map((h) => h.code)).toEqual(['D01', 'S02', 'S06', 'S08']);
    expect(store.useStore.getState().history.find((h) => h.code === 'S02')!.theme).toBe('stat');
  });

  it('progression et résultat d’un exercice de tests', () => {
    const e = ex('S03', 5);
    const s = store.useStore.getState();
    s.setSheet([e], {}, 'stat');
    for (const q of e.questions) s.submit(e, q.id, { status: 'correct' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBe('reussi');
  });

  it('réglages par défaut de la page', () => {
    expect(store.useStore.getState().statConfig).toEqual(store.DEFAULT_STAT_CONFIG);
    store.useStore.getState().setStatConfig({ subtypes: ['anova'], count: 2, difficulty: 3 });
    expect(store.useStore.getState().statConfig.subtypes).toEqual(['anova']);
  });

  it('un lien de feuille de tests se décode à l’identique', () => {
    const refs = [
      { code: 'S01', seed: 12 },
      { code: 'S05', seed: 4_000_000_000 },
    ];
    const enc = encodeSheet({ refs, title: 'Tests', showSolutions: false, inputs: true, allowRetry: true, singleAttempt: true });
    const dec = decodeSheet(new URLSearchParams(enc.split('?')[1]))!;
    expect(dec.refs).toEqual(refs);
    expect(dec.skipped).toBe(0);
    expect(dec.showSolutions).toBe(false);
  });

  it('les liens de composition d’analyse ne sont pas affectés', () => {
    const enc = encodeConfig(DEFAULT_CONFIG);
    expect(enc).not.toContain('t=');
    expect(decodeConfig(new URLSearchParams(enc.split('?')[1]))!.items.map((i) => i.theme)).toEqual(['derivee', 'limite', 'variation']);
  });

  it('génération : nombre, types choisis et niveau respectés, sans doublon', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const item = (subtypes: string[], count: number, difficulty: 1 | 2 | 3 | 'mixte') => ({ items: [{ theme: 'stat' as const, enabled: true, count, difficulty, parts: 1, subtypes }], order: 'grouped' as const });
    const all = buildSheet(item([], 8, 'mixte'), [], rand);
    expect(all).toHaveLength(8);
    expect(new Set(all.map((e) => e.uid)).size).toBe(8);
    expect(new Set(all.map((e) => e.code)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(all.map((e) => e.difficulty))).toEqual(new Set([1, 2, 3]));
    const anova = buildSheet(item(['anova'], 3, 'mixte'), [], rand);
    expect(anova.map((e) => e.code)).toEqual(['S08', 'S08', 'S08']);
    const easy = buildSheet(item([], 4, 1), [], rand);
    expect(easy.every((e) => e.difficulty === 1)).toBe(true);
    // types et niveau incompatibles : on garde les types choisis
    const forced = buildSheet(item(['independance'], 2, 3), [], rand);
    expect(forced.every((e) => e.code === 'S06')).toBe(true);
  });
});

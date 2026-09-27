import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { generateExercise, TEMPLATES } from '../src/exercises/registry';

// localStorage minimal pour le middleware persist de zustand (environnement Node)
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

const ex = (code: string, seed = 1, parts = 1) => generateExercise(TEMPLATES.find((t) => t.code === code)!, seed, parts);

describe('résultat d’un exercice', () => {
  beforeEach(() => store.useStore.getState().clearHistory());

  it('réussi : tout juste en au plus 2 essais, sans correction', () => {
    const e = ex('D05');
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.submit(e, 'q1', { status: 'incorrect' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBeUndefined();
    s.submit(e, 'q1', { status: 'correct' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBe('reussi');
    expect(store.useStore.getState().history.find((h) => h.uid === e.uid)?.result).toBe('reussi');
  });

  it('raté : trop d’essais', () => {
    const e = ex('D05', 2);
    const s = store.useStore.getState();
    s.setSheet([e]);
    for (let i = 0; i < 3; i++) s.submit(e, 'q1', { status: 'incorrect' });
    s.submit(e, 'q1', { status: 'correct' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBe('rate');
  });

  it('raté : correction ouverte avant d’avoir trouvé', () => {
    const e = ex('D05', 3);
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.openSolution(e);
    s.submit(e, 'q1', { status: 'correct' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBe('rate');
  });

  it('ouvrir la correction après avoir réussi ne pénalise pas', () => {
    const e = ex('D05', 4);
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.submit(e, 'q1', { status: 'correct' });
    s.openSolution(e);
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBe('reussi');
  });

  it('une saisie illisible ne compte pas comme essai', () => {
    const e = ex('D05', 5);
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.submit(e, 'q1', { status: 'invalid' });
    s.submit(e, 'q1', { status: 'invalid' });
    expect(store.useStore.getState().progress[e.uid].attempts.q1 ?? 0).toBe(0);
  });

  it('exercice en plusieurs parties : toutes les parties doivent être justes', () => {
    const e = ex('D11', 6, 3);
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.submit(e, 'a-q1', { status: 'correct' });
    s.submit(e, 'b-q1', { status: 'correct' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBeUndefined();
    s.submit(e, 'c-q1', { status: 'correct' });
    expect(store.exerciseResult(e, store.useStore.getState().progress[e.uid])).toBe('reussi');
  });

  it('marquage manuel (mode papier)', () => {
    const e = ex('L01', 7);
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.setManual(e, 'rate');
    expect(store.useStore.getState().history.find((h) => h.uid === e.uid)?.result).toBe('rate');
    s.setManual(e, undefined);
    expect(store.useStore.getState().history.find((h) => h.uid === e.uid)?.result).toBeUndefined();
  });

  it('recommencer efface réponses et résultat', () => {
    const e = ex('D05', 8);
    const s = store.useStore.getState();
    s.setSheet([e]);
    s.setInput(e.uid, 'q1', 'x');
    s.submit(e, 'q1', { status: 'correct' });
    s.resetProgress(e.uid);
    expect(store.useStore.getState().progress[e.uid]).toBeUndefined();
    expect(store.useStore.getState().history.find((h) => h.uid === e.uid)?.result).toBeUndefined();
  });
});

describe('feuille courante', () => {
  beforeEach(() => store.useStore.getState().clearHistory());

  it('remplacer et insérer un exercice', () => {
    const [a, b, c] = [ex('D01', 1), ex('D02', 2), ex('D03', 3, 2)];
    const s = store.useStore.getState();
    s.setSheet([a, b]);
    s.replaceInSheet(a.uid, c);
    expect(store.useStore.getState().sheet!.refs).toEqual([store.refOf(c), store.refOf(b)]);
    const d = ex('D04', 4);
    s.appendToSheet(d, c.uid);
    expect(store.useStore.getState().sheet!.refs.map((r) => r.code)).toEqual(['D03', 'D04', 'D02']);
  });

  it('l’historique n’enregistre pas deux fois le même exercice', () => {
    const a = ex('D01', 9);
    const s = store.useStore.getState();
    s.setSheet([a]);
    s.setSheet([a]);
    expect(store.useStore.getState().history.filter((h) => h.uid === a.uid)).toHaveLength(1);
  });

  it('les références gardent le nombre de parties', () => {
    const a = ex('D11', 10, 3);
    expect(store.refOf(a)).toEqual({ code: 'D11', seed: 10, parts: 3 });
    expect(store.refOf(ex('D11', 10))).toEqual({ code: 'D11', seed: 10 });
  });

  it('l’état est sauvegardé dans le stockage', () => {
    const a = ex('V01', 11);
    store.useStore.getState().setSheet([a]);
    const raw = localStorage.getItem('math-exo');
    expect(raw).toContain('V01');
    expect(JSON.parse(raw!).version).toBe(2);
  });

  it('historique limité à 500 entrées', () => {
    const s = store.useStore.getState();
    for (let i = 0; i < 520; i++) s.setSheet([ex('D01', 1000 + i)]);
    expect(store.useStore.getState().history.length).toBe(500);
  });
});

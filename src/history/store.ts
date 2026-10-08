import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CheckResult, TableAnswer } from '../checking/check';
import { exerciseUid } from '../exercises/registry';
import type { Difficulty, DifficultyChoice, Exercise, Theme } from '../exercises/types';
import type { ExerciseRef } from '../share/share';
import { DEFAULT_CONFIG, type SheetConfig } from '../sheet/sheetConfig';
import { type PastExercise, statementKey } from './antiRepeat';

export type Result = 'reussi' | 'rate';

export interface HistoryEntry {
  uid: string;
  code: string;
  theme: Theme;
  difficulty: Difficulty;
  key: string;
  date: number;
  result?: Result;
  source: 'generated' | 'shared';
}

export type AnswerValue = string | TableAnswer;

export interface Progress {
  inputs: Record<string, AnswerValue>;
  results: Record<string, CheckResult>;
  attempts: Record<string, number>;
  /** Correction ouverte avant d'avoir tout réussi. */
  sawSolution: boolean;
  hint: boolean;
  manual?: Result;
}

export interface CurrentSheet {
  refs: ExerciseRef[];
  title: string;
  source: 'generated' | 'shared';
  showSolutions: boolean;
  /** Bouton « Recommencer » disponible. */
  allowRetry: boolean;
  /** Une seule vérification par question (mode contrôle). */
  singleAttempt: boolean;
  /** Feuille générée en ordre mélangé : pas de bandeaux par chapitre. */
  mixed?: boolean;
  skipped?: number;
}

/** Feuille d'analyse (page « Exercices ») ou de tests statistiques (page « Tests stat. »). */
export type SheetSlot = 'main' | 'stat';

/** Réglages de la page « Tests stat. ». */
export interface StatConfig {
  /** Types de tests retenus (vide = tous). */
  subtypes: string[];
  count: number;
  difficulty: DifficultyChoice;
}

export const DEFAULT_STAT_CONFIG: StatConfig = { subtypes: [], count: 3, difficulty: 'mixte' };

const SLOT_KEY = { main: 'sheet', stat: 'statSheet' } as const;

interface State {
  config: SheetConfig;
  sheet: CurrentSheet | null;
  statConfig: StatConfig;
  statSheet: CurrentSheet | null;
  setStatConfig(c: StatConfig): void;
  history: HistoryEntry[];
  progress: Record<string, Progress>;
  inputsEnabled: boolean;
  /** Impression sur une ou deux colonnes. */
  printColumns: 1 | 2;
  setPrintColumns(n: 1 | 2): void;

  setConfig(c: SheetConfig): void;
  setSheet(exercises: Exercise[], opts?: Partial<Omit<CurrentSheet, 'refs'>>, slot?: SheetSlot): void;
  replaceInSheet(oldUid: string, ex: Exercise, slot?: SheetSlot): void;
  appendToSheet(ex: Exercise, afterUid?: string, slot?: SheetSlot): void;
  setInputsEnabled(v: boolean): void;
  setInput(uid: string, qid: string, v: AnswerValue): void;
  submit(ex: Exercise, qid: string, r: CheckResult): void;
  openSolution(ex: Exercise): void;
  setHint(uid: string, open: boolean): void;
  setManual(ex: Exercise, r: Result | undefined): void;
  resetProgress(uid: string): void;
  clearHistory(): void;
}

const MAX_HISTORY = 500;
const MAX_PROGRESS = 400;

export const emptyProgress = (): Progress => ({ inputs: {}, results: {}, attempts: {}, sawSolution: false, hint: false });

/** Résultat d'un exercice déduit des réponses (ou du marquage manuel). */
export function exerciseResult(ex: Exercise, p: Progress | undefined): Result | undefined {
  if (!p) return undefined;
  if (p.manual) return p.manual;
  const results = ex.questions.map((q) => p.results[q.id]?.status);
  const allCorrect = results.every((s) => s === 'correct');
  if (allCorrect) {
    const fewTries = ex.questions.every((q) => (p.attempts[q.id] ?? 0) <= 2);
    return fewTries && !p.sawSolution ? 'reussi' : 'rate';
  }
  if (p.sawSolution) return 'rate';
  return undefined;
}

function capProgress(p: Record<string, Progress>): Record<string, Progress> {
  const keys = Object.keys(p);
  if (keys.length <= MAX_PROGRESS) return p;
  const out: Record<string, Progress> = {};
  keys.slice(-MAX_PROGRESS).forEach((k) => (out[k] = p[k]));
  return out;
}

/** Référence compacte d'un exercice dans la feuille courante. */
export const refOf = (e: Exercise): ExerciseRef => (e.parts.length > 1 ? { code: e.code, seed: e.seed, parts: e.parts.length } : { code: e.code, seed: e.seed });

function toEntry(ex: Exercise, source: HistoryEntry['source']): HistoryEntry {
  return { uid: ex.uid, code: ex.code, theme: ex.theme, difficulty: ex.difficulty, key: statementKey(ex.signature), date: Date.now(), source };
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const updateProgress = (uid: string, fn: (p: Progress) => Progress) =>
        set((s) => ({ progress: capProgress({ ...s.progress, [uid]: fn(s.progress[uid] ?? emptyProgress()) }) }));

      const syncResult = (ex: Exercise) => {
        const r = exerciseResult(ex, get().progress[ex.uid]);
        set((s) => ({ history: s.history.map((h) => (h.uid === ex.uid ? { ...h, result: r } : h)) }));
      };

      const record = (exercises: Exercise[], source: HistoryEntry['source']) =>
        set((s) => {
          const known = new Set(s.history.map((h) => h.uid));
          const added = exercises.filter((e) => !known.has(e.uid)).map((e) => toEntry(e, source));
          return { history: [...s.history, ...added].slice(-MAX_HISTORY) };
        });

      return {
        config: DEFAULT_CONFIG,
        sheet: null,
        statConfig: DEFAULT_STAT_CONFIG,
        statSheet: null,
        setStatConfig: (statConfig) => set({ statConfig }),
        history: [],
        progress: {},
        inputsEnabled: true,
        printColumns: 1,
        setPrintColumns: (printColumns) => set({ printColumns }),

        setConfig: (config) => set({ config }),
        setSheet: (exercises, opts, slot = 'main') => {
          const source = opts?.source ?? 'generated';
          set({
            [SLOT_KEY[slot]]: {
              refs: exercises.map(refOf),
              title: opts?.title ?? '',
              source,
              showSolutions: opts?.showSolutions ?? true,
              allowRetry: opts?.allowRetry ?? true,
              singleAttempt: opts?.singleAttempt ?? false,
              mixed: opts?.mixed,
              skipped: opts?.skipped,
            },
          });
          record(exercises, source);
        },
        replaceInSheet: (oldUid, ex, slot = 'main') => {
          const key = SLOT_KEY[slot];
          set((s) => {
            const sheet = s[key];
            return sheet ? { [key]: { ...sheet, refs: sheet.refs.map((r) => (exerciseUid(r.code, r.seed, r.parts) === oldUid ? refOf(ex) : r)) } } : {};
          });
          record([ex], 'generated');
        },
        appendToSheet: (ex, afterUid, slot = 'main') => {
          const key = SLOT_KEY[slot];
          set((s) => {
            const sheet = s[key];
            if (!sheet) return {};
            const refs = [...sheet.refs];
            const idx = afterUid ? refs.findIndex((r) => exerciseUid(r.code, r.seed, r.parts) === afterUid) : -1;
            refs.splice(idx === -1 ? refs.length : idx + 1, 0, refOf(ex));
            return { [key]: { ...sheet, refs } };
          });
          record([ex], 'generated');
        },
        setInputsEnabled: (inputsEnabled) => set({ inputsEnabled }),
        setInput: (uid, qid, v) => updateProgress(uid, (p) => ({ ...p, inputs: { ...p.inputs, [qid]: v } })),
        submit: (ex, qid, r) => {
          updateProgress(ex.uid, (p) => ({
            ...p,
            results: { ...p.results, [qid]: r },
            // une saisie non comprise ne compte pas comme tentative
            attempts: r.status === 'invalid' ? p.attempts : { ...p.attempts, [qid]: (p.attempts[qid] ?? 0) + 1 },
          }));
          syncResult(ex);
        },
        openSolution: (ex) => {
          updateProgress(ex.uid, (p) => {
            const done = ex.questions.every((q) => p.results[q.id]?.status === 'correct');
            return { ...p, sawSolution: p.sawSolution || !done };
          });
          syncResult(ex);
        },
        setHint: (uid, open) => updateProgress(uid, (p) => ({ ...p, hint: open })),
        setManual: (ex, r) => {
          updateProgress(ex.uid, (p) => ({ ...p, manual: r }));
          syncResult(ex);
        },
        resetProgress: (uid) =>
          set((s) => {
            const progress = { ...s.progress };
            delete progress[uid];
            return { progress, history: s.history.map((h) => (h.uid === uid ? { ...h, result: undefined } : h)) };
          }),
        clearHistory: () => set({ history: [], progress: {} }),
      };
    },
    {
      name: 'math-exo',
      version: 2,
      // v2 : nombre de parties par exercice dans la composition
      migrate: (state, version) => {
        const st = state as State;
        if (version < 2 && st?.config) {
          st.config = { ...st.config, items: st.config.items.map((i) => ({ ...i, parts: i.parts ?? DEFAULT_CONFIG.items.find((d) => d.theme === i.theme)?.parts ?? 1 })) };
        }
        return st;
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function pastExercises(history: HistoryEntry[]): PastExercise[] {
  return history.map((h) => ({ code: h.code, key: h.key, result: h.result }));
}

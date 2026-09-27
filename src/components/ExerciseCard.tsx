import { useState } from 'react';
import { type CheckResult, checkExpression, checkRoots, checkTable, checkValue, emptyTableAnswer, type TableAnswer } from '../checking/check';
import { DIFFICULTY_LABELS, type Exercise, type Question, THEME_LABELS } from '../exercises/types';
import { emptyProgress, exerciseResult, useStore } from '../history/store';
import { ExpressionInput, RootsInput, ValueInput } from './answers/AnswerInputs';
import { MathText } from './Math';
import { Solution, StepItem } from './Solution';
import { VariationTable } from './VariationTable';

const THEME_COLORS: Record<Exercise['theme'], string> = {
  derivee: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  limite: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  variation: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
};

const LEVEL_DOTS = (d: number) => '●'.repeat(d) + '○'.repeat(3 - d);

function Feedback({ r, attempts }: { r?: CheckResult; attempts: number }) {
  if (!r) return null;
  const styles = {
    correct: ['✔', 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'],
    partial: ['〜', 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'],
    incorrect: ['✘', 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'],
    invalid: ['⚠', 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'],
  } as const;
  const [icon, cls] = styles[r.status];
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`} role="status">
      <span className="font-bold">{icon}</span>
      <span className="flex-1">
        <MathText text={r.message ?? ''} />
      </span>
      {attempts > 0 && <span className="shrink-0 text-xs opacity-70">{attempts} essai{attempts > 1 ? 's' : ''}</span>}
    </div>
  );
}

function QuestionBlock({ ex, q, index, total }: { ex: Exercise; q: Question; index: number; total: number }) {
  const progress = useStore((s) => s.progress[ex.uid]) ?? emptyProgress();
  const setInput = useStore((s) => s.setInput);
  const submit = useStore((s) => s.submit);
  const raw = progress.inputs[q.id];
  const result = progress.results[q.id];

  const check = () => {
    let r: CheckResult;
    if (q.type === 'table') r = checkTable((raw as TableAnswer) ?? emptyTableAnswer(q.expected), q);
    else {
      const v = typeof raw === 'string' ? raw : '';
      r = q.type === 'expression' ? checkExpression(v, q) : q.type === 'value' ? checkValue(v, q) : checkRoots(v, q);
    }
    submit(ex, q.id, r);
  };

  const text = typeof raw === 'string' ? raw : '';
  const onText = (v: string) => setInput(ex.uid, q.id, v);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {total > 1 && <span className="mr-1.5 text-slate-400">{String.fromCharCode(97 + index)})</span>}
        <MathText text={q.prompt} />
      </p>
      {q.type === 'expression' && <ExpressionInput value={text} onChange={onText} onSubmit={check} label={q.label} />}
      {q.type === 'value' && <ValueInput value={text} onChange={onText} onSubmit={check} label={q.label} />}
      {q.type === 'roots' && <RootsInput value={text} onChange={onText} onSubmit={check} />}
      {q.type === 'table' && (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clique sur les cases pour faire défiler : signes <b>+ / −</b>, marques <b>0 / ||</b> (valeur interdite), flèches <b>↗ / ↘</b>. Au clavier : + − 0 | ↑ ↓.
          </p>
          <VariationTable
            table={q.expected}
            answer={(raw as TableAnswer) ?? emptyTableAnswer(q.expected)}
            onChange={(a) => setInput(ex.uid, q.id, a)}
            wrongCells={result?.status !== 'correct' ? result?.wrongCells : undefined}
          />
        </>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <button type="button" onClick={check} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
          Vérifier
        </button>
        <div className="min-w-0 flex-1">
          <Feedback r={result} attempts={progress.attempts[q.id] ?? 0} />
        </div>
      </div>
    </div>
  );
}

export interface ExerciseCardProps {
  ex: Exercise;
  number: number;
  allowSolutions: boolean;
  onRegenerate?: () => void;
  onAddSimilar?: () => void;
}

export function ExerciseCard({ ex, number, allowSolutions, onRegenerate, onAddSimilar }: ExerciseCardProps) {
  const inputsEnabled = useStore((s) => s.inputsEnabled);
  const progress = useStore((s) => s.progress[ex.uid]);
  const openSolution = useStore((s) => s.openSolution);
  const showHint = useStore((s) => s.showHint);
  const setManual = useStore((s) => s.setManual);
  const resetProgress = useStore((s) => s.resetProgress);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const result = exerciseResult(ex, progress);

  const toggleSolution = () => {
    if (!solutionOpen) openSolution(ex);
    setSolutionOpen(!solutionOpen);
  };

  const btn = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';

  return (
    <article className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" id={ex.uid}>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold text-slate-900 dark:text-white">Exercice {number}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${THEME_COLORS[ex.theme]}`}>{THEME_LABELS[ex.theme]}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400" title={DIFFICULTY_LABELS[ex.difficulty]}>
          <span className="tracking-tighter text-amber-500">{LEVEL_DOTS(ex.difficulty)}</span> {DIFFICULTY_LABELS[ex.difficulty]}
        </span>
        <span className="text-xs text-slate-400">· {ex.title}</span>
        {result && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${result === 'reussi' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'}`}>
            {result === 'reussi' ? '✔ Réussi' : '✘ À revoir'}
          </span>
        )}
      </header>

      <p className="mb-4 leading-relaxed text-slate-800 dark:text-slate-100">
        <MathText text={ex.statement} />
      </p>

      {inputsEnabled && (
        <div className="mb-4 space-y-5 print:hidden">
          {ex.questions.map((q, i) => (
            <QuestionBlock key={q.id} ex={ex} q={q} index={i} total={ex.questions.length} />
          ))}
        </div>
      )}

      {progress?.hint && !solutionOpen && ex.steps[0] && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">💡 Indice</p>
          <ol>
            <StepItem step={ex.steps[0]} index={0} />
          </ol>
        </div>
      )}

      {solutionOpen && (
        <div className="mb-4">
          <Solution steps={ex.steps} />
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 print:hidden">
        {allowSolutions && (
          <>
            {!progress?.hint && !solutionOpen && (
              <button type="button" onClick={() => showHint(ex.uid)} className={`${btn} text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40`}>
                💡 Indice
              </button>
            )}
            <button type="button" onClick={toggleSolution} className={`${btn} ${solutionOpen ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-100' : 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/40'}`}>
              {solutionOpen ? 'Masquer la correction' : 'Voir la correction'}
            </button>
          </>
        )}
        {!inputsEnabled && (
          <>
            <button type="button" onClick={() => setManual(ex, progress?.manual === 'reussi' ? undefined : 'reussi')} className={`${btn} ${progress?.manual === 'reussi' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40'}`}>
              ✔ Réussi
            </button>
            <button type="button" onClick={() => setManual(ex, progress?.manual === 'rate' ? undefined : 'rate')} className={`${btn} ${progress?.manual === 'rate' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40'}`}>
              ✘ Raté
            </button>
          </>
        )}
        <span className="flex-1" />
        {progress && (
          <button type="button" onClick={() => resetProgress(ex.uid)} className={`${btn} text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800`} title="Effacer mes réponses">
            Recommencer
          </button>
        )}
        {onAddSimilar && (
          <button type="button" onClick={onAddSimilar} className={`${btn} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`} title="Ajouter un exercice du même thème et du même niveau">
            ＋ Similaire
          </button>
        )}
        {onRegenerate && (
          <button type="button" onClick={onRegenerate} className={`${btn} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`} title="Remplacer par un autre exercice">
            🎲 Autre exercice
          </button>
        )}
      </footer>
    </article>
  );
}

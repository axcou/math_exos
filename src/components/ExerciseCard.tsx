import { useState } from 'react';
import { type CheckResult, checkExpression, checkRoots, checkTable, checkValue, emptyTableAnswer, type TableAnswer } from '../checking/check';
import { DIFFICULTY_LABELS, type Exercise, type Question, THEME_LABELS } from '../exercises/types';
import { emptyProgress, exerciseResult, useStore } from '../history/store';
import { ExpressionInput, RootsInput, ValueInput } from './answers/AnswerInputs';
import { MathText } from './Math';
import { Solution, StepItem } from './Solution';
import { VariationTable } from './VariationTable';

const VERDICT: Record<CheckResult['status'], [string, string]> = {
  correct: ['Juste', 'text-ok'],
  partial: ['Presque', 'text-pen'],
  incorrect: ['Faux', 'text-pen'],
  invalid: ['Illisible', 'text-ink-soft'],
};

/** Annotation « au stylo » dans la marge de la réponse. */
function Feedback({ r, attempts }: { r?: CheckResult; attempts: number }) {
  if (!r) return null;
  const [word, color] = VERDICT[r.status];
  return (
    <div className="flex items-baseline gap-3" role="status">
      <span className={`hand shrink-0 text-2xl ${color}`}>{word}</span>
      <span className="flex-1 text-[0.95rem] text-ink-soft">
        <MathText text={r.message ?? ''} />
      </span>
      {attempts > 0 && <span className="shrink-0 font-sans text-xs text-ink-faint">{attempts} essai{attempts > 1 ? 's' : ''}</span>}
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
      <p>
        {total > 1 && <span className="mr-1.5 font-sans font-bold text-chap">{String.fromCharCode(97 + index)}.</span>}
        <MathText text={q.prompt} />
      </p>
      {q.type === 'expression' && <ExpressionInput value={text} onChange={onText} onSubmit={check} label={q.label} />}
      {q.type === 'value' && <ValueInput value={text} onChange={onText} onSubmit={check} label={q.label} />}
      {q.type === 'roots' && <RootsInput value={text} onChange={onText} onSubmit={check} />}
      {q.type === 'table' && (
        <>
          <p className="font-sans text-xs text-ink-faint">Clique sur une case pour faire défiler + et −, 0 et || (valeur interdite), ↗ et ↘. Au clavier : + − 0 | ↑ ↓.</p>
          <VariationTable
            table={q.expected}
            answer={(raw as TableAnswer) ?? emptyTableAnswer(q.expected)}
            onChange={(a) => setInput(ex.uid, q.id, a)}
            wrongCells={result?.status !== 'correct' ? result?.wrongCells : undefined}
          />
        </>
      )}
      <div className="flex flex-wrap items-baseline gap-4 pt-1">
        <button type="button" onClick={check} className="btn">
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
  /** Rappeler le chapitre (feuille mélangée, sans bandeau par chapitre). */
  showTheme?: boolean;
}

/** Pastilles de difficulté, comme dans les manuels. */
function Level({ d }: { d: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Niveau ${DIFFICULTY_LABELS[d as 1 | 2 | 3].toLowerCase()}`} aria-label={`Niveau ${DIFFICULTY_LABELS[d as 1 | 2 | 3].toLowerCase()}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full border border-chap ${i <= d ? 'bg-chap' : ''}`} />
      ))}
    </span>
  );
}

export function ExerciseCard({ ex, number, allowSolutions, onRegenerate, onAddSimilar, showTheme }: ExerciseCardProps) {
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

  return (
    <article className={`chap-${ex.theme} break-inside-avoid border-t border-rule py-6 [&:nth-child(2)]:border-t-0 [&:nth-child(2)]:pt-3`} id={ex.uid} aria-label={`Exercice ${number}`}>
      <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="ex-num">{number}</span>
        <h3 className="font-sans text-[0.95rem] font-bold text-chap">{ex.title}</h3>
        <Level d={ex.difficulty} />
        {showTheme && <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">{THEME_LABELS[ex.theme]}</span>}
        {result && (
          <span className={`hand ml-auto -rotate-3 text-2xl ${result === 'reussi' ? 'text-ok' : 'text-pen'}`}>{result === 'reussi' ? 'Réussi' : 'À revoir'}</span>
        )}
      </header>

      <div className="sm:pl-[2.85rem]">
      <p className="mb-4">
        <MathText text={ex.statement} />
      </p>

      {inputsEnabled && (
        <div className="mb-5 space-y-6 print:hidden">
          {ex.questions.map((q, i) => (
            <QuestionBlock key={q.id} ex={ex} q={q} index={i} total={ex.questions.length} />
          ))}
        </div>
      )}

      {progress?.hint && !solutionOpen && ex.steps[0] && (
        <div className="box dashed mb-5 mt-4">
          <span className="box-tab">Coup de pouce</span>
          <ol>
            <StepItem step={ex.steps[0]} index={0} />
          </ol>
        </div>
      )}

      {solutionOpen && (
        <div className="mb-5 mt-4">
          <Solution steps={ex.steps} />
        </div>
      )}

      <footer className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pt-1 print:hidden">
        {allowSolutions && (
          <>
            {!progress?.hint && !solutionOpen && (
              <button type="button" onClick={() => showHint(ex.uid)} className="btn-link">
                Coup de pouce
              </button>
            )}
            <button type="button" onClick={toggleSolution} className="btn-link font-semibold !text-chap !decoration-chap">
              {solutionOpen ? 'Masquer la correction' : 'Voir la correction'}
            </button>
          </>
        )}
        {!inputsEnabled && (
          <span className="flex items-baseline gap-3 font-sans text-sm">
            <span className="text-ink-faint">Sur papier :</span>
            <button type="button" onClick={() => setManual(ex, progress?.manual === 'reussi' ? undefined : 'reussi')} className={`btn-link ${progress?.manual === 'reussi' ? 'font-semibold !text-ok' : ''}`}>
              réussi
            </button>
            <button type="button" onClick={() => setManual(ex, progress?.manual === 'rate' ? undefined : 'rate')} className={`btn-link ${progress?.manual === 'rate' ? 'font-semibold !text-pen' : ''}`}>
              raté
            </button>
          </span>
        )}
        <span className="flex-1" />
        {progress && (
          <button type="button" onClick={() => resetProgress(ex.uid)} className="btn-link" title="Effacer mes réponses">
            Recommencer
          </button>
        )}
        {onAddSimilar && (
          <button type="button" onClick={onAddSimilar} className="btn-link" title="Ajouter un exercice du même thème et du même niveau">
            Un autre du même genre
          </button>
        )}
        {onRegenerate && (
          <button type="button" onClick={onRegenerate} className="btn-link" title="Remplacer par un autre exercice">
            Changer d’énoncé
          </button>
        )}
      </footer>
      </div>
    </article>
  );
}

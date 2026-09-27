import { useState } from 'react';
import type { Step } from '../exercises/types';
import { FORMULA_BY_ID } from '../formulas/formulas';
import { MathText, Tex } from './Math';
import { VariationTable } from './VariationTable';

export function FormulaChips({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const formulas = ids.map((id) => FORMULA_BY_ID.get(id)).filter((f) => !!f);
  if (!formulas.length) return null;
  const current = open ? FORMULA_BY_ID.get(open) : null;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {formulas.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setOpen(open === f.id ? null : f.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              open === f.id ? 'border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
            }`}
          >
            📘 {f.title}
          </button>
        ))}
      </div>
      {current && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Rappel — {current.title}</p>
          <Tex math={current.latex} display />
          {current.note && <p className="text-xs text-amber-800 dark:text-amber-200">{current.note}</p>}
        </div>
      )}
    </div>
  );
}

export function StepItem({ step, index }: { step: Step; index: number }) {
  return (
    <li className="relative pl-9">
      <span className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
        {index + 1}
      </span>
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        <MathText text={step.title} />
      </p>
      {step.text && (
        <p className="mt-0.5 text-slate-700 dark:text-slate-300">
          <MathText text={step.text} />
        </p>
      )}
      {step.math && <Tex math={step.math} display className="text-slate-900 dark:text-slate-100" />}
      {step.table && (
        <div className="mt-2">
          <VariationTable table={step.table} />
        </div>
      )}
      {step.formulas && <FormulaChips ids={step.formulas} />}
    </li>
  );
}

/** Correction détaillée, affichable d'un coup ou étape par étape. */
export function Solution({ steps }: { steps: Step[] }) {
  const [shown, setShown] = useState(1);
  const all = shown >= steps.length;
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <ol className="space-y-4">
        {steps.slice(0, shown).map((s, i) => (
          <StepItem key={i} step={s} index={i} />
        ))}
      </ol>
      {!all && (
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => setShown(shown + 1)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
            Étape suivante ({shown}/{steps.length})
          </button>
          <button type="button" onClick={() => setShown(steps.length)} className="rounded-lg px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-900/40">
            Tout afficher
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { Step } from '../exercises/types';
import { FORMULA_BY_ID } from '../formulas/formulas';
import { MathText, Tex } from './Math';
import { VariationTable } from './VariationTable';

/** Renvois vers le cours ; un clic ouvre l'encadré « Rappel ». */
export function FormulaChips({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const formulas = ids.map((id) => FORMULA_BY_ID.get(id)).filter((f) => !!f);
  if (!formulas.length) return null;
  const current = open ? FORMULA_BY_ID.get(open) : null;
  return (
    <div className="mt-1">
      <p className="font-sans text-xs text-ink-faint">
        <span className="font-semibold text-chap">Rappel</span>{' '}
        {formulas.map((f, i) => (
          <span key={f.id}>
            {i > 0 && ' · '}
            <button
              type="button"
              onClick={() => setOpen(open === f.id ? null : f.id)}
              aria-expanded={open === f.id}
              className={`underline decoration-dotted underline-offset-2 hover:text-ink ${open === f.id ? 'text-ink decoration-solid' : ''}`}
            >
              {f.title.toLowerCase()}
            </button>
          </span>
        ))}
      </p>
      {current && (
        <div className="box mt-4 max-w-full bg-sheet">
          <span className="box-tab">Rappel · {current.title}</span>
          <Tex math={current.latex} display />
          {current.note && <p className="font-sans text-sm text-ink-soft">{current.note}</p>}
        </div>
      )}
    </div>
  );
}

export function StepItem({ step, index }: { step: Step; index: number }) {
  return (
    <li className="grid grid-cols-[1.6rem_1fr] gap-x-1">
      <span className="font-sans font-bold text-chap">{index + 1}.</span>
      <div className="min-w-0">
        <p className="font-sans font-semibold">
          <MathText text={step.title} />
        </p>
        {step.text && (
          <p>
            <MathText text={step.text} />
          </p>
        )}
        {step.math && <Tex math={step.math} display />}
        {step.table && (
          <div className="mt-2">
            <VariationTable table={step.table} />
          </div>
        )}
        {step.formulas && <FormulaChips ids={step.formulas} />}
      </div>
    </li>
  );
}

/** Corrigé détaillé, affichable d'un coup ou étape par étape. */
export function Solution({ steps }: { steps: Step[] }) {
  const [shown, setShown] = useState(1);
  const all = shown >= steps.length;
  return (
    <div className="box">
      <span className="box-tab">Corrigé</span>
      <ol className="space-y-4">
        {steps.slice(0, shown).map((s, i) => (
          <StepItem key={i} step={s} index={i} />
        ))}
      </ol>
      {!all && (
        <div className="mt-4 flex flex-wrap items-baseline gap-4 pl-6 print:hidden">
          <button type="button" onClick={() => setShown(shown + 1)} className="btn">
            Étape suivante <span className="text-ink-faint">{shown}/{steps.length}</span>
          </button>
          <button type="button" onClick={() => setShown(steps.length)} className="btn-link">
            tout afficher
          </button>
        </div>
      )}
    </div>
  );
}

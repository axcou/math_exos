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
    <div className="mt-1 print:hidden">
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

export interface SolutionSection {
  label: string; // 'a', 'b'… ; vide pour un exercice sans parties
  item?: string; // rappel de la donnée de la partie
  steps: Step[];
}

/** Corrigé détaillé (par partie a, b, c… le cas échéant), affichable d'un coup ou étape par étape. */
export function Solution({ sections }: { sections: SolutionSection[] }) {
  const [shown, setShown] = useState(1);
  const total = sections.reduce((n, s) => n + s.steps.length, 0);
  const all = shown >= total;
  let before = 0;
  return (
    <div className="box">
      <span className="box-tab">Corrigé</span>
      <div className="space-y-6">
        {sections.map((sec) => {
          const start = before;
          before += sec.steps.length;
          const visible = sec.steps.slice(0, Math.max(0, shown - start));
          if (!visible.length) return null;
          return (
            <section key={sec.label || 'unique'}>
              {sec.label && (
                <p className="mb-2 border-b border-chap/30 pb-1">
                  <span className="mr-2 font-sans font-bold text-chap">{sec.label}.</span>
                  {sec.item && <MathText text={sec.item} className="text-ink-soft" />}
                </p>
              )}
              <ol className="space-y-4">
                {visible.map((s, i) => (
                  <StepItem key={i} step={s} index={i} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      {!all && (
        <div className="mt-4 flex flex-wrap items-baseline gap-4 pl-6 print:hidden">
          <button type="button" onClick={() => setShown(shown + 1)} className="btn">
            Étape suivante <span className="text-ink-faint">{shown}/{total}</span>
          </button>
          {sections.length > 1 && (
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                // jusqu'à la fin de la partie en cours
                let acc = 0;
                for (const s of sections) {
                  acc += s.steps.length;
                  if (acc > shown) return setShown(acc);
                }
              }}
            >
              toute cette question
            </button>
          )}
          <button type="button" onClick={() => setShown(total)} className="btn-link">
            tout afficher
          </button>
        </div>
      )}
    </div>
  );
}

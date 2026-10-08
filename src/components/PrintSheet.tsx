import type { Exercise, Question } from '../exercises/types';
import { valueLatex } from '../exercises/limits/templates';
import { texFixed } from '../core/stats/format';
import { MathText, Tex } from './Math';
import { StepItem } from './Solution';
import { VariationTable } from './VariationTable';

/*
 * Éléments visibles seulement à l'impression (PDF) : en-tête de copie et
 * annexe « Réponses » ou « Corrigé » en fin de document.
 */

export type PrintMode = 'sujet' | 'reponses' | 'corrige';

export const PRINT_MODES: { id: PrintMode; label: string; hint: string }[] = [
  { id: 'sujet', label: 'Sujet seul', hint: 'avec de la place pour répondre' },
  { id: 'reponses', label: 'Sujet + réponses', hint: 'les résultats en fin de document' },
  { id: 'corrige', label: 'Sujet + corrigé détaillé', hint: 'toutes les étapes en fin de document' },
];

const Blank = ({ w }: { w: string }) => <span className={`inline-block border-b border-dotted border-ink-faint ${w}`} />;

export function PrintHeader({ title, count }: { title: string; count: number }) {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <header className="mb-6 hidden print:block">
      <div className="flex items-end justify-between border-b-2 border-ink pb-1">
        <h1 className="font-serif text-[17pt] font-semibold leading-tight">{title || 'Feuille d’exercices'}</h1>
        <span className="font-sans text-[8pt] text-ink-faint">
          {count} exercice{count > 1 ? 's' : ''} · {date}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2 font-sans text-[9.5pt]">
        <span className="flex items-baseline gap-2">
          Nom <Blank w="w-44" />
        </span>
        <span className="flex items-baseline gap-2">
          Prénom <Blank w="w-36" />
        </span>
        <span className="flex items-baseline gap-2">
          Classe <Blank w="w-16" />
        </span>
      </div>
    </header>
  );
}

function Answer({ q, marker }: { q: Question; marker: string }) {
  const m = marker && <span className="mr-1.5 font-sans font-bold text-chap">{marker}</span>;
  if (q.type === 'table') {
    return (
      <div className="my-1.5">
        {m}
        <VariationTable table={q.expected} />
      </div>
    );
  }
  if (q.type === 'choice') {
    return (
      <p className="my-0.5">
        {m}
        <MathText text={q.options[q.expected]} />
      </p>
    );
  }
  const latex =
    q.type === 'number'
      ? `${q.label ?? ''} ${texFixed(q.expected, q.decimals)}`
      : q.type === 'expression'
      ? `${q.label ?? ''} ${q.expectedLatex}`
      : q.type === 'value'
        ? `${q.label ?? ''} ${valueLatex(q.expected)}`
        : q.expectedLatex.length
          ? `x \\in \\left\\{${q.expectedLatex.join(' \\,;\\, ')}\\right\\}`
          : '\\text{aucune solution}';
  return (
    <p className="my-0.5">
      {m}
      <Tex math={latex} />
    </p>
  );
}

export function PrintAppendix({ exercises, mode }: { exercises: Exercise[]; mode: PrintMode }) {
  if (mode === 'sujet' || !exercises.length) return null;
  return (
    <section className="print-appendix hidden text-[9.5pt] print:block [&_ol]:space-y-1.5">
      <div className="chap-band mb-4" style={{ ['--chap' as string]: 'var(--ink)' }}>
        <span className="chap-tab">{mode === 'corrige' ? 'Corrigé' : 'Réponses'}</span>
      </div>
      {exercises.map((ex, i) => (
        <div key={ex.uid} className={`chap-${ex.theme} mb-5 ${mode === 'reponses' ? 'break-inside-avoid' : ''}`}>
          <p className="mb-1.5 flex items-center gap-2 break-after-avoid">
            <span className="ex-num">{i + 1}</span>
            <span className="font-sans font-bold text-chap">{ex.title}</span>
          </p>
          <div className="space-y-2 pl-[2.6rem]">
            {ex.parts.map((p) => (
              <div key={p.label || 'unique'} className="break-inside-avoid">
                {p.label && mode === 'corrige' && (
                  <p className="mb-1 border-b border-chap/30 pb-0.5">
                    <span className="mr-2 font-sans font-bold text-chap">{p.label}.</span>
                    <MathText text={p.item} className="text-ink-soft" />
                  </p>
                )}
                {mode === 'reponses' ? (
                  p.questions.map((q, k) => (
                    <Answer key={q.id} q={q} marker={p.label ? (k === 0 ? `${p.label}.` : '') : p.questions.length > 1 ? `${String.fromCharCode(97 + k)}.` : ''} />
                  ))
                ) : (
                  <ol className="space-y-2.5">
                    {p.steps.map((s, k) => (
                      <StepItem key={k} step={s} index={k} />
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

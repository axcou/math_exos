import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { type Exercise, THEME_LABELS, type Theme } from '../exercises/types';
import { type CurrentSheet, exerciseResult, useStore } from '../history/store';
import type { SheetConfig } from '../sheet/sheetConfig';
import { ExerciseCard } from './ExerciseCard';
import { FloatingToc, type TocSection } from './FloatingToc';
import { PRINT_MODES, PrintAppendix, PrintHeader, type PrintMode } from './PrintSheet';
import { ShareDialog } from './ShareDialog';

/** Menu « imprimer » : sujet seul, avec les réponses, ou avec le corrigé détaillé. */
function PrintMenu({ onPrint }: { onPrint: (m: PrintMode) => void }) {
  const [open, setOpen] = useState(false);
  const columns = useStore((s) => s.printColumns);
  const setColumns = useStore((s) => s.setPrintColumns);
  return (
    <span className="relative">
      <button type="button" className="btn-link" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        imprimer / PDF
      </button>
      {open && (
        <span role="menu" className="panel absolute left-0 top-full z-30 mt-1 flex w-72 flex-col p-1 shadow-[4px_4px_0_var(--rule)]">
          <label className="flex items-center gap-2 border-b border-rule px-3 py-2 font-sans text-sm">
            <input type="checkbox" checked={columns === 2} onChange={(e) => setColumns(e.target.checked ? 2 : 1)} className="accent-[var(--ink)]" />
            Deux colonnes
          </label>
          {PRINT_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitem"
              className="rounded px-3 py-2 text-left hover:bg-paper"
              onClick={() => {
                setOpen(false);
                onPrint(m.id);
              }}
            >
              <span className="block font-sans text-sm font-semibold">{m.label}</span>
              <span className="block font-sans text-xs text-ink-faint">{m.hint}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function ScoreBar({ exercises }: { exercises: Exercise[] }) {
  const progress = useStore((s) => s.progress);
  const results = exercises.map((e) => exerciseResult(e, progress[e.uid]));
  const ok = results.filter((r) => r === 'reussi').length;
  const ko = results.filter((r) => r === 'rate').length;
  const n = exercises.length || 1;
  return (
    <div className="flex items-baseline gap-3" aria-label={`${ok} réussis, ${ko} à revoir sur ${exercises.length}`}>
      <span className="hand text-3xl text-pen">
        {ok}
        <span className="text-2xl">/{exercises.length}</span>
      </span>
      <span className="font-sans text-xs text-ink-faint">
        réussi{ok > 1 ? 's' : ''}
        {ko ? `, ${ko} à revoir` : ''}
        {n - ok - ko > 0 ? `, ${n - ok - ko} à faire` : ''}
      </span>
    </div>
  );
}

interface Props {
  exercises: Exercise[];
  sheet: CurrentSheet | null;
  /** Boutons propres à la page, en tête de la barre d'outils. */
  controls: ReactNode;
  /** Panneau sous la barre d'outils (réglages de la feuille). */
  panel?: ReactNode;
  /** Affiché quand la feuille est vide (et le panneau fermé). */
  empty?: ReactNode;
  /** Bandeau au-dessus de tout (feuille partagée…). */
  banner?: ReactNode;
  onRegenerate?: (ex: Exercise) => void;
  onAddSimilar?: (ex: Exercise) => void;
  /** Composition partageable (« même genre de feuille ») ; absente : partage de la feuille exacte seulement. */
  shareConfig?: SheetConfig;
}

/**
 * Une feuille d'exercices : barre d'outils (partage, impression, saisie,
 * score), cartes regroupées par chapitre, en-tête et annexe d'impression.
 */
export function SheetView({ exercises, sheet, controls, panel, empty, banner, onRegenerate, onAddSimilar, shareConfig }: Props) {
  const { inputsEnabled, printColumns, setInputsEnabled } = useStore();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('sujet');

  // Le corrigé imprimé n'existe que le temps de l'impression
  useEffect(() => {
    const reset = () => setPrintMode('sujet');
    window.addEventListener('afterprint', reset);
    return () => window.removeEventListener('afterprint', reset);
  }, []);
  const print = (m: PrintMode) => {
    setPrintMode(m);
    // laisser React afficher l'annexe avant d'ouvrir la boîte d'impression
    setTimeout(() => window.print(), 60);
  };

  // Un bandeau par chapitre si les thèmes sont regroupés, sinon une seule page « mélangée »
  const groups: { theme: Theme; items: Exercise[] }[] = [];
  for (const e of exercises) {
    const last = groups[groups.length - 1];
    if (last && last.theme === e.theme) last.items.push(e);
    else groups.push({ theme: e.theme, items: [e] });
  }
  const byChapter = !sheet?.mixed && groups.length === new Set(exercises.map((e) => e.theme)).size;
  const shared = sheet?.source === 'shared';
  const sections = byChapter ? groups : exercises.length ? [{ theme: null, items: exercises }] : [];
  const sectionId = (gi: number) => `feuille-partie-${gi + 1}`;
  let tocNumber = 0;
  const toc: TocSection[] = sections.map((g, gi) => ({
    id: sectionId(gi),
    title: g.theme ? THEME_LABELS[g.theme] : 'Exercices',
    chap: g.theme ?? undefined,
    children: g.items.map((ex) => ({ id: ex.uid, title: `${++tocNumber}. ${ex.title}` })),
  }));
  let number = 0;

  return (
    <div className={`space-y-6 ${printColumns === 2 ? 'print-cols-2' : ''}`}>
      {banner}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 print:hidden">
        {controls}
        {exercises.length > 0 && (
          <>
            <button type="button" className="btn-link" onClick={() => setSharing(true)}>
              partager
            </button>
            <PrintMenu onPrint={print} />
          </>
        )}
        <label className="flex items-center gap-1.5 font-sans text-sm text-ink-soft">
          <input type="checkbox" checked={inputsEnabled} onChange={(e) => setInputsEnabled(e.target.checked)} className="accent-[var(--ink)]" />
          répondre à l’écran
        </label>
        <span className="flex-1" />
        {exercises.length > 0 && <ScoreBar exercises={exercises} />}
      </div>

      {panel && <div className="print:hidden">{panel}</div>}

      {sheet?.title && <h1 className="font-serif text-3xl font-semibold print:hidden">{sheet.title}</h1>}
      <PrintHeader title={sheet?.title ?? ''} count={exercises.length} />

      {exercises.length === 0 && !panel && empty}

      <FloatingToc sections={toc} label="Exercices" />
      {sections.map((g, gi) => (
        <section key={gi} id={sectionId(gi)} className={`page scroll-mt-6 ${g.theme ? `chap-${g.theme}` : ''}`}>
          <div className="chap-band mb-2">
            <span className="chap-tab">{g.theme ? THEME_LABELS[g.theme] : 'Exercices'}</span>
            <span className="ml-auto self-end pb-1 text-[0.7rem] font-semibold uppercase tracking-widest text-ink-faint">
              {g.items.length} exercice{g.items.length > 1 ? 's' : ''}
            </span>
          </div>
          {g.items.map((ex) => (
            <ExerciseCard
              key={ex.uid}
              ex={ex}
              number={++number}
              showTheme={!g.theme}
              allowSolutions={sheet?.showSolutions ?? true}
              allowRetry={sheet?.allowRetry ?? true}
              singleAttempt={sheet?.singleAttempt ?? false}
              onRegenerate={shared || !onRegenerate ? undefined : () => onRegenerate(ex)}
              onAddSimilar={shared || !onAddSimilar ? undefined : () => onAddSimilar(ex)}
            />
          ))}
        </section>
      ))}

      <PrintAppendix exercises={exercises} mode={printMode} />

      {sharing && <ShareDialog exercises={exercises} config={shareConfig} initialTitle={sheet?.title ?? ''} initial={sheet ?? undefined} onClose={() => setSharing(false)} />}
      {exercises.length > 0 && (
        <p className="pt-2 text-center print:hidden">
          <button type="button" className="btn-link" onClick={() => navigate('/historique')}>
            voir mon historique
          </button>
        </p>
      )}
    </div>
  );
}

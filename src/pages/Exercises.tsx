import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ExerciseCard } from '../components/ExerciseCard';
import { SheetBuilder } from '../components/SheetBuilder';
import { ShareDialog } from '../components/ShareDialog';
import { exerciseFromRef } from '../exercises/registry';
import { type DifficultyChoice, type Exercise, THEME_LABELS, THEMES, type Theme } from '../exercises/types';
import { exerciseResult, pastExercises, useStore } from '../history/store';
import { buildSheet, replacementFor } from '../sheet/buildSheet';
import { only, type SheetConfig } from '../sheet/sheetConfig';

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

/** Composition déduite d'une feuille (pour « Générer une feuille similaire »). */
function configFromSheet(exercises: Exercise[], base: SheetConfig): SheetConfig {
  const items = base.items.map((item) => {
    const mine = exercises.filter((e) => e.theme === item.theme);
    const levels = new Set(mine.map((e) => e.difficulty));
    const difficulty: DifficultyChoice = levels.size === 1 ? [...levels][0] : 'mixte';
    return { ...item, enabled: mine.length > 0, count: Math.max(1, mine.length), difficulty, parts: Math.max(1, ...mine.map((e) => e.parts.length)), subtypes: [] };
  });
  return { ...base, items };
}

export default function Exercises() {
  const { config, sheet, history, inputsEnabled, setConfig, setSheet, replaceInSheet, appendToSheet, setInputsEnabled } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(!sheet);
  const [sharing, setSharing] = useState(false);

  const exercises = useMemo(() => (sheet?.refs ?? []).map((r) => exerciseFromRef(r.code, r.seed, r.parts)).filter((e): e is Exercise => !!e), [sheet?.refs]);

  const generate = (c: SheetConfig = config) => {
    const exs = buildSheet(c, pastExercises(useStore.getState().history));
    setSheet(exs, { mixed: c.order === 'shuffled' });
    setBuilderOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Accès direct depuis l'accueil : #/exercices?theme=derivee
  useEffect(() => {
    const theme = params.get('theme') as Theme | null;
    if (theme && THEMES.includes(theme)) {
      const item = config.items.find((i) => i.theme === theme)!;
      const c = only(config, { [theme]: Math.max(item.count, 5) });
      setConfig(c);
      generate(c);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const subtypesFor = (ex: Exercise) => config.items.find((i) => i.theme === ex.theme)?.subtypes ?? [];
  const regenerate = (ex: Exercise) => replaceInSheet(ex.uid, replacementFor(ex, exercises, pastExercises(history), subtypesFor(ex)));
  const addSimilar = (ex: Exercise) => appendToSheet(replacementFor(ex, exercises, pastExercises(history), subtypesFor(ex)), ex.uid);

  // Titres de section seulement si les thèmes sont regroupés
  const groups: { theme: Theme; items: Exercise[] }[] = [];
  for (const e of exercises) {
    const last = groups[groups.length - 1];
    if (last && last.theme === e.theme) last.items.push(e);
    else groups.push({ theme: e.theme, items: [e] });
  }
  // Un bandeau par chapitre si les thèmes sont regroupés, sinon une seule page « mélangée »
  const byChapter = !sheet?.mixed && groups.length === new Set(exercises.map((e) => e.theme)).size;
  let number = 0;


  return (
    <div className="space-y-6">
      {sheet?.source === 'shared' && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-y border-rule py-3 text-[0.95rem] print:hidden">
          <span>
            <span className="label mr-2">Feuille partagée</span>
            {sheet.title && <b>{sheet.title}</b>}
            {!sheet.showSolutions && <span className="text-ink-soft"> · sans corrigé</span>}
            {sheet.singleAttempt && <span className="text-ink-soft"> · une seule vérification par question</span>}
            {sheet.allowRetry === false && <span className="text-ink-soft"> · pas de nouvel essai</span>}
            {sheet.skipped ? (
              <span className="text-pen">
                {' '}
                · {sheet.skipped} exercice{sheet.skipped > 1 ? 's' : ''} n’ont pas pu être chargés (lien d’une ancienne version ?)
              </span>
            ) : null}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              const c = configFromSheet(exercises, config);
              setConfig(c);
              generate(c);
            }}
          >
            générer une feuille du même genre
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 print:hidden">
        <button type="button" className="btn" onClick={() => setBuilderOpen(!builderOpen)} aria-expanded={builderOpen}>
          {builderOpen ? 'Fermer les réglages' : 'Réglages de la feuille'}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => generate()} title="Nouvelle feuille avec les mêmes réglages">
          Nouvelle feuille
        </button>
        {exercises.length > 0 && (
          <>
            <button type="button" className="btn-link" onClick={() => setSharing(true)}>
              partager
            </button>
            <button type="button" className="btn-link" onClick={() => window.print()}>
              imprimer
            </button>
          </>
        )}
        <label className="flex items-center gap-1.5 font-sans text-sm text-ink-soft">
          <input type="checkbox" checked={inputsEnabled} onChange={(e) => setInputsEnabled(e.target.checked)} className="accent-[var(--ink)]" />
          répondre à l’écran
        </label>
        <span className="flex-1" />
        {exercises.length > 0 && <ScoreBar exercises={exercises} />}
      </div>

      {builderOpen && (
        <div className="print:hidden">
          <SheetBuilder config={config} onChange={setConfig} onGenerate={() => generate()} />
        </div>
      )}

      {sheet?.title && <h1 className="font-serif text-3xl font-semibold">{sheet.title}</h1>}

      {exercises.length === 0 && !builderOpen && (
        <div className="py-16 text-center">
          <p className="mb-4 text-ink-soft">Pas encore de feuille.</p>
          <button type="button" onClick={() => generate()} className="btn btn-primary">
            Générer une feuille
          </button>
        </div>
      )}

      {(byChapter ? groups : exercises.length ? [{ theme: null, items: exercises }] : []).map((g, gi) => (
        <section key={gi} className={`page ${g.theme ? `chap-${g.theme}` : ''}`}>
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
              onRegenerate={sheet?.source === 'shared' ? undefined : () => regenerate(ex)}
              onAddSimilar={sheet?.source === 'shared' ? undefined : () => addSimilar(ex)}
            />
          ))}
        </section>
      ))}

      {sharing && <ShareDialog exercises={exercises} config={config} initialTitle={sheet?.title ?? ''} initial={sheet ?? undefined} onClose={() => setSharing(false)} />}
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

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SheetBuilder } from '../components/SheetBuilder';
import { SheetView } from '../components/SheetView';
import { exerciseFromRef } from '../exercises/registry';
import { type DifficultyChoice, type Exercise, THEMES, type Theme } from '../exercises/types';
import { pastExercises, useStore } from '../history/store';
import { buildSheet, replacementFor } from '../sheet/buildSheet';
import { only, type SheetConfig } from '../sheet/sheetConfig';

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
  const { config, sheet, history, setConfig, setSheet, replaceInSheet, appendToSheet } = useStore();
  const [params, setParams] = useSearchParams();
  const [builderOpen, setBuilderOpen] = useState(!sheet);

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

  const banner = sheet?.source === 'shared' && (
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
  );

  return (
    <SheetView
      exercises={exercises}
      sheet={sheet}
      banner={banner}
      shareConfig={config}
      controls={
        <>
          <button type="button" className="btn" onClick={() => setBuilderOpen(!builderOpen)} aria-expanded={builderOpen}>
            {builderOpen ? 'Fermer les réglages' : 'Réglages de la feuille'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => generate()} title="Nouvelle feuille avec les mêmes réglages">
            Nouvelle feuille
          </button>
        </>
      }
      panel={builderOpen && <SheetBuilder config={config} onChange={setConfig} onGenerate={() => generate()} />}
      empty={
        <div className="py-16 text-center">
          <p className="mb-4 text-ink-soft">Pas encore de feuille.</p>
          <button type="button" onClick={() => generate()} className="btn btn-primary">
            Générer une feuille
          </button>
        </div>
      }
      onRegenerate={(ex) => replaceInSheet(ex.uid, replacementFor(ex, exercises, pastExercises(history), subtypesFor(ex)))}
      onAddSimilar={(ex) => appendToSheet(replacementFor(ex, exercises, pastExercises(history), subtypesFor(ex)), ex.uid)}
    />
  );
}

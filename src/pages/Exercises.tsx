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
    <div className="flex min-w-56 flex-1 items-center gap-3">
      <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label={`${ok} réussis, ${ko} à revoir sur ${exercises.length}`}>
        <div className="bg-emerald-500 transition-all" style={{ width: `${(ok / n) * 100}%` }} />
        <div className="bg-rose-400 transition-all" style={{ width: `${(ko / n) * 100}%` }} />
      </div>
      <span className="shrink-0 text-sm font-medium">
        {ok}/{exercises.length} réussi{ok > 1 ? 's' : ''}
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
    return { ...item, enabled: mine.length > 0, count: Math.max(1, mine.length), difficulty, subtypes: [] };
  });
  return { ...base, items };
}

export default function Exercises() {
  const { config, sheet, history, inputsEnabled, setConfig, setSheet, replaceInSheet, appendToSheet, setInputsEnabled } = useStore();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [builderOpen, setBuilderOpen] = useState(!sheet);
  const [sharing, setSharing] = useState(false);

  const exercises = useMemo(() => (sheet?.refs ?? []).map((r) => exerciseFromRef(r.code, r.seed)).filter((e): e is Exercise => !!e), [sheet?.refs]);

  const generate = (c: SheetConfig = config) => {
    const exs = buildSheet(c, pastExercises(useStore.getState().history));
    setSheet(exs);
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
  const grouped = groups.length === new Set(exercises.map((e) => e.theme)).size && groups.length > 1;
  let number = 0;

  const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800';

  return (
    <div className="space-y-5">
      {sheet?.source === 'shared' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/40 print:hidden">
          <span>
            🔗 Feuille partagée{sheet.title ? <> : <b>{sheet.title}</b></> : ''}
            {!sheet.showSolutions && ' — corrections désactivées'}
            {sheet.skipped ? ` — ${sheet.skipped} exercice${sheet.skipped > 1 ? 's' : ''} n’ont pas pu être chargés (lien d’une ancienne version ?)` : ''}
          </span>
          <span className="flex-1" />
          <button type="button" className={btn} onClick={() => { const c = configFromSheet(exercises, config); setConfig(c); generate(c); }}>
            Générer une feuille similaire
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" className={btn} onClick={() => setBuilderOpen(!builderOpen)} aria-expanded={builderOpen}>
          {builderOpen ? '▾' : '▸'} Composer
        </button>
        <button type="button" className={btn} onClick={() => generate()} title="Nouvelle feuille avec la composition actuelle">
          🎲 Nouvelle feuille
        </button>
        {exercises.length > 0 && (
          <>
            <button type="button" className={btn} onClick={() => setSharing(true)}>
              🔗 Partager
            </button>
            <button type="button" className={btn} onClick={() => window.print()}>
              🖨 Imprimer
            </button>
          </>
        )}
        <label className="ml-1 flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={inputsEnabled} onChange={(e) => setInputsEnabled(e.target.checked)} className="accent-indigo-600" />
          Saisie des réponses
        </label>
        {exercises.length > 0 && <ScoreBar exercises={exercises} />}
      </div>

      {builderOpen && (
        <div className="print:hidden">
          <SheetBuilder config={config} onChange={setConfig} onGenerate={() => generate()} />
        </div>
      )}

      {sheet?.title && <h1 className="text-2xl font-bold">{sheet.title}</h1>}

      {exercises.length === 0 && !builderOpen && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <p className="mb-3 text-slate-600 dark:text-slate-300">Aucune feuille pour l’instant.</p>
          <button type="button" onClick={() => generate()} className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700">
            Générer une feuille
          </button>
        </div>
      )}

      {groups.map((g, gi) => (
        <section key={gi} className="space-y-4">
          {grouped && (
            <h2 className="flex items-center gap-2 pt-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {THEME_LABELS[g.theme]} <span className="font-normal">({g.items.length})</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </h2>
          )}
          {g.items.map((ex) => (
            <ExerciseCard
              key={ex.uid}
              ex={ex}
              number={++number}
              allowSolutions={sheet?.showSolutions ?? true}
              onRegenerate={sheet?.source === 'shared' ? undefined : () => regenerate(ex)}
              onAddSimilar={sheet?.source === 'shared' ? undefined : () => addSimilar(ex)}
            />
          ))}
        </section>
      ))}

      {sharing && <ShareDialog exercises={exercises} config={config} initialTitle={sheet?.title ?? ''} onClose={() => setSharing(false)} />}
      {exercises.length > 0 && (
        <p className="pt-4 text-center text-xs text-slate-400 print:hidden">
          <button type="button" className="hover:underline" onClick={() => navigate('/historique')}>
            Voir mon historique et mes statistiques →
          </button>
        </p>
      )}
    </div>
  );
}

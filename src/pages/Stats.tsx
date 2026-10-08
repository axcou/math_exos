import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MathText, Tex } from '../components/Math';
import { SheetView } from '../components/SheetView';
import { exerciseFromRef, SUBTYPE_LABELS, subtypesOf, templatesFor } from '../exercises/registry';
import { DIFFICULTY_LABELS, type DifficultyChoice, type Exercise } from '../exercises/types';
import { FORMULA_BY_ID } from '../formulas/formulas';
import { pastExercises, type StatConfig, useStore } from '../history/store';
import { METHODS } from '../methods/methods';
import { buildSheet, replacementFor } from '../sheet/buildSheet';
import type { SheetConfig } from '../sheet/sheetConfig';

const MAX_STAT = 10;

/** Composition équivalente pour le générateur de feuilles. */
const toSheetConfig = (c: StatConfig): SheetConfig => ({
  items: [{ theme: 'stat', enabled: true, count: c.count, difficulty: c.difficulty, parts: 1, subtypes: c.subtypes }],
  order: 'grouped',
});

/** Rappels de cours : une ligne par famille de tests, avec sa formule clé et un lien vers la méthode. */
function Course({ open }: { open: boolean }) {
  const methods = METHODS.filter((m) => m.theme === 'stat');
  return (
    <details className="box group print:hidden" open={open}>
      <summary className="box-tab cursor-pointer list-none">Rappels de cours</summary>
      <ul className="space-y-4">
        {methods.map((m) => {
          const f = m.formulas?.map((id) => FORMULA_BY_ID.get(id)).find((x) => x && x.id !== 's.pvalue') ?? FORMULA_BY_ID.get(m.formulas?.[0] ?? '');
          return (
            <li key={m.id} className="border-b border-rule pb-3 last:border-0 last:pb-0">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-sans font-semibold text-chap">{m.title}</span>
                <Link to={`/methodes?m=${m.id}`} className="btn-link text-sm">
                  la méthode
                </Link>
              </p>
              <p className="text-[0.95rem] text-ink-soft">
                <MathText text={m.when} />
              </p>
              {f && <Tex math={f.latex} display />}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function StatBuilder({ config, onChange, onGenerate }: { config: StatConfig; onChange: (c: StatConfig) => void; onGenerate: () => void }) {
  const subtypes = subtypesOf('stat');
  const all = config.subtypes.length === 0;
  const toggle = (s: string) => {
    const current = all ? subtypes : config.subtypes;
    const next = current.includes(s) ? current.filter((x) => x !== s) : [...current, s];
    onChange({ ...config, subtypes: next.length === subtypes.length ? [] : next });
  };
  const levels = new Set(templatesFor('stat', undefined, config.subtypes).map((t) => t.difficulty));
  return (
    <div className="panel space-y-5 p-5" aria-label="Réglages des tests">
      <fieldset>
        <legend className="label mb-2">Tests à travailler</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {subtypes.map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input type="checkbox" checked={all || config.subtypes.includes(s)} onChange={() => toggle(s)} className="accent-[var(--ink)]" />
              {SUBTYPE_LABELS[s] ?? s}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-end gap-6 font-sans text-sm">
        <label className="flex flex-col gap-1">
          <span className="label">Nombre d’exercices</span>
          <select className="select" value={config.count} onChange={(e) => onChange({ ...config, count: Number(e.target.value) })} aria-label="Nombre d’exercices de tests">
            {Array.from({ length: MAX_STAT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Niveau</span>
          <select
            className="select"
            value={String(config.difficulty)}
            onChange={(e) => onChange({ ...config, difficulty: (e.target.value === 'mixte' ? 'mixte' : Number(e.target.value)) as DifficultyChoice })}
            aria-label="Niveau des tests"
          >
            <option value="mixte">Mélangé</option>
            {([1, 2, 3] as const).map((d) => (
              <option key={d} value={d} disabled={!levels.has(d)}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <span className="flex-1" />
        <button type="button" className="btn btn-primary" onClick={onGenerate}>
          Générer la feuille
        </button>
      </div>
    </div>
  );
}

export default function Stats() {
  const { statConfig, statSheet, history, setStatConfig, setSheet, replaceInSheet, appendToSheet } = useStore();
  const [builderOpen, setBuilderOpen] = useState(!statSheet);

  const exercises = useMemo(() => (statSheet?.refs ?? []).map((r) => exerciseFromRef(r.code, r.seed, r.parts)).filter((e): e is Exercise => !!e), [statSheet?.refs]);

  const generate = () => {
    setSheet(buildSheet(toSheetConfig(statConfig), pastExercises(useStore.getState().history)), {}, 'stat');
    setBuilderOpen(false);
  };
  const replacement = (ex: Exercise) => replacementFor(ex, exercises, pastExercises(history), statConfig.subtypes);

  return (
    <div className="chap-stat space-y-8">
      <header className="border-b border-rule pb-4 print:hidden">
        <h1 className="font-serif text-3xl font-semibold">Tests statistiques</h1>
        <p className="mt-1 text-ink-soft">
          Hypothèses, statistique de test, p-valeur et décision. Les données de chaque exercice sont tirées au hasard. Le corrigé détaille les calculs et donne le code R (opérations de base et fonctions de
          répartition).
        </p>
      </header>

      <Course open={!statSheet} />

      <SheetView
        exercises={exercises}
        sheet={statSheet}
        controls={
          <>
            <button type="button" className="btn" onClick={() => setBuilderOpen(!builderOpen)} aria-expanded={builderOpen}>
              {builderOpen ? 'Fermer les réglages' : 'Réglages des tests'}
            </button>
            <button type="button" className="btn btn-primary" onClick={generate} title="Nouvelle feuille avec les mêmes réglages">
              Nouvelle feuille
            </button>
          </>
        }
        panel={builderOpen && <StatBuilder config={statConfig} onChange={setStatConfig} onGenerate={generate} />}
        empty={
          <div className="py-12 text-center">
            <p className="mb-4 text-ink-soft">Pas encore d’exercices.</p>
            <button type="button" onClick={generate} className="btn btn-primary">
              Générer des exercices
            </button>
          </div>
        }
        onRegenerate={(ex) => replaceInSheet(ex.uid, replacement(ex), 'stat')}
        onAddSimilar={(ex) => appendToSheet(replacement(ex), ex.uid, 'stat')}
      />
    </div>
  );
}


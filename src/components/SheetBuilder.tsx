import { useState } from 'react';
import { SUBTYPE_LABELS, subtypesOf, templatesFor } from '../exercises/registry';
import { DIFFICULTY_LABELS, type DifficultyChoice, THEME_LABELS } from '../exercises/types';
import { MAX_PER_THEME, MAX_TOTAL, PRESETS, type SheetConfig, type SheetItem, totalCount } from '../sheet/sheetConfig';

interface Props {
  config: SheetConfig;
  onChange: (c: SheetConfig) => void;
  onGenerate: () => void;
}

const DIFFS: DifficultyChoice[] = [1, 2, 3, 'mixte'];

function ItemRow({ item, onChange }: { item: SheetItem; onChange: (i: SheetItem) => void }) {
  const [showTypes, setShowTypes] = useState(item.subtypes.length > 0);
  const subtypes = subtypesOf(item.theme);
  const level = item.difficulty === 'mixte' ? undefined : item.difficulty;
  const available = new Set(templatesFor(item.theme, level).map((t) => t.subtype));
  const toggleSub = (s: string) => {
    const all = item.subtypes.length === 0 ? subtypes : item.subtypes;
    const next = all.includes(s) ? all.filter((x) => x !== s) : [...all, s];
    onChange({ ...item, subtypes: next.length === subtypes.length ? [] : next });
  };
  const isOn = (s: string) => item.subtypes.length === 0 || item.subtypes.includes(s);

  return (
    <div className={`rounded-xl border p-3 transition-colors ${item.enabled ? 'border-indigo-200 bg-white dark:border-indigo-900 dark:bg-slate-900' : 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900/40'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-44 cursor-pointer items-center gap-2 font-semibold">
          <input type="checkbox" checked={item.enabled} onChange={(e) => onChange({ ...item, enabled: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
          {THEME_LABELS[item.theme]}
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          Nombre
          <input
            type="number"
            min={1}
            max={MAX_PER_THEME}
            value={item.count}
            disabled={!item.enabled}
            onChange={(e) => onChange({ ...item, count: Math.max(1, Math.min(MAX_PER_THEME, Number(e.target.value) || 1)) })}
            className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm dark:border-slate-600" role="radiogroup" aria-label="Niveau">
          {DIFFS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!item.enabled}
              role="radio"
              aria-checked={item.difficulty === d}
              onClick={() => onChange({ ...item, difficulty: d })}
              className={`px-2.5 py-1 ${item.difficulty === d ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {d === 'mixte' ? 'Mélangé' : DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
        <button type="button" disabled={!item.enabled} onClick={() => setShowTypes(!showTypes)} className="text-sm text-indigo-700 hover:underline disabled:opacity-50 dark:text-indigo-300">
          ⚙ Types{item.subtypes.length ? ` (${item.subtypes.length})` : ''}
        </button>
      </div>
      {showTypes && item.enabled && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {subtypes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSub(s)}
              title={available.has(s) ? undefined : 'Aucun exercice de ce type à ce niveau'}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${isOn(s) ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200' : 'border-slate-200 text-slate-500 dark:border-slate-700'} ${available.has(s) ? '' : 'opacity-50'}`}
            >
              {isOn(s) ? '✓ ' : ''}
              {SUBTYPE_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SheetBuilder({ config, onChange, onGenerate }: Props) {
  const total = totalCount(config);
  const tooMany = total > MAX_TOTAL;
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-lg font-bold">Composer ma feuille</h2>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => onChange(p.config(config))} className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800">
            {p.label}
          </button>
        ))}
      </div>
      {config.items.map((item, i) => (
        <ItemRow key={item.theme} item={item} onChange={(it) => onChange({ ...config, items: config.items.map((x, k) => (k === i ? it : x)) })} />
      ))}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          Ordre :
          <label className="flex items-center gap-1">
            <input type="radio" checked={config.order === 'grouped'} onChange={() => onChange({ ...config, order: 'grouped' })} className="accent-indigo-600" /> regroupé par thème
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={config.order === 'shuffled'} onChange={() => onChange({ ...config, order: 'shuffled' })} className="accent-indigo-600" /> mélangé
          </label>
        </div>
        <span className="flex-1" />
        <span className={`text-sm ${tooMany ? 'text-rose-600' : 'text-slate-500'}`}>
          {total} exercice{total > 1 ? 's' : ''}
          {tooMany ? ` (max ${MAX_TOTAL})` : ''}
        </span>
        <button
          type="button"
          onClick={onGenerate}
          disabled={total === 0 || tooMany}
          className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Générer 🎲
        </button>
      </div>
    </section>
  );
}

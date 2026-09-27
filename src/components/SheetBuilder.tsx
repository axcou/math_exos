import { useState } from 'react';
import { SUBTYPE_LABELS, subtypesOf, templatesFor } from '../exercises/registry';
import { DIFFICULTY_LABELS, type DifficultyChoice, MAX_PARTS, THEME_LABELS } from '../exercises/types';
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
    <div className={`border-b border-rule py-3 ${item.enabled ? '' : 'text-ink-faint'}`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex min-w-48 cursor-pointer items-center gap-2.5 font-serif text-lg font-semibold">
          <input type="checkbox" checked={item.enabled} onChange={(e) => onChange({ ...item, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--ink)]" />
          {THEME_LABELS[item.theme]}
        </label>
        <label className="flex items-baseline gap-2 font-sans text-sm">
          <input
            type="number"
            min={1}
            max={MAX_PER_THEME}
            value={item.count}
            disabled={!item.enabled}
            onChange={(e) => onChange({ ...item, count: Math.max(1, Math.min(MAX_PER_THEME, Number(e.target.value) || 1)) })}
            className="field w-14 text-center"
            aria-label={`Nombre d’exercices de ${THEME_LABELS[item.theme]}`}
          />
          exercices
        </label>
        <label className="flex items-baseline gap-2 font-sans text-sm">
          de
          <select
            value={item.parts ?? 1}
            disabled={!item.enabled}
            onChange={(e) => onChange({ ...item, parts: Number(e.target.value) })}
            className="select"
            aria-label={`Questions par exercice de ${THEME_LABELS[item.theme]}`}
          >
            {Array.from({ length: MAX_PARTS }, (_, k) => k + 1).map((k) => (
              <option key={k} value={k}>
                {k === 1 ? '1 question' : `${k} questions (a${k > 2 ? ', b' : ''}${k > 3 ? ', c' : ''}, ${'abcd'[k - 1]})`}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-baseline gap-3 font-sans text-sm" role="radiogroup" aria-label="Niveau">
          {DIFFS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!item.enabled}
              role="radio"
              aria-checked={item.difficulty === d}
              onClick={() => onChange({ ...item, difficulty: d })}
              className={`underline-offset-[5px] disabled:opacity-50 ${item.difficulty === d ? 'text-ink underline decoration-pen decoration-2' : 'text-ink-soft hover:text-ink'}`}
            >
              {d === 'mixte' ? 'mélangé' : DIFFICULTY_LABELS[d].toLowerCase()}
            </button>
          ))}
        </div>
        <button type="button" disabled={!item.enabled} onClick={() => setShowTypes(!showTypes)} className="btn-link ml-auto disabled:opacity-50" aria-expanded={showTypes}>
          {item.subtypes.length ? `${item.subtypes.length} type${item.subtypes.length > 1 ? 's' : ''} choisi${item.subtypes.length > 1 ? 's' : ''}` : 'tous les types'}
        </button>
      </div>
      {showTypes && item.enabled && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 pl-7 font-sans text-sm">
          {subtypes.map((s) => (
            <label key={s} className={`flex cursor-pointer items-center gap-1.5 ${available.has(s) ? '' : 'text-ink-faint'}`} title={available.has(s) ? undefined : 'Aucun exercice de ce type à ce niveau'}>
              <input type="checkbox" checked={isOn(s)} onChange={() => toggleSub(s)} className="accent-[var(--ink)]" />
              {SUBTYPE_LABELS[s] ?? s}
            </label>
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
    <section className="panel px-5 py-4">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-serif text-xl font-semibold">Composer la feuille</h2>
        <span className="font-sans text-xs text-ink-faint">Raccourcis :</span>
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => onChange(p.config(config))} className="btn-link text-xs">
            {p.label}
          </button>
        ))}
      </div>
      {config.items.map((item, i) => (
        <ItemRow key={item.theme} item={item} onChange={(it) => onChange({ ...config, items: config.items.map((x, k) => (k === i ? it : x)) })} />
      ))}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-4 font-sans text-sm">
        <span className="text-ink-soft">Ordre</span>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={config.order === 'grouped'} onChange={() => onChange({ ...config, order: 'grouped' })} className="accent-[var(--ink)]" /> par chapitre
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={config.order === 'shuffled'} onChange={() => onChange({ ...config, order: 'shuffled' })} className="accent-[var(--ink)]" /> mélangé
        </label>
        <span className="flex-1" />
        <span className={tooMany ? 'text-pen' : 'text-ink-faint'}>
          {total} exercice{total > 1 ? 's' : ''}
          {tooMany ? `, maximum ${MAX_TOTAL}` : ''}
        </span>
        <button type="button" onClick={onGenerate} disabled={total === 0 || tooMany} className="btn btn-primary">
          Générer la feuille
        </button>
      </div>
    </section>
  );
}

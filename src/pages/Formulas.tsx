import { useState } from 'react';
import { Tex } from '../components/Math';
import { THEME_LABELS, THEMES } from '../exercises/types';
import { FORMULAS } from '../formulas/formulas';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Formulas() {
  const [q, setQ] = useState('');
  const match = FORMULAS.filter((f) => !q || norm(`${f.title} ${f.group} ${f.note ?? ''}`).includes(norm(q)));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Formulaire</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (quotient, ln, discriminant…)" className="ml-auto w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900" />
      </div>
      {THEMES.map((theme) => {
        const list = match.filter((f) => f.theme === theme);
        if (!list.length) return null;
        const groups = [...new Set(list.map((f) => f.group))];
        return (
          <section key={theme} className="space-y-3">
            <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{THEME_LABELS[theme]}</h2>
            {groups.map((g) => (
              <div key={g}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{g}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {list
                    .filter((f) => f.group === g)
                    .map((f) => (
                      <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm font-semibold">{f.title}</p>
                        <Tex math={f.latex} display />
                        {f.note && <p className="text-xs text-slate-500 dark:text-slate-400">{f.note}</p>}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}
      {!match.length && <p className="text-slate-500">Aucune formule ne correspond.</p>}
    </div>
  );
}

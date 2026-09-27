import { useState } from 'react';
import { Tex } from '../components/Math';
import { THEME_LABELS, THEMES } from '../exercises/types';
import { FORMULAS } from '../formulas/formulas';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Formulas() {
  const [q, setQ] = useState('');
  const match = FORMULAS.filter((f) => !q || norm(`${f.title} ${f.group} ${f.note ?? ''}`).includes(norm(q)));
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end gap-4 border-b border-rule pb-4">
        <h1 className="font-serif text-3xl font-semibold">Formulaire</h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="chercher : quotient, ln, discriminant…" className="field ml-auto w-full max-w-xs font-sans" aria-label="Rechercher une formule" />
      </div>
      {THEMES.map((theme, ti) => {
        const list = match.filter((f) => f.theme === theme);
        if (!list.length) return null;
        const groups = [...new Set(list.map((f) => f.group))];
        return (
          <section key={theme}>
            <h2 className="mb-4 flex items-baseline gap-3">
              <span className="font-serif text-2xl text-pen">{ti + 1}</span>
              <span className="font-serif text-2xl font-semibold">{THEME_LABELS[theme]}</span>
            </h2>
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g}>
                  <h3 className="label mb-1">{g}</h3>
                  <dl className="divide-y divide-rule border-y border-rule">
                    {list
                      .filter((f) => f.group === g)
                      .map((f) => (
                        <div key={f.id} className="grid gap-x-6 py-2.5 sm:grid-cols-[12rem_1fr]">
                          <dt className="pt-1 font-semibold">{f.title}</dt>
                          <dd className="min-w-0">
                            <Tex math={f.latex} display />
                            {f.note && <p className="text-sm text-ink-soft">{f.note}</p>}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {!match.length && <p className="text-ink-soft">Aucune formule ne correspond.</p>}
    </div>
  );
}

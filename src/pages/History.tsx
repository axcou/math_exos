import { useState } from 'react';
import { useNavigate } from 'react-router';
import { exerciseFromRef, TEMPLATE_BY_CODE } from '../exercises/registry';
import { DIFFICULTY_LABELS, type Difficulty, type Exercise, THEME_LABELS, THEMES } from '../exercises/types';
import { type HistoryEntry, useStore } from '../history/store';

function Stat({ entries }: { entries: HistoryEntry[] }) {
  const ok = entries.filter((e) => e.result === 'reussi').length;
  const ko = entries.filter((e) => e.result === 'rate').length;
  const done = ok + ko;
  return (
    <div className="text-sm">
      <div className="mb-1 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="bg-emerald-500" style={{ width: `${entries.length ? (ok / entries.length) * 100 : 0}%` }} />
        <div className="bg-rose-400" style={{ width: `${entries.length ? (ko / entries.length) * 100 : 0}%` }} />
      </div>
      <span className="text-slate-600 dark:text-slate-300">
        {entries.length} vu{entries.length > 1 ? 's' : ''} · {ok} réussi{ok > 1 ? 's' : ''} · {ko} à revoir
        {done ? ` · ${Math.round((ok / done) * 100)} %` : ''}
      </span>
    </div>
  );
}

export default function History() {
  const { history, clearHistory, setSheet } = useStore();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const recent = [...history].reverse().slice(0, 60);

  const reopen = (entries: HistoryEntry[]) => {
    const exs = entries.map((h) => exerciseFromRef(h.code, parseInt(h.uid.split('.')[1], 36))).filter((e): e is Exercise => !!e);
    setSheet(exs, { title: entries.length > 1 ? 'Exercices à revoir' : '' });
    navigate('/exercices');
  };
  const toReview = [...history].reverse().filter((h) => h.result === 'rate').slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Historique</h1>
        <span className="text-sm text-slate-500">Enregistré uniquement dans ce navigateur.</span>
        <span className="flex-1" />
        {toReview.length > 0 && (
          <button type="button" onClick={() => reopen(toReview)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700">
            Refaire les {toReview.length} derniers ratés
          </button>
        )}
        {history.length > 0 &&
          (confirm ? (
            <span className="flex items-center gap-2 text-sm">
              Tout effacer ?
              <button type="button" onClick={() => (clearHistory(), setConfirm(false))} className="rounded-lg bg-rose-600 px-3 py-1 text-white">
                Oui
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="rounded-lg px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                Non
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Effacer l’historique
            </button>
          ))}
      </div>

      {history.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">Aucun exercice pour l’instant.</p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {THEMES.map((t) => {
              const mine = history.filter((h) => h.theme === t);
              return (
                <div key={t} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="mb-2 font-bold">{THEME_LABELS[t]}</h2>
                  <Stat entries={mine} />
                  <div className="mt-3 space-y-2">
                    {([1, 2, 3] as Difficulty[]).map((d) => {
                      const lvl = mine.filter((h) => h.difficulty === d);
                      return lvl.length ? (
                        <div key={d}>
                          <p className="text-xs font-semibold text-slate-500">{DIFFICULTY_LABELS[d]}</p>
                          <Stat entries={lvl} />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          <section>
            <h2 className="mb-2 font-bold">Derniers exercices</h2>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {recent.map((h) => (
                <li key={h.uid + h.date} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className={`w-20 shrink-0 font-semibold ${h.result === 'reussi' ? 'text-emerald-600' : h.result === 'rate' ? 'text-rose-600' : 'text-slate-400'}`}>
                    {h.result === 'reussi' ? '✔ Réussi' : h.result === 'rate' ? '✘ À revoir' : '· Non fait'}
                  </span>
                  <span className="min-w-0 flex-1">
                    {TEMPLATE_BY_CODE.get(h.code)?.title ?? h.code}
                    <span className="ml-2 text-xs text-slate-400">
                      {THEME_LABELS[h.theme]} · {DIFFICULTY_LABELS[h.difficulty]}
                      {h.source === 'shared' ? ' · partagé' : ''}
                    </span>
                  </span>
                  <span className="text-xs text-slate-400">{new Date(h.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <button type="button" onClick={() => reopen([h])} className="rounded-md px-2 py-0.5 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950">
                    Rouvrir
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

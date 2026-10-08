import { useState } from 'react';
import { useNavigate } from 'react-router';
import { exerciseFromUid, TEMPLATE_BY_CODE } from '../exercises/registry';
import { ALL_THEMES as THEMES, DIFFICULTY_LABELS, type Difficulty, type Exercise, THEME_LABELS } from '../exercises/types';
import { type HistoryEntry, useStore } from '../history/store';

function counts(entries: HistoryEntry[]) {
  const ok = entries.filter((e) => e.result === 'reussi').length;
  const ko = entries.filter((e) => e.result === 'rate').length;
  return { ok, ko, seen: entries.length, rate: ok + ko ? Math.round((ok / (ok + ko)) * 100) : null };
}

export default function History() {
  const { history, clearHistory, setSheet } = useStore();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const recent = [...history].reverse().slice(0, 60);

  const reopen = (entries: HistoryEntry[]) => {
    const exs = entries.map((h) => exerciseFromUid(h.uid)).filter((e): e is Exercise => !!e);
    setSheet(exs, { title: entries.length > 1 ? 'Exercices à revoir' : '' });
    navigate('/exercices');
  };
  const toReview = [...history].reverse().filter((h) => h.result === 'rate').slice(0, 10);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2 border-b border-rule pb-4">
        <h1 className="font-serif text-3xl font-semibold">Historique</h1>
        <span className="pb-1 font-sans text-xs text-ink-faint">gardé dans ce navigateur uniquement</span>
        <span className="flex-1" />
        {toReview.length > 0 && (
          <button type="button" onClick={() => reopen(toReview)} className="btn btn-primary">
            Refaire les {toReview.length} derniers ratés
          </button>
        )}
        {history.length > 0 &&
          (confirm ? (
            <span className="flex items-baseline gap-3 font-sans text-sm">
              Tout effacer ?
              <button type="button" onClick={() => (clearHistory(), setConfirm(false))} className="btn-link pen">
                oui, effacer
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="btn-link">
                annuler
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="btn-link">
              effacer l’historique
            </button>
          ))}
      </div>

      {history.length === 0 ? (
        <p className="py-10 text-center text-ink-soft">Aucun exercice pour l’instant.</p>
      ) : (
        <>
          <section className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ink/70 font-sans text-xs uppercase tracking-wider text-ink-faint">
                  <th className="py-2 pr-4 font-semibold">Chapitre</th>
                  <th className="py-2 pr-4 font-semibold">Niveau</th>
                  <th className="py-2 pr-4 text-right font-semibold">Vus</th>
                  <th className="py-2 pr-4 text-right font-semibold">Réussis</th>
                  <th className="py-2 pr-4 text-right font-semibold">À revoir</th>
                  <th className="py-2 text-right font-semibold">Taux</th>
                </tr>
              </thead>
              <tbody>
                {THEMES.flatMap((t) => {
                  const mine = history.filter((h) => h.theme === t);
                  if (!mine.length) return [];
                  const levels = ([1, 2, 3] as Difficulty[]).filter((d) => mine.some((h) => h.difficulty === d));
                  const row = (label: string, level: string, c: ReturnType<typeof counts>, strong: boolean, key: string) => (
                    <tr key={key} className={strong ? 'border-t border-rule' : ''}>
                      <td className={`py-1.5 pr-4 ${strong ? 'font-semibold' : ''}`}>{label}</td>
                      <td className="py-1.5 pr-4 text-ink-soft">{level}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{c.seen}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-ok">{c.ok}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-pen">{c.ko}</td>
                      <td className="py-1.5 text-right tabular-nums">{c.rate === null ? '—' : `${c.rate} %`}</td>
                    </tr>
                  );
                  return [
                    row(THEME_LABELS[t], 'tous', counts(mine), true, t),
                    ...levels.map((d) => row('', DIFFICULTY_LABELS[d].toLowerCase(), counts(mine.filter((h) => h.difficulty === d)), false, `${t}${d}`)),
                  ];
                })}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="label mb-1">Derniers exercices</h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {recent.map((h) => (
                <li key={h.uid + h.date} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2">
                  <span className={`hand w-24 shrink-0 text-xl ${h.result === 'reussi' ? 'text-ok' : h.result === 'rate' ? 'text-pen' : 'text-ink-faint'}`}>
                    {h.result === 'reussi' ? 'réussi' : h.result === 'rate' ? 'à revoir' : 'pas fait'}
                  </span>
                  <span className="min-w-0 flex-1">
                    {TEMPLATE_BY_CODE.get(h.code)?.title ?? h.code}
                    <span className="ml-2 font-sans text-xs text-ink-faint">
                      {THEME_LABELS[h.theme]} · {DIFFICULTY_LABELS[h.difficulty].toLowerCase()}
                      {h.source === 'shared' ? ' · partagé' : ''}
                    </span>
                  </span>
                  <span className="font-sans text-xs text-ink-faint">{new Date(h.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <button type="button" onClick={() => reopen([h])} className="btn-link">
                    rouvrir
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

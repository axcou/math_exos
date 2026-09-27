import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { exerciseFromRef } from '../exercises/registry';
import type { Exercise } from '../exercises/types';
import { pastExercises, useStore } from '../history/store';
import { decodeConfig, decodeSheet } from '../share/share';
import { buildSheet } from '../sheet/buildSheet';

/** Ouverture d'un lien de partage : feuille exacte (#/f?…) ou composition (#/g?…). */
export default function SharedLink({ kind }: { kind: 'sheet' | 'config' }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    const store = useStore.getState();
    if (kind === 'sheet') {
      const decoded = decodeSheet(params);
      if (!decoded) return setError(true);
      const exercises = decoded.refs.map((r) => exerciseFromRef(r.code, r.seed)).filter((e): e is Exercise => !!e);
      store.setSheet(exercises, { source: 'shared', title: decoded.title, showSolutions: decoded.showSolutions, skipped: decoded.skipped });
      store.setInputsEnabled(decoded.inputs);
    } else {
      const config = decodeConfig(params);
      if (!config) return setError(true);
      store.setConfig(config);
      store.setSheet(buildSheet(config, pastExercises(store.history)));
    }
    navigate('/exercices', { replace: true });
  }, [kind, params, navigate]);

  if (!error) return <p className="py-10 text-center text-slate-500">Chargement de la feuille…</p>;
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/40">
      <p className="mb-2 text-lg font-semibold">Lien invalide</p>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Ce lien de partage est incomplet, corrompu, ou vient d’une version plus récente du site.</p>
      <Link to="/exercices" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
        Générer une nouvelle feuille
      </Link>
    </div>
  );
}

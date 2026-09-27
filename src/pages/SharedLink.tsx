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

  if (!error) return <p className="py-10 text-center text-ink-soft">Chargement de la feuille…</p>;
  return (
    <div className="copy mx-auto max-w-md">
      <p className="hand mb-2 text-3xl text-pen">Lien illisible</p>
      <p className="mb-5 text-ink-soft">Ce lien de partage est incomplet ou abîmé, ou il vient d’une version plus récente du site.</p>
      <Link to="/exercices" className="btn btn-primary">
        Générer une nouvelle feuille
      </Link>
    </div>
  );
}

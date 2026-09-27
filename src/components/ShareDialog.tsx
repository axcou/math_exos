import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { Exercise } from '../exercises/types';
import { absoluteUrl, encodeConfig, encodeSheet } from '../share/share';
import type { SheetConfig } from '../sheet/sheetConfig';

interface Props {
  exercises: Exercise[];
  config: SheetConfig;
  initialTitle: string;
  onClose: () => void;
}

export function ShareDialog({ exercises, config, initialTitle, onClose }: Props) {
  const [mode, setMode] = useState<'sheet' | 'config'>('sheet');
  const [title, setTitle] = useState(initialTitle);
  const [showSolutions, setShowSolutions] = useState(true);
  const [inputs, setInputs] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [bigQr, setBigQr] = useState(false);

  const url = absoluteUrl(
    mode === 'sheet' ? encodeSheet({ refs: exercises.map((e) => ({ code: e.code, seed: e.seed })), title, showSolutions, inputs }) : encodeConfig(config),
  );

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { margin: 1, width: 480, errorCorrectionLevel: 'L' })
      .then((d) => alive && setQr(d))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      (document.getElementById('share-url') as HTMLInputElement | null)?.select();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="share-title" className="text-lg font-bold">
            Partager
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {(['sheet', 'config'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-xl border p-3 text-left text-sm ${mode === m ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
            >
              <span className="block font-semibold">{m === 'sheet' ? 'Cette feuille' : 'Cette composition'}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {m === 'sheet' ? `Les mêmes ${exercises.length} exercices, à l’identique.` : 'Une nouvelle feuille aléatoire à chaque ouverture, avec les mêmes réglages.'}
              </span>
            </button>
          ))}
        </div>

        {mode === 'sheet' && (
          <div className="mb-4 space-y-2 text-sm">
            <label className="block">
              Titre (optionnel)
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="ex. Révisions dérivées" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-600 dark:bg-slate-800" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showSolutions} onChange={(e) => setShowSolutions(e.target.checked)} className="accent-indigo-600" />
              Corrections disponibles
              <span className="text-xs text-slate-500">(décoché : mode « devoir », seule la vérification des réponses reste)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={inputs} onChange={(e) => setInputs(e.target.checked)} className="accent-indigo-600" />
              Saisie des réponses
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-800" />
          <button type="button" onClick={copy} className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">{url.length} caractères</p>

        {qr && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <button type="button" onClick={() => setBigQr(true)} title="Afficher en grand">
              <img src={qr} alt="QR code du lien" className="h-40 w-40 rounded-lg border border-slate-200 bg-white p-1" />
            </button>
            <span className="text-xs text-slate-500">Clique sur le QR code pour l’afficher en plein écran</span>
          </div>
        )}
      </div>
      {bigQr && qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6" onClick={(e) => (e.stopPropagation(), setBigQr(false))}>
          <img src={qr} alt="QR code du lien" className="max-h-full max-w-full" style={{ imageRendering: 'pixelated' }} />
        </div>
      )}
    </div>
  );
}

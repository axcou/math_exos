import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '../exercises/types';
import { refOf } from '../history/store';
import { absoluteUrl, encodeConfig, encodeSheet } from '../share/share';
import type { SheetConfig } from '../sheet/sheetConfig';

interface Props {
  exercises: Exercise[];
  config: SheetConfig;
  initialTitle: string;
  /** Réglages de la feuille courante, repris par défaut. */
  initial?: { showSolutions?: boolean; allowRetry?: boolean; singleAttempt?: boolean };
  onClose: () => void;
}

export function ShareDialog({ exercises, config, initialTitle, initial, onClose }: Props) {
  const [mode, setMode] = useState<'sheet' | 'config'>('sheet');
  const [title, setTitle] = useState(initialTitle);
  const [showSolutions, setShowSolutions] = useState(initial?.showSolutions ?? true);
  const [allowRetry, setAllowRetry] = useState(initial?.allowRetry ?? true);
  const [singleAttempt, setSingleAttempt] = useState(initial?.singleAttempt ?? false);
  const [inputs, setInputs] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [bigQr, setBigQr] = useState(false);

  const url = absoluteUrl(
    mode === 'sheet' ? encodeSheet({ refs: exercises.map(refOf), title, showSolutions, inputs, allowRetry, singleAttempt }) : encodeConfig(config),
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="panel max-h-full w-full max-w-lg overflow-y-auto p-6 shadow-[6px_6px_0_var(--rule)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="share-title" className="font-serif text-xl font-semibold">
            Partager
          </h2>
          <button type="button" onClick={onClose} className="btn-link" aria-label="Fermer">
            fermer
          </button>
        </div>

        <fieldset className="mb-5 space-y-2">
          <legend className="label mb-2">Que partager ?</legend>
          {(['sheet', 'config'] as const).map((m) => (
            <label key={m} className="flex cursor-pointer gap-2.5">
              <input type="radio" checked={mode === m} onChange={() => setMode(m)} className="mt-1.5 accent-[var(--ink)]" />
              <span>
                <span className="font-semibold">{m === 'sheet' ? 'Cette feuille' : 'Cette composition'}</span>
                <span className="block text-sm text-ink-soft">
                  {m === 'sheet' ? `Les mêmes ${exercises.length} énoncés, à l’identique.` : 'Une nouvelle feuille tirée au hasard à chaque ouverture, avec les mêmes réglages.'}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'sheet' && (
          <div className="mb-5 space-y-3 font-sans text-sm">
            <label className="block">
              <span className="label">Titre</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Révisions dérivées (facultatif)" className="field mt-1 block w-full font-sans" />
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={showSolutions} onChange={(e) => setShowSolutions(e.target.checked)} className="mt-0.5 accent-[var(--ink)]" />
              <span>
                Corrigé disponible
                <span className="block text-xs text-ink-faint">Décoché : mode devoir, seule la vérification des réponses reste.</span>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={inputs} onChange={(e) => setInputs(e.target.checked)} className="accent-[var(--ink)]" />
              Saisie des réponses
            </label>
            <label className={`flex items-start gap-2 ${inputs ? '' : 'opacity-50'}`}>
              <input type="checkbox" checked={singleAttempt} disabled={!inputs} onChange={(e) => setSingleAttempt(e.target.checked)} className="mt-0.5 accent-[var(--ink)]" />
              <span>
                Une seule vérification par question
                <span className="block text-xs text-ink-faint">La réponse est verrouillée dès le premier essai (mode contrôle).</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={allowRetry} onChange={(e) => setAllowRetry(e.target.checked)} className="mt-0.5 accent-[var(--ink)]" />
              <span>
                Autoriser « Recommencer »
                <span className="block text-xs text-ink-faint">Décoché : on ne peut pas effacer ses réponses pour refaire un exercice.</span>
              </span>
            </label>
          </div>
        )}

        <div className="flex items-end gap-3">
          <input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} className="field min-w-0 flex-1 text-xs" aria-label="Lien de partage" />
          <button type="button" onClick={copy} className="btn btn-primary shrink-0">
            {copied ? 'Copié' : 'Copier le lien'}
          </button>
        </div>
        <p className="mt-1 font-sans text-xs text-ink-faint">{url.length} caractères</p>

        {qr && (
          <div className="mt-5 flex items-center gap-4">
            <button type="button" onClick={() => setBigQr(true)} title="Afficher en grand">
              <img src={qr} alt="QR code du lien" className="h-28 w-28 border border-rule bg-white p-1" />
            </button>
            <p className="text-sm text-ink-soft">
              Pour une classe : <button type="button" className="btn-link" onClick={() => setBigQr(true)}>afficher le QR code en plein écran</button>.
            </p>
          </div>
        )}
      </div>
      {bigQr && qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6" onClick={(e) => (e.stopPropagation(), setBigQr(false))}>
          <img src={qr} alt="QR code du lien" className="max-h-full max-w-full" style={{ imageRendering: 'pixelated' }} />
        </div>
      )}
    </div>,
    document.body,
  );
}

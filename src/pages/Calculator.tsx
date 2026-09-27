import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ExpressionInput } from '../components/answers/AnswerInputs';
import { CALC_MODES, type CalcMode, CalcResult, pointPreview, readPoint, runCalc } from '../components/CalcResult';
import { Tex } from '../components/Math';

const EXAMPLES: Record<CalcMode, [string, string][]> = {
  limite: [
    ['(2x+1)/(x-14)', '14+'],
    ['(x^2-4)/(x-2)', '2'],
    ['(3x^2+1)/(x^2-5)', '+inf'],
    ['sqrt(x^2+3x) - x', '+inf'],
    ['(sqrt(x+1)-2)/(x-3)', '3'],
    ['e^x/x^3', '+inf'],
    ['x^2 e^x', '-inf'],
    ['x ln(x)', '0+'],
    ['(e^(2x)-1)/x', '0'],
    ['1/x', '0'],
  ],
  derivee: [
    ['3x^4 - 2x^2 + 5', ''],
    ['(2x+1)(x^2-3x)', ''],
    ['(2x+1)/(x-3)', ''],
    ['(2x+1)e^x', ''],
    ['x ln(x)', ''],
    ['e^(3x+1)', ''],
    ['ln(x^2+1)', ''],
    ['sqrt(2x+5)', ''],
    ['(2x+1)^4', ''],
    ['ln(x)/x', ''],
  ],
  signe: [
    ['2x - 6', ''],
    ['x^2 - 5x + 6', ''],
    ['x^2 - x - 1', ''],
    ['(2x+1)/(x-3)', ''],
    ['x^3 - x', ''],
    ['(x+1)e^x', ''],
    ['e^x - 2', ''],
    ['x ln(x)', ''],
    ['(x-2)^2/(x+1)', ''],
  ],
  variation: [
    ['x^2 - 4x + 1', ''],
    ['x^3 - 3x', ''],
    ['(x+1)e^x', ''],
    ['x - ln(x)', ''],
    ['(2x+1)/(x-3)', ''],
    ['e^x - 2x', ''],
    ['ln(x)/x', ''],
    ['x + 1/x', ''],
  ],
};

const INTRO: Record<CalcMode, string> = {
  limite: 'Entre une fonction et un point : la méthode est détaillée comme dans un corrigé, puis vérifiée par un tableau de valeurs.',
  derivee: 'Entre une fonction : on identifie sa forme (somme, produit, quotient, composée), on applique la formule du cours et on simplifie.',
  signe: 'Entre une fonction : on la factorise, on étudie le signe de chaque facteur, puis on applique la règle des signes.',
  variation: 'Entre une fonction : on calcule sa dérivée, on étudie son signe, puis on dresse le tableau de variations avec extremums et limites.',
};

const baseOf = (s: string) => s.trim().replace(/\s*[+\-⁺⁻]$/, '');

export default function Calculator() {
  const [params, setParams] = useSearchParams();
  const mode = (CALC_MODES.find((m) => m.id === params.get('m'))?.id ?? 'limite') as CalcMode;
  const chap = CALC_MODES.find((m) => m.id === mode)!.chap;
  const [fText, setFText] = useState(params.get('f') ?? '');
  const [xText, setXText] = useState(params.get('x') ?? '');

  const submitted = { f: params.get('f') ?? '', x: params.get('x') ?? '' };
  // L'URL fait foi (lien partagé, retour arrière)
  useEffect(() => {
    if (submitted.f) setFText(submitted.f);
    if (submitted.x) setXText(submitted.x);
  }, [submitted.f, submitted.x]);
  const out = useMemo(() => {
    if (!submitted.f || (mode === 'limite' && !submitted.x)) return null;
    return runCalc(mode, submitted.f, submitted.x);
  }, [mode, submitted.f, submitted.x]);

  const point = readPoint(xText);
  const finite = point && typeof point.at === 'number';
  const needsPoint = mode === 'limite';

  const calculate = (f = fText, x = xText, m: CalcMode = mode) => {
    if (!f.trim() || (m === 'limite' && !x.trim())) return;
    setFText(f);
    setXText(x);
    setParams(m === 'limite' ? { m, f, x } : { m, f });
  };

  const switchMode = (m: CalcMode) => {
    const next: Record<string, string> = { m };
    if (fText.trim() && (m !== 'limite' || xText.trim())) {
      next.f = fText;
      if (m === 'limite') next.x = xText;
    }
    setParams(next);
  };

  const setSide = (side: '' | '+' | '-') => {
    const b = baseOf(xText);
    if (!b || /inf|∞|oo/i.test(b)) return;
    setXText(b + side);
  };

  return (
    <div className={`chap-${chap} space-y-6`}>
      <header className="border-b border-rule pb-4">
        <h1 className="font-serif text-3xl font-semibold">Calculateurs</h1>
        <p className="mt-1 text-ink-soft">{INTRO[mode]}</p>
      </header>

      <nav className="flex flex-wrap gap-x-1 border-b-[3px] border-chap font-sans text-sm" aria-label="Type de calcul">
        {CALC_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => switchMode(m.id)}
            aria-current={m.id === mode ? 'page' : undefined}
            className={`chap-${m.chap} px-3 py-1.5 font-semibold ${m.id === mode ? 'bg-chap text-sheet' : 'text-ink-soft hover:text-chap'}`}
            style={m.id === mode ? { textShadow: 'none' } : undefined}
          >
            {m.label}
          </button>
        ))}
      </nav>

      <section className="page space-y-5">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            calculate();
          }}
        >
          <ExpressionInput value={fText} onChange={setFText} onSubmit={() => calculate()} label="f(x) =" placeholder="ex. (2x+1)/(x-14)   ou   x ln(x)" />

          {needsPoint && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <Tex math="x \to" className="shrink-0" />
                <input value={xText} onChange={(e) => setXText(e.target.value)} placeholder="14+, 14-, 2, 0+, +inf, -inf" className="field w-56" aria-label="Point où calculer la limite" spellCheck={false} autoComplete="off" />
                {xText && !point && <span className="font-sans text-xs text-pen">point non compris</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <button type="button" className="key" onClick={() => setXText('+inf')} aria-label="plus l’infini">
                  <Tex math="+\infty" />
                </button>
                <button type="button" className="key" onClick={() => setXText('-inf')} aria-label="moins l’infini">
                  <Tex math="-\infty" />
                </button>
                <span className="mx-2 font-sans text-xs text-ink-faint">côté :</span>
                {(
                  [
                    ['', 'des deux côtés'],
                    ['+', 'à droite (a⁺)'],
                    ['-', 'à gauche (a⁻)'],
                  ] as const
                ).map(([s, label]) => (
                  <button
                    key={s || 'both'}
                    type="button"
                    disabled={!finite}
                    onClick={() => setSide(s)}
                    className={`key disabled:opacity-40 ${finite && point.side === (s === '+' ? 1 : s === '-' ? -1 : 0) ? 'border-chap bg-chap-soft' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button type="submit" className="btn btn-primary" disabled={!fText.trim() || (needsPoint && !point)}>
              {mode === 'limite' ? 'Calculer la limite' : mode === 'derivee' ? 'Dériver' : mode === 'signe' ? 'Étudier le signe' : 'Étudier les variations'}
            </button>
            {needsPoint && pointPreview(fText, xText) && <Tex math={pointPreview(fText, xText)!} className="text-ink-soft" />}
          </div>
        </form>

        <div className="border-t border-rule pt-3 font-sans text-xs text-ink-faint" data-testid="examples">
          Exemples :{' '}
          {EXAMPLES[mode].map(([f, x], i) => (
            <span key={f + x}>
              {i > 0 && ' · '}
              <button type="button" className="underline decoration-dotted underline-offset-2 hover:text-ink" onClick={() => calculate(f, x)}>
                {mode === 'limite' ? `${f} en ${x}` : f}
              </button>
            </span>
          ))}
        </div>
      </section>

      {out && (
        <section className="page">
          <div className="chap-band mb-4">
            <span className="chap-tab">Résultat</span>
          </div>
          <CalcResult out={out} />
        </section>
      )}
    </div>
  );
}

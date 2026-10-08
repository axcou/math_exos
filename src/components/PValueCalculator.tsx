import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { conclusion, LAW_BY_ID, type LawId, LAWS, solvePValue, type Tail, validate } from '../calculator/pvalueSolver';
import { parseNumber } from '../checking/check';
import { texFixed, texNum, texPValue } from '../core/stats/format';
import { CodeBlock } from './DataTableView';
import { LawPlot } from './LawPlot';
import { MathText, Tex } from './Math';

const TAILS: { id: Tail; label: string; hint: string }[] = [
  { id: 'left', label: 'Unilatéral à gauche', hint: 'on rejette pour les petites valeurs' },
  { id: 'right', label: 'Unilatéral à droite', hint: 'on rejette pour les grandes valeurs' },
  { id: 'two', label: 'Bilatéral', hint: 'on rejette aux deux extrémités' },
];

/** Notation générale de chaque loi (boutons de choix). */
const GENERIC: Record<LawId, string> = {
  normal: '\\mathcal{N}(\\mu, \\sigma^2)',
  student: '\\mathcal{T}(\\nu)',
  chi2: '\\chi^2(k)',
  fisher: '\\mathcal{F}(d_1, d_2)',
};

/** Exemples : [libellé, loi, paramètres, valeur observée, α, test]. */
const EXAMPLES: [string, LawId, string, string, string, Tail][] = [
  ['dé : χ²(5), T = 11,24', 'chi2', '5', '11.24', '0.05', 'right'],
  ['zona : N(0,1), z = 1,644', 'normal', '0,1', '1.644', '0.1', 'two'],
  ['engrais : F(2, 9), F = 10,4', 'fisher', '2,9', '10.4', '0.05', 'right'],
  ['Student t(10), t = −2,5', 'student', '10', '-2.5', '0.05', 'left'],
  ['seuil seul : χ²(3) à 1 %', 'chi2', '3', '', '0.01', 'right'],
];

const num = (s: string): number | undefined => {
  const v = parseNumber(s);
  return typeof v === 'number' ? v : undefined;
};

/**
 * Calculateur de p-valeur et de seuils de rejet : l'URL porte la saisie
 * (?m=loi&l=chi2&p=5&x=11.24&a=0.05&t=right), un lien redonne le même calcul.
 */
export function PValueCalculator() {
  const [params, setParams] = useSearchParams();
  const lawId = (LAW_BY_ID.has(params.get('l') as LawId) ? params.get('l') : 'chi2') as LawId;
  const law = LAW_BY_ID.get(lawId)!;
  const urlParams = params.get('p');
  const [pText, setPText] = useState<string[]>(() => (urlParams ? urlParams.split(',') : law.params.map((d) => String(d.default))));
  const [xText, setXText] = useState(params.get('x') ?? '');
  const [aText, setAText] = useState(params.get('a') ?? '0.05');
  const tail = (TAILS.some((t) => t.id === params.get('t')) ? params.get('t') : law.defaultTail) as Tail;

  // L'URL fait foi (lien partagé, retour arrière)
  useEffect(() => {
    setPText(urlParams ? urlParams.split(',') : law.params.map((d) => String(d.default)));
    setXText(params.get('x') ?? '');
    setAText(params.get('a') ?? '0.05');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const update = (next: Record<string, string>) => {
    const merged: Record<string, string> = { m: 'loi', l: lawId, t: tail, p: pText.join(','), a: aText, ...(xText.trim() ? { x: xText } : {}), ...next };
    if (next.x === '') delete merged.x;
    setParams(merged);
  };
  const submitted = params.has('p');

  const result = useMemo(() => {
    if (!submitted) return null;
    const input = {
      law: lawId,
      params: (params.get('p') ?? '').split(',').map((s) => num(s) ?? NaN),
      alpha: num(params.get('a') ?? '') ?? NaN,
      tail,
      x: params.get('x') ? (num(params.get('x')!) ?? NaN) : undefined,
    };
    const error = validate(input);
    return error ? { error } : solvePValue(input);
  }, [params, lawId, tail, submitted]);

  const chooseLaw = (id: LawId) => {
    const l = LAW_BY_ID.get(id)!;
    const p = l.params.map((d) => String(d.default));
    setPText(p);
    setParams({ m: 'loi', l: id, t: l.defaultTail, p: p.join(','), a: aText, ...(xText.trim() ? { x: xText } : {}) });
  };

  return (
    <div className="space-y-6">
      <section className="page space-y-5">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            update({});
          }}
        >
          <fieldset>
            <legend className="label mb-2">
              Loi de la statistique sous <Tex math="H_0" />
            </legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Loi">
              {LAWS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={l.id === lawId}
                  onClick={() => chooseLaw(l.id)}
                  className={`key px-3 ${l.id === lawId ? 'border-chap bg-chap-soft font-semibold' : ''}`}
                >
                  {l.name} <Tex math={GENERIC[l.id]} />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-end gap-5">
            {law.params.map((d, i) => (
              <label key={d.key} className="flex items-baseline gap-2">
                <Tex math={`${d.label} =`} />
                <input
                  value={pText[i] ?? ''}
                  onChange={(e) => setPText(pText.map((v, k) => (k === i ? e.target.value : v)))}
                  className="field w-24"
                  aria-label={`Paramètre ${d.key}`}
                  inputMode="decimal"
                  autoComplete="off"
                />
              </label>
            ))}
            <span className="font-sans text-xs text-ink-faint">{law.params.some((d) => d.integer) ? 'degrés de liberté : nombres entiers' : 'moyenne et écart type'}</span>
          </div>

          <fieldset>
            <legend className="label mb-2">Type de test</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {TAILS.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-baseline gap-2">
                  <input type="radio" name="tail" checked={tail === t.id} onChange={() => update({ t: t.id })} className="accent-[var(--ink)]" />
                  <span>
                    {t.label} <span className="font-sans text-xs text-ink-faint">({t.hint})</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-end gap-6">
            <label className="flex items-baseline gap-2">
              <Tex math="\alpha =" />
              <input value={aText} onChange={(e) => setAText(e.target.value)} className="field w-24" aria-label="Seuil alpha" inputMode="decimal" autoComplete="off" />
              {['0.1', '0.05', '0.01'].map((a) => (
                <button key={a} type="button" className={`key ${aText === a ? 'border-chap bg-chap-soft' : ''}`} onClick={() => update({ a })}>
                  {Number(a) * 100} %
                </button>
              ))}
            </label>
            <label className="flex items-baseline gap-2">
              <span className="font-sans text-sm text-ink-soft">valeur observée</span>
              <input value={xText} onChange={(e) => setXText(e.target.value)} className="field w-28" placeholder="facultatif" aria-label="Valeur observée de la statistique" inputMode="decimal" autoComplete="off" />
            </label>
          </div>

          <button type="submit" className="btn btn-primary">
            Calculer
          </button>
        </form>

        <div className="border-t border-rule pt-3 font-sans text-xs text-ink-faint" data-testid="law-examples">
          Exemples :{' '}
          {EXAMPLES.map(([label, l, p, x, a, t], i) => (
            <span key={label}>
              {i > 0 && ' · '}
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2 hover:text-ink"
                onClick={() => {
                  setPText(p.split(','));
                  setXText(x);
                  setAText(a);
                  setParams({ m: 'loi', l, p, a, t, ...(x ? { x } : {}) });
                }}
              >
                {label}
              </button>
            </span>
          ))}
        </div>
      </section>

      {result && 'error' in result && (
        <p className="font-sans text-sm text-pen" role="alert">
          {result.error}
        </p>
      )}

      {result && !('error' in result) && (
        <section className="page space-y-5" aria-label="Résultat du calcul de p-valeur">
          <div className="chap-band">
            <span className="chap-tab">Résultat</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="box">
              <span className="box-tab">Seuil{result.critical.length > 1 ? 's' : ''} de rejet</span>
              <p data-testid="critical">
                {result.critical.map((v, i) => (
                  <span key={i} className="mr-4 inline-block">
                    <Tex math={`q_{${texNum(result.orders[i], 4)}} \\approx ${texFixed(v, 3)}`} />
                  </span>
                ))}
              </p>
              <p className="mt-1 text-[0.95rem] text-ink-soft">
                Région de rejet au seuil <Tex math={`\\alpha = ${texNum(result.alpha, 4)}`} /> : <Tex math={result.regionLatex} />
              </p>
            </div>
            <div className="box">
              <span className="box-tab">p-valeur</span>
              {result.pValue !== undefined ? (
                <>
                  <p data-testid="pvalue">
                    <Tex math={`${result.pLatex} \\approx ${texPValue(result.pValue).replace('<', '\\lt')}`} />
                  </p>
                  <p className="mt-1 text-[0.95rem] text-ink-soft">
                    <span className="font-sans text-xs text-ink-faint">valeur exacte : </span>
                    {result.pValue.toPrecision(6).replace('.', ',')}
                  </p>
                </>
              ) : (
                <p className="text-ink-soft">Entre la valeur observée de la statistique pour obtenir la p-valeur.</p>
              )}
            </div>
          </div>
          <p data-testid="decision" className={result.reject === undefined ? 'text-ink-soft' : result.reject ? 'text-pen' : 'text-ok'}>
            Sous <MathText text={`$H_0$, $X \\sim ${result.lawLatex}$.`} /> <MathText text={conclusion(result)} />
          </p>
          <LawPlot r={result} />
          <CodeBlock code={result.rCode} />
        </section>
      )}
    </div>
  );
}

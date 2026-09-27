import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ExpressionInput } from '../components/answers/AnswerInputs';
import { MathText, Tex } from '../components/Math';
import { StepItem } from '../components/Solution';
import { atLatex, parsePoint, solveLimit, valLatex } from '../calculator/limitSolver';
import { evaluate, hasVar } from '../core/expr/evaluate';
import { parse, ParseError } from '../core/expr/parse';
import { toLatex } from '../core/expr/toLatex';

const EXAMPLES: [string, string][] = [
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
];

function evalConst(s: string): number {
  const e = parse(s);
  if (hasVar(e)) throw new ParseError('Le point ne doit pas contenir x.');
  return evaluate(e, 0);
}

function readPoint(s: string) {
  try {
    return parsePoint(s, evalConst);
  } catch {
    return null;
  }
}

/** Retire un éventuel « + » ou « − » final (côté). */
const baseOf = (s: string) => s.trim().replace(/\s*[+\-⁺⁻]$/, '');

export default function Calculator() {
  const [params, setParams] = useSearchParams();
  const [fText, setFText] = useState(params.get('f') ?? '');
  const [xText, setXText] = useState(params.get('x') ?? '');

  const submitted = { f: params.get('f') ?? '', x: params.get('x') ?? '' };

  const report = useMemo(() => {
    if (!submitted.f || !submitted.x) return null;
    let expr;
    try {
      expr = parse(submitted.f);
    } catch (e) {
      return { error: `Fonction : ${e instanceof ParseError ? e.message : 'saisie non comprise'}` };
    }
    const point = readPoint(submitted.x);
    if (!point) return { error: 'Point : écris par exemple 14+, 14-, 2, 0+, +inf ou -inf.' };
    return { r: solveLimit(expr, point) };
  }, [submitted.f, submitted.x]);

  const point = readPoint(xText);
  const preview = useMemo(() => {
    try {
      return toLatex(parse(fText));
    } catch {
      return 'f(x)';
    }
  }, [fText]);

  const calculate = (f = fText, x = xText) => {
    if (!f.trim() || !x.trim()) return;
    setFText(f);
    setXText(x);
    setParams({ f, x });
  };

  const setSide = (side: '' | '+' | '-') => {
    const b = baseOf(xText);
    if (!b || /inf|∞|oo/i.test(b)) return;
    setXText(b + side);
  };

  const finite = point && typeof point.at === 'number';

  return (
    <div className="chap-limite space-y-6">
      <header className="border-b border-rule pb-4">
        <h1 className="font-serif text-3xl font-semibold">Calculateur de limites</h1>
        <p className="mt-1 text-ink-soft">Entre une fonction et un point : le calculateur détaille la méthode, comme dans un corrigé, puis vérifie le résultat par un tableau de valeurs.</p>
      </header>

      <section className="page space-y-5">
        <div className="chap-band">
          <span className="chap-tab">Limite</span>
          <span className="self-center px-3 font-semibold text-chap">À calculer</span>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            calculate();
          }}
        >
          <ExpressionInput value={fText} onChange={setFText} onSubmit={() => calculate()} label="f(x) =" placeholder="ex. (2x+1)/(x-14)   ou   sqrt(x^2+3x) - x" />

          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <Tex math="x \to" className="shrink-0" />
              <input
                value={xText}
                onChange={(e) => setXText(e.target.value)}
                placeholder="14+, 14-, 2, 0+, +inf, -inf"
                className="field w-56"
                aria-label="Point où calculer la limite"
                spellCheck={false}
                autoComplete="off"
              />
              {xText && !point && <span className="font-sans text-xs text-pen">point non compris</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" className="key" onClick={() => setXText('+inf')}>
                <Tex math="+\infty" />
              </button>
              <button type="button" className="key" onClick={() => setXText('-inf')}>
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

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <button type="submit" className="btn btn-primary" disabled={!fText.trim() || !point}>
              Calculer la limite
            </button>
            {point && <Tex math={`\\lim_{x \\to ${atLatex(point.at, point.side)}} ${preview}`} className="text-ink-soft" />}
          </div>
        </form>

        <div className="border-t border-rule pt-3 font-sans text-xs text-ink-faint">
          Exemples :{' '}
          {EXAMPLES.map(([f, x], i) => (
            <span key={f + x}>
              {i > 0 && ' · '}
              <button type="button" className="underline decoration-dotted underline-offset-2 hover:text-ink" onClick={() => calculate(f, x)}>
                {f} en {x}
              </button>
            </span>
          ))}
        </div>
      </section>

      {report && 'error' in report && <p className="font-sans text-sm text-pen">{report.error}</p>}

      {report && 'r' in report && report.r && (
        <section className="page space-y-5">
          <div className="chap-band">
            <span className="chap-tab">Résultat</span>
          </div>
          <div className="text-xl">
            <Tex math={`${report.r.statement} = ${valLatex(report.r.value)}`} display />
          </div>
          {report.r.warning && <p className="font-sans text-sm text-pen">{report.r.warning}</p>}

          <div className="box">
            <span className="box-tab">Méthode détaillée</span>
            <div className="space-y-6">
              {report.r.sections.map((s, i) => (
                <section key={i}>
                  {s.title && (
                    <p className="mb-2 border-b border-chap/30 pb-1 font-sans font-semibold text-chap">
                      <MathText text={s.title} />
                    </p>
                  )}
                  <ol className="space-y-4">
                    {s.steps.map((st, j) => (
                      <StepItem key={j} step={st} index={j} />
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </div>

          <div className="box dashed">
            <span className="box-tab">Vérification numérique</span>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse font-sans text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-ink/60 text-left text-xs uppercase tracking-wider text-ink-faint">
                    <th className="py-1 pr-6 font-semibold">x</th>
                    <th className="py-1 font-semibold">f(x)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.r.table.map((row, i) => (
                    <tr key={i} className="border-b border-rule last:border-0">
                      <td className="py-1 pr-6">{row.x}</td>
                      <td className="py-1">{row.fx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-sans text-xs text-ink-faint">Un tableau de valeurs donne une idée de la limite mais ne la démontre pas.</p>
          </div>
        </section>
      )}
    </div>
  );
}

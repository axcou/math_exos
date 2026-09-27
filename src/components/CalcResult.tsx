import { solveDerivative } from '../calculator/derivativeSolver';
import { atLatex, parsePoint, solveLimit, valLatex } from '../calculator/limitSolver';
import { solveSign } from '../calculator/signSolver';
import { solveVariations } from '../calculator/variationSolver';
import { evaluate, hasVar } from '../core/expr/evaluate';
import { parse, ParseError } from '../core/expr/parse';
import { toLatex } from '../core/expr/toLatex';
import { Tex } from './Math';
import { ReportView, type ReportSection } from './ReportView';
import { VariationTable } from './VariationTable';
import type { TableData } from '../exercises/types';

export type CalcMode = 'limite' | 'derivee' | 'signe' | 'variation';

export const CALC_MODES: { id: CalcMode; label: string; chap: string }[] = [
  { id: 'limite', label: 'Limite', chap: 'limite' },
  { id: 'derivee', label: 'Dérivée', chap: 'derivee' },
  { id: 'signe', label: 'Tableau de signes', chap: 'variation' },
  { id: 'variation', label: 'Tableau de variations', chap: 'variation' },
];

export type CalcOutput =
  | { error: string }
  | {
      headline: string; // LaTeX du résultat
      sections: ReportSection[];
      table?: TableData | null;
      values?: { x: string; fx: string }[];
      warning?: string;
    };

function evalConst(s: string): number {
  const e = parse(s);
  if (hasVar(e)) throw new ParseError('Le point ne doit pas contenir x.');
  return evaluate(e, 0);
}

export function readPoint(s: string) {
  try {
    return parsePoint(s, evalConst);
  } catch {
    return null;
  }
}

/** Lance le calculateur choisi. */
export function runCalc(mode: CalcMode, fText: string, xText = ''): CalcOutput {
  let f;
  try {
    f = parse(fText);
  } catch (e) {
    return { error: `Fonction : ${e instanceof ParseError ? e.message : 'saisie non comprise'}` };
  }
  if (mode === 'limite') {
    const point = readPoint(xText);
    if (!point) return { error: 'Point : écris par exemple 14+, 14-, 2, 0+, +inf ou -inf.' };
    const r = solveLimit(f, point);
    return { headline: `${r.statement} = ${valLatex(r.value)}`, sections: r.sections, values: r.table, warning: r.warning };
  }
  if (mode === 'derivee') {
    const r = solveDerivative(f);
    return {
      headline: `f(x) = ${toLatex(f)} \\qquad f'(x) = ${toLatex(r.df)}`,
      sections: [{ steps: r.steps }],
      warning: r.checked ? undefined : 'Le résultat n’a pas pu être contrôlé numériquement.',
    };
  }
  if (mode === 'signe') {
    const r = solveSign(f);
    return { headline: `f(x) = ${toLatex(f)}`, sections: [{ steps: r.steps }], warning: r.warning };
  }
  const r = solveVariations(f);
  return { headline: `f(x) = ${toLatex(f)}`, sections: r.sections, table: r.table, warning: r.warning };
}

export function pointPreview(fText: string, xText: string): string | null {
  const p = readPoint(xText);
  if (!p) return null;
  let fl = 'f(x)';
  try {
    fl = toLatex(parse(fText));
  } catch {
    /* aperçu seulement */
  }
  return `\\lim_{x \\to ${atLatex(p.at, p.side)}} ${fl}`;
}

/** Affichage d'un résultat de calculateur. */
export function CalcResult({ out, compact }: { out: CalcOutput; compact?: boolean }) {
  if ('error' in out) return <p className="font-sans text-sm text-pen">{out.error}</p>;
  return (
    <div className="space-y-5">
      <div className={compact ? '' : 'text-xl'}>
        <Tex math={out.headline} display />
      </div>
      {out.warning && <p className="font-sans text-sm text-pen">{out.warning}</p>}
      {out.table && (
        <div>
          <p className="label mb-2">Tableau de variations</p>
          <VariationTable table={out.table} />
        </div>
      )}
      <ReportView sections={out.sections} />
      {out.values && (
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
                {out.values.map((row, i) => (
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
      )}
    </div>
  );
}

import { plotRange, type PValueResult } from '../calculator/pvalueSolver';
import { texNum, texPValue } from '../core/stats/format';
import { Tex } from './Math';

const W = 640;
const H = 270;
const M = { left: 18, right: 18, top: 34, bottom: 40 };

/** Graduations « rondes » (1, 2 ou 5 × 10ⁿ). */
function niceTicks(lo: number, hi: number, target = 7): number[] {
  const raw = (hi - lo) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

const fr = (x: number, d = 2) => texNum(x, d).replace('{,}', ',');

/**
 * Densité de la loi de la statistique sous H0 : région de rejet (aire α),
 * aire correspondant à la p-valeur, valeur observée et quantile(s).
 */
export function LawPlot({ r }: { r: PValueResult }) {
  const { law, params } = r;
  const [lo, hi] = plotRange(r);
  const N = 480;
  const xs = Array.from({ length: N + 1 }, (_, i) => lo + ((hi - lo) * i) / N);
  const ys = xs.map((x) => law.pdf(x, params));
  // densité infinie en 0 (χ²(1), F(1, d)) : l'échelle ne se cale pas sur le pic
  const finite = ys.filter((y) => Number.isFinite(y));
  const body = Math.max(...ys.filter((y, i) => Number.isFinite(y) && xs[i] >= lo + 0.03 * (hi - lo)));
  const ymax = Math.min(Math.max(...finite), 2.5 * body) * 1.08;
  const px = (x: number) => M.left + ((x - lo) / (hi - lo)) * (W - M.left - M.right);
  const py = (y: number) => H - M.bottom - (Math.min(y, ymax) / ymax) * (H - M.top - M.bottom);
  const base = H - M.bottom;
  const clamp = (x: number) => Math.min(hi, Math.max(lo, x));

  const curve = xs.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(ys[i]).toFixed(1)}`).join(' ');
  /** Aire sous la courbe entre a et b. */
  const area = (a: number, b: number) => {
    const [u, v] = [clamp(a), clamp(b)];
    if (v <= u) return '';
    const pts = xs.filter((x) => x > u && x < v);
    const path = [u, ...pts, v].map((x) => `L${px(x).toFixed(1)},${py(law.pdf(x, params)).toFixed(1)}`).join(' ');
    return `M${px(u).toFixed(1)},${base} ${path} L${px(v).toFixed(1)},${base} Z`;
  };

  // région de rejet
  const c = r.critical;
  const rejectSpans: [number, number][] = r.tail === 'right' ? [[c[0], hi]] : r.tail === 'left' ? [[lo, c[0]]] : [[lo, c[0]], [c[1], hi]];
  const rejection = rejectSpans.map(([a, b]) => area(a, b));
  // aire de la p-valeur
  let pAreas: string[] = [];
  if (r.x !== undefined) {
    const x = r.x;
    const centred = law.id === 'student' || (law.id === 'normal' && params[0] === 0);
    if (r.tail === 'right') pAreas = [area(x, hi)];
    else if (r.tail === 'left') pAreas = [area(lo, x)];
    else if (centred) pAreas = [area(lo, -Math.abs(x)), area(Math.abs(x), hi)];
    else pAreas = [law.cdf(x, params) < 0.5 ? area(lo, x) : area(x, hi)];
  }

  const ticks = niceTicks(lo, hi);
  const outside = r.x !== undefined && (r.x > hi || r.x < lo);
  const xObs = r.x !== undefined ? px(clamp(r.x)) : 0;
  const obsRight = xObs > W * 0.65;

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Densité de la loi, région de rejet${r.x !== undefined ? `, valeur observée ${fr(r.x, 3)}` : ''}, seuil${c.length > 1 ? 's' : ''} ${c.map((v) => fr(v, 3)).join(' et ')}`}
      >
        {rejection.map((d, i) => d && <path key={`rej${i}`} d={d} fill="var(--pen)" fillOpacity={0.16} data-part="rejet" />)}
        {pAreas.map((d, i) => d && <path key={`p${i}`} d={d} fill="var(--chap, var(--ink))" fillOpacity={0.42} data-part="p-valeur" />)}
        <path d={curve} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" data-part="densite" />
        {/* axe et graduations ; la région de rejet est soulignée sur l'axe (visible même où la densité est presque nulle) */}
        <line x1={M.left} y1={base} x2={W - M.right} y2={base} stroke="var(--ink)" strokeWidth={1} />
        {rejectSpans.map(([a, b], i) => (
          <line key={`axe${i}`} x1={px(clamp(a))} y1={base} x2={px(clamp(b))} y2={base} stroke="var(--pen)" strokeWidth={4} strokeOpacity={0.75} data-part="rejet-axe" />
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={base} x2={px(t)} y2={base + 4} stroke="var(--ink)" strokeWidth={1} />
            <text x={px(t)} y={base + 16} textAnchor="middle" fontSize={11} fill="var(--ink-soft)" fontFamily="var(--font-sans, sans-serif)">
              {fr(t, 3).replace('-', '−')}
            </text>
          </g>
        ))}
        {/* quantiles (seuils de rejet) */}
        {c.map((v, i) => (
          <g key={`q${i}`} data-part="quantile">
            <line x1={px(v)} y1={M.top - 6} x2={px(v)} y2={base} stroke="var(--pen)" strokeWidth={1.4} strokeDasharray="5 4" />
            <text x={px(v)} y={base + 31} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="var(--pen)" fontFamily="var(--font-sans, sans-serif)">
              q{r.orders[i] !== undefined ? `(${fr(r.orders[i], 4)})` : ''} = {fr(v, 3).replace('-', '−')}
            </text>
          </g>
        ))}
        {/* valeur observée */}
        {r.x !== undefined && (
          <g data-part="observee">
            <line x1={xObs} y1={M.top - 14} x2={xObs} y2={base} stroke="var(--ink)" strokeWidth={2} />
            <circle cx={xObs} cy={base} r={3.5} fill="var(--ink)" />
            <text x={xObs + (obsRight ? -6 : 6)} y={M.top - 4} textAnchor={obsRight ? 'end' : 'start'} fontSize={12} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-sans, sans-serif)">
              {outside ? (r.x! > hi ? 'valeur observée → ' : '← valeur observée ') : 'valeur observée '}
              {fr(r.x!, 3).replace('-', '−')}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="flex flex-wrap gap-x-5 gap-y-1 font-sans text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-4 border-b-4 border-pen/75 bg-pen/20" /> région de rejet (aire <Tex math={`\\alpha = ${texNum(r.alpha, 4)}`} />)
        </span>
        {r.pValue !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-4 bg-chap/45" /> aire de la p-valeur <Tex math={`\\approx ${texPValue(r.pValue).replace('<', '\\lt')}`} />
            {r.tail === 'two' && !(law.id === 'student' || (law.id === 'normal' && params[0] === 0)) && ' (une queue, à doubler)'}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed border-pen" /> seuil{c.length > 1 ? 's' : ''} de rejet (quantile{c.length > 1 ? 's' : ''})
        </span>
      </figcaption>
    </figure>
  );
}

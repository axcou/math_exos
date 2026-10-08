import type { Tail } from '../calculator/pvalueSolver';
import { normalPdf, normalQuantile } from '../core/stats/distributions';

const W = 320;
const H = 170;
const M = { left: 8, right: 8, top: 14, bottom: 34 };
const LO = -3.6;
const HI = 3.6;
/** Risque du schéma (comme sur la fiche : α = 0,1, quantile 1,282). */
const ALPHA = 0.1;

/**
 * Schéma d'une région de rejet sur une densité en cloche : rejet à gauche,
 * bilatéral ou à droite, avec les aires α (ou α/2) et 1 − α.
 */
export function RejectionSketch({ tail, label }: { tail: Tail; label: string }) {
  const q = normalQuantile(1 - (tail === 'two' ? ALPHA / 2 : ALPHA));
  const ymax = normalPdf(0) * 1.12;
  const px = (x: number) => M.left + ((x - LO) / (HI - LO)) * (W - M.left - M.right);
  const py = (y: number) => H - M.bottom - (y / ymax) * (H - M.top - M.bottom);
  const base = H - M.bottom;
  const area = (a: number, b: number) => {
    const n = 60;
    const pts = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n).map((x) => `L${px(x).toFixed(1)},${py(normalPdf(x)).toFixed(1)}`);
    return `M${px(a).toFixed(1)},${base} ${pts.join(' ')} L${px(b).toFixed(1)},${base} Z`;
  };
  const curve = Array.from({ length: 121 }, (_, i) => LO + ((HI - LO) * i) / 120)
    .map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(normalPdf(x)).toFixed(1)}`)
    .join(' ');
  const reject: [number, number][] = tail === 'left' ? [[LO, -q]] : tail === 'right' ? [[q, HI]] : [[LO, -q], [q, HI]];
  const accept: [number, number] = tail === 'left' ? [-q, HI] : tail === 'right' ? [LO, q] : [-q, q];
  const cuts = tail === 'left' ? [-q] : tail === 'right' ? [q] : [-q, q];
  const a = tail === 'two' ? 'α/2' : 'α';
  const font = { fontFamily: 'var(--font-sans, sans-serif)' };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label} data-tail={tail}>
      <path d={area(...accept)} fill="var(--ink-faint)" fillOpacity={0.14} />
      {reject.map(([u, v], i) => (
        <path key={i} d={area(u, v)} fill="var(--pen)" fillOpacity={0.3} data-part="rejet" />
      ))}
      <path d={curve} fill="none" stroke="var(--ink-soft)" strokeWidth={2} />
      <line x1={M.left} y1={base} x2={W - M.right} y2={base} stroke="var(--ink-soft)" strokeWidth={1} />
      {reject.map(([u, v], i) => (
        <line key={`r${i}`} x1={px(u)} y1={base} x2={px(v)} y2={base} stroke="var(--pen)" strokeWidth={4} strokeOpacity={0.7} />
      ))}
      {cuts.map((c) => (
        <g key={c}>
          <line x1={px(c)} y1={py(normalPdf(c)) - 26} x2={px(c)} y2={base} stroke="var(--ink)" strokeWidth={1.2} strokeDasharray="4 3" />
          <text x={px(c)} y={py(normalPdf(c)) - 30} textAnchor="middle" fontSize={13} fontStyle="italic" fill="var(--ink)" fontFamily="serif">
            {cuts.length > 1 ? (c < 0 ? '−q' : 'q') : tail === 'left' ? '−q' : 'q'}
          </text>
        </g>
      ))}
      {/* aires */}
      <text x={px((accept[0] + accept[1]) / 2)} y={py(normalPdf(0)) + 34} textAnchor="middle" fontSize={13} fill="var(--ink)" {...font}>
        1 − α
      </text>
      {reject.map(([u], i) => (
        <text key={`a${i}`} x={px(u < 0 ? -q - 0.75 : q + 0.75)} y={py(0.09)} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--pen)" {...font}>
          {a}
        </text>
      ))}
      {/* légendes sous l'axe */}
      {reject.map(([u, v], i) => (
        <text key={`l${i}`} x={px((Math.max(u, LO + 0.2) + v) / 2)} y={base + 15} textAnchor="middle" fontSize={10} fill="var(--pen)" {...font}>
          rejet
        </text>
      ))}
      <text x={px((accept[0] + accept[1]) / 2)} y={base + 15} textAnchor="middle" fontSize={10} fill="var(--ink-soft)" {...font}>
        non-rejet de H₀
      </text>
    </svg>
  );
}

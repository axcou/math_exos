import { curveSlopes, evalCurve, evalGraph } from '../core/curve';
import type { GraphData } from '../exercises/types';

/** Courbe représentative sur quadrillage (une unité par carreau), comme dans un manuel. */
export function FunctionGraph({ graph }: { graph: GraphData }) {
  const k = graph.knots;
  const slopes = curveSlopes(k);
  const [a, b] = [k[0][0], k[k.length - 1][0]];
  const ys = k.map(([, y]) => y);
  const x0 = Math.min(a, 0) - 1;
  const x1 = Math.max(b, 0) + 1;
  // Avec une asymptote, on laisse de la place pour voir les branches partir vers l'infini
  const pad = graph.asymptote ? 3 : 1;
  let y0 = Math.min(...ys, 0) - pad;
  let y1 = Math.max(...ys, 0) + pad;
  const minH = graph.asymptote ? 10 : 0;
  if (y1 - y0 < minH) {
    const extra = minH - (y1 - y0);
    y0 -= Math.floor(extra / 2);
    y1 += Math.ceil(extra / 2);
  }
  const U = 26; // pixels par unité (coordonnées du viewBox)
  const px = (x: number) => (x - x0) * U;
  const py = (y: number) => (y1 - y) * U;
  const W = (x1 - x0) * U;
  const H = (y1 - y0) * U;

  const N = 240;
  const asym = graph.asymptote;
  let path: string;
  if (!asym) {
    path = Array.from({ length: N + 1 }, (_, i) => {
      const x = a + ((b - a) * i) / N;
      return `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(evalCurve(k, x, slopes)).toFixed(1)}`;
    }).join(' ');
  } else {
    // Deux branches, coupées au bord du quadrillage près de l'asymptote
    const branch = (from: number, to: number) => {
      const pts: string[] = [];
      for (let i = 0; i <= N; i++) {
        const x = from + ((to - from) * i) / N;
        const y = evalGraph(graph, x);
        if (y < y0 - 0.3 || y > y1 + 0.3) continue;
        pts.push(`${pts.length ? 'L' : 'M'}${px(x).toFixed(1)},${py(y).toFixed(1)}`);
      }
      return pts.join(' ');
    };
    path = `${branch(a, asym.p - 1e-3)} ${branch(b, asym.p + 1e-3)}`;
  }

  const xsGrid = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i);
  const ysGrid = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
  const font = { fontSize: 10.5, fill: 'var(--ink-soft)', fontFamily: 'var(--font-sans, sans-serif)' };
  const arrow = 5;

  return (
    <figure className="my-3 print:my-1.5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        style={{ maxWidth: `${Math.round(W * 1.05)}px` }}
        role="img"
        aria-label={`Courbe de f sur [${a} ; ${b}]`}
      >
        {xsGrid.map((x) => (
          <line key={`gx${x}`} x1={px(x)} y1={0} x2={px(x)} y2={H} stroke="var(--rule)" strokeWidth={0.8} />
        ))}
        {ysGrid.map((y) => (
          <line key={`gy${y}`} x1={0} y1={py(y)} x2={W} y2={py(y)} stroke="var(--rule)" strokeWidth={0.8} />
        ))}
        {/* Axes */}
        <g stroke="var(--ink)" strokeWidth={1.1} fill="var(--ink)">
          <line x1={0} y1={py(0)} x2={W - 1} y2={py(0)} />
          <polygon points={`${W},${py(0)} ${W - arrow * 1.6},${py(0) - arrow} ${W - arrow * 1.6},${py(0) + arrow}`} stroke="none" />
          <line x1={px(0)} y1={H} x2={px(0)} y2={1} />
          <polygon points={`${px(0)},0 ${px(0) - arrow},${arrow * 1.6} ${px(0) + arrow},${arrow * 1.6}`} stroke="none" />
        </g>
        {xsGrid.slice(1, -1).map((x) =>
          x === 0 ? null : (
            <text key={`tx${x}`} x={px(x)} y={py(0) + 12} textAnchor="middle" {...font}>
              {x < 0 ? `−${-x}` : x}
            </text>
          ),
        )}
        {ysGrid.slice(1, -1).map((y) =>
          y === 0 ? null : (
            <text key={`ty${y}`} x={px(0) - 4} y={py(y) + 3.5} textAnchor="end" {...font}>
              {y < 0 ? `−${-y}` : y}
            </text>
          ),
        )}
        <text x={px(0) - 4} y={py(0) + 12} textAnchor="end" {...font}>
          O
        </text>
        {asym && <line x1={px(asym.p)} y1={0} x2={px(asym.p)} y2={H} stroke="var(--ink-soft)" strokeWidth={1.2} strokeDasharray="5 4" />}
        {/* Courbe */}
        <path d={path} fill="none" stroke="var(--chap, var(--ink))" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {[k[0], k[k.length - 1]].map(([x, y]) => (
          <circle key={`e${x}`} cx={px(x)} cy={py(y)} r={3} fill="var(--chap, var(--ink))" />
        ))}
        <text x={px(b) + (b < x1 - 1 ? 6 : -6)} y={py(k[k.length - 1][1]) + (k[k.length - 1][1] > 0 ? -7 : 14)} textAnchor={b < x1 - 1 ? 'start' : 'end'} fontSize={13} fontStyle="italic" fill="var(--chap, var(--ink))" fontFamily="serif">
          𝒞f
        </text>
      </svg>
    </figure>
  );
}

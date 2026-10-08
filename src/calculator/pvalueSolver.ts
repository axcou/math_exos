import { chi2Cdf, chi2Pdf, fPdf, fSf, normalCdf, normalPdf, studentCdf, studentPdf } from '../core/stats/distributions';
import { rNum, texFixed, texNum, texPercent } from '../core/stats/format';

/*
 * Calculateur « lois et p-valeur » : p-valeur d'une statistique observée et
 * seuils de rejet (quantiles) d'un test, pour les lois usuelles des tests.
 */

export type LawId = 'normal' | 'student' | 'chi2' | 'fisher';
export type Tail = 'right' | 'left' | 'two';

export interface ParamDef {
  key: string;
  /** Nom affiché (LaTeX). */
  label: string;
  default: number;
  integer?: boolean;
  min: number;
}

export interface LawDef {
  id: LawId;
  name: string;
  /** Notation de la loi, ex. « \chi^2(5) ». */
  latex: (p: number[]) => string;
  params: ParamDef[];
  defaultTail: Tail;
  /** Loi à support positif (χ², Fisher). */
  positive: boolean;
  pdf: (x: number, p: number[]) => number;
  cdf: (x: number, p: number[]) => number;
  /** Nom des fonctions R (répartition, quantile). */
  r: { p: string; q: string; args: (p: number[]) => string };
}

export const LAWS: LawDef[] = [
  {
    id: 'normal',
    name: 'Normale',
    latex: ([mu, s]) => (mu === 0 && s === 1 ? '\\mathcal{N}(0,1)' : `\\mathcal{N}(${texNum(mu, 4)},\\, ${texNum(s, 4)}^2)`),
    params: [
      { key: 'mu', label: '\\mu', default: 0, min: -Infinity },
      { key: 'sigma', label: '\\sigma', default: 1, min: 0 },
    ],
    defaultTail: 'two',
    positive: false,
    pdf: (x, [mu, s]) => normalPdf(x, mu, s),
    cdf: (x, [mu, s]) => normalCdf((x - mu) / s),
    r: { p: 'pnorm', q: 'qnorm', args: ([mu, s]) => (mu === 0 && s === 1 ? '' : `, ${rNum(mu)}, ${rNum(s)}`) },
  },
  {
    id: 'student',
    name: 'Student',
    latex: ([nu]) => `\\mathcal{T}(${texNum(nu, 4)})`,
    params: [{ key: 'nu', label: '\\nu', default: 10, min: 0, integer: true }],
    defaultTail: 'two',
    positive: false,
    pdf: (x, [nu]) => studentPdf(x, nu),
    cdf: (x, [nu]) => studentCdf(x, nu),
    r: { p: 'pt', q: 'qt', args: ([nu]) => `, ${rNum(nu)}` },
  },
  {
    id: 'chi2',
    name: 'Khi-deux',
    latex: ([k]) => `\\chi^2(${texNum(k, 4)})`,
    params: [{ key: 'k', label: 'k', default: 5, min: 0, integer: true }],
    defaultTail: 'right',
    positive: true,
    pdf: (x, [k]) => chi2Pdf(x, k),
    cdf: (x, [k]) => (x <= 0 ? 0 : chi2Cdf(x, k)),
    r: { p: 'pchisq', q: 'qchisq', args: ([k]) => `, ${rNum(k)}` },
  },
  {
    id: 'fisher',
    name: 'Fisher',
    latex: ([d1, d2]) => `\\mathcal{F}(${texNum(d1, 4)},\\, ${texNum(d2, 4)})`,
    params: [
      { key: 'd1', label: 'd_1', default: 2, min: 0, integer: true },
      { key: 'd2', label: 'd_2', default: 9, min: 0, integer: true },
    ],
    defaultTail: 'right',
    positive: true,
    pdf: (x, [d1, d2]) => fPdf(x, d1, d2),
    cdf: (x, [d1, d2]) => (x <= 0 ? 0 : 1 - fSf(x, d1, d2)),
    r: { p: 'pf', q: 'qf', args: ([d1, d2]) => `, ${rNum(d1)}, ${rNum(d2)}` },
  },
];

export const LAW_BY_ID = new Map(LAWS.map((l) => [l.id, l]));

/** Quantile d'ordre p (fonction de répartition continue et croissante). */
export function quantile(law: LawDef, params: number[], p: number): number {
  let lo = law.positive ? 0 : -1;
  let hi = 1;
  if (!law.positive) while (law.cdf(lo, params) > p) lo *= 2;
  while (law.cdf(hi, params) < p) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (law.cdf(mid, params) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface PValueInput {
  law: LawId;
  params: number[];
  alpha: number;
  tail: Tail;
  /** Valeur observée de la statistique (facultative : sinon, seulement les seuils). */
  x?: number;
}

export interface PValueResult {
  law: LawDef;
  params: number[];
  alpha: number;
  tail: Tail;
  x?: number;
  pValue?: number;
  /** Seuil(s) de rejet : un quantile (unilatéral) ou deux (bilatéral), croissants. */
  critical: number[];
  /** Ordre de chaque quantile (ex. 0,95 ; ou 0,025 et 0,975). */
  orders: number[];
  reject?: boolean;
  /** Formules LaTeX pour l'affichage. */
  lawLatex: string;
  pLatex?: string;
  regionLatex: string;
  rCode: string;
}

/** Vérifie les paramètres ; renvoie un message d'erreur, ou null. */
export function validate(input: PValueInput): string | null {
  const law = LAW_BY_ID.get(input.law);
  if (!law) return 'Loi inconnue.';
  for (const [i, def] of law.params.entries()) {
    const v = input.params[i];
    if (!Number.isFinite(v)) return `Paramètre ${def.key} manquant.`;
    if (v <= def.min) return `Le paramètre ${def.key} doit être strictement positif.`;
    if (def.integer && !Number.isInteger(v)) return `Le paramètre ${def.key} est un nombre entier de degrés de liberté.`;
    if (v > 1e6) return `Le paramètre ${def.key} est trop grand.`;
  }
  if (!(input.alpha > 0 && input.alpha < 1)) return 'Le seuil α doit être strictement entre 0 et 1 (ex. 0,05).';
  if (input.x !== undefined && !Number.isFinite(input.x)) return 'La valeur observée doit être un nombre.';
  return null;
}


export function solvePValue(input: PValueInput): PValueResult {
  const law = LAW_BY_ID.get(input.law)!;
  const { params, alpha, tail, x } = input;
  const cdf = (v: number) => law.cdf(v, params);
  const orders = tail === 'two' ? [alpha / 2, 1 - alpha / 2] : tail === 'right' ? [1 - alpha] : [alpha];
  const critical = orders.map((o) => quantile(law, params, o));
  const L = law.latex(params);
  const X = 'X';

  let pValue: number | undefined;
  let pLatex: string | undefined;
  if (x !== undefined) {
    const xs = texFixed(x, 4).replace(/0+$/, '').replace(/\{,\}$/, '');
    if (tail === 'right') {
      pValue = 1 - cdf(x);
      pLatex = `p = P(${X} \\geq ${xs}) = 1 - F(${xs})`;
    } else if (tail === 'left') {
      pValue = cdf(x);
      pLatex = `p = P(${X} \\leq ${xs}) = F(${xs})`;
    } else {
      const lower = cdf(x);
      pValue = Math.min(1, 2 * Math.min(lower, 1 - lower));
      // loi symétrique par rapport à 0 : on double la queue au-delà de |x| ; sinon, la plus petite des deux queues
      const centred = law.id === 'student' || (law.id === 'normal' && params[0] === 0);
      pLatex = centred ? `p = 2\\,P(${X} \\geq |${xs}|)` : `p = 2\\min\\big(P(${X} \\leq ${xs}),\\, P(${X} \\geq ${xs})\\big)`;
    }
    pValue = Math.max(0, Math.min(1, pValue));
  }

  const c = critical.map((v) => texFixed(v, 3));
  const regionLatex =
    tail === 'right' ? `[\\,${c[0]}\\,;\\,+\\infty[` : tail === 'left' ? (law.positive ? `[\\,0\\,;\\,${c[0]}\\,]` : `]-\\infty\\,;\\,${c[0]}\\,]`) : `${law.positive ? `[\\,0` : `]-\\infty`}\\,;\\,${c[0]}\\,] \\cup [\\,${c[1]}\\,;\\,+\\infty[`;

  const a = law.r.args(params);
  const rLines = orders.map((o) => `${law.r.q}(${rNum(o)}${a})   # quantile d’ordre ${rNum(o)}`);
  if (x !== undefined) {
    const xr = rNum(x);
    if (tail === 'right') rLines.unshift(`1 - ${law.r.p}(${xr}${a})   # p-valeur`);
    else if (tail === 'left') rLines.unshift(`${law.r.p}(${xr}${a})   # p-valeur`);
    else rLines.unshift(`2 * min(${law.r.p}(${xr}${a}), 1 - ${law.r.p}(${xr}${a}))   # p-valeur`);
  }

  return {
    law,
    params,
    alpha,
    tail,
    x,
    pValue,
    critical,
    orders,
    reject: pValue === undefined ? undefined : pValue < alpha,
    lawLatex: L,
    pLatex,
    regionLatex,
    rCode: rLines.join('\n'),
  };
}

/** Phrase de conclusion au seuil α. */
export function conclusion(r: PValueResult): string {
  if (r.pValue === undefined) return `On rejette $H_0$ au seuil $${texPercent(r.alpha)}$ si la statistique tombe dans la région de rejet.`;
  return r.reject
    ? `$p < ${texNum(r.alpha, 4)}$ : la valeur observée est dans la région de rejet, on **rejette** $H_0$ au seuil $${texPercent(r.alpha)}$.`
    : `$p \\geq ${texNum(r.alpha, 4)}$ : la valeur observée n’est pas dans la région de rejet, on **ne rejette pas** $H_0$ au seuil $${texPercent(r.alpha)}$.`;
}

/**
 * Fenêtre d'affichage de la densité : la quasi-totalité de la masse, élargie
 * pour montrer les seuils et la valeur observée (sans écraser la courbe si
 * cette valeur est très extrême : elle est alors signalée au bord).
 */
export function plotRange(r: PValueResult): [number, number] {
  const { law, params } = r;
  const lo0 = law.positive ? 0 : quantile(law, params, 0.001);
  const hi0 = quantile(law, params, law.positive ? 0.998 : 0.999);
  const width = hi0 - lo0;
  const pad = 0.06 * width;
  let lo = lo0;
  let hi = hi0;
  for (const v of [...r.critical, ...(r.x !== undefined ? [r.x] : [])]) {
    hi = Math.max(hi, Math.min(v + pad, hi0 + width));
    if (!law.positive) lo = Math.min(lo, Math.max(v - pad, lo0 - width));
  }
  return [lo, hi];
}

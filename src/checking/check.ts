import type { Expr } from '../core/expr/ast';
import { evaluate, hasVar } from '../core/expr/evaluate';
import { parse, ParseError } from '../core/expr/parse';
import { Rng } from '../core/random/prng';
import type { Arrow, ChoiceQuestion, ExpressionQuestion, Mark, NumberQuestion, RootsQuestion, Sign, TableData, TableQuestion, ValueAnswer, ValueQuestion } from '../exercises/types';

export type Status = 'correct' | 'partial' | 'incorrect' | 'invalid';

export interface CheckResult {
  status: Status;
  message?: string;
  /** Identifiants des cellules fausses d'un tableau (« r0s1 », « r2m1 », « r3a0 »). */
  wrongCells?: string[];
}

const TOL = 1e-6;

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOL * Math.max(1, Math.abs(b));
}

/** Points de test déterministes où l'expression attendue est définie. */
export function testPoints(expected: Expr, [lo, hi]: [number, number], count = 12): number[] {
  const rng = new Rng(20240917);
  const pts: number[] = [];
  for (let i = 0; i < 400 && pts.length < count; i++) {
    const x = lo + (hi - lo) * rng.next();
    const v = evaluate(expected, x);
    if (Number.isFinite(v) && Math.abs(v) < 1e9) pts.push(x);
  }
  return pts;
}

export function equivalent(a: Expr, b: Expr, points: number[]): boolean {
  return points.length > 0 && points.every((x) => {
    const va = evaluate(a, x);
    return Number.isFinite(va) && close(va, evaluate(b, x));
  });
}

function tryParse(input: string): Expr | CheckResult {
  try {
    return parse(input);
  } catch (e) {
    if (e instanceof ParseError) return { status: 'invalid', message: e.message };
    throw e;
  }
}

const isResult = (v: unknown): v is CheckResult => typeof v === 'object' && v !== null && 'status' in v;

// ——————————————————————————————————— Expressions

export function checkExpression(input: string, q: ExpressionQuestion): CheckResult {
  const parsed = tryParse(input);
  if (isResult(parsed)) return parsed;
  const pts = testPoints(q.expected, q.domain);
  if (equivalent(parsed, q.expected, pts)) return { status: 'correct', message: 'Bonne réponse !' };
  const mistake = q.mistakes?.find((m) => equivalent(parsed, m.expr, pts));
  if (mistake) return { status: 'incorrect', message: mistake.message };
  return { status: 'incorrect', message: 'Ce n’est pas la bonne expression. Vérifie tes calculs (un indice est disponible).' };
}

// ——————————————————————————————————— Valeurs et limites

export type ParsedValue = { kind: 'finite'; value: number } | { kind: 'infinity'; sign: 1 | -1 } | { kind: 'none' };

export function parseValue(input: string): ParsedValue | CheckResult {
  const s = input.trim().toLowerCase().replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (!s) return { status: 'invalid', message: 'Réponse vide' };
  const inf = /^([+-]?)(∞|inf|infini|infinity|oo)$/.exec(s);
  if (inf) return { kind: 'infinity', sign: inf[1] === '-' ? -1 : 1 };
  if (/^(n'?existepas|nexistepas|∄|aucune|dne)$/.test(s.replace(/’/g, "'"))) return { kind: 'none' };
  const parsed = tryParse(input);
  if (isResult(parsed)) return parsed;
  if (hasVar(parsed)) return { status: 'invalid', message: 'La réponse doit être un nombre, sans x.' };
  const value = evaluate(parsed, 0);
  if (!Number.isFinite(value)) return { status: 'invalid', message: 'Ce nombre n’est pas défini.' };
  return { kind: 'finite', value };
}

function sameValue(p: ParsedValue, v: ValueAnswer): boolean {
  if (p.kind !== v.kind) return false;
  if (p.kind === 'infinity' && v.kind === 'infinity') return p.sign === v.sign;
  if (p.kind === 'finite' && v.kind === 'finite') return close(p.value, evaluate(v.expr, 0));
  return true;
}

export function checkValue(input: string, q: ValueQuestion): CheckResult {
  const p = parseValue(input);
  if (isResult(p)) return p;
  if (sameValue(p, q.expected)) return { status: 'correct', message: 'Bonne réponse !' };
  const mistake = q.mistakes?.find((m) => sameValue(p, m.answer));
  if (mistake) return { status: 'incorrect', message: mistake.message };
  if (q.expected.kind === 'infinity' && p.kind === 'infinity') return { status: 'incorrect', message: 'Bonne idée (limite infinie), mais le signe est faux.' };
  if (q.expected.kind === 'finite' && p.kind === 'infinity') return { status: 'incorrect', message: 'La limite est finie ici. Cherche une forme indéterminée à lever.' };
  return { status: 'incorrect', message: 'Ce n’est pas la bonne valeur.' };
}

// ——————————————————————————————————— Racines

export function checkRoots(input: string, q: RootsQuestion): CheckResult {
  const s = input.trim().toLowerCase();
  const empty = s === '' ? null : /^(aucune|aucun|pas de solution|∅|vide|rien)$/.test(s);
  if (empty === null) return { status: 'invalid', message: 'Réponse vide (écris « aucune » s’il n’y a pas de solution).' };
  const values: number[] = [];
  if (!empty) {
    for (const part of s.split(/;|\bet\b/).map((p) => p.trim()).filter(Boolean)) {
      const p = parseValue(part);
      if (isResult(p)) return { status: 'invalid', message: `« ${part} » : ${p.message}` };
      if (p.kind !== 'finite') return { status: 'invalid', message: `« ${part} » n’est pas un nombre.` };
      if (!values.some((v) => close(v, p.value))) values.push(p.value);
    }
  }
  const found = q.expected.filter((e) => values.some((v) => close(v, e))).length;
  const extra = values.filter((v) => !q.expected.some((e) => close(v, e))).length;
  if (found === q.expected.length && extra === 0) return { status: 'correct', message: 'Bonne réponse !' };
  if (q.expected.length === 0) return { status: 'incorrect', message: 'Il n’y a aucune solution ici.' };
  if (found > 0) {
    return {
      status: 'partial',
      message: `${found} valeur${found > 1 ? 's' : ''} correcte${found > 1 ? 's' : ''} sur ${q.expected.length}${extra ? `, et ${extra} valeur${extra > 1 ? 's' : ''} en trop` : ''}. Sépare les valeurs par « ; ».`,
    };
  }
  return { status: 'incorrect', message: values.length ? 'Aucune de ces valeurs ne convient.' : 'Il y a au moins une solution.' };
}

// ——————————————————————————————————— Valeurs numériques approchées (statistiques)

/**
 * Nombre décimal saisi par l'élève : virgule ou point, espaces de milliers,
 * notation scientifique (1,2e-3, 1.2E-3), ou calcul simple (« 22/3 »).
 */
export function parseNumber(input: string): number | CheckResult {
  const s = input.trim().replace(/[\s  ]/g, '').replace(/[−–]/g, '-');
  if (!s) return { status: 'invalid', message: 'Réponse vide' };
  const dec = s.replace(/,/g, '.');
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(dec)) return Number(dec);
  if (/%$/.test(dec)) return { status: 'invalid', message: 'Écris la valeur sans « % » (ex. 0,05 plutôt que 5 %).' };
  const parsed = tryParse(dec);
  if (isResult(parsed)) return { status: 'invalid', message: 'Écris un nombre, par exemple 3,84 ou 0,047.' };
  if (hasVar(parsed)) return { status: 'invalid', message: 'La réponse doit être un nombre.' };
  const v = evaluate(parsed, 0);
  return Number.isFinite(v) ? v : { status: 'invalid', message: 'Ce nombre n’est pas défini.' };
}

export function checkNumber(input: string, q: NumberQuestion): CheckResult {
  const v = parseNumber(input);
  if (isResult(v)) return v;
  if (Math.abs(v - q.expected) <= q.tolerance) return { status: 'correct', message: 'Bonne réponse !' };
  const mistake = q.mistakes?.find((m) => Math.abs(v - m.value) <= q.tolerance);
  if (mistake) return { status: 'incorrect', message: mistake.message };
  if (Math.abs(v - q.expected) <= 5 * q.tolerance) return { status: 'partial', message: 'C’est proche : vérifie tes arrondis (garde plus de décimales dans les calculs intermédiaires).' };
  return { status: 'incorrect', message: 'Ce n’est pas la bonne valeur. Reprends le calcul étape par étape (le coup de pouce peut aider).' };
}

// ——————————————————————————————————— Choix

/** Réponse saisie : l'indice de la proposition choisie, en texte. */
export function checkChoice(input: string, q: ChoiceQuestion): CheckResult {
  const i = input.trim() === '' ? NaN : Number(input);
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return { status: 'invalid', message: 'Choisis une proposition.' };
  if (i === q.expected) return { status: 'correct', message: 'Bonne réponse !' };
  return { status: 'incorrect', message: q.feedback?.[i] ?? 'Ce n’est pas la bonne proposition.' };
}

// ——————————————————————————————————— Tableaux

export interface TableAnswerRow {
  signs?: (Sign | '')[];
  marks?: Mark[];
  arrows?: (Arrow | '')[];
}

export type TableAnswer = TableAnswerRow[];

export function emptyTableAnswer(t: TableData): TableAnswer {
  return t.rows.map((r) =>
    r.kind === 'sign'
      ? { signs: r.signs.map(() => '' as const), marks: r.marks.map(() => '' as Mark) }
      : { arrows: r.arrows.map(() => '' as const) },
  );
}

export function checkTable(answer: TableAnswer, q: TableQuestion): CheckResult {
  const wrong: string[] = [];
  let total = 0;
  let filled = 0;
  q.expected.rows.forEach((row, i) => {
    const a = answer[i] ?? {};
    if (row.kind === 'sign') {
      row.signs.forEach((s, j) => {
        total++;
        if (a.signs?.[j]) filled++;
        if (a.signs?.[j] !== s) wrong.push(`r${i}s${j}`);
      });
      // Seules les valeurs intérieures portent une marque (0 ou ||)
      for (let j = 1; j < row.marks.length - 1; j++) {
        total++;
        if (a.marks?.[j]) filled++;
        if ((a.marks?.[j] ?? '') !== row.marks[j]) wrong.push(`r${i}m${j}`);
      }
    } else {
      row.arrows.forEach((ar, j) => {
        total++;
        if (a.arrows?.[j]) filled++;
        if (a.arrows?.[j] !== ar) wrong.push(`r${i}a${j}`);
      });
    }
  });
  if (filled === 0) return { status: 'invalid', message: 'Le tableau est vide : clique sur les cases pour les remplir.' };
  if (wrong.length === 0) return { status: 'correct', message: 'Tableau correct !' };
  const ok = total - wrong.length;
  return {
    status: ok >= total / 2 ? 'partial' : 'incorrect',
    message: `${ok} case${ok > 1 ? 's' : ''} correcte${ok > 1 ? 's' : ''} sur ${total}. Les cases fausses sont en rouge.`,
    wrongCells: wrong,
  };
}

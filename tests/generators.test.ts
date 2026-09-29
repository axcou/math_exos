import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { checkExpression, checkTable, checkValue, equivalent, testPoints } from '../src/checking/check';
import { evaluate } from '../src/core/expr/evaluate';
import { generateExercise, TEMPLATES } from '../src/exercises/registry';
import type { Exercise, ExerciseMeta, TableData } from '../src/exercises/types';

const SEEDS = Array.from({ length: 150 }, (_, i) => (i * 2654435761) >>> 0);

function renderOk(latex: string) {
  katex.renderToString(latex, { throwOnError: true, displayMode: true });
}

function allLatex(ex: Exercise): string[] {
  const inline = (s?: string) => [...(s ?? '').matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
  const out: string[] = [...inline(ex.statement)];
  const tables: TableData[] = [];
  for (const q of ex.questions) {
    out.push(...inline(q.prompt));
    if (q.label) out.push(q.label);
    if (q.type === 'expression') out.push(q.expectedLatex);
    if (q.type === 'roots') out.push(...q.expectedLatex);
    if (q.type === 'table') tables.push(q.expected);
    if (q.type === 'expression') q.mistakes?.forEach((m) => out.push(...inline(m.message)));
  }
  for (const s of ex.steps) {
    out.push(...inline(s.title), ...inline(s.text));
    if (s.math) out.push(s.math);
    if (s.table) tables.push(s.table);
  }
  for (const t of tables) {
    out.push(...t.xs);
    for (const r of t.rows) {
      out.push(r.label);
      if (r.kind === 'variation') r.values.forEach((v) => v && out.push(v));
    }
  }
  return out;
}

const numDeriv = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

function checkMeta(m: ExerciseMeta, ex: Exercise) {
  const ctx = `${ex.uid} ${ex.statement}`;
  if (m.kind === 'derivative') {
    const pts = testPoints(m.df, m.domain);
    expect(pts.length, ctx).toBeGreaterThanOrEqual(8);
    for (const x of pts) {
      const fx = (t: number) => evaluate(m.f, t);
      if (!Number.isFinite(fx(x - 1e-4)) || !Number.isFinite(fx(x + 1e-4))) continue;
      const d = numDeriv(fx, x);
      const v = evaluate(m.df, x);
      expect(Math.abs(d - v), `${ctx} en x=${x}`).toBeLessThan(1e-4 * Math.max(1, Math.abs(v)));
    }
  }
  if (m.kind === 'limit') {
    const q = ex.questions.find((q) => q.type === 'value' && q.label?.includes(m.side ? `^{${m.side > 0 ? '+' : '-'}}` : ''));
    if (!q || q.type !== 'value') throw new Error('question limite introuvable');
    const exp = q.expected;
    const f = (x: number) => evaluate(m.f, x);
    const near = (k: number): number[] => {
      if (m.at === '+inf') return [10 ** (2 + k)];
      if (m.at === '-inf') return [-(10 ** (2 + k))];
      const sides = m.side ? [m.side] : [1, -1];
      return sides.map((s) => m.at as number + s * 10 ** -(3 + 2 * k));
    };
    if (exp.kind === 'finite') {
      const l = evaluate(exp.expr, 0);
      for (const x of near(3)) expect(Math.abs(f(x) - l), `${ctx} x=${x}`).toBeLessThan(1e-2 * Math.max(1, Math.abs(l)));
    } else if (exp.kind === 'infinity') {
      const a = near(0).map(f);
      const b = near(1).map(f);
      a.forEach((va, i) => {
        expect(Math.sign(b[i]), ctx).toBe(exp.sign);
        expect(Math.abs(b[i]), ctx).toBeGreaterThanOrEqual(Math.abs(va));
      });
    }
  }
  if (m.kind === 'table') {
    const tables = ex.questions.flatMap((q) => (q.type === 'table' ? [q.expected] : []));
    const f = (x: number) => evaluate(m.f, x);
    const df = (x: number) => (m.df ? evaluate(m.df, x) : numDeriv(f, x));
    for (const t of tables) {
      const xv = t.xv;
      expect(xv.length, ctx).toBe(t.xs.length);
      const insidePoints = (i: number) => {
        const [a, b] = [xv[i], xv[i + 1]];
        if (a === -Infinity && b === Infinity) return [-7, -1.3, 0.4, 2.2, 8];
        if (a === -Infinity) return [b - 6, b - 2.5, b - 0.3];
        if (b === Infinity) return [a + 0.3, a + 2.5, a + 6];
        return [0.1, 0.5, 0.9].map((t) => a + (b - a) * t);
      };
      for (const row of t.rows) {
        const g = row.label === 'f(x)' ? f : row.label === "f'(x)" ? df : row.kind === 'variation' ? f : null;
        if (!g) continue;
        for (let i = 0; i < xv.length - 1; i++) {
          const pts = insidePoints(i);
          if (row.kind === 'sign') {
            for (const x of pts) expect(Math.sign(g(x)), `${ctx} ${row.label} intervalle ${i} x=${x}`).toBe(row.signs[i] === '+' ? 1 : -1);
          } else {
            const [p, q] = [pts[0], pts[pts.length - 1]];
            expect(Math.sign(g(q) - g(p)), `${ctx} variations intervalle ${i}`).toBe(row.arrows[i] === 'up' ? 1 : -1);
          }
        }
        if (row.kind === 'sign') {
          for (let j = 1; j < xv.length - 1; j++) {
            const v = g(xv[j]);
            if (row.marks[j] === '0') expect(Math.abs(v), `${ctx} zéro en ${xv[j]}`).toBeLessThan(1e-7);
            if (row.marks[j] === '||') expect(!Number.isFinite(v) || Math.abs(v) > 1e6, `${ctx} interdite en ${xv[j]}`).toBe(true);
          }
        }
      }
    }
  }
}

describe.each(TEMPLATES.map((t) => [t.code, t] as const))('template %s', (_code, template) => {
  it('génère des exercices justes et affichables', () => {
    const statements = new Set<string>();
    for (const seed of SEEDS) {
      const ex = generateExercise(template, seed);
      statements.add(ex.signature);
      for (const l of allLatex(ex)) {
        try {
          renderOk(l);
        } catch (e) {
          throw new Error(`${ex.uid} LaTeX invalide : ${l}\n${e}`);
        }
      }
      for (const m of ex.meta) checkMeta(m, ex);
      for (const q of ex.questions) {
        if (q.type === 'expression') {
          const pts = testPoints(q.expected, q.domain);
          for (const mk of q.mistakes ?? []) {
            expect(equivalent(mk.expr, q.expected, pts), `${ex.uid} erreur type identique à la réponse`).toBe(false);
          }
        }
        if (q.type === 'table') {
          const ok = checkTable(
            q.expected.rows.map((r) => (r.kind === 'sign' ? { signs: r.signs, marks: r.marks } : { arrows: r.arrows })),
            q,
          );
          expect(ok.status, ex.uid).toBe('correct');
        }
        if (q.type === 'value' && q.expected.kind === 'finite') {
          // la valeur attendue, recopiée en texte simple, doit être acceptée
          const v = evaluate(q.expected.expr, 0);
          expect(checkValue(String(v), q).status, ex.uid).toBe('correct');
        }
      }
    }
    // Version en 3 parties : données distinctes et LaTeX valide
    for (const seed of SEEDS.slice(0, 20)) {
      const ex = generateExercise(template, seed, 3);
      expect(new Set(ex.parts.map((p) => p.item + p.questions.map((q) => q.prompt).join())).size, ex.uid).toBe(3);
      for (const p of ex.parts) for (const m of p.item.matchAll(/\$([^$]+)\$/g)) renderOk(m[1]);
    }
    // Variété : les graines donnent des énoncés différents
    expect(statements.size).toBeGreaterThan(SEEDS.length / 5);
  });
});

describe('checkExpression', () => {
  const t = TEMPLATES.find((t) => t.code === 'D05')!;
  it('accepte les formes équivalentes et détecte les erreurs classiques', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const ex = generateExercise(t, seed);
      const q = ex.questions[0];
      if (q.type !== 'expression') throw new Error();
      // on reconstruit la réponse : k / (cx+d)^2 avec k = numérateur
      const m = /^(-?)\\frac\{(\d+)\}\{\((.*)\)\^\{2\}\}$/.exec(q.expectedLatex);
      if (!m) continue;
      const [, s, k, den] = m;
      const plain = den.replace(/ /g, '');
      expect(checkExpression(`${s}${k}/(${plain})^2`, q).status).toBe('correct');
      expect(checkExpression(`${s}${k}/((${plain})(${plain}))`, q).status).toBe('correct');
      expect(checkExpression(`${s === '-' ? '' : '-'}${k}/(${plain})^2`, q).message).toMatch(/ordre/);
      expect(checkExpression(`${s}${k}/(${plain})`, q).message).toMatch(/carré/);
      expect(checkExpression(`${s}${k}/(${plain}`, q).status).toBe('invalid');
    }
  });
});

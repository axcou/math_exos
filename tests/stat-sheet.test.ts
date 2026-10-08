import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { FORMULA_BY_ID } from '../src/formulas/formulas';
import { METHODS } from '../src/methods/methods';
import { FISHER_TABLE, NORMAL_TABLE, STAT_METHOD_ORDER, STAT_SHEET_METHODS, STUDENT_TABLE } from '../src/methods/statSheet';
import type { DataTable } from '../src/exercises/types';

const inline = (s?: string) => [...(s ?? '').matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
const render = (l: string) => katex.renderToString(l, { throwOnError: true, displayMode: true });
const num = (s: string) => Number(s.replace(',', '.'));
/** Valeurs d'une ligne de tableau (sans l'intitulé). */
const row = (t: DataTable, head: string) => t.rows.find((r) => r[0] === head)!.slice(1).map(num);

describe('fiche « tests d’hypothèses » : contenu', () => {
  it('toutes les formules, légendes, régions et tableaux s’affichent', () => {
    for (const m of STAT_SHEET_METHODS) {
      for (const t of [m.when, ...m.steps, ...(m.pitfalls ?? [])]) inline(t).forEach(render);
      for (const b of m.blocks ?? []) {
        inline(b.title).forEach(render);
        inline(b.text).forEach(render);
        for (const f of b.formulas ?? []) {
          render(f.latex);
          inline(f.caption).forEach(render);
        }
      }
      for (const r of m.rejection ?? []) {
        render(r.h0);
        render(r.region);
        r.pvalues.forEach((p) => render(p.latex));
      }
      for (const t of m.tables ?? []) for (const c of [t.caption ?? '', ...t.header, ...t.rows.flat()]) inline(c).forEach(render);
      for (const f of m.formulas ?? []) expect(FORMULA_BY_ID.has(f), f).toBe(true);
    }
  });

  it('le schéma de rejet suit H0 : ≥ à gauche, = des deux côtés, ≤ à droite', () => {
    const cases = STAT_SHEET_METHODS.flatMap((m) => m.rejection ?? []);
    expect(cases).toHaveLength(6);
    for (const c of cases) {
      const tail = c.h0.includes('\\geqslant') ? 'left' : c.h0.includes('\\leqslant') ? 'right' : 'two';
      expect(c.tail, c.h0).toBe(tail);
      expect(c.region.includes('\\cup'), c.h0).toBe(tail === 'two');
      // la p-valeur unilatérale regarde la queue de la région de rejet
      const normal = c.pvalues.find((p) => p.law === 'Normale')!.latex;
      if (tail === 'left') expect(normal).toMatch(/^p = \\Phi/);
      if (tail === 'right') expect(normal).toMatch(/^p = 1 - \\Phi/);
      if (tail === 'two') expect(normal).toMatch(/^p = 2/);
    }
  });

  it('les fiches du chapitre suivent l’ordre du cours', () => {
    const ids = METHODS.filter((m) => m.theme === 'stat').map((m) => m.id);
    expect(ids).toEqual(STAT_METHOD_ORDER);
  });
});

describe('fiche « tests d’hypothèses » : tables de référence', () => {
  it('loi normale : valeurs de la fiche', () => {
    expect(row(NORMAL_TABLE, '$q_{1-\\alpha/2}$')).toEqual([1.282, 1.645, 1.96, 2.326, 2.576, 3.291]);
    // unilatéral : la fiche recopie 3,291 pour α = 0,001 ; la bonne valeur est q(0,999) = 3,090
    expect(row(NORMAL_TABLE, '$q_{1-\\alpha}$')).toEqual([1.282, 1.645, 1.96, 2.326, 2.576, 3.09]);
  });

  it('loi de Student : valeurs de la fiche', () => {
    const sheet: Record<string, number[]> = {
      '1': [3.078, 6.314, 12.706, 31.821, 63.657, 318.309],
      '2': [1.886, 2.92, 4.303, 6.965, 9.925, 22.327],
      '3': [1.638, 2.353, 3.182, 4.541, 5.841, 10.215],
      '4': [1.533, 2.132, 2.776, 3.747, 4.604, 7.173],
      '5': [1.476, 2.015, 2.571, 3.365, 4.032, 5.893],
      '6': [1.44, 1.943, 2.447, 3.143, 3.707, 5.208],
      '8': [1.397, 1.86, 2.306, 2.896, 3.355, 4.501],
      '10': [1.372, 1.812, 2.228, 2.764, 3.169, 4.144],
      '15': [1.341, 1.753, 2.131, 2.602, 2.947, 3.733],
      '20': [1.325, 1.725, 2.086, 2.528, 2.845, 3.552],
      '30': [1.31, 1.697, 2.042, 2.457, 2.75, 3.385],
      '$\\infty$': [1.282, 1.645, 1.96, 2.326, 2.576, 3.09],
    };
    for (const [nu, values] of Object.entries(sheet)) expect(row(STUDENT_TABLE, nu), `ν = ${nu}`).toEqual(values);
  });

  it('loi de Fisher (5 %) : lignes de la fiche et valeurs publiées', () => {
    const close = (got: number[], want: number[], ctx: string) => got.forEach((g, i) => expect(Math.abs(g - want[i]), `${ctx} colonne ${i}`).toBeLessThan(0.006 * want[i]));
    // lignes justes sur la fiche
    close(row(FISHER_TABLE, '1'), [161.4, 18.51, 10.13, 6.61, 4.96, 4.17], 'd1 = 1');
    close(row(FISHER_TABLE, '2'), [199.5, 19.0, 9.55, 5.79, 4.1, 3.32], 'd1 = 2');
    close(row(FISHER_TABLE, '3'), [215.7, 19.16, 9.28, 5.41, 3.71, 2.92], 'd1 = 3');
    close(row(FISHER_TABLE, '5'), [230.2, 19.3, 9.01, 5.05, 3.33, 2.53], 'd1 = 5');
    // lignes fausses sur la fiche : valeurs des tables publiées
    close(row(FISHER_TABLE, '10'), [241.9, 19.4, 8.79, 4.74, 2.98, 2.16], 'd1 = 10');
    close(row(FISHER_TABLE, '20'), [248.0, 19.45, 8.66, 4.56, 2.77, 1.93], 'd1 = 20');
    close(row(FISHER_TABLE, '30'), [250.1, 19.46, 8.62, 4.5, 2.7, 1.84], 'd1 = 30');
    close(row(FISHER_TABLE, '$\\infty$'), [254.3, 19.5, 8.53, 4.36, 2.54, 1.62], 'd1 = ∞');
  });
});

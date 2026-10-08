import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { checkChoice, checkNumber } from '../src/checking/check';
import { anova, contingency, goodnessOfFit, twoProportions } from '../src/core/stats/hypothesisTests';
import { exerciseFromUid, generateExercise, SUBTYPE_LABELS, subtypesOf, TEMPLATE_BY_CODE, templatesFor } from '../src/exercises/registry';
import { STAT_TEMPLATES } from '../src/exercises/stats/templates';
import type { ChoiceQuestion, DataTable, Exercise, NumberQuestion, Question } from '../src/exercises/types';
import { THEMES } from '../src/exercises/types';
import { METHOD_FOR_SUBTYPE } from '../src/methods/methods';

const SEEDS = Array.from({ length: 60 }, (_, i) => (i * 2654435761 + 99) >>> 0);
const ALL = STAT_TEMPLATES.flatMap((t) => SEEDS.map((s) => generateExercise(t, s)));

const numbers = (ex: Exercise) => ex.questions.filter((q): q is NumberQuestion => q.type === 'number');
const choices = (ex: Exercise) => ex.questions.filter((q): q is ChoiceQuestion => q.type === 'choice');
const byLabel = (ex: Exercise, label: string) => numbers(ex).filter((q) => q.label === label);
const inline = (s?: string) => [...(s ?? '').matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
const int = (s: string) => {
  const v = Number(s);
  if (!Number.isInteger(v)) throw new Error(`cellule non entière : ${s}`);
  return v;
};
const decimal = (s: string) => Number(s.replace(',', '.'));
/** Seuil lu dans la consigne « Décision au seuil de signification $5\,\%$ ». */
const alphaOf = (q: Question) => Number(/\$([\d{},]+)\\,\\%\$/.exec(q.prompt)![1].replace('{,}', '.')) / 100;
const isDecision = (q: Question): q is ChoiceQuestion => q.type === 'choice' && q.prompt.startsWith('Décision au seuil');

/** Les données de l'énoncé, relues dans les tableaux affichés à l'élève. */
function shownCounts(t: DataTable): number[] {
  const row = t.rows.find((r) => r[0].startsWith('Effectif'))!;
  return row.slice(1, t.totalCol ? -1 : undefined).map(int);
}
function shownContingency(t: DataTable): number[][] {
  return t.rows.slice(0, -1).map((r) => r.slice(1, -1).map(int));
}

describe('tests statistiques : registre', () => {
  it('8 modèles du chapitre « stat », hors des chapitres d’analyse', () => {
    expect(STAT_TEMPLATES.map((t) => t.code)).toEqual(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08']);
    expect(STAT_TEMPLATES.every((t) => t.theme === 'stat')).toBe(true);
    expect(THEMES).not.toContain('stat');
    expect(templatesFor('stat')).toHaveLength(8);
    for (const level of [1, 2, 3] as const) expect(templatesFor('stat', level).length).toBeGreaterThan(0);
  });

  it('chaque type de test a un libellé et une fiche méthode', () => {
    for (const s of subtypesOf('stat')) {
      expect(SUBTYPE_LABELS[s], s).toBeTruthy();
      expect(METHOD_FOR_SUBTYPE[s], s).toMatch(/^test-/);
    }
  });

  it('reproductible : même graine, même énoncé et mêmes réponses (liens de partage)', () => {
    for (const t of STAT_TEMPLATES) {
      for (const seed of SEEDS.slice(0, 10)) {
        const a = generateExercise(t, seed);
        const b = exerciseFromUid(a.uid)!;
        expect(b.signature).toBe(a.signature);
        expect(JSON.stringify(b.tables)).toBe(JSON.stringify(a.tables));
        expect(b.questions.map((q) => (q.type === 'number' ? q.expected : q.type === 'choice' ? q.expected : 0))).toEqual(
          a.questions.map((q) => (q.type === 'number' ? q.expected : q.type === 'choice' ? q.expected : 0)),
        );
      }
    }
  });

  it('les données changent d’une graine à l’autre', () => {
    for (const t of STAT_TEMPLATES) {
      const keys = new Set(SEEDS.map((s) => JSON.stringify(generateExercise(t, s).tables)));
      expect(keys.size, t.code).toBeGreaterThan(SEEDS.length * 0.9);
    }
  });
});

describe('tests statistiques : réponses recalculées depuis l’énoncé', () => {
  it('S01 : proportions, statistique, p-valeurs et intervalle', () => {
    for (const ex of ALL.filter((e) => e.code === 'S01')) {
      const [yes, no] = ex.tables![0].rows.map((r) => r.slice(1).map(int));
      const t = twoProportions(yes[0], yes[0] + no[0], yes[1], yes[1] + no[1]);
      expect(byLabel(ex, 'z =')[0].expected).toBeCloseTo(t.z, 10);
      const [bil, uni] = byLabel(ex, 'p\\text{-valeur} =');
      expect(bil.expected).toBeCloseTo(t.pBilateral, 10);
      expect(uni.expected).toBeCloseTo(t.pGreater, 10);
      expect(byLabel(ex, '\\text{borne inf.} =')[0].expected).toBeCloseTo(t.ci[0], 10);
      expect(byLabel(ex, '\\text{borne sup.} =')[0].expected).toBeCloseTo(t.ci[1], 10);
      // approximation normale légitime
      expect(Math.min(yes[0], no[0], yes[1], no[1])).toBeGreaterThanOrEqual(5);
      for (const q of ex.questions.filter(isDecision)) expect(q.expected, ex.uid).toBe(t.pBilateral < alphaOf(q) ? 0 : 1);
    }
  });

  it('S02, S03 : adéquation sans paramètre estimé', () => {
    for (const ex of ALL.filter((e) => e.code === 'S02' || e.code === 'S03')) {
      const observed = shownCounts(ex.tables![0]);
      const announced = ex.tables![0].rows.find((r) => r[0] === 'Proportion annoncée');
      const probs = announced ? announced.slice(1, -1).map((p) => decimal(p.replace(' %', '')) / 100) : observed.map(() => 1 / observed.length);
      expect(probs.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
      const g = goodnessOfFit(observed, probs);
      expect(byLabel(ex, 'T =')[0].expected).toBeCloseTo(g.statistic, 10);
      expect(byLabel(ex, 'p\\text{-valeur} =')[0].expected).toBeCloseTo(g.pValue, 10);
      expect(g.df).toBe(observed.length - 1);
      const ddl = byLabel(ex, '\\text{ddl} =')[0];
      if (ddl) expect(ddl.expected).toBe(g.df);
      expect(Math.min(...g.expected), ex.uid).toBeGreaterThanOrEqual(5);
      for (const q of ex.questions.filter(isDecision)) expect(q.expected, ex.uid).toBe(g.pValue < alphaOf(q) ? 0 : 1);
    }
  });

  it('S04 : loi de Poisson, λ estimé par la moyenne affichée', () => {
    for (const ex of ALL.filter((e) => e.code === 'S04')) {
      const m = ex.meta[0];
      if (m.kind !== 'stat') throw new Error();
      expect(shownCounts(ex.tables![0])).toEqual(m.observed);
      const lambda = decimal(/\\bar x = ([\d{},]+)\$/.exec(ex.statement)![1].replace('{,}', ','));
      // probabilités de Poisson recalculées avec la moyenne affichée
      const labels = ex.tables![0].header.slice(1, -1);
      const values = labels.map((l) => Number(/(\d+)/.exec(l)![1]));
      const pmf = (j: number) => Math.exp(j * Math.log(lambda) - lambda - [...Array(j).keys()].reduce((s, i) => s + Math.log(i + 1), 0));
      const cdf = (j: number) => [...Array(j + 1).keys()].reduce((s, i) => s + pmf(i), 0);
      const probs = values.map((v, i) => (i === 0 ? cdf(v) : i === values.length - 1 ? 1 - cdf(v - 1) : pmf(v)));
      probs.forEach((p, i) => expect(p).toBeCloseTo(m.probs![i], 10));
      const g = goodnessOfFit(m.observed!, probs, 1);
      expect(g.df).toBe(values.length - 2);
      expect(byLabel(ex, 'T =')[0].expected).toBeCloseTo(g.statistic, 8);
      expect(byLabel(ex, 'p\\text{-valeur} =')[0].expected).toBeCloseTo(g.pValue, 8);
      expect(Math.min(...g.expected), ex.uid).toBeGreaterThanOrEqual(5);
      expect(values.length).toBeGreaterThanOrEqual(4);
      for (const q of ex.questions.filter(isDecision)) expect(q.expected, ex.uid).toBe(g.pValue < alphaOf(q) ? 0 : 1);
    }
  });

  it('S05 : loi normale, μ et σ estimés sur les centres de classes', () => {
    for (const ex of ALL.filter((e) => e.code === 'S05')) {
      const observed = shownCounts(ex.tables![0]);
      const edges = ex.tables![0].header.slice(1, -1).map((h) => /\[([\d{},]+)\\,;\\,([\d{},]+)\[/.exec(h)!.slice(1, 3).map((x) => decimal(x.replace('{,}', ','))));
      const centers = edges.map(([a, b]) => (a + b) / 2);
      const n = observed.reduce((s, x) => s + x, 0);
      const mu = centers.reduce((s, c, i) => s + c * observed[i], 0) / n;
      const sd = Math.sqrt(centers.reduce((s, c, i) => s + observed[i] * (c - mu) ** 2, 0) / n);
      expect(byLabel(ex, '\\hat\\mu =')[0].expected).toBeCloseTo(mu, 10);
      expect(byLabel(ex, '\\hat\\sigma =')[0].expected).toBeCloseTo(sd, 10);
      const m = ex.meta[0];
      if (m.kind !== 'stat') throw new Error();
      expect(m.estimated).toBe(2);
      const g = goodnessOfFit(observed, m.probs!, 2);
      expect(m.probs!.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 10);
      expect(byLabel(ex, 'T =')[0].expected).toBeCloseTo(g.statistic, 10);
      expect(g.df).toBe(observed.length - 3);
      expect(Math.min(...g.expected), ex.uid).toBeGreaterThanOrEqual(5);
      for (const q of ex.questions.filter(isDecision)) expect(q.expected, ex.uid).toBe(g.pValue < alphaOf(q) ? 0 : 1);
    }
  });

  it('S06, S07 : tableaux de contingence (marges, effectifs théoriques, χ², ddl)', () => {
    for (const ex of ALL.filter((e) => e.code === 'S06' || e.code === 'S07')) {
      const t = ex.tables![0];
      const table = shownContingency(t);
      const c = contingency(table);
      // marges affichées justes
      t.rows.slice(0, -1).forEach((r, i) => expect(int(r[r.length - 1])).toBe(c.rowTotals[i]));
      expect(t.rows[t.rows.length - 1].slice(1).map(int)).toEqual([...c.colTotals, c.n]);
      expect(byLabel(ex, 'T =')[0].expected).toBeCloseTo(c.statistic, 10);
      expect(byLabel(ex, '\\text{ddl} =')[0].expected).toBe(c.df);
      expect(byLabel(ex, 'p\\text{-valeur} =')[0].expected).toBeCloseTo(c.pValue, 10);
      // l'effectif théorique demandé est celui d'une case du tableau
      const E = byLabel(ex, 'E =')[0].expected;
      expect(c.expected.flat().some((e) => Math.abs(e - E) < 1e-9)).toBe(true);
      expect(Math.min(...c.expected.flat()), ex.uid).toBeGreaterThanOrEqual(5);
      for (const q of ex.questions.filter(isDecision)) expect(q.expected, ex.uid).toBe(c.pValue < alphaOf(q) ? 0 : 1);
    }
  });

  it('S08 : ANOVA (moyenne générale, SCE, F, p-valeur)', () => {
    for (const ex of ALL.filter((e) => e.code === 'S08')) {
      const t = ex.tables![0];
      const groups = t.header.map((_, j) => t.rows.map((r) => r[j]).filter((x) => x !== '').map(decimal));
      const a = anova(groups);
      expect(byLabel(ex, '\\bar x =')[0].expected).toBeCloseTo(a.grandMean, 10);
      expect(byLabel(ex, 'SCE_{inter} =')[0].expected).toBeCloseTo(a.ssBetween, 8);
      expect(byLabel(ex, 'SCE_{intra} =')[0].expected).toBeCloseTo(a.ssWithin, 8);
      expect(byLabel(ex, 'F =')[0].expected).toBeCloseTo(a.F, 8);
      expect(byLabel(ex, 'p\\text{-valeur} =')[0].expected).toBeCloseTo(a.pValue, 8);
      const law = choices(ex).find((q) => q.prompt.includes('loi de $F$'))!;
      expect(law.options[law.expected]).toBe(`$\\mathcal{F}(${a.df1},\\, ${a.df2})$`);
      for (const g of groups) expect(g.length).toBeGreaterThanOrEqual(4);
      for (const q of ex.questions.filter(isDecision)) expect(q.expected, ex.uid).toBe(a.pValue < alphaOf(q) ? 0 : 1);
    }
  });

  it('lois asymptotiques : le bon nombre de degrés de liberté est proposé', () => {
    for (const ex of ALL.filter((e) => ['S02', 'S04', 'S05'].includes(e.code))) {
      const m = ex.meta[0];
      if (m.kind !== 'stat') throw new Error();
      const df = m.observed!.length - 1 - m.estimated!;
      const law = choices(ex).find((q) => q.prompt.includes('loi asymptotique'))!;
      expect(law.options[law.expected]).toBe(`$\\chi^2(${df})$`);
    }
  });
});

describe('tests statistiques : questions bien posées', () => {
  it('aucune décision ne dépend d’un arrondi de la p-valeur', () => {
    for (const ex of ALL) {
      const ps = byLabel(ex, 'p\\text{-valeur} =');
      for (const q of ex.questions.filter(isDecision)) {
        const a = alphaOf(q);
        // la p-valeur du test décidé est la première demandée
        expect(Math.abs(ps[0].expected - a), ex.uid).toBeGreaterThan(Math.max(ps[0].tolerance, 0.15 * a));
      }
    }
  });

  it('la bonne réponse, tapée comme un élève, est acceptée ; les erreurs classiques sont refusées', () => {
    for (const ex of ALL) {
      for (const q of numbers(ex)) {
        const typed = q.expected.toFixed(q.decimals).replace('.', ',');
        expect(checkNumber(typed, q).status, `${ex.uid} ${q.id} ${typed}`).toBe('correct');
        expect(checkNumber(q.expected.toFixed(q.decimals + 3), q).status).toBe('correct');
        expect(q.tolerance).toBeLessThanOrEqual(Math.max(0.05, Math.abs(q.expected) * 0.1));
        for (const m of q.mistakes ?? []) {
          const r = checkNumber(String(m.value), q);
          expect(r.status, `${ex.uid} ${q.id}`).toBe('incorrect');
          expect(r.message).toBe(m.message);
        }
      }
      for (const q of choices(ex)) {
        expect(new Set(q.options).size, ex.uid).toBe(q.options.length);
        expect(checkChoice(String(q.expected), q).status).toBe('correct');
        q.options.forEach((_, i) => {
          if (i === q.expected) return;
          expect(q.feedback?.[i], `${ex.uid} ${q.id} option ${i} sans explication`).toBeTruthy();
          expect(checkChoice(String(i), q).status).toBe('incorrect');
        });
      }
    }
  });

  it('les bonnes propositions ne sont pas toujours à la même place', () => {
    for (const t of STAT_TEMPLATES) {
      const exs = SEEDS.map((s) => generateExercise(t, s));
      const ids = new Set(choices(exs[0]).filter((q) => !q.prompt.startsWith('Décision au seuil')).map((q) => q.id));
      for (const id of ids) {
        const positions = new Set(exs.map((e) => (e.questions.find((q) => q.id === id) as ChoiceQuestion).expected));
        expect(positions.size, `${t.code} ${id}`).toBeGreaterThan(1);
      }
    }
  });

  it('tout le texte mathématique s’affiche (tableaux, propositions, explications, corrigé)', () => {
    const render = (l: string, ctx: string) => {
      try {
        katex.renderToString(l, { throwOnError: true });
      } catch (e) {
        throw new Error(`${ctx} : ${l}\n${e}`);
      }
    };
    for (const ex of ALL) {
      const texts: string[] = [];
      for (const t of [...(ex.tables ?? []), ...ex.steps.flatMap((s) => (s.data ? [s.data] : []))]) texts.push(...t.header, ...t.rows.flat(), t.caption ?? '');
      for (const q of ex.questions) {
        if (q.type === 'choice') texts.push(...q.options, ...(q.feedback ?? []).map((f) => f ?? ''));
        if (q.type === 'number') texts.push(...(q.mistakes ?? []).map((m) => m.message));
      }
      for (const s of texts) for (const l of inline(s)) render(l, ex.uid);
    }
  });

  it('le code R refait le calcul avec les données de l’énoncé et seulement des fonctions de base', () => {
    const allowed = new Set(['c', 'sum', 'sqrt', 'abs', 'pnorm', 'qnorm', 'pchisq', 'pf', 'ppois', 'matrix', 'rowSums', 'colSums', 'mean', 'length', 'rep']);
    for (const ex of ALL) {
      const code = ex.steps.map((s) => s.code).find(Boolean)!;
      expect(code, ex.uid).toBeTruthy();
      for (const [, fn] of code.matchAll(/([A-Za-z_][\w.]*)\(/g)) expect(allowed.has(fn), `${ex.uid} : ${fn}()`).toBe(true);
      const m = ex.meta[0];
      if (m.kind !== 'stat') throw new Error();
      const data = m.observed ?? m.table?.flat() ?? m.groups?.flat() ?? m.x!;
      for (const v of data) expect(code, ex.uid).toContain(String(v));
    }
  });

  it('chaque corrigé expose la démarche complète', () => {
    for (const ex of ALL) {
      const titles = ex.steps.map((s) => s.title).join(' | ');
      expect(titles, ex.uid).toMatch(/Modélisation|Hypothèses/);
      expect(titles, ex.uid).toMatch(/p-valeur/);
      expect(titles, ex.uid).toMatch(/Avec R/);
      expect(ex.steps.some((s) => s.data), ex.uid).toBe(ex.code !== 'S01');
    }
  });
});

describe('tests statistiques : exercices en plusieurs parties', () => {
  it('les parties ont des données différentes', () => {
    for (const t of STAT_TEMPLATES) {
      for (const seed of SEEDS.slice(0, 5)) {
        const ex = generateExercise(t, seed, 3);
        expect(new Set(ex.parts.map((p) => JSON.stringify(p.tables))).size, ex.uid).toBe(3);
        expect(ex.parts.every((p) => p.tables?.length)).toBe(true);
      }
    }
  });

  it('les codes sont reconnus par les liens', () => {
    for (const t of STAT_TEMPLATES) expect(TEMPLATE_BY_CODE.get(t.code)).toBe(t);
  });
});

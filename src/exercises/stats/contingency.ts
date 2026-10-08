import type { Rng } from '../../core/random/prng';
import { texFixed, texPValue } from '../../core/stats/format';
import { type Contingency, contingency } from '../../core/stats/hypothesisTests';
import { sampleCounts, uniform } from '../../core/stats/sampling';
import type { ChoiceQuestion, DataTable, ExerciseDraft, Question, Step, Template } from '../types';
import { cell, chi2LawStep, choiceQ, clearOf, decisionQ, decisionText, numberQ, pValueQ, rVec, statQ } from './helpers';

/** Tableau de contingence avec marges (énoncé) ou effectifs théoriques (corrigé). */
function marginTable(rows: string[], cols: string[], values: number[][], rowTotals: number[], colTotals: number[], n: number, fmt: (x: number) => string, corner = ''): DataTable {
  return {
    header: [corner, ...cols, 'Total'],
    rows: [...values.map((r, i) => [rows[i], ...r.map(fmt), String(rowTotals[i])]), ['Total', ...colTotals.map(String), String(n)]],
    rowHeaders: true,
    totalRow: true,
    totalCol: true,
  };
}

const flat = (t: number[][]) => t.flat();

function contingencySteps(rows: string[], cols: string[], c: Contingency, table: number[][], i: number, j: number, h0: string, alphas: number[]): Step[] {
  const r = rows.length;
  const k = cols.length;
  return [
    {
      title: 'Effectifs théoriques',
      text: `Sous $H_0$, l’effectif théorique de chaque case est (total de sa ligne × total de sa colonne) / $n$. Par exemple pour la case (« ${rows[i]} », « ${cols[j]} ») :`,
      math: `E_{${i + 1}${j + 1}} = \\frac{${c.rowTotals[i]} \\times ${c.colTotals[j]}}{${c.n}} \\approx ${texFixed(c.expected[i][j], 2)}`,
      data: marginTable(rows, cols, c.expected, c.rowTotals, c.colTotals, c.n, (x) => cell(x, 2), 'Théorique'),
      formulas: ['s.contingence'],
    },
    {
      title: 'Statistique de test',
      text: 'Tous les effectifs théoriques sont au moins égaux à $5$. Contributions $\\frac{(O_{ij} - E_{ij})^2}{E_{ij}}$ de chaque case :',
      data: { header: ['', ...cols], rows: c.contributions.map((row, a) => [rows[a], ...row.map((x) => cell(x, 3))]), rowHeaders: true },
      math: `T = \\sum_{i,j} \\frac{(O_{ij} - E_{ij})^2}{E_{ij}} \\approx ${texFixed(c.statistic, 2)}`,
      formulas: ['s.chi2'],
    },
    chi2LawStep(c.df, `tableau à $${r}$ lignes et $${k}$ colonnes : $(${r} - 1)(${k} - 1) = ${c.df}$ degrés de liberté.`, alphas),
    {
      title: 'p-valeur et conclusion',
      math: `p = P\\big(\\chi^2(${c.df}) > ${texFixed(c.statistic, 2)}\\big) \\approx ${texPValue(c.pValue)}`,
      text: `${decisionText(c.pValue, alphas)} ${c.pValue < alphas[0] ? `Les données contredisent l’hypothèse « ${h0} ».` : `Les données ne permettent pas de rejeter l’hypothèse « ${h0} ».`}`,
      formulas: ['s.pvalue'],
    },
    {
      title: 'Avec R',
      code: [
        `obs <- matrix(${rVec(flat(table))}, nrow = ${r}, byrow = TRUE)`,
        `th <- rowSums(obs) %o% colSums(obs) / sum(obs)   # effectifs théoriques`,
        `T <- sum((obs - th)^2 / th)`,
        `1 - pchisq(T, df = (${r} - 1) * (${k} - 1))   # p-valeur`,
      ].join('\n'),
    },
  ];
}

/** Questions communes : effectif théorique, statistique, ddl, p-valeur, décision. */
function contingencyQuestions(c: Contingency, table: number[][], rows: string[], cols: string[], i: number, j: number, alpha: number): Question[] {
  const r = rows.length;
  const k = cols.length;
  return [
    numberQ('q2', `Calculer l’effectif théorique, sous $H_0$, de la case (« ${rows[i]} », « ${cols[j]} »).`, 'E =', c.expected[i][j], 2, 0.011, [
      { value: table[i][j], message: 'C’est l’effectif **observé** ; sous $H_0$, $E_{ij} = \\frac{(\\text{total ligne}) \\times (\\text{total colonne})}{n}$.' },
      { value: (c.rowTotals[i] * c.colTotals[j]) / 100, message: 'On divise par l’effectif total $n$, pas par 100.' },
    ]),
    statQ('q3', 'Calculer la statistique du $\\chi^2$ (arrondie à $10^{-2}$).', 'T =', c.statistic, [
      { value: table.flat().reduce((s, o, x) => s + (o - c.expected.flat()[x]) ** 2 / Math.max(o, 1e-9), 0), message: 'On divise par l’effectif **théorique** $E_{ij}$, pas par l’observé.' },
    ]),
    numberQ('q4', 'Combien de degrés de liberté a la loi de cette statistique sous $H_0$ ?', '\\text{ddl} =', c.df, 0, 0.01, [
      { value: r * k - 1, message: `Pour un tableau de contingence : $(r - 1)(c - 1) = (${r} - 1)(${k} - 1)$.` },
      { value: r * k, message: `Pour un tableau de contingence : $(r - 1)(c - 1) = (${r} - 1)(${k} - 1)$.` },
    ]),
    pValueQ('q5', 'Calculer la p-valeur (arrondie à $10^{-3}$).', c.pValue),
    decisionQ('q6', alpha, c.pValue),
  ];
}

// ——————————————————————————————————— S06 : indépendance

interface IndepCtx {
  intro: (n: number) => string;
  rows: string[];
  cols: string[];
  /** « la réussite à l’examen est indépendante du type de préparation » */
  h0: string;
  linked: string;
}

const INDEP: IndepCtx[] = [
  {
    intro: (n) => `Une étude porte sur ${n} candidats pour savoir si la réussite à un examen dépend du type de préparation suivi.`,
    rows: ['Formation en ligne', 'Formation en présentiel', 'Aucune préparation'],
    cols: ['Réussite', 'Échec'],
    h0: 'la réussite à l’examen est indépendante du type de préparation',
    linked: 'la réussite dépend du type de préparation',
  },
  {
    intro: (n) => `On interroge ${n} adultes sur leur consommation de tabac et leur pratique sportive.`,
    rows: ['Fumeur', 'Non-fumeur'],
    cols: ['Sport régulier', 'Sport occasionnel', 'Pas de sport'],
    h0: 'la pratique sportive est indépendante du tabagisme',
    linked: 'la pratique sportive dépend du tabagisme',
  },
  {
    intro: (n) => `Un institut de sondage demande à ${n} personnes leur principal moyen d’information.`,
    rows: ['18–30 ans', '31–50 ans', 'Plus de 50 ans'],
    cols: ['Télévision', 'Presse', 'Internet'],
    h0: 'le moyen d’information est indépendant de la tranche d’âge',
    linked: 'le moyen d’information dépend de l’âge',
  },
  {
    intro: (n) => `Une enquête auprès de ${n} élèves de terminale relève leur filière et leur poursuite d’études envisagée.`,
    rows: ['Filière générale', 'Filière technologique'],
    cols: ['Université', 'Classe prépa', 'BTS / BUT'],
    h0: 'la poursuite d’études est indépendante de la filière',
    linked: 'la poursuite d’études dépend de la filière',
  },
];

function dependentTable(rng: Rng, n: number, r: number, k: number): number[][] {
  const rw = Array.from({ length: r }, () => uniform(rng, 1, 3));
  const cw = Array.from({ length: k }, () => uniform(rng, 1, 3));
  const dep = rng.bool(0.5) ? 0 : uniform(rng, 0.3, 0.8);
  const weights = rw.flatMap((a) => cw.map((b) => a * b * Math.exp(dep * uniform(rng, -1, 1))));
  const counts = sampleCounts(rng, n, weights);
  return Array.from({ length: r }, (_, i) => counts.slice(i * k, (i + 1) * k));
}

export const S06: Template = {
  code: 'S06',
  theme: 'stat',
  difficulty: 2,
  subtype: 'independance',
  title: 'Test d’indépendance du χ²',
  generate(rng) {
    const ctx = rng.pick(INDEP);
    const alphas = [0.05];
    for (;;) {
      const n = rng.int(15, 40) * 10;
      const table = dependentTable(rng, n, ctx.rows.length, ctx.cols.length);
      const c = contingency(table);
      if (c.expected.flat().some((e) => e < 5) || !clearOf(c.pValue, alphas)) continue;
      const i = rng.int(0, ctx.rows.length - 1);
      const j = rng.int(0, ctx.cols.length - 1);
      const q1: ChoiceQuestion = choiceQ(rng, 'q1', 'Modéliser le problème : quelles hypothèses pose-t-on ?', `$H_0$ : « ${ctx.h0} » contre $H_1$ : « ${ctx.linked} »`, [
        { text: `$H_0$ : « ${ctx.linked} » contre $H_1$ : « ${ctx.h0} »`, why: '$H_0$ est l’hypothèse d’indépendance : c’est le modèle sous lequel on sait calculer les effectifs théoriques.' },
        { text: '$H_0$ : « les effectifs observés sont égaux aux effectifs théoriques »', why: 'Les hypothèses portent sur la population (les deux caractères sont-ils liés ?), pas sur l’échantillon.' },
        { text: `$H_0$ : « toutes les cases du tableau ont la même probabilité »`, why: 'L’indépendance ne veut pas dire équiprobabilité : $P(A \\cap B) = P(A)\\,P(B)$ pour chaque case.' },
      ]);
      return {
        statement: `${ctx.intro(n)} Les résultats sont résumés dans le tableau suivant. On teste l’indépendance des deux caractères au niveau de signification $\\alpha = 0{,}05$.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: ctx.intro(n),
        tables: [marginTable(ctx.rows, ctx.cols, table, c.rowTotals, c.colTotals, c.n, String)],
        questions: [q1, ...contingencyQuestions(c, table, ctx.rows, ctx.cols, i, j, 0.05)],
        steps: [
          {
            title: 'Modélisation',
            text: `On observe deux caractères qualitatifs sur $n = ${n}$ individus. $H_0$ : « ${ctx.h0} » contre $H_1$ : « ${ctx.linked} ». C’est un test d’**indépendance** du $\\chi^2$.`,
          },
          ...contingencySteps(ctx.rows, ctx.cols, c, table, i, j, ctx.h0, alphas),
        ],
        meta: [{ kind: 'stat', test: 'contingency', table }],
      } satisfies ExerciseDraft;
    }
  },
};

// ——————————————————————————————————— S07 : homogénéité

interface HomogCtx {
  intro: string;
  rows: string[];
  cols: string[];
  /** Effectifs (fixés par l'enquête) de chaque population. */
  sizes: (rng: Rng) => number[];
  base: (rng: Rng) => number[];
  h0: string;
  what: string;
}

const HOMOG: HomogCtx[] = [
  {
    intro: 'Une entreprise veut savoir si les préférences pour trois produits sont les mêmes dans trois régions. Elle interroge un échantillon de consommateurs dans chaque région.',
    rows: ['Nord', 'Sud', 'Est'],
    cols: ['Produit A', 'Produit B', 'Produit C'],
    sizes: (rng) => Array(3).fill(rng.pick([80, 100, 120])),
    base: (rng) => [uniform(rng, 0.35, 0.5), uniform(rng, 0.25, 0.35), uniform(rng, 0.2, 0.3)],
    h0: 'les préférences sont les mêmes dans les trois régions',
    what: 'régions',
  },
  {
    intro: 'On compare l’orientation après le bac des élèves de deux lycées.',
    rows: ['Lycée 1', 'Lycée 2'],
    cols: ['Université', 'Classe prépa', 'BTS / BUT', 'Autre'],
    sizes: (rng) => [rng.pick([100, 120, 150]), rng.pick([120, 150, 180])],
    base: (rng) => [uniform(rng, 0.35, 0.5), uniform(rng, 0.1, 0.2), uniform(rng, 0.2, 0.3), uniform(rng, 0.1, 0.15)],
    h0: 'l’orientation se répartit de la même façon dans les deux lycées',
    what: 'lycées',
  },
  {
    intro: 'Un groupe industriel contrôle la qualité des pièces produites dans trois usines : un échantillon de pièces est prélevé dans chacune.',
    rows: ['Usine A', 'Usine B', 'Usine C'],
    cols: ['Conforme', 'Défaut mineur', 'Défaut majeur'],
    sizes: (rng) => [rng.pick([150, 200]), rng.pick([150, 200]), rng.pick([200, 250])],
    base: (rng) => [uniform(rng, 0.7, 0.8), uniform(rng, 0.12, 0.2), uniform(rng, 0.06, 0.1)],
    h0: 'la qualité de la production est la même dans les trois usines',
    what: 'usines',
  },
  {
    intro: 'Une mairie mène chaque année une enquête de satisfaction auprès d’un échantillon d’habitants.',
    rows: ['2023', '2024', '2025'],
    cols: ['Très satisfait', 'Satisfait', 'Peu satisfait', 'Pas satisfait'],
    sizes: (rng) => Array(3).fill(rng.pick([100, 120, 150])),
    base: (rng) => [uniform(rng, 0.15, 0.25), uniform(rng, 0.35, 0.45), uniform(rng, 0.2, 0.3), uniform(rng, 0.1, 0.15)],
    h0: 'la répartition des avis est la même chaque année',
    what: 'années',
  },
];

export const S07: Template = {
  code: 'S07',
  theme: 'stat',
  difficulty: 2,
  subtype: 'homogeneite',
  title: 'Test d’homogénéité du χ²',
  generate(rng) {
    const ctx = rng.pick(HOMOG);
    const alphas = [0.05];
    for (;;) {
      const sizes = ctx.sizes(rng);
      const base = ctx.base(rng);
      const heterogeneous = rng.bool(0.5);
      const table = sizes.map((s) => sampleCounts(rng, s, heterogeneous ? base.map((p) => p * Math.exp(uniform(rng, -0.6, 0.6))) : base));
      const c = contingency(table);
      if (c.colTotals.some((x) => x === 0) || c.expected.flat().some((e) => e < 5) || !clearOf(c.pValue, alphas)) continue;
      const i = rng.int(0, ctx.rows.length - 1);
      const j = rng.int(0, ctx.cols.length - 1);
      const q1 = choiceQ(rng, 'q1', 'Modéliser le problème : quelles hypothèses pose-t-on ?', `$H_0$ : « ${ctx.h0} » contre $H_1$ : « au moins deux ${ctx.what} ont des répartitions différentes »`, [
        { text: `$H_0$ : « les ${ctx.what} ont des répartitions différentes »`, why: '$H_0$ est l’hypothèse d’homogénéité (même répartition partout) : c’est celle qu’on cherche à rejeter.' },
        { text: `$H_0$ : « les effectifs des ${ctx.what} sont égaux »`, why: 'Les effectifs de chaque groupe sont fixés par l’enquête : on compare des **répartitions** (des proportions).' },
        { text: `$H_0$ : « chaque modalité a la même probabilité $\\frac{1}{${ctx.cols.length}}$ »`, why: 'Ce serait un test d’adéquation à une loi uniforme : ici on compare les groupes entre eux.' },
      ]);
      const q7: Question = choiceQ(rng, 'q7', 'Ce test d’homogénéité se calcule exactement comme :', 'un test d’indépendance du $\\chi^2$ sur le même tableau', [
        { text: 'un test d’adéquation à une loi uniforme', why: 'Les effectifs théoriques viennent des marges du tableau, comme pour l’indépendance.' },
        { text: 'une analyse de la variance (ANOVA)', why: 'L’ANOVA compare des moyennes de variables quantitatives ; ici les caractères sont qualitatifs.' },
        { text: 'une comparaison de deux proportions', why: 'Il y a plus de deux modalités : on utilise le $\\chi^2$ sur tout le tableau.' },
      ]);
      return {
        statement: `${ctx.intro} Les résultats sont les suivants. On teste l’homogénéité des répartitions au niveau de signification $\\alpha = 0{,}05$.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: ctx.intro,
        tables: [marginTable(ctx.rows, ctx.cols, table, c.rowTotals, c.colTotals, c.n, String)],
        questions: [q1, ...contingencyQuestions(c, table, ctx.rows, ctx.cols, i, j, 0.05), q7],
        steps: [
          {
            title: 'Modélisation',
            text: `Chaque ligne est un échantillon d’une population différente (${ctx.what}), d’effectif fixé. $H_0$ : « ${ctx.h0} » contre $H_1$ : « au moins deux répartitions diffèrent ». Le test d’**homogénéité** du $\\chi^2$ se calcule comme un test d’indépendance.`,
          },
          ...contingencySteps(ctx.rows, ctx.cols, c, table, i, j, ctx.h0, alphas),
        ],
        meta: [{ kind: 'stat', test: 'contingency', table }],
      } satisfies ExerciseDraft;
    }
  },
};


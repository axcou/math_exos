import type { Rng } from '../../core/random/prng';
import { normalCdf, poissonCdf, poissonPmf } from '../../core/stats/distributions';
import { rNum, texFixed, texNum, texPValue } from '../../core/stats/format';
import { goodnessOfFit, groupedMoments } from '../../core/stats/hypothesisTests';
import { sampleCounts, sampleNormal, samplePoisson, uniform } from '../../core/stats/sampling';
import type { DataTable, ExerciseDraft, Question, Step, Template } from '../types';
import { cell, chi2LawStep, choiceQ, clearOf, decisionQ, decisionText, numberQ, pct, pValueQ, randomComposition, rVec, statQ, tolP } from './helpers';

/** Tableau « classes / effectifs » de l'énoncé. */
function observedTable(head: string, classes: string[], counts: number[]): DataTable {
  const n = counts.reduce((s, x) => s + x, 0);
  return { header: [head, ...classes, 'Total'], rows: [['Effectif observé $n_i$', ...counts.map(String), String(n)]], rowHeaders: true, totalCol: true };
}

/** Tableau de calcul du corrigé : effectifs théoriques et contributions. */
function computeTable(head: string, classes: string[], observed: number[], probs: number[] | null, expected: number[], contributions: number[]): DataTable {
  const rows = [['$n_i$', ...observed.map(String)]];
  if (probs) rows.push(['$p_i$', ...probs.map((p) => cell(p, 4))]);
  rows.push(['$n\\,p_i$', ...expected.map((e) => cell(e, 2))], ['$\\frac{(n_i - n p_i)^2}{n p_i}$', ...contributions.map((c) => cell(c, 3))]);
  return { header: [head, ...classes], rows, rowHeaders: true };
}

const lawOptions = (df: number, estimated: number) => {
  const k = df + 1 + estimated;
  const wrong = [
    { text: `$\\chi^2(${k})$`, why: `Les effectifs somment à $n$ : on perd au moins un degré de liberté (${k} classes).` },
    { text: '$\\mathcal{N}(0, 1)$', why: '$T$ est une somme de carrés : sa loi limite est une loi du $\\chi^2$.' },
  ];
  if (estimated > 0) wrong.unshift({ text: `$\\chi^2(${k - 1})$`, why: `On a estimé ${estimated === 1 ? 'un paramètre' : `${estimated} paramètres`} : on retire autant de degrés de liberté, soit $${k} - 1 - ${estimated}$.` });
  else wrong.unshift({ text: `$\\chi^2(${k - 2})$`, why: `Aucun paramètre n’est estimé : $${k} - 1 = ${k - 1}$ degrés de liberté.` });
  return { correct: `$\\chi^2(${df})$`, wrong };
};

const tMistake = (observed: number[], expected: number[]) => ({
  value: observed.reduce((s, o, i) => s + (o - expected[i]) ** 2 / Math.max(o, 1e-9), 0),
  message: 'On divise par l’effectif **théorique** $n p_i$, pas par l’effectif observé.',
});

const rChi2 = (lines: string[], df: number) => [...lines, 'T <- sum((obs - th)^2 / th)', `1 - pchisq(T, df = ${df})   # p-valeur`].join('\n');

// ——————————————————————————————————— S02 : loi uniforme

interface UniformCtx {
  intro: (n: number) => string;
  head: string;
  classes: string[];
  ns: number[];
  model: string;
}

const UNIFORM: UniformCtx[] = [
  { intro: (n) => `On a lancé ${n} fois un dé à six faces et noté les résultats.`, head: 'Face', classes: ['1', '2', '3', '4', '5', '6'], ns: [60, 90, 120, 150, 180], model: 'le dé est équilibré' },
  { intro: (n) => `On a lancé ${n} fois un dé à quatre faces (un tétraèdre) et noté les résultats.`, head: 'Face', classes: ['1', '2', '3', '4'], ns: [40, 60, 80, 100], model: 'le dé est équilibré' },
  {
    intro: (n) => `Un programme est censé tirer des chiffres de 0 à 9 au hasard. On observe ${n} tirages.`,
    head: 'Chiffre',
    classes: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    ns: [100, 150, 200],
    model: 'les dix chiffres sont équiprobables',
  },
  {
    intro: (n) => `Une roue de loterie comporte cinq secteurs de même taille. On l’a fait tourner ${n} fois.`,
    head: 'Secteur',
    classes: ['Rouge', 'Vert', 'Bleu', 'Jaune', 'Violet'],
    ns: [50, 75, 100, 125],
    model: 'les cinq secteurs ont la même probabilité',
  },
];

export const S02: Template = {
  code: 'S02',
  theme: 'stat',
  difficulty: 1,
  subtype: 'adequation',
  title: 'Adéquation à une loi uniforme',
  generate(rng) {
    const c = rng.pick(UNIFORM);
    const k = c.classes.length;
    const alphas = [0.05, 0.01];
    for (;;) {
      const n = rng.pick(c.ns);
      const weights = Array(k).fill(1);
      if (rng.bool(0.5)) {
        weights[rng.int(0, k - 1)] += uniform(rng, 0.3, 0.9);
        if (rng.bool()) weights[rng.int(0, k - 1)] *= uniform(rng, 0.5, 0.8);
      }
      const observed = sampleCounts(rng, n, weights);
      const probs = Array(k).fill(1 / k);
      const g = goodnessOfFit(observed, probs);
      if (!clearOf(g.pValue, alphas)) continue;
      const E = n / k;
      const law = lawOptions(g.df, 0);
      const questions: Question[] = [
        choiceQ(rng, 'q1', 'Quelle est l’hypothèse nulle $H_0$ ?', `$H_0$ : « ${c.model} », c’est-à-dire $p_i = \\frac{1}{${k}}$ pour toute classe $i$`, [
          { text: `$H_0$ : « ${c.model.replace('est équilibré', 'est truqué').replace('sont équiprobables', 'ne sont pas équiprobables').replace('ont la même probabilité', 'n’ont pas la même probabilité')} »`, why: '$H_0$ est le modèle de référence (l’équiprobabilité) : c’est lui qu’on cherche à rejeter.' },
          { text: `$H_0$ : $n_1 = n_2 = \\dots = n_{${k}}$`, why: 'Les hypothèses portent sur les probabilités $p_i$, pas sur les effectifs observés (qui varient d’un échantillon à l’autre).' },
          { text: `$H_0$ : la moyenne des résultats vaut la moyenne théorique`, why: 'Il s’agit d’un test d’**adéquation** à une loi : on compare toute la répartition, pas seulement la moyenne.' },
        ]),
        numberQ('q2', 'Quel est l’effectif théorique $n p_i$ de chaque classe sous $H_0$ ?', 'n\\,p_i =', E, 2, 0.011),
        statQ('q3', 'Calculer la statistique $T = \\sum_i \\frac{(n_i - n p_i)^2}{n p_i}$ (arrondie à $10^{-2}$).', 'T =', g.statistic, [tMistake(observed, g.expected)]),
        choiceQ(rng, 'q4', 'Quelle est la loi asymptotique de $T$ sous $H_0$ ?', law.correct, law.wrong),
        pValueQ('q5', 'Calculer la p-valeur (arrondie à $10^{-3}$).', g.pValue),
        decisionQ('q6', 0.05, g.pValue),
        decisionQ('q7', 0.01, g.pValue),
      ];
      const steps: Step[] = [
        {
          title: 'Hypothèses',
          text: `On note $p_i$ la probabilité de la classe $i$. $H_0$ : « ${c.model} » ($p_i = \\frac{1}{${k}}$ pour tout $i$), contre $H_1$ : « au moins une des $p_i$ est différente de $\\frac{1}{${k}}$ ». C’est un test d’adéquation du $\\chi^2$.`,
        },
        { title: 'Effectifs théoriques', math: `n\\,p_i = ${n} \\times \\frac{1}{${k}} = ${texNum(E, 2)}`, text: `Tous sont au moins égaux à $5$ : l’approximation par la loi du $\\chi^2$ est valable.` },
        {
          title: 'Statistique de test',
          math: `T = \\sum_{i=1}^{${k}} \\frac{(n_i - ${texNum(E, 2)})^2}{${texNum(E, 2)}} \\approx ${texFixed(g.statistic, 2)}`,
          data: computeTable(c.head, c.classes, observed, null, g.expected, g.contributions),
          formulas: ['s.chi2'],
        },
        chi2LawStep(g.df, `${k} classes, aucun paramètre estimé, donc $${k} - 1 = ${g.df}$ degrés de liberté.`, alphas),
        { title: 'p-valeur et décision', math: `p = P\\big(\\chi^2(${g.df}) > ${texFixed(g.statistic, 2)}\\big) \\approx ${texPValue(g.pValue)}`, text: decisionText(g.pValue, alphas), formulas: ['s.pvalue'] },
        { title: 'Avec R', code: rChi2([`obs <- ${rVec(observed)}`, `n <- sum(obs)`, `th <- rep(n / ${k}, ${k})`], g.df) },
      ];
      return {
        statement: `${c.intro(n)} On veut savoir si ${c.model}.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: c.intro(n),
        tables: [observedTable(c.head, c.classes, observed)],
        questions,
        steps,
        meta: [{ kind: 'stat', test: 'goodness-of-fit', observed, probs, estimated: 0 }],
      };
    }
  },
};

// ——————————————————————————————————— S03 : proportions annoncées

interface AnnouncedCtx {
  intro: (n: number) => string;
  head: string;
  cats: string[];
  probs: (rng: Rng) => number[];
  ns: number[];
}

const ANNOUNCED: AnnouncedCtx[] = [
  {
    intro: (n) => `Un organisme déclare que les modes de transport domicile-travail d’une région se répartissent comme ci-dessous. Un sondage est réalisé auprès de ${n} travailleurs pour vérifier cette déclaration.`,
    head: 'Mode de transport',
    cats: ['Voiture', 'Transports en commun', 'Vélo', 'Marche'],
    probs: (rng) => randomComposition(rng, 4),
    ns: [150, 200, 250, 300],
  },
  {
    intro: (n) => `D’après une étude nationale, les groupes sanguins se répartissent comme ci-dessous. Dans un centre de don, on relève le groupe de ${n} donneurs.`,
    head: 'Groupe',
    cats: ['O', 'A', 'B', 'AB'],
    probs: () => [0.42, 0.44, 0.1, 0.04],
    ns: [150, 200, 250, 300],
  },
  {
    intro: (n) => `Un fabricant de bonbons annonce la répartition des couleurs ci-dessous. On compte les couleurs de ${n} bonbons pris au hasard.`,
    head: 'Couleur',
    cats: ['Rouge', 'Jaune', 'Vert', 'Bleu', 'Orange'],
    probs: (rng) => randomComposition(rng, 5),
    ns: [100, 150, 200],
  },
  {
    intro: (n) => `Le ministère publie la répartition nationale des mentions au baccalauréat ci-dessous. Dans un lycée, on relève les mentions de ${n} candidats.`,
    head: 'Mention',
    cats: ['Sans mention', 'Assez bien', 'Bien', 'Très bien'],
    probs: (rng) => randomComposition(rng, 4),
    ns: [120, 150, 200],
  },
];

export const S03: Template = {
  code: 'S03',
  theme: 'stat',
  difficulty: 1,
  subtype: 'adequation',
  title: 'Adéquation à une répartition annoncée',
  generate(rng) {
    const c = rng.pick(ANNOUNCED);
    const k = c.cats.length;
    const alphas = [0.05];
    for (;;) {
      const n = rng.pick(c.ns);
      const probs = c.probs(rng);
      const truth = [...probs];
      if (rng.bool(0.45)) {
        const [i, j] = rng.shuffle([...Array(k).keys()]);
        const shift = Math.min(truth[i] - 0.02, rng.pick([0.05, 0.07, 0.1]));
        truth[i] -= shift;
        truth[j] += shift;
      }
      const observed = sampleCounts(rng, n, truth);
      const g = goodnessOfFit(observed, probs);
      if (g.expected.some((e) => e < 5) || !clearOf(g.pValue, alphas)) continue;
      const pick = rng.int(0, k - 1);
      const questions: Question[] = [
        choiceQ(rng, 'q1', 'Modéliser le problème : quelles hypothèses pose-t-on ?', '$H_0$ : « la répartition est celle annoncée » contre $H_1$ : « au moins une proportion diffère »', [
          { text: '$H_0$ : « au moins une proportion diffère de celle annoncée » contre $H_1$ : « la répartition est celle annoncée »', why: '$H_0$ est le modèle de référence (la déclaration) ; on cherche à savoir si les données permettent de le rejeter.' },
          { text: `$H_0$ : « toutes les catégories ont la même proportion $\\frac{1}{${k}}$ »`, why: 'On compare aux proportions **annoncées**, pas à une répartition uniforme.' },
          { text: '$H_0$ : « les effectifs observés sont égaux aux effectifs théoriques »', why: 'Les hypothèses portent sur la loi (les probabilités), pas sur l’échantillon observé.' },
        ]),
        numberQ('q2', `Calculer l’effectif théorique de la catégorie « ${c.cats[pick]} » sous $H_0$.`, 'n\\,p_i =', g.expected[pick], 2, 0.011, [{ value: probs[pick] * 100, message: 'C’est le pourcentage : l’effectif théorique vaut $n \\times p_i$.' }]),
        statQ('q3', 'Calculer la statistique $T$ du test d’adéquation du $\\chi^2$ (arrondie à $10^{-2}$).', 'T =', g.statistic, [tMistake(observed, g.expected)]),
        numberQ('q4', 'Combien de degrés de liberté a la loi de $T$ sous $H_0$ ?', '\\text{ddl} =', g.df, 0, 0.01, [{ value: k, message: `Les effectifs somment à $n$ : on perd un degré de liberté, $${k} - 1 = ${k - 1}$.` }]),
        pValueQ('q5', 'Calculer la p-valeur (arrondie à $10^{-3}$).', g.pValue),
        decisionQ('q6', 0.05, g.pValue),
      ];
      const steps: Step[] = [
        {
          title: 'Modélisation',
          text: `On note $p_i$ la proportion (inconnue) de la catégorie $i$ dans la population. $H_0$ : $p_i = p_i^{0}$ pour tout $i$ (proportions annoncées) contre $H_1$ : au moins une $p_i \\neq p_i^{0}$. Les $n = ${n}$ réponses sont supposées indépendantes : test d’adéquation du $\\chi^2$ au niveau $\\alpha = 0{,}05$.`,
        },
        {
          title: 'Effectifs théoriques',
          text: `On calcule $n\\,p_i^{0}$ pour chaque catégorie ; tous valent au moins $5$. Pour « ${c.cats[pick]} » : $${n} \\times ${texNum(probs[pick], 2)} = ${texNum(g.expected[pick], 2)}$.`,
          data: computeTable(c.head, c.cats, observed, probs, g.expected, g.contributions),
        },
        { title: 'Statistique de test', math: `T = \\sum_{i=1}^{${k}} \\frac{(n_i - n p_i^{0})^2}{n p_i^{0}} \\approx ${texFixed(g.statistic, 2)}`, formulas: ['s.chi2'] },
        chi2LawStep(g.df, `${k} catégories, aucun paramètre estimé : $${k} - 1 = ${g.df}$ degrés de liberté.`, alphas),
        { title: 'p-valeur et conclusion', math: `p = P\\big(\\chi^2(${g.df}) > ${texFixed(g.statistic, 2)}\\big) \\approx ${texPValue(g.pValue)}`, text: `${decisionText(g.pValue, alphas)} ${g.pValue < 0.05 ? 'Les données contredisent la répartition annoncée.' : 'Les données sont compatibles avec la répartition annoncée (ce qui ne prouve pas qu’elle est exacte).'}`, formulas: ['s.pvalue'] },
        { title: 'Avec R', code: rChi2([`obs <- ${rVec(observed)}`, `p0 <- ${rVec(probs)}`, `th <- sum(obs) * p0`], g.df) },
      ];
      return {
        statement: `${c.intro(n)} On teste l’adéquation entre les données observées et les proportions annoncées, au niveau de signification $\\alpha = 0{,}05$.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: c.intro(n),
        tables: [
          {
            header: [c.head, ...c.cats, 'Total'],
            rows: [
              ['Proportion annoncée', ...probs.map(pct), '100 %'],
              ['Effectif observé', ...observed.map(String), String(n)],
            ],
            rowHeaders: true,
            totalCol: true,
          },
        ],
        questions,
        steps,
        meta: [{ kind: 'stat', test: 'goodness-of-fit', observed, probs, estimated: 0 }],
      } satisfies ExerciseDraft;
    }
  },
};

// ——————————————————————————————————— S04 : loi de Poisson, paramètre estimé

interface PoissonCtx {
  intro: (n: number) => string;
  head: string;
}

const POISSON: PoissonCtx[] = [
  { intro: (n) => `Pour une étude météo, on relève le nombre de frappes de foudre en un an dans ${n} communes rurales de montagne.`, head: 'Nombre de frappes' },
  { intro: (n) => `Le standard d’une entreprise relève le nombre d’appels reçus par minute, pendant ${n} minutes prises au hasard.`, head: 'Nombre d’appels' },
  { intro: (n) => `Sur une chaîne de production, on relève le nombre de pannes par semaine pendant ${n} semaines.`, head: 'Nombre de pannes' },
  { intro: (n) => `On relève le nombre d’accidents par jour sur une portion d’autoroute, pendant ${n} jours.`, head: 'Nombre d’accidents' },
];

/** Classes ≤ a, a+1, …, ≥ b, d'effectif théorique au moins 5. */
function poissonClasses(n: number, lambda: number): { a: number; b: number } | null {
  let a = 0;
  while (n * poissonCdf(a, lambda) < 5) a++;
  let b = a + 1;
  while (n * (1 - poissonCdf(b, lambda)) >= 5) b++;
  for (let j = a + 1; j < b; j++) if (n * poissonPmf(j, lambda) < 5) return null;
  return b - a + 1 >= 4 ? { a, b } : null;
}

export const S04: Template = {
  code: 'S04',
  theme: 'stat',
  difficulty: 3,
  subtype: 'adequation-estimation',
  title: 'Adéquation à une loi de Poisson',
  generate(rng) {
    const c = rng.pick(POISSON);
    const alphas = [0.05, 0.01];
    for (;;) {
      const n = rng.pick([100, 150, 200, 250]);
      const lambda0 = rng.int(15, 45) / 10;
      const overdispersed = rng.bool(0.4);
      const sample = Array.from({ length: n }, () => samplePoisson(rng, overdispersed ? lambda0 * (rng.bool() ? 0.45 : 1.55) : lambda0));
      const lambda = Number((sample.reduce((s, x) => s + x, 0) / n).toFixed(2));
      const cls = poissonClasses(n, lambda);
      if (!cls) continue;
      const { a, b } = cls;
      const values = Array.from({ length: b - a + 1 }, (_, i) => a + i);
      const observed = values.map((v, i) => sample.filter((x) => (i === 0 ? x <= a : i === values.length - 1 ? x >= b : x === v)).length);
      const probs = values.map((v, i) => (i === 0 ? poissonCdf(a, lambda) : i === values.length - 1 ? 1 - poissonCdf(b - 1, lambda) : poissonPmf(v, lambda)));
      const g = goodnessOfFit(observed, probs, 1);
      if (!clearOf(g.pValue, alphas)) continue;
      const k = values.length;
      const labels = values.map((v, i) => (i === 0 ? (a === 0 ? '0' : `$\\leq ${a}$`) : i === k - 1 ? `$\\geq ${b}$` : String(v)));
      const j = rng.int(a + 1, b - 1);
      const law = lawOptions(g.df, 1);
      const lam = texNum(lambda, 2);
      const questions: Question[] = [
        choiceQ(rng, 'q1', 'Quel estimateur du maximum de vraisemblance utilise-t-on pour le paramètre $\\lambda$ ?', 'la moyenne empirique $\\bar x$', [
          { text: 'la variance empirique', why: 'Pour une loi de Poisson, $E(X) = V(X) = \\lambda$, mais l’estimateur du maximum de vraisemblance est la moyenne $\\bar X$.' },
          { text: 'la médiane de l’échantillon', why: 'L’estimateur du maximum de vraisemblance de $\\lambda$ est la moyenne $\\bar X$.' },
          { text: 'la valeur la plus fréquente (le mode)', why: 'L’estimateur du maximum de vraisemblance de $\\lambda$ est la moyenne $\\bar X$.' },
        ]),
        numberQ('q2', `Avec $\\hat\\lambda = ${lam}$, calculer l’effectif théorique de la classe « ${j} » sous $H_0$.`, 'n\\,p_i =', n * poissonPmf(j, lambda), 2, 0.02, [{ value: poissonPmf(j, lambda), message: 'C’est la probabilité $p_i$ : l’effectif théorique vaut $n\\,p_i$.' }]),
        statQ('q3', 'Calculer la statistique $T$ du test du $\\chi^2$ (arrondie à $10^{-2}$).', 'T =', g.statistic, [tMistake(observed, g.expected)], Math.max(0.03, 0.015 * g.statistic)),
        choiceQ(rng, 'q4', 'Quelle est la loi asymptotique de $T$ sous $H_0$ ?', law.correct, law.wrong),
        pValueQ('q5', 'Calculer la p-valeur (arrondie à $10^{-3}$).', g.pValue),
        decisionQ('q6', 0.05, g.pValue),
        decisionQ('q7', 0.01, g.pValue),
      ];
      const steps: Step[] = [
        {
          title: 'Hypothèses et estimation',
          text: `$H_0$ : « les données suivent une loi de Poisson $\\mathcal{P}(\\lambda)$ » contre $H_1$ : « elles ne suivent pas une loi de Poisson ». Le paramètre $\\lambda$ est inconnu : on l’estime par la moyenne empirique (estimateur du maximum de vraisemblance), $\\hat\\lambda = \\bar x = ${lam}$.`,
        },
        {
          title: 'Probabilités et effectifs théoriques',
          text: `Avec $X \\sim \\mathcal{P}(${lam})$ : $P(X = j) = \\mathrm{e}^{-${lam}}\\frac{${lam}^j}{j!}$. Les classes extrêmes regroupent les queues de la loi pour que chaque effectif théorique atteigne $5$.`,
          math: `n\\,P(X = ${j}) = ${n} \\times \\mathrm{e}^{-${lam}} \\times \\frac{${lam}^{${j}}}{${j}!} \\approx ${texFixed(n * poissonPmf(j, lambda), 2)}`,
          data: computeTable(c.head, labels, observed, probs, g.expected, g.contributions),
        },
        { title: 'Statistique de test', math: `T = \\sum_{i=1}^{${k}} \\frac{(n_i - n p_i)^2}{n p_i} \\approx ${texFixed(g.statistic, 2)}`, formulas: ['s.chi2'] },
        chi2LawStep(g.df, `${k} classes et **un** paramètre estimé ($\\lambda$) : $${k} - 1 - 1 = ${g.df}$ degrés de liberté.`, alphas),
        { title: 'p-valeur et décision', math: `p = P\\big(\\chi^2(${g.df}) > ${texFixed(g.statistic, 2)}\\big) \\approx ${texPValue(g.pValue)}`, text: decisionText(g.pValue, alphas), formulas: ['s.pvalue'] },
        {
          title: 'Avec R',
          code: rChi2(
            [
              `obs <- ${rVec(observed)}`,
              `n <- sum(obs); lambda <- ${rNum(lambda)}`,
              `p <- c(ppois(${a}, lambda), ppois(${a + 1}:${b - 1}, lambda) - ppois(${a}:${b - 2}, lambda), 1 - ppois(${b - 1}, lambda))`,
              `th <- n * p`,
            ],
            g.df,
          ),
        },
      ];
      return {
        statement: `${c.intro(n)} On se demande si ce nombre suit une loi de Poisson. La moyenne de l’échantillon vaut $\\bar x = ${lam}$.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: `${c.intro(n)} Moyenne : $\\bar x = ${lam}$.`,
        tables: [observedTable(c.head, labels, observed)],
        questions,
        steps,
        meta: [{ kind: 'stat', test: 'goodness-of-fit', observed, probs, estimated: 1 }],
      } satisfies ExerciseDraft;
    }
  },
};

// ——————————————————————————————————— S05 : loi normale, deux paramètres estimés

interface NormalCtx {
  intro: (n: number) => string;
  head: string;
  start: number;
  width: number;
}

const NORMAL: NormalCtx[] = [
  { intro: (n) => `Une usine fabrique des pièces dont la longueur (en mm) devrait suivre une loi normale $\\mathcal{N}(\\mu, \\sigma^2)$, de paramètres inconnus. On mesure ${n} pièces et on regroupe les longueurs en classes.`, head: 'Longueur (mm)', start: 10, width: 10 },
  { intro: (n) => `Un horticulteur mesure la hauteur (en cm) de ${n} plants après un mois de culture. Il se demande si cette hauteur suit une loi normale $\\mathcal{N}(\\mu, \\sigma^2)$.`, head: 'Hauteur (cm)', start: 20, width: 5 },
  { intro: (n) => `On relève la durée (en minutes) du trajet domicile-travail de ${n} salariés. Suit-elle une loi normale $\\mathcal{N}(\\mu, \\sigma^2)$ ?`, head: 'Durée (min)', start: 10, width: 5 },
  { intro: (n) => `Un transporteur pèse ${n} colis (masse en kg). On veut savoir si la masse suit une loi normale $\\mathcal{N}(\\mu, \\sigma^2)$.`, head: 'Masse (kg)', start: 2, width: 2 },
];

export const S05: Template = {
  code: 'S05',
  theme: 'stat',
  difficulty: 3,
  subtype: 'adequation-estimation',
  title: 'Adéquation à une loi normale',
  generate(rng) {
    const c = rng.pick(NORMAL);
    const alphas = [0.05];
    for (;;) {
      const k = rng.pick([5, 6]);
      const n = rng.pick([150, 200, 250]);
      const w = c.width;
      const edges = Array.from({ length: k + 1 }, (_, i) => c.start + i * w);
      const top = edges[k];
      const mu0 = c.start + (k * w) / 2 + uniform(rng, -0.4, 0.4) * w;
      const sigma0 = w * uniform(rng, 0.9, 1.3);
      const skewed = rng.bool(0.4);
      const draw = () => (skewed ? c.start + 0.2 * w - Math.log(Math.max(rng.next(), 1e-9)) * 1.6 * w : sampleNormal(rng, mu0, sigma0));
      const values = Array.from({ length: n }, () => Math.min(top - 1e-9, Math.max(c.start, draw())));
      const observed = edges.slice(0, k).map((e, i) => values.filter((x) => x >= e && x < edges[i + 1]).length);
      if (observed.some((o) => o === 0)) continue;
      const centers = edges.slice(0, k).map((e) => e + w / 2);
      const { mean, variance } = groupedMoments(centers, observed);
      const sd = Math.sqrt(variance);
      const cdf = (x: number) => normalCdf((x - mean) / sd);
      const probs = centers.map((_, i) => (i === k - 1 ? 1 : cdf(edges[i + 1])) - (i === 0 ? 0 : cdf(edges[i])));
      const g = goodnessOfFit(observed, probs, 2);
      if (g.expected.some((e) => e < 5) || !clearOf(g.pValue, alphas)) continue;
      const classes = edges.slice(0, k).map((e, i) => `$[${texNum(e)}\\,;\\,${texNum(edges[i + 1])}[$`);
      const law = lawOptions(g.df, 2);
      const sdUnbiased = Math.sqrt((variance * n) / (n - 1));
      const m = texFixed(mean, 2);
      const s = texFixed(sd, 2);
      const questions: Question[] = [
        numberQ('q1', 'Estimer $\\mu$ par la moyenne des centres de classes pondérée par les effectifs (arrondie à $10^{-2}$).', '\\hat\\mu =', mean, 2, 0.011),
        numberQ('q2', 'Estimer $\\sigma$ par l’estimateur du maximum de vraisemblance $\\hat\\sigma = \\sqrt{\\frac{1}{n}\\sum_i n_i (c_i - \\hat\\mu)^2}$ (arrondi à $10^{-2}$).', '\\hat\\sigma =', sd, 2, 0.02, [
          { value: variance, message: 'C’est la variance $\\hat\\sigma^2$ : prends la racine carrée.' },
          { value: sdUnbiased, message: 'Tu as divisé par $n - 1$ : l’estimateur du maximum de vraisemblance divise par $n$.' },
        ]),
        numberQ('q3', `Calculer la probabilité théorique $p_1$ de la première classe (étendue à $-\\infty$) : $p_1 = P(X < ${texNum(edges[1])})$ avec $X \\sim \\mathcal{N}(\\hat\\mu, \\hat\\sigma^2)$ (arrondie à $10^{-3}$).`, 'p_1 =', probs[0], 3, 0.004, [
          { value: probs[0] - normalCdf((c.start - mean) / sd), message: 'Pour la première classe, on étend l’intervalle à $-\\infty$ : $p_1 = P(X < e_1)$.' },
        ]),
        statQ('q4', 'Calculer la statistique $T$ du test du $\\chi^2$ (arrondie à $10^{-2}$).', 'T =', g.statistic, [tMistake(observed, g.expected)], Math.max(0.05, 0.02 * g.statistic)),
        choiceQ(rng, 'q5', 'Quelle est la loi asymptotique de $T$ sous $H_0$ ?', law.correct, law.wrong),
        // les arrondis de μ et σ se propagent jusqu'à la p-valeur : un peu plus de tolérance
        numberQ('q6', 'Calculer la p-valeur (arrondie à $10^{-3}$).', 'p\\text{-valeur} =', g.pValue, 3, Math.max(0.005, 2 * tolP(g.pValue))),
        decisionQ('q7', 0.05, g.pValue),
      ];
      const steps: Step[] = [
        {
          title: 'Modélisation',
          text: `$H_0$ : « la variable suit une loi normale $\\mathcal{N}(\\mu, \\sigma^2)$ » contre $H_1$ : « elle ne suit pas une loi normale ». Les deux paramètres sont inconnus et doivent être estimés à partir des données groupées (chaque valeur est remplacée par le centre $c_i$ de sa classe).`,
        },
        {
          title: 'Estimation des paramètres',
          math: `\\hat\\mu = \\frac{1}{${n}}\\sum_i n_i c_i \\approx ${m} \\qquad \\hat\\sigma = \\sqrt{\\frac{1}{${n}}\\sum_i n_i (c_i - \\hat\\mu)^2} \\approx ${s}`,
        },
        {
          title: 'Probabilités théoriques',
          text: `On étend la première classe à $-\\infty$ et la dernière à $+\\infty$, puis $p_i = \\Phi\\left(\\frac{e_i - \\hat\\mu}{\\hat\\sigma}\\right) - \\Phi\\left(\\frac{e_{i-1} - \\hat\\mu}{\\hat\\sigma}\\right)$. Par exemple :`,
          math: `p_1 = \\Phi\\left(\\frac{${texNum(edges[1])} - ${m}}{${s}}\\right) \\approx ${texFixed(probs[0], 3)}`,
          data: computeTable(c.head, classes, observed, probs, g.expected, g.contributions),
        },
        { title: 'Statistique de test', math: `T = \\sum_{i=1}^{${k}} \\frac{(n_i - n p_i)^2}{n p_i} \\approx ${texFixed(g.statistic, 2)}`, formulas: ['s.chi2'] },
        chi2LawStep(g.df, `${k} classes et **deux** paramètres estimés ($\\mu$ et $\\sigma^2$) : $${k} - 1 - 2 = ${g.df}$ degrés de liberté.`, alphas),
        { title: 'p-valeur et conclusion', math: `p = P\\big(\\chi^2(${g.df}) > ${texFixed(g.statistic, 2)}\\big) \\approx ${texPValue(g.pValue)}`, text: `${decisionText(g.pValue, alphas)} ${g.pValue < 0.05 ? 'Le modèle normal n’est pas adapté à ces données.' : 'Le modèle normal reste plausible.'}`, formulas: ['s.pvalue'] },
        {
          title: 'Avec R',
          code: rChi2(
            [
              `centres <- ${rVec(centers)}`,
              `obs <- ${rVec(observed)}; n <- sum(obs)`,
              `mu <- sum(obs * centres) / n`,
              `s <- sqrt(sum(obs * (centres - mu)^2) / n)`,
              `bornes <- c(-Inf, ${edges.slice(1, k).map(rNum).join(', ')}, Inf)`,
              `p <- pnorm(bornes[-1], mu, s) - pnorm(bornes[-length(bornes)], mu, s)`,
              `th <- n * p`,
            ],
            g.df,
          ),
        },
      ];
      return {
        statement: `${c.intro(n)} La valeur associée à chaque classe est son centre. Pour les probabilités théoriques, on étend la première classe à $-\\infty$ et la dernière à $+\\infty$. On teste au niveau $\\alpha = 0{,}05$.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: c.intro(n),
        tables: [observedTable(c.head, classes, observed)],
        questions,
        steps,
        meta: [{ kind: 'stat', test: 'goodness-of-fit', observed, probs, estimated: 2 }],
      } satisfies ExerciseDraft;
    }
  },
};

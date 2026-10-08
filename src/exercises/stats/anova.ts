import { fQuantile } from '../../core/stats/distributions';
import { rNum, texFixed, texNum, texPValue } from '../../core/stats/format';
import { anova } from '../../core/stats/hypothesisTests';
import { sampleNormal } from '../../core/stats/sampling';
import type { ExerciseDraft, Question, Template } from '../types';
import { cell, choiceQ, clearOf, decisionQ, decisionText, numberQ, pValueQ, rVec, statQ } from './helpers';

interface Ctx {
  intro: string;
  groups: string[];
  /** Ce qui est mesuré (« la hauteur des plants, en cm »). */
  measure: string;
  base: number;
  sd: number;
  /** Décimales des mesures. */
  decimals: number;
}

const CONTEXTS: Ctx[] = [
  { intro: 'Un jardinier amateur étudie l’efficacité de trois engrais biologiques sur la croissance de jeunes plants de tomates. Il mesure la hauteur des plants (en cm) après 6 semaines.', groups: ['Engrais A', 'Engrais B', 'Engrais C'], measure: 'la hauteur des plants', base: 14, sd: 1.4, decimals: 0 },
  { intro: 'Trois professeurs utilisent chacun une méthode différente pour préparer un même contrôle. On relève les notes (sur 20) d’élèves de chaque groupe.', groups: ['Méthode 1', 'Méthode 2', 'Méthode 3'], measure: 'la note', base: 11, sd: 2.2, decimals: 0 },
  { intro: 'Une association de consommateurs compare la durée de vie (en heures) de piles de trois marques, testées dans le même appareil.', groups: ['Marque X', 'Marque Y', 'Marque Z'], measure: 'la durée de vie', base: 30, sd: 2.5, decimals: 0 },
  { intro: 'Une diététicienne compare quatre régimes : elle relève la perte de poids (en kg) de patients après deux mois.', groups: ['Régime A', 'Régime B', 'Régime C', 'Régime D'], measure: 'la perte de poids', base: 4, sd: 1.1, decimals: 1 },
];

const fmt = (x: number, d: number) => texNum(x, d).replace('{,}', ',');

/** S08 — analyse de la variance à un facteur (égalité des moyennes de k groupes). */
export const S08: Template = {
  code: 'S08',
  theme: 'stat',
  difficulty: 3,
  subtype: 'anova',
  title: 'Égalité des moyennes (ANOVA)',
  generate(rng) {
    const c = rng.pick(CONTEXTS);
    const k = c.groups.length;
    const alphas = [0.05];
    for (;;) {
      const equal = rng.bool();
      const sizes = equal ? Array(k).fill(rng.int(4, 6)) : c.groups.map(() => rng.int(4, 6));
      const effect = rng.bool(0.5) ? 0 : 0.6 + 0.6 * rng.next();
      const shifts = c.groups.map(() => (effect ? rng.int(-2, 2) * effect * c.sd : 0));
      const step = 10 ** -c.decimals;
      const groups = sizes.map((s, i) => Array.from({ length: s }, () => Math.max(step, Math.round(sampleNormal(rng, c.base + shifts[i], c.sd) / step) * step)).map((x) => Number(x.toFixed(c.decimals))));
      const a = anova(groups);
      if (a.ssWithin === 0 || a.ssBetween === 0 || !clearOf(a.pValue, alphas)) continue;
      const N = a.N;
      const names = c.groups;
      const mus = names.map((_, i) => `\\mu_{${i + 1}}`).join(' = ');
      const crit = fQuantile(0.95, a.df1, a.df2);
      const questions: Question[] = [
        choiceQ(rng, 'q1', 'On note $\\mu_i$ la moyenne théorique du groupe $i$. Quelles hypothèses teste-t-on ?', `$H_0 : ${mus}$ contre $H_1$ : « au moins deux moyennes diffèrent »`, [
          { text: `$H_0 : ${mus}$ contre $H_1$ : « toutes les moyennes sont différentes »`, why: 'Le contraire de « toutes égales » est « au moins deux différentes ».' },
          { text: `$H_0 : ${names.map((_, i) => `\\bar x_{${i + 1}}`).join(' = ')}$`, why: 'On teste les moyennes **théoriques** $\\mu_i$, pas les moyennes observées (qui ne sont jamais exactement égales).' },
          { text: `$H_0 : ${names.map((_, i) => `\\sigma_{${i + 1}}`).join(' = ')}$`, why: 'L’égalité des variances est une condition d’application de l’ANOVA, pas l’hypothèse testée.' },
        ]),
        choiceQ(rng, 'q2', 'Quelles hypothèses mathématiques faut-il faire sur les données ?', 'Échantillons indépendants, loi normale dans chaque groupe, même variance dans tous les groupes', [
          { text: 'Même nombre de mesures dans chaque groupe', why: 'L’ANOVA fonctionne aussi avec des groupes d’effectifs différents.' },
          { text: 'Loi normale de même moyenne dans chaque groupe', why: '« Même moyenne », c’est justement $H_0$ : on ne peut pas le supposer.' },
          { text: 'Aucune : le test ne suppose rien sur la loi des mesures', why: 'L’ANOVA suppose la normalité et l’égalité des variances (homoscédasticité).' },
        ]),
        numberQ('q3', 'Calculer la moyenne générale $\\bar x$ de toutes les mesures (arrondie à $10^{-2}$).', '\\bar x =', a.grandMean, 2, 0.011, [
          { value: a.means.reduce((s, m) => s + m, 0) / k, message: 'Les groupes n’ont pas le même effectif : la moyenne générale n’est pas la moyenne des moyennes.' },
        ]),
        numberQ('q4', 'Calculer la somme des carrés inter-groupes $SCE_{inter} = \\sum_i n_i(\\bar x_i - \\bar x)^2$ (arrondie à $10^{-2}$).', 'SCE_{inter} =', a.ssBetween, 2, Math.max(0.05, 0.005 * a.ssBetween), [
          { value: a.ssBetween / sizes[0], message: 'N’oublie pas de pondérer chaque écart par l’effectif $n_i$ du groupe.' },
        ]),
        numberQ('q5', 'Calculer la somme des carrés intra-groupes $SCE_{intra} = \\sum_{i,j}(x_{ij} - \\bar x_i)^2$ (arrondie à $10^{-2}$).', 'SCE_{intra} =', a.ssWithin, 2, Math.max(0.05, 0.005 * a.ssWithin), [
          { value: a.ssTotal, message: 'C’est la somme totale : les écarts intra se calculent à la moyenne **de chaque groupe**.' },
        ]),
        statQ('q6', 'En déduire la statistique de Fisher $F = \\dfrac{SCE_{inter}/(k-1)}{SCE_{intra}/(N-k)}$ (arrondie à $10^{-2}$).', 'F =', a.F, [
          { value: a.ssBetween / a.ssWithin, message: 'Divise chaque somme par ses degrés de liberté ($k - 1$ et $N - k$) avant de faire le rapport.' },
          { value: 1 / a.F, message: 'Le rapport est inversé : inter-groupes au numérateur.' },
        ]),
        choiceQ(rng, 'q7', 'Quelle est la loi de $F$ sous $H_0$ ?', `$\\mathcal{F}(${a.df1},\\, ${a.df2})$`, [
          { text: `$\\mathcal{F}(${a.df2},\\, ${a.df1})$`, why: `Ordre des degrés de liberté : d’abord celui du numérateur ($k - 1 = ${a.df1}$), puis celui du dénominateur ($N - k = ${a.df2}$).` },
          { text: `$\\chi^2(${a.df1})$`, why: 'Le rapport de deux variances estimées suit une loi de Fisher.' },
          { text: `$\\mathcal{F}(${k},\\, ${N})$`, why: `Degrés de liberté : $k - 1 = ${a.df1}$ et $N - k = ${a.df2}$.` },
        ]),
        pValueQ('q8', 'Calculer la p-valeur (arrondie à $10^{-3}$).', a.pValue),
        decisionQ('q9', 0.05, a.pValue),
      ];
      const maxN = Math.max(...sizes);
      return {
        statement: `${c.intro} On veut savoir si ${c.measure} moyenne dépend du groupe, au seuil de signification $5\\,\\%$.`,
        lead: 'Traiter chacune des situations suivantes.',
        item: c.intro,
        tables: [
          {
            header: names,
            rows: Array.from({ length: maxN }, (_, r) => groups.map((g) => (r < g.length ? fmt(g[r], c.decimals) : ''))),
          },
        ],
        questions,
        steps: [
          {
            title: 'Modélisation',
            text: `On note $X_{ij}$ la $j$-ième mesure du groupe $i$ et on suppose $X_{ij} = \\mu_i + \\varepsilon_{ij}$, les $\\varepsilon_{ij}$ indépendants de loi $\\mathcal{N}(0, \\sigma^2)$ (normalité, même variance dans les ${k} groupes). $H_0 : ${mus}$ contre $H_1$ : « au moins deux moyennes diffèrent ». C’est une ANOVA à un facteur.`,
          },
          {
            title: 'Moyennes',
            text: `$k = ${k}$ groupes, $N = ${N}$ mesures au total.`,
            data: { header: ['Groupe', ...names], rows: [['Effectif $n_i$', ...sizes.map(String)], ['Moyenne $\\bar x_i$', ...a.means.map((m) => cell(m, 3))]], rowHeaders: true },
            math: `\\bar x = \\frac{1}{${N}}\\sum_{i,j} x_{ij} \\approx ${texFixed(a.grandMean, 3)}`,
          },
          {
            title: 'Décomposition de la variabilité',
            math: `SCE_{inter} = \\sum_i n_i(\\bar x_i - \\bar x)^2 \\approx ${texFixed(a.ssBetween, 2)} \\qquad SCE_{intra} = \\sum_{i,j}(x_{ij} - \\bar x_i)^2 \\approx ${texFixed(a.ssWithin, 2)}`,
            formulas: ['s.anova'],
          },
          {
            title: 'Tableau d’analyse de la variance',
            data: {
              header: ['Source', 'SCE', 'ddl', 'Carré moyen', '$F$'],
              rows: [
                ['Inter-groupes', cell(a.ssBetween, 2), String(a.df1), cell(a.msBetween, 3), cell(a.F, 2)],
                ['Intra-groupes', cell(a.ssWithin, 2), String(a.df2), cell(a.msWithin, 3), ''],
                ['Total', cell(a.ssTotal, 2), String(N - 1), '', ''],
              ],
              rowHeaders: true,
              totalRow: true,
            },
            math: `F = \\frac{${texFixed(a.ssBetween, 2)}/${a.df1}}{${texFixed(a.ssWithin, 2)}/${a.df2}} \\approx ${texFixed(a.F, 2)}`,
            formulas: ['s.fisher'],
          },
          {
            title: 'p-valeur et décision',
            text: `Sous $H_0$, $F \\sim \\mathcal{F}(${a.df1}, ${a.df2})$ ; valeur critique au seuil $5\\,\\%$ : $f_{0{,}95} \\approx ${texFixed(crit, 2)}$. ${decisionText(a.pValue, alphas)} ${a.pValue < 0.05 ? `Au moins deux groupes ont des moyennes différentes.` : 'Les écarts entre moyennes observées peuvent s’expliquer par le hasard.'}`,
            math: `p = P\\big(\\mathcal{F}(${a.df1}, ${a.df2}) > ${texFixed(a.F, 2)}\\big) \\approx ${texPValue(a.pValue)}`,
            formulas: ['s.pvalue'],
          },
          {
            title: 'Avec R',
            text: 'Seulement des opérations de base, `mean` et la fonction de répartition `pf` :',
            code: [
              ...groups.map((g, i) => `g${i + 1} <- ${rVec(g)}`),
              `x <- c(${groups.map((_, i) => `g${i + 1}`).join(', ')}); m <- mean(x)`,
              `inter <- ${groups.map((_, i) => `length(g${i + 1}) * (mean(g${i + 1}) - m)^2`).join(' + ')}`,
              `intra <- ${groups.map((_, i) => `sum((g${i + 1} - mean(g${i + 1}))^2)`).join(' + ')}`,
              `F <- (inter / ${k - 1}) / (intra / (${N} - ${k}))`,
              `1 - pf(F, ${k - 1}, ${N - k})   # p-valeur (${rNum(Number(a.pValue.toFixed(4)))})`,
            ].join('\n'),
          },
        ],
        meta: [{ kind: 'stat', test: 'anova', groups }],
      } satisfies ExerciseDraft;
    }
  },
};

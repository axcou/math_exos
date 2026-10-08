import { normalCdf } from '../../core/stats/distributions';
import { rNum, texFixed, texPValue } from '../../core/stats/format';
import { twoProportions } from '../../core/stats/hypothesisTests';
import { sampleBinomial } from '../../core/stats/sampling';
import type { Template } from '../types';
import { choiceQ, clearOf, decisionQ, decisionText, numberQ, pValueQ, statQ } from './helpers';

interface Context {
  intro: (n: number) => string;
  A: string;
  B: string;
  yes: string;
  no: string;
  /** « le traitement A fonctionne aussi bien qu’un placebo » */
  same: string;
  /** « le traitement A marche moins bien qu’un placebo » */
  worse: string;
  param: string;
}

const CONTEXTS: Context[] = [
  {
    intro: (n) =>
      `Un traitement contre les douleurs liées au zona est testé contre un placebo. Les ${n} patients volontaires sont répartis en deux groupes ; ils ignorent dans quel groupe ils sont. Après une semaine, on leur demande : « Avez-vous ressenti une diminution de vos douleurs ? »`,
    A: 'Placebo',
    B: 'Traitement',
    yes: 'Diminution',
    no: 'Pas de diminution',
    same: 'le traitement fonctionne aussi bien qu’un placebo',
    worse: 'le traitement marche moins bien qu’un placebo',
    param: 'probabilité de diminution des douleurs',
  },
  {
    intro: (n) => `Un lycée compare deux méthodes de révision : ${n} élèves sont répartis au hasard entre l’ancienne et la nouvelle méthode, puis passent le même examen blanc.`,
    A: 'Ancienne méthode',
    B: 'Nouvelle méthode',
    yes: 'Réussite',
    no: 'Échec',
    same: 'les deux méthodes ont la même efficacité',
    worse: 'la nouvelle méthode est moins efficace que l’ancienne',
    param: 'probabilité de réussite',
  },
  {
    intro: (n) => `Un site marchand teste deux versions de sa page d’accueil : chacun des ${n} visiteurs suivis voit au hasard l’une des deux versions. On note si la visite se termine par un achat.`,
    A: 'Version A',
    B: 'Version B',
    yes: 'Achat',
    no: 'Pas d’achat',
    same: 'les deux versions font vendre autant',
    worse: 'la version B fait moins vendre que la version A',
    param: 'probabilité d’achat',
  },
  {
    intro: (n) => `Un semencier teste un traitement des graines censé améliorer la germination : ${n} graines sont semées, avec ou sans traitement, dans les mêmes conditions.`,
    A: 'Sans traitement',
    B: 'Avec traitement',
    yes: 'Germée',
    no: 'Non germée',
    same: 'le traitement ne change pas le taux de germination',
    worse: 'le traitement diminue le taux de germination',
    param: 'probabilité de germination',
  },
];

/** S01 — comparaison de deux proportions (test Z, bilatéral et unilatéral, intervalle de confiance). */
export const S01: Template = {
  code: 'S01',
  theme: 'stat',
  difficulty: 2,
  subtype: 'deux-proportions',
  title: 'Comparaison de deux proportions',
  generate(rng) {
    const ctx = rng.pick(CONTEXTS);
    for (;;) {
      const nA = rng.pick([80, 100, 120, 150, 200]);
      const nB = rng.bool() ? nA : rng.pick([80, 100, 120, 150, 200]);
      const pA = rng.int(3, 12) / 20;
      const delta = rng.pick([0, 0, 0.05, 0.1, 0.1, 0.15, 0.2, -0.05]);
      const xA = sampleBinomial(rng, nA, pA);
      const xB = sampleBinomial(rng, nB, Math.min(0.95, Math.max(0.05, pA + delta)));
      // conditions d'approximation normale, et décision nette aux seuils demandés
      if (Math.min(xA, nA - xA, xB, nB - xB) < 5) continue;
      const t = twoProportions(xA, nA, xB, nB);
      if (!clearOf(t.pBilateral, [0.05, 0.1]) || Math.abs(t.z) < 0.05) continue;
      return build(ctx, xA, nA, xB, nB, t);
    }

    function build(c: Context, xA: number, nA: number, xB: number, nB: number, t: ReturnType<typeof twoProportions>) {
      const pa = texFixed(t.pA, 3);
      const pb = texFixed(t.pB, 3);
      const z = texFixed(t.z, 3);
      const zAbs = texFixed(Math.abs(t.z), 3);
      return {
        statement: `${c.intro(nA + nB)} On note $p_A$ (resp. $p_B$) la ${c.param} dans le groupe « ${c.A} » (resp. « ${c.B} »).`,
        tables: [
          {
            header: ['', c.A, c.B],
            rows: [
              [c.yes, String(xA), String(xB)],
              [c.no, String(nA - xA), String(nB - xB)],
              ['Total', String(nA), String(nB)],
            ],
            rowHeaders: true,
            totalRow: true,
          },
        ],
        questions: [
          choiceQ(rng, 'q1', `On veut tester l’hypothèse « ${c.same} ». Quelles hypothèses pose-t-on ?`, '$H_0 : p_A = p_B$ contre $H_1 : p_A \\neq p_B$', [
            { text: '$H_0 : p_A \\neq p_B$ contre $H_1 : p_A = p_B$', why: '$H_0$ est l’hypothèse d’égalité : c’est elle qu’on cherche à rejeter.' },
            { text: '$H_0 : \\hat p_A = \\hat p_B$ contre $H_1 : \\hat p_A \\neq \\hat p_B$', why: 'Les hypothèses portent sur les vraies probabilités $p_A, p_B$, pas sur les proportions observées.' },
            { text: '$H_0 : p_B > p_A$ contre $H_1 : p_B \\leq p_A$', why: '« Aussi bien » : on teste l’égalité, le test est bilatéral.' },
          ]),
          statQ(
            'q2',
            'Calculer la statistique de test $z = \\dfrac{\\hat p_B - \\hat p_A}{\\sqrt{\\frac{\\hat p_A(1-\\hat p_A)}{n_A} + \\frac{\\hat p_B(1-\\hat p_B)}{n_B}}}$ (arrondie à $10^{-2}$).',
            'z =',
            t.z,
            [{ value: -t.z, message: 'Attention au sens : on calcule $\\hat p_B - \\hat p_A$.' }],
          ),
          pValueQ('q3', 'En déduire la p-valeur de ce test bilatéral (arrondie à $10^{-3}$).', t.pBilateral, [
            { value: t.pBilateral / 2, message: 'C’est la p-valeur d’un test unilatéral : en bilatéral, on prend $2\\,P(Z > |z|)$.' },
            { value: normalCdf(Math.abs(t.z)), message: 'Tu as donné $P(Z \\leq |z|)$ ; la p-valeur est $2\\,P(Z > |z|)$.' },
          ]),
          decisionQ('q4', 0.1, t.pBilateral),
          decisionQ('q5', 0.05, t.pBilateral),
          pValueQ(
            'q6',
            `On teste maintenant l’hypothèse nulle « ${c.worse} », c’est-à-dire $H_0 : p_B \\leq p_A$ contre $H_1 : p_B > p_A$. Donner la p-valeur de ce test (arrondie à $10^{-3}$).`,
            t.pGreater,
            [
              { value: t.pBilateral, message: 'C’est la p-valeur bilatérale : ici le test est unilatéral (à droite), $p = P(Z > z)$.' },
              { value: t.pLess, message: 'Mauvais côté : $H_1 : p_B > p_A$, on regarde $P(Z > z)$.' },
            ],
          ),
          numberQ('q7', 'Intervalle de confiance à $95\\,\\%$ de $p_B - p_A$ : borne inférieure (arrondie à $10^{-3}$).', '\\text{borne inf.} =', t.ci[0], 3, 0.003),
          numberQ('q8', 'Borne supérieure de cet intervalle (arrondie à $10^{-3}$).', '\\text{borne sup.} =', t.ci[1], 3, 0.003),
        ],
        steps: [
          {
            title: 'Modélisation',
            text: `On note $X_A$ le nombre de « ${c.yes} » dans le groupe « ${c.A} » : $X_A \\sim \\mathcal{B}(n_A, p_A)$ avec $n_A = ${nA}$ ; de même $X_B \\sim \\mathcal{B}(n_B, p_B)$ avec $n_B = ${nB}$, indépendante de $X_A$. « ${c.same} » se traduit par $H_0 : p_A = p_B$, contre $H_1 : p_A \\neq p_B$ (test **bilatéral**).`,
          },
          { title: 'Proportions observées', math: `\\hat p_A = \\frac{${xA}}{${nA}} \\approx ${pa} \\qquad \\hat p_B = \\frac{${xB}}{${nB}} \\approx ${pb}` },
          {
            title: 'Statistique de test',
            text: 'Sous $H_0$, la statistique suit approximativement la loi $\\mathcal{N}(0,1)$ (grands effectifs : au moins 5 succès et 5 échecs dans chaque groupe).',
            math: `z = \\frac{${pb} - ${pa}}{\\sqrt{\\frac{${pa}(1-${pa})}{${nA}} + \\frac{${pb}(1-${pb})}{${nB}}}} = \\frac{${texFixed(t.diff, 3)}}{${texFixed(t.se, 4)}} \\approx ${texFixed(t.z, 2)}`,
            formulas: ['s.z2p'],
          },
          {
            title: 'p-valeur et décision',
            math: `p = 2\\,P(Z > ${zAbs}) = 2\\big(1 - \\Phi(${zAbs})\\big) \\approx ${texPValue(t.pBilateral)}`,
            text: decisionText(t.pBilateral, [0.1, 0.05]),
            formulas: ['s.pvalue'],
          },
          {
            title: 'Test unilatéral',
            text: `Pour $H_0 : p_B \\leq p_A$ contre $H_1 : p_B > p_A$, on ne rejette que pour les grandes valeurs de $z$ : ${decisionText(t.pGreater, [0.05])}`,
            math: `p = P(Z > ${z}) = 1 - \\Phi(${z}) \\approx ${texPValue(t.pGreater)}`,
          },
          {
            title: 'Intervalle de confiance',
            text: `Au niveau $95\\,\\%$ ($z_{0{,}975} \\approx 1{,}96$). Il ${t.ci[0] < 0 && t.ci[1] > 0 ? 'contient' : 'ne contient pas'} $0$, ce qui correspond bien au test bilatéral au seuil $5\\,\\%$ (${t.pBilateral < 0.05 ? 'rejet' : 'non-rejet'}).`,
            math: `${texFixed(t.diff, 3)} \\pm 1{,}96 \\times ${texFixed(t.se, 4)} \\;\\Longrightarrow\\; \\big[\\,${texFixed(t.ci[0], 3)}\\,;\\,${texFixed(t.ci[1], 3)}\\,\\big]`,
            formulas: ['s.ic2p'],
          },
          {
            title: 'Avec R',
            text: 'Seulement des opérations de base et la fonction de répartition `pnorm` :',
            code: [
              `nA <- ${nA}; nB <- ${nB}`,
              `pA <- ${xA} / nA; pB <- ${xB} / nB`,
              `se <- sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB)`,
              `z <- (pB - pA) / se`,
              `2 * (1 - pnorm(abs(z)))   # p-valeur bilatérale (${rNum(Number(t.pBilateral.toFixed(4)))})`,
              `1 - pnorm(z)              # p-valeur unilatérale, H1 : pB > pA`,
              `(pB - pA) + c(-1, 1) * qnorm(0.975) * se   # IC à 95 %`,
            ].join('\n'),
          },
        ],
        meta: [{ kind: 'stat' as const, test: 'two-proportions' as const, x: [xA, xB] as [number, number], n: [nA, nB] as [number, number] }],
        lead: 'Traiter chacune des situations suivantes.',
        item: `${c.A} / ${c.B} : ${xA}/${nA} contre ${xB}/${nB}`,
      };
    }
  },
};


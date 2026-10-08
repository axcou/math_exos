import { LAW_BY_ID, quantile } from '../calculator/pvalueSolver';
import type { DataTable } from '../exercises/types';
import type { Method } from './methods';

/*
 * Fiche « Tests d'hypothèses pour l'analyse bivariée » (BUT SD 2) :
 * intervalles, test d'une moyenne, comparaison de deux moyennes et de deux
 * variances, tables de référence.
 */

const fixed = (x: number, d: number) => x.toFixed(d).replace('.', ',');
const normalQ = (p: number) => quantile(LAW_BY_ID.get('normal')!, [0, 1], p);
const studentQ = (p: number, nu: number) => quantile(LAW_BY_ID.get('student')!, [nu], p);
const fisherQ = (p: number, d1: number, d2: number) => quantile(LAW_BY_ID.get('fisher')!, [d1, d2], p);
/** Écriture « table » : 4 chiffres significatifs au plus (161,4 ; 18,51 ; 4,103). */
const sig = (x: number) => (x >= 100 ? fixed(x, 1) : x >= 10 ? fixed(x, 2) : fixed(x, 3));

const NORMAL_ALPHAS_TWO = [0.2, 0.1, 0.05, 0.02, 0.01, 0.001];
const NORMAL_ALPHAS_ONE = [0.1, 0.05, 0.025, 0.01, 0.005, 0.001];
const STUDENT_TAILS = [0.1, 0.05, 0.025, 0.01, 0.005, 0.001];
const STUDENT_DF = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30];
const FISHER_D1 = [1, 2, 3, 5, 10, 20, 30];
const FISHER_D2 = [1, 2, 3, 5, 10, 30];

export const NORMAL_TABLE: DataTable = {
  caption: 'Loi normale centrée réduite $\\mathcal{N}(0,1)$ : quantiles usuels',
  header: ['$\\alpha$ (bilatéral)', ...NORMAL_ALPHAS_TWO.map((a) => fixed(a, a < 0.01 ? 3 : 2))],
  rows: [
    ['$q_{1-\\alpha/2}$', ...NORMAL_ALPHAS_TWO.map((a) => fixed(normalQ(1 - a / 2), 3))],
    ['$\\alpha$ (unilatéral)', ...NORMAL_ALPHAS_ONE.map((a) => fixed(a, a < 0.01 || a === 0.025 ? 3 : 2))],
    ['$q_{1-\\alpha}$', ...NORMAL_ALPHAS_ONE.map((a) => fixed(normalQ(1 - a), 3))],
  ],
  rowHeaders: true,
};

export const STUDENT_TABLE: DataTable = {
  caption: 'Loi de Student $\\mathcal{S}(\\nu)$ : quantile $t$ tel que $P(T > t) = $ valeur de la colonne',
  header: ['ddl $\\nu$', ...STUDENT_TAILS.map((a) => fixed(a, a < 0.01 ? 3 : a === 0.025 ? 3 : 2))],
  rows: [
    ...STUDENT_DF.map((nu) => [String(nu), ...STUDENT_TAILS.map((a) => fixed(studentQ(1 - a, nu), 3))]),
    ['$\\infty$', ...STUDENT_TAILS.map((a) => fixed(normalQ(1 - a), 3))],
  ],
  rowHeaders: true,
};

export const FISHER_TABLE: DataTable = {
  caption: 'Loi de Fisher–Snedecor $\\mathcal{F}(d_1, d_2)$ : quantile d’ordre $0{,}95$ (seuil $5\\,\\%$ à droite)',
  header: ['$d_1 \\backslash d_2$', ...FISHER_D2.map(String)],
  rows: [
    ...FISHER_D1.map((d1) => [String(d1), ...FISHER_D2.map((d2) => sig(fisherQ(0.95, d1, d2)))]),
    // d1 → ∞ : 1 / (quantile d'ordre 0,05 d'un χ²(d2)/d2), calculé avec un d1 très grand
    ['$\\infty$', ...FISHER_D2.map((d2) => sig(fisherQ(0.95, 1e6, d2)))],
  ],
  rowHeaders: true,
};

const decision =
  '\\left\\{\\begin{array}{ll} t \\in R_\\alpha & \\Rightarrow \\text{on rejette } H_0 \\text{ au seuil } \\alpha \\\\[0.3em] t \\notin R_\\alpha & \\Rightarrow \\text{on ne rejette pas } H_0 \\text{ au seuil } \\alpha \\end{array}\\right.';

const regions = {
  left: 'R_\\alpha = \\left]-\\infty\\,;\\,q_{\\alpha}\\right] = \\left]-\\infty\\,;\\,-q_{1-\\alpha}\\right]',
  two: 'R_\\alpha = \\left]-\\infty\\,;\\,-q_{1-\\alpha/2}\\right] \\cup \\left[q_{1-\\alpha/2}\\,;\\,+\\infty\\right[',
  right: 'R_\\alpha = \\left[q_{1-\\alpha}\\,;\\,+\\infty\\right[',
};

export const STAT_SHEET_METHODS: Method[] = [
  {
    id: 'test-intervalles',
    theme: 'stat',
    title: 'Intervalles de fluctuation et de confiance',
    when: 'Encadrer une moyenne (ou une proportion) : la moyenne **observée** autour d’une valeur théorique connue (fluctuation), ou la moyenne **théorique** inconnue à partir de l’échantillon (confiance).',
    steps: [
      'Repérer ce qui est connu : la moyenne $m$ (intervalle de fluctuation, raisonnement probabiliste) ou seulement l’échantillon (intervalle de confiance, raisonnement inférentiel).',
      'Choisir la statistique : $Z_n$ et le théorème central limite pour un grand échantillon, ou une loi exacte (Student, $\\chi^2$) pour un petit échantillon gaussien.',
      'Encadrer la statistique entre $-q_{1-\\alpha/2}$ et $q_{1-\\alpha/2}$ (niveau $1 - \\alpha$), puis isoler la quantité cherchée.',
    ],
    blocks: [
      {
        title: 'Intervalle de fluctuation (probabiliste : $m$ connue)',
        formulas: [
          { latex: '-q_{1-\\alpha/2} \\leqslant Z_n \\leqslant q_{1-\\alpha/2}' },
          { latex: 'm - q_{1-\\alpha/2}\\sqrt{\\frac{S^2}{n}} \\leqslant \\overline X_n \\leqslant m + q_{1-\\alpha/2}\\sqrt{\\frac{S^2}{n}}' },
          { latex: 'IF_\\alpha = \\left[\\, m \\pm q_{1-\\alpha/2}\\sqrt{\\frac{S^2}{n}} \\,\\right]', caption: 'encadre la moyenne **observée** $\\overline X_n$' },
        ],
      },
      {
        title: 'Intervalle de confiance (inférentiel : $m$ inconnue)',
        formulas: [
          { latex: '\\overline X_n - q_{1-\\alpha/2}\\sqrt{\\frac{S_n^2}{n}} \\leqslant m \\leqslant \\overline X_n + q_{1-\\alpha/2}\\sqrt{\\frac{S_n^2}{n}}' },
          { latex: 'IC_\\alpha = \\left[\\, \\overline X_n \\pm q_{1-\\alpha/2}\\sqrt{\\frac{S_n^2}{n}} \\,\\right]', caption: 'encadre la moyenne **théorique** $m$ au niveau de confiance $1 - \\alpha$' },
        ],
      },
      {
        title: 'Définition de $Z_n$ (théorème central limite)',
        text: 'Soit $X_1, \\dots, X_n$ un $n$-échantillon de moyenne $m = \\mathbb{E}[X]$ et de variance $\\sigma^2 = \\mathrm{Var}[X]$. Pour $n$ assez grand, on fait l’approximation $Z_n \\approx \\mathcal{N}(0,1)$.',
        formulas: [
          { latex: 'Z_n = \\sqrt{\\frac{n}{S_n^2}}\\left(\\overline X_n - m\\right) \\xrightarrow[n \\to +\\infty]{\\mathcal{L}} \\mathcal{N}(0,1)', caption: 'loi quelconque' },
          { latex: 'Z_n = \\sqrt{\\frac{n}{p(1-p)}}\\left(\\overline X_n - p\\right) \\xrightarrow[n \\to +\\infty]{\\mathcal{L}} \\mathcal{N}(0,1)', caption: 'loi de Bernoulli (proportion)' },
        ],
      },
      {
        title: 'Petit échantillon de loi normale $\\mathcal{N}(m, \\sigma^2)$',
        text: 'Avec $\\overline{S}_n^2 = \\frac{1}{n}\\sum_k (X_k - m)^2$ ($m$ connue) et $\\widehat{S}_n^2 = \\frac{1}{n-1}\\sum_k (X_k - \\overline X_n)^2$ (estimateur sans biais) :',
        formulas: [
          { latex: 'n\\,\\frac{\\overline{S}_n^2}{\\sigma^2} = \\sum_{k=1}^{n}\\left(\\frac{X_k - m}{\\sigma}\\right)^2 \\sim \\chi^2(n)', caption: '(a) IC et test pour la variance, quand $m$ est connue' },
          { latex: '\\sqrt{n}\\;\\frac{\\overline X_n - m}{\\sigma} \\sim \\mathcal{N}(0,1)', caption: '(b) IC et test pour $m$, quand la variance est connue' },
          { latex: '(n-1)\\,\\frac{\\widehat{S}_n^2}{\\sigma^2} \\sim \\chi^2(n-1)', caption: '(c) IC et test pour la variance, quand $m$ est inconnue' },
          { latex: '\\sqrt{\\frac{n}{\\widehat{S}_n^2}}\\left(\\overline X_n - m\\right) \\sim \\mathcal{S}(n-1)', caption: '(d) IC et test pour $m$, quand la variance est inconnue' },
        ],
      },
    ],
    pitfalls: [
      'Le niveau de confiance est $1 - \\alpha$ : on utilise le quantile $q_{1-\\alpha/2}$ (par exemple $1{,}96$ pour $95\\,\\%$).',
      'Variance connue : loi normale ; variance estimée sur un petit échantillon : loi de Student à $n - 1$ degrés de liberté.',
    ],
    formulas: ['s.ic1'],
    examples: [],
    code: 'n <- length(x); m <- mean(x); s2 <- var(x)\nm + c(-1, 1) * qnorm(0.975) * sqrt(s2 / n)          # IC à 95 % (grand échantillon)\nm + c(-1, 1) * qt(0.975, n - 1) * sqrt(s2 / n)       # petit échantillon gaussien (Student)',
  },
  {
    id: 'test-moyenne',
    theme: 'stat',
    title: 'Tester une moyenne (univarié)',
    when: 'Comparer la moyenne $m$ d’une population à une valeur de référence $m_0$, à partir d’un échantillon.',
    steps: [
      'Écrire $H_0$ avec la valeur la plus difficile à rejeter, $m_0$ : $H_0 : m = m_0$ (bilatéral), $H_0 : m \\geqslant m_0$ ou $H_0 : m \\leqslant m_0$ (unilatéraux).',
      'Sous $H_0$ (on suppose $H_0$ vraie), calculer $z_n = \\sqrt{\\frac{n}{s_n^2}}\\left(\\overline x_n - m_0\\right)$.',
      'Loi de $Z_n$ sous $H_0$ : $\\mathcal{N}(0,1)$ pour une loi quelconque et un grand échantillon, $\\mathcal{S}(n-1)$ pour un petit échantillon gaussien.',
      'Lire la région de rejet $R_\\alpha$ sur le schéma qui correspond à $H_0$, ou calculer la p-valeur.',
      'Conclure : si $z_n \\in R_\\alpha$ (ou $p < \\alpha$), on rejette $H_0$ au seuil $\\alpha$.',
    ],
    rejection: [
      { h0: 'H_0 : m \\geqslant m_0', tail: 'left', region: regions.left, pvalues: [{ law: 'Normale', latex: 'p = \\Phi(z)' }, { law: 'Student', latex: 'p = F_{\\mathcal{S}(n-1)}(t)' }] },
      { h0: 'H_0 : m = m_0', tail: 'two', region: regions.two, pvalues: [{ law: 'Normale', latex: 'p = 2\\big(1 - \\Phi(|z|)\\big)' }, { law: 'Student', latex: 'p = 2\\big(1 - F_{\\mathcal{S}(n-1)}(|t|)\\big)' }] },
      { h0: 'H_0 : m \\leqslant m_0', tail: 'right', region: regions.right, pvalues: [{ law: 'Normale', latex: 'p = 1 - \\Phi(z)' }, { law: 'Student', latex: 'p = 1 - F_{\\mathcal{S}(n-1)}(t)' }] },
    ],
    blocks: [
      {
        title: 'Statistique sous $H_0$',
        formulas: [
          { latex: 'Z_n = \\sqrt{\\frac{n}{S_n^2}}\\left(\\overline X_n - m_0\\right) \\sim \\mathcal{N}(0,1) \\qquad z_n = \\sqrt{\\frac{n}{s_n^2}}\\left(\\overline x_n - m_0\\right)', caption: 'loi quelconque, grand échantillon' },
          { latex: 'T_n = \\sqrt{\\frac{n}{\\widehat{S}_n^2}}\\left(\\overline X_n - m_0\\right) \\sim \\mathcal{S}(n-1)', caption: 'petit échantillon gaussien (Student)' },
        ],
      },
      { title: 'Quand rejeter $H_0$ ?', formulas: [{ latex: decision }] },
    ],
    pitfalls: [
      'La région de rejet est du côté de $H_1$ : $H_0 : m \\geqslant m_0$ se rejette pour les **petites** valeurs (à gauche), $H_0 : m \\leqslant m_0$ pour les **grandes** (à droite).',
      'En bilatéral, chaque queue a l’aire $\\alpha/2$.',
    ],
    formulas: ['s.zmoy', 's.pvalue'],
    examples: [],
    code: 't <- sqrt(n / var(x)) * (mean(x) - m0)\n2 * (1 - pt(abs(t), n - 1))   # H0 : m = m0\npt(t, n - 1)                  # H0 : m >= m0 (rejet à gauche)\n1 - pt(t, n - 1)              # H0 : m <= m0 (rejet à droite)',
  },
  {
    id: 'test-deux-moyennes',
    theme: 'stat',
    title: 'Comparer deux moyennes (bivarié)',
    when: 'Deux échantillons **indépendants** $X^{(1)} \\perp\\!\\!\\!\\perp X^{(2)}$, de moyennes $m_1$, $m_2$ et de variances $\\sigma_1^2$, $\\sigma_2^2$ : on compare $m_1$ et $m_2$ (ou deux proportions $p_1$ et $p_2$).',
    steps: [
      'Statistique de base : la différence des moyennes observées $D_n = \\overline X^{(1)}_{n_1} - \\overline X^{(2)}_{n_2}$.',
      'Grands échantillons (loi quelconque) : $T_n = \\frac{D_n}{\\sqrt{\\sigma_1^2/n_1 + \\sigma_2^2/n_2}} \\approx \\mathcal{N}(0,1)$ sous $H_0 : m_1 = m_2$ (les variances sont remplacées par leurs estimations).',
      'Petits échantillons gaussiens de même variance : variance poolée et loi de Student à $n_1 + n_2 - 2$ degrés de liberté (vérifier d’abord $\\sigma_1^2 = \\sigma_2^2$ par un test de Fisher).',
      'Même lecture que pour une moyenne : région de rejet selon $H_0$, p-valeur, décision.',
    ],
    blocks: [
      {
        title: 'Lois limites (loi quelconque)',
        formulas: [
          { latex: '\\frac{D_n - (m_1 - m_2)}{\\sqrt{\\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}}} \\xrightarrow[n \\to +\\infty]{\\mathcal{L}} \\mathcal{N}(0,1)', caption: 'deux moyennes' },
          { latex: '\\frac{D_n - (p_1 - p_2)}{\\sqrt{\\frac{p_1(1-p_1)}{n_1} + \\frac{p_2(1-p_2)}{n_2}}} \\xrightarrow[n \\to +\\infty]{\\mathcal{L}} \\mathcal{N}(0,1)', caption: 'deux proportions (Bernoulli)' },
        ],
      },
      {
        title: 'Intervalle de confiance de $m_1 - m_2$',
        formulas: [{ latex: 'IC_\\alpha = \\left[\\, D_n \\pm q_{1-\\alpha/2}\\sqrt{\\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}} \\,\\right]' }],
      },
      {
        title: 'Échantillons gaussiens $\\mathcal{N}(m_1, \\sigma_1^2)$ et $\\mathcal{N}(m_2, \\sigma_2^2)$',
        formulas: [
          { latex: '\\frac{D_n - (m_1 - m_2)}{\\sqrt{\\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}}} \\sim \\mathcal{N}(0,1)', caption: 'variances connues' },
          { latex: '\\frac{D_n - (m_1 - m_2)}{\\sqrt{\\widehat{S}^2\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)}} \\sim \\mathcal{S}(n_1 + n_2 - 2)', caption: 'variances inconnues mais égales ($\\sigma_1^2 = \\sigma_2^2$)' },
          { latex: '\\widehat{S}^2 = \\frac{(n_1 - 1)\\,\\widehat{S}_{1}^2 + (n_2 - 1)\\,\\widehat{S}_{2}^2}{n_1 + n_2 - 2}', caption: 'variance poolée' },
        ],
      },
      {
        title: 'Statistique sous $H_0$ et décision',
        formulas: [
          { latex: 'T_n = \\frac{D_n}{\\sqrt{\\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}}} \\sim \\mathcal{N}(0,1)', caption: 'loi quelconque' },
          { latex: 'T_n = \\frac{D_n}{\\sqrt{\\widehat{S}^2\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)}} \\sim \\mathcal{S}(n_1 + n_2 - 2)', caption: 'Student (variances égales)' },
          { latex: decision },
        ],
      },
    ],
    rejection: [
      { h0: 'H_0 : m_1 \\geqslant m_2', tail: 'left', region: regions.left, pvalues: [{ law: 'Normale', latex: 'p = \\Phi(t)' }, { law: 'Student', latex: 'p = F_{\\mathcal{S}(n_1+n_2-2)}(t)' }] },
      { h0: 'H_0 : m_1 = m_2', tail: 'two', region: regions.two, pvalues: [{ law: 'Normale', latex: 'p = 2\\big(1 - \\Phi(|t|)\\big)' }, { law: 'Student', latex: 'p = 2\\big(1 - F_{\\mathcal{S}(n_1+n_2-2)}(|t|)\\big)' }] },
      { h0: 'H_0 : m_1 \\leqslant m_2', tail: 'right', region: regions.right, pvalues: [{ law: 'Normale', latex: 'p = 1 - \\Phi(t)' }, { law: 'Student', latex: 'p = 1 - F_{\\mathcal{S}(n_1+n_2-2)}(t)' }] },
    ],
    pitfalls: [
      'Échantillons **appariés** (mêmes individus mesurés deux fois) : on fait le tableau des différences individu par individu, puis on applique les formules **univariées** (test d’une moyenne) à ces différences.',
      'L’intervalle de confiance est centré sur la différence **observée** $D_n$, pas sur $m_1 - m_2$ (inconnue).',
    ],
    formulas: ['s.pooled', 's.pvalue'],
    examples: [],
    code: 'n1 <- length(x1); n2 <- length(x2)\nd <- mean(x1) - mean(x2)\ns2 <- ((n1 - 1) * var(x1) + (n2 - 1) * var(x2)) / (n1 + n2 - 2)   # variance poolée\nt <- d / sqrt(s2 * (1 / n1 + 1 / n2))\n2 * (1 - pt(abs(t), n1 + n2 - 2))   # p-valeur, H0 : m1 = m2',
  },
  {
    id: 'test-variances',
    theme: 'stat',
    title: 'Comparer deux variances (Fisher)',
    when: 'Deux échantillons gaussiens indépendants : on teste $H_0 : \\sigma_1^2 = \\sigma_2^2$ (par exemple avant un test de Student à variance poolée).',
    steps: [
      'Calculer les variances corrigées $\\widehat{s}_1^{\\,2}$ et $\\widehat{s}_2^{\\,2}$, puis le rapport $r_n = \\widehat{s}_1^{\\,2} / \\widehat{s}_2^{\\,2}$.',
      'Sous $H_0$, $R_n$ suit la loi de Fisher–Snedecor $\\mathcal{F}(n_1 - 1,\\, n_2 - 1)$.',
      'p-valeur (test bilatéral), avec $F$ la fonction de répartition de $\\mathcal{F}(n_1 - 1, n_2 - 1)$ : si $r_n$ est proche de $0$, $p = 2\\,F(r_n)$ ; si $r_n$ est grand, $p = 2\\big(1 - F(r_n)\\big)$.',
      'On rejette $H_0$ si $p < \\alpha$ : les variances sont alors jugées différentes.',
    ],
    blocks: [
      {
        title: 'Loi du rapport des variances',
        formulas: [
          { latex: 'R_n = \\frac{\\widehat{S}_{1}^2}{\\widehat{S}_{2}^2} \\qquad \\frac{\\sigma_2^2}{\\sigma_1^2}\\, R_n \\sim \\mathcal{F}(n_1 - 1,\\, n_2 - 1)' },
          { latex: 'T_n = R_n \\sim \\mathcal{F}(n_1 - 1,\\, n_2 - 1) \\quad \\text{sous } H_0, \\qquad t_n = r_n' },
        ],
      },
    ],
    pitfalls: ['Les degrés de liberté suivent le rapport : $n_1 - 1$ pour le numérateur, $n_2 - 1$ pour le dénominateur.'],
    formulas: ['s.fvar'],
    examples: [],
    code: 'r <- var(x1) / var(x2)\nFr <- pf(r, length(x1) - 1, length(x2) - 1)\n2 * min(Fr, 1 - Fr)   # p-valeur bilatérale',
  },
  {
    id: 'tables-stat',
    theme: 'stat',
    title: 'Tables de référence (normale, Student, Fisher)',
    when: 'Lire un quantile (seuil de rejet) sans logiciel. Pour les autres valeurs, utiliser le calculateur « Lois & p-valeur ».',
    steps: [
      'Loi normale : $q_{1-\\alpha/2}$ pour un test bilatéral, $q_{1-\\alpha}$ pour un test unilatéral.',
      'Loi de Student : une ligne par nombre de degrés de liberté, une colonne par probabilité de dépassement (queue droite) ; la ligne $\\infty$ redonne la loi normale.',
      'Loi de Fisher : quantile d’ordre $0{,}95$, $d_1$ en ligne et $d_2$ en colonne.',
    ],
    tables: [NORMAL_TABLE, STUDENT_TABLE, FISHER_TABLE],
    examples: [],
  },
];

/** Ordre des fiches du chapitre « Tests statistiques ». */
export const STAT_METHOD_ORDER = [
  'test-principe',
  'test-intervalles',
  'test-moyenne',
  'test-proportions',
  'test-deux-moyennes',
  'test-variances',
  'test-adequation',
  'test-contingence',
  'test-anova',
  'tables-stat',
];

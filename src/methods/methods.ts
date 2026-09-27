import type { CalcMode } from '../components/CalcResult';
import type { Theme } from '../exercises/types';

export interface MethodExample {
  mode: CalcMode;
  f: string;
  x?: string;
}

export interface Method {
  id: string;
  theme: Theme;
  title: string;
  /** Quand utiliser la méthode (texte avec $…$). */
  when: string;
  /** Étapes à suivre. */
  steps: string[];
  /** Erreurs fréquentes. */
  pitfalls?: string[];
  formulas?: string[];
  examples: MethodExample[];
}

export const METHODS: Method[] = [
  // ——————————————————————————————————— Limites
  {
    id: 'lim-continuite',
    theme: 'limite',
    title: 'Limite en un point où la fonction est définie',
    when: 'On cherche $\\lim_{x \\to a} f(x)$ et $f$ est définie en $a$ (pas de division par zéro, pas de $\\ln$ ou de $\\sqrt{\\,}$ d’un nombre interdit).',
    steps: [
      'Vérifier que $f(a)$ existe.',
      'Les fonctions usuelles et leurs sommes, produits, quotients sont continues là où elles sont définies : la limite vaut $f(a)$.',
      'Remplacer $x$ par $a$ et calculer.',
    ],
    pitfalls: ['Remplacer sans vérifier : si le dénominateur s’annule, ce n’est plus cette méthode.'],
    examples: [
      { mode: 'limite', f: '(2x+1)/(x-3)', x: '1' },
      { mode: 'limite', f: 'sqrt(x+5)', x: '4' },
    ],
  },
  {
    id: 'lim-operations',
    theme: 'limite',
    title: 'Opérations sur les limites et valeur interdite',
    when: 'La fonction est une somme, un produit ou un quotient de fonctions dont on connaît les limites ; en particulier un quotient dont le dénominateur tend vers $0$.',
    steps: [
      'Calculer séparément la limite de chaque morceau.',
      'Si le dénominateur tend vers $0$, déterminer son signe au voisinage du point : $0^+$ (positif) ou $0^-$ (négatif). On distingue alors la limite à droite ($x \\to a^+$) et à gauche ($x \\to a^-$).',
      'Conclure avec les règles : $\\frac{\\ell}{0^+} = \\pm\\infty$ selon le signe de $\\ell$, $\\ell + \\infty = +\\infty$, etc.',
      'Si l’on tombe sur $\\infty - \\infty$, $0 \\times \\infty$, $\\frac{\\infty}{\\infty}$ ou $\\frac{0}{0}$, c’est une forme indéterminée : il faut une autre méthode.',
    ],
    pitfalls: [
      'Écrire « $\\frac{29}{0} = \\infty$ » sans le signe : il faut regarder le signe du dénominateur de chaque côté.',
      'Conclure qu’une limite existe en $a$ alors que les limites à gauche et à droite sont différentes.',
    ],
    formulas: ['l.opsok', 'l.ops', 'l.asym'],
    examples: [
      { mode: 'limite', f: '(2x+1)/(x-14)', x: '14+' },
      { mode: 'limite', f: '(2x+1)/(x-14)', x: '14' },
      { mode: 'limite', f: 'ln(x)', x: '0+' },
    ],
  },
  {
    id: 'lim-polynome',
    theme: 'limite',
    title: 'Polynômes et fractions rationnelles en l’infini',
    when: 'On cherche la limite en $+\\infty$ ou $-\\infty$ d’un polynôme ou d’un quotient de polynômes, et les opérations donnent $\\infty - \\infty$ ou $\\frac{\\infty}{\\infty}$.',
    steps: [
      'Polynôme : il a la même limite que son terme de plus haut degré.',
      'Fraction rationnelle : elle a la même limite que le quotient des termes de plus haut degré du numérateur et du dénominateur.',
      'Simplifier ce quotient, puis conclure avec les limites de $x^n$ (attention à la parité de $n$ en $-\\infty$).',
    ],
    pitfalls: ['Oublier le signe en $-\\infty$ : $(-x)^3 \\to +\\infty$ mais $x^3 \\to -\\infty$.', 'Utiliser cette règle en un point fini : elle ne vaut qu’en l’infini.'],
    formulas: ['l.poly', 'l.rat', 'l.xn'],
    examples: [
      { mode: 'limite', f: 'x^3 - 5x^2 + 1', x: '+inf' },
      { mode: 'limite', f: '(3x^2+1)/(x^2-5)', x: '+inf' },
      { mode: 'limite', f: '(2x^3-x)/(1-x^2)', x: '-inf' },
    ],
  },
  {
    id: 'lim-factoriser',
    theme: 'limite',
    title: 'Forme 0/0 : factoriser par (x − a)',
    when: 'Au point $a$, le numérateur et le dénominateur (des polynômes) s’annulent tous les deux.',
    steps: [
      '$a$ est racine des deux polynômes : on peut les factoriser par $(x - a)$.',
      'Simplifier par $(x - a)$ (possible car $x \\neq a$).',
      'La nouvelle expression est définie en $a$ : on remplace $x$ par $a$.',
    ],
    pitfalls: ['Conclure « $\\frac{0}{0} = 0$ » ou « $= 1$ » : c’est une forme indéterminée.'],
    formulas: ['l.ops', 'v.delta'],
    examples: [
      { mode: 'limite', f: '(x^2-4)/(x-2)', x: '2' },
      { mode: 'limite', f: '(x^2-3x+2)/(x^2-1)', x: '1' },
    ],
  },
  {
    id: 'lim-conjugue',
    theme: 'limite',
    title: 'Quantité conjuguée',
    when: 'Une racine carrée crée une forme indéterminée, par exemple $\\sqrt{x^2+3x} - x$ en $+\\infty$ ($\\infty - \\infty$) ou $\\frac{\\sqrt{x+1} - 2}{x - 3}$ en $3$ ($\\frac{0}{0}$).',
    steps: [
      'Multiplier et diviser par la quantité conjuguée : pour $\\sqrt{A} - B$, c’est $\\sqrt{A} + B$.',
      'Utiliser $(\\sqrt{A} - B)(\\sqrt{A} + B) = A - B^2$ : la racine disparaît du numérateur.',
      'Terminer avec les termes prépondérants (en l’infini) ou en simplifiant par $(x - a)$ (en un point).',
    ],
    formulas: ['l.conj'],
    examples: [
      { mode: 'limite', f: 'sqrt(x^2+3x) - x', x: '+inf' },
      { mode: 'limite', f: '(sqrt(x+1)-2)/(x-3)', x: '3' },
    ],
  },
  {
    id: 'lim-croissances',
    theme: 'limite',
    title: 'Croissances comparées',
    when: 'Une forme indéterminée mélange exponentielle, puissances de $x$ et logarithme.',
    steps: [
      'En $+\\infty$ : l’exponentielle l’emporte sur les puissances, qui l’emportent sur le logarithme.',
      'Résultats de cours : $\\frac{\\mathrm{e}^x}{x^n} \\to +\\infty$, $\\frac{\\ln x}{x^n} \\to 0$ en $+\\infty$ ; $x^n \\mathrm{e}^x \\to 0$ en $-\\infty$ ; $x^n \\ln x \\to 0$ en $0^+$.',
      'Pour une somme ($\\mathrm{e}^x - x^2$), factoriser par le terme qui l’emporte.',
      'Si besoin, un changement de variable ($X = -x$, $X = \\frac{1}{x}$) ramène à un résultat du cours.',
    ],
    formulas: ['l.cc'],
    examples: [
      { mode: 'limite', f: 'e^x/x^3', x: '+inf' },
      { mode: 'limite', f: 'x^2 e^x', x: '-inf' },
      { mode: 'limite', f: 'x ln(x)', x: '0+' },
      { mode: 'limite', f: 'e^x - x^2', x: '+inf' },
    ],
  },
  {
    id: 'lim-taux',
    theme: 'limite',
    title: 'Taux d’accroissement (nombre dérivé)',
    when: 'Forme $\\frac{0}{0}$ avec une exponentielle ou un logarithme, comme $\\frac{\\mathrm{e}^{2x} - 1}{x}$ en $0$.',
    steps: [
      'Reconnaître un taux d’accroissement : $\\frac{u(x) - u(a)}{x - a}$.',
      'Sa limite quand $x \\to a$ est le nombre dérivé $u\'(a)$.',
      'Cas du cours : $\\lim_{x\\to 0} \\frac{\\mathrm{e}^x - 1}{x} = 1$ et $\\lim_{x \\to 0} \\frac{\\ln(1+x)}{x} = 1$.',
    ],
    formulas: ['l.taux'],
    examples: [
      { mode: 'limite', f: '(e^(2x)-1)/x', x: '0' },
      { mode: 'limite', f: 'ln(1+3x)/x', x: '0' },
    ],
  },
  {
    id: 'lim-composee',
    theme: 'limite',
    title: 'Limite d’une fonction composée',
    when: 'La fonction s’écrit $g(u(x))$, par exemple $\\mathrm{e}^{\\frac{2x+1}{x+3}}$ ou $\\ln\\left(\\frac{5x-1}{x+2}\\right)$.',
    steps: ['Calculer la limite $b$ de la fonction « intérieure » $u(x)$.', 'Calculer la limite de $g(X)$ quand $X \\to b$.', 'Conclure : c’est la limite de $g(u(x))$.'],
    formulas: ['l.comp'],
    examples: [
      { mode: 'limite', f: 'e^((2x+1)/(x+3))', x: '+inf' },
      { mode: 'limite', f: 'e^(1/x)', x: '0-' },
    ],
  },

  // ——————————————————————————————————— Dérivées
  {
    id: 'der-reference',
    theme: 'derivee',
    title: 'Polynômes et fonctions de référence',
    when: 'La fonction est une somme de termes du type $a\\,x^n$, $\\frac{a}{x}$, $a\\sqrt{x}$, $a\\,\\mathrm{e}^x$, $a\\ln x$.',
    steps: ['On dérive terme à terme (la dérivée d’une somme est la somme des dérivées).', 'Une constante multiplicative reste : $(k\\,u)\' = k\\,u\'$.', 'Une constante seule a une dérivée nulle.'],
    pitfalls: ['$(x^n)\' = n\\,x^{n-1}$ : l’exposant diminue de 1.', '$\\left(\\frac{1}{x}\\right)\' = -\\frac{1}{x^2}$ : ne pas oublier le signe « − ».'],
    formulas: ['d.xn', 'd.inv', 'd.sqrt', 'd.exp', 'd.ln', 'd.sum', 'd.scal'],
    examples: [
      { mode: 'derivee', f: '3x^4 - 2x^2 + 5' },
      { mode: 'derivee', f: '3x^2 - 4sqrt(x) + 2/x' },
    ],
  },
  {
    id: 'der-produit',
    theme: 'derivee',
    title: 'Dérivée d’un produit',
    when: 'La fonction est un produit $u \\times v$ de deux fonctions de $x$, par exemple $(2x+1)\\mathrm{e}^x$.',
    steps: ['Identifier $u$ et $v$, puis calculer $u\'$ et $v\'$.', 'Appliquer $(uv)\' = u\'v + uv\'$.', 'Développer ou factoriser (souvent par $\\mathrm{e}^x$) pour pouvoir étudier le signe.'],
    pitfalls: ['Écrire $(uv)\' = u\'v\'$ : c’est faux.'],
    formulas: ['d.prod'],
    examples: [
      { mode: 'derivee', f: '(2x+1)(x^2-3x)' },
      { mode: 'derivee', f: '(2x+1)e^x' },
      { mode: 'derivee', f: 'x ln(x)' },
    ],
  },
  {
    id: 'der-quotient',
    theme: 'derivee',
    title: 'Dérivée d’un quotient',
    when: 'La fonction est un quotient $\\frac{u}{v}$, là où $v$ ne s’annule pas.',
    steps: ['Identifier $u$ et $v$, calculer $u\'$ et $v\'$.', 'Appliquer $\\left(\\frac{u}{v}\\right)\' = \\frac{u\'v - uv\'}{v^2}$.', 'Développer le numérateur ; garder le dénominateur $v^2$ tel quel (il est positif, c’est utile pour le signe).'],
    pitfalls: ['Inverser l’ordre au numérateur ($uv\' - u\'v$).', 'Oublier le carré au dénominateur.'],
    formulas: ['d.quot', 'd.invu'],
    examples: [
      { mode: 'derivee', f: '(2x+1)/(x-3)' },
      { mode: 'derivee', f: 'ln(x)/x' },
      { mode: 'derivee', f: '5/(x^2+1)' },
    ],
  },
  {
    id: 'der-composee',
    theme: 'derivee',
    title: 'Fonctions composées : eᵘ, ln u, √u, uⁿ',
    when: 'La variable apparaît « à l’intérieur » d’une autre fonction : $\\mathrm{e}^{3x+1}$, $\\ln(x^2+1)$, $\\sqrt{2x+5}$, $(2x+1)^4$.',
    steps: [
      'Repérer la fonction intérieure $u(x)$ et calculer $u\'(x)$.',
      'Appliquer la formule : $(\\mathrm{e}^u)\' = u\'\\mathrm{e}^u$, $(\\ln u)\' = \\frac{u\'}{u}$, $(\\sqrt{u})\' = \\frac{u\'}{2\\sqrt{u}}$, $(u^n)\' = n\\,u\'\\,u^{n-1}$.',
    ],
    pitfalls: ['Oublier le facteur $u\'$ : c’est l’erreur la plus fréquente.'],
    formulas: ['d.expu', 'd.lnu', 'd.sqrtu', 'd.un'],
    examples: [
      { mode: 'derivee', f: 'e^(3x+1)' },
      { mode: 'derivee', f: 'ln(x^2+1)' },
      { mode: 'derivee', f: 'sqrt(2x+5)' },
      { mode: 'derivee', f: '(2x+1)^4' },
    ],
  },

  // ——————————————————————————————————— Signes et variations
  {
    id: 'sig-affine-trinome',
    theme: 'variation',
    title: 'Signe d’une fonction affine ou d’un trinôme',
    when: 'On veut le signe de $ax + b$ ou de $ax^2 + bx + c$.',
    steps: [
      'Affine : $ax + b$ s’annule en $-\\frac{b}{a}$ ; elle est du signe de $a$ après cette valeur, du signe contraire avant.',
      'Trinôme : calculer $\\Delta = b^2 - 4ac$.',
      'Si $\\Delta > 0$ : deux racines, le trinôme est du signe de $a$ à l’extérieur des racines et du signe contraire entre elles.',
      'Si $\\Delta = 0$ : une racine double, signe de $a$ ailleurs. Si $\\Delta < 0$ : toujours du signe de $a$.',
    ],
    formulas: ['v.affine', 'v.delta', 'v.trinome'],
    examples: [
      { mode: 'signe', f: '2x - 6' },
      { mode: 'signe', f: 'x^2 - 5x + 6' },
      { mode: 'signe', f: 'x^2 - x - 1' },
    ],
  },
  {
    id: 'sig-produit',
    theme: 'variation',
    title: 'Signe d’un produit ou d’un quotient',
    when: 'La fonction est un produit ou un quotient de facteurs simples : $(2x+1)(x-3)$, $\\frac{2x+1}{x-3}$, $(x+1)\\mathrm{e}^x$…',
    steps: [
      'Factoriser au maximum.',
      'Étudier le signe de chaque facteur (affine, trinôme ; une exponentielle est toujours positive).',
      'Une ligne par facteur dans le tableau, puis la règle des signes colonne par colonne.',
      'Une valeur qui annule un dénominateur est interdite : double barre.',
    ],
    pitfalls: ['Mettre un $0$ au lieu d’une double barre pour une valeur interdite.'],
    formulas: ['v.prod', 'v.exp'],
    examples: [
      { mode: 'signe', f: '(2x+1)/(x-3)' },
      { mode: 'signe', f: 'x^3 - x' },
      { mode: 'signe', f: '(x+1)e^x' },
      { mode: 'signe', f: 'e^x - 2' },
    ],
  },
  {
    id: 'var-tableau',
    theme: 'variation',
    title: 'Dresser un tableau de variations',
    when: 'On veut les variations d’une fonction dérivable $f$.',
    steps: [
      'Donner le domaine de définition.',
      'Calculer $f\'(x)$ et l’écrire sous une forme factorisée.',
      'Étudier le signe de $f\'(x)$ (tableau de signes).',
      'Là où $f\' > 0$, $f$ croît ; là où $f\' < 0$, elle décroît.',
      'Compléter avec les valeurs des extremums et les limites aux bornes.',
    ],
    pitfalls: ['Dire qu’une fonction homographique est décroissante « sur $\\mathbb{R} \\setminus \\{a\\}$ » : elle l’est sur chacun des deux intervalles séparément.'],
    formulas: ['v.var', 'v.extr', 'v.sommet'],
    examples: [
      { mode: 'variation', f: 'x^2 - 4x + 1' },
      { mode: 'variation', f: 'x^3 - 3x' },
      { mode: 'variation', f: '(x+1)e^x' },
      { mode: 'variation', f: 'x - ln(x)' },
      { mode: 'variation', f: '(2x+1)/(x-3)' },
    ],
  },
];

/** Méthode la plus proche d'un type d'exercice (lien « voir la méthode »). */
export const METHOD_FOR_SUBTYPE: Record<string, string> = {
  polynome: 'der-reference',
  inverse: 'der-reference',
  racine: 'der-reference',
  produit: 'der-produit',
  quotient: 'der-quotient',
  exp: 'der-produit',
  ln: 'der-produit',
  'composee-exp': 'der-composee',
  'composee-ln': 'der-composee',
  'composee-racine': 'der-composee',
  'composee-puissance': 'der-composee',
  reference: 'lim-operations',
  continuite: 'lim-continuite',
  rationnelle: 'lim-polynome',
  'valeur-interdite': 'lim-operations',
  factorisation: 'lim-factoriser',
  conjugue: 'lim-conjugue',
  'croissances-comparees': 'lim-croissances',
  taux: 'lim-taux',
  composee: 'lim-composee',
  'signe-affine': 'sig-affine-trinome',
  'signe-trinome': 'sig-affine-trinome',
  'variations-trinome': 'var-tableau',
  'signe-produit-quotient': 'sig-produit',
  'variations-cubique': 'var-tableau',
  'variations-homographique': 'var-tableau',
  'variations-exp': 'var-tableau',
  'variations-ln': 'var-tableau',
};

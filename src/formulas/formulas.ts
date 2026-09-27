import type { Theme } from '../exercises/types';

export interface Formula {
  id: string;
  theme: Theme;
  group: string;
  title: string;
  latex: string;
  note?: string;
}

export const FORMULAS: Formula[] = [
  // ——— Dérivées usuelles
  { id: 'd.const', theme: 'derivee', group: 'Dérivées usuelles', title: 'Constante', latex: "(k)' = 0" },
  { id: 'd.xn', theme: 'derivee', group: 'Dérivées usuelles', title: 'Puissance', latex: "(x^n)' = n\\,x^{n-1}", note: 'Pour tout entier n ≥ 1.' },
  { id: 'd.inv', theme: 'derivee', group: 'Dérivées usuelles', title: 'Inverse', latex: "\\left(\\frac{1}{x}\\right)' = -\\frac{1}{x^2}", note: 'Sur ℝ*.' },
  { id: 'd.sqrt', theme: 'derivee', group: 'Dérivées usuelles', title: 'Racine carrée', latex: "(\\sqrt{x})' = \\frac{1}{2\\sqrt{x}}", note: 'Sur ]0 ; +∞[.' },
  { id: 'd.exp', theme: 'derivee', group: 'Dérivées usuelles', title: 'Exponentielle', latex: "(\\mathrm{e}^x)' = \\mathrm{e}^x" },
  { id: 'd.ln', theme: 'derivee', group: 'Dérivées usuelles', title: 'Logarithme', latex: "(\\ln x)' = \\frac{1}{x}", note: 'Sur ]0 ; +∞[.' },
  // ——— Opérations
  { id: 'd.sum', theme: 'derivee', group: 'Opérations', title: 'Somme', latex: "(u + v)' = u' + v'" },
  { id: 'd.scal', theme: 'derivee', group: 'Opérations', title: 'Produit par une constante', latex: "(k\\,u)' = k\\,u'" },
  { id: 'd.prod', theme: 'derivee', group: 'Opérations', title: 'Produit', latex: "(u\\,v)' = u'v + u\\,v'" },
  { id: 'd.quot', theme: 'derivee', group: 'Opérations', title: 'Quotient', latex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - u\\,v'}{v^2}", note: 'Là où v ne s’annule pas.' },
  { id: 'd.invu', theme: 'derivee', group: 'Opérations', title: 'Inverse d’une fonction', latex: "\\left(\\frac{1}{u}\\right)' = -\\frac{u'}{u^2}" },
  // ——— Composées
  { id: 'd.expu', theme: 'derivee', group: 'Composées', title: 'Exponentielle de u', latex: "(\\mathrm{e}^{u})' = u'\\,\\mathrm{e}^{u}" },
  { id: 'd.lnu', theme: 'derivee', group: 'Composées', title: 'Logarithme de u', latex: "(\\ln u)' = \\frac{u'}{u}", note: 'Là où u > 0.' },
  { id: 'd.sqrtu', theme: 'derivee', group: 'Composées', title: 'Racine de u', latex: "(\\sqrt{u})' = \\frac{u'}{2\\sqrt{u}}", note: 'Là où u > 0.' },
  { id: 'd.un', theme: 'derivee', group: 'Composées', title: 'Puissance de u', latex: "(u^n)' = n\\,u'\\,u^{n-1}" },
  { id: 'd.affine', theme: 'derivee', group: 'Composées', title: 'Composée avec une affine', latex: "\\big(g(ax+b)\\big)' = a\\,g'(ax+b)" },

  // ——— Limites de référence
  { id: 'l.xn', theme: 'limite', group: 'Limites de référence', title: 'Puissances', latex: '\\lim_{x\\to+\\infty} x^n = +\\infty \\qquad \\lim_{x\\to-\\infty} x^n = \\begin{cases}+\\infty & n \\text{ pair}\\\\ -\\infty & n\\text{ impair}\\end{cases}' },
  { id: 'l.inv', theme: 'limite', group: 'Limites de référence', title: 'Inverse', latex: '\\lim_{x\\to\\pm\\infty} \\frac{1}{x^n} = 0 \\qquad \\lim_{x\\to 0^+} \\frac{1}{x} = +\\infty \\qquad \\lim_{x\\to 0^-} \\frac{1}{x} = -\\infty' },
  { id: 'l.exp', theme: 'limite', group: 'Limites de référence', title: 'Exponentielle', latex: '\\lim_{x\\to+\\infty} \\mathrm{e}^x = +\\infty \\qquad \\lim_{x\\to-\\infty} \\mathrm{e}^x = 0' },
  { id: 'l.ln', theme: 'limite', group: 'Limites de référence', title: 'Logarithme', latex: '\\lim_{x\\to+\\infty} \\ln x = +\\infty \\qquad \\lim_{x\\to 0^+} \\ln x = -\\infty' },
  { id: 'l.ops', theme: 'limite', group: 'Opérations', title: 'Formes indéterminées', latex: '\\infty - \\infty \\qquad 0 \\times \\infty \\qquad \\frac{\\infty}{\\infty} \\qquad \\frac{0}{0}', note: 'Dans ces cas, on transforme l’écriture (factoriser, simplifier, conjugué…).' },
  { id: 'l.opsok', theme: 'limite', group: 'Opérations', title: 'Opérations déterminées', latex: '\\ell + \\infty = \\infty \\qquad \\ell \\times \\infty = \\pm\\infty \\;(\\ell\\neq0) \\qquad \\frac{\\ell}{\\infty} = 0 \\qquad \\frac{\\ell}{0^{\\pm}} = \\pm\\infty \\;(\\ell\\neq0)', note: 'Le signe se détermine avec la règle des signes.' },
  { id: 'l.poly', theme: 'limite', group: 'Méthodes', title: 'Polynôme en l’infini', latex: '\\lim_{x\\to\\pm\\infty} (a_n x^n + \\dots + a_0) = \\lim_{x\\to\\pm\\infty} a_n x^n', note: 'Un polynôme a la même limite que son terme de plus haut degré.' },
  { id: 'l.rat', theme: 'limite', group: 'Méthodes', title: 'Fraction rationnelle en l’infini', latex: '\\lim_{x\\to\\pm\\infty} \\frac{a_n x^n + \\dots}{b_p x^p + \\dots} = \\lim_{x\\to\\pm\\infty} \\frac{a_n x^n}{b_p x^p}', note: 'Quotient des termes de plus haut degré.' },
  { id: 'l.conj', theme: 'limite', group: 'Méthodes', title: 'Quantité conjuguée', latex: '\\sqrt{A} - B = \\frac{A - B^2}{\\sqrt{A} + B}' },
  { id: 'l.cc', theme: 'limite', group: 'Croissances comparées', title: 'Croissances comparées', latex: '\\lim_{x\\to+\\infty} \\frac{\\mathrm{e}^x}{x^n} = +\\infty \\qquad \\lim_{x\\to-\\infty} x^n \\mathrm{e}^x = 0 \\qquad \\lim_{x\\to+\\infty} \\frac{\\ln x}{x^n} = 0 \\qquad \\lim_{x\\to 0^+} x^n \\ln x = 0', note: 'L’exponentielle l’emporte sur les puissances, les puissances l’emportent sur le logarithme.' },
  { id: 'l.taux', theme: 'limite', group: 'Croissances comparées', title: 'Taux d’accroissement', latex: '\\lim_{x\\to 0} \\frac{\\mathrm{e}^x - 1}{x} = 1 \\qquad \\lim_{x\\to 0} \\frac{\\ln(1+x)}{x} = 1', note: 'Ce sont les nombres dérivés de exp et de ln(1+x) en 0.' },
  { id: 'l.comp', theme: 'limite', group: 'Méthodes', title: 'Limite d’une composée', latex: '\\lim_{x\\to a} u(x) = b \\text{ et } \\lim_{X\\to b} g(X) = \\ell \\;\\Rightarrow\\; \\lim_{x\\to a} g(u(x)) = \\ell' },
  { id: 'l.asym', theme: 'limite', group: 'Interprétation', title: 'Asymptotes', latex: '\\lim_{x\\to\\pm\\infty} f(x) = \\ell \\Rightarrow y=\\ell \\text{ asymptote horizontale} \\qquad \\lim_{x\\to a} f(x) = \\pm\\infty \\Rightarrow x=a \\text{ asymptote verticale}' },

  // ——— Signes et variations
  { id: 'v.affine', theme: 'variation', group: 'Signe', title: 'Signe de ax + b', latex: 'ax+b \\text{ s’annule en } x_0 = -\\frac{b}{a}', note: 'Signe de −a avant x₀, signe de a après.' },
  { id: 'v.delta', theme: 'variation', group: 'Signe', title: 'Discriminant', latex: '\\Delta = b^2 - 4ac \\qquad x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}', note: 'Si Δ < 0, pas de racine ; si Δ = 0, une racine double −b/(2a).' },
  { id: 'v.trinome', theme: 'variation', group: 'Signe', title: 'Signe d’un trinôme', latex: 'ax^2+bx+c \\text{ est du signe de } a \\text{ sauf entre les racines}' },
  { id: 'v.prod', theme: 'variation', group: 'Signe', title: 'Règle des signes', latex: '(+)\\times(+) = (+) \\quad (-)\\times(-) = (+) \\quad (+)\\times(-) = (-)', note: 'Même règle pour un quotient ; une valeur qui annule le dénominateur est interdite (double barre).' },
  { id: 'v.exp', theme: 'variation', group: 'Signe', title: 'Signe de l’exponentielle', latex: '\\mathrm{e}^{x} > 0 \\text{ pour tout réel } x' },
  { id: 'v.var', theme: 'variation', group: 'Variations', title: 'Dérivée et variations', latex: "f' > 0 \\text{ sur } I \\Rightarrow f \\nearrow \\text{ sur } I \\qquad f' < 0 \\text{ sur } I \\Rightarrow f \\searrow \\text{ sur } I" },
  { id: 'v.extr', theme: 'variation', group: 'Variations', title: 'Extremum', latex: "f'(x_0) = 0 \\text{ en changeant de signe} \\Rightarrow f(x_0) \\text{ est un extremum local}" },
  { id: 'v.sommet', theme: 'variation', group: 'Variations', title: 'Sommet d’une parabole', latex: '\\alpha = -\\frac{b}{2a} \\qquad \\beta = f(\\alpha)', note: 'Si a > 0 : minimum ; si a < 0 : maximum.' },
];

export const FORMULA_BY_ID = new Map(FORMULAS.map((f) => [f.id, f]));

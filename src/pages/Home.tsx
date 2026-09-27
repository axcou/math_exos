import { Link } from 'react-router';
import { Tex } from '../components/Math';
import { templatesFor } from '../exercises/registry';
import { THEME_LABELS, type Theme } from '../exercises/types';

const THEMES: { theme: Theme; desc: string; example: string; color: string }[] = [
  { theme: 'derivee', desc: 'Polynômes, produits, quotients, exponentielle, logarithme, fonctions composées.', example: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}", color: 'from-sky-500 to-indigo-500' },
  { theme: 'limite', desc: 'Limites en l’infini, formes indéterminées, valeurs interdites, croissances comparées.', example: '\\lim_{x\\to+\\infty} \\frac{\\mathrm{e}^x}{x^n} = +\\infty', color: 'from-violet-500 to-fuchsia-500' },
  { theme: 'variation', desc: 'Tableaux de signes, discriminant, tableaux de variations avec extremums et limites.', example: "f' > 0 \\Rightarrow f \\nearrow", color: 'from-emerald-500 to-teal-500' },
];

const FEATURES = [
  ['🎲', 'Exercices aléatoires', 'Des milliers de variantes, jamais deux fois le même énoncé d’affilée.'],
  ['✅', 'Vérification automatique', 'Tape ta réponse : toutes les écritures équivalentes sont acceptées, et les erreurs classiques sont repérées.'],
  ['📘', 'Corrections détaillées', 'Étape par étape, avec les explications et le rappel des formules utilisées.'],
  ['🔗', 'Partage par lien', 'Envoie exactement la même feuille à quelqu’un, avec ou sans corrections, ou affiche un QR code.'],
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="py-6 text-center">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Entraîne-toi en <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">analyse</span>
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Dérivées, limites, tableaux de signes et de variations : des exercices générés à la volée, du niveau facile au difficile, avec vérification et corrigés.
        </p>
        <Link to="/exercices" className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">
          Composer une feuille
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {THEMES.map((t) => (
          <Link key={t.theme} to={`/exercices?theme=${t.theme}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
            <div className={`bg-gradient-to-r ${t.color} px-5 py-4 text-white`}>
              <h2 className="text-xl font-bold">{THEME_LABELS[t.theme]}</h2>
              <p className="text-sm opacity-90">{templatesFor(t.theme).length} types d’exercices · 3 niveaux</p>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t.desc}</p>
              <Tex math={t.example} display className="text-slate-800 dark:text-slate-100" />
              <p className="text-sm font-semibold text-indigo-700 group-hover:underline dark:text-indigo-300">S’entraîner sur ce thème →</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(([icon, title, desc]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-1 text-2xl">{icon}</div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

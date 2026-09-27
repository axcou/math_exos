import { Link } from 'react-router';
import { Tex } from '../components/Math';
import { SUBTYPE_LABELS, subtypesOf, templatesFor } from '../exercises/registry';
import { THEME_LABELS, type Theme } from '../exercises/types';

const CHAPTERS: { theme: Theme; example: string }[] = [
  { theme: 'derivee', example: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}" },
  { theme: 'limite', example: '\\lim_{x\\to+\\infty} \\frac{\\mathrm{e}^x}{x^n} = +\\infty' },
  { theme: 'variation', example: '\\Delta = b^2 - 4ac' },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="max-w-2xl pt-4">
        <p className="label mb-3">Analyse · Première et Terminale</p>
        <h1 className="mb-4 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Des exercices qui ne se répètent pas, <em className="font-normal">et leur corrigé.</em>
        </h1>
        <p className="mb-6 text-lg text-ink-soft">
          Choisis un chapitre et un niveau : les énoncés sont tirés au hasard, tu écris ta réponse, elle est vérifiée, et la correction détaille chaque étape avec la formule utilisée.
        </p>
        <Link to="/exercices" className="btn btn-primary px-4 py-2 text-[0.95rem]">
          Composer une feuille
        </Link>
      </section>

      <section>
        <h2 className="label mb-2 border-b border-rule pb-2">Sommaire</h2>
        <ol>
          {CHAPTERS.map((c, i) => (
            <li key={c.theme} className={`chap-${c.theme} border-b border-rule`}>
              <Link to={`/exercices?theme=${c.theme}`} className="group grid gap-x-6 gap-y-1 py-5 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline">
                <span className="ex-num h-9 min-w-9 justify-self-start text-lg">{i + 1}</span>
                <span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl font-semibold text-chap group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">{THEME_LABELS[c.theme]}</span>
                    <span aria-hidden className="mb-1 hidden flex-1 border-b border-dotted border-rule-strong sm:block" />
                    <span className="font-sans text-sm text-ink-faint">{templatesFor(c.theme).length} types</span>
                  </span>
                  <span className="mt-1 block text-[0.95rem] text-ink-soft">
                    {subtypesOf(c.theme)
                      .map((s) => SUBTYPE_LABELS[s] ?? s)
                      .join(' · ')}
                  </span>
                </span>
                <span className="hidden text-ink-soft sm:block">
                  <Tex math={c.example} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-8 text-[0.95rem] sm:grid-cols-3">
        <div>
          <h3 className="mb-1 font-semibold">Réponses vérifiées</h3>
          <p className="text-ink-soft">
            Tape <code className="font-mono text-sm">(2x+1)/(x-3)</code> comme tu l’écrirais : toute écriture équivalente est acceptée, et les erreurs courantes sont signalées.
          </p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold">Jamais deux fois le même</h3>
          <p className="text-ink-soft">Ton historique reste dans ce navigateur : les types d’exercices tournent, et un énoncé déjà vu ne revient pas.</p>
        </div>
        <div>
          <h3 className="mb-1 font-semibold">À partager</h3>
          <p className="text-ink-soft">Une feuille s’envoie par lien ou par QR code, avec ou sans le corrigé : tout le monde a exactement les mêmes énoncés.</p>
        </div>
      </section>
    </div>
  );
}

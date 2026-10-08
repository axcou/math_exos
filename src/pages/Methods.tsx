import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { CalcResult, runCalc } from '../components/CalcResult';
import { MathText, Tex } from '../components/Math';
import { FormulaChips } from '../components/Solution';
import { parse } from '../core/expr/parse';
import { toLatex } from '../core/expr/toLatex';
import { ALL_THEMES as THEMES, THEME_LABELS } from '../exercises/types';
import { CodeBlock } from '../components/DataTableView';
import { type Method, type MethodExample, METHODS } from '../methods/methods';

function exampleLatex(ex: MethodExample): string {
  let f = ex.f;
  try {
    f = toLatex(parse(ex.f));
  } catch {
    /* affichage brut */
  }
  if (ex.mode === 'limite') {
    const x = (ex.x ?? '').replace('+inf', '+\\infty').replace('-inf', '-\\infty').replace(/^(.+)([+-])$/, '$1^{$2}');
    return `\\lim_{x \\to ${x}} ${f}`;
  }
  if (ex.mode === 'derivee') return `f(x) = ${f}`;
  return `f(x) = ${f}`;
}

const EXAMPLE_VERB: Record<MethodExample['mode'], string> = {
  limite: 'Calculer',
  derivee: 'Dériver',
  signe: 'Étudier le signe de',
  variation: 'Étudier les variations de',
};

function Example({ ex, index }: { ex: MethodExample; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const out = useMemo(() => (open ? runCalc(ex.mode, ex.f, ex.x) : null), [open, ex]);
  const link = `/calcul?${new URLSearchParams(ex.mode === 'limite' ? { m: ex.mode, f: ex.f, x: ex.x ?? '' } : { m: ex.mode, f: ex.f }).toString()}`;
  return (
    <div className="border-t border-rule pt-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-sans text-sm font-bold text-chap">Exemple {index + 1}</span>
        <span>
          {EXAMPLE_VERB[ex.mode]} <Tex math={exampleLatex(ex)} />
        </span>
        <span className="flex-1" />
        <button type="button" onClick={() => setOpen(!open)} className="btn-link" aria-expanded={open}>
          {open ? 'masquer la solution' : 'voir la solution'}
        </button>
        <Link to={link} className="btn-link">
          ouvrir dans le calculateur
        </Link>
      </div>
      {out && (
        <div className="mt-3">
          <CalcResult out={out} compact />
        </div>
      )}
    </div>
  );
}

function MethodCard({ m, n }: { m: Method; n: number }) {
  return (
    <article id={m.id} className={`page chap-${m.theme} scroll-mt-6 space-y-4`}>
      <div className="chap-band">
        <span className="chap-tab">Méthode {n}</span>
        <h3 className="self-center px-3 font-semibold text-chap">{m.title}</h3>
      </div>
      <p>
        <span className="mr-1 font-sans text-sm font-bold text-chap">Quand ?</span>
        <MathText text={m.when} />
      </p>
      <div className="box">
        <span className="box-tab">La méthode</span>
        <ol className="list-decimal space-y-1.5 pl-5 marker:font-sans marker:font-bold marker:text-chap">
          {m.steps.map((s, i) => (
            <li key={i}>
              <MathText text={s} />
            </li>
          ))}
        </ol>
        {m.formulas && <FormulaChips ids={m.formulas} />}
        {m.code && <CodeBlock code={m.code} />}
      </div>
      {m.pitfalls && (
        <div className="box dashed">
          <span className="box-tab">Erreurs fréquentes</span>
          <ul className="list-disc space-y-1 pl-5 marker:text-pen">
            {m.pitfalls.map((p, i) => (
              <li key={i}>
                <MathText text={p} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-3">
        {m.examples.map((ex, i) => (
          <Example key={ex.mode + ex.f + (ex.x ?? '')} ex={ex} index={i} />
        ))}
      </div>
    </article>
  );
}

export default function Methods() {
  const { hash } = useLocation();
  // Lien direct vers une méthode (#/methodes#lim-conjugue ne passe pas : on utilise ?m=)
  const target = new URLSearchParams(useLocation().search).get('m');
  useEffect(() => {
    const id = target ?? hash.replace('#', '');
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [target, hash]);

  let n = 0;
  return (
    <div className="space-y-8">
      <header className="border-b border-rule pb-4">
        <h1 className="font-serif text-3xl font-semibold">Méthodes</h1>
        <p className="mt-1 text-ink-soft">Pour chaque type de question : quand l’utiliser, les étapes, les pièges, et des exemples résolus pas à pas.</p>
      </header>

      <nav className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Sommaire des méthodes">
        {THEMES.map((t) => (
          <div key={t} className={`chap-${t}`}>
            <p className="mb-1 font-sans text-sm font-bold uppercase tracking-wider text-chap">{THEME_LABELS[t]}</p>
            <ul className="space-y-0.5 text-[0.95rem]">
              {METHODS.filter((m) => m.theme === t).map((m) => (
                <li key={m.id}>
                  <Link to={`/methodes?m=${m.id}`} className="hover:text-chap hover:underline">
                    {m.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {THEMES.map((t) => (
        <section key={t} className={`chap-${t} space-y-5`}>
          <h2 className="flex items-baseline gap-3">
            <span className="ex-num">{THEMES.indexOf(t) + 1}</span>
            <span className="font-serif text-2xl font-semibold text-chap">{THEME_LABELS[t]}</span>
          </h2>
          {METHODS.filter((m) => m.theme === t).map((m) => (
            <MethodCard key={m.id} m={m} n={++n} />
          ))}
        </section>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';

export interface TocEntry {
  /** id de l'élément de la page vers lequel défiler. */
  id: string;
  title: string;
}

export interface TocSection extends TocEntry {
  /** Couleur de chapitre (derivee, limite, variation, stat). */
  chap?: string;
  children?: TocEntry[];
}

/** Hauteur sous le haut de l'écran à partir de laquelle une partie est « en cours de lecture ». */
const OFFSET = 140;

/** Dernier élément dont le haut est passé sous la ligne de lecture (le premier par défaut). */
function current(ids: string[]): string | undefined {
  let found: string | undefined;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= OFFSET) found = id;
  }
  // tout en bas de la page : la dernière partie, même courte, devient active
  const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (bottom && ids.length) return ids.filter((id) => document.getElementById(id)).at(-1);
  return found ?? ids[0];
}

function useActive(sections: TocSection[]) {
  const [active, setActive] = useState<{ section?: string; child?: string }>({});
  const key = sections.map((s) => s.id + (s.children ?? []).map((c) => c.id).join()).join('|');
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = current(sections.map((s) => s.id));
        const s = sections.find((x) => x.id === section);
        const child = s?.children?.length ? current(s.children.map((c) => c.id)) : undefined;
        setActive((a) => (a.section === section && a.child === child ? a : { section, child }));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return active;
}

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function TocList({ sections, active, onPick }: { sections: TocSection[]; active: { section?: string; child?: string }; onPick?: () => void }) {
  return (
    <ol className="space-y-1">
      {sections.map((s) => {
        const on = s.id === active.section;
        return (
          <li key={s.id} className={s.chap ? `chap-${s.chap}` : ''}>
            <a
              href={`#${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                go(s.id);
                onPick?.();
              }}
              aria-current={on ? 'true' : undefined}
              className={`block border-l-[3px] py-0.5 pl-2.5 font-sans text-[0.83rem] font-semibold leading-snug text-chap transition-colors ${on ? 'border-chap' : 'border-transparent opacity-75 hover:opacity-100'}`}
            >
              {s.title}
            </a>
            {on && !!s.children?.length && (
              <ol className="toc-children mb-1 ml-[1px] mt-0.5 border-l border-rule" aria-label={`Sous-parties de ${s.title}`}>
                {s.children.map((c) => {
                  const cOn = c.id === active.child;
                  return (
                    <li key={c.id}>
                      <a
                        href={`#${c.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          go(c.id);
                          onPick?.();
                        }}
                        aria-current={cOn ? 'true' : undefined}
                        className={`-ml-px block border-l-2 py-[3px] pl-4 pr-1 font-sans text-[0.78rem] leading-snug ${cOn ? 'border-ink font-semibold text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
                      >
                        {c.title}
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Sommaire flottant : dans la marge de droite sur grand écran, derrière un
 * bouton « Sommaire » sinon. Seules les sous-parties de la partie en cours
 * de lecture sont déroulées.
 */
export function FloatingToc({ sections, label = 'Sommaire' }: { sections: TocSection[]; label?: string }) {
  const active = useActive(sections);
  const [open, setOpen] = useState(false);
  if (sections.length === 0) return null;
  return (
    <>
      <nav
        aria-label={label}
        className="fixed top-24 z-20 hidden max-h-[calc(100vh-8rem)] w-52 overflow-y-auto overscroll-contain pb-4 print:hidden min-[1360px]:block"
        style={{ left: 'calc(50% + 28rem + 1.75rem)' }}
      >
        <p className="label mb-2 pl-3">{label}</p>
        <TocList sections={sections} active={active} />
      </nav>

      {/* écran plus étroit : bouton flottant */}
      <div className="fixed bottom-4 right-4 z-30 print:hidden min-[1360px]:hidden">
        {open && (
          <nav aria-label={label} className="panel mb-2 max-h-[65vh] w-64 overflow-y-auto p-3 shadow-[4px_4px_0_var(--rule)]">
            <TocList sections={sections} active={active} onPick={() => setOpen(false)} />
          </nav>
        )}
        <button type="button" className="btn ml-auto block bg-sheet shadow-[3px_3px_0_var(--rule)]" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Fermer' : label}
        </button>
      </div>
    </>
  );
}

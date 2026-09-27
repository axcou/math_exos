import katex from 'katex';
import { Fragment, memo, useMemo } from 'react';

function render(latex: string, display: boolean): string {
  return katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: false });
}

/** Formule LaTeX (en ligne ou en bloc). */
export const Tex = memo(function Tex({ math, display = false, className }: { math: string; display?: boolean; className?: string }) {
  const html = useMemo(() => render(math, display), [math, display]);
  return display ? (
    <div className={`overflow-x-auto overflow-y-hidden py-1 ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
});

/** Texte contenant des formules `$…$` et du gras `**…**`. */
export const MathText = memo(function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => text.split(/(\$[^$]+\$)/g), [text]);
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('$') && p.endsWith('$') && p.length > 1) return <Tex key={i} math={p.slice(1, -1)} />;
        return (
          <Fragment key={i}>
            {p.split(/(\*\*[^*]+\*\*)/g).map((q, j) =>
              q.startsWith('**') && q.endsWith('**') ? <strong key={j}>{q.slice(2, -2)}</strong> : <Fragment key={j}>{q}</Fragment>,
            )}
          </Fragment>
        );
      })}
    </span>
  );
});

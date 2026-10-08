import type { DataTable } from '../exercises/types';
import { MathText } from './Math';

/** Tableau de données façon manuel (filets horizontaux, sans grille). */
export function DataTableView({ table }: { table: DataTable }) {
  const last = table.rows.length - 1;
  const lastCol = table.header.length - 1;
  return (
    <figure className="my-3 max-w-full overflow-x-auto print:my-1.5">
      {table.caption && (
        <figcaption className="mb-1 font-sans text-xs text-ink-faint">
          <MathText text={table.caption} />
        </figcaption>
      )}
      <table className="data-table border-y-[1.5px] border-ink text-[0.95rem] tabular-nums">
        <thead>
          <tr className="border-b border-ink/70">
            {table.header.map((h, j) => (
              <th key={j} scope="col" className={`px-3 py-1.5 font-semibold ${j === 0 && table.rowHeaders ? 'text-left' : 'text-center'} ${table.totalCol && j === lastCol ? 'border-l border-rule-strong' : ''}`}>
                <MathText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className={table.totalRow && i === last ? 'border-t border-ink/70 font-semibold' : ''}>
              {row.map((cell, j) =>
                j === 0 && table.rowHeaders ? (
                  <th key={j} scope="row" className="px-3 py-1 text-left font-normal">
                    <MathText text={cell} />
                  </th>
                ) : (
                  <td key={j} className={`px-3 py-1 text-center ${table.totalCol && j === lastCol ? 'border-l border-rule-strong' : ''}`}>
                    <MathText text={cell} />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Code R du corrigé. */
export function CodeBlock({ code }: { code: string }) {
  return (
    <figure className="mt-2">
      <figcaption className="font-sans text-xs font-semibold text-ink-faint">Code R</figcaption>
      <pre className="mt-1 overflow-x-auto rounded border border-rule bg-paper px-3 py-2 font-mono text-[0.82rem] leading-relaxed print:whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

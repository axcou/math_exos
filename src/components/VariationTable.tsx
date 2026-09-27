import type { KeyboardEvent, ReactNode } from 'react';
import type { TableAnswer } from '../checking/check';
import type { Arrow, Mark, Sign, TableData } from '../exercises/types';
import { Tex } from './Math';

interface Props {
  table: TableData;
  /** Mode saisie : l'élève remplit les cases. */
  answer?: TableAnswer;
  onChange?: (a: TableAnswer) => void;
  wrongCells?: string[];
  disabled?: boolean;
}

const SIGN_CYCLE: (Sign | '')[] = ['', '+', '-'];
const MARK_CYCLE: Mark[] = ['', '0', '||'];
const ARROW_CYCLE: (Arrow | '')[] = ['', 'up', 'down'];

function next<T>(cycle: T[], v: T): T {
  return cycle[(cycle.indexOf(v) + 1) % cycle.length];
}

function ArrowSvg({ dir }: { dir: Arrow }) {
  const [x1, y1, x2, y2] = dir === 'up' ? [8, 52, 52, 8] : [8, 8, 52, 52];
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const h = 9;
  const p1 = [x2 - h * Math.cos(ang - 0.45), y2 - h * Math.sin(ang - 0.45)];
  const p2 = [x2 - h * Math.cos(ang + 0.45), y2 - h * Math.sin(ang + 0.45)];
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full max-w-14 p-2" aria-label={dir === 'up' ? 'croissante' : 'décroissante'}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${p1.join(',')} ${p2.join(',')}`} fill="currentColor" />
    </svg>
  );
}

function MarkView({ mark, tall }: { mark: Mark; tall?: boolean }) {
  if (mark === '||') return <div className={`mx-auto ${tall ? 'h-full' : 'h-full'} w-1.5 border-x-2 border-current`} aria-label="valeur interdite" />;
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current opacity-40" />
      {mark === '0' && <span className="relative z-10 bg-sheet px-0.5 font-semibold">0</span>}
    </div>
  );
}

function Cell({ children, wrong, onClick, onKey, disabled, label, className = '' }: { children: ReactNode; wrong?: boolean; onClick?: () => void; onKey?: (e: KeyboardEvent) => void; disabled?: boolean; label?: string; className?: string }) {
  if (!onClick) return <div className={`flex items-center justify-center ${className}`}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKey}
      disabled={disabled}
      aria-label={label}
      className={`m-0.5 flex items-center justify-center border border-dashed ${
        wrong ? 'border-pen border-solid bg-pen-soft' : 'border-rule-strong hover:border-solid hover:border-blue hover:bg-blue-soft'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function VariationTable({ table, answer, onChange, wrongCells = [], disabled }: Props) {
  const n = table.xs.length;
  const editable = !!answer && !!onChange;
  const cols = `minmax(4.5rem, auto) ${Array.from({ length: 2 * n - 1 }, (_, i) => (i % 2 === 0 ? 'minmax(2.5rem, auto)' : 'minmax(3rem, 1fr)')).join(' ')}`;
  const wrong = (id: string) => wrongCells.includes(id);

  const update = (i: number, fn: (row: TableAnswer[number]) => TableAnswer[number]) => {
    if (!answer || !onChange) return;
    onChange(answer.map((r, k) => (k === i ? fn(r) : r)));
  };

  const keyHandler = (apply: (v: string) => void) => (e: KeyboardEvent) => {
    const map: Record<string, string> = { '+': '+', '-': '-', '0': '0', '|': '||', ArrowUp: 'up', ArrowDown: 'down', Backspace: '', Delete: '' };
    if (e.key in map) {
      e.preventDefault();
      apply(map[e.key]);
    }
  };

  const rowBorder = 'border-t border-ink/70';

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid min-w-full border border-ink/70 bg-sheet" style={{ gridTemplateColumns: cols }}>
        {/* Ligne des x */}
        <div className="flex items-center justify-center border-r border-ink/70 px-2 py-1.5">
          <Tex math="x" />
        </div>
        {Array.from({ length: 2 * n - 1 }, (_, c) => (
          <div key={c} className="flex items-center justify-center px-1 py-1.5">
            {c % 2 === 0 && <Tex math={table.xs[c / 2]} />}
          </div>
        ))}

        {table.rows.map((row, i) => {
          const a = answer?.[i];
          const tall = row.kind === 'variation';
          const h = tall ? 'h-24' : 'h-10';
          return [
            <div key={`l${i}`} className={`flex items-center justify-center border-r border-ink/70 px-2 ${rowBorder} ${h}`}>
              <Tex math={row.label} />
            </div>,
            ...Array.from({ length: 2 * n - 1 }, (_, c) => {
              const j = Math.floor(c / 2);
              const key = `${i}-${c}`;
              if (row.kind === 'sign') {
                if (c % 2 === 1) {
                  const s = editable ? a?.signs?.[j] ?? '' : row.signs[j];
                  return (
                    <div key={key} className={`${rowBorder} ${h} flex`}>
                      <Cell
                        className="flex-1 text-base font-semibold"
                        wrong={wrong(`r${i}s${j}`)}
                        disabled={disabled}
                        label={`signe, intervalle ${j + 1}`}
                        onClick={editable ? () => update(i, (r) => ({ ...r, signs: r.signs!.map((v, k) => (k === j ? next(SIGN_CYCLE, v) : v)) })) : undefined}
                        onKey={keyHandler((v) => (v === '+' || v === '-' || v === '') && update(i, (r) => ({ ...r, signs: r.signs!.map((x, k) => (k === j ? (v as Sign | '') : x)) })))}
                      >
                        {s === '-' ? '−' : s}
                      </Cell>
                    </div>
                  );
                }
                const interior = j > 0 && j < n - 1;
                if (!interior) return <div key={key} className={`${rowBorder} ${h}`} />;
                const m = editable ? a?.marks?.[j] ?? '' : row.marks[j];
                return (
                  <div key={key} className={`${rowBorder} ${h} flex`}>
                    {editable ? (
                      <Cell
                        className="flex-1"
                        wrong={wrong(`r${i}m${j}`)}
                        disabled={disabled}
                        label={`marque en x = ${table.xs[j]}`}
                        onClick={() => update(i, (r) => ({ ...r, marks: r.marks!.map((v, k) => (k === j ? next(MARK_CYCLE, v) : v)) }))}
                        onKey={keyHandler((v) => (v === '0' || v === '||' || v === '') && update(i, (r) => ({ ...r, marks: r.marks!.map((x, k) => (k === j ? (v as Mark) : x)) })))}
                      >
                        <MarkView mark={m} />
                      </Cell>
                    ) : (
                      <div className="flex-1">
                        <MarkView mark={m} />
                      </div>
                    )}
                  </div>
                );
              }
              // Ligne de variations
              if (c % 2 === 1) {
                const ar = editable ? a?.arrows?.[j] ?? '' : row.arrows[j];
                return (
                  <div key={key} className={`${rowBorder} ${h} flex`}>
                    <Cell
                      className="flex-1"
                      wrong={wrong(`r${i}a${j}`)}
                      disabled={disabled}
                      label={`variation, intervalle ${j + 1}`}
                      onClick={editable ? () => update(i, (r) => ({ ...r, arrows: r.arrows!.map((v, k) => (k === j ? next(ARROW_CYCLE, v) : v)) })) : undefined}
                      onKey={keyHandler((v) => (v === 'up' || v === 'down' || v === '') && update(i, (r) => ({ ...r, arrows: r.arrows!.map((x, k) => (k === j ? (v as Arrow | '') : x)) })))}
                    >
                      {ar && <ArrowSvg dir={ar} />}
                    </Cell>
                  </div>
                );
              }
              if (row.forbidden[j]) {
                return (
                  <div key={key} className={`${rowBorder} ${h} py-1`}>
                    <MarkView mark="||" tall />
                  </div>
                );
              }
              const v = editable ? null : row.values[j];
              const left = row.arrows[j - 1];
              const right = row.arrows[j];
              const top = left === 'up' || (left === undefined && right === 'down');
              return (
                <div key={key} className={`${rowBorder} ${h} flex flex-col px-1 py-1.5 ${top ? 'justify-start' : 'justify-end'}`}>
                  {v && <Tex math={v} className="text-center" />}
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

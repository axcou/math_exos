import { useMemo, useRef } from 'react';
import { parseNumber } from '../../checking/check';
import { parse, ParseError } from '../../core/expr/parse';
import { toLatex } from '../../core/expr/toLatex';
import { MathText, Tex } from '../Math';

interface TextProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

/** Aperçu KaTeX de ce que le parseur a compris. */
function Preview({ value, kind }: { value: string; kind: 'expression' | 'value' | 'roots' }) {
  const out = useMemo(() => {
    const v = value.trim();
    if (!v) return null;
    if (kind !== 'expression') {
      const s = v.toLowerCase().replace(/\s+/g, '');
      if (/^[+-]?(∞|inf|infini|oo)$/.test(s)) return { latex: s.startsWith('-') ? '-\\infty' : '+\\infty' };
      if (/^(n'?existepas|nexistepas|∄|aucune|aucun)$/.test(s.replace(/’/g, "'"))) return { latex: kind === 'roots' ? '\\varnothing' : '\\text{n’existe pas}' };
    }
    try {
      if (kind === 'roots') {
        return { latex: v.split(';').map((p) => (p.trim() ? toLatex(parse(p)) : '')).filter(Boolean).join(' \\;;\\; ') };
      }
      return { latex: toLatex(parse(v)) };
    } catch (e) {
      return { error: e instanceof ParseError ? e.message : 'Saisie non comprise' };
    }
  }, [value, kind]);
  if (!out) return <p className="min-h-6 font-sans text-xs text-ink-faint">L’aperçu de ta réponse s’affiche ici.</p>;
  if ('error' in out) return <p className="min-h-6 font-sans text-xs text-pen">{out.error}</p>;
  return (
    <p className="min-h-6 text-ink-soft">
      <span className="mr-2 font-sans text-xs text-ink-faint">lu :</span>
      <Tex math={out.latex} />
    </p>
  );
}

const KEYS_EXPR: { label: string; insert: string; tex?: string }[] = [
  { label: 'x', insert: 'x' },
  { label: 'x²', insert: '^2', tex: 'x^2' },
  { label: '^', insert: '^', tex: 'a^b' },
  { label: '/', insert: '/', tex: '\\frac{a}{b}' },
  { label: '( )', insert: '()', tex: '( \\, )' },
  { label: '√', insert: 'sqrt()', tex: '\\sqrt{\\;}' },
  { label: 'eˣ', insert: 'e^()', tex: '\\mathrm{e}^{\\square}' },
  { label: 'ln', insert: 'ln()', tex: '\\ln' },
];

function useInsert(inputRef: React.RefObject<HTMLInputElement | null>, value: string, onChange: (v: string) => void) {
  return (text: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const nv = value.slice(0, start) + text + value.slice(end);
    onChange(nv);
    // Curseur à l'intérieur des parenthèses insérées
    const caret = start + (text.endsWith('()') ? text.length - 1 : text.length);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  };
}

function Field({ value, onChange, onSubmit, disabled, label, placeholder, inputRef }: TextProps & { inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {label && <Tex math={label} className="shrink-0" />}
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        className="field min-w-0 flex-1 disabled:opacity-60"
      />
    </div>
  );
}

const keyBtn = 'key disabled:opacity-50';

export function ExpressionInput(p: TextProps) {
  const ref = useRef<HTMLInputElement>(null);
  const insert = useInsert(ref, p.value, p.onChange);
  return (
    <div className="space-y-1.5">
      <Field {...p} inputRef={ref} placeholder={p.placeholder ?? 'ex. (2x+1)/(x-3)  ou  3x^2 - e^(2x)'} />
      <div className="flex flex-wrap gap-1">
        {KEYS_EXPR.map((k) => (
          <button key={k.label} type="button" disabled={p.disabled} className={keyBtn} onClick={() => insert(k.insert)} title={`Insérer ${k.label}`}>
            {k.tex ? <Tex math={k.tex} /> : k.label}
          </button>
        ))}
      </div>
      <Preview value={p.value} kind="expression" />
    </div>
  );
}

export function ValueInput(p: TextProps) {
  const ref = useRef<HTMLInputElement>(null);
  const insert = useInsert(ref, p.value, p.onChange);
  return (
    <div className="space-y-1.5">
      <Field {...p} inputRef={ref} placeholder={p.placeholder ?? 'ex. 3, -1/2, e^2, +inf'} />
      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => p.onChange('+∞')} aria-label="plus l’infini" title="plus l’infini">
          <Tex math="+\infty" />
        </button>
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => p.onChange('-∞')} aria-label="moins l’infini" title="moins l’infini">
          <Tex math="-\infty" />
        </button>
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => p.onChange("n'existe pas")}>
          n’existe pas
        </button>
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => insert('/')}>
          <Tex math="\frac{a}{b}" />
        </button>
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => insert('e^()')}>
          <Tex math="\mathrm{e}^{\square}" />
        </button>
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => insert('ln()')}>
          <Tex math="\ln" />
        </button>
      </div>
      <Preview value={p.value} kind="value" />
    </div>
  );
}

export function RootsInput(p: TextProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Field {...p} inputRef={ref} label={p.label ?? 'x \\in'} placeholder={p.placeholder ?? 'valeurs séparées par « ; », ex. -2 ; 3'} />
      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={p.disabled} className={keyBtn} onClick={() => p.onChange('aucune')}>
          aucune solution
        </button>
      </div>
      <Preview value={p.value} kind="roots" />
    </div>
  );
}

/** Valeur décimale (statistique, p-valeur…) : virgule ou point. */
export function NumberInput(p: TextProps) {
  const ref = useRef<HTMLInputElement>(null);
  const read = p.value.trim() ? parseNumber(p.value) : null;
  return (
    <div className="space-y-1.5">
      <Field {...p} inputRef={ref} placeholder={p.placeholder ?? 'ex. 3,84 ou 0,047'} />
      <p className={`min-h-6 font-sans text-xs ${read !== null && typeof read !== 'number' ? 'text-pen' : 'text-ink-faint'}`}>
        {read === null ? (
          'Valeur décimale : virgule ou point.'
        ) : typeof read === 'number' ? (
          <>
            lu : <Tex math={String(Number(read.toPrecision(12))).replace('.', '{,}')} />
          </>
        ) : (
          read.message
        )}
      </p>
    </div>
  );
}

interface ChoiceProps {
  name: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  wrong?: boolean;
}

/** Choix unique parmi des propositions (texte avec $…$). */
export function ChoiceInput({ name, options, value, onChange, disabled, wrong }: ChoiceProps) {
  return (
    <fieldset className="space-y-1" disabled={disabled}>
      {options.map((o, i) => {
        const checked = value === String(i);
        return (
          <label
            key={i}
            className={`flex cursor-pointer items-baseline gap-2.5 rounded border px-3 py-1.5 ${
              checked ? (wrong ? 'border-pen bg-pen-soft' : 'border-ink bg-blue-soft') : 'border-rule hover:border-rule-strong'
            } ${disabled ? 'cursor-default opacity-70' : ''}`}
          >
            <input type="radio" name={name} value={i} checked={checked} onChange={() => onChange(String(i))} className="accent-[var(--ink)]" />
            <MathText text={o} />
          </label>
        );
      })}
    </fieldset>
  );
}

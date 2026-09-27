import { describe, expect, it } from 'vitest';
import { checkExpression, checkRoots, checkTable, checkValue, emptyTableAnswer, parseValue } from '../src/checking/check';
import { evaluate } from '../src/core/expr/evaluate';
import { toText } from '../src/core/expr/toText';
import { generateExercise, TEMPLATES } from '../src/exercises/registry';
import type { RootsQuestion, TableQuestion, ValueAnswer, ValueQuestion } from '../src/exercises/types';

const SEEDS = Array.from({ length: 40 }, (_, i) => (i * 40503 + 7) >>> 0);

/** Ce qu'un élève taperait pour une valeur attendue. */
function typedValue(v: ValueAnswer): string {
  if (v.kind === 'infinity') return v.sign > 0 ? '+inf' : '-inf';
  if (v.kind === 'none') return "n'existe pas";
  return toText(v.expr);
}

describe('saisie de la bonne réponse, pour chaque type d’exercice', () => {
  it.each(TEMPLATES.map((t) => [t.code, t] as const))('%s', (_c, t) => {
    for (const seed of SEEDS) {
      for (const parts of [1, 2]) {
        const ex = generateExercise(t, seed, parts);
        for (const q of ex.questions) {
          const ctx = `${ex.uid} ${q.id}`;
          if (q.type === 'expression') {
            expect(checkExpression(toText(q.expected), q).status, ctx).toBe('correct');
            for (const m of q.mistakes ?? []) {
              const r = checkExpression(toText(m.expr), q);
              expect(r.status, ctx).toBe('incorrect');
              expect(r.message, ctx).toBe(m.message);
            }
            expect(checkExpression('x+123456', q).status, ctx).toBe('incorrect');
          }
          if (q.type === 'value') {
            expect(checkValue(typedValue(q.expected), q).status, ctx).toBe('correct');
            for (const m of q.mistakes ?? []) expect(checkValue(typedValue(m.answer), q).message, ctx).toBe(m.message);
          }
          if (q.type === 'roots') {
            const typed = q.expected.length ? [...q.expected].reverse().map(String).join(' ; ') : 'aucune';
            expect(checkRoots(typed, q).status, ctx).toBe('correct');
          }
          if (q.type === 'table') {
            const perfect = q.expected.rows.map((r) => (r.kind === 'sign' ? { signs: r.signs, marks: r.marks } : { arrows: r.arrows }));
            expect(checkTable(perfect, q).status, ctx).toBe('correct');
            expect(checkTable(emptyTableAnswer(q.expected), q).status, ctx).toBe('invalid');
          }
        }
      }
    }
  });
});

describe('parseValue', () => {
  it.each([
    ['+inf', { kind: 'infinity', sign: 1 }],
    ['+∞', { kind: 'infinity', sign: 1 }],
    ['infini', { kind: 'infinity', sign: 1 }],
    ['-oo', { kind: 'infinity', sign: -1 }],
    ['− ∞', { kind: 'infinity', sign: -1 }],
    ["n'existe pas", { kind: 'none' }],
    ['n’existe pas', { kind: 'none' }],
    ['∄', { kind: 'none' }],
  ])('%s', (s, expected) => {
    expect(parseValue(s)).toEqual(expected);
  });

  it.each([
    ['3/4', 0.75],
    ['-1/2', -0.5],
    ['0,25', 0.25],
    ['e^2', Math.E ** 2],
    ['ln 3', Math.log(3)],
    ['√2', Math.SQRT2],
    ['2pi', 2 * Math.PI],
  ])('nombre %s', (s, v) => {
    const p = parseValue(s);
    expect(p).toMatchObject({ kind: 'finite' });
    if ('value' in p) expect(p.value).toBeCloseTo(v, 12);
  });

  it.each(['', 'x+1', '(2', 'ln(0)', 'abc'])('refuse « %s »', (s) => {
    expect(parseValue(s)).toMatchObject({ status: 'invalid' });
  });
});

describe('checkValue', () => {
  const q = (expected: ValueAnswer, mistakes?: ValueQuestion['mistakes']): ValueQuestion => ({ id: 'q', type: 'value', prompt: '', expected, mistakes });
  const fin = (v: number): ValueAnswer => ({ kind: 'finite', expr: { type: 'num', value: { n: v * 4, d: 4 } }, latex: '' });

  it('distingue les infinis et les valeurs', () => {
    expect(checkValue('+inf', q({ kind: 'infinity', sign: 1 })).status).toBe('correct');
    expect(checkValue('-inf', q({ kind: 'infinity', sign: 1 })).message).toMatch(/signe/);
    expect(checkValue('3', q({ kind: 'infinity', sign: 1 })).status).toBe('incorrect');
    expect(checkValue('+inf', q(fin(2))).message).toMatch(/finie/);
    expect(checkValue('2.0000000001', q(fin(2))).status).toBe('correct');
    expect(checkValue('2.01', q(fin(2))).status).toBe('incorrect');
    expect(checkValue("n'existe pas", q({ kind: 'none' })).status).toBe('correct');
  });

  it('reconnaît une erreur classique', () => {
    const r = checkValue('-inf', q({ kind: 'infinity', sign: 1 }, [{ answer: { kind: 'infinity', sign: -1 }, message: 'Regarde le signe du dénominateur.' }]));
    expect(r.message).toBe('Regarde le signe du dénominateur.');
  });
});

describe('checkRoots', () => {
  const q: RootsQuestion = { id: 'q', type: 'roots', prompt: '', expected: [-2, 3], expectedLatex: ['-2', '3'] };
  it.each([
    ['-2 ; 3', 'correct'],
    ['3;-2', 'correct'],
    ['3 ; -2 ; 3', 'correct'],
    ['6/2 ; -4/2', 'correct'],
    ['3 et -2', 'correct'],
    ['3', 'partial'],
    ['3 ; -2 ; 5', 'partial'],
    ['5 ; 7', 'incorrect'],
    ['aucune', 'incorrect'],
    ['', 'invalid'],
    ['3 ; x', 'invalid'],
    ['3 ; +inf', 'invalid'],
  ])('« %s » → %s', (s, status) => {
    expect(checkRoots(s, q).status).toBe(status);
  });

  it('accepte « aucune » quand il n’y a pas de solution', () => {
    const none: RootsQuestion = { ...q, expected: [], expectedLatex: [] };
    expect(checkRoots('aucune', none).status).toBe('correct');
    expect(checkRoots('1', none).message).toMatch(/aucune solution/);
  });
});

describe('checkTable', () => {
  const t = TEMPLATES.find((x) => x.code === 'V04')!;
  const ex = generateExercise(t, 5);
  const q = ex.questions.find((x) => x.type === 'table') as TableQuestion;
  const perfect = () => q.expected.rows.map((r) => (r.kind === 'sign' ? { signs: [...r.signs], marks: [...r.marks] } : { arrows: [...r.arrows] }));

  it('signale précisément les cases fausses', () => {
    const a = perfect();
    a[0].signs![0] = a[0].signs![0] === '+' ? '-' : '+';
    a[2].marks![1] = a[2].marks![1] === '0' ? '||' : '0';
    const r = checkTable(a, q);
    expect(r.status).toBe('partial');
    expect(r.wrongCells).toEqual(['r0s0', 'r2m1']);
  });

  it('majorité de cases fausses → incorrect', () => {
    const a = perfect().map((row) => ({ signs: row.signs?.map((s) => (s === '+' ? '-' : '+')), marks: row.marks?.map(() => '' as const) }));
    expect(checkTable(a, q).status).toBe('incorrect');
  });

  it('les bornes ne comptent pas comme marques', () => {
    const a = perfect();
    a[0].marks![0] = '0';
    expect(checkTable(a, q).status).toBe('correct');
  });
});

describe('checkExpression', () => {
  const t = TEMPLATES.find((x) => x.code === 'D07')!; // (ax+b)e^x
  const ex = generateExercise(t, 3);
  const q = ex.questions[0];
  if (q.type !== 'expression') throw new Error();

  it('accepte des écritures différentes de la même dérivée', () => {
    const e = q.expected;
    const text = toText(e);
    expect(checkExpression(text, q).status).toBe('correct');
    expect(checkExpression(`(${text})*1`, q).status).toBe('correct');
    expect(checkExpression(`(${text})+0x`, q).status).toBe('correct');
    // valeur numérique identique en tous points de test
    expect(evaluate(e, 1)).toBeCloseTo(evaluate(e, 1));
  });

  it('refuse une saisie invalide sans la compter comme fausse', () => {
    expect(checkExpression('(x+', q).status).toBe('invalid');
    expect(checkExpression('y', q).message).toMatch(/inconnu/);
  });
});

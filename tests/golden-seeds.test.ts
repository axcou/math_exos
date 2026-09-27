import { describe, expect, it } from 'vitest';
import { generateExercise, TEMPLATES } from '../src/exercises/registry';

/*
 * Stabilité des liens de partage : pour chaque code, quelques graines doivent
 * toujours produire le même énoncé et les mêmes réponses attendues.
 *
 * Si ce test échoue après une modification d'un générateur, NE PAS mettre à
 * jour le snapshot : créer un nouveau code (ex. D17) et passer l'ancien
 * template en `legacy: true`, sinon les liens déjà partagés changeraient.
 * (Seules les modifications de texte des corrections, hors énoncé et
 * réponses, sont sans risque.)
 */
const GOLDEN = [1, 42, 123456789];

describe('golden seeds', () => {
  it.each(TEMPLATES.map((t) => [t.code, t] as const))('%s est stable', (_c, t) => {
    const snap = GOLDEN.map((seed) => {
      const ex = generateExercise(t, seed);
      return {
        statement: ex.statement,
        answers: ex.questions.map((q) =>
          q.type === 'expression' ? q.expectedLatex : q.type === 'roots' ? q.expectedLatex.join(';') : q.type === 'value' ? JSON.stringify(q.expected.kind === 'finite' ? q.expected.latex : q.expected) : q.expected.rows.map((r) => (r.kind === 'sign' ? r.signs.join('') + r.marks.join(',') : r.arrows.join(','))).join('|'),
        ),
      };
    });
    expect(snap).toMatchSnapshot();
  });
});

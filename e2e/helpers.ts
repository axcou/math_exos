import { expect, type Locator, type Page } from '@playwright/test';
import { toText } from '../src/core/expr/toText';
import { exerciseFromRef } from '../src/exercises/registry';
import type { Exercise, Question, TableData } from '../src/exercises/types';
import { encodeSheet, type ExerciseRef } from '../src/share/share';

/** Les exercices sont reproductibles : le test connaît les réponses attendues. */
export function exercise(code: string, seed: number, parts = 1): Exercise {
  const ex = exerciseFromRef(code, seed, parts);
  if (!ex) throw new Error(`template inconnu ${code}`);
  return ex;
}

export function sheetRoute(exs: Exercise[], opts: { title?: string; showSolutions?: boolean; inputs?: boolean; allowRetry?: boolean; singleAttempt?: boolean } = {}): string {
  const refs: ExerciseRef[] = exs.map((e) => (e.parts.length > 1 ? { code: e.code, seed: e.seed, parts: e.parts.length } : { code: e.code, seed: e.seed }));
  return `#/${encodeSheet({ refs, title: opts.title ?? '', showSolutions: opts.showSolutions ?? true, inputs: opts.inputs ?? true, allowRetry: opts.allowRetry, singleAttempt: opts.singleAttempt })}`;
}

/** Ouvre une feuille précise (via un lien de partage) et attend son affichage. */
export async function openSheet(page: Page, exs: Exercise[], opts?: Parameters<typeof sheetRoute>[1]) {
  await page.goto(sheetRoute(exs, opts));
  await expect(page.locator('article').first()).toBeVisible();
}

export const card = (page: Page, ex: Exercise) => page.locator(`article[id="${ex.uid}"]`);
export const questionBlock = (article: Locator, q: Question) => article.locator(`[data-question="${q.id}"]`);

/** Ce qu'un élève taperait pour répondre juste. */
export function typedAnswer(q: Question): string {
  switch (q.type) {
    case 'expression':
      return toText(q.expected);
    case 'value':
      if (q.expected.kind === 'infinity') return q.expected.sign > 0 ? '+inf' : '-inf';
      if (q.expected.kind === 'none') return "n'existe pas";
      return toText(q.expected.expr);
    case 'roots':
      return q.expected.length ? q.expected.map(String).join(' ; ') : 'aucune';
    case 'number':
      // comme un élève : arrondi demandé, virgule décimale
      return q.expected.toFixed(q.decimals).replace('.', ',');
    case 'choice':
      throw new Error('choix : cocher la proposition');
    default:
      throw new Error('tableau : utiliser fillTable');
  }
}

const CLICKS: Record<string, number> = { '': 0, '+': 1, '-': 2, '0': 1, '||': 2, up: 1, down: 2 };

/** Remplit un tableau de signes / variations en cliquant sur les cases. */
export async function fillTable(block: Locator, table: TableData, alter?: (id: string, v: string) => string) {
  for (const [i, row] of table.rows.entries()) {
    const cells: [string, string][] =
      row.kind === 'sign'
        ? [...row.signs.map((s, j): [string, string] => [`r${i}s${j}`, s]), ...row.marks.map((m, j): [string, string] => [`r${i}m${j}`, m]).slice(1, -1)]
        : row.arrows.map((a, j): [string, string] => [`r${i}a${j}`, a]);
    for (const [id, value] of cells) {
      const v = alter ? alter(id, value) : value;
      const n = CLICKS[v];
      const el = block.locator(`[data-cell="${id}"]`);
      for (let k = 0; k < n; k++) await el.click();
    }
  }
}

/** Répond juste à toutes les questions d'un exercice. */
export async function answerAll(page: Page, ex: Exercise) {
  const art = card(page, ex);
  for (const q of ex.questions) {
    const block = questionBlock(art, q);
    if (q.type === 'table') await fillTable(block, q.expected);
    else if (q.type === 'choice') await block.getByRole('radio').nth(q.expected).check();
    else await block.locator('input').first().fill(typedAnswer(q));
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
  }
}

/** Collecte les erreurs JavaScript et console pendant un test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

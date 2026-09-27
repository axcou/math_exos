import { expect, test } from '@playwright/test';
import { answerAll, card, exercise, fillTable, openSheet, questionBlock, trackErrors, typedAnswer } from './helpers';

test.describe('répondre aux exercices', () => {
  test('dérivée juste : « Juste » puis « Réussi »', async ({ page }) => {
    const errors = trackErrors(page);
    const ex = exercise('D05', 1234);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    const q = ex.questions[0];
    const block = questionBlock(art, q);
    await block.locator('input').fill(typedAnswer(q));
    // aperçu en direct de la saisie
    await expect(block.getByText('lu :')).toBeVisible();
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
    await expect(art.getByText('Réussi')).toBeVisible();
    await expect(page.getByText('1/1')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('réponse fausse, erreur classique et saisie illisible', async ({ page }) => {
    const ex = exercise('D05', 99);
    await openSheet(page, [ex]);
    const q = ex.questions[0];
    if (q.type !== 'expression') throw new Error();
    const block = questionBlock(card(page, ex), q);
    const input = block.locator('input');
    const status = block.getByRole('status');

    await input.fill('x^2 + 1');
    await input.press('Enter');
    await expect(status).toContainText('Faux');
    await expect(status).toContainText('1 essai');

    // erreur classique : numérateur inversé
    const { toText } = await import('../src/core/expr/toText');
    await input.fill(toText(q.mistakes![0].expr));
    await input.press('Enter');
    await expect(status).toContainText(/ordre|carré/);
    await expect(status).toContainText('2 essais');

    // une saisie illisible n'est pas comptée
    await input.fill('(x+');
    await input.press('Enter');
    await expect(status).toContainText('Illisible');
    await expect(status).toContainText('2 essais');
  });

  test('clavier de raccourcis', async ({ page }) => {
    const ex = exercise('D10', 5);
    await openSheet(page, [ex]);
    const block = questionBlock(card(page, ex), ex.questions[0]);
    await block.getByTitle('Insérer ln').click();
    await block.locator('input').pressSequentially('x');
    await expect(block.locator('input')).toHaveValue('ln(x)');
  });

  test('limite avec les boutons ±∞', async ({ page }) => {
    const ex = exercise('L01', 7);
    const q = ex.questions[0];
    if (q.type !== 'value' || q.expected.kind !== 'infinity') throw new Error('attendu : limite infinie');
    await openSheet(page, [ex]);
    const block = questionBlock(card(page, ex), q);
    await block.getByRole('button', { name: q.expected.sign > 0 ? 'plus l’infini' : 'moins l’infini' }).click();
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
  });

  test('tableau de signes rempli au clic', async ({ page }) => {
    const ex = exercise('V04', 21);
    const q = ex.questions.find((x) => x.type === 'table')!;
    if (q.type !== 'table') throw new Error();
    await openSheet(page, [ex]);
    const block = questionBlock(card(page, ex), q);

    // d'abord avec une erreur volontaire
    await fillTable(block, q.expected, (id, v) => (id === 'r0s0' ? (v === '+' ? '-' : '+') : v));
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Presque');
    await expect(block.locator('[data-wrong]')).toHaveCount(1);
    await expect(block.locator('[data-wrong]')).toHaveAttribute('data-cell', 'r0s0');

    // on corrige la case : un clic de plus fait passer au signe suivant
    const cell = block.locator('[data-cell="r0s0"]');
    const target = q.expected.rows[0].kind === 'sign' ? q.expected.rows[0].signs[0] : '+';
    const cycle = ['', '+', '-'];
    while ((await cell.innerText()).replace('−', '-').trim() !== target) await cell.click();
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
    expect(cycle).toContain(target);
  });

  test('tableau de variations au clavier', async ({ page }) => {
    const ex = exercise('V03', 4);
    const q = ex.questions.find((x) => x.type === 'table')!;
    if (q.type !== 'table') throw new Error();
    await openSheet(page, [ex]);
    const block = questionBlock(card(page, ex), q);
    for (const [i, row] of q.expected.rows.entries()) {
      if (row.kind === 'sign') {
        for (const [j, s] of row.signs.entries()) {
          await block.locator(`[data-cell="r${i}s${j}"]`).focus();
          await page.keyboard.press(s === '+' ? '+' : '-');
        }
        for (let j = 1; j < row.marks.length - 1; j++) {
          if (!row.marks[j]) continue;
          await block.locator(`[data-cell="r${i}m${j}"]`).focus();
          await page.keyboard.press(row.marks[j] === '0' ? '0' : '|');
        }
      } else {
        for (const [j, a] of row.arrows.entries()) {
          await block.locator(`[data-cell="r${i}a${j}"]`).focus();
          await page.keyboard.press(a === 'up' ? 'ArrowUp' : 'ArrowDown');
        }
      }
    }
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
  });

  test('exercice complet de variations (dérivée, tableau, extremum)', async ({ page }) => {
    const ex = exercise('V05', 17);
    await openSheet(page, [ex]);
    await answerAll(page, ex);
    await expect(card(page, ex).getByText('Réussi')).toBeVisible();
  });

  test('exercice en trois parties a, b, c', async ({ page }) => {
    const ex = exercise('D11', 42, 3);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    await expect(art.getByText('Calculer la dérivée de chacune des fonctions suivantes.')).toBeVisible();
    for (const label of ['a.', 'b.', 'c.']) await expect(art.getByText(label, { exact: true }).first()).toBeVisible();
    await expect(art.getByRole('button', { name: 'Vérifier' })).toHaveCount(3);
    await answerAll(page, ex);
    await expect(art.getByText('Réussi')).toBeVisible();
  });

  test('coup de pouce, puis correction étape par étape', async ({ page }) => {
    const ex = exercise('D06', 8);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    await art.getByRole('button', { name: 'Coup de pouce' }).click();
    await expect(art.getByText('Coup de pouce', { exact: true })).toBeVisible();
    await art.getByRole('button', { name: 'Voir la correction' }).click();
    await expect(art.getByText('Corrigé', { exact: true })).toBeVisible();
    const next = art.getByRole('button', { name: /Étape suivante/ });
    await expect(next).toContainText(`1/${ex.steps.length}`);
    await next.click();
    await expect(next).toContainText(`2/${ex.steps.length}`);
    await art.getByRole('button', { name: 'tout afficher' }).click();
    await expect(next).toHaveCount(0);
    await expect(art.getByText('Conclusion')).toBeVisible();
    // ouvrir la correction avant d'avoir répondu : exercice à revoir
    await expect(art.getByText('À revoir')).toBeVisible();
  });

  test('rappel de formule dépliable', async ({ page }) => {
    const ex = exercise('D05', 3);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    await art.getByRole('button', { name: 'Voir la correction' }).click();
    await art.getByRole('button', { name: 'tout afficher' }).click();
    await art.getByRole('button', { name: 'quotient' }).first().click();
    await expect(art.getByText(/Rappel · Quotient/)).toBeVisible();
  });

  test('changer d’énoncé et ajouter un exercice similaire', async ({ page }) => {
    await page.goto('#/exercices?theme=derivee');
    await expect(page.locator('article').first()).toBeVisible();
    const before = await page.locator('article').count();
    const first = page.locator('article').first();
    const id = await first.getAttribute('id');
    await first.getByRole('button', { name: 'Changer d’énoncé' }).click();
    await expect(page.locator('article').first()).not.toHaveAttribute('id', id!);
    await expect(page.locator('article')).toHaveCount(before);
    await page.locator('article').first().getByRole('button', { name: 'Un autre du même genre' }).click();
    await expect(page.locator('article')).toHaveCount(before + 1);
  });

  test('recommencer efface la réponse', async ({ page }) => {
    const ex = exercise('D01', 2);
    await openSheet(page, [ex]);
    const block = questionBlock(card(page, ex), ex.questions[0]);
    await block.locator('input').fill('x');
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toBeVisible();
    await card(page, ex).getByRole('button', { name: 'Recommencer' }).click();
    await expect(block.getByRole('status')).toHaveCount(0);
    await expect(block.locator('input')).toHaveValue('');
  });

  test('les réponses survivent au rechargement de la page', async ({ page }) => {
    const ex = exercise('D02', 11);
    await openSheet(page, [ex]);
    const block = questionBlock(card(page, ex), ex.questions[0]);
    await block.locator('input').fill(typedAnswer(ex.questions[0]));
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
    await page.reload();
    await expect(questionBlock(card(page, ex), ex.questions[0]).locator('input')).toHaveValue(typedAnswer(ex.questions[0]));
    await expect(questionBlock(card(page, ex), ex.questions[0]).getByRole('status')).toContainText('Juste');
  });

  test('mode papier : pas de champs, marquage manuel', async ({ page }) => {
    const ex = exercise('L03', 13);
    await openSheet(page, [ex]);
    await page.getByLabel('répondre à l’écran').uncheck();
    const art = card(page, ex);
    await expect(art.locator('input')).toHaveCount(0);
    await expect(art.getByText('Sur papier :')).toBeVisible();
    await art.getByRole('button', { name: 'réussi', exact: true }).click();
    await expect(art.getByText('Réussi', { exact: true })).toBeVisible();
  });

  test('lien vers la fiche méthode', async ({ page }) => {
    const ex = exercise('L07', 6);
    await openSheet(page, [ex]);
    await card(page, ex).getByRole('link', { name: 'La méthode' }).click();
    await expect(page).toHaveURL(/methodes\?m=lim-conjugue/);
    await expect(page.locator('#lim-conjugue')).toBeInViewport();
  });
});

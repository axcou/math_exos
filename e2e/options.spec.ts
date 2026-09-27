import { expect, type Page, test } from '@playwright/test';
import { card, exercise, openSheet, questionBlock, typedAnswer } from './helpers';

test.describe('recommencer et coup de pouce', () => {
  test('« Recommencer » referme la correction et le coup de pouce', async ({ page }) => {
    const ex = exercise('D05', 314);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    await art.getByRole('button', { name: 'Coup de pouce' }).click();
    const block = questionBlock(art, ex.questions[0]);
    await block.locator('input').fill('x');
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await art.getByRole('button', { name: 'Voir la correction' }).click();
    await expect(art.getByText('Corrigé', { exact: true })).toBeVisible();

    await art.getByRole('button', { name: 'Recommencer' }).click();
    await expect(art.getByText('Corrigé', { exact: true })).toHaveCount(0);
    await expect(art.locator('.box').filter({ hasText: 'Coup de pouce' })).toHaveCount(0);
    await expect(art.getByRole('button', { name: 'Voir la correction' })).toBeVisible();
    await expect(block.locator('input')).toHaveValue('');
    await expect(art.getByText('À revoir')).toHaveCount(0);
  });

  test('le coup de pouce se ferme', async ({ page }) => {
    const ex = exercise('D07', 2);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    const box = art.locator('.box').filter({ hasText: 'Coup de pouce' });
    await art.getByRole('button', { name: 'Coup de pouce' }).click();
    await expect(box).toBeVisible();
    await box.getByRole('button', { name: 'Fermer le coup de pouce' }).click();
    await expect(box).toHaveCount(0);
    // le lien du bas fonctionne comme un interrupteur
    await art.getByRole('button', { name: 'Coup de pouce' }).click();
    await expect(box).toBeVisible();
    await art.getByRole('button', { name: 'Masquer le coup de pouce' }).click();
    await expect(box).toHaveCount(0);
  });
});

test.describe('feuille partagée en mode contrôle', () => {
  test('une seule vérification : la réponse se verrouille', async ({ page }) => {
    const ex = exercise('D05', 21);
    await openSheet(page, [ex], { singleAttempt: true });
    await expect(page.getByText('une seule vérification par question')).toBeVisible();
    const block = questionBlock(card(page, ex), ex.questions[0]);
    await block.locator('input').fill('x^2');
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Faux');
    await expect(block.locator('input')).toBeDisabled();
    await expect(block.getByRole('button', { name: 'Vérifier' })).toHaveCount(0);
    await expect(block.getByText('Réponse enregistrée')).toBeVisible();
    await expect(block.getByRole('status')).toContainText('1 essai');
    // toujours verrouillé après rechargement
    await page.reload();
    await expect(questionBlock(card(page, ex), ex.questions[0]).locator('input')).toBeDisabled();
  });

  test('une saisie illisible ne verrouille pas', async ({ page }) => {
    const ex = exercise('D05', 22);
    await openSheet(page, [ex], { singleAttempt: true });
    const block = questionBlock(card(page, ex), ex.questions[0]);
    await block.locator('input').fill('(x+');
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Illisible');
    await expect(block.locator('input')).toBeEnabled();
    await block.locator('input').fill(typedAnswer(ex.questions[0]));
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toContainText('Juste');
    await expect(block.locator('input')).toBeDisabled();
  });

  test('tableau verrouillé après une vérification', async ({ page }) => {
    const ex = exercise('V01', 9);
    await openSheet(page, [ex], { singleAttempt: true });
    const q = ex.questions.find((x) => x.type === 'table')!;
    const block = questionBlock(card(page, ex), q);
    await block.locator('[data-cell="r0s0"]').click();
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.locator('[data-cell="r0s0"]')).toBeDisabled();
  });

  test('sans « Recommencer »', async ({ page }) => {
    const ex = exercise('D05', 23);
    await openSheet(page, [ex], { allowRetry: false });
    await expect(page.getByText('pas de nouvel essai')).toBeVisible();
    const block = questionBlock(card(page, ex), ex.questions[0]);
    await block.locator('input').fill('x');
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByRole('status')).toBeVisible();
    await expect(card(page, ex).getByRole('button', { name: 'Recommencer' })).toHaveCount(0);
  });

  test('les options se choisissent dans la fenêtre de partage et suivent le lien', async ({ page, browser }) => {
    await page.goto('#/exercices?theme=derivee');
    await expect(page.locator('article').first()).toBeVisible();
    await page.getByRole('button', { name: 'partager', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Une seule vérification par question/).check();
    await dialog.getByLabel(/Autoriser « Recommencer »/).uncheck();
    const url = await dialog.getByLabel('Lien de partage').inputValue();
    expect(url).toMatch(/[?&]r=0/);
    expect(url).toMatch(/[?&]u=1/);

    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(url);
    await expect(p2.getByText('une seule vérification par question')).toBeVisible();
    const first = p2.locator('article').first();
    const block = first.locator('[data-question]').first();
    await block.locator('input').first().fill('x');
    await block.getByRole('button', { name: 'Vérifier' }).click();
    await expect(block.getByText('Réponse enregistrée')).toBeVisible();
    await expect(first.getByRole('button', { name: 'Recommencer' })).toHaveCount(0);
    await other.close();
  });
});

/** Rapport de contraste WCAG entre la couleur du texte et celle du fond. */
async function contrast(page: Page, selector: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const parse = (c: string) => c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const cs = getComputedStyle(el);
      const a = lum(parse(cs.color));
      const b = lum(parse(cs.backgroundColor));
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
}

test.describe('sélecteur du nombre de questions', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`texte lisible en mode ${scheme === 'light' ? 'clair' : 'sombre'}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto('#/exercices');
      if (!(await page.getByText('Composer la feuille').isVisible())) await page.getByRole('button', { name: 'Réglages de la feuille' }).click();
      const select = page.getByLabel('Questions par exercice de Dérivées');
      await expect(select).toBeVisible();
      expect(await contrast(page, 'select.select')).toBeGreaterThan(7);
      expect(await contrast(page, 'select.select option')).toBeGreaterThan(7);
      await select.selectOption('4');
      await expect(select).toHaveValue('4');
      await ctx.close();
    });
  }
});

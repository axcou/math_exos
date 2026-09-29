import { expect, type Page, test } from '@playwright/test';

async function openBuilder(page: Page) {
  await page.goto('#/exercices');
  const toggle = page.getByRole('button', { name: /Réglages de la feuille|Fermer les réglages/ });
  if (!(await page.getByText('Composer la feuille').isVisible())) await toggle.click();
  await expect(page.getByText('Composer la feuille')).toBeVisible();
}

const row = (page: Page, theme: string) => page.locator('section.panel > div').filter({ hasText: theme });

test.describe('composer une feuille', () => {
  test('un seul chapitre, nombre, niveau et questions par exercice', async ({ page }) => {
    await openBuilder(page);
    await row(page, 'Dérivées').getByRole('checkbox').first().uncheck();
    await row(page, 'Signes & variations').getByRole('checkbox').first().uncheck();
    const lim = row(page, 'Limites');
    await lim.getByLabel('Nombre d’exercices de Limites').fill('4');
    await lim.getByRole('radio', { name: 'moyen' }).click();
    await lim.getByLabel('Questions par exercice de Limites').selectOption('2');
    await expect(page.getByText('4 exercices', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Générer la feuille' }).click();

    await expect(page.locator('article')).toHaveCount(4);
    expect(await page.locator('.chap-tab').allInnerTexts()).toEqual(['LIMITES']);
    for (const art of await page.locator('article').all()) {
      await expect(art.getByLabel('Niveau moyen')).toBeVisible();
      await expect(art.getByText('b.', { exact: true })).toBeVisible();
    }
  });

  test('plusieurs chapitres : un bandeau par chapitre, dans l’ordre', async ({ page }) => {
    await openBuilder(page);
    await page.getByRole('button', { name: 'Tout (3 × 3)' }).click();
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    await expect(page.locator('article')).toHaveCount(9);
    expect(await page.locator('.chap-tab').allInnerTexts()).toEqual(['DÉRIVÉES', 'LIMITES', 'SIGNES & VARIATIONS']);
    // numérotation continue
    const nums = await page.locator('article .ex-num').allInnerTexts();
    expect(nums).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  test('ordre mélangé : une seule page, chapitre rappelé sur chaque exercice', async ({ page }) => {
    await openBuilder(page);
    await page.getByRole('button', { name: 'Dérivées + limites' }).click();
    await page.getByLabel('mélangé').check();
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    await expect(page.locator('article')).toHaveCount(10);
    expect(await page.locator('.chap-tab').allInnerTexts()).toEqual(['EXERCICES']);
  });

  test('filtre par type d’exercice', async ({ page }) => {
    await openBuilder(page);
    await page.getByRole('button', { name: '10 dérivées' }).click();
    const der = row(page, 'Dérivées');
    await der.getByRole('radio', { name: 'moyen' }).click();
    await der.getByRole('button', { name: 'tous les types' }).click();
    // on ne garde que « Quotient » : on décoche tous les autres types
    const boxes = der.locator('label').filter({ has: page.locator('input[type=checkbox]') });
    for (const box of await boxes.all()) {
      const name = (await box.innerText()).trim();
      if (name && name !== 'Quotient' && name !== 'Dérivées') await box.locator('input').uncheck();
    }
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    await expect(page.locator('article')).toHaveCount(10);
    for (const t of await page.locator('article h3').allInnerTexts()) expect(t).toMatch(/quotient/i);
  });

  test('trop d’exercices : génération impossible', async ({ page }) => {
    await openBuilder(page);
    for (const theme of ['Dérivées', 'Limites', 'Signes & variations']) {
      const r = row(page, theme);
      await r.getByRole('checkbox').first().check();
      await r.getByRole('spinbutton').fill('20');
    }
    await expect(page.getByText(/maximum 40/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Générer la feuille' })).toBeDisabled();
  });

  test('la composition est mémorisée', async ({ page }) => {
    await openBuilder(page);
    await page.getByRole('button', { name: '6 tableaux' }).click();
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    await expect(page.locator('article')).toHaveCount(6);
    await page.reload();
    await expect(page.locator('article')).toHaveCount(6);
    await page.getByRole('button', { name: 'Nouvelle feuille' }).click();
    await expect(page.locator('article')).toHaveCount(6);
    expect(await page.locator('.chap-tab').allInnerTexts()).toEqual(['SIGNES & VARIATIONS']);
  });

  test('deux feuilles de suite ne donnent pas les mêmes énoncés', async ({ page }) => {
    await page.goto('#/exercices?theme=limite');
    await expect(page.locator('article').first()).toBeVisible();
    const ids1 = await page.locator('article').evaluateAll((els) => els.map((e) => e.id));
    await page.getByRole('button', { name: 'Nouvelle feuille' }).click();
    await expect(page.locator('article').first()).not.toHaveAttribute('id', ids1[0]);
    const ids2 = await page.locator('article').evaluateAll((els) => els.map((e) => e.id));
    expect(ids2.filter((id) => ids1.includes(id))).toEqual([]);
  });
});

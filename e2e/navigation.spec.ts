import { expect, test } from '@playwright/test';
import { trackErrors } from './helpers';

test.describe('navigation', () => {
  test('l’accueil présente les trois chapitres', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Des exercices qui ne se répètent pas');
    for (const t of ['Dérivées', 'Limites', 'Signes & variations']) await expect(page.getByRole('link', { name: new RegExp(t) }).first()).toBeVisible();
    await expect(page.getByText('11 types')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('chaque page du menu s’ouvre', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('./');
    const pages: [string, RegExp][] = [
      ['Exercices', /Réglages de la feuille|Pas encore de feuille|Composer la feuille/],
      ['Tests stat.', /Tests statistiques/],
      ['Méthodes', /Méthodes/],
      ['Calculateurs', /Calculateurs/],
      ['Formulaire', /Formulaire/],
      ['Historique', /Historique/],
    ];
    for (const [link, text] of pages) {
      await page.getByRole('navigation').getByRole('link', { name: link, exact: true }).click();
      await expect(page.locator('main')).toContainText(text);
    }
    await page.getByRole('link', { name: 'Math-Exo.' }).click();
    await expect(page.getByText('Sommaire')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('une adresse inconnue renvoie à l’accueil', async ({ page }) => {
    await page.goto('#/nimporte-quoi');
    await expect(page.getByText('Sommaire')).toBeVisible();
  });

  test('un chapitre du sommaire génère une feuille de ce chapitre', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('link', { name: /Limites/ }).first().click();
    await expect(page).toHaveURL(/#\/exercices$/);
    await expect(page.locator('article').first()).toBeVisible();
    const chapters = await page.locator('.chap-tab').allInnerTexts();
    expect(chapters).toEqual(['LIMITES']);
    expect(await page.locator('article').count()).toBeGreaterThanOrEqual(5);
  });
});

import { expect, test } from '@playwright/test';
import { METHODS } from '../src/methods/methods';
import { trackErrors } from './helpers';

test.describe('méthodes', () => {
  test('sommaire et fiches', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/methodes');
    await expect(page.locator('article')).toHaveCount(METHODS.length);
    await page.getByRole('navigation', { name: 'Sommaire des méthodes' }).getByRole('link', { name: 'Croissances comparées' }).click();
    await expect(page.locator('#lim-croissances')).toBeInViewport();
    expect(errors).toEqual([]);
  });

  test('exemples résolus dépliables et ouvrables dans le calculateur', async ({ page }) => {
    await page.goto('#/methodes?m=der-quotient');
    const fiche = page.locator('#der-quotient');
    await expect(fiche.getByText('Erreurs fréquentes')).toBeVisible();
    // le premier exemple est ouvert, les suivants non
    await expect(fiche.getByRole('button', { name: 'masquer la solution' })).toHaveCount(1);
    await fiche.getByRole('button', { name: 'voir la solution' }).first().click();
    await expect(fiche.getByRole('button', { name: 'masquer la solution' })).toHaveCount(2);
    await fiche.getByRole('link', { name: 'ouvrir dans le calculateur' }).first().click();
    await expect(page).toHaveURL(/#\/calcul\?m=derivee&f=/);
    await expect(page.getByText('Méthode détaillée')).toBeVisible();
  });

  test('toutes les fiches affichent leurs exemples sans erreur', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/methodes');
    const buttons = page.getByRole('button', { name: 'voir la solution' });
    while ((await buttons.count()) > 0) await buttons.first().click();
    const n = METHODS.reduce((s, m) => s + m.examples.length, 0);
    await expect(page.getByRole('button', { name: 'masquer la solution' })).toHaveCount(n);
    await expect(page.locator('main')).not.toContainText('ne concorde pas');
    expect(errors).toEqual([]);
  });
});

test.describe('formulaire', () => {
  test('recherche insensible aux accents', async ({ page }) => {
    await page.goto('#/formulaire');
    const search = page.getByLabel('Rechercher une formule');
    await search.fill('discriminant');
    await expect(page.getByText('Discriminant', { exact: true })).toBeVisible();
    await expect(page.getByText('Quotient', { exact: true })).toHaveCount(0);
    await search.fill('derivee');
    await expect(page.getByText('Dérivée et variations')).toBeVisible();
    await search.fill('zzzz');
    await expect(page.getByText('Aucune formule ne correspond.')).toBeVisible();
  });
});

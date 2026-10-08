import { expect, type Page, test } from '@playwright/test';
import { exercise, openSheet, trackErrors } from './helpers';

const wide = async (page: Page) => page.setViewportSize({ width: 1500, height: 900 });
const toc = (page: Page, name = 'Sommaire') => page.getByRole('navigation', { name, exact: true });
const scrollTo = (page: Page, id: string) => page.evaluate((i) => document.getElementById(i)!.scrollIntoView(), id);

test.describe('sommaire flottant', () => {
  test('méthodes : chapitres en couleur, sous-parties du chapitre en cours seulement', async ({ page }) => {
    const errors = trackErrors(page);
    await wide(page);
    await page.goto('#/methodes');
    const nav = toc(page);
    await expect(nav).toBeVisible();
    const chapters = nav.locator(':scope > ol > li > a');
    await expect(chapters).toHaveText(['Dérivées', 'Limites', 'Signes & variations', 'Tests statistiques']);
    // une couleur par chapitre
    const colors = await chapters.evaluateAll((els) => els.map((e) => getComputedStyle(e).color));
    expect(new Set(colors).size).toBe(4);
    // en haut de page : le premier chapitre est actif, seul déroulé
    await expect(chapters.first()).toHaveAttribute('aria-current', 'true');
    await expect(nav.getByRole('list', { name: 'Sous-parties de Dérivées' })).toBeVisible();
    await expect(nav.getByRole('list', { name: 'Sous-parties de Limites' })).toHaveCount(0);

    // on lit une méthode du chapitre « Limites »
    await scrollTo(page, 'lim-conjugue');
    await expect(nav.getByRole('link', { name: 'Limites', exact: true })).toHaveAttribute('aria-current', 'true');
    const sub = nav.getByRole('list', { name: 'Sous-parties de Limites' });
    await expect(sub).toBeVisible();
    await expect(nav.getByRole('list', { name: 'Sous-parties de Dérivées' })).toHaveCount(0);
    await expect(sub.locator('a[aria-current="true"]')).toHaveText(/conjuguée/i);
    expect(errors).toEqual([]);
  });

  test('un clic défile jusqu’à la partie et la rend active', async ({ page }) => {
    await wide(page);
    await page.goto('#/methodes');
    const nav = toc(page);
    await nav.getByRole('link', { name: 'Tests statistiques' }).click();
    await expect(page.locator('#methodes-stat')).toBeInViewport();
    await expect(nav.getByRole('link', { name: 'Tests statistiques' })).toHaveAttribute('aria-current', 'true');
    await nav.getByRole('link', { name: 'Comparer des moyennes (ANOVA)' }).click();
    await expect(page.locator('#test-anova')).toBeInViewport();
  });

  test('formulaire : groupes de formules en sous-parties, suit la recherche', async ({ page }) => {
    await wide(page);
    await page.goto('#/formulaire');
    const nav = toc(page);
    await expect(nav.getByRole('list', { name: 'Sous-parties de Dérivées' })).toContainText('Dérivées usuelles');
    await page.getByLabel('Rechercher une formule').fill('khi');
    await expect(nav.locator(':scope > ol > li')).toHaveCount(0);
    await page.getByLabel('Rechercher une formule').fill('anova');
    await expect(nav.locator(':scope > ol > li > a')).toHaveText(['Tests statistiques']);
  });

  test('feuille d’exercices : un lien par exercice, numérotés comme sur la feuille', async ({ page }) => {
    await wide(page);
    const exs = [exercise('D01', 1), exercise('L05', 2), exercise('L11', 3), exercise('V03', 4)];
    await openSheet(page, exs);
    const nav = toc(page, 'Exercices');
    await expect(nav.locator(':scope > ol > li > a')).toHaveText(['Dérivées', 'Limites', 'Signes & variations']);
    await nav.getByRole('link', { name: 'Limites' }).click();
    const sub = nav.getByRole('list', { name: 'Sous-parties de Limites' });
    await expect(sub.getByRole('link')).toHaveText([`2. ${exs[1].title}`, `3. ${exs[2].title}`]);
    await sub.getByRole('link', { name: `3. ${exs[2].title}` }).click();
    await expect(page.locator(`article[id="${exs[2].uid}"]`)).toBeInViewport();
  });

  test('écran plus étroit : bouton « Sommaire » qui se replie après un choix', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.goto('#/methodes');
    await expect(page.locator('nav[aria-label="Sommaire"].fixed.top-24')).toBeHidden();
    const button = page.getByRole('button', { name: 'Sommaire', exact: true });
    await button.click();
    const nav = toc(page);
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Signes & variations' }).click();
    await expect(page.locator('#methodes-variation')).toBeInViewport();
    await expect(nav).toBeHidden();
  });

  test('pas de sommaire à l’impression', async ({ page }) => {
    await wide(page);
    await openSheet(page, [exercise('D01', 1), exercise('S02', 2)]);
    await page.emulateMedia({ media: 'print' });
    await expect(toc(page, 'Exercices')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Exercices', exact: true })).toBeHidden();
  });
});

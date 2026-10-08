import { expect, test } from '@playwright/test';
import { trackErrors } from './helpers';

const result = (page: import('@playwright/test').Page) => page.getByLabel('Résultat du calcul de p-valeur');

test.describe('calculateur de p-valeur et de seuils de rejet', () => {
  test('onglet accessible depuis les calculateurs et depuis la page des tests', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/calcul');
    await page.getByRole('button', { name: 'Lois & p-valeur' }).click();
    await expect(page).toHaveURL(/m=loi/);
    await expect(page.getByRole('radiogroup', { name: 'Loi' })).toBeVisible();
    await page.goto('#/tests');
    await page.getByRole('link', { name: 'Calculateur de p-valeur et de seuils de rejet' }).click();
    await expect(page.getByRole('button', { name: 'Lois & p-valeur' })).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });

  test('exemple du dé : p-valeur, seuil, décision, courbe et code R', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/calcul?m=loi');
    await page.getByRole('button', { name: /dé : χ²\(5\)/ }).click();
    const r = result(page);
    await expect(r.getByTestId('pvalue')).toContainText('0,047');
    await expect(r.getByTestId('critical')).toContainText('11,070');
    await expect(r.getByTestId('decision')).toContainText('rejette');
    // la courbe : densité, région de rejet, aire de la p-valeur, valeur observée, quantile
    const svg = r.getByRole('img');
    for (const part of ['densite', 'rejet', 'p-valeur', 'observee', 'quantile', 'rejet-axe']) await expect(svg.locator(`[data-part="${part}"]`).first()).toBeAttached();
    await expect(svg).toContainText('valeur observée 11,24');
    await expect(svg).toContainText('q(0,95) = 11,07');
    await expect(r.locator('pre code')).toContainText('1 - pchisq(11.24, 5)');
    expect(errors).toEqual([]);
  });

  test('bilatéral : deux seuils, deux queues pour la p-valeur', async ({ page }) => {
    await page.goto('#/calcul?m=loi');
    await page.getByRole('button', { name: /zona/ }).click();
    const svg = result(page).getByRole('img');
    await expect(svg.locator('[data-part="quantile"]')).toHaveCount(2);
    await expect(svg.locator('[data-part="p-valeur"]')).toHaveCount(2);
    await expect(svg.locator('[data-part="rejet"]')).toHaveCount(2);
    await expect(result(page).getByTestId('decision')).toContainText('ne rejette pas');
  });

  test('saisie manuelle : changer de loi, de test, de seuil', async ({ page }) => {
    await page.goto('#/calcul?m=loi');
    await page.getByRole('radio', { name: /Student/ }).click();
    await expect(page.getByLabel('Paramètre nu')).toHaveValue('10');
    await page.getByLabel('Paramètre nu').fill('4');
    await page.getByLabel('Valeur observée de la statistique').fill('2,5');
    await page.getByRole('button', { name: 'Calculer' }).click();
    // Student : bilatéral par défaut
    await expect(result(page).getByTestId('critical')).toContainText('2,776');
    await page.getByLabel(/Unilatéral à droite/).click();
    await expect(page.getByLabel(/Unilatéral à droite/)).toBeChecked();
    await expect(result(page).getByTestId('critical')).toContainText('2,132');
    await page.getByRole('button', { name: '1 %', exact: true }).click();
    await expect(result(page).getByTestId('critical')).toContainText('3,747');
    await expect(page).toHaveURL(/l=student/);
    // le lien redonne le même calcul
    await page.reload();
    await expect(result(page).getByTestId('critical')).toContainText('3,747');
    await expect(page.getByLabel('Paramètre nu')).toHaveValue('4');
  });

  test('seuil seul, sans valeur observée', async ({ page }) => {
    await page.goto('#/calcul?m=loi');
    await page.getByRole('button', { name: /seuil seul/ }).click();
    const r = result(page);
    await expect(r.getByTestId('critical')).toContainText('11,345');
    await expect(r.getByText('Entre la valeur observée')).toBeVisible();
    await expect(r.getByRole('img').locator('[data-part="observee"]')).toHaveCount(0);
  });

  test('paramètres invalides : message, pas de résultat', async ({ page }) => {
    await page.goto('#/calcul?m=loi&l=chi2&p=2.5&a=0.05&t=right');
    await expect(page.getByRole('alert')).toContainText('entier');
    await expect(result(page)).toHaveCount(0);
    await page.goto('#/calcul?m=loi&l=normal&p=0,1&a=2&t=two');
    await expect(page.getByRole('alert')).toContainText('entre 0 et 1');
  });

  test('les autres calculateurs fonctionnent toujours', async ({ page }) => {
    await page.goto('#/calcul?m=loi');
    await page.getByRole('button', { name: 'Dérivée', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Dériver' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Loi' })).toHaveCount(0);
  });
});

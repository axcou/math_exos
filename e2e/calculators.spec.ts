import { expect, type Page, test } from '@playwright/test';
import { trackErrors } from './helpers';

const fInput = (page: Page) => page.getByPlaceholder(/ex\. \(2x\+1\)\/\(x-14\)/);
const xInput = (page: Page) => page.getByLabel('Point où calculer la limite');

test.describe('calculateur de limites', () => {
  test('limite à droite en 14⁺ avec les boutons de côté', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/calcul');
    await fInput(page).fill('(2x+1)/(x-14)');
    await xInput(page).fill('14');
    await page.getByRole('button', { name: 'à droite (a⁺)' }).click();
    await expect(xInput(page)).toHaveValue('14+');
    await page.getByRole('button', { name: 'Calculer la limite' }).click();
    await expect(page).toHaveURL(/m=limite/);
    await expect(page.getByText('Méthode détaillée')).toBeVisible();
    await expect(page.getByText('Par quotient')).toBeVisible();
    await expect(page.getByText('Vérification numérique')).toBeVisible();
    await expect(page.getByRole('table')).toContainText('14.1');
    expect(errors).toEqual([]);
  });

  test('des deux côtés : la limite n’existe pas', async ({ page }) => {
    await page.goto('#/calcul?m=limite&f=1%2Fx&x=0');
    await expect(page.getByText(/À droite \(/)).toBeVisible();
    await expect(page.getByText(/À gauche \(/)).toBeVisible();
    await expect(page.getByText(/sont différentes/)).toBeVisible();
  });

  test('forme indéterminée levée par la quantité conjuguée', async ({ page }) => {
    await page.goto('#/calcul?m=limite&f=sqrt(x%5E2%2B3x)%20-%20x&x=%2Binf');
    await expect(page.getByText('Forme indéterminée').first()).toBeVisible();
    await expect(page.getByText('Quantité conjuguée', { exact: true })).toBeVisible();
  });

  test('boutons ±∞ et exemples', async ({ page }) => {
    await page.goto('#/calcul');
    await page.getByRole('button', { name: 'moins l’infini' }).click();
    await expect(xInput(page)).toHaveValue('-inf');
    await expect(page.getByRole('button', { name: 'à droite (a⁺)' })).toBeDisabled();
    await page.getByRole('button', { name: 'x^2 e^x en -inf' }).click();
    await expect(page.getByText('Croissances comparées').first()).toBeVisible();
  });

  test('saisies invalides', async ({ page }) => {
    await page.goto('#/calcul');
    await xInput(page).fill('abc');
    await expect(page.getByText('point non compris')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calculer la limite' })).toBeDisabled();
    await page.goto('#/calcul?m=limite&f=(x%2B&x=2');
    await expect(page.getByText(/Fonction :/)).toBeVisible();
  });
});

test.describe('calculateur de dérivées', () => {
  test('produit avec exponentielle', async ({ page }) => {
    await page.goto('#/calcul?m=derivee');
    await fInput(page).fill('(2x+1)e^x');
    await page.getByRole('button', { name: 'Dériver' }).click();
    await expect(page.locator('main')).toContainText('Produit');
    await expect(page.locator('main')).toContainText("u'v + uv'");
    await expect(page.getByText('Conclusion')).toBeVisible();
  });

  test('changer d’onglet garde la fonction', async ({ page }) => {
    await page.goto('#/calcul?m=derivee&f=x%5E3-3x');
    await expect(page.getByText('Conclusion')).toBeVisible();
    await page.getByRole('button', { name: 'Tableau de variations' }).click();
    await expect(page).toHaveURL(/m=variation&f=x%5E3-3x/);
    await expect(fInput(page)).toHaveValue('x^3-3x');
    await expect(page.getByText('maximum local')).toBeVisible();
  });
});

test.describe('calculateurs de signes et de variations', () => {
  test('tableau de signes d’un quotient', async ({ page }) => {
    await page.goto('#/calcul?m=signe&f=(2x%2B1)%2F(x-3)');
    await expect(page.getByText('Domaine de définition')).toBeVisible();
    await expect(page.getByText(/au dénominateur : valeur interdite/)).toBeVisible();
    await expect(page.getByLabel('valeur interdite').first()).toBeVisible();
    await expect(page.locator('main')).toContainText('Conclusion');
  });

  test('tableau de variations avec limites et extremum', async ({ page }) => {
    await page.goto('#/calcul?m=variation&f=(x%2B1)e%5Ex');
    await expect(page.getByText('Tableau de variations', { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel('décroissante').first()).toBeVisible();
    await expect(page.getByLabel('croissante').first()).toBeVisible();
    await expect(page.getByText('minimum local')).toBeVisible();
    await expect(page.getByText('Calcul de la dérivée')).toBeVisible();
  });

  test('tous les exemples de chaque onglet s’affichent sans erreur', async ({ page }) => {
    const errors = trackErrors(page);
    for (const [m, label] of [
      ['limite', 'Calculer la limite'],
      ['derivee', 'Dériver'],
      ['signe', 'Étudier le signe'],
      ['variation', 'Étudier les variations'],
    ] as const) {
      await page.goto(`#/calcul?m=${m}`);
      await expect(page.getByRole('button', { name: label })).toBeVisible();
      const examples = page.getByTestId('examples').getByRole('button');
      const n = await examples.count();
      expect(n).toBeGreaterThan(5);
      for (let i = 0; i < n; i++) {
        await examples.nth(i).click();
        await expect(page.getByText('Méthode détaillée')).toBeVisible();
        await expect(page.locator('main')).not.toContainText('ne concorde pas');
      }
    }
    expect(errors).toEqual([]);
  });
});

import { expect, test } from '@playwright/test';
import { trackErrors } from './helpers';

test.describe('fiches méthodes des tests d’hypothèses', () => {
  test('tester une moyenne : trois schémas de rejet selon H0, formules et décision', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/methodes?m=test-moyenne');
    const card = page.locator('#test-moyenne');
    await expect(card).toBeInViewport();
    const cases = card.getByTestId('rejection-cases');
    await expect(cases.getByRole('img')).toHaveCount(3);
    await expect(cases.locator('svg[data-tail]')).toHaveCount(3);
    expect(await cases.locator('svg[data-tail]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tail')))).toEqual(['left', 'two', 'right']);
    await expect(card.getByText('Quand rejeter')).toBeVisible();
    await expect(card.locator('pre code')).toContainText('pt(t, n - 1)');
    expect(errors).toEqual([]);
  });

  test('intervalles, deux moyennes, variances : toutes les fiches de la fiche de cours', async ({ page }) => {
    await page.goto('#/methodes');
    for (const [id, title] of [
      ['test-intervalles', 'Intervalles de fluctuation et de confiance'],
      ['test-deux-moyennes', 'Comparer deux moyennes (bivarié)'],
      ['test-variances', 'Comparer deux variances (Fisher)'],
      ['tables-stat', 'Tables de référence (normale, Student, Fisher)'],
    ]) {
      await expect(page.locator(`#${id}`).getByRole('heading', { name: title })).toBeAttached();
    }
    await expect(page.locator('#test-deux-moyennes').getByText('appariés')).toBeAttached();
    await expect(page.locator('#test-deux-moyennes svg[data-tail]')).toHaveCount(3);
  });

  test('tables de référence lisibles', async ({ page }) => {
    await page.goto('#/methodes?m=tables-stat');
    const tables = page.locator('#tables-stat table.data-table');
    await expect(tables).toHaveCount(3);
    await expect(tables.nth(0)).toContainText('1,960');
    await expect(tables.nth(1)).toContainText('12,706');
    await expect(tables.nth(2)).toContainText('161,4');
  });

  test('sommaire : le chapitre des tests liste les nouvelles fiches', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('#/methodes?m=test-variances');
    const nav = page.getByRole('navigation', { name: 'Sommaire', exact: true });
    await expect(nav.getByRole('link', { name: 'Tests statistiques' })).toHaveAttribute('aria-current', 'true');
    const sub = nav.getByRole('list', { name: 'Sous-parties de Tests statistiques' });
    for (const t of ['Tester une moyenne (univarié)', 'Comparer deux variances (Fisher)', 'Tables de référence (normale, Student, Fisher)']) await expect(sub.getByRole('link', { name: t })).toBeVisible();
    await expect(sub.locator('a[aria-current="true"]')).toHaveText('Comparer deux variances (Fisher)');
  });
});

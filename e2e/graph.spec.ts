import { expect, test } from '@playwright/test';
import { answerAll, card, exercise, openSheet, trackErrors } from './helpers';

test.describe('lecture graphique', () => {
  test('la courbe est affichée et les tableaux se complètent', async ({ page }) => {
    const errors = trackErrors(page);
    const ex = exercise('V12', 7);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    const graph = art.getByRole('img', { name: /Courbe de f/ });
    await expect(graph).toBeVisible();
    expect(await graph.locator('path').count()).toBe(1);
    await answerAll(page, ex);
    expect(errors).toEqual([]);
  });

  test('une série en plusieurs parties montre une courbe par partie', async ({ page }) => {
    const ex = exercise('V10', 3, 3);
    await openSheet(page, [ex]);
    await expect(card(page, ex).getByRole('img', { name: /Courbe de f/ })).toHaveCount(3);
  });

  test('la courbe est imprimée', async ({ page }) => {
    const ex = exercise('V11', 5);
    await openSheet(page, [ex]);
    await page.emulateMedia({ media: 'print' });
    await expect(card(page, ex).getByRole('img', { name: /Courbe de f/ })).toBeVisible();
    await page.screenshot({ path: 'test-results/graph-print.png', fullPage: true });
  });
});

test.describe('étude complète (TD)', () => {
  test('les cinq questions se résolvent et le PDF garde le déroulé', async ({ page }) => {
    const errors = trackErrors(page);
    const ex = exercise('V13', 11);
    await openSheet(page, [ex]);
    await answerAll(page, ex);
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: 'test-results/study-print.png', fullPage: true });
    expect(errors).toEqual([]);
  });
});

test.describe('courbe avec valeur interdite', () => {
  for (const [seed, parts] of [[4, 1], [9, 2]] as const) {
    test(`les tableaux avec double barre se complètent (${parts} partie${parts > 1 ? 's' : ''})`, async ({ page }) => {
      const errors = trackErrors(page);
      const ex = exercise('V14', seed, parts);
      await openSheet(page, [ex]);
      await expect(card(page, ex).getByRole('img', { name: /Courbe de f/ })).toHaveCount(parts);
      await answerAll(page, ex);
      await page.screenshot({ path: `test-results/asym-${parts}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });
  }
});

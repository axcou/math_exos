import { expect, test } from '@playwright/test';
import { exercise, sheetRoute, trackErrors } from './helpers';

const ROUTES = [
  './',
  '#/exercices?theme=variation',
  sheetRoute([exercise('V07', 3), exercise('D11', 4, 3), exercise('L05', 5)]),
  '#/methodes',
  '#/calcul?m=variation&f=x%2B1%2Fx',
  '#/calcul?m=limite&f=(sqrt(x%2B1)-2)%2F(x-3)&x=3',
  '#/calcul?m=loi&l=normal&p=0,1&x=1.644&a=0.1&t=two',
  '#/tests',
  sheetRoute([exercise('S06', 2), exercise('S08', 3)]),
  '#/formulaire',
  '#/historique',
];

test.describe('affichage', () => {
  test('aucune page ne déborde horizontalement', async ({ page }) => {
    for (const r of ROUTES) {
      await page.goto(r);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, r).toBeLessThanOrEqual(1);
    }
  });

  test('mode sombre : fond « tableau noir » et texte clair', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    const errors = trackErrors(page);
    await page.goto(ROUTES[2]);
    await expect(page.locator('article').first()).toBeVisible();
    const [bg, fg] = await page.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return [cs.backgroundColor, cs.color];
    });
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+(\.\d+)?/g)!.map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(lum(bg)).toBeLessThan(60);
    expect(lum(fg)).toBeGreaterThan(180);
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('les formules sont rendues par KaTeX', async ({ page }) => {
    await page.goto(ROUTES[2]);
    await expect(page.locator('.katex').first()).toBeVisible();
    await expect(page.locator('.katex-error')).toHaveCount(0);
  });

  test('impression : menus et boutons masqués', async ({ page }) => {
    await page.goto(ROUTES[2]);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('header nav')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Vérifier' }).first()).toBeHidden();
    await expect(page.locator('article').first()).toBeVisible();
  });
});

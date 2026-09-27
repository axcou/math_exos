import { expect, test } from '@playwright/test';
import { answerAll, card, exercise, openSheet, questionBlock } from './helpers';

test.describe('partage', () => {
  test('le lien redonne exactement la même feuille, dans un autre navigateur', async ({ page, browser }) => {
    await page.goto('#/exercices?theme=derivee');
    await expect(page.locator('article').first()).toBeVisible();
    const ids = await page.locator('article').evaluateAll((els) => els.map((e) => e.id));
    const statements = await page.locator('article > div > p:first-child').allInnerTexts();

    await page.getByRole('button', { name: 'partager', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/Révisions/).fill('Mes dérivées');
    const url = await dialog.getByLabel('Lien de partage').inputValue();
    expect(url).toContain('#/f?');
    await expect(dialog.getByRole('img', { name: 'QR code du lien' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(url);
    await expect(p2.getByText('Feuille partagée')).toBeVisible();
    await expect(p2.getByRole('heading', { name: 'Mes dérivées' })).toBeVisible();
    expect(await p2.locator('article').evaluateAll((els) => els.map((e) => e.id))).toEqual(ids);
    expect(await p2.locator('article > div > p:first-child').allInnerTexts()).toEqual(statements);
    await other.close();
  });

  test('mode devoir : pas de correction, mais la vérification reste', async ({ page }) => {
    const ex = exercise('D05', 77);
    await openSheet(page, [ex], { showSolutions: false });
    await expect(page.getByText('sans corrigé')).toBeVisible();
    const art = card(page, ex);
    await expect(art.getByRole('button', { name: 'Voir la correction' })).toHaveCount(0);
    await expect(art.getByRole('button', { name: 'Coup de pouce' })).toHaveCount(0);
    await expect(questionBlock(art, ex.questions[0]).getByRole('button', { name: 'Vérifier' })).toBeVisible();
    // sur une feuille partagée, on ne remplace pas les exercices
    await expect(art.getByRole('button', { name: 'Changer d’énoncé' })).toHaveCount(0);
  });

  test('lien de composition : une nouvelle feuille à chaque ouverture', async ({ page }) => {
    await page.goto('#/g?v=1&d=3.2.2&s=2.1&o=g');
    await expect(page.locator('article')).toHaveCount(5);
    expect(await page.locator('.chap-tab').allInnerTexts()).toEqual(['CHAPITRE 1', 'CHAPITRE 3']);
    const first = await page.locator('article').first().getAttribute('id');
    expect(first).toMatch(/^D\d+\.[0-9a-z]+\.2$/);
    await page.goto('#/g?v=1&d=3.2.2&s=2.1&o=g');
    await expect(page.locator('article').first()).not.toHaveAttribute('id', first!);
  });

  test('lien abîmé', async ({ page }) => {
    await page.goto('#/f?v=1&e=Z99.zz');
    await expect(page.getByText('Lien illisible')).toBeVisible();
    await page.getByRole('link', { name: 'Générer une nouvelle feuille' }).click();
    await expect(page).toHaveURL(/#\/exercices/);
  });

  test('exercices d’une ancienne version ignorés avec un avertissement', async ({ page }) => {
    await page.goto('#/f?v=1&e=D01.1~Z99.2~D02.3');
    await expect(page.locator('article')).toHaveCount(2);
    await expect(page.getByText(/1 exercice n’ont pas pu être chargés/)).toBeVisible();
  });
});

test.describe('historique', () => {
  test('résultats, statistiques, exercices à revoir et effacement', async ({ page }) => {
    const ok = exercise('D05', 501);
    const ko = exercise('L04', 502);
    await openSheet(page, [ok, ko]);
    await answerAll(page, ok);
    await card(page, ko).getByRole('button', { name: 'Voir la correction' }).click();
    await expect(card(page, ko).getByText('À revoir')).toBeVisible();

    await page.getByRole('navigation').getByRole('link', { name: 'Historique' }).click();
    const table = page.getByRole('table');
    await expect(table.getByRole('row', { name: /Dérivées tous/ })).toContainText('100 %');
    await expect(table.getByRole('row', { name: /Limites tous/ })).toContainText('0 %');
    await expect(page.getByText('réussi', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: /Refaire les 1 derniers ratés/ }).click();
    await expect(page).toHaveURL(/#\/exercices/);
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.locator(`article[id="${ko.uid}"]`)).toBeVisible();

    await page.getByRole('navigation').getByRole('link', { name: 'Historique' }).click();
    await page.getByRole('button', { name: 'effacer l’historique' }).click();
    await page.getByRole('button', { name: 'annuler' }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await page.getByRole('button', { name: 'effacer l’historique' }).click();
    await page.getByRole('button', { name: 'oui, effacer' }).click();
    await expect(page.getByText('Aucun exercice pour l’instant.')).toBeVisible();
  });

  test('rouvrir un exercice de l’historique', async ({ page }) => {
    const ex = exercise('V02', 88);
    await openSheet(page, [ex]);
    await page.goto('#/historique');
    await page.getByRole('button', { name: 'rouvrir' }).first().click();
    await expect(page.locator(`article[id="${ex.uid}"]`)).toBeVisible();
  });
});

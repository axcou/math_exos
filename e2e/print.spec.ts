import { expect, type Page, test } from '@playwright/test';
import { exercise, openSheet } from './helpers';

const SHEET = [exercise('D05', 11), exercise('L11', 12, 4), exercise('V04', 13), exercise('V07', 14)];

async function choosePrint(page: Page, mode: 'Sujet seul' | 'Sujet + réponses' | 'Sujet + corrigé détaillé') {
  // Sans interface, window.print() rend la main tout de suite (et déclenche « afterprint ») :
  // on le neutralise, on choisit le mode, puis on génère le PDF nous-mêmes.
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole('button', { name: 'imprimer / PDF' }).click();
  await page.getByRole('menuitem', { name: mode }).click();
}

/** Texte du PDF produit par Chromium (sans lecteur PDF : on vérifie sa taille et son nombre de pages). */
async function pdfPages(page: Page): Promise<number> {
  const buf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  return (buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

test.describe('impression et PDF', () => {
  test('sujet : en-tête de copie, lignes de réponse, tableaux vides, rien d’interactif', async ({ page }) => {
    await openSheet(page, SHEET, { title: 'Contrôle n°1' });
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('heading', { name: 'Contrôle n°1' })).toBeVisible();
    await expect(page.getByText('Nom', { exact: true })).toBeVisible();
    await expect(page.getByText('Classe', { exact: true })).toBeVisible();
    // lignes de réponse
    await expect(page.locator('.answer-line').first()).toBeVisible();
    // (les séries de limites n'en ont pas : on répond après le « = »)
    expect(await page.locator('.answer-line:visible').count()).toBeGreaterThanOrEqual(4);
    // tableau à compléter : structure visible, aucune case à cliquer
    await expect(page.locator('[data-cell]:visible')).toHaveCount(0);
    await expect(page.locator('.inline-grid:visible').first()).toBeVisible();
    // rien d'interactif
    for (const name of ['Vérifier', 'Voir la correction', 'Coup de pouce', 'imprimer / PDF']) {
      await expect(page.getByRole('button', { name }).first()).toBeHidden();
    }
    await expect(page.locator('input:visible')).toHaveCount(0);
    await expect(page.locator('header nav')).toBeHidden();
    // pas d'annexe en mode « sujet »
    await expect(page.locator('.print-appendix')).toHaveCount(0);
  });

  test('palette claire à l’impression, même en mode sombre', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await openSheet(page, SHEET);
    await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe('rgb(255, 255, 255)');
    await ctx.close();
  });

  test('sujet + réponses : annexe en fin de document', async ({ page }) => {
    await openSheet(page, SHEET);
    await choosePrint(page, 'Sujet + réponses');
    await page.emulateMedia({ media: 'print' });
    const appendix = page.locator('.print-appendix');
    await expect(appendix).toBeVisible();
    await expect(appendix.getByText('Réponses', { exact: true })).toBeVisible();
    // réponses finales, et tableaux corrigés
    await expect(appendix.locator('.katex').first()).toBeVisible();
    await expect(appendix.locator('.inline-grid').first()).toBeVisible();
    await expect(appendix.getByLabel(/croissante|décroissante/).first()).toBeVisible();
    await expect(appendix.getByText('Numérateur')).toHaveCount(0);
  });

  test('sujet + corrigé détaillé : toutes les étapes en fin de document', async ({ page }) => {
    await openSheet(page, SHEET);
    await choosePrint(page, 'Sujet + corrigé détaillé');
    await page.emulateMedia({ media: 'print' });
    const appendix = page.locator('.print-appendix');
    await expect(appendix.getByText('Corrigé', { exact: true })).toBeVisible();
    await expect(appendix.getByText('Numérateur').first()).toBeVisible();
    await expect(appendix.getByText('Règle des signes').first()).toBeVisible();
    // les rappels de cours (boutons) ne sont pas imprimés
    await expect(appendix.getByRole('button')).toHaveCount(0);
  });

  test('les PDF sont produits, le corrigé ajoute des pages', async ({ page }) => {
    await openSheet(page, SHEET);
    const sujet = await pdfPages(page);
    await choosePrint(page, 'Sujet + réponses');
    const reponses = await pdfPages(page);
    await choosePrint(page, 'Sujet + corrigé détaillé');
    const corrige = await pdfPages(page);
    expect(sujet).toBeGreaterThanOrEqual(1);
    expect(reponses).toBeGreaterThan(sujet);
    expect(corrige).toBeGreaterThan(reponses);
  });

  test('l’annexe disparaît après l’impression', async ({ page }) => {
    await openSheet(page, SHEET);
    await choosePrint(page, 'Sujet + réponses');
    await expect(page.locator('.print-appendix')).toHaveCount(1);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(page.locator('.print-appendix')).toHaveCount(0);
  });

  test('pas de pointillés après « = », ni de limite recopiée', async ({ page }) => {
    const ex = SHEET[1]; // série de 4 limites
    await openSheet(page, [SHEET[0], ex]);
    await page.emulateMedia({ media: 'print' });
    const after = await page.locator('.answer-line').first().evaluate((el) => getComputedStyle(el, '::after').content);
    expect(after === 'none' || after === 'normal').toBe(true);
    // la limite n'est pas recopiée sous l'énoncé
    const art = page.locator(`article[id="${ex.uid}"]`);
    for (const q of ex.questions) await expect(art.locator(`[data-question="${q.id}"]`)).not.toContainText('lim');
  });

  test('série de limites : « = » après chaque limite, lignes serrées', async ({ page }) => {
    const ex = exercise('L12', 40, 4);
    await openSheet(page, [ex]);
    await page.emulateMedia({ media: 'print' });
    const art = page.locator(`article[id="${ex.uid}"]`);
    const items = art.locator('ol > li');
    await expect(items).toHaveCount(4);
    for (const li of await items.all()) {
      await expect(li.locator('p').first().locator('.katex').last()).toHaveText(/=/);
    }
    // pas d'espace de réponse sous les limites : les lignes se suivent
    await expect(art.locator('.answer-line')).toHaveCount(0);
    const boxes = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].top - boxes[i - 1].bottom).toBeLessThan(12);
  });

  test('pas de date ni de titre ajoutés par le navigateur : marge de page nulle, marges recréées', async ({ page }) => {
    await openSheet(page, SHEET);
    await page.emulateMedia({ media: 'print' });
    // la bande haute du cadre d'impression est répétée sur chaque page (en-tête de tableau)
    await expect(page.locator('.print-frame > thead .spacer-top')).toBeVisible();
    const display = await page.locator('.print-frame > thead').evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('table-header-group');
    // à l'écran, le cadre n'ajoute rien
    await page.emulateMedia({ media: 'screen' });
    await expect(page.locator('.print-frame > thead')).toBeHidden();
  });

  test('option deux colonnes, mémorisée', async ({ page }) => {
    await openSheet(page, SHEET);
    await page.getByRole('button', { name: 'imprimer / PDF' }).click();
    await page.getByLabel('Deux colonnes').check();
    await page.keyboard.press('Escape');
    await page.emulateMedia({ media: 'print' });
    const cols = await page.locator('section.page').first().evaluate((el) => getComputedStyle(el).columnCount);
    expect(cols).toBe('2');
    await page.reload();
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator('section.page').first().evaluate((el) => getComputedStyle(el).columnCount)).toBe('2');
    // et on peut revenir à une colonne
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('button', { name: 'imprimer / PDF' }).click();
    await page.getByLabel('Deux colonnes').uncheck();
    await page.emulateMedia({ media: 'print' });
    expect(await page.locator('section.page').first().evaluate((el) => getComputedStyle(el).columnCount)).toBe('auto');
  });

  test('feuille mélangée : l’onglet « Exercices » est visible', async ({ page }) => {
    await openSheet(page, [exercise('L01', 1), exercise('D01', 2), exercise('L02', 3)]);
    const tab = page.locator('.chap-tab').first();
    await expect(tab).toHaveText(/Exercices/i);
    const [bg, fg] = await tab.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe(fg);
  });

  test('une correction ouverte à l’écran n’est pas imprimée en double', async ({ page }) => {
    const ex = SHEET[0];
    await openSheet(page, [ex]);
    await page.locator(`article[id="${ex.uid}"]`).getByRole('button', { name: 'Voir la correction' }).click();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator(`article[id="${ex.uid}"]`).getByText('Corrigé', { exact: true })).toBeHidden();
  });
});

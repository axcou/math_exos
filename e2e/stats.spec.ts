import { expect, type Locator, test } from '@playwright/test';
import { STAT_TEMPLATES } from '../src/exercises/stats/templates';
import type { ChoiceQuestion, NumberQuestion } from '../src/exercises/types';
import { answerAll, card, exercise, openSheet, questionBlock, sheetRoute, trackErrors } from './helpers';

const verify = (block: Locator) => block.getByRole('button', { name: 'Vérifier' }).click();

test.describe('page des tests statistiques', () => {
  test('rappels de cours, réglages et génération d’une feuille', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('#/tests');
    await expect(page.getByRole('heading', { level: 1, name: 'Tests statistiques' })).toBeVisible();
    await expect(page.getByText('Rappels de cours')).toBeVisible();
    for (const t of ['Comparer deux proportions', 'Test d’adéquation du χ²', 'Indépendance et homogénéité (χ²)', 'Comparer des moyennes (ANOVA)']) {
      await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
    }
    // première visite : réglages ouverts, puis génération
    await expect(page.getByLabel('Réglages des tests')).toBeVisible();
    await page.getByLabel('Nombre d’exercices de tests').selectOption('4');
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    await expect(page.locator('article[id^="S0"]')).toHaveCount(4);
    await expect(page.locator('.chap-tab', { hasText: 'Tests statistiques' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('le filtre par type de test est respecté', async ({ page }) => {
    await page.goto('#/tests');
    const builder = page.getByLabel('Réglages des tests');
    // ne garder que l'ANOVA
    for (const label of ['Deux proportions', 'Adéquation (χ²)', 'Adéquation, paramètres estimés', 'Indépendance (χ²)', 'Homogénéité (χ²)']) {
      await builder.getByLabel(label).uncheck();
    }
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    const titles = page.locator('article h3');
    await expect(titles.first()).toBeVisible();
    for (const t of await titles.allTextContents()) expect(t).toBe('Égalité des moyennes (ANOVA)');
  });

  test('la feuille des tests est indépendante de celle des exercices d’analyse', async ({ page }) => {
    await page.goto('#/tests');
    await page.getByRole('button', { name: 'Générer la feuille' }).click();
    await expect(page.locator('article[id^="S0"]').first()).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Exercices', exact: true }).click();
    await expect(page.locator('article[id^="S0"]')).toHaveCount(0);
    await page.getByRole('navigation').getByRole('link', { name: 'Tests stat.', exact: true }).click();
    await expect(page.locator('article[id^="S0"]').first()).toBeVisible();
  });
});

test.describe('chaque type de test se résout de bout en bout', () => {
  for (const t of STAT_TEMPLATES) {
    test(`${t.code} — ${t.title}`, async ({ page }) => {
      const errors = trackErrors(page);
      const ex = exercise(t.code, 7);
      await openSheet(page, [ex]);
      // un lien de feuille de tests ouvre la page des tests
      await expect(page).toHaveURL(/#\/tests/);
      const art = card(page, ex);
      // données de l'énoncé sous forme de tableau
      await expect(art.locator('table.data-table').first()).toBeVisible();
      await answerAll(page, ex);
      await expect(art.getByText('Réussi', { exact: true })).toBeVisible();
      // corrigé complet : tableaux de calcul et code R
      await art.getByRole('button', { name: /correction/i }).click();
      await art.getByRole('button', { name: 'tout afficher' }).click();
      await expect(art.getByText('Code R')).toBeVisible();
      await expect(art.locator('pre code')).toContainText(/pchisq|pnorm|pf\(/);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('retours sur les erreurs', () => {
  test('valeur numérique : arrondi proche, erreur classique, saisie illisible', async ({ page }) => {
    const ex = exercise('S02', 3);
    await openSheet(page, [ex]);
    const art = card(page, ex);
    const q = ex.questions.find((x): x is NumberQuestion => x.id === 'q3')!;
    const block = questionBlock(art, q);
    const input = block.locator('input');

    await input.fill('abc');
    await expect(block.getByText('Écris un nombre')).toBeVisible();
    await verify(block);
    await expect(block.getByRole('status')).toContainText('Illisible');

    await input.fill((q.expected + 3 * q.tolerance).toFixed(3).replace('.', ','));
    await verify(block);
    await expect(block.getByRole('status')).toContainText('Presque');

    const mistake = q.mistakes?.[0];
    if (mistake) {
      await input.fill(mistake.value.toFixed(3));
      await verify(block);
      await expect(block.getByRole('status')).toContainText('effectif **théorique**'.replace(/\*\*/g, ''));
    }

    await input.fill(q.expected.toFixed(2));
    await verify(block);
    await expect(block.getByRole('status')).toContainText('Juste');
  });

  test('choix : une mauvaise proposition est expliquée', async ({ page }) => {
    const ex = exercise('S08', 5);
    await openSheet(page, [ex]);
    const q = ex.questions.find((x): x is ChoiceQuestion => x.id === 'q1')!;
    const block = questionBlock(card(page, ex), q);
    const wrong = q.options.findIndex((_, i) => i !== q.expected);
    await block.getByRole('radio').nth(wrong).check();
    await verify(block);
    await expect(block.getByRole('status')).toContainText('Faux');
    await block.getByRole('radio').nth(q.expected).check();
    await verify(block);
    await expect(block.getByRole('status')).toContainText('Juste');
  });

  test('décision : la règle « p < α » est rappelée', async ({ page }) => {
    const ex = exercise('S06', 2);
    await openSheet(page, [ex]);
    const q = ex.questions.find((x): x is ChoiceQuestion => x.id === 'q6')!;
    const block = questionBlock(card(page, ex), q);
    await block.getByRole('radio').nth(1 - q.expected).check();
    await verify(block);
    await expect(block.getByRole('status')).toContainText('seuil');
  });
});

test.describe('impression et partage', () => {
  test('le sujet imprimé garde les tableaux et remplace les boutons par des cases', async ({ page }) => {
    const ex = exercise('S01', 4);
    await openSheet(page, [ex]);
    await page.emulateMedia({ media: 'print' });
    // seule la feuille s'imprime : ni l'en-tête de la page ni les rappels de cours
    await expect(page.getByRole('heading', { level: 1, name: 'Tests statistiques' })).toBeHidden();
    await expect(page.getByText('Rappels de cours')).toBeHidden();
    const art = card(page, ex);
    await expect(art.locator('table.data-table')).toBeVisible();
    await expect(art.getByRole('radio').first()).toBeHidden();
    await expect(art.locator('ul li span.border').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/stats-print.png', fullPage: true });
  });

  test('une feuille mêlant tests et analyse s’ouvre sur la page des exercices', async ({ page }) => {
    await page.goto(sheetRoute([exercise('S03', 1), exercise('D01', 1)]));
    await expect(page).toHaveURL(/#\/exercices/);
    await expect(page.locator('article')).toHaveCount(2);
  });

  test('une feuille de tests partagée garde ses options', async ({ page }) => {
    await page.goto(sheetRoute([exercise('S04', 9), exercise('S07', 9)], { showSolutions: false, title: 'Contrôle tests' }));
    await expect(page).toHaveURL(/#\/tests/);
    await expect(page.getByText('Contrôle tests').first()).toBeVisible();
    await expect(page.locator('article')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /correction/i })).toHaveCount(0);
  });
});

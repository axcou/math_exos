# Math-Exo

Générateur d'exercices de maths aléatoires et corrigés : **dérivées**, **limites**, **tableaux de signes et de variations**. Tout tourne dans le navigateur, sans serveur.

- 35 types d'exercices sur 3 niveaux (Facile, Moyen, Difficile), avec des milliers de variantes chacun.
- Feuilles sur un seul thème (ex. 10 dérivées) ou sur plusieurs thèmes, avec un nombre, un niveau et un filtre de types propres à chaque thème.
- Plusieurs questions par exercice, comme dans un manuel (« Dériver les fonctions suivantes : a. … b. … c. … ») : de 1 à 4 parties du même type, chacune vérifiée et corrigée séparément.
- Saisie des réponses et vérification automatique : comparaison numérique, formes équivalentes acceptées, erreurs classiques détectées. Les tableaux se remplissent par clics.
- Corrections étape par étape, avec explications et rappel des formules.
- Calculateurs expliqués : limite (y compris à gauche / à droite, x → 14⁺), dérivée, tableau de signes et tableau de variations. Chaque résultat est détaillé comme un corrigé et contrôlé numériquement.
- Fiches méthodes : quand utiliser chaque méthode, les étapes, les erreurs fréquentes et des exemples résolus.
- Historique dans le `localStorage`, et anti-répétition (le même type ne sort pas deux fois de suite, le même énoncé ne revient pas).
- Partage d'une feuille par lien ou QR code. Le lien contient la liste des exercices (code du type + graine) ou seulement la composition de la feuille.

Le plan détaillé se trouve dans [PLAN.md](PLAN.md).

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (Vitest)
npm run test:e2e # tests de bout en bout dans Chromium (Playwright)
npm run test:all # les deux
npm run build    # site statique dans dist/
```

Chaque push sur `master` lance les tests et le build, puis publie `dist/` sur GitHub Pages (`.github/workflows/ci.yml`). Il faut activer Pages avec la source « GitHub Actions » dans les réglages du dépôt.

## Tests

- **Unitaires** (`tests/`, Vitest) : justesse mathématique de chaque type d’exercice sur 150 graines, vérification des réponses (la bonne réponse tapée est acceptée, chaque erreur classique est reconnue), tests par propriétés sur des centaines d’expressions aléatoires (simplification, dérivation, affichage), calculateurs, historique, liens de partage et « golden seeds ».
- **De bout en bout** (`e2e/`, Playwright) : le site construit est piloté dans Chromium (ordinateur et téléphone) — répondre juste ou faux, remplir un tableau au clic ou au clavier, corrections, composition de feuille, partage dans un autre navigateur, historique, calculateurs, méthodes, mode sombre, impression, absence de débordement sur mobile.

Premier lancement des tests E2E : `npx playwright install chromium`.

## Organisation

| Dossier | Rôle |
|---|---|
| `src/core/expr` | Moteur mathématique : fractions exactes, arbre d'expression, polynômes, LaTeX, évaluation, parseur des réponses |
| `src/core/random` | Générateur pseudo-aléatoire à graine (mulberry32) |
| `src/exercises` | Générateurs (`derivatives/`, `limits/`, `variations/`) et registre des codes |
| `src/checking` | Vérification des réponses (expressions, valeurs, racines, tableaux) |
| `src/history` | Store persistant (Zustand) et algorithme anti-répétition |
| `src/sheet` | Composition des feuilles |
| `src/share` | Codage et décodage des liens de partage |
| `src/components`, `src/pages` | Interface React |

## Ajouter un type d'exercice

1. Écrire un `Template` dans le fichier du thème, avec un **nouveau code** (`D17`, `L11`…).
2. L'ajouter à la liste exportée par ce fichier.
3. Lancer `npm test`. Les tests vérifient numériquement les réponses, contrôlent le LaTeX et créent le snapshot « golden seeds ».

> ⚠️ Les codes sont **figés** : ils figurent dans les liens partagés. Pour changer ce qu'un template génère, créer un nouveau code et marquer l'ancien `legacy: true`, sans mettre à jour son snapshot.

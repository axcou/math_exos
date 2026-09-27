# Math-Exo — Générateur d'exercices aléatoires de maths

Plan détaillé du site : exercices aléatoires sur les **dérivées**, les **limites** et les **tableaux de signes / variations**, avec niveaux de difficulté, composition libre des feuilles (un seul thème ou plusieurs), saisie et vérification automatique des réponses, corrections détaillées (étapes, explications, rappels de formules), historique stocké dans le navigateur pour éviter les répétitions, et partage de feuilles par lien.

---

## 1. Objectifs fonctionnels

| # | Fonctionnalité | Description |
|---|---|---|
| F1 | Feuille mono-thème | Générer plusieurs exos d'un seul thème (ex. « 10 dérivées »). |
| F2 | Feuille multi-thèmes | Combiner librement les thèmes sur une même page (ex. dérivées + limites, ou les trois). |
| F3 | Nombre par thème | Choisir le nombre d'exos pour chaque thème sélectionné (1 à 20). |
| F4 | Niveau de difficulté | 3 niveaux : Facile / Moyen / Difficile (+ « Mélangé »), réglable **par thème**. |
| F5 | Filtre par type (bonus) | Cibler un type précis dans un thème (ex. uniquement « dérivée d'un quotient »). |
| F6 | Saisie de la réponse | L'élève tape sa réponse (expression, valeur, limite, tableau) directement sur la page. |
| F7 | Vérification automatique | Comparaison numérique de la réponse avec la solution, retour immédiat + détection d'erreurs classiques. |
| F8 | Correction | Bouton « Voir la correction » par exercice, affichage étape par étape. |
| F9 | Explications + formules | Chaque étape a une explication en français et un encadré « Rappel » avec la formule utilisée. |
| F10 | Historique local | Les exos déjà faits sont gardés dans le navigateur (localStorage). |
| F11 | Anti-répétition | Jamais deux fois le même exo d'affilée ; rotation entre les types d'exercices. |
| F12 | Partage par URL | Un lien reproduit exactement la même feuille (liste de graines) chez quelqu'un d'autre. |
| F13 | Formulaire | Page récapitulative de toutes les formules. |
| F14 | Suivi | Score de la feuille, statistiques réussi / raté par thème et niveau. |

---

## 2. Technologies

| Besoin | Techno | Pourquoi |
|---|---|---|
| Build / serveur de dev | **Vite** | Démarrage instantané, build statique léger. |
| Langage | **TypeScript** | Typage fort, indispensable pour le moteur d'expressions mathématiques. |
| UI | **React 18** | Composants réutilisables (carte d'exo, champ de réponse, tableau de variations). |
| Style | **Tailwind CSS** | Mise en page rapide, responsive, mode sombre simple. |
| Rendu des formules | **KaTeX** | Rendu LaTeX rapide et hors-ligne, plus léger que MathJax. |
| Saisie mathématique | **MathLive** (`<math-field>`) | Clavier virtuel mathématique (fractions, racines, exposants, ∞), idéal sur mobile ; export en texte que l'on reparse. |
| Parseur de réponses | **Parseur maison** (`core/expr/parse.ts`) | Transforme la saisie de l'élève en arbre d'expression (AST) comparable à la solution. |
| Tableaux de signes / variations | **Composant SVG maison** | Aucune lib ne gère correctement les tableaux « à la française » ; le même composant sert à l'affichage et à la saisie. |
| Courbes (bonus) | **function-plot** | Afficher la courbe dans la correction. |
| Calcul symbolique | **Moteur maison** (arbre d'expressions) | Nécessaire pour générer les *étapes* de correction. |
| Aléatoire | **PRNG seedé (mulberry32)** | Exos reproductibles à partir d'une graine → base du partage par URL. |
| État global | **Zustand** + middleware `persist` | Config, historique, réponses en cours → localStorage. |
| Routage | **React Router (HashRouter)** | Les liens `#/...` fonctionnent sur un hébergement statique (GitHub Pages) sans configuration serveur. |
| QR code (bonus) | **qrcode** | Partager une feuille en classe en affichant un QR code. |
| Tests | **Vitest** | Tests unitaires du moteur, des générateurs, du vérificateur et du codage d'URL. |
| Hébergement | **GitHub Pages / Netlify** | Site 100 % statique, aucun back-end. |
| Hors-ligne (bonus) | **vite-plugin-pwa** | Utilisable sans connexion, installable sur téléphone. |

> **Aucun serveur ni base de données** : génération, vérification et historique se font entièrement dans le navigateur.

---

## 3. Architecture du projet

```
math-exo/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                      # Layout + routes
│  │
│  ├─ core/                        # Moteur mathématique (sans React)
│  │  ├─ expr/
│  │  │  ├─ ast.ts                 # Nœuds : Const, Var, Add, Mul, Div, Pow, Fn(exp, ln, sqrt…)
│  │  │  ├─ build.ts               # Helpers : add(), mul(), pow()…
│  │  │  ├─ parse.ts               # Texte / sortie MathLive → AST (saisie de l'élève)
│  │  │  ├─ simplify.ts            # Simplification (0+x→x, 1·x→x, regroupements)
│  │  │  ├─ toLatex.ts             # AST → LaTeX
│  │  │  ├─ evaluate.ts            # Évaluation numérique f(x)
│  │  │  └─ rational.ts            # Fractions exactes
│  │  ├─ random/
│  │  │  ├─ prng.ts                # mulberry32 seedé
│  │  │  └─ pick.ts                # randInt, randNonZero, pickWeighted…
│  │  └─ solve/
│  │     ├─ polynomial.ts          # Racines degré 1 et 2
│  │     └─ signAnalysis.ts        # Signe d'un produit/quotient de facteurs
│  │
│  ├─ exercises/
│  │  ├─ types.ts                  # Exercise, Question, Step, Template…
│  │  ├─ registry.ts               # Tous les templates, avec codes courts stables
│  │  ├─ derivatives/  (templates.ts, solver.ts, mistakes.ts)
│  │  ├─ limits/       (templates.ts, solver.ts)
│  │  └─ variations/   (templates.ts, solver.ts)
│  │
│  ├─ sheet/
│  │  ├─ sheetConfig.ts            # Composition de feuille (thèmes, nombres, niveaux)
│  │  └─ buildSheet.ts             # Config → liste d'exercices (via antiRepeat)
│  │
│  ├─ checking/                    # Vérification des réponses
│  │  ├─ checkExpression.ts        # Comparaison numérique de deux expressions
│  │  ├─ checkValue.ts             # Nombres, fractions, ±∞, « n'existe pas »
│  │  ├─ checkTable.ts             # Tableaux de signes / variations cellule par cellule
│  │  └─ feedback.ts               # Messages de retour + erreurs classiques
│  │
│  ├─ share/
│  │  ├─ encode.ts                 # Feuille → URL
│  │  └─ decode.ts                 # URL → feuille (avec validation)
│  │
│  ├─ formulas/formulas.ts         # Base des formules (id, titre, LaTeX, conditions)
│  │
│  ├─ history/
│  │  ├─ store.ts                  # Zustand + persist (localStorage)
│  │  └─ antiRepeat.ts             # Sélection sans répétition
│  │
│  ├─ components/
│  │  ├─ SheetBuilder.tsx          # Composition de la feuille (§6)
│  │  ├─ ExerciseCard.tsx          # Énoncé + questions + correction
│  │  ├─ answers/
│  │  │  ├─ ExpressionInput.tsx    # <math-field> + aperçu
│  │  │  ├─ ValueInput.tsx         # Valeur / limite (boutons +∞, −∞, « n'existe pas »)
│  │  │  ├─ RootsInput.tsx         # Liste de solutions
│  │  │  └─ TableInput.tsx         # Tableau de signes / variations interactif
│  │  ├─ FeedbackBadge.tsx         # ✔ / ✘ / ~ + message
│  │  ├─ Solution.tsx, StepItem.tsx, FormulaReminder.tsx
│  │  ├─ ShareDialog.tsx           # Lien + copie + QR code
│  │  ├─ Math.tsx                  # Wrapper KaTeX
│  │  └─ VariationTable.tsx        # Tableau en SVG (lecture seule)
│  │
│  └─ pages/
│     ├─ Home.tsx
│     ├─ Exercises.tsx             # Feuille générée
│     ├─ SharedSheet.tsx           # Feuille ouverte depuis un lien
│     ├─ Formulas.tsx
│     └─ History.tsx
└─ tests/
   ├─ expr.test.ts, parse.test.ts
   ├─ derivatives.test.ts, limits.test.ts, variations.test.ts
   ├─ checking.test.ts
   ├─ share.test.ts, golden-seeds.test.ts
   └─ antiRepeat.test.ts, buildSheet.test.ts
```

---

## 4. Modèle de données

```ts
type Theme = 'derivee' | 'limite' | 'variation';
type Difficulty = 1 | 2 | 3;                  // Facile, Moyen, Difficile
type DifficultyChoice = Difficulty | 'mixte';

interface Template {
  id: string;                                 // ex. 'deriv.quotient.affine'
  code: string;                               // code court STABLE pour l'URL, ex. 'D07'
  theme: Theme;
  difficulty: Difficulty;
  subtype: string;                            // ex. 'quotient' (pour le filtre F5)
  label: string;                              // « Dérivée d'un quotient »
  generate(rng: Rng): Exercise;
}

interface Exercise {
  id: string;                                 // code + graine
  templateCode: string;
  theme: Theme;
  difficulty: Difficulty;
  seed: number;
  statement: string;
  statementLatex: string;
  questions: Question[];                      // un exo peut avoir plusieurs questions
  steps: Step[];                              // correction complète
  table?: VariationTableData;
}

type AnswerType = 'expression' | 'value' | 'limit' | 'roots' | 'signTable' | 'variationTable';

interface Question {
  id: string;                                 // 'q1', 'q2'…
  prompt: string;                             // « Calculer f'(x) »
  answerType: AnswerType;
  expected: Expr | ValueAnswer | Rational[] | VariationTableData;
  check?: {
    domain?: Interval[];                      // où tirer les points de test
    forbidden?: number[];                     // valeurs interdites à éviter
    tolerance?: number;                       // 1e-6 par défaut (relative)
    requireSimplified?: boolean;              // exiger une forme factorisée, etc.
  };
  mistakes?: KnownMistake[];                  // erreurs classiques détectables (§8.4)
  stepRef?: number;                           // étape de la correction liée à cette question
}

type ValueAnswer =
  | { kind: 'number'; value: Rational }
  | { kind: 'infinity'; sign: 1 | -1 }
  | { kind: 'none' };                         // « n'existe pas »

interface Step {
  title: string;
  latex: string;
  explanation: string;
  formulaIds?: string[];
}

interface VariationTableData {
  xValues: string[];                          // ['-\\infty', '-1', '3', '+\\infty']
  rows: {
    label: string;                            // 'x-3', "f'(x)", 'f(x)'
    kind: 'sign' | 'variation';
    cells: ('+' | '-' | '0' | '||' | 'up' | 'down' | string)[];
  }[];
}

interface SheetConfig {
  items: {
    theme: Theme;
    count: number;                            // 1 à 20
    difficulty: DifficultyChoice;
    subtypes?: string[];                      // vide = tous les types
  }[];
  order: 'grouped' | 'shuffled';
}

interface AnswerAttempt {
  questionId: string;
  raw: string;                                // saisie brute
  status: 'correct' | 'partial' | 'incorrect' | 'invalid';
  date: number;
}

interface HistoryEntry {
  exerciseId: string;
  templateCode: string;
  theme: Theme;
  difficulty: Difficulty;
  date: number;
  attempts: AnswerAttempt[];
  sawSolution: boolean;
  result?: 'reussi' | 'rate';                 // auto (§8.6) ou manuel
  source: 'generated' | 'shared';
}
```

---

## 5. Contenu des exercices par thème et niveau

### 5.1 Dérivées

| Niveau | Types d'exercices | Formules rappelées |
|---|---|---|
| **Facile** | Polynômes, `xⁿ`, `1/x`, `√x`, somme, multiplication par une constante | `(xⁿ)' = n xⁿ⁻¹`, `(1/x)' = -1/x²`, `(√x)' = 1/(2√x)`, `(u+v)' = u'+v'`, `(ku)' = ku'` |
| **Moyen** | Produit `u·v`, quotient `u/v`, `eˣ`, `ln x`, `1/u` | `(uv)' = u'v + uv'`, `(u/v)' = (u'v − uv')/v²`, `(eˣ)' = eˣ`, `(ln x)' = 1/x` |
| **Difficile** | Composées : `e^u`, `ln u`, `√u`, `uⁿ`, `f(ax+b)`, produit + composée | `(e^u)' = u'e^u`, `(ln u)' = u'/u`, `(√u)' = u'/(2√u)`, `(uⁿ)' = n u' uⁿ⁻¹` |

**Question à saisir :** `f'(x)` (type `expression`).

**Étapes de correction type (quotient) :** identifier `u` et `v` → calculer `u'` et `v'` → appliquer la formule → développer le numérateur → simplifier, préciser le domaine.

### 5.2 Limites

| Niveau | Types d'exercices | Formules rappelées |
|---|---|---|
| **Facile** | Polynôme en ±∞, limites de référence, opérations sans forme indéterminée | Limites de `xⁿ`, `1/x`, `√x`, règles opératoires |
| **Moyen** | Fractions rationnelles en ±∞, formes `∞ − ∞` et `∞/∞`, limite à gauche / à droite en une valeur interdite, asymptotes | Terme dominant, tableau des formes indéterminées |
| **Difficile** | Conjugué, croissances comparées (exp/ln), taux d'accroissement, composition | `lim eˣ/xⁿ = +∞`, `lim x ln x = 0`, `lim ln x / x = 0`, limite d'une composée |

**Question à saisir :** la limite (type `limit` : nombre, fraction, `+∞`, `−∞`, « n'existe pas »). Pour les limites à gauche/à droite : deux champs. Question bonus possible : équation de l'asymptote (type `expression`).

**Étapes type :** détecter la forme → choisir la méthode → calcul → conclusion + interprétation graphique.

### 5.3 Tableaux de signes & variations

| Niveau | Types d'exercices |
|---|---|
| **Facile** | Signe d'une fonction affine ; signe d'un trinôme ; variations d'un trinôme |
| **Moyen** | Signe d'un produit / quotient de facteurs affines ; variations d'un polynôme de degré 3 |
| **Difficile** | Fonctions rationnelles, fonctions avec `eˣ` ou `ln x`, limites aux bornes et extremums dans le tableau |

**Questions à saisir (exercice en plusieurs questions) :**
1. `f'(x)` → type `expression` (variations uniquement) ;
2. valeurs qui annulent / valeurs interdites → type `roots` ;
3. le tableau → type `signTable` ou `variationTable` (saisie interactive, §8.3) ;
4. valeur d'un extremum → type `value`.

**Étapes type (variations) :** domaine → `f'(x)` → signe de `f'(x)` → tableau complet → conclusion rédigée.

> Les paramètres aléatoires sont choisis pour donner des **racines « propres »** : on part des racines voulues puis on construit le polynôme (`a(x − x₁)(x − x₂)`).

---

## 6. Composition de la feuille : un thème ou plusieurs

La feuille se compose librement : **un seul thème en plusieurs exemplaires**, ou **plusieurs thèmes différents** sur la même page.

### 6.1 Panneau de composition (`SheetBuilder`)

```
┌──────────────────────────────────────────────────────────────┐
│  Composer ma feuille                                          │
│                                                              │
│  [x] Dérivées       Nombre [ 6 ▾]  Niveau [Moyen    ▾]  Types ⚙│
│  [x] Limites        Nombre [ 4 ▾]  Niveau [Facile   ▾]  Types ⚙│
│  [ ] Signes/Variat. Nombre [ 3 ▾]  Niveau [Difficile▾]  Types ⚙│
│                                                              │
│  Ordre : (•) Regroupé par thème  ( ) Mélangé                  │
│                                                              │
│  Raccourcis : [10 dérivées] [Dérivées + limites] [Tout (3×3)] │
│                                                              │
│  Total : 10 exercices                    [ Générer 🎲 ]       │
└──────────────────────────────────────────────────────────────┘
```

- **Chaque thème se coche indépendamment** avec son propre nombre et son propre niveau.
  - Que des dérivées → cocher uniquement « Dérivées », nombre = 10.
  - Dérivées + limites → cocher les deux, avec un nombre pour chacun.
- **Niveau par thème** : ex. dérivées difficiles + limites faciles sur la même feuille. « Mélangé » tire un niveau au hasard pour chaque exo (en équilibrant les niveaux).
- **Types ⚙** (filtre F5) : liste des sous-types du thème à cocher (ex. Dérivées → polynôme, produit, quotient, exp, ln, composée). Par défaut tous cochés. Les types incompatibles avec le niveau sont grisés.
- **Ordre** : regroupé (tous les exos d'un thème, puis ceux du suivant, avec un titre de section par thème) ou mélangé.
- **Raccourcis** : configurations prêtes à l'emploi, modifiables ensuite.
- **Limites** : 20 exos max par thème, 40 au total ; au moins un thème coché, sinon le bouton « Générer » est désactivé.
- La dernière configuration est **mémorisée** (localStorage) et réappliquée à la visite suivante.
- Accès direct aussi depuis l'accueil : une carte par thème (« S'entraîner sur les dérivées ») qui ouvre le panneau pré-rempli avec ce seul thème.

### 6.2 Génération (`buildSheet.ts`)

```
pour chaque item de la config :
    templates = registry filtré par (thème, niveau, sous-types)
    répéter item.count fois :
        exo = antiRepeat.next(templates, historique, exosDéjàDansLaFeuille)
        ajouter exo
si order = 'shuffled' : mélanger (avec le PRNG, pour que ce soit reproductible)
```

- **Plusieurs exos du même thème** : l'anti-répétition (§7) garantit que les types varient *à l'intérieur de la feuille* ; avec 10 dérivées, on parcourt tous les types disponibles avant d'en répéter un.
- Si le filtre ne laisse qu'un seul type (ex. uniquement « quotient »), les exos restent tous différents grâce aux graines (paramètres différents, énoncés uniques garantis).
- Bouton **« Régénérer cet exo »** sur chaque carte (même thème et niveau) et **« Ajouter un exo »** en fin de section.

---

## 7. Algorithme anti-répétition (historique navigateur)

**Stockage** : `localStorage` via Zustand `persist`, clé `math-exo:history` (versionnée), 500 dernières entrées.

**Sélection d'un exercice** (`antiRepeat.ts`) :

1. **Filtrer** les templates (thème, niveau, sous-types).
2. **Pondérer** chaque template selon sa récence :
   - jamais fait → poids maximal ;
   - template du tirage précédent → poids 0 (sauf s'il est le seul disponible) ;
   - déjà présent dans la feuille en cours → poids très faible ;
   - sinon poids croissant avec l'ancienneté (« le moins récemment utilisé d'abord ») ;
   - bonus pour les templates marqués « raté » (révision).
3. **Tirer** le template (`pickWeighted`).
4. **Générer** avec une nouvelle graine ; calculer l'`exerciseId`.
5. Si l'énoncé existe déjà dans l'historique récent → nouvelle graine (max 20 essais).
6. **Enregistrer** l'exercice à l'affichage.

Les feuilles ouvertes par un lien partagé (§9) **ne passent pas** par ce tirage (les exos sont imposés), mais sont enregistrées dans l'historique (`source: 'shared'`) pour que les tirages suivants en tiennent compte.

---

## 8. Saisie de la réponse et vérification automatique

Chaque question d'un exercice possède un champ de réponse adapté à son type. L'élève peut répondre, vérifier, corriger, puis consulter la correction.

### 8.1 Saisie d'une expression (dérivées, asymptotes)

- Composant `ExpressionInput` basé sur **MathLive** : fractions, puissances, racines, `e`, `ln` au clavier ou via un **clavier virtuel** (indispensable sur téléphone).
- **Saisie texte acceptée aussi** : `(2x+1)/(x-3)`, `3x^2-2`, `e^(2x)`, `ln(x)`, `sqrt(x)`, multiplication implicite (`2x`, `3(x+1)`), virgule ou point décimal.
- **Aperçu en direct** de ce qui a été compris (rendu KaTeX), pour éviter les erreurs de parenthèses.
- Le parseur (`parse.ts`) produit un AST ; en cas d'erreur de syntaxe → statut `invalid` avec message précis (« parenthèse non fermée », « fonction inconnue : lnx → vouliez-vous dire ln(x) ? »). Une réponse invalide **ne compte pas** comme tentative.

### 8.2 Saisie d'une valeur ou d'une limite

- `ValueInput` : champ numérique (entier, décimal, fraction `7/3`, `-1/2`, `√2`, `e`) + boutons **`+∞`**, **`−∞`**, **« n'existe pas »**.
- Limites à gauche / à droite : deux champs côte à côte (`x → a⁻` et `x → a⁺`).
- `RootsInput` : liste de valeurs séparées par `;` (ordre indifférent, doublons ignorés), ou « aucune solution ».

### 8.3 Saisie d'un tableau de signes / variations

- `TableInput` : tableau interactif pré-structuré.
  - Niveau Facile : la ligne des `x` est **fournie** ; l'élève remplit les signes.
  - Niveaux Moyen/Difficile : l'élève **saisit aussi les valeurs de x** (racines, valeurs interdites), puis les cellules.
- Chaque cellule de signe se remplit par clic cyclique : `+` → `−` → vide ; chaque valeur charnière : `0` ou `||` (valeur interdite).
- Ligne de variations : flèches `↗` / `↘` par clic, et champs pour les valeurs des extremums et les limites aux bornes.
- Utilisable au clavier (flèches + touches `+`, `-`, `0`) pour l'accessibilité.

### 8.4 Algorithme de vérification

**Expressions (`checkExpression.ts`) — comparaison numérique :**
1. Tirer **N = 12 points** dans le domaine de la question (hors valeurs interdites, loin des bornes), avec un PRNG fixe pour que le résultat soit déterministe.
2. Évaluer la réponse de l'élève et la solution en chaque point.
3. Écart relatif `|a − b| / max(1, |b|) < 1e-6` en **tous** les points → équivalentes.
4. Points où l'une est définie et pas l'autre → signalé (domaine différent).
5. Plusieurs formes équivalentes sont donc acceptées : `(-7)/(x-3)^2`, `-7/(x²-6x+9)`, `-7(x-3)^(-2)`…
6. Si la question exige une forme précise (`requireSimplified`, ex. « donner f'(x) sous forme factorisée ») : réponse juste mais non simplifiée → statut **`partial`** avec message « Juste, mais factorise le résultat ».

**Valeurs / limites (`checkValue.ts`) :** comparaison exacte sur les fractions (via `rational.ts`) ; pour les irrationnels (`√2`, `e²`), tolérance numérique. `+∞` ≠ `−∞` ≠ « n'existe pas ».

**Racines :** comparaison ensembliste avec tolérance ; retour « 1 valeur sur 2 trouvée » → `partial`.

**Tableaux (`checkTable.ts`) :** comparaison cellule par cellule ; les cellules fausses sont **surlignées en rouge** ; score partiel (ex. « 7 cellules correctes sur 9 »).

### 8.5 Retour à l'élève et erreurs classiques

- Badge : ✔ **Correct**, ~ **Presque** (partiel), ✘ **Incorrect**, ⚠ **Saisie non comprise**.
- **Détection d'erreurs classiques** (`mistakes.ts`) : le solveur génère aussi des variantes fautives connues ; si la réponse de l'élève correspond numériquement à l'une d'elles, un message ciblé s'affiche :
  - quotient : numérateur `uv' − u'v` inversé → « Attention à l'ordre : c'est u'v − uv' » ;
  - composée : oubli du facteur `u'` → « N'oublie pas de multiplier par u' » ;
  - oubli du carré au dénominateur ;
  - limite : signe de `∞` inversé → « Regarde le signe du dénominateur au voisinage de a ».
- Après une erreur : bouton **« Indice »** (affiche la première étape de la correction) avant la correction complète.
- La vérification ne révèle jamais la bonne réponse ; la correction reste un choix explicite.

### 8.6 Résultat et suivi

- Nombre de tentatives enregistré par question.
- **Résultat automatique** de l'exercice :
  - `reussi` : toutes les questions justes avec au plus 2 tentatives et sans avoir ouvert la correction avant ;
  - `rate` : sinon (l'élève peut modifier manuellement).
- **Score de la feuille** en haut de page : « 6 / 10 réussis », barre de progression par thème.
- Les réponses saisies sont sauvegardées (localStorage) : recharger la page ne les perd pas.
- Mode **« Sans saisie »** (option) : pour ceux qui travaillent sur papier, on masque les champs et on garde le marquage manuel ✔ / ✘.

---

## 9. Partage d'une feuille par URL

### 9.1 Principe

Une feuille est entièrement déterminée par la liste `(code du template, graine)` de ses exercices. Le lien contient cette liste : la personne qui l'ouvre **régénère exactement les mêmes exercices** (mêmes énoncés, mêmes corrections), sans aucun serveur.

### 9.2 Format de l'URL

```
https://<site>/#/f?v=1&e=D07.1k3f9a~D02.x81kq~L05.9zz01~V03.7ab2k&t=Révisions%20dérivées&c=1
```

| Paramètre | Rôle |
|---|---|
| `v` | Version du format (compatibilité future). |
| `e` | Liste des exercices séparés par `~` ; chaque exo = `code template` + `.` + `graine en base 36` (≤ 7 caractères). |
| `t` | Titre de la feuille (optionnel). |
| `c` | `1` = corrections disponibles, `0` = corrections masquées (mode « devoir » : l'élève a seulement la vérification automatique). |
| `s` | `1` = saisie des réponses activée (défaut), `0` = feuille papier. |

- Taille : ≈ 12 caractères par exo → 20 exos ≈ 250 caractères, lien court et copiable.
- Utilisation de `HashRouter` : fonctionne sur GitHub Pages sans configuration.

### 9.3 Lien « configuration » (variante)

En plus du lien « feuille exacte », possibilité de partager une **configuration** :
```
#/g?v=1&d=6.2&l=4.1&o=g
```
(`d` = dérivées : 6 exos niveau 2 ; `l` = limites : 4 exos niveau 1 ; `o` = ordre). Chaque ouverture génère une **nouvelle** feuille aléatoire avec ces réglages (utile pour un professeur : « entraînez-vous avec ce type de feuille »).

### 9.4 Interface de partage (`ShareDialog`)

- Bouton **« Partager la feuille »** en haut de chaque feuille.
- Fenêtre avec : titre modifiable, options (corrections oui/non, saisie oui/non), lien généré, bouton **« Copier le lien »** (API Clipboard), **QR code** affichable en plein écran (projection en classe).
- Choix « feuille exacte » ou « configuration ».

### 9.5 Ouverture d'un lien (`SharedSheet.tsx`)

1. `decode.ts` lit et **valide** les paramètres (version connue, codes existants, graines valides, 40 exos max).
2. Codes inconnus ou invalides → exos ignorés + bandeau « 2 exercices n'ont pas pu être chargés (lien d'une ancienne version) ».
3. Bandeau « Feuille partagée : *Révisions dérivées* » ; bouton « Générer une feuille similaire » (nouvelle feuille avec la même composition).
4. Les réponses sont stockées sous une clé propre à la feuille (hash de l'URL) : l'élève peut fermer et revenir.

### 9.6 Stabilité des liens dans le temps

Point critique : si un générateur change, la même graine donnerait un exo différent et les liens existants seraient cassés.
- Chaque template a un **code court figé** (`D07`) qui n'est **jamais réutilisé**.
- Toute modification qui change le résultat d'un template → **nouveau code** (`D07` → `D15`), l'ancien reste dans le registre en « legacy » (non tiré au hasard, mais toujours décodable).
- **Tests « golden seeds »** (`golden-seeds.test.ts`) : pour chaque template, quelques graines avec l'énoncé attendu en snapshot ; le test échoue si un changement altère la génération → oblige à créer un nouveau code.

---

## 10. Interface utilisateur

### Page Exercices
```
┌───────────────────────────────────────────────────────────┐
│  Ma feuille · 10 exos      Score 4/10 ▓▓▓▓░░░░░░  [Partager]│
├───────────────────────────────────────────────────────────┤
│  ▸ DÉRIVÉES (6)                                            │
│  Exercice 1 — Moyen                                        │
│  Calculer la dérivée de  f(x) = (2x+1)/(x−3)               │
│  f'(x) = [ -7/(x-3)^2          ]  aperçu : −7/(x−3)²        │
│  [ Vérifier ]  ✔ Correct                                   │
│  [ Indice ] [ Voir la correction ] [ Régénérer ]           │
│    ├ Étape 1 : Identifier u et v …        📘 Rappel        │
│    └ Résultat : f'(x) = −7/(x−3)²                          │
│  …                                                         │
│  ▸ LIMITES (4)                                             │
│  Exercice 7 — Facile                                       │
│  lim (x→+∞) de 3x² − 5x + 1  = [    ] [+∞] [−∞] [∄]        │
└───────────────────────────────────────────────────────────┘
```

- Correction en deux modes : tout afficher, ou étape par étape.
- Encadré **📘 Rappel** : formule utilisée, issue de `formulas.ts`.
- Responsive (mobile, clavier virtuel MathLive) + mode sombre + impression (`@media print`, avec ou sans corrigé).

### Pages
- **Accueil** : présentation, une carte par thème (accès rapide mono-thème), bouton « Composer une feuille ».
- **Exercices** : panneau de composition (repliable) + feuille.
- **Feuille partagée** : même affichage, avec bandeau.
- **Formulaire** : toutes les formules par thème, avec recherche.
- **Historique** : exos faits (réouvrables via leur graine), stats par thème et niveau, « Effacer l'historique ».

---

## 11. Qualité et tests

| Domaine | Vérification automatique |
|---|---|
| Dérivées | `f'(x)` générée comparée à la dérivée numérique `(f(x+h) − f(x−h)) / 2h`, sur des milliers de graines. |
| Limites | Évaluation de `f` pour `x` très grand / très proche de `a`, comparée à la limite annoncée. |
| Signes | Échantillonnage de `f` sur chaque intervalle du tableau. |
| Variations | Monotonie entre valeurs clés, valeur des extremums. |
| LaTeX | KaTeX parse chaque énoncé / correction sans erreur. |
| Parseur | Jeu de saisies réalistes (`2x`, `3(x+1)`, `e^(2x)`, `ln x`, `1/2x`…) → AST attendu ; saisies invalides → message clair. |
| Vérificateur | Formes équivalentes acceptées ; réponses fausses refusées ; chaque erreur classique reconnue ; la solution d'un exo est toujours acceptée par son propre vérificateur (sur toutes les graines testées). |
| Composition | `buildSheet` respecte nombres, niveaux, sous-types et ordre ; aucune feuille vide. |
| Anti-répétition | 100 tirages simulés : pas de doublon consécutif, tous les templates apparaissent. |
| Partage | `decode(encode(feuille)) = feuille` ; URL corrompue ou ancienne gérée sans plantage. |
| Golden seeds | Énoncés figés par graine pour garantir la stabilité des liens. |

Plus : ESLint + Prettier, CI GitHub Actions (tests + build à chaque push).

---

## 12. Feuille de route

| Phase | Contenu | Livrable |
|---|---|---|
| **1. Socle** | Vite + React + TS + Tailwind + KaTeX, layout, routage (HashRouter) | Site vide navigable |
| **2. Moteur** | AST, simplification, LaTeX, évaluation, PRNG, fractions + tests | `core/` testé |
| **3. Dérivées** | Solveur pas à pas + templates 3 niveaux + formules | 1ᵉʳ thème jouable |
| **4. Composition + UI** | `SheetBuilder` (mono/multi-thèmes, nombre et niveau par thème), `buildSheet`, ExerciseCard, correction étape par étape | Feuilles de dérivées personnalisables |
| **5. Historique** | Store persistant, anti-répétition, page Historique | F10 / F11 |
| **6. Saisie & vérification (expressions)** | Parseur, MathLive, `checkExpression`, retours, erreurs classiques pour les dérivées, score | Dérivées vérifiées automatiquement |
| **7. Limites** | Templates + solveur + `ValueInput` + `checkValue` | 2ᵉ thème avec vérification |
| **8. Signes & variations** | Analyse de signe, `VariationTable` SVG, `TableInput`, `checkTable` | 3ᵉ thème avec vérification |
| **9. Partage par URL** | `encode`/`decode`, `ShareDialog`, QR code, page Feuille partagée, lien « configuration », golden seeds | F12 |
| **10. Finitions** | Formulaire, filtre par sous-type, impression, mode sombre, PWA, déploiement | Version 1.0 en ligne |

---

## 13. Évolutions possibles

- Nouveaux thèmes : primitives, suites, équations exponentielles / logarithmiques.
- Courbe interactive dans la correction.
- Export PDF d'une feuille (avec ou sans corrigé).
- Mode « contrôle chronométré ».
